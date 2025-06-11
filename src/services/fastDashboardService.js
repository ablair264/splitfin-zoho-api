// v2 - Updated to be consistent with zohoReportsService changes

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
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();

    try {
      console.log(`⚡ Fast dashboard data fetch for user ${userId}, range: ${dateRange}`);

      const db = admin.firestore();

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const agentId = userData.zohospID; // This is the Zoho Inventory salesperson ID

      const cachedData = await this.getCachedDashboardData(userId, dateRange, isAgent, agentId);
      if (!cachedData) {
        throw new Error('❌ Cache is empty or incomplete. Please run a manual data sync.');
      }

      const loadTime = Date.now() - startTime;
      console.log(`🚀 Dashboard loaded from cache in ${loadTime}ms (Stale data allowed)`);

      return {
        ...cachedData,
        loadTime,
        dataSource: 'cache',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Fast dashboard error:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve cached dashboard data (may be stale).
   * Updated to handle agent-specific filtering
   */
  async getCachedDashboardData(userId, dateRange, isAgent, agentId) {
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

      // Filter data for agents
      let filteredOrders = recentOrders;
      let filteredCustomers = customerAnalytics;
      let filteredInvoices = recentInvoices;

      if (isAgent && agentId) {
        // Filter orders by agent
        filteredOrders = recentOrders.filter(order => order.salesperson_id === agentId);
        
        // Get customer IDs from agent's orders
        const agentCustomerIds = new Set(filteredOrders.map(order => order.customer_id));
        
        // Filter customers
        if (customerAnalytics && customerAnalytics.customers) {
          filteredCustomers = {
            ...customerAnalytics,
            customers: customerAnalytics.customers.filter(customer => 
              agentCustomerIds.has(customer.id)
            )
          };
        }
        
        // Filter invoices by agent's customers
        if (recentInvoices) {
          const filterInvoiceList = (invoices) => 
            invoices.filter(inv => agentCustomerIds.has(inv.customer_id));
          
          filteredInvoices = {
            all: filterInvoiceList(recentInvoices.all || []),
            outstanding: filterInvoiceList(recentInvoices.outstanding || []),
            overdue: filterInvoiceList(recentInvoices.overdue || []),
            dueToday: filterInvoiceList(recentInvoices.dueToday || []),
            dueIn30Days: filterInvoiceList(recentInvoices.dueIn30Days || []),
            paid: filterInvoiceList(recentInvoices.paid || []),
            summary: this.recalculateInvoiceSummary(recentInvoices, agentCustomerIds)
          };
        }
      }

      const overview = this.buildOverview(filteredOrders, filteredCustomers, quickMetrics, isAgent);
      
      // Calculate commission for agents
      let commission = null;
      if (isAgent) {
        const totalSalesValue = filteredOrders.reduce((sum, order) => 
          sum + parseFloat(order.total || 0), 0
        );
        const commissionRate = 0.125; // 12.5%
        commission = {
          rate: commissionRate,
          total: totalSalesValue * commissionRate,
          salesValue: totalSalesValue
        };
      }

      const dashboardData = {
        role: isAgent ? 'salesAgent' : 'brandManager',
        dateRange,
        overview,
        revenue: revenueAnalysis || { grossRevenue: 0, netRevenue: 0 },
        orders: {
          salesOrders: {
            total: filteredOrders.length,
            totalValue: filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
            averageValue: filteredOrders.length > 0 
              ? filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / filteredOrders.length 
              : 0,
            latest: filteredOrders.slice(0, 10)
          }
        },
        invoices: filteredInvoices || { outstanding: [], paid: [], summary: {} },
        performance: {
          brands: brandPerformance.brands || [],
          customers: filteredCustomers?.customers?.slice(0, 10) || [],
          topItems: this.calculateTopItems(filteredOrders),
          trends: this.calculateQuickTrends(filteredOrders),
          agents: agentPerformance?.agents || []
        },
        dataFreshness: {
          orders: this.getDataFreshness('recent_orders'),
          metrics: this.getDataFreshness('quick_metrics'),
          brands: this.getDataFreshness('brand_performance'),
          revenue: this.getDataFreshness('revenue_analysis')
        }
      };

      // Add commission for agents
      if (commission) {
        dashboardData.commission = commission;
      }

      // Add agent performance for brand managers
      if (!isAgent && agentPerformance) {
        dashboardData.agentPerformance = agentPerformance;
      }

      return dashboardData;

    } catch (error) {
      console.error('❌ Error getting cached dashboard data:', error.message);
      return null;
    }
  }

  /**
   * Recalculate invoice summary for filtered invoices
   */
  recalculateInvoiceSummary(invoices, customerIds) {
    const filterAndSum = (invoiceList, field = 'balance') => {
      if (!Array.isArray(invoiceList)) return 0;
      return invoiceList
        .filter(inv => customerIds.has(inv.customer_id))
        .reduce((sum, inv) => sum + parseFloat(inv[field] || 0), 0);
    };

    const filterAndCount = (invoiceList) => {
      if (!Array.isArray(invoiceList)) return 0;
      return invoiceList.filter(inv => customerIds.has(inv.customer_id)).length;
    };

    return {
      totalOverdue: filterAndSum(invoices.overdue || []),
      totalDueToday: filterAndSum(invoices.dueToday || []),
      totalDueIn30Days: filterAndSum(invoices.dueIn30Days || []),
      totalPaid: filterAndSum(invoices.paid || [], 'total'),
      totalOutstanding: filterAndSum(invoices.outstanding || []),
      count: {
        overdue: filterAndCount(invoices.overdue || []),
        dueToday: filterAndCount(invoices.dueToday || []),
        dueIn30Days: filterAndCount(invoices.dueIn30Days || []),
        paid: filterAndCount(invoices.paid || []),
        outstanding: filterAndCount(invoices.outstanding || [])
      }
    };
  }

  /**
   * Build overview section from available data.
   * Updated to handle agent-specific calculations
   */
  buildOverview(orders = [], customers = null, metrics = null, isAgent = false) {
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: isAgent ? totalRevenue : (metrics?.todayRevenue || totalRevenue),
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        completedOrders: orders.filter(order => order.status === 'confirmed').length,
        pendingOrders: orders.filter(order => order.status === 'draft').length
      },
      topItems: this.calculateTopItems(orders),
      customers: {
        totalCustomers: customers?.customers?.length || 0,
        activeCustomers: customers?.customers?.filter(c => {
          if (!c.lastOrderDate) return false;
          const daysSinceLastOrder = (Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
          return daysSinceLastOrder <= 90;
        }).length || 0,
        topCustomers: customers?.customers?.slice(0, 5) || [],
        averageOrdersPerCustomer: customers?.customers?.length > 0
          ? customers.customers.reduce((sum, c) => sum + (c.orderCount || 0), 0) / customers.customers.length
          : 0
      }
    };
  }

  /**
   * Calculate top selling items from sales orders.
   * Updated to include brand information
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
              brand: item.brand || 'Unknown Brand',
              quantity: 0,
              revenue: 0
            });
          }

          const stats = itemStats.get(item.item_id);
          stats.quantity += parseInt(item.quantity || 0);
          stats.revenue += parseFloat(item.item_total || item.total || 0);
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