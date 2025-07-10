import {
  analyzeCrossSelling,
  analyzeBrandCannibalization,
  analyzeGeographicPerformance,
  predictCustomerLifetimeValue
} from './dmBrandsAdvancedAnalytics.js';

import DailyDashboardAggregator from './dailyDashboardAggregator.js';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

class DashboardController {
  constructor() {
    this.aggregator = new DailyDashboardAggregator();
    this.cache = new Map();
  }

  /**
   * Get dashboard data for a user
   */
  async getDashboardData(req, res) {
    try {
      const { userId, userRole, dateRange, customDateRange } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Generate cache key
      const cacheKey = `${userId}-${userRole}-${dateRange}-${JSON.stringify(customDateRange || {})}`;
      
      // Check cache (5 minute TTL)
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
        return res.json({ data: cached.data, cached: true });
      }

      let dashboardData;
      
      // Handle sales agents differently - use their specific aggregates
      if (userRole === 'salesAgent') {
        // Get agent ID from user document
        const agentQuery = await db.collection('sales_agents')
          .where('uid', '==', userId)
          .limit(1)
          .get();
          
        if (agentQuery.empty) {
          return res.status(404).json({ error: 'Agent profile not found' });
        }
        
        const agentId = agentQuery.docs[0].id;
        
        // Get agent-specific dashboard using their daily aggregates
        dashboardData = await this.aggregator.getAgentDashboard(agentId, dateRange);
        
        // Enhance with real-time invoice data
        dashboardData = await this.enhanceAgentDashboard(dashboardData, agentId);
        
      } else {
        // Brand managers get the full aggregated view
        if (dateRange === 'custom' && customDateRange) {
          // Custom date range
          const startDate = new Date(customDateRange.start);
          const endDate = new Date(customDateRange.end);
          
          dashboardData = await this.aggregator.getDashboardData(
            'custom',
            startDate,
            endDate
          );
        } else {
          // Predefined date range
          dashboardData = await this.aggregator.getDashboardData(dateRange);
        }
        
        // Enhance with additional real-time data
        dashboardData = await this.enhanceWithRealtimeData(dashboardData, userRole);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: dashboardData,
        timestamp: Date.now()
      });

