// Key changes to your ZohoReportsService.js

/**
 * Get comprehensive dashboard data based on user role
 * FIXED: Use correct agent ID type for each data source
 */
async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
  try {
    // First, get user role from Firebase
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const userRole = userData.role;
    
    // 🔑 KEY FIX: Use correct ID for each data source
    const agentInventoryId = userData.zohospID;  // For Inventory API calls
    const agentCRMId = userData.agentID;         // For CRM API calls / Firebase filtering

    // Return role-specific dashboard
    if (userRole === 'brandManager' || userRole === 'admin') {
      return await this.getBrandManagerDashboard(dateRange, customDateRange);
    } else if (userRole === 'salesAgent') {
      // Pass BOTH IDs to the sales agent dashboard
      return await this.getSalesAgentDashboard({
        inventoryId: agentInventoryId,
        crmId: agentCRMId,
        email: userData.email
      }, dateRange, customDateRange);
    } else {
      throw new Error('Invalid user role');
    }
  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    throw error;
  }
}

/**
 * Sales Agent Dashboard with correct agent filtering
 * FIXED: Use agentContext object with both ID types
 */
async getSalesAgentDashboard(agentContext, dateRange, customDateRange) {
  const { inventoryId, crmId, email } = agentContext;
  const cacheKey = `sales_agent_dashboard_${inventoryId}_${dateRange}_${JSON.stringify(customDateRange)}`;
  
  if (this.isCacheValid(cacheKey)) {
    return this.cache.get(cacheKey).data;
  }

  try {
    // Get agent-specific data using correct IDs
    const [
      overview,
      inventory,
      trends,
      orders,
      invoices
    ] = await Promise.all([
      this.getSalesOverview(dateRange, inventoryId), // Inventory ID for Inventory API
      this.getInventoryInsights(),
      this.getSalesTrends('monthly', 6, inventoryId), // Inventory ID for Inventory API
      this.getAgentOrders(agentContext, dateRange, customDateRange),
      this.getAgentInvoices(agentContext, dateRange, customDateRange)
    ]);

    const dashboard = {
      role: 'salesAgent',
      dateRange,
      agentContext, // Include agent context for debugging
      overview,
      inventory,
      trends,
      orders,
      invoices,
      performance: {
        topCustomers: overview.customers.topCustomers,
        topItems: overview.topItems
      },
      lastUpdated: new Date().toISOString()
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;

  } catch (error) {
    console.error('❌ Error getting sales agent dashboard:', error);
    throw error;
  }
}

/**
 * Get sales overview - FIXED to use Inventory ID
 */
async getSalesOverview(dateRange = '30_days', agentInventoryId = null) {
  const cacheKey = `sales_overview_${dateRange}_${agentInventoryId || 'all'}`;
  
  if (this.isCacheValid(cacheKey)) {
    return this.cache.get(cacheKey).data;
  }

  try {
    const [salesOrders, items, customers] = await Promise.all([
      this.getSalesOrders(dateRange, null, agentInventoryId), // Use Inventory ID
      this.getTopSellingItems(dateRange, null, agentInventoryId), // Use Inventory ID
      this.getCustomerStats(dateRange, null, agentInventoryId) // Use Inventory ID
    ]);

    const overview = {
      period: dateRange,
      agentInventoryId: agentInventoryId, // Track which ID we used
      sales: {
        totalOrders: salesOrders.length,
        totalRevenue: salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
        averageOrderValue: salesOrders.length > 0 
          ? salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / salesOrders.length 
          : 0,
        completedOrders: salesOrders.filter(order => order.status === 'confirmed').length,
        pendingOrders: salesOrders.filter(order => order.status === 'pending').length
      },
      topItems: items.slice(0, 10),
      customers: customers,
      lastUpdated: new Date().toISOString()
    };

    this.setCache(cacheKey, overview);
    return overview;

  } catch (error) {
    console.error('❌ Error getting sales overview:', error);
    throw error;
  }
}

/**
 * Get orders data for sales agents - FIXED filtering
 */
async getAgentOrders(agentContext, dateRange, customDateRange) {
  try {
    // Use Inventory ID for Inventory API calls
    const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentContext.inventoryId);

    return {
      salesOrders: {
        total: salesOrders.length,
        totalValue: salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
        averageValue: salesOrders.length > 0
          ? salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / salesOrders.length
          : 0,
        latest: salesOrders.slice(0, 20)
      },
      purchaseOrders: null // Sales agents don't see purchase orders
    };
  } catch (error) {
    console.error('❌ Error getting agent orders:', error);
    return {
      salesOrders: { total: 0, totalValue: 0, averageValue: 0, latest: [] },
      purchaseOrders: null
    };
  }
}

/**
 * Get agent invoices - FIXED to use CRM ID for Firebase filtering
 */
