// src/services/cronDataSyncService.js
// Cleaned up version with proper incremental syncing and brand handling

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import dataNormalizerService from './dataNormalizerService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';
import productSyncService from './productSyncService.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
    this.lastSync = {};
    
    // Brand mappings for sales transactions
    this.brandMappings = {
      'rader': { display: 'Räder', normalized: 'rader' },
      'räder': { display: 'Räder', normalized: 'rader' },
      'remember': { display: 'Remember', normalized: 'remember' },
      'my flame lifestyle': { display: 'My Flame Lifestyle', normalized: 'my-flame-lifestyle' },
      'my flame': { display: 'My Flame Lifestyle', normalized: 'my-flame-lifestyle' },
      'blomus': { display: 'Blomus', normalized: 'blomus' },
      'relaxound': { display: 'Relaxound', normalized: 'relaxound' },
      'junglebox': { display: 'Relaxound', normalized: 'relaxound' },
      'zwitscherbox': { display: 'Relaxound', normalized: 'relaxound' },
      'oceanbox': { display: 'Relaxound', normalized: 'relaxound' },
      'lakesidebox': { display: 'Relaxound', normalized: 'relaxound' },
      'birdybox': { display: 'Relaxound', normalized: 'relaxound' },
      'gefu': { display: 'GEFU', normalized: 'gefu' },
      'elvang': { display: 'Elvang', normalized: 'elvang' }
    };
  }
  
  /**
   * Get sync metadata for a specific sync type
   */
  async getSyncMetadata(syncType) {
    try {
      const db = admin.firestore();
      const doc = await db.collection('sync_metadata').doc(syncType).get();
      
      if (doc.exists) {
        return doc.data();
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting sync metadata for ${syncType}:`, error);
      return null;
    }
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(syncType, data) {
    try {
      const db = admin.firestore();
      await db.collection('sync_metadata').doc(syncType).set({
        ...data,
        lastSync: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating sync metadata for ${syncType}:`, error);
    }
  }

  /**
   * Determine brand from item name
   */
  determineBrand(itemName) {
    if (!itemName) return { display: 'Unknown', normalized: 'unknown' };
    
    const itemNameLower = itemName.toLowerCase();
    
    for (const [pattern, brandInfo] of Object.entries(this.brandMappings)) {
      if (itemNameLower.includes(pattern)) {
        return brandInfo;
      }
    }
    
    return { display: 'Unknown', normalized: 'unknown' };
  }
  
  /**
   * Process and enrich sales transactions with proper brand info
   */
  processSalesTransactions(orders) {
    const transactions = [];
    
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          // Determine brand from item name if not provided
          let brandInfo = { display: 'Unknown', normalized: 'unknown' };
          
          if (item.brand && item.brand !== 'Unknown') {
            // Use existing brand but normalize it
            const brandLower = item.brand.toLowerCase();
            brandInfo = this.brandMappings[brandLower] || {
              display: item.brand,
              normalized: brandLower.replace(/\s+/g, '-')
            };
          } else {
            // Determine from item name
            brandInfo = this.determineBrand(item.name);
          }
          
          // Calculate total if missing
          const itemTotal = item.item_total || item.total || 
                          (parseFloat(item.rate || 0) * parseInt(item.quantity || 0));
          
          transactions.push({
            transaction_id: item.line_item_id || `${order.salesorder_id}_${item.item_id}`,
            item_id: item.item_id,
            item_name: item.name,
            sku: item.sku,
            brand: brandInfo.display,
            brand_normalized: brandInfo.normalized,
            quantity: parseInt(item.quantity || 0),
            price: parseFloat(item.rate || 0),
            total: itemTotal,
            order_id: order.salesorder_id,
            order_number: order.salesorder_number,
            order_date: order.date,
            customer_id: order.customer_id,
            customer_name: order.customer_name,
            salesperson_id: order.salesperson_id || '',
            salesperson_name: order.salesperson_name || '',
            is_marketplace_order: order.is_marketplace_order || false,
            marketplace_source: order.marketplace_source || null,
            created_at: order.date,
            last_modified: admin.firestore.FieldValue.serverTimestamp()
          });
        });
      }
    });
    
    return transactions;
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Only syncs orders and invoices modified in the last hour
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
      console.log('🔄 Starting high frequency sync (last hour changes)...');
      
      // Get metadata from last sync
      const metadata = await this.getSyncMetadata('high_frequency') || {};
      const lastSync = metadata.lastSync ? new Date(metadata.lastSync) : new Date(Date.now() - 60 * 60 * 1000);
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      // Get recently modified orders (last hour)
      const recentOrders = await zohoReportsService.getSalesOrders('today');
      
      // Filter orders modified after last sync
      const newOrders = recentOrders.filter(order => {
        const orderDate = new Date(order.last_modified_time || order.date);
        return orderDate > lastSync;
      });
      
      let orderCount = 0;
      let transactionCount = 0;
      
      if (newOrders.length > 0) {
        console.log(`Found ${newOrders.length} new/modified orders`);
        
        // Process orders
        await this._batchWrite(db, 'orders', newOrders, 'salesorder_id');
        orderCount = newOrders.length;
        
        // Process transactions with proper brand info
        const transactions = this.processSalesTransactions(newOrders);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
          transactionCount = transactions.length;
        }
        
        // Enrich normalized orders
        await this.enrichNormalizedOrdersWithLineItems(newOrders.map(o => o.salesorder_id));
      }
      
      // Get recent invoices
      const recentInvoices = await zohoReportsService.getInvoices('today');
      const invoiceData = Array.isArray(recentInvoices) ? recentInvoices : 
                         [...(recentInvoices.all || []), ...(recentInvoices.outstanding || [])];
      
      // Filter invoices modified after last sync
      const newInvoices = invoiceData.filter(invoice => {
        const invoiceDate = new Date(invoice.last_modified_time || invoice.date);
        return invoiceDate > lastSync;
      });
      
      let invoiceCount = 0;
      
      if (newInvoices.length > 0) {
        console.log(`Found ${newInvoices.length} new/modified invoices`);
        await this.syncAndNormalizeInvoices(newInvoices);
        invoiceCount = newInvoices.length;
      }
      
      // Only run normalization if we have new data
      if (orderCount > 0 || invoiceCount > 0) {
        await dataNormalizerService.normalizeRecentData(lastSync);
      }
      
      // Update metadata
      await this.updateSyncMetadata('high_frequency', {
        recordsProcessed: {
          orders: orderCount,
          transactions: transactionCount,
          invoices: invoiceCount
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ High frequency sync completed in ${duration}ms`);
      console.log(`   Processed: ${orderCount} orders, ${transactionCount} transactions, ${invoiceCount} invoices`);
      
      return { 
        success: true, 
        duration, 
        recordsProcessed: {
          orders: orderCount,
          transactions: transactionCount,
          invoices: invoiceCount
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
   * Catches any missed records from the last 24 hours
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
      console.log('🔄 Starting medium frequency sync (last 24 hours)...');
      
      // Get yesterday and today's data to catch any missed records
      const [ordersToday, ordersYesterday] = await Promise.all([
        zohoReportsService.getSalesOrders('today'),
        zohoReportsService.getSalesOrders('yesterday')
      ]);
      
      const allOrders = [...ordersToday, ...ordersYesterday];
      
      // Remove duplicates
      const uniqueOrders = Array.from(
        new Map(allOrders.map(order => [order.salesorder_id, order])).values()
      );
      
      if (uniqueOrders.length > 0) {
        await this._batchWrite(db, 'orders', uniqueOrders, 'salesorder_id');
        
        // Process transactions
        const transactions = this.processSalesTransactions(uniqueOrders);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
        }
        
        // Enrich orders
        await this.enrichNormalizedOrdersWithLineItems(uniqueOrders.map(o => o.salesorder_id));
      }
      
      // Sync invoices from last 24 hours
      const invoicesResult = await zohoReportsService.getInvoices('7_days');
      const recentInvoices = [...(invoicesResult.all || []), ...(invoicesResult.outstanding || [])];
      
      // Filter to last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24HourInvoices = recentInvoices.filter(inv => 
        new Date(inv.date) >= oneDayAgo
      );
      
      if (last24HourInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(last24HourInvoices);
      }
      
      // Update metadata
      await this.updateSyncMetadata('medium_frequency', {
        recordsProcessed: {
          orders: uniqueOrders.length,
          invoices: last24HourInvoices.length
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Medium frequency sync completed in ${duration}ms`);
      
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: uniqueOrders.length,
          invoices: last24HourInvoices.length
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
   * Comprehensive sync of last 7 days + cleanup
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
      console.log('🔄 Starting low frequency sync (weekly cleanup)...');
      
      // Sync product updates
      console.log('📦 Syncing product catalog updates...');
      const productSyncResult = await syncInventory(false); // incremental update
      
      // Get last 7 days of data for comprehensive sync
      const [orders7Days, invoices7Days, purchaseOrders7Days] = await Promise.all([
        zohoReportsService.getSalesOrders('7_days'),
        zohoReportsService.getInvoices('7_days'),
        zohoReportsService.getPurchaseOrders('7_days')
      ]);

      // Process all data
      if (orders7Days.length > 0) {
        await this._batchWrite(db, 'orders', orders7Days, 'salesorder_id');
        
        // Process transactions with brand enrichment
        const transactions = this.processSalesTransactions(orders7Days);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
        }
        
        // Enrich all orders from the week
        await this.enrichNormalizedOrdersWithLineItems(orders7Days.map(o => o.salesorder_id));
      }
      
      // Process invoices
      const allInvoices = [
        ...(invoices7Days.all || []),
        ...(invoices7Days.outstanding || []),
        ...(invoices7Days.overdue || [])
      ];
      
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
      }
      
      // Process purchase orders
      if (purchaseOrders7Days.length > 0) {
        await this._batchWrite(db, 'purchase_orders', purchaseOrders7Days, 'purchaseorder_id');
      }
      
      // Update customer analytics
      console.log('👥 Updating customer analytics...');
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
      
      // Run full normalization
      console.log('🔄 Running weekly data normalization...');
      await dataNormalizerService.normalizeAllData();
      
      // Update metadata
      await this.updateSyncMetadata('low_frequency', {
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders7Days.length,
          invoices: uniqueInvoices.length,
          purchaseOrders: purchaseOrders7Days.length,
          customers: customers.customers?.length || 0
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Low frequency sync completed in ${duration}ms`);
      
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders7Days.length,
          invoices: uniqueInvoices.length,
          purchaseOrders: purchaseOrders7Days.length,
          customers: customers.customers?.length || 0
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
   * Sync and normalize invoices
   */
  async syncAndNormalizeInvoices(invoices) {
    console.log(`🔄 Processing ${invoices.length} invoices...`);
    try {
      const db = admin.firestore();
      
      // Get user mappings
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
          invoice_id: invoice.invoice_id,
          invoice_number: invoice.invoice_number,
          balance: parseFloat(invoice.balance || 0),
          total: parseFloat(invoice.total || 0),
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          customer_email: invoice.email || invoice.customer_email || '',
          status: invoice.status,
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          salesperson_id: invoice.salesperson_id || null,
          salesAgent_uid: salesAgentUid,
          date: invoice.date || invoice.invoice_date,
          _source: 'zoho_api',
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _normalized_at: admin.firestore.FieldValue.serverTimestamp()
        };
      });
      
      // Write to collections
      await this._batchWrite(db, 'normalized_invoices', normalizedInvoices, 'invoice_id');
      await this._batchWrite(db, 'invoices', invoices, 'invoice_id');
      
      console.log(`✅ Processed ${normalizedInvoices.length} invoices`);
      return { success: true, count: normalizedInvoices.length };
      
    } catch (error) {
      console.error('❌ Invoice processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enrich normalized orders with line items
   */
  async enrichNormalizedOrdersWithLineItems(orderIds) {
    if (!orderIds || orderIds.length === 0) return { success: true, count: 0 };
    
    console.log(`🔄 Enriching ${orderIds.length} orders with line items...`);
    try {
      const result = await dataNormalizerService.enrichNormalizedOrdersWithLineItems(orderIds);
      return result;
    } catch (error) {
      console.error('❌ Error enriching orders:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Helper function to write data in batches
   */
  async _batchWrite(db, collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) {
      return;
    }

    const collectionRef = db.collection(collectionName);
    const BATCH_SIZE = 400;
    
    let currentBatch = db.batch();
    let currentBatchSize = 0;
    let batchCount = 0;
    let skippedCount = 0;
    
    for (const item of dataArray) {
      const docId = item[idKey];
      
      if (!docId || String(docId).trim() === '') {
        skippedCount++;
        continue;
      }
      
      const cleanDocId = String(docId).trim();
      
      try {
        if (currentBatchSize >= BATCH_SIZE) {
          await currentBatch.commit();
          batchCount++;
          currentBatch = db.batch();
          currentBatchSize = 0;
        }
        
        const docRef = collectionRef.doc(cleanDocId);
        const itemWithMetadata = {
          ...item,
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _syncSource: 'zoho_api'
        };
        
        currentBatch.set(docRef, itemWithMetadata, { merge: true });
        currentBatchSize++;
        
      } catch (error) {
        console.error(`Error processing document ${cleanDocId}:`, error.message);
        skippedCount++;
      }
    }
    
    if (currentBatchSize > 0) {
      await currentBatch.commit();
      batchCount++;
    }
    
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} documents in ${collectionName}`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      runningJobs: Array.from(this.isRunning.entries())
        .filter(([_, running]) => running)
        .map(([job]) => job),
      lastSync: this.lastSync,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

export default new CronDataSyncService();