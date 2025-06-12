// src/services/collectionDashboardService.js
// Updated to use normalized collections for better performance and accuracy

import admin from 'firebase-admin';

class CollectionDashboardService {
  constructor() {
    this.db = admin.firestore();

    // Bind 'this' to the methods that need it
    this.getManagerDashboardNormalized = this.getManagerDashboardNormalized.bind(this);
    this.getDashboardData = this.getDashboardData.bind(this);
    // Add any other methods that use 'this' and are called in a way that might lose context
  }
  /**
   * Get date range helper
   */
  getDateRange(dateRange, customDateRange = null) {
    const now = new Date();
    let startDate, endDate;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case '7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case '30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'custom':
        if (customDateRange) {
          startDate = new Date(customDateRange.start);
          endDate = new Date(customDateRange.end);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    return { startDate, endDate };
  }

  /**
   * Get dashboard data with timeout protection
   */
  async getDashboardDataWithTimeout(userId, dateRange = '30_days', customDateRange = null) {
    const TIMEOUT_MS = 25000; // 25 seconds
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard query timeout')), TIMEOUT_MS);
    });
    
    try {
      const result = await Promise.race([
        this.getDashboardData(userId, dateRange, customDateRange),
        timeoutPromise
      ]);
      return result;
    } catch (error) {
      if (error.message === 'Dashboard query timeout') {
        console.error('⏱️ Dashboard query timed out, returning limited data');
        return this.getLimitedDashboardData(userId, dateRange, customDateRange);
      }
      throw error;
    }
  }

  /**
   * Main dashboard data retrieval using NORMALIZED collections
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();

    try {
      console.log(`📊 Fetching dashboard data for user ${userId}, range: ${dateRange}`);

      // Get user context with Firebase UID
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const userUid = userId; // The userId IS the Firebase UID
      
      console.log(`👤 User: ${userData.name} (${userData.role}), UID: ${userUid}`);

      // Get date range
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch data based on role using normalized collections
      const dashboardData = isAgent 
        ? await this.getAgentDashboardNormalized(userUid, startISO, endISO, dateRange)
        : await this.getManagerDashboardNormalized(startISO, endISO, dateRange);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Dashboard loaded in ${loadTime}ms`);

      // Ensure proper data structure
      const structure = {
        hasOverview: true,
        hasRevenue: true,
        hasOrders: true,
        hasInvoices: true,
        hasPerformance: true,
        hasAgentPerformance: !isAgent
      };

      return {
        ...dashboardData,
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'normalized-collections',
        structure,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Dashboard error:', error.message);
      throw error;
    }
  }

async getManagerDashboardNormalized(startISO, endISO, dateRange) {
  console.log(`🔍 Building manager dashboard using normalized data`);

  // Fetch all data for the period
  const [
    ordersSnapshot,
    customersSnapshot,
    invoicesSnapshot,
    agentsSnapshot
  ] = await Promise.all([
    // Get all orders
    this.db.collection('normalized_orders')
      .where('created_time', '>=', startISO)
      .where('created_time', '<=', endISO)
      .orderBy('created_time', 'desc')
      .get(),

    // Get all customers
    this.db.collection('normalized_customers').get(),

    // Get all invoices
    this.db.collection('invoices')
      .where('date', '>=', startISO)
      .where('date', '<=', endISO)
      .get(),

    // Get all agents
    this.db.collection('users')
      .where('role', '==', 'salesAgent')
      .get()
  ]);

  // STEP 1: Process all the data from snapshots FIRST
  // Process orders
  const orders = ordersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      order_number: data.order_number,
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      salesperson_id: data.salesperson_id,
      salesperson_uid: data.salesperson_uid,
      salesperson_name: data.salesperson_name,
      date: data.created_time,
      total: data.total_amount,
      status: data.order_status,
      line_items: data.line_items || [],
      is_marketplace_order: data.is_marketplace_order || false,
      marketplace_source: data.marketplace_source || null
    };
  });

  // Process customers
  const customers = customersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Process invoices
  const invoices = invoicesSnapshot.docs.map(doc => doc.data());

  // Process agents
  const agents = agentsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // STEP 2: Now do logging and calculations
  // Separate marketplace and regular orders
  const marketplaceOrders = orders.filter(o => o.is_marketplace_order);
  const regularOrders = orders.filter(o => !o.is_marketplace_order);
  
  console.log(`📊 Found ${regularOrders.length} regular orders, ${marketplaceOrders.length} marketplace orders`);
  console.log(`👥 Found ${customers.length} customers, ${agents.length} agents`);

  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, order) => 
    sum + (order.total || 0), 0
  );

  // Process invoices
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const invoiceCategories = this.categorizeInvoices(invoices, today);

  // STEP 3: Build derived data (overview, performance, etc.)
  // Build overview - NOW customers is defined
  const overview = this.buildManagerOverview(orders, customers);

  // Calculate agent performance
  const agentPerformance = this.calculateAgentPerformanceNormalized(orders, agents);

  // Get brand performance
  const brandPerformance = this.calculateBrandPerformanceFromOrders(orders);

  // Calculate top items
  const topItems = this.calculateTopItemsFromOrders(orders);

  // STEP 4: Build final response structure
  // Build metrics object
  const metrics = {
    revenue: totalRevenue,
    orders: orders.length,
    customers: customers.length,
    agents: agents.length,
    brands: brandPerformance.length,
    totalRevenue: totalRevenue,
    totalOrders: orders.length,
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    outstandingInvoices: invoiceCategories.outstanding.reduce((sum, inv) => 
      sum + (parseFloat(inv.balance) || 0), 0
    ),
    marketplaceOrders: marketplaceOrders.length,
    regularOrders: regularOrders.length
  };

  // Return complete dashboard data
  return {
    metrics,
    overview,
    revenue: {
      grossRevenue: totalRevenue,
      netRevenue: totalRevenue * 0.8,
      taxAmount: totalRevenue * 0.2,
      paidRevenue: invoiceCategories.paid.reduce((sum, inv) => 
        sum + (parseFloat(inv.total) || 0), 0
      ),
      outstandingRevenue: invoiceCategories.outstanding.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      profitMargin: 30,
      period: dateRange
    },
    orders: {
      salesOrders: {
        total: orders.length,
        totalValue: totalRevenue,
        averageValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        latest: orders.slice(0, 10),
        marketplace: marketplaceOrders.length,
        regular: regularOrders.length
      }
    },
    invoices: {
      ...invoiceCategories,
      summary: this.calculateInvoiceSummary(invoiceCategories)
    },
    performance: {
      brands: brandPerformance,
      topItems: topItems,
      trends: this.calculateTrends(orders),
      top_customers: customers
        .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 10)
        .map(c => ({
          id: c.customer_id,
          name: c.customer_name,
          total_spent: c.total_spent || 0,
          order_count: c.order_count || 0
        })),
      top_items: topItems.slice(0, 10).map(item => ({
        id: item.itemId,
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
        brand: item.brand
      }))
    },
    agentPerformance,
    orders: orders,
    invoices: invoiceCategories,
    commission: null
  };
}

return {
    metrics,
    overview,
    revenue: {
      grossRevenue: totalRevenue,
      netRevenue: totalRevenue * 0.8,
      taxAmount: totalRevenue * 0.2,
      paidRevenue: invoiceCategories.paid.reduce((sum, inv) => 
        sum + (parseFloat(inv.total) || 0), 0
      ),
      outstandingRevenue: invoiceCategories.outstanding.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      profitMargin: 30,
      period: dateRange
    },
    orders: orders, // This should be the array of orders
    ordersSummary: { // Rename this to avoid conflict
      salesOrders: {
        total: orders.length,
        totalValue: totalRevenue,
        averageValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        latest: orders.slice(0, 10),
        marketplace: marketplaceOrders.length,
        regular: regularOrders.length
      }
    },
    invoices: {
      ...invoiceCategories,
      summary: this.calculateInvoiceSummary(invoiceCategories)
    },
    performance: {
      brands: brandPerformance,
      topItems: topItems,
      trends: this.calculateTrends(orders),
      top_customers: customers
        .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 10)
        .map(c => ({
          id: c.customer_id,
          name: c.customer_name,
          total_spent: c.total_spent || 0,
          order_count: c.order_count || 0
        })),
      top_items: topItems.slice(0, 10).map(item => ({
        id: item.itemId,
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue,
        brand: item.brand
      }))
    },
    agentPerformance,
    commission: null // Remove the duplicate orders: orders line
  };
}

  /**
   * Get limited dashboard data for timeout scenarios
   */
  async getLimitedDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();
    
    try {
      console.log(`🚨 Fetching LIMITED dashboard data for user ${userId}`);
      
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }
      
      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const userUid = userId;
      
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      // Fetch LIMITED data with strict limits
      const LIMIT = 50;
      
      let ordersQuery = this.db.collection('normalized_orders')
        .orderBy('created_time', 'desc')
        .limit(LIMIT);
      
      if (isAgent) {
        ordersQuery = this.db.collection('normalized_orders')
          .where('salesperson_uid', '==', userUid)
          .orderBy('created_time', 'desc')
          .limit(LIMIT);
      }
      
      const ordersSnapshot = await ordersQuery.get();
      
      // Map orders to frontend expected structure
      const orders = ordersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            order_number: data.order_number,
            customer_id: data.customer_id,
            customer_name: data.customer_name,
            date: data.created_time,
            total: data.total_amount,
            status: data.order_status,
            line_items: data.line_items || []
          };
        })
        .filter(order => order.date >= startISO && order.date <= endISO);
      
      const totalRevenue = orders.reduce((sum, order) => 
        sum + (order.total || 0), 0
      );
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Limited dashboard loaded in ${loadTime}ms`);
      
      // Build minimal metrics
      const metrics = {
        revenue: totalRevenue,
        orders: orders.length,
        customers: undefined,
        agents: isAgent ? 1 : undefined,
        brands: undefined
      };
      
      return {
        metrics,
        overview: {
          sales: {
            totalOrders: orders.length,
            totalRevenue: totalRevenue,
            averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
            note: '⚠️ Showing limited data due to performance constraints'
          }
        },
        revenue: {
          grossRevenue: totalRevenue,
          netRevenue: totalRevenue * 0.8,
          taxAmount: totalRevenue * 0.2,
          period: dateRange,
          isLimited: true
        },
        orders: {
          salesOrders: {
            total: orders.length,
            totalValue: totalRevenue,
            latest: orders.slice(0, 10),
            isLimited: true
          }
        },
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'normalized-collections-limited',
        lastUpdated: new Date().toISOString(),
        warning: 'Limited data shown. Try a smaller date range for full data.'
      };
      
    } catch (error) {
      console.error('❌ Limited dashboard error:', error.message);
      throw error;
    }
  }
  
  /**
   * Categorize invoices by status
   */
  categorizeInvoices(invoices, today) {
    const categorized = {
      all: invoices,
      outstanding: [],
      overdue: [],
      dueToday: [],
      dueIn30Days: [],
      paid: []
    };

    invoices.forEach(invoice => {
      if (invoice.status === 'paid') {
        categorized.paid.push(invoice);
      } else {
        categorized.outstanding.push(invoice);
        
        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          invoice.daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          categorized.overdue.push(invoice);
        } else if (dueDate.getTime() === today.getTime()) {
          categorized.dueToday.push(invoice);
        } else {
          const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 30) {
            categorized.dueIn30Days.push(invoice);
          }
        }
      }
    });

    return categorized;
  }

  /**
   * Calculate invoice summary
   */
  calculateInvoiceSummary(invoiceCategories) {
    return {
      totalOverdue: invoiceCategories.overdue.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      totalDueToday: invoiceCategories.dueToday.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      totalDueIn30Days: invoiceCategories.dueIn30Days.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      totalPaid: invoiceCategories.paid.reduce((sum, inv) => 
        sum + (parseFloat(inv.total) || 0), 0
      ),
      totalOutstanding: invoiceCategories.outstanding.reduce((sum, inv) => 
        sum + (parseFloat(inv.balance) || 0), 0
      ),
      count: {
        overdue: invoiceCategories.overdue.length,
        dueToday: invoiceCategories.dueToday.length,
        dueIn30Days: invoiceCategories.dueIn30Days.length,
        paid: invoiceCategories.paid.length,
        outstanding: invoiceCategories.outstanding.length
      }
    };
  }

  /**
   * Build overview for agents
   */
  buildAgentOverview(orders, customers) {
    // Calculate top customers using normalized fields
    const topCustomers = customers
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.customer_id,
        name: c.customer_name,
        totalSpent: c.total_spent || 0,
        orderCount: c.order_count || 0
      }));

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        completedOrders: orders.filter(o => 
          o.status === 'confirmed' || o.status === 'completed'
        ).length,
        pendingOrders: orders.filter(o => 
          o.status === 'draft' || o.status === 'pending'
        ).length
      },
      customers: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.order_count > 0).length,
        topCustomers,
        averageOrdersPerCustomer: customers.length > 0 
          ? customers.reduce((sum, c) => sum + (c.order_count || 0), 0) / customers.length
          : 0
      },
      topItems: this.calculateTopItemsFromOrders(orders).slice(0, 5)
    };
  }

  /**
   * Build overview for managers
   */
  buildManagerOverview(orders, customers) {
    // Get active customers (ordered in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const activeCustomers = customers.filter(c => {
      if (!c.last_order_date) return false;
      return new Date(c.last_order_date) > ninetyDaysAgo;
    });

    const topCustomers = customers
      .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
      .slice(0, 5)
      .map(c => ({
        id: c.customer_id,
        name: c.customer_name,
        totalSpent: c.total_spent || 0,
        orderCount: c.order_count || 0,
        segment: c.segment || 'Low'
      }));

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: totalRevenue,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        completedOrders: orders.filter(o => 
          o.status === 'confirmed' || o.status === 'completed'
        ).length,
        pendingOrders: orders.filter(o => 
          o.status === 'draft' || o.status === 'pending'
        ).length
      },
      customers: {
        totalCustomers: customers.length,
        activeCustomers: activeCustomers.length,
        topCustomers,
        averageOrdersPerCustomer: customers.length > 0 
          ? customers.reduce((sum, c) => sum + (c.order_count || 0), 0) / customers.length
          : 0
      },
      topItems: this.calculateTopItemsFromOrders(orders).slice(0, 5)
    };
  }

  /**
   * Calculate agent performance using normalized data
   */
  calculateAgentPerformanceNormalized(orders, agents) {
    const agentMap = new Map();
    
    // Initialize agents
    agents.forEach(agent => {
      agentMap.set(agent.id, {
        agentId: agent.zohospID,
        agentName: agent.name || 'Unknown',
        agentUid: agent.id, // Firebase UID
        totalRevenue: 0,
        totalOrders: 0,
        customers: new Set(),
        averageOrderValue: 0
      });
    });

    // Calculate metrics from orders using mapped fields
    orders.forEach(order => {
      if (order.salesperson_uid && agentMap.has(order.salesperson_uid)) {
        const agent = agentMap.get(order.salesperson_uid);
        agent.totalRevenue += order.total || 0; // Use mapped field
        agent.totalOrders += 1;
        if (order.customer_id) {
          agent.customers.add(order.customer_id);
        }
      }
    });

    // Convert to array and calculate averages
    const agentsList = Array.from(agentMap.values()).map(agent => ({
      ...agent,
      customers: agent.customers.size,
      averageOrderValue: agent.totalOrders > 0 
        ? agent.totalRevenue / agent.totalOrders 
        : 0
    }));

    // Sort by revenue
    agentsList.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalRevenue = agentsList.reduce((sum, agent) => sum + agent.totalRevenue, 0);

    return {
      agents: agentsList,
      summary: {
        totalAgents: agentsList.length,
        totalRevenue,
        averageRevenue: agentsList.length > 0 ? totalRevenue / agentsList.length : 0,
        topPerformer: agentsList[0] || null
      }
    };
  }

  /**
   * Calculate brand performance from normalized orders
   */
  calculateBrandPerformanceFromOrders(orders) {
    const brandMap = new Map();
    
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          const brand = item.brand || 'Unknown';
          
          if (!brandMap.has(brand)) {
            brandMap.set(brand, {
              brand,
              revenue: 0,
              quantity: 0,
              orderCount: new Set(),
              productCount: new Set()
            });
          }
          
          const brandData = brandMap.get(brand);
          brandData.revenue += item.total || 0;
          brandData.quantity += item.quantity || 0;
          brandData.orderCount.add(order.id);
          brandData.productCount.add(item.item_id);
        });
      }
    });

    // Convert to array and calculate metrics
    const brands = Array.from(brandMap.values()).map(brand => ({
      brand: brand.brand,
      name: brand.brand, // Add name property for frontend compatibility
      revenue: brand.revenue,
      quantity: brand.quantity,
      orderCount: brand.orderCount.size,
      productCount: brand.productCount.size,
      averageOrderValue: brand.orderCount.size > 0 
        ? brand.revenue / brand.orderCount.size 
        : 0
    }));

    // Sort by revenue and calculate market share
    brands.sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = brands.reduce((sum, brand) => sum + brand.revenue, 0);
    
    brands.forEach(brand => {
      brand.marketShare = totalRevenue > 0 ? (brand.revenue / totalRevenue) * 100 : 0;
      brand.market_share = brand.marketShare; // Add snake_case for compatibility
    });

    return brands;
  }

  /**
   * Calculate top items from normalized orders
   */
  calculateTopItemsFromOrders(orders) {
    const itemMap = new Map();
    
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          const itemKey = item.item_id;
          
          if (!itemMap.has(itemKey)) {
            itemMap.set(itemKey, {
              itemId: item.item_id,
              name: item.item_name || item.name || 'Unknown',
              sku: item.sku || '',
              brand: item.brand || 'Unknown',
              quantity: 0,
              revenue: 0
            });
          }
          
          const itemData = itemMap.get(itemKey);
          itemData.quantity += item.quantity || 0;
          itemData.revenue += item.total || 0;
        });
      }
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Calculate sales trends
   */
  calculateTrends(orders) {
    const trendMap = new Map();
    
    orders.forEach(order => {
      const date = new Date(order.date); // Use mapped date field
      const dateKey = date.toISOString().split('T')[0];
      
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, {
          period: dateKey,
          date: dateKey,
          orders: 0,
          revenue: 0
        });
      }
      
      const trend = trendMap.get(dateKey);
      trend.orders += 1;
      trend.revenue += order.total || 0; // Use mapped total field
    });

    return Array.from(trendMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Health check for normalized collections
   */
  async healthCheck() {
    try {
      const checks = await Promise.all([
        this.db.collection('normalized_orders').limit(1).get(),
        this.db.collection('normalized_customers').limit(1).get(),
        this.db.collection('normalized_products').limit(1).get(),
        this.db.collection('normalized_purchase_orders').limit(1).get()
      ]);

      const health = {
        normalized_orders: !checks[0].empty,
        normalized_customers: !checks[1].empty,
        normalized_products: !checks[2].empty,
        normalized_purchase_orders: !checks[3].empty
      };

      const allHealthy = Object.values(health).every(v => v);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        collections: health,
        message: allHealthy 
          ? 'All normalized collections have data' 
          : 'Some normalized collections are empty - run normalization',
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

export default new CollectionDashboardService();