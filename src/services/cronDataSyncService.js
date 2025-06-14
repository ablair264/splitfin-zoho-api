// src/services/cronDataSyncService.js
// Updated to include data normalization after sync and incremental syncing

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import dataNormalizerService from './dataNormalizerService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
    this.lastSync = {};
  }
  
  /**
   * Get last successful sync timestamp for a specific sync type
   */
  async getLastSyncTimestamp(syncType) {
    try {
      const db = admin.firestore();
      const doc = await db.collection('sync_metadata').doc(`last_sync_${syncType}`).get();
      
      if (doc.exists && doc.data().timestamp) {
        return new Date(doc.data().timestamp);
      }
      
      // Return null if no sync record exists
      return null;
    } catch (error) {
      console.error(`Error getting last sync timestamp for ${syncType}:`, error);
      return null;
    }
  }

  /**
   * Update last successful sync timestamp
   */
  async updateLastSyncTimestamp(syncType) {
    try {
      const db = admin.firestore();
      await db.collection('sync_metadata').doc(`last_sync_${syncType}`).set({
        timestamp: new Date().toISOString(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error updating last sync timestamp for ${syncType}:`, error);
    }
  }
  
  /**
   * Sync and normalize invoices to normalized_invoices collection
   */
  async syncAndNormalizeInvoices(invoices) {
    console.log('🔄 Syncing and normalizing invoices...');
    try {
      const db = admin.firestore();
      
      // Get all users to map salesperson_id to Firebase UID
      const usersSnapshot = await db.collection('users').get();
      const usersByZohoId = new Map();
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.zohospID) {
          usersByZohoId.set(userData.zohospID, {
            uid: doc.id,
            ...userData
          });
        }
      });
      
      // Process invoices
      const normalizedInvoices = invoices.map(invoice => {
        // Map salesperson_id to Firebase UID
        let salesAgentUid = null;
        if (invoice.salesperson_id && usersByZohoId.has(invoice.salesperson_id)) {
          salesAgentUid = usersByZohoId.get(invoice.salesperson_id).uid;
        }
        
        // Calculate days overdue
        let daysOverdue = 0;
        if (invoice.status !== 'paid' && invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          }
        }
        
        return {
          // Core invoice fields
          invoice_id: invoice.invoice_id,
          invoice_number: invoice.invoice_number,
          
          // Financial fields
          balance: parseFloat(invoice.balance || 0),
          total: parseFloat(invoice.total || 0),
          
          // Customer fields
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          company_name: invoice.company_name || invoice.customer_name,
          email: invoice.email || invoice.customer_email || '',
          cf_vat_number_unformatted: invoice.cf_vat_number_unformatted || '',
          
          // Status and dates
          status: invoice.status,
          due_date: invoice.due_date,
          daysOverdue: daysOverdue,
          last_payment_date: invoice.last_payment_date || null,
          last_reminder_sent_date: invoice.last_reminder_sent_date || null,
          
          // Communication status
          is_emailed: invoice.is_emailed || false,
          is_viewed_by_client: invoice.is_viewed_by_client || false,
          
          // Salesperson info
          salesperson_id: invoice.salesperson_id || null,
          salesAgent_uid: salesAgentUid,
          
          // Additional fields
          invoice_url: invoice.invoice_url || '',
          date: invoice.date || invoice.invoice_date,
          
          // Metadata
          _source: 'zoho_api',
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _normalized_at: admin.firestore.FieldValue.serverTimestamp()
        };
      });
      
      // Write to normalized_invoices collection
      await this._batchWrite(db, 'normalized_invoices', normalizedInvoices, 'invoice_id');
      
      // Also write to regular invoices collection for backward compatibility
      await this._batchWrite(db, 'invoices', invoices, 'invoice_id');
      
      console.log(`✅ Normalized ${normalizedInvoices.length} invoices`);
      return { success: true, count: normalizedInvoices.length };
      
    } catch (error) {
      console.error('❌ Invoice normalization failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sync sales transactions for specific orders
   */
  async syncSalesTransactionsForOrders(orders) {
    console.log('🔄 Syncing sales transactions for specific orders...');
    try {
      const db = admin.firestore();
      const transactions = [];
      
      orders.forEach(order => {
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

      if (transactions.length > 0) {
        await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
      }
      
      return { success: true, count: transactions.length };
      
    } catch (error) {
      console.error('❌ Sales transactions sync failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Enrich normalized orders with line items
   */
  async enrichNormalizedOrdersWithLineItems(orderIds) {
    console.log('🔄 Enriching normalized orders with line items...');
    try {
      const result = await dataNormalizerService.enrichNormalizedOrdersWithLineItems(orderIds);
      return result;
    } catch (error) {
      console.error('❌ Error enriching normalized orders:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * ONE-OFF: Sync all data going back 2 years
   */
  async syncTwoYearsData() {
    const jobType = 'two-years-sync';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Two years sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();

    try {
      console.log('🔄 Starting 2-year historical data sync...');
      console.log('⚠️  This may take a while, please be patient...');
      
      // First sync all products
      console.log('📦 Syncing all products...');
      const productSyncResult = await syncInventory(true);
      
      console.log('📊 Fetching 2 years of sales orders...');
      const orders2Years = await zohoReportsService.getSalesOrders('2_years');
      console.log(`Found ${orders2Years.length} orders`);

      if (orders2Years.length > 0) {
        // Filter out orders without valid IDs and ensure proper ID field
        const validOrders = orders2Years
          .map(order => {
            // Try to find a valid ID from multiple possible fields
            const orderId = order.salesorder_id || order.id || order.order_id;
            
            // Only include orders with valid IDs
            if (orderId && String(orderId).trim()) {
              return {
                ...order,
                salesorder_id: String(orderId).trim()
              };
            }
            
            console.warn('⚠️ Order missing ID:', {
              salesorder_number: order.salesorder_number,
              customer_name: order.customer_name,
              date: order.date
            });
            return null;
          })
          .filter(order => order !== null);
        
        console.log(`Processing ${validOrders.length} valid orders out of ${orders2Years.length} total`);
        
        if (validOrders.length > 0) {
          await this._batchWrite(db, 'orders', validOrders, 'salesorder_id');
        }
      }
      
      // Get 2 years of invoices
      console.log('📄 Fetching 2 years of invoices...');
      const invoices2Years = await zohoReportsService.getInvoices('2_years');
      const allInvoices = [
        ...invoices2Years.all,
        ...invoices2Years.outstanding,
        ...invoices2Years.overdue,
        ...invoices2Years.paid
      ];
      
      // Remove duplicates
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      console.log(`Found ${uniqueInvoices.length} unique invoices`);
      
      // Sync and normalize invoices
      await this.syncAndNormalizeInvoices(uniqueInvoices);
      
      // Get 2 years of purchase orders
      console.log('📋 Fetching 2 years of purchase orders...');
      const purchaseOrders2Years = await zohoReportsService.getPurchaseOrders('2_years');
      console.log(`Found ${purchaseOrders2Years.length} purchase orders`);
      
      if (purchaseOrders2Years.length > 0) {
        await this._batchWrite(db, 'purchase_orders', purchaseOrders2Years, 'purchaseorder_id');
      }
      
      // Sync 2 years of transactions
      console.log('💰 Syncing 2 years of sales transactions...');
      const transactionSyncResult = await this.syncSalesTransactions('2_years');
      
      // Get all customers
      console.log('👥 Fetching all customers...');
      const customers = await zohoReportsService.getCustomerAnalytics('2_years');
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
      
      // Sync customer ID mappings
      console.log('🔗 Syncing customer ID mappings...');
      const customerIdSyncResult = await syncInventoryCustomerIds();
      
      // Run full normalization
      console.log('🔄 Running data normalization...');
      await this.runNormalization();
      
      // Update sync metadata
      await db.collection('sync_metadata').doc('two_years_sync').set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: new Date().toISOString(),
        orders: orders2Years.length,
        invoices: uniqueInvoices.length,
        purchaseOrders: purchaseOrders2Years.length,
        transactions: transactionSyncResult.count,
        customers: customers.customers?.length || 0,
        normalized: true,
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      const durationMinutes = Math.floor(duration / 60000);
      const durationSeconds = Math.floor((duration % 60000) / 1000);
      
      console.log(`✅ Two years sync completed in ${durationMinutes}m ${durationSeconds}s`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders2Years.length,
          invoices: uniqueInvoices.length,
          purchaseOrders: purchaseOrders2Years.length,
          transactions: transactionSyncResult.count,
          customers: customers.customers?.length || 0,
          customerIdsMapped: customerIdSyncResult.processed
        },
        normalized: true
      };
      
    } catch (error) {
      console.error('❌ Two years sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
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
    const BATCH_SIZE = 400;
    const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024;
    
    let currentBatch = db.batch();
    let currentBatchSize = 0;
    let currentPayloadSize = 0;
    let batchCount = 0;
    let skippedCount = 0;
    
    // Helper to clean undefined values
    const cleanUndefined = (obj) => {
      return JSON.parse(JSON.stringify(obj, (key, value) => 
        value === undefined ? null : value
      ));
    };
    
    for (const item of dataArray) {
      const docId = item[idKey];
      
      // More robust check for valid document ID
      if (!docId || docId === '' || docId === null || docId === undefined) {
        console.warn(`⚠️ Skipping document with invalid ID in ${collectionName}:`, { 
          idKey, 
          idValue: docId,
          itemKeys: Object.keys(item).slice(0, 5) // Show first 5 keys for debugging
        });
        skippedCount++;
        continue;
      }
      
      // Ensure docId is a string and trim whitespace
      const cleanDocId = String(docId).trim();
      
      if (!cleanDocId) {
        console.warn(`⚠️ Skipping document with empty ID after cleaning in ${collectionName}`);
        skippedCount++;
        continue;
      }
      
      try {
        const docRef = collectionRef.doc(cleanDocId);
        const itemWithMetadata = {
          ...item,
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _syncSource: 'zoho_api'
        };
        
        // Clean undefined values before writing
        const cleanedItem = cleanUndefined(itemWithMetadata);
        
        // Estimate document size
        const itemSize = JSON.stringify(cleanedItem).length;
        
        // Check if we need to commit current batch
        if (currentBatchSize >= BATCH_SIZE || currentPayloadSize + itemSize > MAX_PAYLOAD_SIZE) {
          await currentBatch.commit();
          batchCount++;
          console.log(`  Committed batch ${batchCount} with ${currentBatchSize} documents`);
          
          currentBatch = db.batch();
          currentBatchSize = 0;
          currentPayloadSize = 0;
        }
        
        currentBatch.set(docRef, cleanedItem, { merge: true });
        currentBatchSize++;
        currentPayloadSize += itemSize;
        
      } catch (error) {
        console.error(`❌ Error processing document ${cleanDocId} in ${collectionName}:`, error.message);
        skippedCount++;
      }
    }
    
    // Commit remaining items
    if (currentBatchSize > 0) {
      await currentBatch.commit();
      batchCount++;
    }
    
    const processedCount = dataArray.length - skippedCount;
    console.log(`✅ Synced ${processedCount} documents to '${collectionName}' in ${batchCount} batches`);
    if (skippedCount > 0) {
      console.log(`⚠️ Skipped ${skippedCount} documents with invalid IDs`);
    }
  }
  
  /**
   * Run data normalization after sync
   */
  async runNormalization() {
    console.log('🔄 Running data normalization...');
    try {
      const result = await dataNormalizerService.normalizeAllData();
      console.log('✅ Data normalization completed');
      return result;
    } catch (error) {
      console.error('❌ Data normalization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Syncs only new/modified data
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
      console.log('🔄 Starting high frequency sync (incremental)...');
      
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp('high_frequency');
      const syncParams = lastSync ? { 
        modifiedSince: lastSync.toISOString() 
      } : { 
        dateRange: 'today' 
      };
      
      console.log(`Syncing records modified since: ${lastSync || 'beginning of today'}`);
      
      // Get orders modified since last sync
      const orders = await zohoReportsService.getSalesOrdersModified 
        ? await zohoReportsService.getSalesOrdersModified(syncParams)
        : await zohoReportsService.getSalesOrders('today');
      
      if (orders.length > 0) {
        await this._batchWrite(db, 'orders', orders, 'salesorder_id');
        
        // Sync transactions for these orders
        await this.syncSalesTransactionsForOrders(orders);
        
        // Enrich normalized orders with line items
        await this.enrichNormalizedOrdersWithLineItems(orders.map(o => o.salesorder_id));
      }
      
      // Get invoices modified since last sync
      const invoices = await zohoReportsService.getInvoicesModified
        ? await zohoReportsService.getInvoicesModified(syncParams)
        : await zohoReportsService.getInvoices('today');
      
      const allInvoices = Array.isArray(invoices) 
        ? invoices 
        : [...invoices.all, ...invoices.outstanding, ...invoices.overdue];
      
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
      }
      
      // Run normalization for new data
      await this.runNormalization();
      
      // Update last sync timestamp on success
      await this.updateLastSyncTimestamp('high_frequency');
      
      const duration = Date.now() - startTime;
      this.lastSync.high = new Date();
      
      console.log(`✅ High frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration, 
        recordsProcessed: {
          orders: orders.length,
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
      
      // Check if we should do incremental sync
      const lastSync = await this.getLastSyncTimestamp('medium_frequency');
      const useIncremental = lastSync && (new Date() - lastSync) < 7 * 24 * 60 * 60 * 1000;
      
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
        
        // Enrich new orders
        await this.enrichNormalizedOrdersWithLineItems(orders.map(o => o.salesorder_id));
      }
      
      // Get last 7 days of invoices
      const invoices = await zohoReportsService.getInvoices('7_days');
      const allInvoices = [...invoices.all, ...invoices.outstanding, ...invoices.overdue];
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
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
      
      // Update last sync timestamp
      await this.updateLastSyncTimestamp('medium_frequency');
      
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
        
        // Enrich orders
        await this.enrichNormalizedOrdersWithLineItems(orders30Days.map(o => o.salesorder_id));
      }
      
      const uniqueInvoices = Array.from(
        new Map(invoices30Days.all.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
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
        invoices: uniqueInvoices.length,
        purchaseOrders: purchaseOrders30Days.length,
        transactions: transactionSyncResult.count,
        normalized: true,
        duration: Date.now() - startTime
      });
      
      // Update last sync timestamp
      await this.updateLastSyncTimestamp('low_frequency');
      
      const duration = Date.now() - startTime;
      this.lastSync.low = new Date();
      
      console.log(`✅ Low frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders30Days.length,
          invoices: uniqueInvoices.length,
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
      
      const uniqueInvoices = Array.from(
        new Map(invoicesQuarter.all.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
      }
      
      if (purchaseOrdersQuarter.length > 0) {
        await this._batchWrite(db, 'purchase_orders', purchaseOrdersQuarter, 'purchaseorder_id');
      }
      
      // Run normalization
      await this.runNormalization();
      
      // Update last sync timestamp
      await this.updateLastSyncTimestamp('weekly_cleanup');
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Weekly cleanup sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: ordersQuarter.length,
          invoices: uniqueInvoices.length,
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
      
      const uniqueInvoices = Array.from(
        new Map(invoices.all.map(inv => [inv.invoice_id, inv])).values()
      );
      
      await this.syncAndNormalizeInvoices(uniqueInvoices);
      await this._batchWrite(db, 'purchase_orders', purchaseOrders, 'purchaseorder_id');
      
      await this.syncSalesTransactions(dateRange);
      await this.runNormalization();
      
      return {
        success: true,
        recordsProcessed: {
          orders: orders.length,
          invoices: uniqueInvoices.length,
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