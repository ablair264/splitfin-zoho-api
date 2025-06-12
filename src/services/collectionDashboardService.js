// ================================================================
// FILE: src/services/collectionDashboardService.js
// ================================================================

import admin from 'firebase-admin';

class CollectionDashboardService {
  constructor() {
    this.db = admin.firestore();
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
   * Main dashboard data retrieval using direct collection queries
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();

    try {
      console.log(`📊 Fetching dashboard data for user ${userId}, range: ${dateRange}`);

      // Get user context
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const agentId = userData.zohospID; // Zoho Inventory salesperson ID
      
      console.log(`👤 User: ${userData.name} (${userData.role}), Agent ID: ${agentId || 'N/A'}`);

      // Get date range
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch data based on role
      const dashboardData = isAgent 
        ? await this.getAgentDashboard(agentId, startISO, endISO, dateRange)
        : await this.getManagerDashboard(startISO, endISO, dateRange);

      const loadTime = Date.now() - startTime;
      console.log(`✅ Dashboard loaded in ${loadTime}ms`);

      return {
        ...dashboardData,
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'collections',
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Dashboard error:', error.message);
      throw error;
    }
  }

  /**
   * Get dashboard data for sales agents
   */
  async getAgentDashboard(agentId, startISO, endISO, dateRange) {
    console.log(`🔍 Building agent dashboard for agent: ${agentId}`);

    // Parallel queries for agent's data
    const [
      ordersSnapshot,
      transactionsSnapshot,
      invoicesSnapshot
    ] = await Promise.all([
      // Get agent's orders
      this.db.collection('orders')
        .where('salesperson_id', '==', agentId)
        .where('date', '>=', startISO)
        .where('date', '<=', endISO)
        .orderBy('date', 'desc')
        .get(),

      // Get agent's sales transactions
      this.db.collection('sales_transactions')
        .where('salesperson_id', '==', agentId)
        .where('order_date', '>=', startISO)
        .where('order_date', '<=', endISO)
        .get(),

      // Get all invoices (will filter by customer later)
      this.db.collection('invoices')
        .where('date', '>=', startISO)
        .where('date', '<=', endISO)
        .get()
    ]);

    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    const allInvoices = invoicesSnapshot.docs.map(doc => doc.data());

    // Get unique customer IDs from agent's orders
    const agentCustomerIds = new Set(orders.map(order => order.customer_id).filter(id => id));
    
    // Filter invoices for agent's customers
    const agentInvoices = allInvoices.filter(inv => agentCustomerIds.has(inv.customer_id));

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => 
      sum + (parseFloat(order.total) || 0), 0
    );

    const commission = {
      rate: 0.125, // 12.5%
      total: totalRevenue * 0.125,
      salesValue: totalRevenue
    };

    // Process invoice categories
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoiceCategories = this.categorizeInvoices(agentInvoices, today);

    // Build overview
    const overview = await this.buildAgentOverview(orders, transactions, agentCustomerIds);

    // Get brand performance from transactions
    const brandPerformance = this.calculateBrandPerformance(transactions);

    return {
      overview,
      revenue: {
        grossRevenue: totalRevenue,
        netRevenue: totalRevenue * 0.8, // Assuming 20% tax
        taxAmount: totalRevenue * 0.2,
        period: dateRange
      },
      commission,
      orders: {
        salesOrders: {
          total: orders.length,
          totalValue: totalRevenue,
          averageValue: orders.length > 0 ? totalRevenue / orders.length : 0,
          latest: orders.slice(0, 10)
        }
      },
      invoices: {
        ...invoiceCategories,
        summary: this.calculateInvoiceSummary(invoiceCategories)
      },
      performance: {
        brands: brandPerformance,
        topItems: this.calculateTopItems(transactions),
        trends: this.calculateTrends(orders)
      }
    };
  }

