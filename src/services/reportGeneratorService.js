// server/src/services/reportGeneratorService.js
import admin from 'firebase-admin';

class ReportGeneratorService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Generate a report based on configuration
   */
  async generateReport(config, userContext) {
    console.log(`📊 Generating ${config.reportType} report for ${userContext.role}: ${userContext.name}`);

    // Get date range
    const dateRange = this.getDateRange(config.dateRange, config.customDateRange);
    
    // Fetch base data
    const baseData = await this.fetchBaseData(userContext, dateRange, config.filters);
    
    // Apply filters
    const filteredData = this.applyFilters(baseData, config.filters);
    
    // Generate report based on type
    let reportData;
    switch (config.reportType) {
      case 'agent_brand':
        reportData = await this.generateAgentBrandReport(filteredData, config);
        break;
      case 'agent':
        reportData = await this.generateAgentReport(filteredData, config);
        break;
      case 'brand':
        reportData = await this.generateBrandReport(filteredData, config);
        break;
      case 'customer':
        reportData = await this.generateCustomerReport(filteredData, config);
        break;
      case 'region':
        reportData = await this.generateRegionReport(filteredData, config);
        break;
      case 'popular_items_brand':
        reportData = await this.generatePopularItemsByBrandReport(filteredData, config);
        break;
      case 'popular_items_all':
        reportData = await this.generatePopularItemsReport(filteredData, config);
        break;
      default:
        throw new Error(`Unknown report type: ${config.reportType}`);
    }

    return {
      config,
      data: reportData,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataRange: {
          start: dateRange.start.toISOString().split('T')[0],
          end: dateRange.end.toISOString().split('T')[0]
        },
        recordCounts: {
          orders: filteredData.orders.length,
          invoices: filteredData.invoices.length,
          customers: filteredData.customers.length,
          transactions: filteredData.transactions?.length || 0
        },
        filters: {
          excludedMarketplaceOrders: config.filters.excludeMarketplace ? 
            baseData.orders.filter(o => this.isMarketplaceOrder(o)).length : 0,
          appliedFilters: this.getAppliedFilters(config.filters)
        }
      }
    };
  }

  /**
   * Fetch base data from Firestore
   */
  async fetchBaseData(userContext, dateRange, filters) {
    const { start, end } = dateRange;
    
    // Fetch orders
    let ordersQuery = this.db.collection('salesorders')
      .where('date', '>=', start.toISOString().split('T')[0])
      .where('date', '<=', end.toISOString().split('T')[0]);
      
    // Filter by agent for sales agents
    if (userContext.role === 'salesAgent') {
      ordersQuery = ordersQuery.where('salesperson_uid', '==', userContext.userId);
    }
    
    const ordersSnapshot = await ordersQuery.get();
    const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch invoices
    let invoicesQuery = this.db.collection('invoices')
      .where('date', '>=', start.toISOString().split('T')[0])
      .where('date', '<=', end.toISOString().split('T')[0]);
      
    const invoicesSnapshot = await invoicesQuery.get();
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch customers
    const customersSnapshot = await this.db.collection('customer_data').get();
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch sales transactions if needed
    let transactions = [];
    try {
      const transactionsSnapshot = await this.db.collection('sales_transactions')
        .where('date', '>=', start.toISOString().split('T')[0])
        .where('date', '<=', end.toISOString().split('T')[0])
        .get();
      transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('Sales transactions collection not available:', error.message);
    }

    // Fetch users for agent information
    const usersSnapshot = await this.db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { orders, invoices, customers, transactions, users };
  }

  /**
   * Apply filters to the data
   */
  applyFilters(data, filters) {
    let { orders, invoices, customers, transactions, users } = data;

    // Exclude marketplace orders if specified
    if (filters.excludeMarketplace) {
      orders = orders.filter(order => !this.isMarketplaceOrder(order));
    }

    // Filter by brands
    if (filters.brands && filters.brands.length > 0) {
      orders = orders.filter(order => 
        order.line_items?.some(item => 
          filters.brands.includes(item.brand?.toLowerCase())
        )
      );
    }

    // Filter by agents
    if (filters.agents && filters.agents.length > 0) {
      orders = orders.filter(order => 
        filters.agents.includes(order.salesperson_uid)
      );
    }

    // Filter by invoice status
    if (filters.invoiceStatus && filters.invoiceStatus.length > 0) {
      invoices = invoices.filter(invoice => 
        filters.invoiceStatus.includes(invoice.status)
      );
      
      // Filter orders that have invoices with these statuses
      const invoiceOrderIds = invoices.map(inv => inv.salesorder_id);
      orders = orders.filter(order => invoiceOrderIds.includes(order.id));
    }

    // Filter by shipping status
    if (filters.shippingStatus && filters.shippingStatus.length > 0) {
      orders = orders.filter(order => 
        filters.shippingStatus.includes(order.shipped_status)
      );
    }

    // Filter by customer segments
    if (filters.customerSegments && filters.customerSegments.length > 0) {
      const filteredCustomerIds = customers
        .filter(customer => filters.customerSegments.includes(customer.segment))
        .map(customer => customer.firebase_uid);
      
      orders = orders.filter(order => 
        filteredCustomerIds.includes(order.customer_id)
      );
    }

    // Filter by regions
    if (filters.regions && filters.regions.length > 0) {
      const agentsInRegions = users.filter(user => 
        user.region && filters.regions.some(region => 
          user.region.includes(region)
        )
      ).map(user => user.uid);
      
      orders = orders.filter(order => 
        agentsInRegions.includes(order.salesperson_uid)
      );
    }

    return { orders, invoices, customers, transactions, users };
  }

  /**
   * Generate Agent/Brand performance report
   */
  async generateAgentBrandReport(data, config) {
    const { orders, users } = data;
    const agentBrandPerformance = new Map();

    orders.forEach(order => {
      const agent = users.find(u => u.uid === order.salesperson_uid);
      const agentName = agent?.name || 'Unknown Agent';
      
      order.line_items?.forEach(item => {
        const brand = item.brand || 'Unknown Brand';
        const key = `${agentName}|${brand}`;
        
        if (!agentBrandPerformance.has(key)) {
          agentBrandPerformance.set(key, {
            agentName,
            brand,
            revenue: 0,
            orders: 0,
            quantity: 0
          });
        }
        
        const performance = agentBrandPerformance.get(key);
        performance.revenue += item.item_total || (item.quantity * item.rate) || 0;
        performance.orders += 1;
        performance.quantity += item.quantity || 0;
      });
    });

    return {
      agentBrandPerformance: Array.from(agentBrandPerformance.values())
        .sort((a, b) => b.revenue - a.revenue),
      summary: this.generateSummary(orders, 'agent_brand')
    };
  }

  /**
   * Generate Agent performance report
   */
  async generateAgentReport(data, config) {
    const { orders, users } = data;
    const agentPerformance = new Map();

    orders.forEach(order => {
      const agent = users.find(u => u.uid === order.salesperson_uid);
      const agentName = agent?.name || 'Unknown Agent';
      
      if (!agentPerformance.has(order.salesperson_uid)) {
        agentPerformance.set(order.salesperson_uid, {
          agentName,
          agentId: order.salesperson_uid,
          revenue: 0,
          orders: 0,
          customers: new Set(),
          averageOrderValue: 0
        });
      }
      
      const performance = agentPerformance.get(order.salesperson_uid);
      performance.revenue += order.total || 0;
      performance.orders += 1;
      performance.customers.add(order.customer_id);
    });

    // Calculate averages
    agentPerformance.forEach(performance => {
      performance.averageOrderValue = performance.revenue / performance.orders;
      performance.customers = performance.customers.size;
    });

    return {
      agentPerformance: Array.from(agentPerformance.values())
        .sort((a, b) => b.revenue - a.revenue),
      summary: this.generateSummary(orders, 'agent')
    };
  }

  /**
   * Generate Brand performance report
   */
  async generateBrandReport(data, config) {
    const { orders } = data;
    const brandPerformance = new Map();

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const brand = item.brand || 'Unknown Brand';
        
        if (!brandPerformance.has(brand)) {
          brandPerformance.set(brand, {
            brandName: brand,
            revenue: 0,
            orders: 0,
            quantity: 0,
            customers: new Set()
          });
        }
        
        const performance = brandPerformance.get(brand);
        performance.revenue += item.item_total || (item.quantity * item.rate) || 0;
        performance.orders += 1;
        performance.quantity += item.quantity || 0;
        performance.customers.add(order.customer_id);
      });
    });

    // Convert customers set to count
    brandPerformance.forEach(performance => {
      performance.customers = performance.customers.size;
    });

    return {
      brandPerformance: Array.from(brandPerformance.values())
        .sort((a, b) => b.revenue - a.revenue),
      summary: this.generateSummary(orders, 'brand')
    };
  }

  /**
   * Generate Customer performance report
   */
  async generateCustomerReport(data, config) {
    const { orders, customers } = data;
    const customerPerformance = new Map();

    orders.forEach(order => {
      if (!customerPerformance.has(order.customer_id)) {
        const customer = customers.find(c => c.firebase_uid === order.customer_id);
        customerPerformance.set(order.customer_id, {
          customerId: order.customer_id,
          customerName: customer?.zoho_data?.company_name || customer?.zoho_data?.customer_name || order.customer_name,
          revenue: 0,
          orders: 0,
          averageOrderValue: 0,
          lastOrderDate: order.date
        });
      }
      
      const performance = customerPerformance.get(order.customer_id);
      performance.revenue += order.total || 0;
      performance.orders += 1;
      
      // Update last order date if this order is more recent
      if (new Date(order.date) > new Date(performance.lastOrderDate)) {
        performance.lastOrderDate = order.date;
      }
    });

    // Calculate averages
    customerPerformance.forEach(performance => {
      performance.averageOrderValue = performance.revenue / performance.orders;
    });

    return {
      customerPerformance: Array.from(customerPerformance.values())
        .sort((a, b) => b.revenue - a.revenue),
      summary: this.generateSummary(orders, 'customer')
    };
  }

  /**
   * Generate Region performance report
   */
  async generateRegionReport(data, config) {
    const { orders, users } = data;
    const regionPerformance = new Map();

    orders.forEach(order => {
      const agent = users.find(u => u.uid === order.salesperson_uid);
      const regions = agent?.region || ['Unknown Region'];
      
      regions.forEach(region => {
        if (!regionPerformance.has(region)) {
          regionPerformance.set(region, {
            regionName: region,
            revenue: 0,
            orders: 0,
            agents: new Set(),
            customers: new Set()
          });
        }
        
        const performance = regionPerformance.get(region);
        performance.revenue += order.total || 0;
        performance.orders += 1;
        performance.agents.add(order.salesperson_uid);
        performance.customers.add(order.customer_id);
      });
    });

    // Convert sets to counts
    regionPerformance.forEach(performance => {
      performance.agents = performance.agents.size;
      performance.customers = performance.customers.size;
    });

    return {
      regionPerformance: Array.from(regionPerformance.values())
        .sort((a, b) => b.revenue - a.revenue),
      summary: this.generateSummary(orders, 'region')
    };
  }

  /**
   * Generate Popular Items by Brand report
   */
  async generatePopularItemsByBrandReport(data, config) {
    const { orders } = data;
    const brandItems = new Map();

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const brand = item.brand || 'Unknown Brand';
        const itemKey = `${brand}|${item.item_name || item.name}`;
        
        if (!brandItems.has(itemKey)) {
          brandItems.set(itemKey, {
            brand,
            itemName: item.item_name || item.name,
            quantity: 0,
            revenue: 0,
            orders: 0
          });
        }
        
        const itemData = brandItems.get(itemKey);
        itemData.quantity += item.quantity || 0;
        itemData.revenue += item.item_total || (item.quantity * item.rate) || 0;
        itemData.orders += 1;
      });
    });

    // Group by brand
    const brandItemsGrouped = {};
    brandItems.forEach(item => {
      if (!brandItemsGrouped[item.brand]) {
        brandItemsGrouped[item.brand] = [];
      }
      brandItemsGrouped[item.brand].push(item);
    });

    // Sort items within each brand by quantity
    Object.keys(brandItemsGrouped).forEach(brand => {
      brandItemsGrouped[brand].sort((a, b) => b.quantity - a.quantity);
    });

    return {
      popularItemsByBrand: brandItemsGrouped,
      summary: this.generateSummary(orders, 'popular_items_brand')
    };
  }

  /**
   * Generate Popular Items report
   */
  async generatePopularItemsReport(data, config) {
    const { orders } = data;
    const items = new Map();

    orders.forEach(order => {
      order.line_items?.forEach(item => {
        const itemKey = item.item_name || item.name || 'Unknown Item';
        
        if (!items.has(itemKey)) {
          items.set(itemKey, {
            itemName: itemKey,
            quantity: 0,
            revenue: 0,
            orders: 0,
            brands: new Set()
          });
        }
        
        const itemData = items.get(itemKey);
        itemData.quantity += item.quantity || 0;
        itemData.revenue += item.item_total || (item.quantity * item.rate) || 0;
        itemData.orders += 1;
        itemData.brands.add(item.brand || 'Unknown Brand');
      });
    });

    // Convert brands set to array
    items.forEach(item => {
      item.brands = Array.from(item.brands);
    });

    return {
      popularItems: Array.from(items.values())
        .sort((a, b) => b.quantity - a.quantity),
      summary: this.generateSummary(orders, 'popular_items')
    };
  }

  /**
   * Generate summary statistics for a report
   */
  generateSummary(orders, reportType) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      reportType
    };
  }

  /**
   * Check if an order is from a marketplace
   */
  isMarketplaceOrder(order) {
    return order.customer_name === 'Amazon UK - Customer' || 
           order.is_marketplace_order === true ||
           order.marketplace_source;
  }

  /**
   * Get applied filters for metadata
   */
  getAppliedFilters(filters) {
    const applied = [];
    
    if (filters.excludeMarketplace) applied.push('Exclude Marketplace Orders');
    if (filters.brands?.length) applied.push(`Brands: ${filters.brands.join(', ')}`);
    if (filters.agents?.length) applied.push(`Agents: ${filters.agents.length} selected`);
    if (filters.customerSegments?.length) applied.push(`Customer Segments: ${filters.customerSegments.join(', ')}`);
    if (filters.invoiceStatus?.length) applied.push(`Invoice Status: ${filters.invoiceStatus.join(', ')}`);
    if (filters.shippingStatus?.length) applied.push(`Shipping Status: ${filters.shippingStatus.join(', ')}`);
    if (filters.regions?.length) applied.push(`Regions: ${filters.regions.join(', ')}`);
    
    return applied;
  }

  /**
   * Get date range from config
   */
  getDateRange(dateRange, customDateRange) {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      
      case '7_days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      
      case '30_days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
        break;
      
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), currentQuarter * 3, 1);
        end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
        break;
      
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      
      case 'custom':
        start = new Date(customDateRange.start);
        end = new Date(customDateRange.end);
        end.setHours(23, 59, 59, 999);
        break;
      
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = now;
    }

    return { start, end };
  }

  /**
   * Get filter options for dropdowns
   */
  async getFilterOptions(userContext) {
    try {
      // Get brands from orders
      const ordersSnapshot = await this.db.collection('salesorders').limit(1000).get();
      const brandSet = new Set();
      
      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        order.line_items?.forEach(item => {
          if (item.brand) {
            brandSet.add(item.brand);
          }
        });
      });

      const brands = Array.from(brandSet).map(brand => ({
        id: brand.toLowerCase(),
        name: brand
      }));

      // Get agents from users collection
      const usersSnapshot = await this.db.collection('users')
        .where('role', '==', 'salesAgent')
        .get();
      
      const agents = usersSnapshot.docs.map(doc => {
        const user = doc.data();
        return {
          id: doc.id,
          name: user.name || user.email
        };
      });

      // Get regions from users
      const regionSet = new Set();
      usersSnapshot.docs.forEach(doc => {
        const user = doc.data();
        if (user.region && Array.isArray(user.region)) {
          user.region.forEach(r => regionSet.add(r));
        }
      });

      const regions = Array.from(regionSet).map(region => ({
        id: region,
        name: region
      }));

      return {
        brands,
        agents,
        regions
      };

    } catch (error) {
      console.error('Error getting filter options:', error);
      return {
        brands: [],
        agents: [],
        regions: []
      };
    }
  }

  /**
   * Save report configuration
   */
  async saveReportConfig(config, userContext) {
    const reportDoc = {
      ...config,
      id: config.id || this.db.collection('report_configs').doc().id,
      userId: userContext.userId,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.db.collection('report_configs').doc(reportDoc.id).set(reportDoc);
    
    return reportDoc;
  }

  /**
   * Get saved reports for a user
   */
  async getSavedReports(userId) {
    const snapshot = await this.db.collection('report_configs')
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      config: doc.data(),
      savedAt: doc.data().savedAt,
      userId: doc.data().userId
    }));
  }

  /**
   * Delete a report configuration
   */
  async deleteReportConfig(reportId, userId) {
    const reportDoc = await this.db.collection('report_configs').doc(reportId).get();
    
    if (!reportDoc.exists) {
      throw new Error('Report configuration not found');
    }
    
    if (reportDoc.data().userId !== userId) {
      throw new Error('Unauthorized to delete this report configuration');
    }

    await this.db.collection('report_configs').doc(reportId).delete();
  }

  /**
   * Get report template based on user role
   */
  getReportTemplate(role) {
    const baseTemplate = {
      sections: {
        overview: true,
        sales: true,
        orders: true,
        customers: false,
        invoices: false
      },
      filters: {
        excludeMarketplace: false
      },
      charts: {
        includeCharts: true,
        chartTypes: ['revenue', 'orders']
      },
      exportTheme: 'dashboard'
    };

    if (role === 'brandManager') {
      baseTemplate.sections.brands = true;
      baseTemplate.sections.agents = true;
    }

    return baseTemplate;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Test Firestore connection
      await this.db.collection('users').limit(1).get();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          firestore: 'connected'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default new ReportGeneratorService();