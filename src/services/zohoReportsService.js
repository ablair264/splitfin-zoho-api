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
    this.cache = new Map(); // Make sure this is here
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generic function for paginated Zoho requests with caching - FIXED VERSION
   */
async fetchPaginatedData(url, params = {}, dataKey = 'data', useCache = true) {
  const cacheKey = `${url}_${JSON.stringify(params)}`;
  
  // Add null check
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
   * FIXED: Get agent performance data from Zoho Inventory Sales Orders
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
  const uid = doc.id; // Use the document ID which is the Firebase UID
  if (userData.zohospID) {
    userMap.set(userData.zohospID, {
      id: uid, // Store Firebase UID
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
        agentUid: agentInfo.id, // Add Firebase UID
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
   * Get brand performance data - using existing implementation
   */
async getBrandPerformance(dateRange = '30_days', customDateRange = null) {
  try {
    console.log(`🏷️  Fetching brand performance for ${dateRange} using sales_transactions...`);
    const db = admin.firestore();
    
    // Get the date range
    const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
    
    // Query the sales_transactions collection for the period
    const transactionsSnapshot = await db.collection('sales_transactions')
      .where('order_date', '>=', startDate.toISOString())
      .where('order_date', '<=', endDate.toISOString())
      .get();
      
    if (transactionsSnapshot.empty) {
      console.log('📊 No transactions found for brand performance calculation in this period.');
      return {
        brands: [],
        summary: { totalBrands: 0, totalRevenue: 0, topBrand: null },
        period: dateRange
      };
    }
    
    const transactions = transactionsSnapshot.docs.map(doc => doc.data());
    
    // Aggregate the transactions by brand_normalized
    const brandStats = new Map();
    
    transactions.forEach(transaction => {
      // Use brand_normalized directly from the transaction
      const brand = transaction.brand_normalized || transaction.brand || 'Unknown';
      
      if (!brandStats.has(brand)) {
        brandStats.set(brand, {
          name: brand, // Changed from 'brand' to 'name' to match your Dashboard component
          revenue: 0,
          quantity: 0,
          orders: new Set(),
          products: new Set()
        });
      }
      
      const stats = brandStats.get(brand);
      stats.revenue += parseFloat(transaction.total || 0);
      stats.quantity += parseInt(transaction.quantity || 0);
      stats.orders.add(transaction.order_id);
      
      // If you still want to track unique products
      if (transaction.item_id) {
        stats.products.add(transaction.item_id);
      }
    });
    
    // Convert to array and calculate additional metrics
    const brands = Array.from(brandStats.values()).map(stats => ({
      name: stats.name, // IMPORTANT: Changed from 'brand' to 'name' to match Dashboard component
      revenue: stats.revenue,
      quantity: stats.quantity,
      orderCount: stats.orders.size,
      productCount: stats.products.size,
      averageOrderValue: stats.orders.size > 0 ? stats.revenue / stats.orders.size : 0,
      market_share: 0 // Changed to snake_case to match Dashboard component
    })).sort((a, b) => b.revenue - a.revenue);
    
    // Calculate total revenue and market share
    const totalRevenue = brands.reduce((sum, brand) => sum + brand.revenue, 0);
    brands.forEach(brand => {
      brand.market_share = totalRevenue > 0 ? (brand.revenue / totalRevenue) * 100 : 0;
    });
    
    console.log(`✅ Brand performance calculated: ${brands.length} brands, total revenue: £${totalRevenue.toFixed(2)}`);
    
    return {
      brands,
      summary: {
        totalBrands: brands.length,
        totalRevenue,
        topBrand: brands[0] || null,
        averageRevenuePerBrand: brands.length > 0 ? totalRevenue / brands.length : 0
      },
      period: dateRange
    };
    
  } catch (error) {
    console.error('❌ Error fetching brand performance:', error);
    return {
      brands: [],
      summary: { totalBrands: 0, totalRevenue: 0, topBrand: null, averageRevenuePerBrand: 0 },
      period: dateRange,
      error: error.message
    };
  }
}

  /**
   * FIXED: Get customer analytics with agent filtering
   */
  async getCustomerAnalytics(dateRange = '30_days', customDateRange = null, agentId = null) {
    try {
      const db = admin.firestore();
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      // Get sales orders (filtered by agent if provided)
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange, agentId);
      
      // Calculate customer performance from sales orders
      const customerStats = new Map();
      
      salesOrders.forEach(order => {
        const customerId = order.customer_id;
        const customerName = order.customer_name || 'Unknown Customer';
        
        if (!customerStats.has(customerId)) {
          customerStats.set(customerId, {
            id: customerId,
            name: customerName,
            totalSpent: 0,
            orderCount: 0,
            lastOrderDate: null,
            firstOrderDate: null,
            agentId: order.salesperson_id
          });
        }
        
        const stats = customerStats.get(customerId);
        stats.totalSpent += parseFloat(order.total || 0);
        stats.orderCount++;
        
        const orderDate = new Date(order.date);
        if (!stats.lastOrderDate || orderDate > stats.lastOrderDate) {
          stats.lastOrderDate = orderDate;
        }
        if (!stats.firstOrderDate || orderDate < stats.firstOrderDate) {
          stats.firstOrderDate = orderDate;
        }
      });

      // Convert to array
      let customers = Array.from(customerStats.values());
      
      // If agent filtering is requested, filter customers
      if (agentId) {
        customers = customers.filter(customer => customer.agentId === agentId);
      }

      // Segment customers
      const segments = {
        vip: customers.filter(c => c.totalSpent >= 10000),
        high: customers.filter(c => c.totalSpent >= 5000 && c.totalSpent < 10000),
        medium: customers.filter(c => c.totalSpent >= 1000 && c.totalSpent < 5000),
        low: customers.filter(c => c.totalSpent < 1000)
      };

      // Add segment info to customers
      customers.forEach(customer => {
        if (customer.totalSpent >= 10000) customer.segment = 'VIP';
        else if (customer.totalSpent >= 5000) customer.segment = 'High';
        else if (customer.totalSpent >= 1000) customer.segment = 'Medium';
        else customer.segment = 'Low';
      });

      const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

      return {
        customers: customers.sort((a, b) => b.totalSpent - a.totalSpent),
        segments: {
          vip: segments.vip.length,
          vipRevenue: segments.vip.reduce((sum, c) => sum + c.totalSpent, 0),
          vipPercentage: totalRevenue > 0 ? (segments.vip.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100 : 0,
          high: segments.high.length,
          highRevenue: segments.high.reduce((sum, c) => sum + c.totalSpent, 0),
          highPercentage: totalRevenue > 0 ? (segments.high.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100 : 0,
          medium: segments.medium.length,
          mediumRevenue: segments.medium.reduce((sum, c) => sum + c.totalSpent, 0),
          mediumPercentage: totalRevenue > 0 ? (segments.medium.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100 : 0,
          low: segments.low.length,
          lowRevenue: segments.low.reduce((sum, c) => sum + c.totalSpent, 0),
          lowPercentage: totalRevenue > 0 ? (segments.low.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100 : 0
        },
        summary: {
          totalCustomers: customers.length,
          activeCustomers: customers.filter(c => {
            const daysSinceLastOrder = (Date.now() - c.lastOrderDate?.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceLastOrder <= 90;
          }).length,
          averageCustomerValue: customers.length > 0 ? totalRevenue / customers.length : 0,
          totalRevenue
        },
        period: dateRange
      };

    } catch (error) {
      console.error('❌ Error fetching customer analytics:', error);
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
   * FIXED: Get invoices from Zoho Inventory with proper categorization
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
   * FIXED: Get agent-specific invoices with customer filtering
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
   * Get revenue analysis
   */
  async getRevenueAnalysis(dateRange = '30_days', customDateRange = null) {
    try {
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      const invoices = await this.getInvoices(dateRange, customDateRange);
      
      const grossRevenue = salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const paidRevenue = invoices.paid.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
      const outstandingRevenue = invoices.outstanding.reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0);
      
      // Calculate tax amount (assuming 20% VAT)
      const taxAmount = grossRevenue * 0.2 / 1.2;
      const netRevenue = grossRevenue - taxAmount;
      
      return {
        grossRevenue,
        netRevenue,
        taxAmount,
        paidRevenue,
        outstandingRevenue,
        profitMargin: netRevenue > 0 ? ((netRevenue - (netRevenue * 0.7)) / netRevenue) * 100 : 0,
        period: dateRange
      };

    } catch (error) {
      console.error('❌ Error calculating revenue analysis:', error);
      throw error;
    }
  }
  
  async getItems() {
    try {
      const items = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.inventory}/items`, 
        { organization_id: ZOHO_CONFIG.orgId },
        'items'
      );
      return items;
    } catch (error) {
      console.error('❌ Error fetching items:', error);
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
        // Enhance line items with additional info if needed
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
   * FIXED: Get sales order detail with brand information
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
            productIds.map(id => db.collection('products').doc(id).get())
          );
          
          const productMap = new Map();
          productDocs.forEach(doc => {
            if (doc.exists) {
              const data = doc.data();
              productMap.set(doc.id, {
                brand: data.brand || data.brand_normalized || 'Unknown Brand',
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
const agentId = userData.zohospID; // Keep for Zoho API filtering
const userUid = userId; // This is the Firebase UID
      
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
          totalCustomers: customerAnalytics.summary.totalCustomers,
          newCustomers: customerAnalytics.customers.filter(c => {
            const daysSinceFirst = (Date.now() - c.firstOrderDate?.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceFirst <= 30;
          }).length,
          topCustomers: customerAnalytics.customers.slice(0, 5),
          averageOrdersPerCustomer: customerAnalytics.customers.length > 0 ? 
            customerAnalytics.customers.reduce((sum, c) => sum + c.orderCount, 0) / customerAnalytics.customers.length : 0
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
   * FIXED: Calculate top selling items from sales orders with line items
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