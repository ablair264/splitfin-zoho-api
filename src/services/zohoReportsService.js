// server/src/services/zohoReportsService.js
import axios from 'axios';
import { getAccessToken } from '../api/zoho.js';

class ZohoReportsService {
  constructor() {
    this.orgId = process.env.ZOHO_ORG_ID;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get sales overview statistics
   */
  async getSalesOverview(dateRange = '30_days', agentId = null) {
    const cacheKey = `sales_overview_${dateRange}_${agentId || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const [salesOrders, items, customers] = await Promise.all([
        this.getSalesOrders(dateRange, agentId),
        this.getTopSellingItems(dateRange, agentId),
        this.getCustomerStats(dateRange, agentId)
      ]);

      const overview = {
        period: dateRange,
        agentId,
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
   * Get sales orders from Zoho Inventory
   */
  async getSalesOrders(dateRange = '30_days', agentId = null) {
    try {
      const token = await getAccessToken();
      const dateFilter = this.getDateFilter(dateRange);
      
      let url = `https://www.zohoapis.eu/inventory/v1/salesorders?organization_id=${this.orgId}&per_page=200`;
      
      if (dateFilter.start && dateFilter.end) {
        url += `&date_start=${dateFilter.start}&date_end=${dateFilter.end}`;
      }

      const response = await axios.get(url, {
        headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
      });

      let salesOrders = response.data.salesorders || [];

      // Filter by agent if specified
      if (agentId) {
        salesOrders = salesOrders.filter(order => 
          order.cf_agent === agentId || order.salesperson_id === agentId
        );
      }

      return salesOrders;

    } catch (error) {
      console.error('❌ Error fetching sales orders:', error);
      return [];
    }
  }

  /**
   * Get top selling items
   */
  async getTopSellingItems(dateRange = '30_days', agentId = null) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, agentId);
      const itemStats = new Map();

      // Aggregate item sales
      salesOrders.forEach(order => {
        if (order.line_items) {
          order.line_items.forEach(item => {
            const itemId = item.item_id;
            const existing = itemStats.get(itemId) || {
              itemId,
              name: item.name,
              sku: item.sku,
              quantity: 0,
              revenue: 0,
              orders: 0
            };

            existing.quantity += parseInt(item.quantity || 0);
            existing.revenue += parseFloat(item.item_total || 0);
            existing.orders += 1;

            itemStats.set(itemId, existing);
          });
        }
      });

      // Convert to array and sort by quantity
      return Array.from(itemStats.values())
        .sort((a, b) => b.quantity - a.quantity);

    } catch (error) {
      console.error('❌ Error getting top selling items:', error);
      return [];
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(dateRange = '30_days', agentId = null) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, agentId);
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
          new Date(c.lastOrderDate) >= this.getDateFilter(dateRange).startDate
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
   * Get inventory insights
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
   * Get sales performance by agent
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
      const performance = Array.from(agentStats.values()).map(agent => ({
        ...agent,
        customers: agent.customers.size,
        averageOrderValue: agent.orders > 0 ? agent.revenue / agent.orders : 0
      })).sort((a, b) => b.revenue - a.revenue);

      const result = {
        period: dateRange,
        agents: performance,
        totalAgents: performance.length,
        topPerformer: performance[0] || null,
        lastUpdated: new Date().toISOString()
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      console.error('❌ Error getting agent performance:', error);
      throw error;
    }
  }

  /**
   * Get sales trends over time
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
   * Get comprehensive dashboard data
   */
  async getDashboardData(agentId = null, dateRange = '30_days') {
    try {
      const [overview, inventory, agentPerformance, trends] = await Promise.all([
        this.getSalesOverview(dateRange, agentId),
        this.getInventoryInsights(),
        agentId ? null : this.getAgentPerformance(dateRange),
        this.getSalesTrends('monthly', 6, agentId)
      ]);

      return {
        overview,
        inventory,
        agentPerformance,
        trends,
        generatedAt: new Date().toISOString(),
        agentId,
        dateRange
      };

    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      throw error;
    }
  }

  // Helper methods

  getDateFilter(range) {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case '7_days':
        start.setDate(end.getDate() - 7);
        break;
      case '30_days':
        start.setDate(end.getDate() - 30);
        break;
      case '90_days':
        start.setDate(end.getDate() - 90);
        break;
      case 'this_month':
        start.setDate(1);
        break;
      case 'last_month':
        start.setMonth(end.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case 'this_year':
        start.setMonth(0);
        start.setDate(1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      startDate: start,
      endDate: end
    };
  }

  groupOrdersByPeriod(orders, period) {
    const groups = new Map();

    orders.forEach(order => {
      const date = new Date(order.date);
      let key;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else { // monthly
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      const existing = groups.get(key) || {
        period: key,
        orders: 0,
        revenue: 0,
        customers: new Set()
      };

      existing.orders += 1;
      existing.revenue += parseFloat(order.total || 0);
      existing.customers.add(order.customer_id);

      groups.set(key, existing);
    });

    return Array.from(groups.values())
      .map(group => ({
        ...group,
        customers: group.customers.size
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

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

  clearCache() {
    this.cache.clear();
  }
}

export default new ZohoReportsService();