// server/src/services/zohoReportsService.js
import axios from 'axios';
import admin from 'firebase-admin';
import { getAccessToken } from '../api/zoho.js';

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
/**
 * Generic function for paginated Zoho requests with caching - FIXED VERSION
 */
async fetchPaginatedData(url, params = {}, dataKey = 'data', useCache = true) {
  const cacheKey = `${url}_${JSON.stringify(params)}`;
  
  if (useCache && this.cache.has(cacheKey)) {
    const cached = this.cache.get(cacheKey);
    if (Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📄 Using cached data for ${url}`);
      return cached.data;
    }
  }

  const allData = [];
  let page = 1;
  let pageToken = null; // Variable to hold the page token
  const perPage = ZOHO_CONFIG.pagination.defaultPerPage;
  const maxLoops = 100; // Safety break to prevent infinite loops
  let currentLoop = 0;

  console.log(`🔄 Fetching paginated data from ${url}`);

  while (currentLoop < maxLoops) {
    try {
      const token = await getAccessToken();
      
      // Build the parameters for the current request
      const requestParams = { ...params };
      if (pageToken) {
        // If we have a token, use it instead of the page number
        requestParams.page_token = pageToken;
      } else {
        // Otherwise, use the page number for the initial requests
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
      
      // Check for the page token in the response's 'info' object
      const nextPageToken = data.info?.next_page_token;

      if (nextPageToken) {
        // If a token exists, store it for the next loop
        pageToken = nextPageToken;
      } else {
        // If no token, we've reached the last page
        console.log(`✅ No page_token found, assuming this is the last page.`);
        break;
      }

      page++; // Still increment page for logging purposes
      currentLoop++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

    } catch (error) {
      console.warn(`⚠️ Error on page ${page}:`, error.message);
      // Stop pagination on error, but return what we have so far
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
   * Get agent performance data from Zoho CRM
   */
  async getAgentPerformance(dateRange = '30_days', customDateRange = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      // Get deals/opportunities from CRM to calculate agent performance
      const deals = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.crm}/Deals`,
        {
          fields: 'Deal_Name,Amount,Stage,Closing_Date,Owner,Account_Name,Created_Time,Modified_Time',
          criteria: `(Closing_Date:greater_than:${startDate.toISOString().split('T')[0]}) and (Closing_Date:less_than:${endDate.toISOString().split('T')[0]})`
        }
      );

      // Get sales orders from Inventory
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);

      // Process agent performance
      const agentStats = new Map();
      
      // Process deals
      deals.forEach(deal => {
        if (deal.Owner && deal.Stage === 'Closed Won') {
          const agentId = deal.Owner.id;
          const agentName = deal.Owner.name;
          
          if (!agentStats.has(agentId)) {
            agentStats.set(agentId, {
              agentId,
              agentName,
              dealRevenue: 0,
              dealCount: 0,
              orderRevenue: 0,
              orderCount: 0,
              customers: new Set()
            });
          }
          
          const stats = agentStats.get(agentId);
          stats.dealRevenue += parseFloat(deal.Amount || 0);
          stats.dealCount++;
          if (deal.Account_Name) {
            stats.customers.add(deal.Account_Name);
          }
        }
      });

      // Process sales orders
      salesOrders.forEach(order => {
        if (order.salesperson_id) {
          const agentId = order.salesperson_id;
          
          if (!agentStats.has(agentId)) {
            agentStats.set(agentId, {
              agentId,
              agentName: order.salesperson_name || 'Unknown',
              dealRevenue: 0,
              dealCount: 0,
              orderRevenue: 0,
              orderCount: 0,
              customers: new Set()
            });
          }
          
          const stats = agentStats.get(agentId);
          stats.orderRevenue += parseFloat(order.total || 0);
          stats.orderCount++;
          if (order.customer_name) {
            stats.customers.add(order.customer_name);
          }
        }
      });

      // Convert to array and calculate totals
      const agents = Array.from(agentStats.values()).map(stats => ({
        agentId: stats.agentId,
        agentName: stats.agentName,
        totalRevenue: stats.dealRevenue + stats.orderRevenue,
        totalOrders: stats.dealCount + stats.orderCount,
        orderRevenue: stats.orderRevenue,
        dealRevenue: stats.dealRevenue,
        customers: stats.customers.size,
        averageOrderValue: stats.orderCount > 0 ? stats.orderRevenue / stats.orderCount : 0
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);

      return {
        agents,
        summary: {
          totalAgents: agents.length,
          totalRevenue: agents.reduce((sum, agent) => sum + agent.totalRevenue, 0),
          averageRevenue: agents.length > 0 ? agents.reduce((sum, agent) => sum + agent.totalRevenue, 0) / agents.length : 0,
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
   * Get brand performance data from Zoho
   */
/**
 * Get brand performance data from Zoho - QUICK FIX VERSION
 */
/**
 * Get brand performance data - AMENDED to use Firestore for accurate brand lookup
 */
/**
 * Get brand performance data - AMENDED to use Firestore for accurate brand lookup
 */
// Replace the existing getBrandPerformance function with this one

/**
 * Calculates brand performance by querying the analytics-optimized 
 * 'sales_transactions' collection.
 */
async getBrandPerformance(dateRange = '30_days', customDateRange = null) {
  try {
    console.log(`🏷️  Fetching brand performance for ${dateRange} using analytics collections...`);
    const db = admin.firestore();

    // =======================================================================
    // STEP 1: Retrieve all products from Firebase to get brand information
    // This part remains the same.
    // =======================================================================
    const productsSnapshot = await db.collection('products').get();
    const productBrandMap = new Map();
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      // Use zohoCRMId as the key, which should match the product's 'id' field
      if (product.zohoCRMId && product.brand_normalized) {
        productBrandMap.set(product.zohoCRMId.toString(), product.brand_normalized);
      }
    });
    console.log(`🗺️  Created brand lookup map with ${productBrandMap.size} products.`);


    // =======================================================================
    // STEP 2: Query the 'sales_transactions' collection for the period
    // This is much more efficient than fetching all sales orders.
    // =======================================================================
    const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
    
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


    // =======================================================================
    // STEP 3: Aggregate the transactions to calculate brand stats
    // =======================================================================
    const brandStats = new Map();
    
    transactions.forEach(transaction => {
      // Use the product map to find the definitive brand for this item_id
      const brand = productBrandMap.get(transaction.item_id?.toString()) || 'Unknown';
      
      if (!brandStats.has(brand)) {
        brandStats.set(brand, {
          brand,
          revenue: 0,
          quantity: 0,
          orders: new Set() // Use a Set to count unique orders
        });
      }
      
      const stats = brandStats.get(brand);
      stats.revenue += parseFloat(transaction.total || 0);
      stats.quantity += parseInt(transaction.quantity || 0);
      stats.orders.add(transaction.order_id); // Add the order_id to the set
    });

    // Convert to array and calculate additional metrics
    const brands = Array.from(brandStats.values()).map(stats => ({
      brand: stats.brand,
      revenue: stats.revenue,
      quantity: stats.quantity,
      orderCount: stats.orders.size, // Get the count of unique orders
      averageOrderValue: stats.orders.size > 0 ? stats.revenue / stats.orders.size : 0,
      marketShare: 0 // Will be calculated below
    })).sort((a, b) => b.revenue - a.revenue);

    // The rest of this logic for calculating the summary remains the same
    const totalRevenue = brands.reduce((sum, brand) => sum + brand.revenue, 0);
    brands.forEach(brand => {
      brand.marketShare = totalRevenue > 0 ? (brand.revenue / totalRevenue) * 100 : 0;
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

// The entire duplicated block of code that was here has been removed.
  /**
   * Get customer analytics from Zoho
   */
  async getCustomerAnalytics(dateRange = '30_days', customDateRange = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      // Get accounts from CRM
      const accounts = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.crm}/Accounts`,
        {
          fields: 'Account_Name,Primary_Email,Phone,Agent,Billing_City,Billing_Country,Created_Time'
        }
      );

      // Get sales orders to calculate customer value
      const salesOrders = await this.getSalesOrders(dateRange, customDateRange);
      
      // Calculate customer performance
      const customerStats = new Map();
      
      salesOrders.forEach(order => {
        const customerId = order.customer_id;
        const customerName = order.customer_name;
        
        if (!customerStats.has(customerId)) {
          customerStats.set(customerId, {
            id: customerId,
            name: customerName,
            totalSpent: 0,
            orderCount: 0,
            lastOrderDate: null,
            firstOrderDate: null
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

      // Segment customers
      const customers = Array.from(customerStats.values());
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
          vipPercentage: (segments.vip.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100,
          high: segments.high.length,
          highRevenue: segments.high.reduce((sum, c) => sum + c.totalSpent, 0),
          highPercentage: (segments.high.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100,
          medium: segments.medium.length,
          mediumRevenue: segments.medium.reduce((sum, c) => sum + c.totalSpent, 0),
          mediumPercentage: (segments.medium.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100,
          low: segments.low.length,
          lowRevenue: segments.low.reduce((sum, c) => sum + c.totalSpent, 0),
          lowPercentage: (segments.low.reduce((sum, c) => sum + c.totalSpent, 0) / totalRevenue) * 100
        },
        summary: {
          totalCustomers: customers.length,
          activeCustomers: customers.filter(c => {
            const daysSinceLastOrder = (Date.now() - c.lastOrderDate?.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceLastOrder <= 90; // Active if ordered in last 90 days
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
   async getSalesOrders(dateRange = '30_days', customDateRange = null, agentId = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      const params = {
        organization_id: ZOHO_CONFIG.orgId,
        date_start: startDate.toISOString().split('T')[0],
        date_end: endDate.toISOString().split('T')[0]
      };

      if (agentId) {
        params.salesperson_id = agentId;
      }

      // STEP 1: Fetch the list of orders (without details) first.
      const salesOrderList = await this.fetchPaginatedData(
        `${ZOHO_CONFIG.baseUrls.inventory}/salesorders`,
        params,
        'salesorders'
      );
      
      if (!salesOrderList || salesOrderList.length === 0) {
        return []; // Return empty if no orders found
      }

      console.log(`Found ${salesOrderList.length} orders. Fetching details to get line_items...`);

      // STEP 2: Loop through the list and fetch the full details for each order.
      const detailedOrders = [];
      for (const orderHeader of salesOrderList) {
        const orderDetail = await this.getSalesOrderDetail(orderHeader.salesorder_id);
        if (orderDetail) {
          detailedOrders.push(orderDetail);
        }
        // Optional: add a small delay to be polite to the API
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      console.log(`✅ Successfully fetched details for ${detailedOrders.length} orders.`);
      return detailedOrders;

    } catch (error) {
      console.error('❌ Error fetching sales orders:', error);
      throw error;
    }
  }
  
  /**
   * Get invoices from Zoho Inventory
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

      // Separate outstanding and paid invoices
      const outstanding = invoices.filter(inv => inv.payment_status !== 'paid');
      const paid = invoices.filter(inv => inv.payment_status === 'paid');

      // Calculate days overdue for outstanding invoices
      outstanding.forEach(invoice => {
        const dueDate = new Date(invoice.due_date);
        const today = new Date();
        const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        invoice.daysOverdue = Math.max(0, daysDiff);
      });

      return {
        all: invoices,
        outstanding,
        paid,
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
      console.error('❌ Error fetching invoices:', error);
      throw error;
    }
  }

  /**
   * Get agent-specific invoices
   */
  async getAgentInvoices(agentId, dateRange = '30_days', customDateRange = null) {
    try {
      // Get all invoices first
      const allInvoices = await this.getInvoices(dateRange, customDateRange);
      
      // Filter by agent (assuming salesperson_id field exists in invoices)
      const filterInvoices = (invoices) => 
        invoices.filter(inv => inv.salesperson_id === agentId);

      return {
        all: filterInvoices(allInvoices.all),
        outstanding: filterInvoices(allInvoices.outstanding),
        paid: filterInvoices(allInvoices.paid),
        summary: {
          totalOutstanding: filterInvoices(allInvoices.outstanding)
            .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
          totalPaid: filterInvoices(allInvoices.paid)
            .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0),
          count: {
            outstanding: filterInvoices(allInvoices.outstanding).length,
            paid: filterInvoices(allInvoices.paid).length
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
      const taxAmount = grossRevenue * 0.2 / 1.2; // Extract VAT from gross
      const netRevenue = grossRevenue - taxAmount;
      
      return {
        grossRevenue,
        netRevenue,
        taxAmount,
        paidRevenue,
        outstandingRevenue,
        profitMargin: netRevenue > 0 ? ((netRevenue - (netRevenue * 0.7)) / netRevenue) * 100 : 0, // Assuming 70% COGS
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

async getPurchaseOrders(dateRange = '30_days', customDateRange = null) {
  try {
    const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
    
    const params = {
      organization_id: ZOHO_CONFIG.orgId,
      date_start: startDate.toISOString().split('T')[0],
      date_end: endDate.toISOString().split('T')[0]
    };

    const purchaseOrders = await this.fetchPaginatedData(
      `${ZOHO_CONFIG.baseUrls.inventory}/purchaseorders`, 
      params,
      'purchaseorders'
    );

    return purchaseOrders;

  } catch (error) {
    console.error('❌ Error fetching purchase orders:', error);
    throw error;
  }
};

 async getSalesOrderDetail(salesorder_id) {
    try {
      const url = `${ZOHO_CONFIG.baseUrls.inventory}/salesorders/${salesorder_id}`;
      const token = await getAccessToken();
      
      const response = await axios.get(url, {
        params: { organization_id: ZOHO_CONFIG.orgId },
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      // The data is nested in a 'salesorder' object for a single request
      return response.data?.salesorder;

    } catch (error) {
      console.error(`❌ Error fetching details for sales order ${salesorder_id}:`, error.message);
      return null; // Return null on error so the loop can continue
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    try {
      console.log(`📊 Fetching dashboard data for user ${userId}, range: ${dateRange}`);
      
      // Get user context from Firebase
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const agentId = userData.zohospID; // Inventory salesperson ID
      
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
      this.getCustomerAnalytics(dateRange, customDateRange),
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
            return daysSinceFirst <= 30; // New if first order in last 30 days
          }).length,
          topCustomers: customerAnalytics.customers.slice(0, 5),
          averageOrdersPerCustomer: customerAnalytics.customers.length > 0 ? 
            customerAnalytics.customers.reduce((sum, c) => sum + c.orderCount, 0) / customerAnalytics.customers.length : 0
        }
      };

      // Build response based on role
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
   * Calculate top selling items from sales orders
   */
  calculateTopItems(transactions) {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const itemStats = new Map();
    
    // Loop through the flat list of transactions instead of nested line_items
    transactions.forEach(transaction => {
      const itemId = transaction.item_id;
      if (!itemStats.has(itemId)) {
        itemStats.set(itemId, {
          itemId: itemId,
          name: transaction.item_name,
          sku: transaction.sku || '',
          quantity: 0,
          revenue: 0
        });
      }
      
      const stats = itemStats.get(itemId);
      stats.quantity += parseInt(transaction.quantity || 0);
      stats.revenue += parseFloat(transaction.total || 0);
    });
    
    return Array.from(itemStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Return the top 10 items
  }

  /**
   * Calculate sales trends over time
   */
  calculateTrends(salesOrders) {
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