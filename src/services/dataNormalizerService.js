// server/src/services/dataNormalizationService.js
// This service normalizes raw data from Zoho into simplified Firebase collections

import admin from 'firebase-admin';
import geocodingService from './geocodingService.js';
import zohoInventoryService from './zohoInventoryService.js';

class DataNormalizerService {
  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Helper to clean undefined values from objects
   */
  cleanObject(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip undefined, null, empty strings
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const cleanedNested = this.cleanObject(value);
        // Only include if the nested object has properties
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } 
      // Handle arrays
      else if (Array.isArray(value)) {
        // Filter out null/undefined from arrays and clean objects within
        const cleanedArray = value
          .filter(item => item !== null && item !== undefined)
          .map(item => {
            if (typeof item === 'object' && !(item instanceof Date)) {
              return this.cleanObject(item);
            }
            return item;
          });
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } 
      // Include all other values
      else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Safe getter with default value
   */
  safeGet(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    
    return result === undefined || result === null || result === '' ? defaultValue : result;
  }

  /**
   * Safe string - returns empty string if null/undefined
   */
  safeString(value, defaultValue = '') {
    if (value === null || value === undefined) return defaultValue;
    return String(value).trim();
  }

  /**
   * Safe number - returns 0 if not a valid number
   */
  safeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Safe integer - returns 0 if not a valid integer
   */
  safeInt(value, defaultValue = 0) {
    const num = parseInt(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Safe array - ensures value is always an array
   */
  safeArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  /**
   * Safe date - returns null if invalid date
   */
  safeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
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
    const productsSnapshot = await this.db.collection('products').get();
    
    // Create user lookup maps
    const usersByZohoId = new Map();
    usersSnapshot.forEach(doc => {
      const user = { id: doc.id, ...doc.data() };
      if (user.zohospID) {
        usersByZohoId.set(user.zohospID, user);
      }
    });
    
    // Create products lookup map by item_id
    const productsById = new Map();
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      const itemId = this.safeString(product.item_id || doc.id);
      if (itemId) {
        productsById.set(itemId, product);
      }
    });
    
    // Create sales transaction lookup by order_id
    const transactionsByOrderId = new Map();
    salesTransSnapshot.forEach(doc => {
      const trans = doc.data();
      const orderId = this.safeString(trans.order_id);
      if (orderId) {
        if (!transactionsByOrderId.has(orderId)) {
          transactionsByOrderId.set(orderId, []);
        }
        transactionsByOrderId.get(orderId).push(trans);
      }
    });
    
    let batch = this.db.batch();
    let count = 0;
    let marketplaceCount = 0;
    
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      const orderId = this.safeString(order.salesorder_id);
      
      if (!orderId) {
        console.log('⚠️ Skipping order with no ID');
        continue;
      }
      
      // Get line items from sales_transactions matching this order
      const lineItems = transactionsByOrderId.get(orderId) || [];
      
      // Safe field access
      const salespersonId = this.safeString(order.salesperson_id || this.safeGet(lineItems[0], 'salesperson_id'));
      const salespersonName = this.safeString(order.salesperson_name || this.safeGet(lineItems[0], 'salesperson_name'));
      const customerName = this.safeString(order.customer_name);
      const companyName = this.safeString(order.company_name || customerName);
      
      // Check marketplace
      const isMarketplaceOrder = companyName === 'Amazon UK - Customer' || 
                                 customerName === 'Amazon UK - Customer';
      
      if (isMarketplaceOrder) {
        marketplaceCount++;
      }
      
      // Map salesperson to UID
      let salespersonUid = null;
      if (!isMarketplaceOrder && salespersonId && usersByZohoId.has(salespersonId)) {
        salespersonUid = usersByZohoId.get(salespersonId).id;
      }
      
      // Process line items with safe access
      const normalizedLineItems = lineItems.map(item => {
        const itemId = this.safeString(item.item_id);
        const product = itemId ? productsById.get(itemId) : null;
        const quantity = this.safeInt(item.quantity);
        const price = this.safeNumber(item.price || item.rate);
        const lineTotal = this.safeNumber(item.total || item.item_total) || (price * quantity);
        
        return this.cleanObject({
          item_id: itemId,
          item_name: this.safeString(item.item_name || item.name),
          sku: this.safeString(item.sku || product?.sku),
          brand: this.safeString(product?.brand_normalized || product?.brand || 'Unknown'),
          quantity: quantity,
          price: price,
          total: lineTotal
        });
      });
      
