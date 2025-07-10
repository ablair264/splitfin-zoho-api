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
   * Writes an array of data to a specified collection in batches.
   * Now handles creating sub-collections for sales order line items.
   */
  async _batchWrite(collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) return;

    const collectionRef = db.collection(collectionName);
    const BATCH_SIZE = 400;
    let mainBatch = db.batch();
    let writeCount = 0;

    for (const item of dataArray) {
        const docId = item[idKey];
        if (!docId) continue;

        if (writeCount > 0 && writeCount % BATCH_SIZE === 0) {
            await mainBatch.commit();
            mainBatch = db.batch();
        }

        const docRef = collectionRef.doc(String(docId));
        const itemWithMetadata = {
            ...item,
            _lastSynced: Timestamp.now(),
            _syncSource: 'zoho_api'
        };
        
        if (collectionName === 'sales_orders' && item.line_items && Array.isArray(item.line_items)) {
            const lineItems = itemWithMetadata.line_items;
            delete itemWithMetadata.line_items;

            const itemsSubCollection = docRef.collection('order_line_items');
            lineItems.forEach(lineItem => {
                const lineItemId = lineItem.line_item_id || itemsSubCollection.doc().id;
                mainBatch.set(itemsSubCollection.doc(lineItemId), lineItem);
            });
        }

        mainBatch.set(docRef, itemWithMetadata, { merge: true });
        writeCount++;
    }

    if (writeCount > 0) {
        await mainBatch.commit();
    }
    console.log(`✅ Wrote/updated ${writeCount} documents in ${collectionName}.`);
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

    let batch = db.batch();
    let linkCount = 0;

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

        if (linkCount > 0 && linkCount % 400 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }

    if (linkCount > 0) {
        await batch.commit();
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
    if (this.isRunning.get(jobType)) return;
    
    this.isRunning.set(jobType, true);
    const syncTimestamp = new Date();
    
    try {
      console.log('🚀 Starting high frequency sync...');
      const metadata = await this._getSyncMetadata(jobType) || {};
      const lookbackDate = new Date(syncTimestamp.getTime() - 20 * 60 * 1000);
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      const newOrders = await zohoInventoryService.getSalesOrders('30_days');
      const newInvoices = await zohoReportsService.getInvoices('30_days');
      
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
      
      console.log(`✅ High frequency sync completed. Orders: ${newOrders.length}, Invoices: ${newInvoices.length}`);
      
    } catch (error) {
      console.error('❌ High frequency sync failed:', error);
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