async getAgentInvoices(agentContext, dateRange, customDateRange) {
  const { crmId, inventoryId } = agentContext;
  
  if (!crmId) {
    throw new Error('CRM Agent ID is required to fetch agent invoices');
  }

  try {
    // 🔑 Use CRM ID to filter customers in Firebase (since customers use CRM Agent IDs)
    const customersSnapshot = await this.db.collection('customers')
      .where('Agent.id', '==', crmId) // Use CRM ID for Firebase filtering
      .get();
      
    const agentCustomerIds = customersSnapshot.docs.map(doc => 
      doc.data().zohoInventoryId || doc.id
    );

    // Get all invoices from Inventory API
    const allInvoices = await this.getInvoices(dateRange, customDateRange);
    
    // Filter invoices for agent's customers
    const agentInvoices = allInvoices.all.filter(inv => 
      agentCustomerIds.includes(inv.customer_id)
    );

    const outstanding = agentInvoices.filter(inv => 
      inv.status === 'sent' || inv.status === 'overdue' || parseFloat(inv.balance || 0) > 0
    );
    
    const paid = agentInvoices.filter(inv => 
      inv.status === 'paid' || parseFloat(inv.balance || 0) === 0
    );

    return {
      all: agentInvoices,
      outstanding: outstanding.map(inv => ({
        ...inv,
        daysOverdue: this.calculateDaysOverdue(inv.due_date)
      })),
      paid: paid.sort((a, b) => new Date(b.date) - new Date(a.date)),
      summary: {
        totalOutstanding: outstanding.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
        totalPaid: paid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
        count: {
          outstanding: outstanding.length,
          paid: paid.length
        }
      }
    };

  } catch (error) {
    console.error('❌ Error getting agent invoices:', error);
    return {
      all: [],
      outstanding: [],
      paid: [],
      summary: {
        totalOutstanding: 0,
        totalPaid: 0,
        count: { outstanding: 0, paid: 0 }
      }
    };
  }
}

/**
 * Get sales orders - FIXED to use Inventory Salesperson ID
 */
async getSalesOrders(dateRange, customDateRange = null, agentInventoryId = null) {
  try {
    const token = await getAccessToken();
    const { startDate, endDate } = this.getDateFilter(dateRange, customDateRange);
    
    let url = `https://www.zohoapis.eu/inventory/v1/salesorders?organization_id=${this.orgId}&per_page=200`;
    url += `&date_start=${startDate.toISOString().split('T')[0]}`;
    url += `&date_end=${endDate.toISOString().split('T')[0]}`;

    const response = await axios.get(url, {
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
    });

    let orders = response.data.salesorders || [];

    // 🔑 FIXED: Filter by Inventory Salesperson ID only
    if (agentInventoryId) {
      orders = orders.filter(order => 
        order.salesperson_id === agentInventoryId
        // Removed: order.cf_agent === agentId (this was CRM ID, wrong for Inventory API)
      );
    }

    return orders;
  } catch (error) {
    console.error('❌ Error getting sales orders:', error);
    return [];
  }
}

/**
 * Get sales trends - FIXED to use Inventory ID
 */
async getSalesTrends(period = 'monthly', months = 12, agentInventoryId = null) {
  const cacheKey = `sales_trends_${period}_${months}_${agentInventoryId || 'all'}`;
  
  if (this.isCacheValid(cacheKey)) {
    return this.cache.get(cacheKey).data;
  }

  try {
    const token = await getAccessToken();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    let url = `https://www.zohoapis.eu/inventory/v1/salesorders?organization_id=${this.orgId}&per_page=200`;
    url += `&date_start=${startDate.toISOString().split('T')[0]}`;
    url += `&date_end=${endDate.toISOString().split('T')[0]}`;

    const response = await axios.get(url, {
      headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
    });

    let orders = response.data.salesorders || [];

    // 🔑 FIXED: Filter by Inventory Salesperson ID only
    if (agentInventoryId) {
      orders = orders.filter(order => 
        order.salesperson_id === agentInventoryId
        // Removed: order.cf_agent === agentId
      );
    }

    // Group by time period
    const trends = this.groupOrdersByPeriod(orders, period);

    const result = {
      period,
      months,
      agentInventoryId, // Track which ID we used
      trends,
      summary: {
        totalRevenue: trends.reduce((sum, t) => sum + t.revenue, 0),
        totalOrders: trends.reduce((sum, t) => sum + t.orders, 0),
        averageMonthlyRevenue: trends.length > 0 
          ? trends.reduce((sum, t) => sum + t.revenue, 0) / trends.length 
          : 0
      },
      lastUpdated: new Date().toISOString()
    };

    this.setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error('❌ Error getting sales trends:', error);
    throw error;
  }
}

/**
 * Get agent performance - FIXED to use Inventory IDs
 */
async getAgentPerformance(dateRange = '30_days') {
  const cacheKey = `agent_performance_${dateRange}`;
  
  if (this.isCacheValid(cacheKey)) {
    return this.cache.get(cacheKey).data;
  }

  try {
    const allOrders = await this.getSalesOrders(dateRange);
    const agentStats = new Map();

    allOrders.forEach(order => {
      // 🔑 FIXED: Only use salesperson_id (Inventory Salesperson ID)
      const agentId = order.salesperson_id || 'unassigned';
      const agentName = order.salesperson_name || 'Unassigned';
      
      const existing = agentStats.get(agentId) || {
        agentInventoryId: agentId, // Track that this is Inventory ID
        agentName,
        orders: 0,
        revenue: 0,
        averageOrderValue: 0,
        customers: new Set()
      };

      existing.orders += 1;
      existing.revenue += parseFloat(order.total || 0);
      existing.customers.add(order.customer_id);

      agentStats.set(agentId, existing);
    });

    // Convert to array and calculate averages
    const agents = Array.from(agentStats.values()).map(agent => ({
      agentInventoryId: agent.agentInventoryId, // Use Inventory ID
      agentName: agent.agentName,
      orders: agent.orders,
      revenue: agent.revenue,
      customers: agent.customers.size,
      averageOrderValue: agent.orders > 0 ? agent.revenue / agent.orders : 0
    })).sort((a, b) => b.revenue - a.revenue);

    const result = {
      period: dateRange,
      agents,
      totalAgents: agents.length,
      topPerformer: agents[0] || null,
      lastUpdated: new Date().toISOString()
    };

    this.setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error('❌ Error getting agent performance:', error);
    throw error;
  }
}