      // Calculate total safely
      const orderTotal = this.safeNumber(order.total);
      const totalAmount = orderTotal || normalizedLineItems.reduce((sum, item) => sum + item.total, 0);
      
      // Create normalized order with all safe fields
      const normalizedOrder = {
        // Core fields
        order_id: orderId,
        order_number: this.safeString(order.salesorder_number),
        company_name: companyName,
        customer_id: this.safeString(order.customer_id),
        customer_name: customerName,
        
        // Dates - only include if valid
        created_time: this.safeDate(order.date || order.created_time),
        delivery_date: this.safeDate(order.delivery_date),
        
        // Order details with defaults
        order_status: this.safeString(order.status || order.order_status || 'pending'),
        paid_status: this.safeString(order.payment_status || 'unpaid'),
        delivery_method: this.safeString(order.delivery_method || order.shipping_method),
        
        // Salesperson info
        salesperson_id: isMarketplaceOrder ? null : salespersonId,
        salesperson_name: isMarketplaceOrder ? 'Marketplace' : salespersonName,
        salesperson_uid: isMarketplaceOrder ? null : salespersonUid,
        
        // Marketplace flag
        is_marketplace_order: isMarketplaceOrder,
        marketplace_source: isMarketplaceOrder ? 'Amazon' : null,
        
        // Financial with safe numbers
        total_amount: totalAmount,
        total_invoiced_amount: this.safeNumber(order.invoiced_amount),
        balance: this.safeNumber(order.balance),
        
        // Line items
        line_items: normalizedLineItems,
        
        // Metadata
        _source: 'zoho_inventory',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: orderId
      };
      
      // Clean the entire object before saving
      const cleanedOrder = this.cleanObject(normalizedOrder);
      
      const docRef = this.db.collection('normalized_orders').doc(orderId);
      batch.set(docRef, cleanedOrder, { merge: true });
      count++;
      