      res.json({ data: dashboardData });

    } catch (error) {
      console.error('Dashboard data error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }

 async getForecast(req, res) {
    try {
      const { dashboardData } = req.body;

      if (!dashboardData) {
        return res.status(400).json({ error: 'Dashboard data is required for forecasting.' });
      }

      // Run multiple analyses in parallel for a comprehensive forecast
      const [crossSell, cannibalization, geo, clv] = await Promise.all([
        analyzeCrossSelling(dashboardData.orders || [], dashboardData.topItems || []),
        analyzeBrandCannibalization(dashboardData.topBrands || [], {}),
        analyzeGeographicPerformance(dashboardData.topAgents || [], {}, {}),
        predictCustomerLifetimeValue(dashboardData.topCustomers || [], {})
      ]);

      // Combine results into a single forecast object
      const forecast = {
        crossSell,
        cannibalization,
        geo,
        clv,
        overview: `Comprehensive analysis complete. Key insights found in brand synergies, customer lifetime value, and geographic performance.`
      };

      res.json({ data: forecast });

    } catch (error) {
      console.error('Forecast generation error:', error);
      res.status(500).json({ error: 'Failed to generate forecast data' });
    }
  }

  /**
   * Filter dashboard data for a specific agent
   */
  async filterForAgent(dashboardData, agentId) {
    // Get agent info
    const agentDoc = await db.collection('sales_agents').doc(agentId).get();
    if (!agentDoc.exists) {
      throw new Error('Agent not found');
    }

    const agentData = agentDoc.data();
    const agentZohoId = agentData.zohospID || agentId;

    // Filter metrics
    const agentMetrics = dashboardData.byAgent[agentZohoId] || dashboardData.byAgent[agentId] || {
      orders: 0,
      revenue: 0,
      days: 0
    };

    // Calculate commission
    const COMMISSION_RATE = 0.05;
    const commission = agentMetrics.revenue * COMMISSION_RATE;

    // Get agent's customers from sub-collection
    const customerOrdersSnapshot = await agentDoc.ref
      .collection('customers_orders')
      .where('order_date', '>=', dashboardData.dateRange.start.split('T')[0])
      .where('order_date', '<=', dashboardData.dateRange.end.split('T')[0])
      .get();

    const customerMap = new Map();
    customerOrdersSnapshot.docs.forEach(doc => {
      const order = doc.data();
      if (!customerMap.has(order.customer_name)) {
        customerMap.set(order.customer_name, {
          name: order.customer_name,
          totalSpent: 0,
          orderCount: 0,
          lastOrderDate: order.order_date
        });
      }
      
      const customer = customerMap.get(order.customer_name);
      customer.totalSpent += order.total || 0;
      customer.orderCount += 1;
      if (order.order_date > customer.lastOrderDate) {
        customer.lastOrderDate = order.order_date;
      }
    });

    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);

    // Filter items (would need agent association on items)
    // For now, return top items from overall data
    const topItems = dashboardData.topItems?.slice(0, 20) || [];

    return {
      ...dashboardData,
      metrics: {
        totalRevenue: agentMetrics.revenue,
        totalOrders: agentMetrics.orders,
        averageOrderValue: agentMetrics.orders > 0 
          ? agentMetrics.revenue / agentMetrics.orders 
          : 0,
        totalCommission: commission,
        commissionRate: COMMISSION_RATE,
        totalCustomers: customerMap.size,
        uniqueCustomers: customerMap.size,
        activeDays: agentMetrics.days
      },
      topCustomers,
      topItems,
      commission: {
        total: commission,
        rate: COMMISSION_RATE
      },
      // Keep daily breakdown for charts
      dailyBreakdown: dashboardData.dailyBreakdown
    };
  }

  /**
   * Enhance agent dashboard with real-time data
   */
  async enhanceAgentDashboard(dashboardData, agentId) {
    // Get agent's assigned customers for invoice filtering
    const assignedCustomersSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('assigned_customers')
      .get();
    
    const customerIds = assignedCustomersSnapshot.docs.map(doc => doc.data().customer_id);
    
    if (customerIds.length === 0) {
      // No assigned customers, no invoices
      dashboardData.invoices = {
        outstanding: [],
        overdue: [],
        paid: [],
        summary: {
          totalOutstanding: 0,
          totalOverdue: 0,
          outstandingCount: 0,
          overdueCount: 0
        }
      };
      return dashboardData;
    }
    
    // Batch query invoices for agent's customers
    const now = new Date();
    const invoices = [];
    
    // Firestore 'in' query limit is 10
    for (let i = 0; i < customerIds.length; i += 10) {
      const batch = customerIds.slice(i, i + 10);
      const invoicesSnapshot = await db.collection('invoices')
        .where('customer_id', 'in', batch)
        .where('date', '>=', dashboardData.dateRange.start)
        .where('date', '<=', dashboardData.dateRange.end)
        .get();
      
      invoices.push(...invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }
    
    // Categorize invoices
    const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void');
    const overdueInvoices = outstandingInvoices.filter(i => {
      const dueDate = new Date(i.due_date);
      return dueDate < now;
    });
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    
    dashboardData.invoices = {
      outstanding: outstandingInvoices,
      overdue: overdueInvoices,
      paid: paidInvoices,
      summary: {
        totalOutstanding: outstandingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0),
        totalOverdue: overdueInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0),
        outstandingCount: outstandingInvoices.length,
        overdueCount: overdueInvoices.length
      }
    };
    
    // Add invoice metrics to main metrics
    dashboardData.metrics = {
      ...dashboardData.metrics,
      ...dashboardData.invoices.summary
    };
    
    return dashboardData;
  }
  
  /**
   * Enhance with real-time data (invoices, etc.)
   */
  async enhanceWithRealtimeData(dashboardData, userRole) {
    // Get current invoice status (these change frequently)
    const now = new Date();
    
    const [outstandingSnapshot, overdueSnapshot] = await Promise.all([
      db.collection('invoices')
        .where('status', 'in', ['sent', 'overdue', 'partially_paid'])
        .limit(100)
        .get(),
      db.collection('invoices')
        .where('status', 'in', ['overdue'])
        .limit(100)
        .get()
    ]);

    const outstandingInvoices = outstandingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const overdueInvoices = overdueSnapshot.docs.map(doc => {
      const data = doc.data();
      const dueDate = new Date(data.due_date);
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      
      return {
        id: doc.id,
        ...data,
        days_overdue: daysOverdue
      };
    });

    // Add invoice data
    dashboardData.invoices = {
      outstanding: outstandingInvoices,
      overdue: overdueInvoices,
      summary: {
        totalOutstanding: outstandingInvoices.reduce((sum, inv) => 
          sum + (inv.balance || 0), 0
        ),
        totalOverdue: overdueInvoices.reduce((sum, inv) => 
          sum + (inv.balance || 0), 0
        ),
        outstandingCount: outstandingInvoices.length,
        overdueCount: overdueInvoices.length
      }
    };

    // Add invoice metrics to main metrics
    dashboardData.metrics = {
      ...dashboardData.metrics,
      ...dashboardData.invoices.summary
    };

    return dashboardData;
  }

  /**
   * Trigger calculation for missing dates
   */
  async calculateMissingDates(req, res) {
    try {
      const { startDate, endDate } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates required' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const missingDates = await this.aggregator.findMissingDates(start, end);
      
      if (missingDates.length === 0) {
        return res.json({ 
          message: 'No missing dates', 
          missingDates: [] 
        });
      }

      // Calculate in background
      this.aggregator.backfillDailyAggregates(start, end)
        .then(() => console.log('Backfill completed'))
        .catch(err => console.error('Backfill error:', err));

      res.json({ 
        message: `Started calculating ${missingDates.length} missing dates`,
        missingDates 
      });

    } catch (error) {
      console.error('Calculate missing dates error:', error);
      res.status(500).json({ error: 'Failed to calculate missing dates' });
    }
  }
}

export default DashboardController;