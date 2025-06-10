// ================================================================
// FILE: src/services/cronDataSyncService.js
// ================================================================

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map(); // Track running jobs by type
    this.lastSync = {};
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
      const brands = await this.getBrandPerformanceSafe();
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
   async lowFrequencySync() {
    const jobType = 'low-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Low frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore(); // Ensure db is defined

    try {
      console.log('🔄 Starting low frequency sync (full data refresh)...');
      
      // --- 1. Sync Sales Orders to 'orders' collection ---
      const allOrders = await zohoReportsService.getSalesOrders('90_days');
      const ordersBatch = db.batch();
      allOrders.forEach(order => {
        const docRef = db.collection('orders').doc(order.salesorder_id);
        ordersBatch.set(docRef, order, { merge: true });
      });
      await ordersBatch.commit();
      console.log(`✅ Synced ${allOrders.length} documents to 'orders' collection.`);

      // --- 2. Sync Invoices to 'invoices' collection ---
      const allInvoicesData = await zohoReportsService.getInvoices('90_days');
      const invoicesBatch = db.batch();
      // Note: your getInvoices function returns an object with an 'all' property
      allInvoicesData.all.forEach(invoice => {
        const docRef = db.collection('invoices').doc(invoice.invoice_id);
        invoicesBatch.set(docRef, invoice, { merge: true });
      });
      await invoicesBatch.commit();
      console.log(`✅ Synced ${allInvoicesData.all.length} documents to 'invoices' collection.`);

      // --- 3. Sync Purchase Orders to 'purchase_orders' collection ---
      const allPurchaseOrders = await zohoReportsService.getPurchaseOrders('90_days');
      const purchaseOrdersBatch = db.batch();
      allPurchaseOrders.forEach(po => {
        const docRef = db.collection('purchase_orders').doc(po.purchaseorder_id);
        purchaseOrdersBatch.set(docRef, po, { merge: true });
      });
      await purchaseOrdersBatch.commit();
      console.log(`✅ Synced ${allPurchaseOrders.length} documents to 'purchase_orders' collection.`);
      
      // Note: We are no longer caching historical_trends or all_items here,
      // as they can be calculated from the main collections if needed.
      
      // You can keep this or remove it, as it's less relevant now.
      await this.cleanupOldCache(); 
      
      const duration = Date.now() - startTime;
      this.lastSync.low = new Date();
      
      console.log(`✅ Low frequency sync completed in ${duration}ms`);
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: allOrders.length,
          invoices: allInvoicesData.all.length,
          purchaseOrders: allPurchaseOrders.length
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