      // Commit batch every 400 documents
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`  Committed ${count} orders...`);
        batch = this.db.batch();
      }
    }
    
    // Commit remaining
    if (count % 400 !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Normalized ${count} orders (including ${marketplaceCount} marketplace orders)`);
    
      const orderIds = [];
  for (const doc of ordersSnapshot.docs) {
    const orderId = this.safeString(doc.data().salesorder_id);
    if (orderId) {
      orderIds.push(orderId);
    }
  }
  
    if (orderIds.length > 0) {
    console.log('🔄 Enriching normalized orders with line items...');
    await this.enrichNormalizedOrdersWithLineItems(orderIds);
  }
    
    // Log brand distribution for verification
    const brandCounts = new Map();
    for (const doc of ordersSnapshot.docs) {
      const orderId = this.safeString(doc.data().salesorder_id);
      if (orderId) {
        const lineItems = transactionsByOrderId.get(orderId) || [];
        lineItems.forEach(item => {
          const itemId = this.safeString(item.item_id);
          const product = itemId ? productsById.get(itemId) : null;
          const brand = this.safeString(product?.brand_normalized || product?.brand || 'Unknown');
          brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
        });
      }
    }
    console.log('📊 Brand distribution:', Object.fromEntries(brandCounts));
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
    const agentId = this.safeString(user.agentID);
    if (agentId) {
      usersByAgentId.set(agentId, user);
    }
  });
  
  // Calculate customer metrics from normalized orders
  const customerMetrics = new Map();
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    const customerId = this.safeString(order.customer_id);
    
    if (!customerId) return;
    
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
    metrics.total_spent += this.safeNumber(order.total_amount);
    metrics.order_count += 1;
    
    const orderDateStr = this.safeString(order.created_time);
    if (orderDateStr) {
      const orderDate = new Date(orderDateStr);
      if (!isNaN(orderDate.getTime())) {
        if (!metrics.last_order_date || orderDate > metrics.last_order_date) {
          metrics.last_order_date = orderDate;
        }
        if (!metrics.first_order_date || orderDate < metrics.first_order_date) {
          metrics.first_order_date = orderDate;
        }
      }
    }
    
    const salespersonUid = this.safeString(order.salesperson_uid);
    if (salespersonUid) {
      metrics.agents.add(salespersonUid);
    }
  });
  
  let batch = this.db.batch();
  let count = 0;
  let geocodedCount = 0;
  
  for (const doc of customersSnapshot.docs) {
    const customer = doc.data();
    const customerId = this.safeString(customer.customer_id || doc.id);
    
    if (!customerId) {
      console.log('⚠️ Skipping customer with no ID');
      continue;
    }
    
    const metrics = customerMetrics.get(customerId) || {
      total_spent: 0,
      order_count: 0,
      last_order_date: null,
      first_order_date: null,
      agents: new Set()
    };
    
    // Safe agent lookup
    const agentId = this.safeGet(customer, 'Agent.id');
    let assignedAgentUid = null;
    if (agentId && usersByAgentId.has(agentId)) {
      assignedAgentUid = usersByAgentId.get(agentId).id;
    }
    
    // Determine customer segment
    let segment = 'Low';
    if (metrics.total_spent >= 10000) segment = 'VIP';
    else if (metrics.total_spent >= 5000) segment = 'High';
    else if (metrics.total_spent >= 1000) segment = 'Medium';
    
    // Build customer name with safe access
    const customerName = this.safeString(
  customer.name ||                    // Add lowercase check
  customer.customer_name ||           // Add field from Python script
  customer.company_name ||            // Add field from Python script
  `${this.safeString(customer.Primary_First_Name)} ${this.safeString(customer.Primary_Last_Name)}`.trim() ||
  'Unknown Customer'
);
    
    // Extract postcode
    const postcode = this.safeString(customer.Billing_Code || customer.postcode || customer.postal_code);
    
    const normalizedCustomer = {
      // Core fields
      customer_id: customerId,
      customer_name: customerName,
      company_name: this.safeString(customer.company_name || customer.Account_Name || customerName),
      
      // Contact info with safe defaults
      email: this.safeString(customer.Primary_Email || customer.email || customer.Email),
      phone: this.safeString(customer.Phone || customer.phone),
      primary_contact: `${this.safeString(customer.Primary_First_Name)} ${this.safeString(customer.Primary_Last_Name)}`.trim(),
      
      // Address with safe access
      city: this.safeString(customer.Billing_City),
      postcode: postcode,
      county: this.safeString(customer.Billing_State),
      address: this.safeString(customer.Billing_Street),
      
      // Metrics
      total_spent: metrics.total_spent,
      order_count: metrics.order_count,
      average_order_value: metrics.order_count > 0 ? metrics.total_spent / metrics.order_count : 0,
      
      // Dates
      first_order_date: metrics.first_order_date?.toISOString() || null,
      last_order_date: metrics.last_order_date?.toISOString() || null,
      created_date: this.safeDate(customer.created_time || customer.Created_Time),
      
      // Segmentation
      segment: segment,
      status: this.safeString(customer.status || 'active'),
      
      // Agent assignment with UID
      assigned_agent_id: agentId,
      assigned_agent_name: this.safeGet(customer, 'Agent.name'),
      assigned_agent_uid: assignedAgentUid,
      all_agent_uids: Array.from(metrics.agents),
      
      // Metadata
      _source: 'zoho_crm',
      _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
      _original_id: customerId
    };
    
    // Geocode the customer if they have a postcode
    if (postcode) {
      try {
        const locationData = await geocodingService.getCoordinatesFromPostcode(postcode);
        if (locationData) {
          normalizedCustomer.coordinates = {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          };
          normalizedCustomer.location_region = geocodingService.determineUKRegion(locationData);
          normalizedCustomer.location_country = locationData.country;
          normalizedCustomer.location_district = locationData.admin_district;
          normalizedCustomer.location_updated = new Date().toISOString();
          geocodedCount++;
        } else {
          normalizedCustomer.location_region = 'Unknown';
        }
      } catch (error) {
        console.log(`⚠️ Could not geocode postcode ${postcode} for customer ${customerName}`);
        normalizedCustomer.location_region = 'Unknown';
      }
    } else {
      normalizedCustomer.location_region = 'Unknown';
    }
    
    // Clean and save
    const cleanedCustomer = this.cleanObject(normalizedCustomer);
    
    if (Object.keys(cleanedCustomer).length > 3) { // Must have more than just metadata
      const docRef = this.db.collection('normalized_customers').doc(customerId);
      batch.set(docRef, cleanedCustomer, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`  Committed ${count} customers (${geocodedCount} geocoded)...`);
        batch = this.db.batch();
        
        // Add a small delay to respect geocoding API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      console.log(`⚠️ Skipping customer ${customerId} - insufficient data`);
    }
  }
  
  // Commit remaining
  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Normalized ${count} customers (${geocodedCount} successfully geocoded)`);
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
      const itemId = this.safeString(trans.item_id);
      
      if (!itemId) return;
      
      if (!productMetrics.has(itemId)) {
        productMetrics.set(itemId, {
          total_sold: 0,
          revenue: 0,
          order_count: new Set()
        });
      }
      
      const metrics = productMetrics.get(itemId);
      metrics.total_sold += this.safeInt(trans.quantity);
      metrics.revenue += this.safeNumber(trans.total);
      
      const orderId = this.safeString(trans.order_id);
      if (orderId) {
        metrics.order_count.add(orderId);
      }
    });
    
    let batch = this.db.batch();
    let count = 0;
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      const productId = this.safeString(product.item_id || doc.id);
      
      if (!productId) {
        console.log('⚠️ Skipping product with no ID');
        continue;
      }
      
      const metrics = productMetrics.get(productId) || {
        total_sold: 0,
        revenue: 0,
        order_count: new Set()
      };
      
      const normalizedProduct = {
        // Core fields
        product_id: productId,
        product_name: this.safeString(product.name || product.item_name || 'Unknown Product'),
        sku: this.safeString(product.sku),
        
        // Brand info
        brand: this.safeString(product.brand || product.brand_normalized || 'Unknown'),
        brand_normalized: this.safeString(product.brand_normalized || product.brand || 'Unknown'),
        
        // Pricing
        price: this.safeNumber(product.rate || product.price),
        cost: this.safeNumber(product.purchase_rate),
        
        // Inventory
        stock_on_hand: this.safeInt(product.stock_on_hand),
        available_stock: this.safeInt(product.available_for_sale_stock),
        
        // Sales metrics
        total_sold: metrics.total_sold,
        total_revenue: metrics.revenue,
        order_count: metrics.order_count.size,
        
        // Status
        status: this.safeString(product.status || 'active'),
        is_active: this.safeString(product.status) === 'active',
        
        // Metadata
        _source: 'zoho_inventory',
        _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
        _original_id: productId
      };
      
      const cleanedProduct = this.cleanObject(normalizedProduct);
      
      if (Object.keys(cleanedProduct).length > 3) { // Must have more than just metadata
        const docRef = this.db.collection('normalized_products').doc(productId);
        batch.set(docRef, cleanedProduct, { merge: true });
        count++;
        
        if (count % 400 === 0) {
          await batch.commit();
          console.log(`  Committed ${count} products...`);
          batch = this.db.batch();
        }
      } else {
        console.log(`⚠️ Skipping product ${productId} - insufficient data`);
      }
    }
    
    // Commit remaining
    if (count % 400 !== 0) {
      await batch.commit();
    }
    console.log(`✅ Normalized ${count} products`);
  }

  /**
   * Normalize purchase orders collection
   */
  async normalizePurchaseOrders() {
  console.log('📋 Normalizing purchase orders...');
  
  const poSnapshot = await this.db.collection('purchase_orders').get();
  
  let batch = this.db.batch();
  let count = 0;
  
  for (const doc of poSnapshot.docs) {
    const po = doc.data();
    const poId = this.safeString(po.purchaseorder_id || doc.id);
    
    if (!poId) {
      console.log('⚠️ Skipping purchase order with no ID');
      continue;
    }
    
    // Process line items with safe access
    const lineItems = this.safeArray(po.line_items);
    const normalizedLineItems = lineItems.map(item => {
      const quantity = this.safeInt(item.quantity);
      const rate = this.safeNumber(item.rate);
      const total = this.safeNumber(item.item_total || item.total) || (quantity * rate);
      
      return this.cleanObject({
        item_id: this.safeString(item.item_id),
        item_name: this.safeString(item.name || item.item_name),
        sku: this.safeString(item.sku),
        description: this.safeString(item.description),
        quantity: quantity,
        rate: rate,
        total: total,
        // Add any other fields from line items
        unit: this.safeString(item.unit),
        tax_percentage: this.safeNumber(item.tax_percentage)
      });
    });
    
    // Calculate total safely
    const poTotal = this.safeNumber(po.total);
    const totalAmount = poTotal || normalizedLineItems.reduce((sum, item) => sum + item.total, 0);
    
    const normalizedPO = {
      // Core fields
      purchase_order_id: poId,
      purchase_order_number: this.safeString(po.purchaseorder_number),
      
      // Vendor info
      vendor_id: this.safeString(po.vendor_id),
      vendor_name: this.safeString(po.vendor_name || 'Unknown Vendor'),
      
      // Dates
      order_date: this.safeDate(po.date || po.purchaseorder_date),
      expected_delivery_date: this.safeDate(po.delivery_date),
      
      // Status
      order_status: this.safeString(po.order_status || po.status || 'pending'),
      
      // Financial
      total_amount: totalAmount,
      tax_total: this.safeNumber(po.tax_total),
      sub_total: this.safeNumber(po.sub_total),
      
      // Line items - this is the key part!
      line_items: normalizedLineItems,
      line_items_count: normalizedLineItems.length,
      
      // Additional fields
      notes: this.safeString(po.notes),
      terms: this.safeString(po.terms),
      
      // Metadata
      _source: 'zoho_inventory',
      _normalized_at: admin.firestore.FieldValue.serverTimestamp(),
      _original_id: poId
    };
    
    const cleanedPO = this.cleanObject(normalizedPO);
    
    if (Object.keys(cleanedPO).length > 3) { // Must have more than just metadata
      const docRef = this.db.collection('normalized_purchase_orders').doc(poId);
      batch.set(docRef, cleanedPO, { merge: true });
      count++;
      
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`  Committed ${count} purchase orders...`);
        batch = this.db.batch();
      }
    } else {
      console.log(`⚠️ Skipping purchase order ${poId} - insufficient data`);
    }
  }
  
  // Commit remaining
  if (count % 400 !== 0) {
    await batch.commit();
  }
  console.log(`✅ Normalized ${count} purchase orders with line items`);
}
  
  /**
   * Normalize dashboard data for consistent frontend consumption
   */
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
 * Enrich normalized orders with complete line items from sales_transactions
 * @param {Array<string>} orderIds - Optional array of specific order IDs to process
 */
