// v2

import admin from 'firebase-admin';
import cronDataSyncService from './cronDataSyncService.js';
import zohoReportsService from './zohoReportsService.js';

class FastDashboardService {
  constructor() {
    this.fallbackTimeout = 5000; // Still unused since fallback is disabled
  }

  /**
   * Fast dashboard data retrieval using cached data only.
   * Throws error if cache is missing or incomplete.
   */
// In server/src/services/fastDashboardService.js

  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();

    try {
      console.log(`⚡️ Fetching LIVE dashboard data for user ${userId}, range: ${dateRange}`);
      
      // Use the zohoReportsService directly to get live, filtered data
      const liveData = await zohoReportsService.getDashboardData(
        userId, 
        dateRange, 
        customDateRange
      );

      if (!liveData) {
        throw new Error('Failed to retrieve live dashboard data from Zoho service.');
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ Live dashboard loaded in ${loadTime}ms`);

      return {
        ...liveData,
        loadTime,
        dataSource: 'live',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Fast dashboard error:', error.message);
      throw error;
    }
  }
  /**
   * Retrieve cached dashboard data (may be stale).
   */
  async getCachedDashboardData(userId, dateRange, isAgent) {
    try {
      const [
        recentOrders,
        quickMetrics,
        brandPerformance,
        customerAnalytics,
        revenueAnalysis,
        agentPerformance,
        recentInvoices
      ] = await Promise.all([
        cronDataSyncService.getCachedData('recent_orders'),
        cronDataSyncService.getCachedData('quick_metrics'),
        cronDataSyncService.getCachedData('brand_performance'),
        cronDataSyncService.getCachedData('customer_analytics'),
        cronDataSyncService.getCachedData('revenue_analysis'),
        !isAgent ? cronDataSyncService.getCachedData('agent_performance') : null,
        cronDataSyncService.getCachedData('recent_invoices')
      ]);

      if (!recentOrders || !quickMetrics || !brandPerformance) {
        console.warn('⚠️ Missing critical cache data: orders, metrics, or brand performance');
        return null;
      }

      const overview = this.buildOverview(recentOrders, customerAnalytics, quickMetrics);

      return {
        role: isAgent ? 'salesAgent' : 'brandManager',
        dateRange,
        overview,
        revenue: revenueAnalysis || { grossRevenue: 0, netRevenue: 0 },
        orders: {
          salesOrders: {
            total: recentOrders.length,
            totalValue: quickMetrics.todayRevenue,
            averageValue: quickMetrics.averageOrderValue,
            latest: recentOrders.slice(0, 10)
          }
        },
        invoices: recentInvoices || { outstanding: [], paid: [], summary: {} },
        performance: {
          brands: brandPerformance.brands || [],
          customers: customerAnalytics?.customers?.slice(0, 10) || [],
          topItems: this.calculateTopItems(recentOrders),
          trends: this.calculateQuickTrends(recentOrders),
          agents: agentPerformance?.agents || []
        },
        dataFreshness: {
          orders: this.getDataFreshness('recent_orders'),
          metrics: this.getDataFreshness('quick_metrics'),
          brands: this.getDataFreshness('brand_performance'),
          revenue: this.getDataFreshness('revenue_analysis')
        }
      };
    } catch (error) {
      console.error('❌ Error getting cached dashboard data:', error.message);
      return null;
    }
  }

  /**
   * Build overview section from available data.
   */
  buildOverview(orders = [], customers = null, metrics = null) {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: metrics?.todayRevenue || totalRevenue,
        averageOrderValue: metrics?.averageOrderValue || (orders.length > 0 ? totalRevenue / orders.length : 0),
        completedOrders: orders.filter(order => order.status === 'confirmed').length,
        pendingOrders: orders.filter(order => order.status === 'draft').length
      },
      topItems: this.calculateTopItems(orders),
      customers: {
        totalCustomers: customers?.summary?.totalCustomers || 0,
        activeCustomers: customers?.summary?.activeCustomers || 0,
        topCustomers: customers?.customers?.slice(0, 5) || [],
        averageOrdersPerCustomer: customers?.customers?.length > 0
          ? customers.customers.reduce((sum, c) => sum + (c.orderCount || 0), 0) / customers.customers.length
          : 0
      }
    };
  }

  /**
   * Calculate top selling items from sales orders.
   */
  calculateTopItems(salesOrders) {
    const itemStats = new Map();

    salesOrders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          if (!itemStats.has(item.item_id)) {
            itemStats.set(item.item_id, {
              itemId: item.item_id,
              name: item.name || 'Unknown Item',
              sku: item.sku || '',
              quantity: 0,
              revenue: 0
            });
          }

          const stats = itemStats.get(item.item_id);
          stats.quantity += parseInt(item.quantity || 0);
          stats.revenue += parseFloat(item.total || 0);
        });
      }
    });

    return Array.from(itemStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  /**
   * Calculate quick trends from recent orders.
   */
  calculateQuickTrends(salesOrders) {
    const trends = new Map();

    salesOrders.forEach(order => {
      const date = new Date(order.date);
      const period = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!trends.has(period)) {
        trends.set(period, {
          period,
          orders: 0,
          revenue: 0,
          date: period
        });
      }

      const trend = trends.get(period);
      trend.orders++;
      trend.revenue += parseFloat(order.total || 0);
    });

    return Array.from(trends.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days
  }

  /**
   * Get data freshness information.
   */
  getDataFreshness(cacheKey) {
    // This would need to be implemented to check cache timestamps.
    return 'Cached (< 2hr)';
  }

  /**
   * Health check for the fast dashboard service.
   */
  async healthCheck() {
    try {
      const cacheStatus = await Promise.all([
        cronDataSyncService.getCachedData('recent_orders'),
        cronDataSyncService.getCachedData('quick_metrics'),
        cronDataSyncService.getCachedData('brand_performance')
      ]);

      const cacheHealth = {
        recentOrders: !!cacheStatus[0],
        quickMetrics: !!cacheStatus[1],
        brandPerformance: !!cacheStatus[2]
      };

      const healthScore = Object.values(cacheHealth).filter(Boolean).length / Object.keys(cacheHealth).length;

      return {
        status: healthScore > 0.5 ? 'healthy' : 'degraded',
        healthScore: Math.round(healthScore * 100),
        cache: cacheHealth,
        recommendation: healthScore < 0.5
          ? 'Run manual sync to populate cache'
          : 'All systems operational',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default new FastDashboardService();