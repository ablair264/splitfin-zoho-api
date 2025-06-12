// src/services/cronDataSyncService.js
// Updated to include data normalization after sync

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import dataNormalizationService from './dataNormalizerService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
    this.lastSync = {};
  }
  
  /**
   * Sync sales transactions (line items) to sales_transactions collection
   */
  async syncSalesTransactions(dateRange = '2_years') {
    console.log('🔄 Syncing Line Items to sales_transactions collection...');
    try {
      const db = admin.firestore();
      
      const salesOrdersList = await zohoReportsService.getSalesOrders(dateRange);

      if (!salesOrdersList || salesOrdersList.length === 0) {
        console.log('✅ No sales orders found in the period.');
        return { success: true, count: 0 };
      }
      
      console.log(`Found ${salesOrdersList.length} orders with line items...`);

      const transactions = [];
      
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
  const BATCH_SIZE = 400; // Reduced from 499 to be safer
  const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit
  
  let currentBatch = db.batch();
  let currentBatchSize = 0;
  let currentPayloadSize = 0;
  let batchCount = 0;
  
  for (const item of dataArray) {
    const docId = item[idKey];
    if (!docId) continue;
    
    const docRef = collectionRef.doc(docId.toString());
    const itemWithMetadata = {
      ...item,
      _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
      _syncSource: 'zoho_api'
    };
    
    // Estimate document size
    const itemSize = JSON.stringify(itemWithMetadata).length;
    
    // Check if we need to commit current batch
    if (currentBatchSize >= BATCH_SIZE || currentPayloadSize + itemSize > MAX_PAYLOAD_SIZE) {
      await currentBatch.commit();
      batchCount++;
      console.log(`  Committed batch ${batchCount} with ${currentBatchSize} documents`);
      
      currentBatch = db.batch();
      currentBatchSize = 0;
      currentPayloadSize = 0;
    }
    
    currentBatch.set(docRef, itemWithMetadata, { merge: true });
    currentBatchSize++;
    currentPayloadSize += itemSize;
  }
  
  // Commit remaining items
  if (currentBatchSize > 0) {
    await currentBatch.commit();
    batchCount++;
  }
  
  console.log(`✅ Synced ${dataArray.length} documents to '${collectionName}' in ${batchCount} batches`);
}
  /**
   * Run data normalization after sync
   */
  async runNormalization() {
    console.log('🔄 Running data normalization...');
    try {
      const result = await dataNormalizationService.normalizeAllData();
      console.log('✅ Data normalization completed');
      return result;
    } catch (error) {
      console.error('❌ Data normalization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Syncs recent data and normalizes it
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
      
      // Get recent invoices
      const recentInvoices = await zohoReportsService.getInvoices('7_days');
      
      const allInvoices = [
        ...recentInvoices.all,
        ...recentInvoices.outstanding,
        ...recentInvoices.overdue
      ];
      
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this._batchWrite(db, 'invoices', uniqueInvoices, 'invoice_id');
      }
      
      // Sync today's transactions
      await this.syncSalesTransactions('today');
      
      // Run normalization for today's data
      await this.runNormalization();
      
      const duration = Date.now() - startTime;
      this.lastSync.high = new Date();
      
      console.log(`✅ High frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration, 
        recordsProcessed: {
          orders: todayOrders.length,
          invoices: uniqueInvoices.length
        },
        normalized: true
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
   * Syncs last 30 days of data and normalizes
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
      
      // Sync customers
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
      
      // Run normalization
      await this.runNormalization();
      
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
        },
        normalized: true
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
   * Full historical sync with normalization
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
      
      // Fetch data in quarterly chunks
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
      
      // Run full normalization
      console.log('🔄 Running full data normalization...');
      await this.runNormalization();
      
      // Update sync metadata
      await db.collection('sync_metadata').doc('last_full_sync').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        orders: allOrders.length,
        invoices: allInvoices.length,
        purchaseOrders: allPurchaseOrders.length,
        transactions: transactionSyncResult.count,
        normalized: true,
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
        },
        normalized: true
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

  /**
   * Get cached data (for backward compatibility)
   * This is no longer used with normalized collections
   */
  async getCachedData(cacheKey) {
    console.warn('⚠️ getCachedData is deprecated. Use normalized collections directly.');
    return null;
  }
}

export default new CronDataSyncService();