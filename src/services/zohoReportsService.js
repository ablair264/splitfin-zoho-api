// server/src/services/zohoReportsService.js
import axios from 'axios';
import admin from 'firebase-admin';
import { getAccessToken } from '../api/zoho.js';
import zohoInventoryService from './zohoInventoryService.js';

const ZOHO_CONFIG = {
  baseUrls: {
    crm: 'https://www.zohoapis.eu/crm/v5',
    inventory: 'https://www.zohoapis.eu/inventory/v1',
    analytics: 'https://analyticsapi.zoho.eu/restapi/v2'
  },
  orgId: process.env.ZOHO_ORG_ID,
  pagination: {
    defaultPerPage: 200,
    maxPerPage: 200
  }
};

class ZohoReportsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generic function for paginated Zoho requests with caching
   */
  async fetchPaginatedData(url, params = {}, dataKey = 'data', useCache = true) {
    const cacheKey = `${url}_${JSON.stringify(params)}`;
    
    if (useCache && this.cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📄 Using cached data for ${url}`);
        return cached.data;
      }
    }

    const allData = [];
    let page = 1;
    let pageToken = null;
    const perPage = ZOHO_CONFIG.pagination.defaultPerPage;
    const maxLoops = 100;
    let currentLoop = 0;

    console.log(`🔄 Fetching paginated data from ${url}`);

    while (currentLoop < maxLoops) {
      try {
        const token = await getAccessToken();
        
        const requestParams = { ...params };
        if (pageToken) {
          requestParams.page_token = pageToken;
        } else {
          requestParams.page = page;
          requestParams.per_page = perPage;
        }

        const response = await axios.get(url, {
          params: requestParams,
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
          timeout: 30000
        });

        const data = response.data;
        const items = Array.isArray(data[dataKey]) ? data[dataKey] : data.data || [];
        
        if (items.length === 0) {
          console.log(`✅ No more data found, stopping pagination.`);
          break;
        }
        
        allData.push(...items);
        
        const nextPageToken = data.info?.next_page_token;

        if (nextPageToken) {
          pageToken = nextPageToken;
        } else {
          console.log(`✅ No page_token found, assuming this is the last page.`);
          break;
        }

        page++;
        currentLoop++;
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`⚠️ Error on page ${page}:`, error.message);
        break;
      }
    }

    console.log(`✅ Completed pagination: ${allData.length} total items fetched`);

    if (useCache && allData.length > 0) {
      this.cache.set(cacheKey, {
        data: allData,
        timestamp: Date.now()
      });
    }

    return allData;
  }

  /**
   * Get date range for API queries
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
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break; 
      case '2_years':
        startDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
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
   * Get agent performance data from Zoho Inventory Sales Orders
   */
  async getAgentPerformance(dateRange = '30_days', customDateRange = null) {
    try {
      const db = admin.firestore();
      
      // Get all sales orders for the period
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      
      // Get all users to map IDs to names
      const usersSnapshot = await db.collection('users')
        .where('role', '==', 'salesAgent')
        .get();
      
      const userMap = new Map();
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const uid = doc.id; // Firebase UID
        if (userData.zohospID) {
          userMap.set(userData.zohospID, {
            id: uid,
            zohospID: userData.zohospID,
            name: userData.name || 'Unknown Agent',
            email: userData.email
          });
        }
      });

      // Process agent performance from sales orders
      const agentStats = new Map();

      salesOrders.forEach(order => {
        if (order.salesperson_id) {
          const agentId = order.salesperson_id;
          const agentInfo = userMap.get(agentId) || { name: order.salesperson_name || 'Unknown' };
          
          if (!agentStats.has(agentId)) {
            agentStats.set(agentId, {
              agentId,
              agentUid: agentInfo.id,
              agentName: agentInfo.name,
              agentEmail: agentInfo.email || '',
              totalRevenue: 0,
              totalOrders: 0,
              customers: new Set(),
              items: new Map()
            });
          }
          
          const stats = agentStats.get(agentId);
          stats.totalRevenue += parseFloat(order.total || 0);
          stats.totalOrders++;
          
          if (order.customer_name) {
            stats.customers.add(order.customer_name);
          }
          
          // Track items sold by agent
          if (order.line_items && Array.isArray(order.line_items)) {
            order.line_items.forEach(item => {
              const itemKey = item.item_id;
              if (!stats.items.has(itemKey)) {
                stats.items.set(itemKey, {
                  name: item.name,
                  quantity: 0,
                  revenue: 0
                });
              }
              const itemStats = stats.items.get(itemKey);
              itemStats.quantity += parseInt(item.quantity || 0);
              itemStats.revenue += parseFloat(item.item_total || 0);
            });
          }
        }
      });

      // Convert to array and calculate metrics
      const agents = Array.from(agentStats.values()).map(stats => ({
        agentId: stats.agentId,
        agentName: stats.agentName,
        agentEmail: stats.agentEmail,
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        customers: stats.customers.size,
        averageOrderValue: stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0,
        topItems: Array.from(stats.items.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);

      return {
        agents,
        summary: {
          totalAgents: agents.length,
          totalRevenue: agents.reduce((sum, agent) => sum + agent.totalRevenue, 0),
          averageRevenue: agents.length > 0 ? 
            agents.reduce((sum, agent) => sum + agent.totalRevenue, 0) / agents.length : 0,
          topPerformer: agents[0] || null
        },
        period: dateRange
      };

    } catch (error) {
      console.error('❌ Error fetching agent performance:', error);
      throw error;
    }
  }

  /**
   * Get brand performance data - UPDATED to use actual collections
   */
 async getBrandPerformance(dateRange = '30_days', customDateRange = null) {
  try {
    const db = admin.firestore();
    const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
    
    // Brand mappings
    const brandMappings = {
      'rader': ['rader', 'räder', 'Rader', 'Räder'],
      'relaxound': ['relaxound', 'Relaxound'],
      'myflame': ['my flame', 'My Flame', 'myflame', 'MyFlame', 'My Flame Lifestyle'],
      'blomus': ['blomus', 'Blomus'],
      'remember': ['remember', 'Remember'],
      'elvang': ['elvang', 'Elvang']
    };
    
    // Query sales_transactions for the date range
    const transactionsSnapshot = await db.collection('sales_transactions')
      .where('order_date', '>=', startDate.toISOString().split('T')[0])
      .where('order_date', '<=', endDate.toISOString().split('T')[0])
      .get();
    
    const brandStats = new Map();
    
    // Initialize all brands
    Object.entries(brandMappings).forEach(([key, variants]) => {
      brandStats.set(key, {
        name: variants[variants.length - 1], // Use the properly capitalized version
        revenue: 0,
        quantity: 0,
        orders: new Set(),
        products: new Set(),
        marketplace_orders: new Set(),
        direct_orders: new Set()
      });
    });
    
    // Process transactions
    transactionsSnapshot.forEach(doc => {
      const trans = doc.data();
      
      // Find which brand this belongs to
      let brandKey = null;
      Object.entries(brandMappings).forEach(([key, variants]) => {
        if (variants.some(variant => 
          variant.toLowerCase() === (trans.brand || '').toLowerCase()
        )) {
          brandKey = key;
        }
      });
      
      if (brandKey && brandStats.has(brandKey)) {
        const stats = brandStats.get(brandKey);
        stats.revenue += trans.total || 0;
        stats.quantity += trans.quantity || 0;
        stats.orders.add(trans.order_id);
        stats.products.add(trans.item_id);
        
        if (trans.is_marketplace_order) {
          stats.marketplace_orders.add(trans.order_id);
        } else {
          stats.direct_orders.add(trans.order_id);
        }
      }
    });
    
    // Convert to array
    const brands = Array.from(brandStats.values()).map(stats => ({
      name: stats.name,
      revenue: stats.revenue,
      quantity: stats.quantity,
      orderCount: stats.orders.size,
      productCount: stats.products.size,
      marketplace_orders: stats.marketplace_orders.size,
      direct_orders: stats.direct_orders.size,
      market_share: 0
    })).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate market share
    const totalRevenue = brands.reduce((sum, brand) => sum + brand.revenue, 0);
    brands.forEach(brand => {
      brand.market_share = totalRevenue > 0 ? (brand.revenue / totalRevenue) * 100 : 0;
    });
    
    return {
      brands,
      summary: {
        totalBrands: brands.length,
        totalRevenue,
        topBrand: brands[0] || null
      }
    };
    
  } catch (error) {
    console.error('❌ Error fetching brand performance:', error);
    throw error;
  }
}

  /**
   * Get customer analytics - UPDATED to use actual customers collection
   */
  async getCustomerAnalytics(dateRange = '30_days', customDateRange = null, agentId = null) {
    try {
      const db = admin.firestore();
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      // Get customers that have ordered in the date range
      const customersSnapshot = await db.collection('customer_data').get();
      
      // Filter customers based on last order date
      const customers = customersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(customer => {
          if (!customer.last_order_date) return false;
          const lastOrderDate = new Date(customer.last_order_date);
          return lastOrderDate >= startDate && lastOrderDate <= endDate;
        });
      
      // If agent filtering is needed, get agent's customers from orders
      let filteredCustomers = customers;
      if (agentId) {
        const ordersSnapshot = await db.collection('sales_orders')
          .where('salesperson_id', '==', agentId)
          .where('date', '>=', startDate.toISOString().split('T')[0])
          .where('date', '<=', endDate.toISOString().split('T')[0])
          .get();
        
        const agentCustomerIds = new Set();
        ordersSnapshot.forEach(doc => {
          const order = doc.data();
          if (order.customer_id) {
            agentCustomerIds.add(order.customer_id);
          }
        });
        
        filteredCustomers = customers.filter(c => agentCustomerIds.has(c.customer_id));
      }
      
      // Calculate segments
      const segments = {
        vip: filteredCustomers.filter(c => c.segment === 'VIP'),
        high: filteredCustomers.filter(c => c.segment === 'High'),
        medium: filteredCustomers.filter(c => c.segment === 'Medium'),
        low: filteredCustomers.filter(c => c.segment === 'Low')
      };
      
      // Calculate new customers
      const newCustomers = filteredCustomers.filter(c => {
        if (!c.first_order_date) return false;
        const firstOrderDate = new Date(c.first_order_date);
        return firstOrderDate >= startDate;
      });
      
      return {
        totalCustomers: filteredCustomers.length,
        newCustomers: newCustomers.length,
        repeatCustomers: filteredCustomers.filter(c => c.order_count > 1).length,
        segments,
        topCustomers: filteredCustomers
          .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
          .slice(0, 10),
        averageOrderValue: filteredCustomers.length > 0 
          ? filteredCustomers.reduce((sum, c) => sum + (c.average_order_value || 0), 0) / filteredCustomers.length 
          : 0,
        customers: filteredCustomers, // Include full customer list
        summary: {
          totalCustomers: filteredCustomers.length,
          activeCustomers: filteredCustomers.filter(c => c.status === 'active').length,
          segments: segments
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting customer analytics:', error);
      throw error;
    }
  }

  /**
   * Get sales orders from Zoho Inventory
   */
  async getSalesOrders(dateRange, customDateRange, agentId) {
    return zohoInventoryService.getSalesOrders(dateRange, customDateRange, agentId);
  }

  /**
   * Get items/products
   */
  async getItems() {
    try {
      const params = {
        organization_id: ZOHO_CONFIG.orgId
      };

      const items = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.inventory}/items`,
        params,
        'items'
      );

      return items;
    } catch (error) {
      console.error('❌ Error fetching items:', error);
      throw error;
    }
  }
  
  /**
   * Get invoices from Zoho Inventory with proper categorization
   */
  async getInvoices(dateRange = '30_days', customDateRange = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      const params = {
        organization_id: ZOHO_CONFIG.orgId,
        date_start: startDate.toISOString().split('T')[0],
        date_end: endDate.toISOString().split('T')[0]
      };

      const invoices = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.inventory}/invoices`,
        params,
        'invoices'
      );

      // Set today's date for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Enhanced categorization
      const categorizedInvoices = {
        all: invoices,
        overdue: invoices.filter(inv => {
          const dueDate = new Date(inv.due_date);
          return inv.status !== 'paid' && dueDate < today;
        }),
        dueToday: invoices.filter(inv => {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          return inv.status !== 'paid' && dueDate.getTime() === today.getTime();
        }),
        dueIn30Days: invoices.filter(inv => {
          const dueDate = new Date(inv.due_date);
          const thirtyDaysFromNow = new Date(today);
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return inv.status !== 'paid' && dueDate > today && dueDate <= thirtyDaysFromNow;
        }),
        paid: invoices.filter(inv => inv.status === 'paid'),
        outstanding: invoices.filter(inv => inv.status !== 'paid')
      };

      // Calculate days overdue for outstanding invoices
      categorizedInvoices.overdue.forEach(invoice => {
        const dueDate = new Date(invoice.due_date);
        const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        invoice.daysOverdue = Math.max(0, daysDiff);
      });

      return {
        ...categorizedInvoices,
        summary: {
          totalOverdue: categorizedInvoices.overdue.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalDueToday: categorizedInvoices.dueToday.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalDueIn30Days: categorizedInvoices.dueIn30Days.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalPaid: categorizedInvoices.paid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
          totalOutstanding: categorizedInvoices.outstanding.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          count: {
            overdue: categorizedInvoices.overdue.length,
            dueToday: categorizedInvoices.dueToday.length,
            dueIn30Days: categorizedInvoices.dueIn30Days.length,
            paid: categorizedInvoices.paid.length,
            outstanding: categorizedInvoices.outstanding.length
          }
        }
      };

    } catch (error) {
      console.error('❌ Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Get agent-specific invoices with customer filtering
   */
  async getAgentInvoices(agentId, dateRange = '30_days', customDateRange = null) {
    try {
      const db = admin.firestore();
      
      // First, get all invoices
      const allInvoices = await this.getInvoices(dateRange, customDateRange);
      
      // Get the agent's customers from sales orders
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentId);
      const agentCustomerIds = new Set(salesOrders.map(order => order.customer_id));
      
      // Filter invoices to only include those for the agent's customers
      const filterInvoices = (invoices) => 
        invoices.filter(inv => agentCustomerIds.has(inv.customer_id));

      return {
        all: filterInvoices(allInvoices.all),
        overdue: filterInvoices(allInvoices.overdue),
        dueToday: filterInvoices(allInvoices.dueToday),
        dueIn30Days: filterInvoices(allInvoices.dueIn30Days),
        outstanding: filterInvoices(allInvoices.outstanding),
        paid: filterInvoices(allInvoices.paid),
        summary: {
          totalOverdue: filterInvoices(allInvoices.overdue)
            .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalDueToday: filterInvoices(allInvoices.dueToday)
            .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalDueIn30Days: filterInvoices(allInvoices.dueIn30Days)
            .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalPaid: filterInvoices(allInvoices.paid)
            .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
          totalOutstanding: filterInvoices(allInvoices.outstanding)
            .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          count: {
            overdue: filterInvoices(allInvoices.overdue).length,
            dueToday: filterInvoices(allInvoices.dueToday).length,
            dueIn30Days: filterInvoices(allInvoices.dueIn30Days).length,
            paid: filterInvoices(allInvoices.paid).length,
            outstanding: filterInvoices(allInvoices.outstanding).length
          }
        }
      };

    } catch (error) {
      console.error('❌ Error fetching agent invoices:', error);
      throw error;
    }
  }

  /**
   * Get revenue analysis - UPDATED to use actual collections
   */
  async getRevenueAnalysis(dateRange = '30_days', customDateRange = null) {
    try {
      console.log(`📊 Calculating revenue analysis from Firestore for ${dateRange}...`);
      const db = admin.firestore();
      
      // Get date range
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      // 1. Get gross revenue from sales orders
      const ordersSnapshot = await db.collection('sales_orders')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .get();
      
      let grossRevenue = 0;
      let totalQuantity = 0;
      let orderCount = 0;
      
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        grossRevenue += parseFloat(order.total || 0);
        orderCount++;
        
        // Count items from line items
        if (order.line_items && Array.isArray(order.line_items)) {
          order.line_items.forEach(item => {
            totalQuantity += parseInt(item.quantity || 0);
          });
        }
      });
      
      // 2. Get invoice data
      const invoicesSnapshot = await db.collection('invoices')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .get();
      
      let paidRevenue = 0;
      let outstandingRevenue = 0;
      let overdueRevenue = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      invoicesSnapshot.forEach(doc => {
        const invoice = doc.data();
        if (invoice.status === 'paid') {
          paidRevenue += parseFloat(invoice.total || 0);
        } else {
          outstandingRevenue += parseFloat(invoice.balance || 0);
          
          // Check if overdue
          const dueDate = new Date(invoice.due_date);
          if (dueDate < today) {
            overdueRevenue += parseFloat(invoice.balance || 0);
          }
        }
      });
      
      // 3. Calculate tax
      const netRevenue = grossRevenue / 1.2; // Remove VAT
      const taxAmount = grossRevenue - netRevenue;
      
      // 4. Get cost data from purchase orders
      const purchaseOrdersSnapshot = await db.collection('purchase_orders')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .get();
      
      let totalCost = 0;
      purchaseOrdersSnapshot.forEach(doc => {
        const po = doc.data();
        totalCost += parseFloat(po.total || 0);
      });
      
      // Calculate profit margin
      const profitMargin = grossRevenue > 0 && totalCost > 0 
        ? ((grossRevenue - totalCost) / grossRevenue) * 100 
        : 30; // Default 30% if no cost data
      
      return {
        grossRevenue,
        netRevenue,
        taxAmount,
        paidRevenue,
        outstandingRevenue,
        overdueRevenue,
        totalCost,
        grossProfit: grossRevenue - totalCost,
        profitMargin,
        averageOrderValue: orderCount > 0 ? grossRevenue / orderCount : 0,
        totalTransactions: orderCount,
        totalQuantitySold: totalQuantity,
        period: dateRange,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      };
      
    } catch (error) {
      console.error('❌ Error calculating revenue analysis:', error);
      throw error;
    }
  }

  async getPurchaseOrders(dateRange, customDateRange) {
    return zohoInventoryService.getPurchaseOrders(dateRange, customDateRange);
  }

  /**
   * Get purchase order detail with line items
   */
  async getPurchaseOrderDetail(purchaseorder_id) {
    try {
      const url = `${ZOHO_CONFIG.baseUrls.inventory}/purchaseorders/${purchaseorder_id}`;
      const token = await getAccessToken();
      
      const response = await axios.get(url, {
        params: { organization_id: ZOHO_CONFIG.orgId },
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      const purchaseOrder = response.data?.purchaseorder;
      
      if (purchaseOrder) {
        // Ensure vendor name is included
        if (!purchaseOrder.vendor_name && purchaseOrder.vendor_id) {
          purchaseOrder.vendor_name = `Vendor ${purchaseOrder.vendor_id}`;
        }
        
        // Process line items if they exist
        if (purchaseOrder.line_items && Array.isArray(purchaseOrder.line_items)) {
          purchaseOrder.line_items = purchaseOrder.line_items.map(item => ({
            ...item,
            item_id: item.item_id,
            item_name: item.name || item.item_name,
            quantity: item.quantity || 0,
            rate: item.rate || 0,
            total: item.item_total || (item.quantity * item.rate) || 0
          }));
        }
      }
      
      return purchaseOrder;

    } catch (error) {
      console.error(`❌ Error fetching details for purchase order ${purchaseorder_id}:`, error.message);
      return null;
    }
  }

  /**
   * Get sales order detail with brand information
   */
  async getSalesOrderDetail(salesorder_id) {
    try {
      const db = admin.firestore();
      const url = `${ZOHO_CONFIG.baseUrls.inventory}/salesorders/${salesorder_id}`;
      const token = await getAccessToken();
      
      const response = await axios.get(url, {
        params: { organization_id: ZOHO_CONFIG.orgId },
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      const order = response.data?.salesorder;
      
      if (order) {
        // Ensure customer name is included
        if (!order.customer_name && order.customer_id) {
          order.customer_name = `Customer ${order.customer_id}`;
        }
        
        // Process line items to include brand info
        if (order.line_items && Array.isArray(order.line_items)) {
          // Get product info from Firebase to add brand data
          const productIds = order.line_items.map(item => item.item_id);
          const productDocs = await Promise.all(
            productIds.map(id => db.collection('sales_transactions').doc(id).get())
          );
          
          const productMap = new Map();
          productDocs.forEach(doc => {
            if (doc.exists) {
              const data = doc.data();
              productMap.set(doc.id, {
                brand: data.brand || 'Unknown Brand',
                sku: data.sku
              });
            }
          });
          
          // Enhance line items with brand info
          order.line_items = order.line_items.map(item => ({
            ...item,
            brand: productMap.get(item.item_id)?.brand || 'Unknown Brand',
            sku: item.sku || productMap.get(item.item_id)?.sku || ''
          }));
        }
      }
      
      return order;

    } catch (error) {
      console.error(`❌ Error fetching details for sales order ${salesorder_id}:`, error.message);
      return null;
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    try {
      console.log(`📊 Fetching dashboard data for user ${userId}, range: ${dateRange}`);
      
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const agentId = userData.zohospID; // For Zoho API filtering
      const userUid = userId; // Firebase UID
      
      // Fetch data based on role
      const [
        revenue,
        salesOrders,
        invoices,
        agentPerformance,
        brandPerformance,
        customerAnalytics,
        items,
        purchaseOrders
      ] = await Promise.all([
        this.getRevenueAnalysis(dateRange, customDateRange),
        this.getSalesOrders(dateRange, customDateRange, isAgent ? agentId : null),
        isAgent ? 
          this.getAgentInvoices(agentId, dateRange, customDateRange) : 
          this.getInvoices(dateRange, customDateRange),
        !isAgent ? this.getAgentPerformance(dateRange, customDateRange) : null,
        this.getBrandPerformance(dateRange, customDateRange),
        this.getCustomerAnalytics(dateRange, customDateRange, isAgent ? agentId : null),
        this.getItems(),
        this.getPurchaseOrders(dateRange, customDateRange)
      ]);

      // Calculate overview metrics
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
          totalCustomers: customerAnalytics.totalCustomers,
          newCustomers: customerAnalytics.newCustomers,
          topCustomers: customerAnalytics.topCustomers.slice(0, 5),
          averageOrdersPerCustomer: customerAnalytics.customers.length > 0 ? 
            customerAnalytics.customers.reduce((sum, c) => sum + (c.order_count || 0), 0) / customerAnalytics.customers.length : 0
        }
      };

      // Build response
      const dashboardData = {
        role: userData.role,
        dateRange,
        overview,
        revenue,
        orders: {
          salesOrders: {
            total: salesOrders.length,
            totalValue: salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0),
            averageValue: overview.sales.averageOrderValue,
            latest: salesOrders.slice(0, 10)
          }
        },
        invoices,
        performance: {
          brands: brandPerformance.brands,
          customers: customerAnalytics.customers.slice(0, 10),
          topItems: overview.topItems,
          trends: this.calculateTrends(salesOrders)
        },
        inventory: {
          items,
          purchaseOrders
        },
        lastUpdated: new Date().toISOString()
      };
      
      // Add agent-specific data
      if (isAgent) {
        // Calculate commission
        const totalSalesValue = salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
        const commissionRate = 0.125; // 12.5%
        const totalCommission = totalSalesValue * commissionRate;
        
        dashboardData.commission = {
          rate: commissionRate,
          total: totalCommission,
          salesValue: totalSalesValue
        };
      }
      
      // Add agent performance for brand managers
      if (!isAgent && agentPerformance) {
        dashboardData.agentPerformance = agentPerformance;
      }

      return dashboardData;

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw error;
    }
  }

  /**
   * Calculate top selling items from sales orders with line items
   */
  calculateTopItems(salesOrders) {
    if (!salesOrders || salesOrders.length === 0) {
      return [];
    }

    const itemStats = new Map();
    
    // Process line items from sales orders
    salesOrders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach(item => {
          const itemId = item.item_id;
          if (!itemStats.has(itemId)) {
            itemStats.set(itemId, {
              itemId: itemId,
              name: item.name || 'Unknown Item',
              sku: item.sku || '',
              brand: item.brand || 'Unknown Brand',
              quantity: 0,
              revenue: 0
            });
          }
          
          const stats = itemStats.get(itemId);
          stats.quantity += parseInt(item.quantity || 0);
          stats.revenue += parseFloat(item.item_total || 0);
        });
      }
    });
    
    return Array.from(itemStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }


// Add this to zohoReportsService.js

/**
 * Get customers from Zoho Inventory
 */
async getCustomers(dateRange = 'all', customDateRange = null) {
  try {
    console.log(`📥 Fetching customers from Zoho Inventory...`);
    
    const params = {
      organization_id: ZOHO_CONFIG.orgId
    };
    
    // Add date filter if not 'all'
    if (dateRange !== 'all') {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      // Zoho Inventory uses date filters differently
      params.created_date_start = startDate.toISOString().split('T')[0];
      params.created_date_end = endDate.toISOString().split('T')[0];
    }
    
    // Fetch from Zoho Inventory Contacts endpoint
    const customers = await this.fetchPaginatedData(
      `${ZOHO_CONFIG.baseUrls.inventory}/contacts`,
      params,
      'contacts'  // Note: Zoho Inventory uses 'contacts' as the data key
    );
    
    console.log(`✅ Fetched ${customers.length} customers from Zoho Inventory`);
    
    // Transform to your expected format
    return customers.map(customer => ({
      customer_id: customer.contact_id,
      customer_name: customer.contact_name || customer.company_name || 'Unknown',
      company_name: customer.company_name || customer.contact_name || '',
      email: customer.email || '',
      Primary_Email: customer.email || '',
      phone: customer.phone || customer.mobile || '',
      billing_address: customer.billing_address || {},
      shipping_address: customer.shipping_address || {},
      currency_code: customer.currency_code || 'GBP',
      payment_terms: customer.payment_terms || 0,
      status: customer.status || 'active',
      created_time: customer.created_time,
      last_modified_time: customer.last_modified_time,
      // Zoho Inventory provides these fields directly
      outstanding_receivable_amount: customer.outstanding_receivable_amount || 0,
      unused_credits_receivable_amount: customer.unused_credits_receivable_amount || 0,
      // Fields to be enriched from orders
      total_spent: 0,
      order_count: 0,
      last_order_date: null,
      first_order_date: null,
      average_order_value: 0,
      segment: 'New'
    }));
    
  } catch (error) {
    console.error('❌ Error fetching customers from Zoho Inventory:', error);
    return [];
  }
}

async getSalesOrderById(salesOrderId) {
  try {
    const response = await this.makeZohoRequest(
      `/salesorders/${salesOrderId}`,
      'GET'
    );
    return response.salesorder;
  } catch (error) {
    console.error(`Error fetching sales order ${salesOrderId}:`, error);
    return null;
  }
}

async getCustomerById(customerId) {
  try {
    const response = await this.makeZohoRequest(
      `/contacts/${customerId}`,
      'GET'
    );
    return response.contact;
  } catch (error) {
    console.error(`Error fetching customer ${customerId}:`, error);
    return null;
  }
}

/**
 * Sync customers from Zoho Inventory to Firestore and enrich with order data
 */
async syncCustomers(dateRange = '7_days') {
  try {
    console.log('👥 Syncing customers from Zoho Inventory...');
    const db = admin.firestore();
    
    // 1. Fetch customers from Zoho Inventory
    const zohoCustomers = await this.getCustomers(dateRange);
    
    if (zohoCustomers.length === 0) {
      console.log('No customers found in Zoho Inventory');
      return { synced: 0, enriched: 0 };
    }
    
    // 2. Get all sales orders to calculate customer metrics
    const ordersSnapshot = await db.collection('sales_orders').get();
    const ordersByCustomer = new Map();
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      if (order.customer_id) {
        if (!ordersByCustomer.has(order.customer_id)) {
          ordersByCustomer.set(order.customer_id, []);
        }
        ordersByCustomer.get(order.customer_id).push(order);
      }
    });
    
    // 3. Enrich customer data with order metrics
    const enrichedCustomers = zohoCustomers.map(customer => {
      const customerOrders = ordersByCustomer.get(customer.customer_id) || [];
      
      // Calculate metrics
      const totalSpent = customerOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const orderCount = customerOrders.length;
      const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;
      
      // Get first and last order dates
      const orderDates = customerOrders
        .map(order => new Date(order.date))
        .sort((a, b) => a - b);
      
      const firstOrderDate = orderDates[0] || null;
      const lastOrderDate = orderDates[orderDates.length - 1] || null;
      
      // Determine segment based on total spent or outstanding amount
      let segment = 'New';
      const totalValue = totalSpent + (customer.outstanding_receivable_amount || 0);
      
      if (totalValue >= 10000) segment = 'VIP';
      else if (totalValue >= 5000) segment = 'High';
      else if (totalValue >= 1000) segment = 'Medium';
      else if (totalValue > 0) segment = 'Low';
      
      return {
        ...customer,
        total_spent: totalSpent,
        order_count: orderCount,
        average_order_value: averageOrderValue,
        first_order_date: firstOrderDate ? firstOrderDate.toISOString() : null,
        last_order_date: lastOrderDate ? lastOrderDate.toISOString() : null,
        segment,
        _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
        _source: 'zoho_inventory'
      };
    });
    
    // 4. Write to Firestore in batches
    const batch = db.batch();
    let count = 0;
    
    for (const customer of enrichedCustomers) {
      const docRef = db.collection('customers').doc(customer.customer_id);
      batch.set(docRef, customer, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    
    if (count % 400 !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Synced ${enrichedCustomers.length} customers from Zoho Inventory`);
    
    return {
      synced: enrichedCustomers.length,
      enriched: enrichedCustomers.filter(c => c.order_count > 0).length
    };
    
  } catch (error) {
    console.error('❌ Error syncing customers:', error);
    throw error;
  }
}

/**
 * Get specific customer details from Zoho Inventory
 */
async getCustomerDetail(customerId) {
  try {
    const url = `${ZOHO_CONFIG.baseUrls.inventory}/contacts/${customerId}`;
    const token = await getAccessToken();
    
    const response = await axios.get(url, {
      params: { organization_id: ZOHO_CONFIG.orgId },
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    
    return response.data?.contact || null;
    
  } catch (error) {
    console.error(`❌ Error fetching customer ${customerId}:`, error.message);
    return null;
  }
}
  /**
   * Calculate sales trends over time
   */
  calculateTrends(salesOrders) {
    const trends = new Map();
    
    salesOrders.forEach(order => {
      const date = new Date(order.date);
      const period = date.toISOString().split('T')[0];
      
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
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.cache.clear();
    console.log('📄 Reports cache cleared');
  }
}

export default new ZohoReportsService();

// --- CLI Entrypoint ---
if (typeof require !== 'undefined' && require.main === module) {
  (async () => {
    try {
      const clear = process.argv.includes('--clear');
      console.log(`\n🚀 Starting Zoho migration and metrics calculation (clear=${clear})...`);
      await exports.runFullMigration({ clear });
      console.log('✅ Migration and metrics calculation complete.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    }
  })();
}