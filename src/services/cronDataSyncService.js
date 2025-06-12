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
  async syncSalesTransactions(dateRange = '30_days') {
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
   * Helper function to write data in batches
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
   * Syncs today's data only
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
      console.log('🔄 Starting high frequency sync (today\'s data)...');
      
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
      
      // Get today's invoices
      const todayInvoices = await zohoReportsService.getInvoices('today');
      
      const allInvoices = [
        ...todayInvoices.all,
        ...todayInvoices.outstanding,
        ...todayInvoices.overdue
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
   * Syncs last 7 days of data (rolling window)
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
      console.log('🔄 Starting medium frequency sync (last 7 days)...');
      
      // Get last 7 days of orders
      const orders = await zohoReportsService.getSalesOrders('7_days');
      
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
      
      // Get last 7 days of invoices
      const invoices = await zohoReportsService.getInvoices('7_days');
      const allInvoices = [...invoices.all, ...invoices.outstanding, ...invoices.overdue];
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this._batchWrite(db, 'invoices', uniqueInvoices, 'invoice_id');
      }
      
      // Sync recent customer updates
      const customers = await zohoReportsService.getCustomerAnalytics('7_days');
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
      
      // Sync last 7 days of transactions
      await this.syncSalesTransactions('7_days');
      
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
   * Syncs last 30 days of data to catch any missed records
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
      console.log('🔄 Starting low frequency sync (last 30 days catch-up)...');
      
      // Sync products (only updates/new products)
      console.log('📦 Syncing product updates from Inventory...');
      const productSyncResult = await syncInventory(true);
      
      // Get last 30 days of data to catch any missed records
      console.log('📊 Fetching last 30 days of data...');
      
      const [orders30Days, invoices30Days, purchaseOrders30Days] = await Promise.all([
        zohoReportsService.getSalesOrders('30_days'),
        zohoReportsService.getInvoices('30_days'),
        zohoReportsService.getPurchaseOrders('30_days')
      ]);

      // Write data to collections
      if (orders30Days.length > 0) {
        await this._batchWrite(db, 'orders', orders30Days, 'salesorder_id');
      }
      
      if (invoices30Days.all.length > 0) {
        await this._batchWrite(db, 'invoices', invoices30Days.all, 'invoice_id');
      }
      
      if (purchaseOrders30Days.length > 0) {
        await this._batchWrite(db, 'purchase_orders', purchaseOrders30Days, 'purchaseorder_id');
      }
      
      // Sync last 30 days of transactions
      const transactionSyncResult = await this.syncSalesTransactions('30_days');
      
      // Sync customer ID mappings (only updates)
      const customerIdSyncResult = await syncInventoryCustomerIds();
      
      // Run full normalization
      console.log('🔄 Running data normalization...');
      await this.runNormalization();
      
      // Update sync metadata
      await db.collection('sync_metadata').doc('last_daily_sync').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        orders: orders30Days.length,
        invoices: invoices30Days.all.length,
        purchaseOrders: purchaseOrders30Days.length,
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
          orders: orders30Days.length,
          invoices: invoices30Days.all.length,
          purchaseOrders: purchaseOrders30Days.length,
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
   * WEEKLY CLEANUP SYNC - Once a week
   * Optional: Run a deeper sync weekly to ensure data integrity
   */
  async weeklyCleanupSync() {
    const jobType = 'weekly-cleanup';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Weekly cleanup sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();

    try {
      console.log('🔄 Starting weekly cleanup sync (last quarter)...');
      
      // Sync last quarter's data for consistency
      const [ordersQuarter, invoicesQuarter, purchaseOrdersQuarter] = await Promise.all([
        zohoReportsService.getSalesOrders('quarter'),
        zohoReportsService.getInvoices('quarter'),
        zohoReportsService.getPurchaseOrders('quarter')
      ]);

      const db = admin.firestore();
      
      // Write data
      if (ordersQuarter.length > 0) {
        await this._batchWrite(db, 'orders', ordersQuarter, 'salesorder_id');
      }
      
      if (invoicesQuarter.all.length > 0) {
        await this._batchWrite(db, 'invoices', invoicesQuarter.all, 'invoice_id');
      }
      
      if (purchaseOrdersQuarter.length > 0) {
        await this._batchWrite(db, 'purchase_orders', purchaseOrdersQuarter, 'purchaseorder_id');
      }
      
      // Run normalization
      await this.runNormalization();
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Weekly cleanup sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: ordersQuarter.length,
          invoices: invoicesQuarter.all.length,
          purchaseOrders: purchaseOrdersQuarter.length
        }
      };
      
    } catch (error) {
      console.error('❌ Weekly cleanup sync failed:', error);
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
   * Manual full sync - only use when needed for recovery
   */
  async manualFullSync(dateRange = 'year') {
    console.log(`🔧 Manual full sync requested for ${dateRange}`);
    
    const jobType = 'manual-full';
    
    if (this.isRunning.get(jobType)) {
      return { success: false, message: 'Manual sync already running' };
    }

    this.isRunning.set(jobType, true);

    try {
      // Run the sync
      const [orders, invoices, purchaseOrders] = await Promise.all([
        zohoReportsService.getSalesOrders(dateRange),
        zohoReportsService.getInvoices(dateRange),
        zohoReportsService.getPurchaseOrders(dateRange)
      ]);

      const db = admin.firestore();
      
      await this._batchWrite(db, 'orders', orders, 'salesorder_id');
      await this._batchWrite(db, 'invoices', invoices.all, 'invoice_id');
      await this._batchWrite(db, 'purchase_orders', purchaseOrders, 'purchaseorder_id');
      
      await this.syncSalesTransactions(dateRange);
      await this.runNormalization();
      
      return {
        success: true,
        recordsProcessed: {
          orders: orders.length,
          invoices: invoices.all.length,
          purchaseOrders: purchaseOrders.length
        }
      };
      
    } catch (error) {
      console.error('❌ Manual full sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }
}

export default new CronDataSyncService();