async enrichNormalizedOrdersWithLineItems(orderIds = null) {
  console.log('🔄 Enriching normalized orders with line items from Firebase...');
  
  try {
    if (orderIds && orderIds.length > 0) {
      let totalEnriched = 0;
      
      // Process in smaller batches for better performance
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
        const batch = orderIds.slice(i, i + BATCH_SIZE);
        const enriched = await this._enrichOrderBatchFromFirebase(batch);
        totalEnriched += enriched;
      }
      
      console.log(`✅ Enriched ${totalEnriched} orders with line items from Firebase`);
      return { success: true, count: totalEnriched };
    } else {
      return await this._enrichAllOrdersFromFirebase();
    }
    
  } catch (error) {
    console.error('❌ Error enriching orders:', error);
    throw error;
  }
}

async _enrichOrderBatchFromFirebase(orderIds) {
  let batch = this.db.batch();
  let count = 0;
  let successCount = 0;
  
  for (const orderId of orderIds) {
    try {
      // Query the orders collection to find matching salesorder_id
      const ordersSnapshot = await this.db.collection('orders')
        .where('salesorder_id', '==', orderId)
        .limit(1)
        .get();
      
      if (ordersSnapshot.empty) {
        console.log(`⚠️ Order ${orderId} not found in orders collection`);
        continue;
      }
      
      const orderDoc = ordersSnapshot.docs[0];
      const orderData = orderDoc.data();
      
      // Extract and transform line items with field mappings
      const lineItems = await Promise.all(
        this.safeArray(orderData.line_items).map(async (item) => {
          // Get brand_normalized from normalized_products collection
          let brandNormalized = null;
          
          if (item.sku) {
            const productSnapshot = await this.db.collection('normalized_products')
              .where('sku', '==', item.sku)
              .limit(1)
              .get();
            
            if (!productSnapshot.empty) {
              brandNormalized = productSnapshot.docs[0].data().brand_normalized || null;
            }
          }
          
          return this.cleanObject({
            item_id: this.safeString(item.item_id),
            item_name: this.safeString(item.description), // description -> item_name
            sku: this.safeString(item.sku),
            description: this.safeString(item.description),
            quantity: this.safeInt(item.quantity),
            price: this.safeNumber(item.rate), // rate -> price
            total: this.safeNumber(item.total),
            tax_percentage: this.safeNumber(item.tax_percentage),
            discount: this.safeNumber(item.discount),
            brand: this.safeString(item.brand || item.cf_brand),
            brand_normalized: brandNormalized
          });
        })
      );
      
      // Update the normalized_orders document
      const docRef = this.db.collection('normalized_orders').doc(orderId);
      batch.update(docRef, {
        line_items: lineItems,
        total_amount: this.safeNumber(orderData.total),
        total_invoiced_amount: this.safeNumber(orderData.invoiced_amount || 0),
        sub_total: this.safeNumber(orderData.sub_total),
        tax_total: this.safeNumber(orderData.tax_total),
        discount_total: this.safeNumber(orderData.discount),
        line_items_enriched: true,
        line_items_enriched_at: admin.firestore.FieldValue.serverTimestamp(),
        enriched_from: 'firebase'
      });
      
      count++;
      successCount++;
      
      // Commit batch every 50 updates
      if (count % 50 === 0) {
        await batch.commit();
        console.log(`  Enriched ${count} orders...`);
        batch = this.db.batch();
      }
      
    } catch (error) {
      console.error(`❌ Error enriching order ${orderId}:`, error);
    }
  }
  
  // Commit any remaining updates
  if (count % 50 !== 0) {
    await batch.commit();
  }
  
  return successCount;
}

