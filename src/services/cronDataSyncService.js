// ================================================================
// FILE: src/services/cronDataSyncService.js
// ================================================================

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map(); // Track running jobs by type
    this.lastSync = {};
  }
  
  /**
   * Sync sales transactions (line items) to sales_transactions collection
   */
  async syncSalesTransactions(dateRange = '2_years') {
    console.log('🔄 Syncing Line Items to sales_transactions collection...');
    try {
      const db = admin.firestore();
      
      // Fetch sales orders for the period
      const salesOrdersList = await zohoReportsService.getSalesOrders(dateRange);

      if (!salesOrdersList || salesOrdersList.length === 0) {
        console.log('✅ No sales orders found in the period.');
        return { success: true, count: 0 };
      }
      
      console.log(`Found ${salesOrdersList.length} orders with line items...`);

      const transactions = [];
      
      // Process each order's line items
      salesOrdersList.forEach(order => {
        if (order.line_items && Array.isArray(order.line_items)) {
          order.line_items.forEach(item => {
            transactions.push({
              transaction_id: item.line_item_id || `${order.salesorder_id}_${item.item_id}`,
              item_id: item.item_id,
              item_name: item.name,
              sku: item.sku,
              brand: item.brand || 'Unknown',
              quantity: parseInt(item.quantity || 0),
              price: parseFloat(item.rate || 0),
              total: parseFloat(item.item_total || item.total || 0),
              order_id: order.salesorder_id,
              order_number: order.salesorder_number,
              order_date: order.date,
              customer_id: order.customer_id,
              customer_name: order.customer_name,
              salesperson_id: order.salesperson_id,
              salesperson_name: order.salesperson_name,
              created_at: order.date,
              last_modified: admin.firestore.FieldValue.serverTimestamp()
            });
          });
        }
      });

      if (transactions.length === 0) {
        console.log('✅ No line items found in any of the orders.');
        return { success: true, count: 0 };
      }

      // Write transactions in batches
      await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
      
      return { success: true, count: transactions.length };
      
    } catch (error) {
      console.error('❌ Sales transactions sync failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Helper function to write data in batches of 499
   */
  async _batchWrite(db, collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) {
      console.log(`No data to write for ${collectionName}, skipping.`);
      return;
    }

    const collectionRef = db.collection(collectionName);
    const promises = [];
    
    // Split the data into chunks of 499 (safely below the 500 limit)
    for (let i = 0; i < dataArray.length; i += 499) {
      const chunk = dataArray.slice(i, i + 499);
      const batch = db.batch();
      
      chunk.forEach(item => {
        const docId = item[idKey];
        if (docId) {
          const docRef = collectionRef.doc(docId.toString());
          // Add sync metadata
          const itemWithMetadata = {
            ...item,
            _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
            _syncSource: 'zoho_api'
          };
          batch.set(docRef, itemWithMetadata, { merge: true });
        }
      });
      
      promises.push(batch.commit());
    }

    await Promise.all(promises);
    console.log(`✅ Synced ${dataArray.length} documents to '${collectionName}' collection in ${promises.length} batch(es).`);
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Syncs recent data (today's orders, recent invoices)
   */
  async highFrequencySync() {
    const jobType = 'high-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ High frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();

    try {
      console.log('🔄 Starting high frequency sync...');
      
      // Get today's sales orders
      const todayOrders = await zohoReportsService.getSalesOrders('today');
      
      // Write orders to collection
      if (todayOrders.length > 0) {
        const ordersData = todayOrders.map(order => ({
          ...order,
          salesorder_id: order.salesorder_id,
          date: order.date,
          created_at: order.date,
          last_modified: admin.firestore.FieldValue.serverTimestamp()
        }));
        
        await this._batchWrite(db, 'orders', ordersData, 'salesorder_id');
      }
      
      // Get recent invoices (last 7 days)
      const recentInvoices = await zohoReportsService.getInvoices('7_days');
      
      // Write all invoice categories
      const allInvoices = [
        ...recentInvoices.all,
        ...recentInvoices.outstanding,
        ...recentInvoices.overdue
      ];
      
      // Deduplicate invoices by ID
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this._batchWrite(db, 'invoices', uniqueInvoices, 'invoice_id');
      }
      
      // Sync today's transactions
      await this.syncSalesTransactions('today');
      
      const duration = Date.now() - startTime;
      this.lastSync.high = new Date();
      
      console.log(`✅ High frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration, 
        recordsProcessed: {
          orders: todayOrders.length,
          invoices: uniqueInvoices.length
        }
      };
      
    } catch (error) {
      console.error('❌ High frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * MEDIUM FREQUENCY SYNC - Every 2 hours
   * Syncs last 30 days of data
   */
  async mediumFrequencySync() {
    const jobType = 'medium-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Medium frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();

    try {
      console.log('🔄 Starting medium frequency sync...');
      
      // Get last 30 days of orders
      const orders = await zohoReportsService.getSalesOrders('30_days');
      
      if (orders.length > 0) {
        const ordersData = orders.map(order => ({
          ...order,
          salesorder_id: order.salesorder_id,
          date: order.date,
          created_at: order.date,
          last_modified: admin.firestore.FieldValue.serverTimestamp()
        }));
        
        await this._batchWrite(db, 'orders', ordersData, 'salesorder_id');
      }
      
      // Get last 30 days of invoices
      const invoices = await zohoReportsService.getInvoices('30_days');
      const allInvoices = [...invoices.all, ...invoices.outstanding, ...invoices.overdue];
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this._batchWrite(db, 'invoices', uniqueInvoices, 'invoice_id');
      }
      
      // Sync customers (check for updates)
      const customers = await zohoReportsService.getCustomerAnalytics('30_days');
      if (customers.customers && customers.customers.length > 0) {
        const customerData = customers.customers.map(customer => ({
          customer_id: customer.id,
          name: customer.name,
          email: customer.email,
          totalSpent: customer.totalSpent,
          orderCount: customer.orderCount,
          lastOrderDate: customer.lastOrderDate,
          firstOrderDate: customer.firstOrderDate,
          segment: customer.segment,
          agentId: customer.agentId,
          last_modified: admin.firestore.FieldValue.serverTimestamp()
        }));
        
        await this._batchWrite(db, 'customers', customerData, 'customer_id');
      }
      
      // Sync last 30 days of transactions
      await this.syncSalesTransactions('30_days');
      
      const duration = Date.now() - startTime;
      this.lastSync.medium = new Date();
      
      console.log(`✅ Medium frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: orders.length,
          invoices: uniqueInvoices.length,
          customers: customers.customers?.length || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Medium frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * LOW FREQUENCY SYNC - Daily at 2 AM
   * Full historical sync
   */
  async lowFrequencySync() {
    const jobType = 'low-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Low frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();

    try {
      console.log('🔄 Starting low frequency sync (full data refresh)...');
      
      // Sync all products
      console.log('📦 Syncing all products from Inventory...');
      const productSyncResult = await syncInventory(true);
      
      // Fetch data in quarterly chunks to avoid API errors
      const allOrders = [];
      const allInvoices = [];
      const allPurchaseOrders = [];
      const quartersToSync = 8; // 2 years

      for (let q = 0; q < quartersToSync; q++) {
        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth() - (q * 3), 1);
        const startDate = new Date(now.getFullYear(), now.getMonth() - ((q + 1) * 3), 1);
        
        const customDateRange = {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        };

        console.log(`   - Fetching data for quarter: ${customDateRange.start} to ${customDateRange.end}`);

        const [ordersChunk, invoicesChunk, poChunk] = await Promise.all([
          zohoReportsService.getSalesOrders('custom', customDateRange),
          zohoReportsService.getInvoices('custom', customDateRange),
          zohoReportsService.getPurchaseOrders('custom', customDateRange)
        ]);

        if (ordersChunk.length > 0) allOrders.push(...ordersChunk);
        if (invoicesChunk.all.length > 0) allInvoices.push(...invoicesChunk.all);
        if (poChunk.length > 0) allPurchaseOrders.push(...poChunk);
      }

      // Write all data to collections
      await this._batchWrite(db, 'orders', allOrders, 'salesorder_id');
      await this._batchWrite(db, 'invoices', allInvoices, 'invoice_id');
      await this._batchWrite(db, 'purchase_orders', allPurchaseOrders, 'purchaseorder_id');
      
      // Sync all transactions (2 years)
      const transactionSyncResult = await this.syncSalesTransactions('2_years');
      
      // Sync customer IDs
      const customerIdSyncResult = await syncInventoryCustomerIds();
      
      // Update sync metadata
      await db.collection('sync_metadata').doc('last_full_sync').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        orders: allOrders.length,
        invoices: allInvoices.length,
        purchaseOrders: allPurchaseOrders.length,
        transactions: transactionSyncResult.count,
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      this.lastSync.low = new Date();
      
      console.log(`✅ Low frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: allOrders.length,
          invoices: allInvoices.length,
          purchaseOrders: allPurchaseOrders.length,
          transactions: transactionSyncResult.count,
          customerIdsMapped: customerIdSyncResult.processed
        }
      };
      
    } catch (error) {
      console.error('❌ Low frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * Get sync status for monitoring
   */
  getSyncStatus() {
    return {
      lastSync: this.lastSync,
      currentlyRunning: Array.from(this.isRunning.entries()).filter(([key, value]) => value),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

export default new CronDataSyncService();