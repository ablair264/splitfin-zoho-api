// server/src/services/zohoReportsService.js
import axios from 'axios';
import { getAccessToken } from '../api/zoho.js';
import admin from 'firebase-admin';
import { generateAIInsights } from './aiAnalyticsService.js'; 

class ZohoReportsService {
  constructor() {
    this.orgId = process.env.ZOHO_ORG_ID;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.db = admin.firestore();
  }

  /**
   * Cache helper methods
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get comprehensive dashboard data based on user role
   */
async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
  try {
    // Get user role from Firebase
    const userDoc = await this.db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const userRole = userData.role;

    if (userRole === 'brandManager' || userRole === 'admin') {
      return await this.getBrandManagerDashboard(dateRange, customDateRange);
    } else if (userRole === 'salesAgent') {
      const zohospID = userData.zohospID;
      if (!zohospID) {
        throw new Error('Sales agent is missing zohospID');
      }
      return await this.getSalesAgentDashboard(zohospID, dateRange, customDateRange);
    } else {
      throw new Error('Invalid user role');
    }
  } catch (error) {
    console.error('❌ Error getting dashboard data:', error);
    throw error;
  }
}

  /**
/**
   * Brand Manager Dashboard with comprehensive metrics
   */
  async getBrandManagerDashboard(dateRange, customDateRange) {
    const cacheKey = `brand_manager_dashboard_${dateRange}_${JSON.stringify(customDateRange)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      // Fetch all data in parallel
      const [
        overview,
        inventory,
        trends,
        agentPerformance,
        revenue,
        orders,
        invoices,
        brands,
        regions
      ] = await Promise.all([
        this.getSalesOverview(dateRange, null),
        this.getInventoryInsights(),
        this.getSalesTrends('monthly', 6, null),
        this.getAgentPerformance(dateRange),
        this.getRevenueAnalysis(dateRange, customDateRange),
        this.getOrdersData(dateRange, customDateRange),
        this.getInvoices(dateRange, customDateRange),
        this.getBrandPerformance(dateRange, customDateRange),
        this.getRegionalPerformance(dateRange, customDateRange)
      ]);

      const dashboard = {
        role: 'brandManager',
        dateRange,
        overview,
        inventory,
        trends,
        agentPerformance,
        revenue,
        orders,
        invoices,
        performance: {
          topAgents: agentPerformance.agents,
          topCustomers: overview.customers.topCustomers,
          topItems: overview.topItems,
          brands,
          regions
        },
        lastUpdated: new Date().toISOString()
      };

      const aiInsights = await generateAIInsights(dashboard);
      dashboard.ai = aiInsights;

      this.setCache(cacheKey, dashboard);
      return dashboard;

    } catch (error) {
      console.error('❌ Error getting brand manager dashboard:', error);
      throw error;
    }
  }

  /**
   * Sales Agent Dashboard with filtered metrics
   */
  async getSalesAgentDashboard(zohospID, dateRange, customDateRange) {
    const cacheKey = `sales_agent_dashboard_${zohospID}_${dateRange}_${JSON.stringify(customDateRange)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      // Get agent-specific data
      const [
        overview,
        inventory,
        trends,
        orders,
        invoices
      ] = await Promise.all([
        this.getSalesOverview(dateRange, zohospID),
        this.getInventoryInsights(),
        this.getSalesTrends('monthly', 6, zohospID),
        this.getAgentOrders(zohospID, dateRange, customDateRange),
        this.getAgentInvoices(zohospID, dateRange, customDateRange)
      ]);

      const dashboard = {
        role: 'salesAgent',
        dateRange,
        overview,
        inventory,
        trends,
        agentPerformance: null, // Sales agents don't see other agents' performance
        revenue: null, // Sales agents don't see revenue breakdown
        orders,
        invoices,
        performance: {
          topAgents: null,
          topCustomers: overview.customers.topCustomers,
          topItems: overview.topItems,
          brands: null,
          regions: null
        },
        lastUpdated: new Date().toISOString()
      };
      
        const aiInsights = await generateAIInsights(dashboard);
  dashboard.ai = aiInsights;

      this.setCache(cacheKey, dashboard);
      return dashboard;

    } catch (error) {
      console.error('❌ Error getting sales agent dashboard:', error);
      throw error;
    }
  }

  /**
   * Get sales overview statistics - matches your Swift model exactly
   */
  async getSalesOverview(dateRange = '30_days', agentId = null) {
    const cacheKey = `sales_overview_${dateRange}_${agentId || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const [salesOrders, items, customers] = await Promise.all([
        this.getSalesOrders(dateRange, null, agentId),
        this.getTopSellingItems(dateRange, null, agentId),
        this.getCustomerStats(dateRange, null, agentId)
      ]);

      const overview = {
        period: dateRange,
        agentId: agentId,
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
   * Get orders data for brand managers
   */
  async getOrdersData(dateRange, customDateRange) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      const purchaseOrders = await this.getPurchaseOrders(dateRange, customDateRange);

      return {
        salesOrders: {
          total: salesOrders.length,
          totalValue: salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
          averageValue: salesOrders.length > 0
            ? salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / salesOrders.length
            : 0,
          latest: salesOrders.slice(0, 10)
        },
        purchaseOrders: {
          total: purchaseOrders.length,
          totalValue: purchaseOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
          averageValue: purchaseOrders.length > 0
            ? purchaseOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0) / purchaseOrders.length
            : 0,
          latest: purchaseOrders.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('❌ Error getting orders data:', error);
      return {
        salesOrders: { total: 0, totalValue: 0, averageValue: 0, latest: [] },
        purchaseOrders: { total: 0, totalValue: 0, averageValue: 0, latest: [] }
      };
    }
  }

  /**
   * Get orders data for sales agents (filtered)
   */
  async getAgentOrders(agentId, dateRange, customDateRange) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentId);

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
   * Get agent invoices (filtered by agent's customers)
   */
async getAgentInvoices(zohospID, dateRange, customDateRange) {

  if (!zohospID) {
    throw new Error('zohospID is required to fetch agent invoices');
  }

  try {
    const allInvoices = await this.getInvoices(dateRange, customDateRange);

    // ✅ Filter where salesperson_id matches zohospID
    const agentInvoices = allInvoices.all.filter(inv =>
      inv.salesperson_id === zohospID
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
   * Get customer statistics - matches your Swift model
   */
  async getCustomerStats(dateRange = '30_days', customDateRange = null, agentId = null) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentId);
      const customerStats = new Map();

      salesOrders.forEach(order => {
        const customerId = order.customer_id;
        const existing = customerStats.get(customerId) || {
          customerId,
          customerName: order.customer_name,
          orders: 0,
          totalSpent: 0,
          lastOrderDate: null
        };

        existing.orders += 1;
        existing.totalSpent += parseFloat(order.total || 0);
        
        const orderDate = new Date(order.date);
        if (!existing.lastOrderDate || orderDate > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = order.date;
        }

        customerStats.set(customerId, existing);
      });

      const customers = Array.from(customerStats.values())
        .sort((a, b) => b.totalSpent - a.totalSpent);

      return {
        totalCustomers: customers.length,
        newCustomers: customers.filter(c => 
          new Date(c.lastOrderDate) >= this.getDateFilter(dateRange, customDateRange).startDate
        ).length,
        topCustomers: customers.slice(0, 10),
        averageOrdersPerCustomer: customers.length > 0 
          ? customers.reduce((sum, c) => sum + c.orders, 0) / customers.length 
          : 0
      };

    } catch (error) {
      console.error('❌ Error getting customer stats:', error);
      return {
        totalCustomers: 0,
        newCustomers: 0,
        topCustomers: [],
        averageOrdersPerCustomer: 0
      };
    }
  }

  /**
   * Get sales trends over time - matches your Swift model
   */
  async getSalesTrends(period = 'monthly', months = 12, agentId = null) {
    const cacheKey = `sales_trends_${period}_${months}_${agentId || 'all'}`;
    
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

      // Filter by agent if specified
      if (agentId) {
        orders = orders.filter(order => 
          order.cf_agent === agentId || order.salesperson_id === agentId
        );
      }

      // Group by time period
      const trends = this.groupOrdersByPeriod(orders, period);

      const result = {
        period,
        months,
        agentId,
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
   * Get inventory insights - matches your Swift model
   */
  async getInventoryInsights() {
    const cacheKey = 'inventory_insights';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const token = await getAccessToken();
      
      const response = await axios.get(
        `https://www.zohoapis.eu/inventory/v1/items?organization_id=${this.orgId}&per_page=200`,
        {
          headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        }
      );

      const items = response.data.items || [];

      const insights = {
        totalItems: items.length,
        activeItems: items.filter(item => item.status === 'active').length,
        lowStockItems: items.filter(item => 
          item.stock_on_hand <= (item.reorder_level || 0)
        ).length,
        outOfStockItems: items.filter(item => 
          parseFloat(item.stock_on_hand || 0) === 0
        ).length,
        totalInventoryValue: items.reduce((sum, item) => 
          sum + (parseFloat(item.stock_on_hand || 0) * parseFloat(item.rate || 0)), 0
        ),
        topValueItems: items
          .map(item => ({
            itemId: item.item_id,
            name: item.name,
            sku: item.sku,
            stockValue: parseFloat(item.stock_on_hand || 0) * parseFloat(item.rate || 0),
            stockOnHand: parseFloat(item.stock_on_hand || 0),
            rate: parseFloat(item.rate || 0)
          }))
          .sort((a, b) => b.stockValue - a.stockValue)
          .slice(0, 10),
        lastUpdated: new Date().toISOString()
      };

      this.setCache(cacheKey, insights);
      return insights;

    } catch (error) {
      console.error('❌ Error getting inventory insights:', error);
      throw error;
    }
  }

  /**
   * Get agent performance - matches your Swift model
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
        const agentId = order.cf_agent || order.salesperson_id || 'unassigned';
        const agentName = order.salesperson_name || 'Unassigned';
        
        const existing = agentStats.get(agentId) || {
          agentId,
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
        agentId: agent.agentId,
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

  // Helper methods that are referenced but missing
  async getSalesOrders(dateRange, customDateRange = null, agentId = null) {
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

      // Filter by agent if specified
      if (agentId) {
        orders = orders.filter(order => 
          order.cf_agent === agentId || order.salesperson_id === agentId
        );
      }

      return orders;
    } catch (error) {
      console.error('❌ Error getting sales orders:', error);
      return [];
    }
  }

  async getPurchaseOrders(dateRange, customDateRange = null) {
    try {
      const token = await getAccessToken();
      const { startDate, endDate } = this.getDateFilter(dateRange, customDateRange);
      
      let url = `https://www.zohoapis.eu/inventory/v1/purchaseorders?organization_id=${this.orgId}&per_page=200`;
      url += `&date_start=${startDate.toISOString().split('T')[0]}`;
      url += `&date_end=${endDate.toISOString().split('T')[0]}`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
      });

      return response.data.purchaseorders || [];
    } catch (error) {
      console.error('❌ Error getting purchase orders:', error);
      return [];
    }
  }

  async getInvoices(dateRange, customDateRange = null) {
    try {
      const token = await getAccessToken();
      const { startDate, endDate } = this.getDateFilter(dateRange, customDateRange);
      
      let url = `https://www.zohoapis.eu/inventory/v1/invoices?organization_id=${this.orgId}&per_page=200`;
      url += `&date_start=${startDate.toISOString().split('T')[0]}`;
      url += `&date_end=${endDate.toISOString().split('T')[0]}`;

      const response = await axios.get(url, {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
      });

      const invoices = response.data.invoices || [];
      
      const outstanding = invoices.filter(inv => 
        inv.status === 'sent' || inv.status === 'overdue' || parseFloat(inv.balance || 0) > 0
      );
      
      const paid = invoices.filter(inv => 
        inv.status === 'paid' || parseFloat(inv.balance || 0) === 0
      );

      return {
        all: invoices,
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
      console.error('❌ Error getting invoices:', error);
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

  async getTopSellingItems(dateRange, customDateRange = null, agentId = null) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentId);
      const itemStats = new Map();

      // Process line items from all sales orders
      salesOrders.forEach(order => {
        if (order.line_items) {
          order.line_items.forEach(item => {
            const existing = itemStats.get(item.item_id) || {
              itemId: item.item_id,
              name: item.name,
              sku: item.sku,
              quantity: 0,
              revenue: 0
            };

            existing.quantity += parseFloat(item.quantity || 0);
            existing.revenue += parseFloat(item.item_total || 0);

            itemStats.set(item.item_id, existing);
          });
        }
      });

      return Array.from(itemStats.values())
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('❌ Error getting top selling items:', error);
      return [];
    }
  }

  async getRevenueAnalysis(dateRange, customDateRange) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      const purchaseOrders = await this.getPurchaseOrders(dateRange, customDateRange);

      const grossRevenue = salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const costs = purchaseOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const netRevenue = grossRevenue - costs;

      return {
        gross: grossRevenue,
        net: netRevenue,
        costs: costs,
        margin: grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0,
        period: dateRange
      };
    } catch (error) {
      console.error('❌ Error getting revenue analysis:', error);
      return {
        gross: 0,
        net: 0,
        costs: 0,
        margin: 0,
        period: dateRange
      };
    }
  }

  async getBrandPerformance(dateRange, customDateRange) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      const brandStats = new Map();

      salesOrders.forEach(order => {
        if (order.line_items) {
          order.line_items.forEach(item => {
            const brand = item.cf_brand || item.brand || 'Unknown';
            const existing = brandStats.get(brand) || {
              brand,
              revenue: 0,
              quantity: 0,
              orders: 0
            };

            existing.revenue += parseFloat(item.item_total || 0);
            existing.quantity += parseFloat(item.quantity || 0);
            existing.orders += 1;

            brandStats.set(brand, existing);
          });
        }
      });

      return Array.from(brandStats.values())
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('❌ Error getting brand performance:', error);
      return [];
    }
  }

  async getRegionalPerformance(dateRange, customDateRange) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      const regionStats = new Map();

      salesOrders.forEach(order => {
        const region = order.shipping_address?.state || order.billing_address?.state || 'Unknown';
        const existing = regionStats.get(region) || {
          region,
          revenue: 0,
          orders: 0,
          customers: new Set()
        };

        existing.revenue += parseFloat(order.total || 0);
        existing.orders += 1;
        existing.customers.add(order.customer_id);

        regionStats.set(region, existing);
      });

      return Array.from(regionStats.values())
        .map(stat => ({
          ...stat,
          customers: stat.customers.size
        }))
        .sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      console.error('❌ Error getting regional performance:', error);
      return [];
    }
  }

// Utility methods (continuation from where it cut off)
  getDateFilter(dateRange, customDateRange = null) {
    const endDate = new Date();
    let startDate = new Date();

    if (dateRange === 'custom' && customDateRange) {
      return {
        startDate: new Date(customDateRange.start),
        endDate: new Date(customDateRange.end)
      };
    }

    switch (dateRange) {
      case 'today':
        startDate = new Date(endDate);
        break;
      case '7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'this_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0); // Last day of previous month
        break;
      case 'this_year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case 'last_year':
        startDate = new Date(endDate.getFullYear() - 1, 0, 1);
        endDate = new Date(endDate.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  groupOrdersByPeriod(orders, period) {
    const groups = new Map();

    orders.forEach(order => {
      const orderDate = new Date(order.date);
      let key;

      switch (period) {
        case 'daily':
          key = orderDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarterly':
          const quarter = Math.floor(orderDate.getMonth() / 3) + 1;
          key = `${orderDate.getFullYear()}-Q${quarter}`;
          break;
        case 'yearly':
          key = orderDate.getFullYear().toString();
          break;
        default:
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = groups.get(key) || {
        period: key,
        orders: 0,
        revenue: 0,
        date: orderDate
      };

      existing.orders += 1;
      existing.revenue += parseFloat(order.total || 0);

      groups.set(key, existing);
    });

    return Array.from(groups.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  calculateDaysOverdue(dueDate) {
    if (!dueDate) return 0;
    
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Additional utility methods that might be useful

  /**
   * Format currency values consistently
   */
  formatCurrency(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  }

  /**
   * Calculate percentage change between two values
   */
  calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get business days between two dates
   */
  getBusinessDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let businessDays = 0;
    
    while (start <= end) {
      const dayOfWeek = start.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        businessDays++;
      }
      start.setDate(start.getDate() + 1);
    }
    
    return businessDays;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      totalEntries: this.cache.size,
      validEntries: 0,
      expiredEntries: 0,
      memoryUsage: 0
    };

    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp < this.cacheTimeout) {
        stats.validEntries++;
      } else {
        stats.expiredEntries++;
      }
      
      // Rough estimate of memory usage
      stats.memoryUsage += JSON.stringify(value).length;
    }

    return stats;
  }

  /**
   * Validate date range parameters
   */
  validateDateRange(dateRange, customDateRange = null) {
    const validRanges = [
      'today', '7_days', '30_days', 'quarter', 'year',
      'this_month', 'last_month', 'this_year', 'last_year', 'custom'
    ];

    if (!validRanges.includes(dateRange)) {
      throw new Error(`Invalid date range: ${dateRange}`);
    }

    if (dateRange === 'custom') {
      if (!customDateRange || !customDateRange.start || !customDateRange.end) {
        throw new Error('Custom date range requires start and end dates');
      }

      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      // Limit custom range to 2 years max
      const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
      if (end - start > maxRange) {
        throw new Error('Custom date range cannot exceed 2 years');
      }
    }

    return true;
  }
}

export default new ZohoReportsService();