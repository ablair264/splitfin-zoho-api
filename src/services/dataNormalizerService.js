// server/src/services/dataNormalizationService.js
// This service normalizes raw data from Zoho into simplified Firebase collections

import admin from 'firebase-admin';

class DataNormalizerService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Main normalization process - to be called after CRON jobs fetch data
   */
  async normalizeAllData() {
    console.log('🔄 Starting data normalization process...');
    
    try {
      // Process in order of dependencies
      await this.normalizeOrders();
      await this.normalizeCustomers();
      await this.normalizeProducts();
      await this.normalizePurchaseOrders();
      
      // Update normalization timestamp
      await this.db.collection('sync_metadata').doc('normalization').set({
        lastNormalized: admin.firestore.FieldValue.serverTimestamp(),
        status: 'completed',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Data normalization completed successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Data normalization failed:', error);
      throw error;
    }
  }

  /**
   * Normalize orders collection with proper user UID mapping
   */
  async normalizeOrders() {
    console.log('📦 Normalizing orders...');
    
    const ordersSnapshot = await this.db.collection('orders').get();
    const salesTransSnapshot = await this.db.collection('sales_transactions').get();
    const usersSnapshot = await this.db.collection('users').get();
    
    // Create user lookup maps
    const usersByZohoId = new Map();
    usersSnapshot.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      if (user.zohospID) {
        usersByZohoId.set(user.zohospID, user);
      }
    });
    
    // Create sales transaction lookup by order_id
    const transactionsByOrderId = new Map();
    salesTransSnapshot.forEach(doc => {
      const trans = doc.data();
      if (!transactionsByOrderId.has(trans.order_id)) {
        transactionsByOrderId.set(trans.order_id, []);
      }
      transactionsByOrderId.get(trans.order_id).push(trans);
    });
    
    const batch = this.db.batch();
    let count = 0;
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const orderId = order.salesorder_id;
      
      // Get line items from sales_transactions
      const lineItems = transactionsByOrderId.get(orderId) || [];
      
      // Get salesperson_id from transactions if not in order
      let salespersonId = order.salesperson_id;
      let salespersonUid = null;
      
      if (!salespersonId && lineItems.length > 0) {
        salespersonId = lineItems[0].salesperson_id;
      }
      
      // Map salesperson_id to Firebase UID
      if (salespersonId && usersByZohoId.has(salespersonId)) {
        salespersonUid = usersByZohoId.get(salespersonId).id;
      }
      
      // Calculate total if not present
      let totalAmount = parseFloat(order.total) || 0;
      if (totalAmount === 0 && lineItems.length > 0) {
        totalAmount = lineItems.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
      }
      
      // Create normalized order
      const normalizedOrder = {
        // Core fields
        order_id: orderId,
        order_number: order.salesorder_number,
        company_name: order.company_name || order.customer_name,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        
        // Dates
        created_time: order.date || order.created_time,
        delivery_date: order.delivery_date,
        
        // Order details
        order_status: order.status || order.order_status,
        paid_status: order.payment_status || 'unpaid',
        delivery_method: order.delivery_method || order.shipping_method,
        
        // Salesperson info with UID
        salesperson_id: salespersonId,
        salesperson_name: order.salesperson_name,
        salesperson_uid: salespersonUid, // Firebase UID for easy filtering
        
        // Financial
        total_amount: totalAmount,
        total_invoiced_amount: parseFloat(order.invoiced_amount) || 0,
        balance: parseFloat(order.balance) || 0,
        
        // Line items with brand info
        line_items: lineItems.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          sku: item.sku,
          brand: item.brand || 'Unknown',
          quantity: parseInt(item.quantity) || 0,
          price: parseFloat(item.price) || 0,
          total: parseFloat(item.total) || 0
        })),
        
        // Metadata
        _source: 'zoho_inventory',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: orderId
      };
      
      const docRef = this.db.collection('normalized_orders').doc(orderId);
      batch.set(docRef, normalizedOrder, { merge: true });
      count++;
      
      // Commit batch every 400 documents
      if (count % 400 === 0) {
        batch.commit();
        console.log(`  Committed ${count} orders...`);
      }
    });
    
    // Commit remaining
    await batch.commit();
    console.log(`✅ Normalized ${count} orders`);
  }

  /**
   * Normalize customers collection
   */
  async normalizeCustomers() {
    console.log('👥 Normalizing customers...');
    
    const customersSnapshot = await this.db.collection('customers').get();
    const ordersSnapshot = await this.db.collection('normalized_orders').get();
    const usersSnapshot = await this.db.collection('users').get();
    
    // Create agent lookup maps
    const usersByAgentId = new Map();
    usersSnapshot.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      if (user.agentID) {
        usersByAgentId.set(user.agentID, user);
      }
    });
    
    // Calculate customer metrics from normalized orders
    const customerMetrics = new Map();
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const customerId = order.customer_id;
      
      if (!customerMetrics.has(customerId)) {
        customerMetrics.set(customerId, {
          total_spent: 0,
          order_count: 0,
          last_order_date: null,
          first_order_date: null,
          agents: new Set()
        });
      }
      
      const metrics = customerMetrics.get(customerId);
      metrics.total_spent += order.total_amount || 0;
      metrics.order_count += 1;
      
      const orderDate = new Date(order.created_time);
      if (!metrics.last_order_date || orderDate > metrics.last_order_date) {
        metrics.last_order_date = orderDate;
      }
      if (!metrics.first_order_date || orderDate < metrics.first_order_date) {
        metrics.first_order_date = orderDate;
      }
      
      if (order.salesperson_uid) {
        metrics.agents.add(order.salesperson_uid);
      }
    });
    
    const batch = this.db.batch();
    let count = 0;
    
    customersSnapshot.forEach(doc => {
      const customer = doc.data();
      const customerId = customer.customer_id || doc.id;
      const metrics = customerMetrics.get(customerId) || {
        total_spent: 0,
        order_count: 0,
        last_order_date: null,
        first_order_date: null,
        agents: new Set()
      };
      
      // Get assigned agent UID
      let assignedAgentUid = null;
      if (customer.Agent?.id && usersByAgentId.has(customer.Agent.id)) {
        assignedAgentUid = usersByAgentId.get(customer.Agent.id).id;
      }
      
      // Determine customer segment
      let segment = 'Low';
      if (metrics.total_spent >= 10000) segment = 'VIP';
      else if (metrics.total_spent >= 5000) segment = 'High';
      else if (metrics.total_spent >= 1000) segment = 'Medium';
      
      const normalizedCustomer = {
        // Core fields
        customer_id: customerId,
        customer_name: customer.Account_Name || customer.name || 'Unknown',
        company_name: customer.company_name || customer.Account_Name,
        
        // Contact info
        email: customer.email || customer.Email || '',
        phone: customer.phone || customer.Phone || '',
        
        // Metrics
        total_spent: metrics.total_spent,
        order_count: metrics.order_count,
        average_order_value: metrics.order_count > 0 ? metrics.total_spent / metrics.order_count : 0,
        
        // Dates
        first_order_date: metrics.first_order_date?.toISOString() || null,
        last_order_date: metrics.last_order_date?.toISOString() || null,
        created_date: customer.created_time || customer.Created_Time,
        
        // Segmentation
        segment: segment,
        status: customer.status || 'active',
        
        // Agent assignment with UID
        assigned_agent_id: customer.Agent?.id || null,
        assigned_agent_name: customer.Agent?.name || null,
        assigned_agent_uid: assignedAgentUid,
        all_agent_uids: Array.from(metrics.agents), // All agents who have sold to this customer
        
        // Metadata
        _source: 'zoho_crm',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: customerId
      };
      
      const docRef = this.db.collection('normalized_customers').doc(customerId);
      batch.set(docRef, normalizedCustomer, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        batch.commit();
        console.log(`  Committed ${count} customers...`);
      }
    });
    
    await batch.commit();
    console.log(`✅ Normalized ${count} customers`);
  }

  /**
   * Normalize products collection
   */
  async normalizeProducts() {
    console.log('📦 Normalizing products...');
    
    const productsSnapshot = await this.db.collection('products').get();
    const transactionsSnapshot = await this.db.collection('sales_transactions').get();
    
    // Calculate product metrics from transactions
    const productMetrics = new Map();
    transactionsSnapshot.forEach(doc => {
      const trans = doc.data();
      const itemId = trans.item_id;
      
      if (!productMetrics.has(itemId)) {
        productMetrics.set(itemId, {
          total_sold: 0,
          revenue: 0,
          order_count: new Set()
        });
      }
      
      const metrics = productMetrics.get(itemId);
      metrics.total_sold += parseInt(trans.quantity) || 0;
      metrics.revenue += parseFloat(trans.total) || 0;
      metrics.order_count.add(trans.order_id);
    });
    
    const batch = this.db.batch();
    let count = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const productId = product.item_id || doc.id;
      const metrics = productMetrics.get(productId) || {
        total_sold: 0,
        revenue: 0,
        order_count: new Set()
      };
      
      const normalizedProduct = {
        // Core fields
        product_id: productId,
        product_name: product.name || product.item_name,
        sku: product.sku || '',
        
        // Brand info
        brand: product.brand || product.brand_normalized || 'Unknown',
        brand_normalized: product.brand_normalized || product.brand || 'Unknown',
        
        // Pricing
        price: parseFloat(product.rate) || parseFloat(product.price) || 0,
        cost: parseFloat(product.purchase_rate) || 0,
        
        // Inventory
        stock_on_hand: parseInt(product.stock_on_hand) || 0,
        available_stock: parseInt(product.available_for_sale_stock) || 0,
        
        // Sales metrics
        total_sold: metrics.total_sold,
        total_revenue: metrics.revenue,
        order_count: metrics.order_count.size,
        
        // Status
        status: product.status || 'active',
        is_active: product.status === 'active',
        
        // Metadata
        _source: 'zoho_inventory',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: productId
      };
      
      const docRef = this.db.collection('normalized_products').doc(productId);
      batch.set(docRef, normalizedProduct, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        batch.commit();
        console.log(`  Committed ${count} products...`);
      }
    });
    
    await batch.commit();
    console.log(`✅ Normalized ${count} products`);
  }

  /**
   * Normalize purchase orders collection
   */
  async normalizePurchaseOrders() {
    console.log('📋 Normalizing purchase orders...');
    
    const poSnapshot = await this.db.collection('purchase_orders').get();
    
    const batch = this.db.batch();
    let count = 0;
    
    poSnapshot.forEach(doc => {
      const po = doc.data();
      const poId = po.purchaseorder_id || doc.id;
      
      const normalizedPO = {
        // Core fields
        purchase_order_id: poId,
        purchase_order_number: po.purchaseorder_number,
        
        // Vendor info
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        
        // Dates
        order_date: po.date || po.purchaseorder_date,
        expected_delivery_date: po.delivery_date,
        
        // Status
        order_status: po.order_status || po.status,
        
        // Financial
        total_amount: parseFloat(po.total) || 0,
        
        // Line items
        line_items: (po.line_items || []).map(item => ({
          item_id: item.item_id,
          item_name: item.name,
          quantity: parseInt(item.quantity) || 0,
          rate: parseFloat(item.rate) || 0,
          total: parseFloat(item.item_total || item.total) || 0
        })),
        
        // Metadata
        _source: 'zoho_inventory',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: poId
      };
      
      const docRef = this.db.collection('normalized_purchase_orders').doc(poId);
      batch.set(docRef, normalizedPO, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        batch.commit();
        console.log(`  Committed ${count} purchase orders...`);
      }
    });
    
    await batch.commit();
    console.log(`✅ Normalized ${count} purchase orders`);
  }
  
  normalizeDashboardData(dashboardData, userId) {
  // If data is already in the correct format, just return it
  if (!dashboardData) return null;
  
  // Ensure all required fields exist
  return {
    ...dashboardData,
    metrics: dashboardData.metrics || {
      revenue: 0,
      orders: 0,
      customers: 0,
      agents: 0,
      brands: 0
    },
    orders: dashboardData.orders || [],
    invoices: dashboardData.invoices || {
      all: [],
      outstanding: [],
      overdue: [],
      paid: [],
      dueToday: [],
      dueIn30Days: [],
      summary: {}
    },
    performance: dashboardData.performance || {
      brands: [],
      topItems: [],
      trends: []
    },
    commission: dashboardData.commission || null,
    agentPerformance: dashboardData.agentPerformance || null,
    role: dashboardData.role,
    userId: userId,
    dateRange: dashboardData.dateRange,
    dataSource: dashboardData.dataSource || 'normalized-collections',
    lastUpdated: dashboardData.lastUpdated || new Date().toISOString()
  };
}

  /**
   * Get normalization status
   */
  async getNormalizationStatus() {
    try {
      const [orders, customers, products, purchaseOrders, metadata] = await Promise.all([
        this.db.collection('normalized_orders').count().get(),
        this.db.collection('normalized_customers').count().get(),
        this.db.collection('normalized_products').count().get(),
        this.db.collection('normalized_purchase_orders').count().get(),
        this.db.collection('sync_metadata').doc('normalization').get()
      ]);
      
      return {
        counts: {
          orders: orders.data().count,
          customers: customers.data().count,
          products: products.data().count,
          purchaseOrders: purchaseOrders.data().count
        },
        lastNormalized: metadata.exists ? metadata.data().lastNormalized : null,
        status: metadata.exists ? metadata.data().status : 'never_run'
      };
    } catch (error) {
      console.error('Error getting normalization status:', error);
      throw error;
    }
  }
}

export default new DataNormalizerService();