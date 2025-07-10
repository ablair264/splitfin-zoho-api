// cronDataSyncService.js - Fixed version with incremental sync
// Refactored to focus solely on syncing raw data from Zoho to Firestore.
// All dashboard-specific calculations have been moved to dashboardAggregator.js.

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import zohoInventoryService from './zohoInventoryService.js';
import zohoReportsService from './zohoReportsService.js';
import DailyDashboardAggregator from './dailyDashboardAggregator.js';
import OrdersAggregator from './ordersAggregator.js';
import PurchaseOrdersAggregator from './purchaseOrdersAggregator.js';

const db = getFirestore();

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
    this.dashboardAggregator = new DailyDashboardAggregator();
    this.ordersAggregator = new OrdersAggregator();
    this.purchaseOrdersAggregator = new PurchaseOrdersAggregator();
  }

  /**
   * Helper to get sync metadata from Firestore.
   */
  async _getSyncMetadata(syncType) {
    try {
      const doc = await db.collection('sync_metadata').doc(syncType).get();
      return doc.exists ? doc.data() : null;
    } catch (error) {
      console.error(`Error getting sync metadata for ${syncType}:`, error);
      return null;
    }
  }

  /**
   * Helper to update sync metadata in Firestore.
   */
  async _updateSyncMetadata(syncType, data, syncTimestamp) {
    try {
      await db.collection('sync_metadata').doc(syncType).set({
        ...data,
        lastSyncTimestamp: syncTimestamp.toISOString(),
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating sync metadata for ${syncType}:`, error);
    }
  }

  /**
   * Helper to retry operations with exponential backoff
   */
  async _retryOperation(operation, maxRetries = 3, operationName = 'Operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏰ ${operationName} failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`❌ ${operationName} failed after ${maxRetries} attempts`);
    throw lastError;
  }

  /**
   * Writes an array of data to a specified collection in batches.
   * Now handles creating sub-collections for sales order line items.
   * Returns statistics about what was processed.
   */
  async _batchWrite(collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) {
      return { new: 0, updated: 0, unchanged: 0, total: 0 };
    }

    const collectionRef = db.collection(collectionName);
    const BATCH_SIZE = 50; // Reduced from 400 to 50 for safety
    const BATCH_OPERATIONS_LIMIT = 450; // Firestore limit is 500, leaving buffer
    
    // Track what we're actually updating
    const updateStats = {
      new: 0,
      updated: 0,
      unchanged: 0,
      total: dataArray.length
    };
    
    let mainBatch = db.batch();
    let operationCount = 0; // Track total operations (main doc + line items)
    let documentCount = 0;
    let batchNumber = 1;
    
    console.log(`📝 Starting batch write for ${dataArray.length} ${collectionName} documents...`);

    for (const item of dataArray) {
        const docId = item[idKey];
        if (!docId) continue;

        // Check if document exists and compare modification time
        const docRef = collectionRef.doc(String(docId));
        const existingDoc = await docRef.get();
        
        // Determine if this is new or updated
        if (!existingDoc.exists) {
            updateStats.new++;
        } else {
            const existingData = existingDoc.data();
            const existingModTime = existingData.last_modified_time || existingData._lastSynced?.toDate?.().toISOString();
            const newModTime = item.last_modified_time || item.modified_time;
            
            // Skip if the document hasn't been modified
            if (existingModTime && newModTime && new Date(existingModTime) >= new Date(newModTime)) {
                updateStats.unchanged++;
                continue; // Skip this document
            }
            updateStats.updated++;
        }

        // Calculate operations needed for this document
        let operationsNeeded = 1; // Main document
        if (collectionName === 'sales_orders' && item.line_items && Array.isArray(item.line_items)) {
            operationsNeeded += item.line_items.length; // Add line items count
        }

        // Check if adding this document would exceed limits
        if (operationCount > 0 && (operationCount + operationsNeeded > BATCH_OPERATIONS_LIMIT || documentCount >= BATCH_SIZE)) {
            console.log(`  📦 Committing batch ${batchNumber} with ${operationCount} operations...`);
            
            // Use retry mechanism for batch commit
            await this._retryOperation(
                () => mainBatch.commit(),
                3,
                `Batch ${batchNumber} commit`
            );
            
            mainBatch = db.batch();
            operationCount = 0;
            documentCount = 0;
            batchNumber++;
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const itemWithMetadata = {
            ...item,
            _lastSynced: Timestamp.now(),
            _syncSource: 'zoho_api'
        };
        
        // Handle line items for sales orders
        if (collectionName === 'sales_orders' && item.line_items && Array.isArray(item.line_items)) {
            const lineItems = itemWithMetadata.line_items;
            delete itemWithMetadata.line_items;

            const itemsSubCollection = docRef.collection('order_line_items');
            lineItems.forEach(lineItem => {
                const lineItemId = lineItem.line_item_id || itemsSubCollection.doc().id;
                mainBatch.set(itemsSubCollection.doc(lineItemId), lineItem);
                operationCount++;
            });
        }

        mainBatch.set(docRef, itemWithMetadata, { merge: true });
        operationCount++;
        documentCount++;
    }

    // Commit remaining batch
    if (operationCount > 0) {
        console.log(`  📦 Committing final batch ${batchNumber} with ${operationCount} operations...`);
        
        await this._retryOperation(
            () => mainBatch.commit(),
            3,
            `Final batch ${batchNumber} commit`
        );
    }
    
    console.log(`✅ Batch write complete:`);
    console.log(`   - New documents: ${updateStats.new}`);
    console.log(`   - Updated documents: ${updateStats.updated}`);
    console.log(`   - Unchanged (skipped): ${updateStats.unchanged}`);
    console.log(`   - Total processed: ${updateStats.total}`);
    
    return updateStats;
  }
  
  /**
   * Links newly synced orders to their respective customers and sales agents.
   * Only processes orders that were actually new or updated.
   */
  async _linkNewData(newlySyncedOrders, onlyNewOrUpdated = true) {
    if (!newlySyncedOrders || newlySyncedOrders.length === 0) return;

    // If onlyNewOrUpdated is true, filter to only process truly new/updated orders
    let ordersToLink = newlySyncedOrders;
    if (onlyNewOrUpdated) {
        const orderIds = new Set();
        for (const order of newlySyncedOrders) {
            const docRef = db.collection('sales_orders').doc(order.salesorder_id);
            const doc = await docRef.get();
            if (!doc.exists || doc.data().last_modified_time !== order.last_modified_time) {
                orderIds.add(order.salesorder_id);
            }
        }
        ordersToLink = newlySyncedOrders.filter(order => orderIds.has(order.salesorder_id));
    }

    if (ordersToLink.length === 0) {
        console.log('🔗 No new orders to link.');
        return;
    }

    console.log(`🔗 Starting post-sync linking for ${ordersToLink.length} orders...`);
    const customersRef = db.collection('customers');
    const agentsRef = db.collection('sales_agents');

    const agentSnapshot = await agentsRef.get();
    const agentMap = new Map();
    agentSnapshot.forEach(doc => {
        const agentData = doc.data();
        if (agentData.zohospID) {
            agentMap.set(agentData.zohospID, doc.ref);
        }
    });

    const BATCH_SIZE = 50; // Same as main batch size
    let batch = db.batch();
    let linkCount = 0;
    let batchNumber = 1;

    for (const order of ordersToLink) {
        const orderId = order.salesorder_id;
        if (!orderId) continue;

        // Link to Customer
        if (order.customer_id) {
            const customerQuery = await customersRef.where('customer_id', '==', order.customer_id).limit(1).get();
            if (!customerQuery.empty) {
                const customerDoc = customerQuery.docs[0];
                const customerOrderRef = customerDoc.ref.collection('orders_placed').doc(orderId);
                const orderSummary = {
                    sales_order_id: orderId,
                    sales_order_number: order.salesorder_number,
                    order_date: order.date,
                    total: order.total,
                    status: order.status,
                    _linked_at: Timestamp.now()
                };
                batch.set(customerOrderRef, orderSummary, { merge: true });
                linkCount++;
            }
        }

        // Link to Sales Agent
        if (order.salesperson_id && agentMap.has(order.salesperson_id)) {
            const agentRef = agentMap.get(order.salesperson_id);
            const agentOrderRef = agentRef.collection('customers_orders').doc(orderId);
            const agentOrderSummary = {
                sales_order_id: orderId,
                sales_order_number: order.salesorder_number,
                order_date: order.date,
                total: order.total,
                customer_name: order.customer_name,
                _linked_at: Timestamp.now()
            };
            batch.set(agentOrderRef, agentOrderSummary, { merge: true });
            linkCount++;
        }

        // Check batch size and commit if needed
        if (linkCount > 0 && linkCount % BATCH_SIZE === 0) {
            console.log(`  🔗 Committing link batch ${batchNumber} with ${BATCH_SIZE} operations...`);
            await this._retryOperation(
                () => batch.commit(),
                3,
                `Link batch ${batchNumber} commit`
            );
            batch = db.batch();
            batchNumber++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Commit remaining links
    if (linkCount % BATCH_SIZE > 0) {
        console.log(`  🔗 Committing final link batch ${batchNumber}...`);
        await this._retryOperation(
            () => batch.commit(),
            3,
            `Final link batch ${batchNumber} commit`
        );
    }
    console.log(`✅ Post-sync linking complete. Created/updated ${linkCount} links.`);
  }

  /**
   * Get dates that were affected by the sync for aggregation
   */
  _getAffectedDates(orders, invoices) {
    const dates = new Set();
    
    // Handle orders array
    if (orders && Array.isArray(orders)) {
      orders.forEach(order => {
        if (order.date) dates.add(new Date(order.date).toISOString().split('T')[0]);
        if (order.modified_time) dates.add(new Date(order.modified_time).toISOString().split('T')[0]);
      });
    }
    
    // Handle invoices array - check if it's actually an array
    if (invoices && Array.isArray(invoices)) {
      invoices.forEach(invoice => {
        if (invoice.date) dates.add(new Date(invoice.date).toISOString().split('T')[0]);
      });
    }
    
    // Always include today's date
    dates.add(new Date().toISOString().split('T')[0]);
    
    return Array.from(dates);
  }

  /**
   * Update daily aggregates for affected dates
   */
  async _updateDailyAggregates(affectedDates) {
    if (affectedDates.length === 0) return;
    
    console.log(`📊 Updating daily aggregates for ${affectedDates.length} affected dates...`);
    
    for (const dateStr of affectedDates) {
      try {
        await Promise.all([
          this.dashboardAggregator.calculateDailyAggregate(new Date(dateStr)),
          this.ordersAggregator.calculateDailyOrderAggregate(new Date(dateStr)),
          this.purchaseOrdersAggregator.calculateDailyPurchaseOrderAggregate(new Date(dateStr))
        ]);
      } catch (error) {
        console.error(`Failed to update aggregate for ${dateStr}:`, error);
      }
    }
    
    console.log(`✅ Daily aggregates updated for affected dates`);
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Now with incremental sync to avoid processing unchanged data
   */
  async highFrequencySync() {
    const jobType = 'high_frequency_sync';
    if (this.isRunning.get(jobType)) {
      console.log('⏩ High frequency sync already running, skipping...');
      return;
    }
    
    this.isRunning.set(jobType, true);
    const syncTimestamp = new Date();
    
    try {
      console.log('🚀 Starting high frequency sync...');
      const metadata = await this._getSyncMetadata(jobType) || {};
      
      console.log(`Last sync: ${metadata.lastSyncTimestamp || 'Never'}`);
      
      // Fetch data with error handling
      let newOrders = [];
      let actuallyNewOrders = [];
      let newInvoices = [];
      
      try {
        console.log('📅 Fetching orders...');
        // Get all orders from the date range first
        const allOrders = await zohoInventoryService.getSalesOrders('30_days');
        console.log(`Found ${allOrders.length} total orders in date range.`);
        
        // Filter to only new or recently modified orders
        if (metadata.lastSyncTimestamp) {
          newOrders = allOrders.filter(order => {
            const modifiedTime = order.last_modified_time || order.created_time;
            if (!modifiedTime) return true; // Include if no timestamp
            return new Date(modifiedTime) > new Date(metadata.lastSyncTimestamp);
          });
          console.log(`Filtered to ${newOrders.length} new/modified orders since last sync.`);
          actuallyNewOrders = newOrders; // Track what's actually new
        } else {
          // First sync - take all orders
          newOrders = allOrders;
          actuallyNewOrders = allOrders;
          console.log('First sync - processing all orders.');
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error.message);
      }
      
      try {
        console.log('📄 Fetching invoices...');
        const invoiceResult = await zohoReportsService.getInvoices('30_days');
        // Handle the categorized invoice response structure
        if (invoiceResult && typeof invoiceResult === 'object') {
          // If it's the categorized structure, use the 'all' array
          newInvoices = Array.isArray(invoiceResult.all) ? invoiceResult.all : 
                        Array.isArray(invoiceResult) ? invoiceResult : [];
        } else {
          newInvoices = [];
        }
        console.log(`Found ${newInvoices.length} invoices.`);
      } catch (error) {
        console.error('Failed to fetch invoices:', error.message);
        newInvoices = []; // Ensure it's always an array
      }
      
      // Process orders with error handling
      let orderStats = { new: 0, updated: 0, unchanged: 0, total: 0 };
      if (newOrders.length > 0) {
        try {
          orderStats = await this._batchWrite('sales_orders', newOrders, 'salesorder_id');
          // Only link orders that were actually new or updated
          if (actuallyNewOrders.length > 0) {
            await this._linkNewData(actuallyNewOrders, false);
          }
        } catch (error) {
          console.error('Failed to process orders:', error);
          // Don't throw - continue with invoices
        }
      }
      
      // Process invoices with error handling
      let invoiceStats = { new: 0, updated: 0, unchanged: 0, total: 0 };
      if (newInvoices.length > 0) {
        try {
          invoiceStats = await this._batchWrite('invoices', newInvoices, 'invoice_id');
        } catch (error) {
          console.error('Failed to process invoices:', error);
          // Don't throw - continue with aggregates
        }
      }
      
      // Update aggregates with error handling
      try {
        const affectedDates = this._getAffectedDates(newOrders, newInvoices);
        await this._updateDailyAggregates(affectedDates);
      } catch (error) {
        console.error('Failed to update aggregates:', error);
        // Don't throw - sync is mostly complete
      }
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { 
          orders: {
            total: newOrders.length,
            new: orderStats.new,
            updated: orderStats.updated,
            unchanged: orderStats.unchanged
          },
          invoices: {
            total: newInvoices.length,
            new: invoiceStats.new,
            updated: invoiceStats.updated,
            unchanged: invoiceStats.unchanged
          },
          status: 'completed'
        }
      }, syncTimestamp);
      
      console.log(`✅ High frequency sync completed.`);
      console.log(`   Orders: ${orderStats.new} new, ${orderStats.updated} updated, ${orderStats.unchanged} unchanged`);
      console.log(`   Invoices: ${invoiceStats.new} new, ${invoiceStats.updated} updated, ${invoiceStats.unchanged} unchanged`);
      
      // Log warning if too many records are being processed
      if (newOrders.length > 200 && orderStats.unchanged < orderStats.total * 0.8) {
        console.warn(`⚠️ Large number of changed orders (${orderStats.new + orderStats.updated}). This is unusual for a 15-minute sync.`);
      }
      
    } catch (error) {
      console.error('❌ High frequency sync failed:', error);
      throw error; // Re-throw to indicate failure to the cron handler
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * MEDIUM FREQUENCY SYNC - Every 2-4 hours (FIXED)
   * Catches up on recent orders/invoices and updates daily aggregates.
   */
  async mediumFrequencySync() {
    const jobType = 'medium_frequency_sync';
    if (this.isRunning.get(jobType)) {
      console.log('⏩ Medium frequency sync already running, skipping...');
      return;
    }
    
    this.isRunning.set(jobType, true);
    const syncTimestamp = new Date();
    
    try {
      console.log('🔄 Starting medium frequency sync...');
      const metadata = await this._getSyncMetadata(jobType) || {};
      
      console.log(`Last sync: ${metadata.lastSyncTimestamp || 'Never'}`);
      
      const [newOrders, newInvoices] = await Promise.all([
        zohoInventoryService.getSalesOrders('30_days'),
        zohoReportsService.getInvoices('30_days')
      ]);
      
      let orderStats = { new: 0, updated: 0, unchanged: 0, total: 0 };
      let invoiceStats = { new: 0, updated: 0, unchanged: 0, total: 0 };
      
      if (newOrders.length > 0) {
        orderStats = await this._batchWrite('sales_orders', newOrders, 'salesorder_id');
        await this._linkNewData(newOrders);
      }
      
      if (newInvoices.length > 0) {
        // Handle invoice result structure
        const invoiceArray = Array.isArray(newInvoices) ? newInvoices : newInvoices.all || [];
        invoiceStats = await this._batchWrite('invoices', invoiceArray, 'invoice_id');
      }
      
      const affectedDates = this._getAffectedDates(newOrders, newInvoices);
      await this._updateDailyAggregates(affectedDates);
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { 
          orders: orderStats,
          invoices: invoiceStats,
          affectedDates: affectedDates.length
        }
      }, syncTimestamp);
      
      console.log(`✅ Medium frequency sync completed.`);
      console.log(`   Orders: ${orderStats.new} new, ${orderStats.updated} updated`);
      console.log(`   Invoices: ${invoiceStats.new} new, ${invoiceStats.updated} updated`);
      
    } catch (error) {
      console.error('❌ Medium frequency sync failed:', error);
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * LOW FREQUENCY SYNC - Daily
   */
  async lowFrequencySync() {
    const jobType = 'low_frequency_sync';
    if (this.isRunning.get(jobType)) return;

    this.isRunning.set(jobType, true);
    const syncTimestamp = new Date();

    try {
      console.log('🔄 Starting low frequency sync...');
      const metadata = await this._getSyncMetadata(jobType) || {};

      console.log(`Syncing all data...`);

      const [orders, invoicesResult, purchaseOrders, customers, items] = await Promise.all([
        zohoInventoryService.getSalesOrders('30_days'),
        zohoReportsService.getInvoices('30_days'),
        zohoInventoryService.getPurchaseOrders('30_days'),
        zohoReportsService.getCustomers('all'),
        zohoReportsService.getItems()
      ]);

      // Handle invoice result structure
      const invoices = Array.isArray(invoicesResult) ? invoicesResult : invoicesResult.all || [];

      const stats = {};
      if (orders.length > 0) {
        stats.orders = await this._batchWrite('sales_orders', orders, 'salesorder_id');
        await this._linkNewData(orders);
      }
      if (invoices.length > 0) {
        stats.invoices = await this._batchWrite('invoices', invoices, 'invoice_id');
      }
      if (purchaseOrders.length > 0) {
        stats.purchaseOrders = await this._batchWrite('purchase_orders', purchaseOrders, 'purchaseorder_id');
      }
      if (customers.length > 0) {
        stats.customers = await this._batchWrite('customers', customers, 'customer_id');
      }
      if (items.length > 0) {
        stats.items = await this._batchWrite('items_data', items, 'item_id');
      }
      
      const affectedDates = this._getAffectedDates(orders, invoices);
      await this._updateDailyAggregates(affectedDates);
      
      console.log('📊 Running full daily aggregation...');
      await Promise.all([
        this.dashboardAggregator.runDailyAggregation(),
        this.ordersAggregator.runDailyAggregation(),
        this.purchaseOrdersAggregator.runDailyAggregation()
      ]);
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: stats,
        affectedDates: affectedDates.length
      }, syncTimestamp);
      
      console.log(`✅ Low frequency sync completed.`);
      Object.entries(stats).forEach(([type, stat]) => {
        console.log(`   ${type}: ${stat.new} new, ${stat.updated} updated, ${stat.unchanged} unchanged`);
      });
      
    } catch (error) {
      console.error('❌ Low frequency sync failed:', error);
    } finally {
      this.isRunning.set(jobType, false);
    }
  }
}

export default new CronDataSyncService();