async _enrichAllOrdersFromFirebase() {
  console.log('📋 Enriching all orders from Firebase...');
  
  try {
    // Get all normalized orders that need enrichment
    const normalizedOrdersSnapshot = await this.db.collection('normalized_orders')
      .where('line_items_enriched', '!=', true)
      .get();
    
    const orderIds = normalizedOrdersSnapshot.docs.map(doc => doc.id);
    
    if (orderIds.length === 0) {
      console.log('✅ All orders already enriched');
      return { success: true, count: 0 };
    }
    
    console.log(`Found ${orderIds.length} orders to enrich`);
    
    // Process in batches
    let totalEnriched = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      const batch = orderIds.slice(i, i + BATCH_SIZE);
      const enriched = await this._enrichOrderBatchFromFirebase(batch);
      totalEnriched += enriched;
    }
    
    console.log(`✅ Enriched ${totalEnriched} orders with line items from Firebase`);
    return { success: true, count: totalEnriched };
    
  } catch (error) {
    console.error('❌ Error enriching all orders:', error);
    throw error;
  }
}

// Helper method to optimize SKU lookups if processing many orders
async _buildSkuToBrandMap() {
  console.log('🔍 Building SKU to brand mapping...');
  const skuMap = new Map();
  
  const productsSnapshot = await this.db.collection('normalized_products')
    .select('sku', 'brand_normalized')
    .get();
  
  productsSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.sku && data.brand_normalized) {
      skuMap.set(data.sku, data.brand_normalized);
    }
  });
  
  console.log(`✅ Built mapping for ${skuMap.size} SKUs`);
  return skuMap;
}

/**
 * Get products map for enrichment
 */
async _getProductsMap(productIds) {
  const productsMap = new Map();
  
  if (!productIds || productIds.length === 0) {
    return productsMap;
  }
  
  // Query in batches of 10 (Firestore 'in' query limit)
  for (let i = 0; i < productIds.length; i += 10) {
    const batch = productIds.slice(i, i + 10);
    
    const productsSnapshot = await this.db.collection('products')
      .where('item_id', 'in', batch)
      .get();
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      productsMap.set(product.item_id, product);
    });
  }
  
  return productsMap;
}

/**
 * One-time migration to enrich all existing normalized orders
 */
async runInitialLineItemsEnrichment() {
  console.log('🚀 Starting initial line items enrichment for all orders...');
  
  try {
    const result = await this.enrichNormalizedOrdersWithLineItems();
    console.log('✅ Initial enrichment completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Initial enrichment failed:', error);
    throw error;
  }
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