  /**
   * Get dashboard data for brand managers
   */
  async getManagerDashboard(startISO, endISO, dateRange) {
    console.log(`🔍 Building manager dashboard`);

    // Parallel queries for all data
    const [
      ordersSnapshot,
      transactionsSnapshot,
      invoicesSnapshot,
      customersSnapshot,
      agentsSnapshot
    ] = await Promise.all([
      // Get all orders
      this.db.collection('orders')
        .where('date', '>=', startISO)
        .where('date', '<=', endISO)
        .orderBy('date', 'desc')
        .get(),

      // Get all sales transactions
      this.db.collection('sales_transactions')
        .where('order_date', '>=', startISO)
        .where('order_date', '<=', endISO)
        .get(),

      // Get all invoices
      this.db.collection('invoices')
        .where('date', '>=', startISO)
        .where('date', '<=', endISO)
        .get(),

      // Get all customers
      this.db.collection('customers').get(),

      // Get all agents
      this.db.collection('users')
        .where('role', '==', 'salesAgent')
        .get()
    ]);

    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    const invoices = invoicesSnapshot.docs.map(doc => doc.data());
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => 
      sum + (parseFloat(order.total) || 0), 0
    );

    // Process invoice categories
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invoiceCategories = this.categorizeInvoices(invoices, today);

    // Build overview
    const overview = await this.buildManagerOverview(orders, transactions, customers);

    // Calculate agent performance
    const agentPerformance = this.calculateAgentPerformance(orders, agents);

    // Get brand performance
    const brandPerformance = this.calculateBrandPerformance(transactions);

