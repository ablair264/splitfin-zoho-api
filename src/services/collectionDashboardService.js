// server/src/services/collectionDashboardService.js
import admin from 'firebase-admin';

class CollectionDashboardService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Helper: Calculate date range
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
   * Main dashboard data retrieval
   */
  async getDashboardData(userId, dateRange = '30_days', customDateRange = null) {
    const startTime = Date.now();
    try {
      // Get user context
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (!userDoc.exists) throw new Error(`User ${userId} not found`);
      const userData = userDoc.data();
      const isAgent = userData.role === 'salesAgent';
      const agentId = userId;
      const zohospID = userData.zohospID;

      // Date range
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Fetch data
      let dashboardData;
      if (isAgent) {
        dashboardData = await this.getAgentDashboard(agentId, zohospID, startISO, endISO, dateRange);
      } else {
        dashboardData = await this.getManagerDashboard(startISO, endISO, dateRange);
      }

      const loadTime = Date.now() - startTime;
      return {
        ...dashboardData,
        role: userData.role,
        dateRange,
        loadTime,
        dataSource: 'firestore-collections',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Dashboard error:', error.message);
      throw error;
    }
  }

  /**
   * Manager dashboard: aggregates for all customers/orders/agents
   */
  async getManagerDashboard(startISO, endISO, dateRange) {
    // Fetch all customers
    const customersSnapshot = await this.db.collection('customers').get();
    // Fetch all sales orders in range
    const ordersSnapshot = await this.db.collection('sales_orders')
      .where('date', '>=', startISO.split('T')[0])
      .where('date', '<=', endISO.split('T')[0])
      .orderBy('date', 'desc')
      .get();
    // Fetch all invoices in range
    const invoicesSnapshot = await this.db.collection('invoices')
      .where('date', '>=', startISO.split('T')[0])
      .where('date', '<=', endISO.split('T')[0])
      .get();
    // Fetch all items
    const itemsSnapshot = await this.db.collection('items_data').get();
    // Fetch all agents
    const agentsSnapshot = await this.db.collection('sales_agents').get();

    // Build item map for brand lookups
    const itemMap = new Map();
    itemsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      itemMap.set(doc.id, {
        ...data,
        brand: data.brand_normalized || data.brand || 'Unknown',
      });
    });

    // Build customer map for quick lookup
    const customerMap = new Map();
    customersSnapshot.docs.forEach(doc => {
      customerMap.set(doc.id, { ...doc.data(), id: doc.id });
    });

    // Process orders and fetch line items
    const orders = [];
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      // Fetch line items subcollection
      const lineItemsSnapshot = await this.db.collection('sales_orders')
        .doc(orderDoc.id)
        .collection('order_line_items')
        .get();
      const lineItems = [];
      for (const itemDoc of lineItemsSnapshot.docs) {
        const itemData = itemDoc.data();
        const itemDetails = itemMap.get(itemData.item_id) || {};
        lineItems.push({
          ...itemData,
          brand: itemDetails.brand || 'Unknown',
          item_name: itemDetails.name || itemData.name,
        });
      }
      orders.push({
        ...orderData,
        id: orderDoc.id,
        line_items: lineItems,
      });
    }

    // Process invoices
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Process agents
    const agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Aggregate period metrics for customers
    const customerPeriodMetrics = {};
    orders.forEach(order => {
      const cid = order.customer_id;
      if (!customerPeriodMetrics[cid]) {
        customerPeriodMetrics[cid] = { total_spent: 0, order_count: 0, last_order_date: null };
      }
      customerPeriodMetrics[cid].total_spent += order.total || 0;
      customerPeriodMetrics[cid].order_count += 1;
      if (!customerPeriodMetrics[cid].last_order_date || new Date(order.date) > new Date(customerPeriodMetrics[cid].last_order_date)) {
        customerPeriodMetrics[cid].last_order_date = order.date;
      }
    });

    // Build customers array with both lifetime and period metrics
    const customers = customersSnapshot.docs.map(doc => {
      const data = doc.data();
      const period = customerPeriodMetrics[data.customer_id] || { total_spent: 0, order_count: 0, last_order_date: null };
      return {
        ...data,
        id: doc.id,
        period_metrics: period,
        lifetime_metrics: data.metrics || {},
      };
    });

    // Aggregate brand performance
    const brandMap = new Map();
    orders.forEach(order => {
      order.line_items.forEach(item => {
        const brand = item.brand || 'Unknown';
        if (!brandMap.has(brand)) {
          brandMap.set(brand, { name: brand, revenue: 0, quantity: 0, orderCount: 0 });
        }
        const brandData = brandMap.get(brand);
        brandData.revenue += item.total || 0;
        brandData.quantity += item.quantity || 0;
        brandData.orderCount += 1;
      });
    });
    const brands = Array.from(brandMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Aggregate top items
    const itemAggMap = new Map();
    orders.forEach(order => {
      order.line_items.forEach(item => {
        if (!itemAggMap.has(item.item_id)) {
          itemAggMap.set(item.item_id, { id: item.item_id, name: item.item_name, quantity: 0, revenue: 0, brand: item.brand });
        }
        const agg = itemAggMap.get(item.item_id);
        agg.quantity += item.quantity || 0;
        agg.revenue += item.total || 0;
      });
    });
    const topItems = Array.from(itemAggMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Aggregate agent performance (using daily_aggregates)
    const agentPerformance = [];
    for (const agent of agents) {
      // Fetch daily aggregates for this agent in the period
      const dailyAggsSnapshot = await this.db.collection('sales_agents').doc(agent.id).collection('daily_aggregates')
        .where('date', '>=', startISO.split('T')[0])
        .where('date', '<=', endISO.split('T')[0])
        .get();
      let totalRevenue = 0, totalOrders = 0, uniqueCustomers = new Set();
      dailyAggsSnapshot.docs.forEach(doc => {
        const agg = doc.data();
        totalRevenue += agg.totalRevenue || 0;
        totalOrders += agg.totalOrders || 0;
        if (agg.customers && typeof agg.customers === 'object') {
          Object.keys(agg.customers).forEach(cid => uniqueCustomers.add(cid));
        }
      });
      agentPerformance.push({
        agentId: agent.id,
        agentName: agent.agentName || agent.name,
        totalRevenue,
        totalOrders,
        uniqueCustomers: uniqueCustomers.size,
      });
    }

    // Aggregate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const outstandingInvoices = Array.isArray(invoices) ? invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + (inv.balance || 0), 0) : 0;

    // Build dashboard response
    return {
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        outstandingInvoices,
        totalCustomers: customers.length,
        marketplaceOrders: Array.isArray(orders) ? orders.filter(o => o.is_marketplace_order).length : 0,
      },
      customers,
      orders,
      invoices,
      brands,
      topItems,
      agentPerformance,
    };
  }

  /**
   * Agent dashboard: aggregates for agent's customers/orders
   */
  async getAgentDashboard(agentId, zohospID, startISO, endISO, dateRange) {
    // Method 1: Try using daily aggregates first (faster approach)
    try {
      const dailyAggsSnapshot = await this.db.collection('sales_agents')
        .doc(agentId)
        .collection('daily_aggregates')
        .where('date', '>=', startISO.split('T')[0])
        .where('date', '<=', endISO.split('T')[0])
        .get();

      // Collect all orderIds from daily aggregates
      const allOrderIds = [];
      let totalRevenue = 0;
      let totalOrders = 0;
      let commission = 0;
      const customerMap = new Map();
      const itemMap = new Map();

      dailyAggsSnapshot.docs.forEach(doc => {
        const agg = doc.data();
        // Safely add orderIds only if they exist and are non-empty
        if (agg.orderIds && Array.isArray(agg.orderIds) && agg.orderIds.length > 0) {
          allOrderIds.push(...agg.orderIds);
        }
        totalRevenue += agg.totalRevenue || 0;
        totalOrders += agg.totalOrders || 0;
        commission += agg.commission || 0;
        
        // Aggregate customers
        if (agg.customers && typeof agg.customers === 'object') {
          Object.entries(agg.customers).forEach(([customerId, customerData]) => {
            if (!customerMap.has(customerId)) {
              customerMap.set(customerId, { 
                customer_id: customerId,
                total_spent: 0,
                order_count: 0,
                ...customerData
              });
            }
            const existing = customerMap.get(customerId);
            existing.total_spent += (customerData.revenue || customerData.total_spent || 0);
            existing.order_count += (customerData.orders || customerData.order_count || 1);
          });
        }

        // Aggregate items
        if (agg.topItems && Array.isArray(agg.topItems)) {
          agg.topItems.forEach(item => {
            if (!itemMap.has(item.id || item.item_id)) {
              itemMap.set(item.id || item.item_id, {
                id: item.id || item.item_id,
                name: item.name || item.item_name,
                quantity: 0,
                revenue: 0,
                brand: item.brand || 'Unknown'
              });
            }
            const existing = itemMap.get(item.id || item.item_id);
            existing.quantity += item.quantity || 0;
            existing.revenue += item.revenue || item.total || 0;
          });
        }
      });

      // Fetch full order details only if we have orderIds
      let orders = [];
      if (allOrderIds.length > 0) {
        // Remove duplicates
        const uniqueOrderIds = [...new Set(allOrderIds)];
        
        // Fetch orders in chunks due to Firestore 'in' query limit
        const chunkSize = 10;
        for (let i = 0; i < uniqueOrderIds.length; i += chunkSize) {
          const chunk = uniqueOrderIds.slice(i, i + chunkSize);
          const ordersSnapshot = await this.db.collection('sales_orders')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();
          
          for (const orderDoc of ordersSnapshot.docs) {
            const orderData = orderDoc.data();
            // Fetch line items subcollection
            const lineItemsSnapshot = await this.db.collection('sales_orders')
              .doc(orderDoc.id)
              .collection('order_line_items')
              .get();
            const lineItems = [];
            for (const itemDoc of lineItemsSnapshot.docs) {
              const itemData = itemDoc.data();
              // Try to get item details from our aggregated data first
              const aggregatedItem = itemMap.get(itemData.item_id);
              lineItems.push({
                ...itemData,
                brand: aggregatedItem?.brand || itemData.brand || 'Unknown',
                item_name: aggregatedItem?.name || itemData.name || itemData.item_name,
              });
            }
            orders.push({
              ...orderData,
              id: orderDoc.id,
              line_items: lineItems,
            });
          }
        }
      }

      // Fetch agent's assigned customers
      const assignedCustomersSnapshot = await this.db.collection('sales_agents')
        .doc(agentId)
        .collection('assigned_customers')
        .get();
      const assignedCustomerIds = assignedCustomersSnapshot.docs.map(doc => doc.data().customer_id);

      // Fetch customer details
      let customers = [];
      if (assignedCustomerIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < assignedCustomerIds.length; i += chunkSize) {
          const chunk = assignedCustomerIds.slice(i, i + chunkSize);
          const customersSnapshot = await this.db.collection('customers')
            .where('customer_id', 'in', chunk)
            .get();
          
          customersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const aggregatedData = customerMap.get(data.customer_id) || {};
            customers.push({
              ...data,
              id: doc.id,
              period_metrics: {
                total_spent: aggregatedData.total_spent || 0,
                order_count: aggregatedData.order_count || 0,
                last_order_date: null // Would need to track this in aggregates
              },
              lifetime_metrics: data.metrics || {},
            });
          });
        }
      }

      // Fetch invoices for agent's customers
      let invoices = [];
      if (assignedCustomerIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < assignedCustomerIds.length; i += chunkSize) {
          const chunk = assignedCustomerIds.slice(i, i + chunkSize);
          const invoicesSnapshot = await this.db.collection('invoices')
            .where('customer_id', 'in', chunk)
            .where('date', '>=', startISO.split('T')[0])
            .where('date', '<=', endISO.split('T')[0])
            .get();
          invoices = invoices.concat(invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }

      // Convert aggregated items to array and sort by revenue
      const topItems = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
      
      // Calculate outstanding invoices
      const outstandingInvoices = invoices
        .filter(inv => inv.status !== 'paid')
        .reduce((sum, inv) => sum + (inv.balance || 0), 0);

      // Build agent-specific response
      return {
        metrics: {
          totalRevenue,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          outstandingInvoices,
          totalCustomers: customers.length,
          marketplaceOrders: orders.filter(o => o.is_marketplace_order).length,
        },
        customers,
        orders,
        invoices: {
          invoices: invoices,
          total_outstanding: outstandingInvoices,
          total_overdue: invoices
            .filter(inv => inv.status !== 'paid' && new Date(inv.due_date) < new Date())
            .reduce((sum, inv) => sum + (inv.balance || 0), 0)
        },
        performance: {
          top_customers: Array.from(customerMap.values())
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 10),
          top_items: topItems.slice(0, 10)
        },
        commission,
        topItems,
      };

    } catch (error) {
      console.warn('Failed to use daily aggregates, falling back to direct queries:', error.message);
      
      // Method 2: Fallback to the original approach
      // Fetch assigned customers
      const assignedCustomersSnapshot = await this.db.collection('sales_agents').doc(agentId).collection('assigned_customers').get();
      const assignedCustomerIds = assignedCustomersSnapshot.docs.map(doc => doc.data().customer_id);
      
      // Fetch customers
      let customers = [];
      if (assignedCustomerIds.length > 0) {
        const customersSnapshot = await this.db.collection('customers')
          .where('customer_id', 'in', assignedCustomerIds)
          .get();
        customers = customersSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          period_metrics: { total_spent: 0, order_count: 0, last_order_date: null },
          lifetime_metrics: doc.data().metrics || {},
        }));
      }
      
      // Fetch agent's orders in range
      const customersOrdersSnapshot = await this.db.collection('sales_agents')
        .doc(agentId)
        .collection('customers_orders')
        .get();
      const orderIds = customersOrdersSnapshot.docs.map(doc => doc.data().sales_order_id);
      
      // Fetch sales orders in range
      let orders = [];
      if (orderIds.length > 0) {
        const chunkSize = 10; // Firestore 'in' queries limit
        for (let i = 0; i < orderIds.length; i += chunkSize) {
          const chunk = orderIds.slice(i, i + chunkSize);
          const ordersSnapshot = await this.db.collection('sales_orders')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .where('date', '>=', startISO.split('T')[0])
            .where('date', '<=', endISO.split('T')[0])
            .get();
          for (const orderDoc of ordersSnapshot.docs) {
            const orderData = orderDoc.data();
            // Fetch line items subcollection
            const lineItemsSnapshot = await this.db.collection('sales_orders')
              .doc(orderDoc.id)
              .collection('order_line_items')
              .get();
            const lineItems = [];
            for (const itemDoc of lineItemsSnapshot.docs) {
              const itemData = itemDoc.data();
              // Fetch item details from items_data
              const itemRef = this.db.collection('items_data').doc(itemData.item_id);
              const itemSnap = await itemRef.get();
              const itemDetails = itemSnap.exists ? itemSnap.data() : {};
              lineItems.push({
                ...itemData,
                brand: itemDetails.brand_normalized || itemDetails.brand || 'Unknown',
                item_name: itemDetails.name || itemData.name,
              });
            }
            orders.push({
              ...orderData,
              id: orderDoc.id,
              line_items: lineItems,
            });
          }
        }
      }
      
      // Fetch invoices for agent's customers in range
      let invoices = [];
      if (assignedCustomerIds.length > 0) {
        const chunkSize = 10;
        for (let i = 0; i < assignedCustomerIds.length; i += chunkSize) {
          const chunk = assignedCustomerIds.slice(i, i + chunkSize);
          const invoicesSnapshot = await this.db.collection('invoices')
            .where('customer_id', 'in', chunk)
            .where('date', '>=', startISO.split('T')[0])
            .where('date', '<=', endISO.split('T')[0])
            .get();
          invoices = invoices.concat(invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
      
      // Aggregate period metrics for customers
      const customerPeriodMetrics = {};
      orders.forEach(order => {
        const cid = order.customer_id;
        if (!customerPeriodMetrics[cid]) {
          customerPeriodMetrics[cid] = { total_spent: 0, order_count: 0, last_order_date: null };
        }
        customerPeriodMetrics[cid].total_spent += order.total || 0;
        customerPeriodMetrics[cid].order_count += 1;
        if (!customerPeriodMetrics[cid].last_order_date || new Date(order.date) > new Date(customerPeriodMetrics[cid].last_order_date)) {
          customerPeriodMetrics[cid].last_order_date = order.date;
        }
      });
      
      // Update customers with period metrics
      customers = customers.map(customer => {
        const period = customerPeriodMetrics[customer.customer_id] || { total_spent: 0, order_count: 0, last_order_date: null };
        return {
          ...customer,
          period_metrics: period,
        };
      });
      
      // Aggregate top items
      const itemAggMap = new Map();
      orders.forEach(order => {
        order.line_items.forEach(item => {
          if (!itemAggMap.has(item.item_id)) {
            itemAggMap.set(item.item_id, { id: item.item_id, name: item.item_name, quantity: 0, revenue: 0, brand: item.brand });
          }
          const agg = itemAggMap.get(item.item_id);
          agg.quantity += item.quantity || 0;
          agg.revenue += item.total || 0;
        });
      });
      const topItems = Array.from(itemAggMap.values()).sort((a, b) => b.revenue - a.revenue);
      
      // Aggregate metrics
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const outstandingInvoices = Array.isArray(invoices) ? invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + (inv.balance || 0), 0) : 0;
      
      // Build dashboard response
      return {
        metrics: {
          totalRevenue,
          totalOrders,
          averageOrderValue,
          outstandingInvoices,
          totalCustomers: customers.length,
          marketplaceOrders: Array.isArray(orders) ? orders.filter(o => o.is_marketplace_order).length : 0,
        },
        customers,
        orders,
        invoices,
        topItems,
      };
    }
  }
}

export default new CollectionDashboardService();