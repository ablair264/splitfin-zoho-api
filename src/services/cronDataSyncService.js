// src/services/cronDataSyncService.js
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
   */
  async _batchWrite(collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) return;

    const collectionRef = db.collection(collectionName);
    const BATCH_SIZE = 50; // Reduced from 400 to 50 for safety
    const BATCH_OPERATIONS_LIMIT = 450; // Firestore limit is 500, leaving buffer
    
    let mainBatch = db.batch();
    let operationCount = 0; // Track total operations (main doc + line items)
    let documentCount = 0;
    let totalDocuments = dataArray.length;
    let batchNumber = 1;
    
    console.log(`📝 Starting batch write for ${totalDocuments} ${collectionName} documents...`);

    for (const item of dataArray) {
        const docId = item[idKey];
        if (!docId) continue;

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

        const docRef = collectionRef.doc(String(docId));
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
    
    console.log(`✅ Successfully wrote/updated ${totalDocuments} documents in ${collectionName} across ${batchNumber} batches.`);
  }
  
  /**
   * Links newly synced orders to their respective customers and sales agents.
   */
  async _linkNewData(newlySyncedOrders) {
    if (!newlySyncedOrders || newlySyncedOrders.length === 0) return;

    console.log(`🔗 Starting post-sync linking for ${newlySyncedOrders.length} orders...`);
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

    for (const order of newlySyncedOrders) {
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
    
    orders.forEach(order => {
      if (order.date) dates.add(new Date(order.date).toISOString().split('T')[0]);
      if (order.modified_time) dates.add(new Date(order.modified_time).toISOString().split('T')[0]);
    });
    
    invoices.forEach(invoice => {
      if (invoice.date) dates.add(new Date(invoice.date).toISOString().split('T')[0]);
    });
    
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
      const lookbackDate = new Date(syncTimestamp.getTime() - 20 * 60 * 1000);
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      // Fetch data with error handling
      let newOrders = [];
      let newInvoices = [];
      
      try {
        console.log('📅 Fetching orders...');
        newOrders = await zohoInventoryService.getSalesOrders('30_days');
        console.log(`Found ${newOrders.length} orders. Fetching details...`);
      } catch (error) {
        console.error('Failed to fetch orders:', error.message);
      }
      
      try {
        console.log('📄 Fetching invoices...');
        newInvoices = await zohoReportsService.getInvoices('30_days');
        console.log(`Found ${newInvoices.length} invoices.`);
      } catch (error) {
        console.error('Failed to fetch invoices:', error.message);
      }
      
      // Process orders with error handling
      if (newOrders.length > 0) {
        try {
          await this._batchWrite('sales_orders', newOrders, 'salesorder_id');
          await this._linkNewData(newOrders);
        } catch (error) {
          console.error('Failed to process orders:', error);
          // Don't throw - continue with invoices
        }
      }
      
      // Process invoices with error handling
      if (newInvoices.length > 0) {
        try {
          await this._batchWrite('invoices', newInvoices, 'invoice_id');
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
          orders: newOrders.length, 
          invoices: newInvoices.length,
          status: 'completed'
        }
      }, syncTimestamp);
      
      console.log(`✅ High frequency sync completed. Orders: ${newOrders.length}, Invoices: ${newInvoices.length}`);
      
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
      const lookbackDate = new Date(syncTimestamp.getTime() - 4 * 60 * 60 * 1000); 
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      const [newOrders, newInvoices] = await Promise.all([
        zohoInventoryService.getSalesOrders('30_days'),
        zohoReportsService.getInvoices('30_days')
      ]);
      
      if (newOrders.length > 0) {
        await this._batchWrite('sales_orders', newOrders, 'salesorder_id');
        await this._linkNewData(newOrders);
      }
      
      if (newInvoices.length > 0) {
        await this._batchWrite('invoices', newInvoices, 'invoice_id');
      }
      
      const affectedDates = this._getAffectedDates(newOrders, newInvoices);
      await this._updateDailyAggregates(affectedDates);
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { 
          orders: newOrders.length, 
          invoices: newInvoices.length,
          affectedDates: affectedDates.length
        }
      }, syncTimestamp);
      
      console.log(`✅ Medium frequency sync completed. Orders: ${newOrders.length}, Invoices: ${newInvoices.length}`);
      
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
      const lookbackDate = new Date(syncTimestamp.getTime() - 25 * 60 * 60 * 1000);
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;

      console.log(`Syncing all data modified since ${lastSync.toISOString()}`);

      const [orders, invoices, purchaseOrders, customers, items] = await Promise.all([
        zohoInventoryService.getSalesOrders('30_days'),
        zohoReportsService.getInvoices('30_days'),
        zohoInventoryService.getPurchaseOrders('30_days'),
        zohoReportsService.getCustomers('all'),
        zohoReportsService.getItems()
      ]);

      if (orders.length > 0) {
        await this._batchWrite('sales_orders', orders, 'salesorder_id');
        await this._linkNewData(orders);
      }
      if (invoices.length > 0) await this._batchWrite('invoices', invoices, 'invoice_id');
      if (purchaseOrders.length > 0) await this._batchWrite('purchase_orders', purchaseOrders, 'purchaseorder_id');
      if (customers.length > 0) await this._batchWrite('customers', customers, 'customer_id');
      if (items.length > 0) await this._batchWrite('items_data', items, 'item_id');
      
      const affectedDates = this._getAffectedDates(orders, invoices);
      await this._updateDailyAggregates(affectedDates);
      
      console.log('📊 Running full daily aggregation...');
      await Promise.all([
        this.dashboardAggregator.runDailyAggregation(),
        this.ordersAggregator.runDailyAggregation(),
        this.purchaseOrdersAggregator.runDailyAggregation()
      ]);
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { 
            orders: orders.length, 
            invoices: invoices.length, 
            purchaseOrders: purchaseOrders.length, 
            customers: customers.length,
            items: items.length,
            affectedDates: affectedDates.length
        }
      }, syncTimestamp);
      
      console.log(`✅ Low frequency sync completed.`);
      
    } catch (error) {
      console.error('❌ Low frequency sync failed:', error);
    } finally {
      this.isRunning.set(jobType, false);
    }
  }
}

export default new CronDataSyncService();
