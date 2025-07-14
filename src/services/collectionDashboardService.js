// src/services/collectionDashboardService.js
// Updated to use your actual collection structure

import admin from 'firebase-admin';

class CollectionDashboardService {
  constructor() {
    this.db = admin.firestore();

    // Bind methods
    this.getManagerDashboard = this.getManagerDashboard.bind(this);
    this.getAgentDashboard = this.getAgentDashboard.bind(this);
    this.getDashboardData = this.getDashboardData.bind(this);
    this.getLimitedDashboardData = this.getLimitedDashboardData.bind(this);
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
   * Main dashboard data retrieval using actual collections
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
      const userUid = userId; // Firebase UID
      const zohospID = userData.zohospID; // For matching with salesperson_id
      
      console.log(`👤 User: ${userData.name} (${userData.role}), UID: ${userUid}`);

      // Get date range
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch data based on role
      const dashboardData = isAgent 
        ? await this.getAgentDashboard(userUid, zohospID, startISO, endISO, dateRange)
        : await this.getManagerDashboard(startISO, endISO, dateRange);

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
        dataSource: 'firestore-collections',
        structure,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Dashboard error:', error.message);
      throw error;
    }
  }

  /**
   * Get manager dashboard using actual collections
   */
  async getManagerDashboard(startISO, endISO, dateRange) {
    console.log(`🔍 Building manager dashboard`);

    // Fetch all data for the period
  // Fetch all data for the period
const [
  ordersSnapshot,
  customersSnapshot,
  invoicesSnapshot,
  agentsSnapshot,
  productsSnapshot  // This now fetches from 'items' collection
] = await Promise.all([
  // Get sales orders - filter by date
  this.db.collection('sales_orders')
    .where('date', '>=', startISO.split('T')[0])
    .where('date', '<=', endISO.split('T')[0])
    .orderBy('date', 'desc')
    .get(),

  // Get all customers
  this.db.collection('customers').get(),

  // Get invoices for the period
  this.db.collection('invoices')
    .where('date', '>=', startISO.split('T')[0])
    .where('date', '<=', endISO.split('T')[0])
    .get(),

  // Get all agents
  this.db.collection('users')
    .where('role', '==', 'salesAgent')
    .get(),

  // Get products for brand info - CHANGED TO 'items' COLLECTION
  this.db.collection('items_data').get()  // Changed from 'products' to 'items'
]);

// Create product map for brand lookups
const productMap = new Map();
productsSnapshot.docs.forEach(doc => {
  const product = doc.data();
  productMap.set(doc.id, {
    brand: product.Manufacturer || product.manufacturer || 'Unknown',
    name: product.name || product.item_name,
    sku: product.sku
  });
});

    // Process orders
const orders = ordersSnapshot.docs.map(doc => {
  const data = doc.data();
      
      // Enhance line items with brand info
  let enhancedLineItems = [];
  if (data.line_items && Array.isArray(data.line_items)) {
    enhancedLineItems = data.line_items.map(item => {
      const productInfo = productMap.get(item.item_id) || {};
      return {
        ...item,
        brand: productInfo.brand || 'Unknown',
        item_name: item.name || productInfo.name || 'Unknown Item'
      };
    });
  }
      
  return {
    id: doc.id,
    order_number: data.salesorder_number,
    customer_id: data.customer_id,
    customer_name: data.customer_name,
    salesperson_id: data.salesperson_id,
    salesperson_name: data.salesperson_name,
    date: data.date,
    total: parseFloat(data.total || 0),
    status: data.status,
    line_items: enhancedLineItems,
    is_marketplace_order: data.account_identifier ? true : false,
    marketplace_source: data.account_identifier || null
  };
});

    // Process customers
    const customers = customersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        company_name: data.company_name,
        total_spent: parseFloat(data.metrics?.total_spent || 0),
        order_count: data.metrics?.order_count || 0,
        average_order_value: parseFloat(data.metrics?.average_order_value || 0),
        segment: data.segment,
        status: data.status,
        city: data.billing_address?.city,
        country: data.billing_address?.country,
        last_order_date: data.metrics?.last_order_date
      };
    });

    // Process invoices
    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Process agents
    const agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Separate marketplace and regular orders
    const marketplaceOrders = orders.filter(o => o.is_marketplace_order);
    const regularOrders = orders.filter(o => !o.is_marketplace_order);
    
    console.log(`📊 Found ${regularOrders.length} regular orders, ${marketplaceOrders.length} marketplace orders`);
    console.log(`👥 Found ${customers.length} customers, ${agents.length} agents`);

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Process invoices
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invoiceCategories = this.categorizeInvoices(invoices, today);

    // Build overview
    const overview = this.buildManagerOverview(orders, customers);

    // Calculate agent performance
    const agentPerformance = this.calculateAgentPerformance(orders, agents);

    // Get brand performance
    const brandPerformance = this.calculateBrandPerformanceFromOrders(orders);

    // Calculate top items
    const topItems = this.calculateTopItemsFromOrders(orders);

    // Build metrics
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
      orders: orders,
      ordersSummary: {
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
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 10)
          .map(c => ({
            id: c.customer_id,
            name: c.customer_name,
            total_spent: c.total_spent,
            order_count: c.order_count
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
      commission: null
    };
  }

  /**
   * Get agent dashboard using actual collections
   */
  async getAgentDashboard(userUid, zohospID, startISO, endISO, dateRange) {
    console.log(`🔍 Building agent dashboard for UID: ${userUid}, Zoho ID: ${zohospID}`);

    // Fetch data specific to this agent
  const [
  ordersSnapshot,
  invoicesSnapshot,
  productsSnapshot
] = await Promise.all([
  // Get orders for this specific agent using salesperson_id
  this.db.collection('sales_orders')
    .where('salesperson_id', '==', zohospID)
    .where('date', '>=', startISO.split('T')[0])
    .where('date', '<=', endISO.split('T')[0])
    .orderBy('date', 'desc')
    .get(),

  // Get all invoices (we'll filter by customer later)
  this.db.collection('invoices')
    .where('date', '>=', startISO.split('T')[0])
    .where('date', '<=', endISO.split('T')[0])
    .get(),

  // Get products for brand info - CHANGED TO 'items' COLLECTION
  this.db.collection('items_data').get()  // Changed from 'products' to 'items'
]);

// Create product map
const productMap = new Map();
productsSnapshot.docs.forEach(doc => {
  const product = doc.data();
  productMap.set(doc.id, {
    brand: product.normalizedManufacturer || product.manufacturer || 'Unknown',
    name: product.item_name,
    sku: product.sku
  });
});

    // Process orders with enhanced line items
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      let enhancedLineItems = [];
      if (data.line_items && Array.isArray(data.line_items)) {
        enhancedLineItems = data.line_items.map(item => {
          const productInfo = productMap.get(item.item_id) || {};
          return {
            ...item,
            brand: productInfo.brand || 'Unknown',
            item_name: item.name || productInfo.name || 'Unknown Item',
            total: parseFloat(item.item_total || 0),
            quantity: parseInt(item.quantity || 0)
          };
        });
      }
      
      return {
        id: doc.id,
        order_number: data.salesorder_number,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        salesperson_id: data.salesperson_id,
        salesperson_name: data.salesperson_name,
        date: data.date,
        total: parseFloat(data.total || 0),
        status: data.status,
        line_items: enhancedLineItems
      };
    });

    // Get unique customer IDs from orders
    const agentCustomerIds = new Set(orders.map(order => order.customer_id));
    
    // Filter invoices to only include those for agent's customers
    const invoices = invoicesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(inv => agentCustomerIds.has(inv.customer_id));

    // Create customer list from orders
    const customerMap = new Map();
    orders.forEach(order => {
      if (!customerMap.has(order.customer_id)) {
        customerMap.set(order.customer_id, {
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          total_spent: 0,
          order_count: 0
        });
      }
      const customer = customerMap.get(order.customer_id);
      customer.total_spent += order.total;
      customer.order_count += 1;
    });
    const customers = Array.from(customerMap.values());

    // Calculate totals
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invoiceCategories = this.categorizeInvoices(invoices, today);

    // Build overview and performance data
    const overview = this.buildAgentOverview(orders, customers);
    const brandPerformance = this.calculateBrandPerformanceFromOrders(orders);
    const topItems = this.calculateTopItemsFromOrders(orders);

    // Build metrics
    const metrics = {
      revenue: totalRevenue,
      orders: orders.length,
      customers: customers.length,
      totalRevenue: totalRevenue,
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      outstandingInvoices: invoiceCategories.outstanding.reduce((sum, inv) =>
        sum + (parseFloat(inv.balance) || 0), 0
      )
    };

    // Calculate commission
    const commissionRate = 0.125; // 12.5%
    const totalCommission = totalRevenue * commissionRate;

    return {
      metrics,
      overview,
      revenue: {
        grossRevenue: totalRevenue,
        paidRevenue: invoiceCategories.paid.reduce((sum, inv) =>
          sum + (parseFloat(inv.total) || 0), 0
        ),
        outstandingRevenue: invoiceCategories.outstanding.reduce((sum, inv) =>
          sum + (parseFloat(inv.balance) || 0), 0
        ),
        period: dateRange
      },
      orders: orders,
      ordersSummary: {
        salesOrders: {
          total: orders.length,
          totalValue: totalRevenue,
          latest: orders.slice(0, 10)
        }
      },
      invoices: {
        ...invoiceCategories,
        summary: this.calculateInvoiceSummary(invoiceCategories)
      },
      performance: {
        brands: brandPerformance,
        topItems: topItems,
        top_items: topItems,
        trends: this.calculateTrends(orders),
        top_customers: customers
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 10)
      },
      agentPerformance: null,
      commission: {
        rate: commissionRate,
        total: totalCommission,
        salesValue: totalRevenue
      }
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
      const zohospID = userData.zohospID;
      
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      // Fetch LIMITED data with strict limits
      const LIMIT = 50;
      
      let ordersQuery = this.db.collection('sales_orders')
        .orderBy('date', 'desc')
        .limit(LIMIT);
      
      if (isAgent && zohospID) {
        // For agents, we need to create a compound query
        ordersQuery = this.db.collection('salesorders')
          .where('salesperson_id', '==', zohospID)
          .orderBy('date', 'desc')
          .limit(LIMIT);
      }
      
      const ordersSnapshot = await ordersQuery.get();
      
      // Map orders to expected structure
      const orders = ordersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            order_number: data.salesorder_number,
            customer_id: data.customer_id,
            customer_name: data.customer_name,
            date: data.date,
            total: parseFloat(data.total || 0),
            status: data.status,
            line_items: data.line_items || []
          };
        })
        .filter(order => {
          const orderDate = new Date(order.date);
          return orderDate >= startDate && orderDate <= endDate;
        });
      
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Limited dashboard loaded in ${loadTime}ms`);
      
      // Build minimal response
      const metrics = {
        revenue: totalRevenue,
        orders: orders.length,
        customers: undefined,
        agents: isAgent ? 1 : undefined,
        brands: undefined,
        totalRevenue: totalRevenue,
        totalOrders: orders.length,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
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
        orders: orders,
        ordersSummary: {
          salesOrders: {
            total: orders.length,
            totalValue: totalRevenue,
            latest: orders.slice(0, 10),
            isLimited: true
          }
        },
        invoices: {
          all: [],
          outstanding: [],
          overdue: [],
          paid: [],
          dueToday: [],
          dueIn30Days: [],
          summary: {}
        },
        performance: {
          brands: [],
          topItems: [],
          top_items: [],
          trends: [],
          top_customers: []
        },
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'firestore-collections-limited',
        lastUpdated: new Date().toISOString(),
        warning: 'Limited data shown. Try a smaller date range for full data.'
      };
      
    } catch (error) {
      console.error('❌ Limited dashboard error:', error.message);
      throw error;
    }
  }
  
  /**
   * Helper methods remain largely the same
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
          invoice.days_overdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
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

  buildAgentOverview(orders, customers) {
    const topCustomers = customers
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5)
      .map(c => ({
        id: c.customer_id,
        name: c.customer_name,
        totalSpent: c.total_spent,
        orderCount: c.order_count
      }));

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

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
          ? customers.reduce((sum, c) => sum + c.order_count, 0) / customers.length
          : 0
      },
      topItems: this.calculateTopItemsFromOrders(orders).slice(0, 5)
    };
  }

  buildManagerOverview(orders, customers) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const activeCustomers = customers.filter(c => {
      if (!c.last_order_date) return false;
      return new Date(c.last_order_date) > ninetyDaysAgo;
    });

    const topCustomers = customers
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5)
      .map(c => ({
        id: c.customer_id,
        name: c.customer_name,
        totalSpent: c.total_spent,
        orderCount: c.order_count,
        segment: c.segment || 'Low'
      }));

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

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
          ? customers.reduce((sum, c) => sum + c.order_count, 0) / customers.length
          : 0
      },
      topItems: this.calculateTopItemsFromOrders(orders).slice(0, 5)
    };
  }

  calculateAgentPerformance(orders, agents) {
    const agentMap = new Map();
    
    // Initialize agents
    agents.forEach(agent => {
      agentMap.set(agent.zohospID, {
        agentId: agent.zohospID,
        agentName: agent.name || 'Unknown',
        agentUid: agent.id,
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
        agent.totalRevenue += order.total;
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
          brandData.revenue += parseFloat(item.total || item.item_total || 0);
          brandData.quantity += parseInt(item.quantity || 0);
          brandData.orderCount.add(order.id);
          brandData.productCount.add(item.item_id);
        });
      }
    });

    // Convert to array and calculate metrics
    const brands = Array.from(brandMap.values()).map(brand => ({
      brand: brand.brand,
      name: brand.brand,
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
      brand.market_share = brand.marketShare;
    });

    return brands;
  }

  calculateTopItemsFromOrders(orders) {
    const itemMap = new Map();
    
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          const itemKey = item.item_id;
          
          if (!itemMap.has(itemKey)) {
            itemMap.set(itemKey, {
              itemId: item.item_id,
              id: item.item_id,
              name: item.item_name || item.name || 'Unknown',
              sku: item.sku || '',
              brand: item.brand || 'Unknown',
              quantity: 0,
              revenue: 0
            });
          }
          
          const itemData = itemMap.get(itemKey);
          itemData.quantity += parseInt(item.quantity || 0);
          itemData.revenue += parseFloat(item.total || item.item_total || 0);
        });
      }
    });

    return Array.from(itemMap.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

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
      trend.revenue += order.total;
    });

    return Array.from(trendMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Health check for collections
   */
  async healthCheck() {
    try {
      const checks = await Promise.all([
        this.db.collection('sales_orders').limit(1).get(),
        this.db.collection('customers').limit(1).get(),
        this.db.collection('items_data').limit(1).get(),
        this.db.collection('purchase_orders').limit(1).get(),
        this.db.collection('invoices').limit(1).get()
      ]);

      const health = {
        salesorders: !checks[0].empty,
        customers: !checks[1].empty,
        products: !checks[2].empty,
        purchase_orders: !checks[3].empty,
        invoices: !checks[4].empty
      };

      const allHealthy = Object.values(health).every(v => v);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        collections: health,
        message: allHealthy 
          ? 'All collections have data' 
          : 'Some collections are empty',
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