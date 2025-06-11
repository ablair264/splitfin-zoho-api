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
  
  async syncSalesTransactions() {
  console.log('🔄 Syncing Line Items to sales_transactions collection...');
  try {
    const db = admin.firestore();
    // Fetch all the orders you want to process
    const salesOrders = await zohoReportsService.getSalesOrders('2_years');

    const transactions = [];
    salesOrders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          // Create a new, flat object for each line item
          transactions.push({
            // Line item data
            transaction_id: item.line_item_id, // Use line_item_id as the document ID
            item_id: item.item_id,
            item_name: item.name,
            sku: item.sku,
            quantity: parseInt(item.quantity || 0),
            price: parseFloat(item.rate || 0),
            total: parseFloat(item.total || 0),

            // Copied data from the parent order
            order_id: order.salesorder_id,
            order_number: order.salesorder_number,
            order_date: order.date,
            customer_id: order.customer_id,
            customer_name: order.customer_name,
            salesperson_id: order.salesperson_id,
            salesperson_name: order.salesperson_name
          });
        });
      }
    });

    if (transactions.length === 0) {
      console.log('✅ No new transactions to sync.');
      return { success: true, count: 0 };
    }

    // Use your existing batch write helper to safely write all transactions
    await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
    
    return { success: true, count: transactions.length };
    
  } catch (error) {
    console.error('❌ Sales transactions sync failed:', error);
    return { success: false, error: error.message };
  }
}
  
  // Add this helper function inside the CronDataSyncService class

  /**
   * Writes an array of data to a Firestore collection in batches of 499.
   * @param {FirebaseFirestore.Firestore} db The Firestore instance.
   * @param {string} collectionName The name of the collection to write to.
   * @param {Array<Object>} dataArray The array of data to write.
   * @param {string} idKey The property name in each object to use as the document ID.
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
        if (docId) { // Ensure there's an ID to use
          const docRef = collectionRef.doc(docId.toString());
          batch.set(docRef, item, { merge: true });
        }
      });
      
      promises.push(batch.commit());
    }

    await Promise.all(promises);
    console.log(`✅ Synced ${dataArray.length} documents to '${collectionName}' collection in ${promises.length} batch(es).`);
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes during business hours
   * Lightweight, fast data that users need to be current
   */
  async highFrequencySync() {
    const jobType = 'high-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ High frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();

    try {
      console.log('🔄 Starting high frequency sync...');
      
      // Get recent sales orders (last 24 hours only)
      const recentOrders = await zohoReportsService.getSalesOrders('today');
      await this.cacheData('recent_orders', recentOrders, '15min');
      
      // Quick invoice status check (last 7 days)
      const recentInvoices = await zohoReportsService.getInvoices('7_days');
      await this.cacheData('recent_invoices', recentInvoices, '15min');
      
      // Calculate quick metrics from cached data
      const quickMetrics = await this.calculateQuickMetrics(recentOrders, recentInvoices);
      await this.cacheData('quick_metrics', quickMetrics, '15min');
      
      const duration = Date.now() - startTime;
      this.lastSync.high = new Date();
      
      console.log(`✅ High frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration, 
        recordsProcessed: recentOrders.length + recentInvoices.all.length,
        cacheKeys: ['recent_orders', 'recent_invoices', 'quick_metrics']
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
   * More comprehensive data that doesn't need to be real-time
   */
  async mediumFrequencySync() {
    const jobType = 'medium-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Medium frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();

    try {
      console.log('🔄 Starting medium frequency sync...');
      
      // Brand performance with limited pagination to avoid 400 errors
      const brands = await zohoReportsService.getBrandPerformance();
      await this.cacheData('brand_performance', brands, '2hr');
      
      // Customer analytics (30 days)
      const customers = await zohoReportsService.getCustomerAnalytics('30_days');
      await this.cacheData('customer_analytics', customers, '2hr');
      
      // Revenue analysis
      const revenue = await zohoReportsService.getRevenueAnalysis('30_days');
      await this.cacheData('revenue_analysis', revenue, '2hr');
      
      // Agent performance (if not sales agent view)
      const agentPerformance = await zohoReportsService.getAgentPerformance('30_days');
      await this.cacheData('agent_performance', agentPerformance, '2hr');
      
      const duration = Date.now() - startTime;
      this.lastSync.medium = new Date();
      
      console.log(`✅ Medium frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        cacheKeys: ['brand_performance', 'customer_analytics', 'revenue_analysis', 'agent_performance']
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
   * Heavy data processing and full refreshes
   */
   // Replace your existing lowFrequencySync function with this one

// Replace your existing lowFrequencySync function with this one

  // Replace your existing lowFrequencySync function with this one

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
      
      console.log('📦 Syncing all products from CRM...');
      const productSyncResult = await syncInventory(true);
      
      // --- Fetch data in smaller, quarterly chunks to avoid API errors ---
      const allOrders = [];
      const allInvoices = [];
      const allPurchaseOrders = [];
      const quartersToSync = 8; // 4 quarters per year * 2 years

      for (let q = 0; q < quartersToSync; q++) {
        const now = new Date();
        // Go back quarter by quarter
        const endDate = new Date(now.getFullYear(), now.getMonth() - (q * 3), 1);
        const startDate = new Date(now.getFullYear(), now.getMonth() - ((q + 1) * 3), 1);
        
        const customDateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };

        console.log(`   - Fetching data for quarter: ${customDateRange.start} to ${customDateRange.end}`);

        // Fetch each data type for the current quarter
        const [ordersChunk, invoicesChunk, poChunk] = await Promise.all([
            zohoReportsService.getSalesOrders('custom', customDateRange),
            zohoReportsService.getInvoices('custom', customDateRange),
            zohoReportsService.getPurchaseOrders('custom', customDateRange)
        ]);

        if (ordersChunk.length > 0) allOrders.push(...ordersChunk);
        if (invoicesChunk.all.length > 0) allInvoices.push(...invoicesChunk.all);
        if (poChunk.length > 0) allPurchaseOrders.push(...poChunk);
      }

      // --- Now, batch write the combined results ---
      await this._batchWrite(db, 'orders', allOrders, 'salesorder_id');
      await this._batchWrite(db, 'invoices', allInvoices, 'invoice_id');
      await this._batchWrite(db, 'purchase_orders', allPurchaseOrders, 'purchaseorder_id');
      
      const transactionSyncResult = await this.syncSalesTransactions();
      const customerIdSyncResult = await syncInventoryCustomerIds();
      await this.cleanupOldCache(); 
      
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
   * SAFE BRAND PERFORMANCE - Avoids the pagination issue
   */
  async getBrandPerformanceSafe() {
    try {
      // Skip the problematic CRM Products call and use sales order data only
      const salesOrders = await zohoReportsService.getSalesOrders('30_days');
      
      const brandStats = new Map();
      
      salesOrders.forEach(order => {
        if (order.line_items && Array.isArray(order.line_items)) {
          order.line_items.forEach(item => {
            // Extract brand from item name
            let brand = 'Unknown';
            if (item.name) {
              const brandMatch = item.name.match(/^([A-Za-z0-9]+)[\s\-\_]/);
              brand = brandMatch ? brandMatch[1] : item.name.substring(0, 15);
            }
            
            if (!brandStats.has(brand)) {
              brandStats.set(brand, {
                brand,
                revenue: 0,
                quantity: 0,
                productCount: new Set(),
                orders: new Set()
              });
            }
            
            const stats = brandStats.get(brand);
            stats.revenue += parseFloat(item.total || 0);
            stats.quantity += parseInt(item.quantity || 0);
            stats.productCount.add(item.item_id || item.name);
            stats.orders.add(order.salesorder_id);
          });
        }
      });

      const brands = Array.from(brandStats.values()).map(stats => ({
        brand: stats.brand,
        revenue: stats.revenue,
        quantity: stats.quantity,
        productCount: stats.productCount.size,
        orderCount: stats.orders.size,
        averageOrderValue: stats.orders.size > 0 ? stats.revenue / stats.orders.size : 0
      })).sort((a, b) => b.revenue - a.revenue);

      const totalRevenue = brands.reduce((sum, brand) => sum + brand.revenue, 0);
      
      return {
        brands,
        summary: {
          totalBrands: brands.length,
          totalRevenue,
          topBrand: brands[0] || null
        }
      };
      
    } catch (error) {
      console.error('❌ Safe brand performance calculation failed:', error);
      return { brands: [], summary: { totalBrands: 0, totalRevenue: 0, topBrand: null } };
    }
  }

  /**
   * CACHE DATA with expiry and metadata
   */
  async cacheData(key, data, ttl = '1hr') {
    try {
      const expiryMap = {
        '15min': 15 * 60 * 1000,
        '1hr': 60 * 60 * 1000,
        '2hr': 2 * 60 * 60 * 1000,
        '24hr': 24 * 60 * 60 * 1000
      };

      const cacheEntry = {
        data,
        timestamp: new Date().toISOString(),
        expires: new Date(Date.now() + expiryMap[ttl]).toISOString(),
        ttl,
        size: JSON.stringify(data).length
      };
      
      const db = admin.firestore();
      await db.collection('dashboard_cache').doc(key).set(cacheEntry);
      
      console.log(`📄 Cached ${key} (${cacheEntry.size} bytes, TTL: ${ttl})`);
      
    } catch (error) {
      console.error(`❌ Error caching ${key}:`, error);
    }
  }


  async getCachedData(key) { // The 'maxAge' parameter is no longer needed
    try {
      const db = admin.firestore();
      const doc = await db.collection('dashboard_cache').doc(key).get();
      
      if (!doc.exists) {
        console.log(`❌ No cached data found for ${key}`);
        return null;
      }
      
      const cached = doc.data();
      const age = Date.now() - new Date(cached.timestamp).getTime();

      // The 'if (isExpired)' block has been completely removed.
      // We will now log the age and return the data regardless.
      
      console.log(`✅ Using cached data for ${key} (${Math.round(age/1000)}s old) - Stale data is allowed.`);
      return cached.data;
      
    } catch (error) {
      console.error(`❌ Error getting cached data for ${key}:`, error);
      return null;
    }
  }

  /**
   * CALCULATE QUICK METRICS from cached data
   */
  async calculateQuickMetrics(orders, invoices) {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const outstandingAmount = invoices.outstanding.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0);
    
    return {
      todayOrders: orders.length,
      todayRevenue: totalRevenue,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      outstandingInvoices: invoices.outstanding.length,
      outstandingAmount,
      lastCalculated: new Date().toISOString()
    };
  }

  /**
   * CALCULATE HISTORICAL TRENDS
   */
  async calculateHistoricalTrends(salesOrders) {
    const trends = new Map();
    
    salesOrders.forEach(order => {
      const date = new Date(order.date);
      const period = date.toISOString().split('T')[0];
      
      if (!trends.has(period)) {
        trends.set(period, { period, orders: 0, revenue: 0, date: period });
      }
      
      const trend = trends.get(period);
      trend.orders++;
      trend.revenue += parseFloat(order.total || 0);
    });
    
    return Array.from(trends.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * CLEANUP OLD CACHE ENTRIES
   */
  async cleanupOldCache() {
    try {
      const db = admin.firestore();
      const oldEntries = await db.collection('dashboard_cache')
        .where('expires', '<', new Date().toISOString())
        .get();
      
      const batch = db.batch();
      oldEntries.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      console.log(`🧹 Cleaned up ${oldEntries.size} expired cache entries`);
      
    } catch (error) {
      console.error('❌ Error cleaning up cache:', error);
    }
  }

  /**
   * GET SYNC STATUS for monitoring
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