    return {
      overview,
      revenue: {
        grossRevenue: totalRevenue,
        netRevenue: totalRevenue * 0.8, // Assuming 20% tax
        taxAmount: totalRevenue * 0.2,
        paidRevenue: 0, // TODO: Calculate from paid invoices
        outstandingRevenue: invoiceCategories.outstanding.reduce((sum, inv) => 
          sum + (parseFloat(inv.balance) || 0), 0
        ),
        profitMargin: 30, // TODO: Calculate actual margin
        period: dateRange
      },
      orders: {
        salesOrders: {
          total: orders.length,
          totalValue: totalRevenue,
          averageValue: orders.length > 0 ? totalRevenue / orders.length : 0,
          latest: orders.slice(0, 10)
        }
      },
      invoices: {
        ...invoiceCategories,
        summary: this.calculateInvoiceSummary(invoiceCategories)
      },
      performance: {
        brands: brandPerformance,
        topItems: this.calculateTopItems(transactions),
        trends: this.calculateTrends(orders)
      },
      agentPerformance
    };
  }

  /**
   * Build overview for agents
   */
  async buildAgentOverview(orders, transactions, agentCustomerIds) {
    // Get unique customers from orders
    const customerMap = new Map();
    orders.forEach(order => {
      if (order.customer_id && !customerMap.has(order.customer_id)) {
        customerMap.set(order.customer_id, {
          id: order.customer_id,
          name: order.customer_name || 'Unknown',
          totalSpent: 0,
          orderCount: 0
        });
      }
    });

    // Calculate customer metrics
    orders.forEach(order => {
      if (order.customer_id && customerMap.has(order.customer_id)) {
        const customer = customerMap.get(order.customer_id);
        customer.totalSpent += parseFloat(order.total) || 0;
        customer.orderCount += 1;
      }
    });

    const customers = Array.from(customerMap.values());
    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0),
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) / orders.length 
          : 0,
        completedOrders: orders.filter(o => o.status === 'confirmed').length,
        pendingOrders: orders.filter(o => o.status === 'draft').length
      },
      customers: {
        totalCustomers: customers.length,
        activeCustomers: customers.length, // TODO: Calculate based on recency
        topCustomers,
        averageOrdersPerCustomer: customers.length > 0 
          ? orders.length / customers.length 
          : 0
      },
      topItems: this.calculateTopItems(transactions).slice(0, 5)
    };
  }

  /**
   * Build overview for managers
   */
  async buildManagerOverview(orders, transactions, allCustomers) {
    // Similar to agent overview but with all data
    const customerMap = new Map();
    
    // Initialize customers from the customers collection
    allCustomers.forEach(customer => {
      customerMap.set(customer.customer_id || customer.id, {
        id: customer.customer_id || customer.id,
        name: customer.name || customer.Account_Name || 'Unknown',
        totalSpent: 0,
        orderCount: 0,
        segment: customer.segment || 'Low'
      });
    });

    // Calculate metrics from orders
    orders.forEach(order => {
      if (order.customer_id && customerMap.has(order.customer_id)) {
        const customer = customerMap.get(order.customer_id);
        customer.totalSpent += parseFloat(order.total) || 0;
        customer.orderCount += 1;
      }
    });

    const customers = Array.from(customerMap.values());
    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    return {
      sales: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0),
        averageOrderValue: orders.length > 0 
          ? orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) / orders.length 
          : 0,
        completedOrders: orders.filter(o => o.status === 'confirmed').length,
        pendingOrders: orders.filter(o => o.status === 'draft').length
      },
      customers: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.orderCount > 0).length,
        topCustomers,
        averageOrdersPerCustomer: customers.length > 0 
          ? orders.length / customers.length 
          : 0
      },
      topItems: this.calculateTopItems(transactions).slice(0, 5)
    };
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
   * Calculate agent performance
   */
  calculateAgentPerformance(orders, agents) {
    const agentMap = new Map();
    
    // Initialize agents
    agents.forEach(agent => {
      agentMap.set(agent.zohospID, {
        agentId: agent.zohospID,
        agentName: agent.name || 'Unknown',
        totalRevenue: 0,
        totalOrders: 0,
        customers: new Set(),
        averageOrderValue: 0
      });
    });

    // Calculate metrics from orders
    orders.forEach(order => {
      if (order.salesperson_id && agentMap.has(order.salesperson_id)) {
        const agent = agentMap.get(order.salesperson_id);
        agent.totalRevenue += parseFloat(order.total) || 0;
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
   * Calculate brand performance from transactions
   */
  calculateBrandPerformance(transactions) {
    const brandMap = new Map();
    
    transactions.forEach(transaction => {
      const brand = transaction.brand || 'Unknown';
      
      if (!brandMap.has(brand)) {
        brandMap.set(brand, {
          brand,
          revenue: 0,
          quantity: 0,
          orderCount: new Set(),
          productCount: new Set(),
          items: []
        });
      }
      
      const brandData = brandMap.get(brand);
      brandData.revenue += parseFloat(transaction.total) || 0;
      brandData.quantity += parseInt(transaction.quantity) || 0;
      brandData.orderCount.add(transaction.order_id);
      brandData.productCount.add(transaction.item_id);
      brandData.items.push(transaction);
    });

    // Convert to array and calculate metrics
    const brands = Array.from(brandMap.values()).map(brand => ({
      brand: brand.brand,
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
    });

    return brands;
  }

  /**
   * Calculate top selling items from transactions
   */
  calculateTopItems(transactions) {
    const itemMap = new Map();
    
    transactions.forEach(transaction => {
      const itemKey = transaction.item_id;
      
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          itemId: transaction.item_id,
          name: transaction.item_name || 'Unknown',
          sku: transaction.sku || '',
          brand: transaction.brand || 'Unknown',
          quantity: 0,
          revenue: 0
        });
      }
      
      const item = itemMap.get(itemKey);
      item.quantity += parseInt(transaction.quantity) || 0;
      item.revenue += parseFloat(transaction.total) || 0;
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
      const date = new Date(order.date);
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
      trend.revenue += parseFloat(order.total) || 0;
    });

    return Array.from(trendMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Check if collections exist and have data
      const checks = await Promise.all([
        this.db.collection('orders').limit(1).get(),
        this.db.collection('invoices').limit(1).get(),
        this.db.collection('sales_transactions').limit(1).get(),
        this.db.collection('customers').limit(1).get()
      ]);

      const health = {
        orders: !checks[0].empty,
        invoices: !checks[1].empty,
        transactions: !checks[2].empty,
        customers: !checks[3].empty
      };

      const allHealthy = Object.values(health).every(v => v);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        collections: health,
        message: allHealthy 
          ? 'All collections have data' 
          : 'Some collections are empty - run sync',
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