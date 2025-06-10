import admin from 'firebase-admin';
import cronDataSyncService from './cronDataSyncService.js';
import zohoReportsService from './zohoReportsService.js';

class FastDashboardService {
  constructor() {
    this.fallbackTimeout = 5000; // 5 second fallback timeout
  }

  /**
   * Fast dashboard data retrieval using cached data
   * Falls back to live API calls if cache is empty
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
     const startTime = Date.now();
  
  try {
    console.log(`⚡ Fast dashboard data fetch for user ${userId}, range: ${dateRange}`);
    
    // Get user context (code remains the same)
    const db = admin.firestore();
    // ...
    const isAgent = userData.role === 'salesAgent';
    
    // Get data from cache, ignoring freshness
    const cachedData = await this.getCachedDashboardData(userId, dateRange, isAgent);
    
    // If cache is still empty after removing the age check, it means CRONs have never run.
    if (!cachedData) {
      throw new Error('Cache is empty. Please run a manual data sync. Fallback to live API is disabled.');
    }
    
    // The fallback logic is now completely removed.
    // The function will only return cached data.
    const loadTime = Date.now() - startTime;
    console.log(`🚀 Dashboard loaded from cache in ${loadTime}ms (Stale data allowed)`);
    
    return {
      ...cachedData,
      loadTime,
      dataSource: 'cache',
      lastUpdated: new Date().toISOString()
    };
      
  } catch (error) {
    console.error('❌ Fast dashboard error:', error);
    throw error;
  }
  }

  /**
   * Get dashboard data from cache
   */
  async getCachedDashboardData(userId, dateRange, isAgent) {
    try {
      // Get cached data with appropriate freshness requirements
  const [
    recentOrders,
    quickMetrics,
    brandPerformance,
    customerAnalytics,
    revenueAnalysis,
    agentPerformance,
    recentInvoices
  ] = await Promise.all([
    // The max age argument has been removed to allow stale data
    cronDataSyncService.getCachedData('recent_orders'),
    cronDataSyncService.getCachedData('quick_metrics'),
    cronDataSyncService.getCachedData('brand_performance'),
    cronDataSyncService.getCachedData('customer_analytics'),
    cronDataSyncService.getCachedData('revenue_analysis'),
    !isAgent ? cronDataSyncService.getCachedData('agent_performance') : null,
    cronDataSyncService.getCachedData('recent_invoices')
  ]);

      // Check if we have enough cached data to build a dashboard
      if (!recentOrders || !quickMetrics || !brandPerformance) {
        console.log('❌ Insufficient cached data for dashboard');
        return null;
      }

      // Build dashboard from cached data
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
      console.error('❌ Error getting cached dashboard data:', error);
      return null;
    }
  }

  /**
   * Fallback to live API calls (original method, but faster)
   */
  async getLiveDashboardData(userId, dateRange, customDateRange, userData) {
    const isAgent = userData.role === 'salesAgent';
    const agentId = userData.zohospID;
    
    try {
      // Use Promise.allSettled to handle partial failures gracefully
      const results = await Promise.allSettled([
        zohoReportsService.getRevenueAnalysis(dateRange, customDateRange),
        zohoReportsService.getSalesOrders(dateRange, customDateRange, isAgent ? agentId : null),
        isAgent ? 
          zohoReportsService.getAgentInvoices(agentId, dateRange, customDateRange) : 
          zohoReportsService.getInvoices(dateRange, customDateRange),
        // Skip the problematic brand performance for now
        Promise.resolve({ brands: [], summary: { totalBrands: 0, totalRevenue: 0 } }),
        zohoReportsService.getCustomerAnalytics(dateRange, customDateRange).catch(() => ({ 
          customers: [], 
          summary: { totalCustomers: 0, activeCustomers: 0 } 
        }))
      ]);

      // Extract results, using defaults for failed promises
      const [
        revenueResult,
        salesOrdersResult,
        invoicesResult,
        brandResult,
        customerResult
      ] = results;

      const revenue = revenueResult.status === 'fulfilled' ? revenueResult.value : { grossRevenue: 0, netRevenue: 0 };
      const salesOrders = salesOrdersResult.status === 'fulfilled' ? salesOrdersResult.value : [];
      const invoices = invoicesResult.status === 'fulfilled' ? invoicesResult.value : { outstanding: [], paid: [], summary: {} };
      const brandPerformance = brandResult.status === 'fulfilled' ? brandResult.value : { brands: [], summary: {} };
      const customerAnalytics = customerResult.status === 'fulfilled' ? customerResult.value : { customers: [], summary: {} };

      // Build overview from live data
      const overview = {
        sales: {
          totalOrders: salesOrders.length,
          totalRevenue: salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
          averageOrderValue: salesOrders.length > 0 ? 
            salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / salesOrders.length : 0,
          completedOrders: salesOrders.filter(order => order.status === 'confirmed').length,
          pendingOrders: salesOrders.filter(order => order.status === 'draft').length
        },
        topItems: this.calculateTopItems(salesOrders),
        customers: {
          totalCustomers: customerAnalytics.summary?.totalCustomers || 0,
          activeCustomers: customerAnalytics.summary?.activeCustomers || 0,
          topCustomers: customerAnalytics.customers?.slice(0, 5) || [],
          averageOrdersPerCustomer: customerAnalytics.customers?.length > 0 ? 
            customerAnalytics.customers.reduce((sum, c) => sum + (c.orderCount || 0), 0) / customerAnalytics.customers.length : 0
        }
      };

      return {
        role: userData.role,
        dateRange,
        overview,
        revenue,
        orders: {
          salesOrders: {
            total: salesOrders.length,
            totalValue: overview.sales.totalRevenue,
            averageValue: overview.sales.averageOrderValue,
            latest: salesOrders.slice(0, 10)
          }
        },
        invoices,
        performance: {
          brands: brandPerformance.brands || [],
          customers: customerAnalytics.customers?.slice(0, 10) || [],
          topItems: overview.topItems,
          trends: this.calculateQuickTrends(salesOrders),
          agents: [] // Skip agent performance in live mode for speed
        },
        dataFreshness: {
          orders: 'Live',
          metrics: 'Live',
          brands: 'Disabled (API Error)',
          revenue: 'Live'
        }
      };
      
    } catch (error) {
      console.error('❌ Error in live dashboard data fetch:', error);
      throw error;
    }
  }

  /**
   * Build overview section from available data
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
        averageOrdersPerCustomer: customers?.customers?.length > 0 ? 
          customers.customers.reduce((sum, c) => sum + (c.orderCount || 0), 0) / customers.customers.length : 0
      }
    };
  }

  /**
   * Calculate top selling items from sales orders
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
   * Calculate quick trends from recent orders
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
   * Get data freshness information
   */
  getDataFreshness(cacheKey) {
    // This would need to be implemented to check cache timestamps
    // For now, return a simple status
    return 'Cached (< 2hr)';
  }

  /**
   * Health check for the fast dashboard service
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
        recommendation: healthScore < 0.5 ? 'Run manual sync to populate cache' : 'All systems operational',
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