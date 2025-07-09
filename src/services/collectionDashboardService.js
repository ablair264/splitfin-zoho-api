// src/services/collectionDashboardService.js
import admin from 'firebase-admin';

class CollectionDashboardService {
  constructor() {
    this.db = admin.firestore();
    // Method bindings...
    this.getManagerDashboard = this.getManagerDashboard.bind(this);
    this.getAgentDashboard = this.getAgentDashboard.bind(this);
    this.getDashboardData = this.getDashboardData.bind(this);
  }

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
        if (customDateRange && customDateRange.start && customDateRange.end) {
          startDate = new Date(customDateRange.start);
          endDate = new Date(customDateRange.end);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days if custom is not set
          endDate = now;
        }
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    return { startDate, endDate };
  }
  
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();
    try {
      console.log(`📊 Fetching dashboard data for user ${userId}, range: ${dateRange}`);
      const userDocRef = this.db.collection('users').doc(userId);
      const brandManagerDocRef = this.db.collection('brand_managers').doc(userId);
      
      let userDoc = await userDocRef.get();
      let userData;

      if (userDoc.exists) {
        userData = userDoc.data();
      } else {
        // Fallback to check brand_managers collection if not in users
        const brandManagerDoc = await brandManagerDocRef.get();
        if (brandManagerDoc.exists) {
            userData = brandManagerDoc.data();
        } else {
            throw new Error(`User ${userId} not found in 'users' or 'brand_managers' collections.`);
        }
      }
      
      const isAgent = userData.role === 'salesAgent';
      const isManager = userData.role === 'brandManager';
      const userUid = userId;
      const zohospID = userData.zohospID || userData.sa_id;
      
      console.log(`👤 User: ${userData.name || userData.email} (${userData.role}), UID: ${userUid}`);
      
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      let dashboardData;
      if (isAgent) {
        dashboardData = await this.getAgentDashboard(userUid, zohospID, startISO, endISO, dateRange);
      } else if (isManager) {
        dashboardData = await this.getManagerDashboard(startISO, endISO, dateRange);
      } else {
        throw new Error(`Unsupported user role: ${userData.role}`);
      }
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Dashboard for ${userData.role} loaded in ${loadTime}ms`);
      
      return {
        ...dashboardData,
        userId: userUid,
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'firestore-collections',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Dashboard error:', error.message, error.stack);
      throw error;
    }
  }

  async getManagerDashboard(startISO, endISO, dateRange) {
    console.log(`🔍 Building manager dashboard for range: ${startISO} to ${endISO}`);
    
    const [ordersSnapshot, customersSnapshot, invoicesSnapshot, agentsSnapshot, itemsSnapshot] = await Promise.all([
      this.db.collection('sales_orders').where('order_date', '>=', new Date(startISO)).where('order_date', '<=', new Date(endISO)).orderBy('order_date', 'desc').get(),
      this.db.collection('customers').get(),
      this.db.collection('invoices').where('date', '>=', startISO.split('T')[0]).where('date', '<=', endISO.split('T')[0]).get(),
      this.db.collection('sales_agents').get(),
      this.db.collection('items_data').get()
    ]);

    const itemMap = new Map();
    itemsSnapshot.docs.forEach(doc => {
      const item = doc.data();
      itemMap.set(item.item_id, {
        brand: item.brand_name || 'Unknown',
        name: item.item_name || 'Unknown Item',
        sku: item.sku
      });
    });

    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      const lineItems = (data.line_items || []).map((item) => {
          const itemDetails = itemMap.get(item.item_id) || { brand: 'Unknown', name: 'Unknown Item' };
          return { ...item, ...itemDetails };
      });
      return {
        id: doc.id,
        order_number: data.sales_order_number,
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        salesperson_id: data.salesperson_id,
        salesperson_name: data.salesperson_name,
        date: data.order_date.toDate().toISOString(),
        total: parseFloat(data.total || 0),
        status: data.status,
        line_items: lineItems,
        is_marketplace_order: !!data.is_marketplace_order,
        marketplace_source: data.marketplace_source || null,
      };
    });

    const customers = customersSnapshot.docs.map(doc => {
        const data = doc.data();
        const metrics = data.metrics || {};
        return {
            id: doc.id,
            customer_id: data.customer_id,
            name: data.customer_name || data.company_name,
            total_spent: metrics.total_spent || 0,
            order_count: metrics.order_count || 0,
            segment: data.enrichment?.segment || 'Low',
            status: data.status
        };
    });

    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const invoiceCategories = this.categorizeInvoices(invoices, new Date());
    const brandPerformance = this.calculateBrandPerformanceFromOrders(orders);
    const topItems = this.calculateTopItemsFromOrders(orders);
    const agentPerformance = this.calculateAgentPerformance(orders, agents);

    const metrics = {
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      totalCustomers: customers.length,
      outstandingInvoices: invoiceCategories.outstanding.reduce((sum, inv) => sum + (parseFloat(inv.balance) || 0), 0),
      marketplaceOrders: orders.filter(o => o.is_marketplace_order).length,
    };

    return {
      metrics,
      orders,
      invoices: invoiceCategories,
      performance: {
        brands: brandPerformance,
        top_customers: customers.sort((a, b) => b.total_spent - a.total_spent).slice(0, 10),
        top_items: topItems,
      },
      agentPerformance,
      commission: null,
    };
  }
  
  // getAgentDashboard implementation would go here, similar logic but filtered by agent...

  // Helper methods like categorizeInvoices, calculate... etc.
  categorizeInvoices(invoices, today) {
    const categorized = {
      all: [], outstanding: [], overdue: [], paid: [], dueToday: [],
    };
    invoices.forEach(invoice => {
        categorized.all.push(invoice);
        if (invoice.status === 'paid') {
            categorized.paid.push(invoice);
        } else if (invoice.balance > 0) {
            categorized.outstanding.push(invoice);
            const dueDate = new Date(invoice.due_date);
            if (dueDate < today) {
                invoice.days_overdue = Math.floor((today - dueDate) / (1000 * 3600 * 24));
                categorized.overdue.push(invoice);
            } else if (dueDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
                categorized.dueToday.push(invoice);
            }
        }
    });
    return categorized;
  }

  calculateBrandPerformanceFromOrders(orders) {
    const brandMap = new Map();
    orders.forEach(order => {
        order.line_items.forEach(item => {
            const brand = item.brand || 'Unknown';
            if (!brandMap.has(brand)) {
                brandMap.set(brand, { name: brand, revenue: 0, quantity: 0 });
            }
            const brandData = brandMap.get(brand);
            brandData.revenue += item.total || (item.rate * item.quantity);
            brandData.quantity += item.quantity;
        });
    });
    const brands = Array.from(brandMap.values()).sort((a,b) => b.revenue - a.revenue);
    const totalRevenue = brands.reduce((sum, b) => sum + b.revenue, 0);
    return brands.map(b => ({ ...b, market_share: totalRevenue > 0 ? (b.revenue / totalRevenue) * 100 : 0 }));
  }

  calculateTopItemsFromOrders(orders) {
    const itemMap = new Map();
    orders.forEach(order => {
        order.line_items.forEach(item => {
            if (!itemMap.has(item.item_id)) {
                itemMap.set(item.item_id, {
                    id: item.item_id,
                    name: item.item_name,
                    sku: item.sku,
                    quantity: 0,
                    revenue: 0,
                });
            }
            const itemData = itemMap.get(item.item_id);
            itemData.quantity += item.quantity;
            itemData.revenue += item.total || (item.rate * item.quantity);
        });
    });
    return Array.from(itemMap.values()).sort((a,b) => b.revenue - a.revenue);
  }

  calculateAgentPerformance(orders, agents) {
    const agentMap = new Map(agents.map(agent => [agent.sa_id || agent.zohospID, {
        agentId: agent.sa_id || agent.zohospID,
        agentName: agent.name,
        agentUid: agent.uid,
        totalRevenue: 0,
        totalOrders: 0,
        customers: new Set(),
    }]));
    
    orders.forEach(order => {
        if (order.salesperson_id && agentMap.has(order.salesperson_id)) {
            const agentData = agentMap.get(order.salesperson_id);
            agentData.totalRevenue += order.total;
            agentData.totalOrders++;
            agentData.customers.add(order.customer_id);
        }
    });

    const agentsList = Array.from(agentMap.values()).map(agent => ({
        ...agent,
        customers: agent.customers.size,
        averageOrderValue: agent.totalOrders > 0 ? agent.totalRevenue / agent.totalOrders : 0,
    })).sort((a,b) => b.totalRevenue - a.totalRevenue);

    const totalRevenue = agentsList.reduce((sum, a) => sum + a.totalRevenue, 0);

    return {
        agents: agentsList,
        summary: {
            totalAgents: agentsList.length,
            totalRevenue,
            averageRevenue: agentsList.length > 0 ? totalRevenue / agentsList.length : 0,
            topPerformer: agentsList[0] || null,
        }
    };
  }
}

export default new CollectionDashboardService();