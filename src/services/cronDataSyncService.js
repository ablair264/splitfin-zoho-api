// src/services/cronDataSyncService.js
// Refactored to focus solely on syncing raw data from Zoho to Firestore.
// All dashboard-specific calculations have been moved to dashboardAggregator.js.

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import zohoInventoryService from './zohoInventoryService.js'; // Assuming this handles Zoho API calls

const db = getFirestore();

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
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
        
        // Special handling for sales_orders to move line_items to a sub-collection
        if (collectionName === 'sales_orders' && item.line_items && Array.isArray(item.line_items)) {
            const lineItems = itemWithMetadata.line_items;
            delete itemWithMetadata.line_items; // Remove from parent document

            const itemsSubCollection = docRef.collection('order_line_items');
            lineItems.forEach(lineItem => {
                const lineItemId = lineItem.line_item_id || itemsSubCollection.doc().id;
                // Add to the main batch, as it's a different path
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
   * NEW: Links newly synced orders to their respective customers and sales agents.
   */
  async _linkNewData(newlySyncedOrders) {
    if (!newlySyncedOrders || newlySyncedOrders.length === 0) return;

    console.log(`🔗 Starting post-sync linking for ${newlySyncedOrders.length} orders...`);
    const customersRef = db.collection('customers');
    const agentsRef = db.collection('sales_agents');

    // Pre-fetch all agents to avoid querying in a loop
    const agentSnapshot = await agentsRef.get();
    const agentMap = new Map();
    agentSnapshot.forEach(doc => {
        const agentData = doc.data();
        if (agentData.zohospID) {
            agentMap.set(agentData.zohospID, doc.ref);
        }
    });

    const batch = db.batch();
    let linkCount = 0;

    for (const order of newlySyncedOrders) {
        const orderId = order.salesorder_id;
        if (!orderId) continue;

        // 1. Link to Customer
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

        // 2. Link to Sales Agent
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
      const lookbackDate = new Date(syncTimestamp.getTime() - 20 * 60 * 1000); // 20 min lookback
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      const newOrders = await zohoInventoryService.getSalesOrders({ modified_since: lastSync.toISOString() });
      const newInvoices = await zohoInventoryService.getInvoices({ modified_since: lastSync.toISOString() });
      
      if (newOrders.length > 0) {
        await this._batchWrite('sales_orders', newOrders, 'salesorder_id');
        await this._linkNewData(newOrders); // Link the new orders
      }
      
      if (newInvoices.length > 0) {
        await this._batchWrite('invoices', newInvoices, 'invoice_id');
      }
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { orders: newOrders.length, invoices: newInvoices.length }
      }, syncTimestamp);
      
    } catch (error) {
      console.error('❌ High frequency sync failed:', error);
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
      const lookbackDate = new Date(syncTimestamp.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const lastSync = metadata.lastSyncTimestamp ? new Date(metadata.lastSyncTimestamp) : lookbackDate;

      console.log(`Syncing all data modified since ${lastSync.toISOString()}`);

      const [orders, invoices, purchaseOrders, customers, items] = await Promise.all([
        zohoInventoryService.getSalesOrders({ modified_since: lastSync.toISOString() }),
        zohoInventoryService.getInvoices({ modified_since: lastSync.toISOString() }),
        zohoInventoryService.getPurchaseOrders({ modified_since: lastSync.toISOString() }),
        zohoInventoryService.getCustomers({ modified_since: lastSync.toISOString() }),
        zohoInventoryService.getItems({ modified_since: lastSync.toISOString() })
      ]);

      if (orders.length > 0) {
        await this._batchWrite('sales_orders', orders, 'salesorder_id');
        await this._linkNewData(orders); // Link the new orders
      }
      if (invoices.length > 0) await this._batchWrite('invoices', invoices, 'invoice_id');
      if (purchaseOrders.length > 0) await this._batchWrite('purchase_orders', purchaseOrders, 'purchaseorder_id');
      if (customers.length > 0) await this._batchWrite('customers', customers, 'customer_id');
      if (items.length > 0) await this._batchWrite('items_data', items, 'item_id');
      
      await this._updateSyncMetadata(jobType, {
        recordsProcessed: { 
            orders: orders.length, 
            invoices: invoices.length, 
            purchaseOrders: purchaseOrders.length, 
            customers: customers.length,
            items: items.length
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
