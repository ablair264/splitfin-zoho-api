// server/src/scripts/migrateToNewInventorySystem.js
// Migration script to transfer existing Firebase data to new inventory system
// Run with: node src/scripts/migrateToNewInventorySystem.js

import admin from 'firebase-admin';
import '../config/firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

// ============================================================
// MIGRATION CONFIGURATION
// ============================================================

const MIGRATION_CONFIG = {
  // Collection mappings
  collections: {
    // Existing collections
    existingItems: 'items',
    existingCustomers: 'customer_data',
    existingSyncMetadata: 'sync_metadata',
    existingOrders: 'orders',
    existingInvoices: 'invoices',
    
    // New collections to create
    newItems: 'items', // Same name, different structure
    newVendors: 'vendors',
    newItemCategories: 'item_categories',
    newSalesOrders: 'sales_orders',
    newInvoices: 'invoices',
    newPurchaseOrders: 'purchase_orders',
    newWarehouses: 'warehouses',
    newStockTransactions: 'stock_transactions',
    newStockAlerts: 'stock_alerts',
    newShippingMethods: 'shipping_methods',
    newCouriers: 'couriers',
    newVendorContacts: 'vendor_contacts',
    newBranches: 'branches',
    newCustomers: 'customers'
  },
  
  // Migration options
  options: {
    dryRun: false, // Set to true to test without making changes
    batchSize: 100,
    createMissingCollections: true,
    preserveExistingData: true, // Keep existing data alongside new structure
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logLevels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = logLevels.indexOf(MIGRATION_CONFIG.options.logLevel);
  const messageLevel = logLevels.indexOf(level);
  
  if (messageLevel >= currentLevel) {
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function normalizeString(str) {
  if (!str) return '';
  return str.toString().trim().toLowerCase();
}

// ============================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================

/**
 * Transform existing item data to new Item interface with enhanced fields
 */
function transformItemData(existingItem) {
  const now = Timestamp.now();
  
  // Extract vendor name from existing fields
  const vendorName = existingItem.vendor_name || existingItem.brand || existingItem.Manufacturer || 'Unknown Vendor';
  
  // Extract category from existing fields
  const categoryName = existingItem.category || 'Uncategorized';
  
  // Calculate stock values
  const stockTotal = parseInt(existingItem.stock_on_hand || existingItem.available_stock || 0);
  const stockCommitted = parseInt(existingItem.actual_available_stock || 0);
  const stockAvailable = Math.max(0, stockTotal - stockCommitted);
  
  // Extract dimensions from existing data if available
  const dimensions = {
    length: parseFloat(existingItem.length || existingItem.dimensions?.length || null),
    height: parseFloat(existingItem.height || existingItem.dimensions?.height || null),
    width: parseFloat(existingItem.width || existingItem.dimensions?.width || null),
    diameter: parseFloat(existingItem.diameter || null),
    volume: parseFloat(existingItem.volume || null),
    weight: parseFloat(existingItem.weight || existingItem.dimensions?.weight || null),
    dimension_unit: existingItem.dimension_unit || 'cm',
    weight_unit: existingItem.weight_unit || 'kg'
  };
  
  // Extract package information
  const packageInfo = {
    package_length: parseFloat(existingItem.package_length || null),
    package_width: parseFloat(existingItem.package_width || null),
    package_height: parseFloat(existingItem.package_height || null),
    package_weight: parseFloat(existingItem.package_weight || null),
    package_unit: existingItem.package_unit || 'cm',
    package_weight_unit: existingItem.package_weight_unit || 'kg'
  };
  
  // Extract manufacturer information
  const manufacturer = {
    manufacturer_name: existingItem.manufacturer_name || existingItem.Manufacturer || vendorName,
    manufacturer_part_number: existingItem.manufacturer_part_number || existingItem.part_no || '',
    manufacturer_website: existingItem.manufacturer_website || '',
    manufacturer_contact: existingItem.manufacturer_contact || ''
  };
  
  // Transform to new Item structure with enhanced fields
  const newItem = {
    // Core identifiers
    item_id: existingItem.item_id || generateId('ITEM'),
    vendor_name: vendorName,
    item_name: existingItem.name || 'Unknown Item',
    item_description: existingItem.description || '',
    item_imgs: existingItem.imageUrl ? [existingItem.imageUrl] : [],
    stock_total: stockTotal,
    stock_committed: stockCommitted,
    stock_available: stockAvailable,
    category_id: generateId('CAT'),
    category_name: categoryName,
    created_date: existingItem.created_time || now,
    ean: existingItem.ean || '',
    
    // Enhanced dimensions
    dimensions: dimensions,
    package_info: packageInfo,
    manufacturer: manufacturer,
    
    part_no: existingItem.sku || '',
    product_type: existingItem.product_type || 'Goods',
    purchase_price: parseFloat(existingItem.purchase_rate || existingItem.purchase_price || 0),
    retail_price: parseFloat(existingItem.rate || existingItem.retail_price || 0),
    wholesale_price: parseFloat(existingItem.wholesale_price || 0),
    cost_price: parseFloat(existingItem.cost_price || existingItem.purchase_rate || 0),
    reorder_level: parseInt(existingItem.reorder_level || 10),
    reorder_quantity: parseInt(existingItem.reorder_quantity || 1),
    estimated_delivery: parseInt(existingItem.estimated_delivery || 7),
    sku: existingItem.sku || '',
    status: existingItem.status || 'active',
    
    // Enhanced tax structure
    tax: {
      tax_rate: parseFloat(existingItem.tax_rate || 20), // Default UK VAT rate
      tax_exempt: Boolean(existingItem.tax_exempt || false),
      tax_code: existingItem.tax_code || 'VAT20',
      tax_name: existingItem.tax_name || 'VAT'
    },
    
    // Enhanced pricing
    minimum_order_qty: parseInt(existingItem.minimum_order_qty || 1),
    variable_pricing: Boolean(existingItem.variable_pricing || false),
    bulk_pricing: existingItem.bulk_pricing || [],
    
    // Enhanced inventory tracking
    inventory_valuation: {
      method: existingItem.valuation_method || 'FIFO',
      last_cost: parseFloat(existingItem.last_cost || existingItem.purchase_rate || 0),
      average_cost: parseFloat(existingItem.average_cost || 0),
      total_value: parseFloat(existingItem.total_value || 0)
    },
    
    // Enhanced shipping
    shipping: {
      weight: parseFloat(existingItem.shipping_weight || dimensions.weight || 0),
      weight_unit: existingItem.shipping_weight_unit || 'kg',
      requires_special_handling: Boolean(existingItem.requires_special_handling || false),
      is_fragile: Boolean(existingItem.is_fragile || false),
      is_hazardous: Boolean(existingItem.is_hazardous || false),
      shipping_class: existingItem.shipping_class || 'standard'
    },
    
    // Enhanced metadata
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: existingItem._source || 'unknown',
    _original_id: existingItem.id || existingItem.item_id,
    _migration_date: now
  };
  
  return newItem;
}

/**
 * Extract vendors from existing items data with enhanced fields
 */
function extractVendorsFromItems(existingItems) {
  const vendorMap = new Map();
  const now = Timestamp.now();
  
  for (const item of existingItems) {
    const vendorName = item.vendor_name || item.brand || item.Manufacturer;
    
    if (vendorName && !vendorMap.has(vendorName)) {
      const newVendor = {
        vendor_id: generateId('VEND'),
        vendor_name: vendorName,
        vendor_location: item.vendor_location || 'United Kingdom',
        vendor_address: {
          street_1: item.vendor_street_1 || '',
          street_2: item.vendor_street_2 || '',
          city: item.vendor_city || '',
          state: item.vendor_state || '',
          postcode: item.vendor_postcode || '',
          country: item.vendor_country || 'United Kingdom'
        },
        
        // Enhanced vendor contacts
        vendor_contacts: [{
          venc_id: generateId('VENCONT'),
          venc_name: vendorName,
          venc_phone: item.vendor_phone || '',
          venc_email: item.vendor_email || '',
          venc_primary: true,
          venc_comments: '',
          venc_created: now
        }],
        
        vendor_status: 'active',
        vendor_type: item.vendor_type || 'supplier',
        
        // Enhanced bank details
        vendor_bank_name: item.vendor_bank_name || '',
        vendor_bank_sortcode: item.vendor_bank_sortcode || '',
        vendor_bank_acc: item.vendor_bank_acc || '',
        vendor_bank_vat: item.vendor_bank_vat || '',
        vendor_bank_verified: Boolean(item.vendor_bank_verified || false),
        
        // Enhanced payment terms
        payment_terms: item.vendor_payment_terms || '30 days',
        credit_limit: parseFloat(item.vendor_credit_limit || 0),
        discount_rate: parseFloat(item.vendor_discount_rate || 0),
        
        // Enhanced metadata
        created_date: now,
        created_by: 'migration_script',
        updated_by: 'migration_script',
        last_modified: now,
        
        // Migration metadata
        _migrated_from: 'items_vendor_data',
        _original_vendor_name: vendorName,
        _migration_date: now
      };
      
      vendorMap.set(vendorName, newVendor);
    }
  }
  
  return Array.from(vendorMap.values());
}

/**
 * Transform existing customer data to new Customer interface with enhanced fields
 */
function transformCustomerToNewCustomer(existingCustomer) {
  const now = Timestamp.now();
  
  // Extract address information
  const billingAddress = existingCustomer.billing_address || {};
  const shippingAddress = existingCustomer.shipping_address || billingAddress;
  
  const newCustomer = {
    customer_id: generateId('CUST'),
    customer_name: existingCustomer.customer_name || existingCustomer.company_name || 'Unknown Customer',
    customer_email: existingCustomer.email || existingCustomer.Primary_Email || '',
    customer_phone: existingCustomer.phone || '',
    customer_type: existingCustomer.customer_type || 'business',
    customer_status: existingCustomer.status || 'active',
    
    // Enhanced addresses
    customer_billing_address: {
      street_1: billingAddress.address || billingAddress.street_1 || '',
      street_2: billingAddress.street_2 || '',
      city: billingAddress.city || '',
      state: billingAddress.state || '',
      postcode: billingAddress.zip || billingAddress.postcode || existingCustomer.postcode || '',
      country: billingAddress.country || 'United Kingdom'
    },
    
    customer_shipping_address: {
      street_1: shippingAddress.address || shippingAddress.street_1 || '',
      street_2: shippingAddress.street_2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postcode: shippingAddress.zip || shippingAddress.postcode || existingCustomer.postcode || '',
      country: shippingAddress.country || 'United Kingdom'
    },
    
    // Enhanced business information
    customer_company_name: existingCustomer.company_name || '',
    customer_vat_number: existingCustomer.vat_number || '',
    customer_registration_number: existingCustomer.registration_number || '',
    customer_website: existingCustomer.website || '',
    customer_industry: existingCustomer.industry || '',
    
    // Enhanced credit and payment
    customer_credit_limit: parseFloat(existingCustomer.credit_limit || 0),
    customer_payment_terms: existingCustomer.payment_terms || '30 days',
    customer_discount_rate: parseFloat(existingCustomer.discount_rate || 0),
    customer_payment_method: existingCustomer.payment_method || 'invoice',
    
    // Enhanced contact information
    customer_contact_person: existingCustomer.contact_person || '',
    customer_contact_phone: existingCustomer.contact_phone || '',
    customer_contact_email: existingCustomer.contact_email || '',
    
    // Enhanced metadata
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'customer_data',
    _original_id: existingCustomer.id || existingCustomer.firebase_uid,
    _migration_date: now
  };
  
  return newCustomer;
}

/**
 * Transform existing order data to new SalesOrder interface
 */
function transformOrderToSalesOrder(existingOrder) {
  const now = Timestamp.now();
  
  // Extract items from order
  const orderItems = existingOrder.items || existingOrder.order_items || [];
  const transformedItems = orderItems.map(item => ({
    item_id: item.item_id || item.id || generateId('ITEM'),
    item_name: item.name || item.item_name || 'Unknown Item',
    item_sku: item.sku || item.item_sku || '',
    quantity: parseInt(item.quantity || 1),
    unit_price: parseFloat(item.unit_price || item.price || 0),
    total_price: parseFloat(item.total_price || (item.quantity * item.unit_price) || 0),
    discount_rate: parseFloat(item.discount_rate || 0),
    discount_amount: parseFloat(item.discount_amount || 0),
    tax_rate: parseFloat(item.tax_rate || 20),
    tax_amount: parseFloat(item.tax_amount || 0)
  }));
  
  // Calculate totals
  const subtotal = transformedItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxTotal = transformedItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const discountTotal = transformedItems.reduce((sum, item) => sum + item.discount_amount, 0);
  const total = subtotal + taxTotal - discountTotal;
  
  const newSalesOrder = {
    salesorder_id: generateId('SO'),
    salesorder_number: existingOrder.order_number || existingOrder.order_id || generateId('SO'),
    approved: Boolean(existingOrder.approved || false),
    approved_by_id: existingOrder.approved_by_id || null,
    approved_by_name: existingOrder.approved_by_name || null,
    balance_remaining: parseFloat(existingOrder.balance_remaining || total),
    customer_id: existingOrder.customer_id || generateId('CUST'),
    customer_name: existingOrder.customer_name || 'Unknown Customer',
    
    // Enhanced order details
    order_date: existingOrder.order_date || existingOrder.created_time || now,
    expected_shipment_date: existingOrder.expected_shipment_date || null,
    status: existingOrder.status || 'pending',
    custom_status: existingOrder.custom_status || null,
    branch_id: existingOrder.branch_id || null,
    branch_name: existingOrder.branch_name || null,
    sales_channel: existingOrder.sales_channel || 'direct_sales',
    sales_person: existingOrder.sales_person || existingOrder.salesperson_id || null,
    payment_terms: existingOrder.payment_terms || '30 days',
    delivery_method: existingOrder.delivery_method || 'standard',
    source: existingOrder.source || 'web',
    
    // Enhanced items
    items: transformedItems,
    
    // Enhanced totals
    subtotal: subtotal,
    tax_total: taxTotal,
    discount_total: discountTotal,
    shipping_total: parseFloat(existingOrder.shipping_total || 0),
    total: total,
    
    // Enhanced metadata
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'orders',
    _original_id: existingOrder.id || existingOrder.order_id,
    _migration_date: now
  };
  
  return newSalesOrder;
}

/**
 * Transform existing invoice data to new Invoice interface
 */
function transformInvoiceData(existingInvoice) {
  const now = Timestamp.now();
  
  // Extract items from invoice
  const invoiceItems = existingInvoice.items || existingInvoice.invoice_items || [];
  const transformedItems = invoiceItems.map(item => ({
    item_id: item.item_id || item.id || generateId('ITEM'),
    item_name: item.name || item.item_name || 'Unknown Item',
    item_sku: item.sku || item.item_sku || '',
    quantity: parseInt(item.quantity || 1),
    unit_price: parseFloat(item.unit_price || item.price || 0),
    total_price: parseFloat(item.total_price || (item.quantity * item.unit_price) || 0),
    discount_rate: parseFloat(item.discount_rate || 0),
    discount_amount: parseFloat(item.discount_amount || 0),
    tax_rate: parseFloat(item.tax_rate || 20),
    tax_amount: parseFloat(item.tax_amount || 0)
  }));
  
  // Calculate totals
  const subtotal = transformedItems.reduce((sum, item) => sum + item.total_price, 0);
  const taxTotal = transformedItems.reduce((sum, item) => sum + item.tax_amount, 0);
  const discountTotal = transformedItems.reduce((sum, item) => sum + item.discount_amount, 0);
  const total = subtotal + taxTotal - discountTotal;
  
  const newInvoice = {
    invoice_id: generateId('INV'),
    invoice_number: existingInvoice.invoice_number || existingInvoice.invoice_id || generateId('INV'),
    salesorder_id: existingInvoice.salesorder_id || existingInvoice.order_id || null,
    customer_id: existingInvoice.customer_id || generateId('CUST'),
    customer_name: existingInvoice.customer_name || 'Unknown Customer',
    
    // Enhanced invoice details
    invoice_date: existingInvoice.invoice_date || existingInvoice.created_time || now,
    due_date: existingInvoice.due_date || null,
    expected_payment_date: existingInvoice.expected_payment_date || null,
    status: existingInvoice.status || 'draft',
    branch_id: existingInvoice.branch_id || null,
    branch_name: existingInvoice.branch_name || null,
    
    // Enhanced currency and exchange rate
    currency_code: existingInvoice.currency_code || 'GBP',
    exchange_rate: parseFloat(existingInvoice.exchange_rate || 1),
    
    // Enhanced items
    items: transformedItems,
    
    // Enhanced totals
    subtotal: subtotal,
    tax_total: taxTotal,
    discount_total: discountTotal,
    shipping_total: parseFloat(existingInvoice.shipping_total || 0),
    total: total,
    balance: parseFloat(existingInvoice.balance || total),
    
    // Enhanced payment information
    payment_status: existingInvoice.payment_status || 'unpaid',
    payment_method: existingInvoice.payment_method || null,
    payment_date: existingInvoice.payment_date || null,
    payment_reference: existingInvoice.payment_reference || null,
    
    // Enhanced metadata
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'invoices',
    _original_id: existingInvoice.id || existingInvoice.invoice_id,
    _migration_date: now
  };
  
  return newInvoice;
}

/**
 * Create category from item data
 */
function createCategoryFromItem(item) {
  const now = Timestamp.now();
  
  return {
    category_id: generateId('CAT'),
    category_name: item.category_name || 'Uncategorized',
    description: `Category for ${item.category_name || 'uncategorized items'}`,
    parent_category_id: null,
    is_active: true,
    created_date: now,
    created_by: 'migration_script',
    _migrated_from: 'item_category',
    _migration_date: now
  };
}

/**
 * Create default warehouse with enhanced fields
 */
function createDefaultWarehouse() {
  const now = Timestamp.now();
  
  return {
    warehouse_id: generateId('WH'),
    warehouse_name: 'Main Warehouse',
    description: 'Primary warehouse location',
    address: {
      street_1: '123 Main Street',
      street_2: '',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postcode: 'SW1A 1AA'
    },
    phone: '',
    email: '',
    warehouse_type: 'primary',
    is_active: true,
    is_primary: true,
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    _migrated_from: 'default_warehouse',
    _migration_date: now
  };
}

/**
 * Create default branch
 */
function createDefaultBranch() {
  const now = Timestamp.now();
  
  return {
    branch_id: generateId('BR'),
    branch_name: 'Main Branch',
    branch_code: 'MAIN',
    description: 'Primary business location',
    address: {
      street_1: '123 Main Street',
      street_2: '',
      city: 'London',
      state: 'England',
      country: 'United Kingdom',
      postcode: 'SW1A 1AA'
    },
    phone: '',
    email: '',
    fax: '',
    branch_type: 'headquarters',
    is_active: true,
    is_primary: true,
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    _migrated_from: 'default_branch',
    _migration_date: now
  };
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

/**
 * Create new collections if they don't exist
 */
async function createCollections() {
  if (!MIGRATION_CONFIG.options.createMissingCollections) {
    log('info', 'Skipping collection creation');
    return;
  }
  
  log('info', 'Creating new collections...');
  
  const collections = Object.values(MIGRATION_CONFIG.collections);
  
  for (const collectionName of collections) {
    try {
      // Test if collection exists by trying to get a document
      const testDoc = await db.collection(collectionName).limit(1).get();
      log('info', `Collection '${collectionName}' exists`);
    } catch (error) {
      log('info', `Creating collection '${collectionName}'`);
      // Create collection by adding a dummy document
      await db.collection(collectionName).doc('_migration_test').set({
        _created_by_migration: true,
        _created_at: Timestamp.now()
      });
      // Delete the test document
      await db.collection(collectionName).doc('_migration_test').delete();
    }
  }
  
  log('info', 'Collection creation completed');
}

/**
 * Migrate items data with enhanced fields
 */
async function migrateItems() {
  log('info', 'Starting items migration...');
  
  try {
    const existingItemsSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingItems).get();
    const existingItems = existingItemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${existingItems.length} existing items to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate items', { count: existingItems.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < existingItems.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchItems = existingItems.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const existingItem of batchItems) {
        try {
          const newItem = transformItemData(existingItem);
          
          // Use existing item_id as document ID if available
          const docId = existingItem.item_id || existingItem.id || generateId('ITEM');
          const docRef = db.collection(MIGRATION_CONFIG.collections.newItems).doc(docId);
          
          batch.set(docRef, newItem, { merge: true });
          migrated++;
          
          log('debug', `Transformed item: ${existingItem.name || existingItem.item_id}`);
        } catch (error) {
          log('error', `Error transforming item ${existingItem.id}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Items migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Items migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate customers to new customer structure
 */
async function migrateCustomers() {
  log('info', 'Starting customers migration...');
  
  try {
    const existingCustomersSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingCustomers).get();
    const existingCustomers = existingCustomersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${existingCustomers.length} existing customers to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate customers', { count: existingCustomers.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < existingCustomers.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchCustomers = existingCustomers.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const existingCustomer of batchCustomers) {
        try {
          const newCustomer = transformCustomerToNewCustomer(existingCustomer);
          
          // Use generated customer_id as document ID
          const docRef = db.collection(MIGRATION_CONFIG.collections.newCustomers).doc(newCustomer.customer_id);
          
          batch.set(docRef, newCustomer, { merge: true });
          migrated++;
          
          log('debug', `Migrated customer: ${existingCustomer.customer_name || existingCustomer.email}`);
        } catch (error) {
          log('error', `Error migrating customer ${existingCustomer.id}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Customers migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Customers migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate orders to sales orders
 */
async function migrateOrders() {
  log('info', 'Starting orders migration...');
  
  try {
    const existingOrdersSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingOrders).get();
    const existingOrders = existingOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${existingOrders.length} existing orders to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate orders', { count: existingOrders.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < existingOrders.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchOrders = existingOrders.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const existingOrder of batchOrders) {
        try {
          const newSalesOrder = transformOrderToSalesOrder(existingOrder);
          
          // Use generated salesorder_id as document ID
          const docRef = db.collection(MIGRATION_CONFIG.collections.newSalesOrders).doc(newSalesOrder.salesorder_id);
          
          batch.set(docRef, newSalesOrder, { merge: true });
          migrated++;
          
          log('debug', `Migrated order: ${existingOrder.order_number || existingOrder.order_id}`);
        } catch (error) {
          log('error', `Error migrating order ${existingOrder.id}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Orders migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Orders migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate invoices
 */
async function migrateInvoices() {
  log('info', 'Starting invoices migration...');
  
  try {
    const existingInvoicesSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingInvoices).get();
    const existingInvoices = existingInvoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${existingInvoices.length} existing invoices to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate invoices', { count: existingInvoices.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < existingInvoices.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchInvoices = existingInvoices.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const existingInvoice of batchInvoices) {
        try {
          const newInvoice = transformInvoiceData(existingInvoice);
          
          // Use generated invoice_id as document ID
          const docRef = db.collection(MIGRATION_CONFIG.collections.newInvoices).doc(newInvoice.invoice_id);
          
          batch.set(docRef, newInvoice, { merge: true });
          migrated++;
          
          log('debug', `Migrated invoice: ${existingInvoice.invoice_number || existingInvoice.invoice_id}`);
        } catch (error) {
          log('error', `Error migrating invoice ${existingInvoice.id}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Invoices migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Invoices migration failed:', error.message);
    throw error;
  }
}

/**
 * Extract and create vendors from items data
 */
async function createVendorsFromItems() {
  log('info', 'Creating vendors from items data...');
  
  try {
    const itemsSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingItems).get();
    const existingItems = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    const vendors = extractVendorsFromItems(existingItems);
    log('info', `Found ${vendors.length} unique vendors to create from items`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would create vendors', { count: vendors.length });
      return { created: 0, errors: 0 };
    }
    
    let created = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < vendors.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchVendors = vendors.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const vendor of batchVendors) {
        try {
          const docRef = db.collection(MIGRATION_CONFIG.collections.newVendors).doc(vendor.vendor_id);
          batch.set(docRef, vendor, { merge: true });
          created++;
        } catch (error) {
          log('error', `Error creating vendor ${vendor.vendor_name}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
    }
    
    log('info', `Vendors creation completed: ${created} created, ${errors} errors`);
    return { created, errors };
    
  } catch (error) {
    log('error', 'Vendors creation failed:', error.message);
    throw error;
  }
}

/**
 * Create categories from items
 */
async function createCategoriesFromItems() {
  log('info', 'Creating categories from items...');
  
  try {
    const itemsSnapshot = await db.collection(MIGRATION_CONFIG.collections.newItems).get();
    const items = itemsSnapshot.docs.map(doc => doc.data());
    
    // Group items by category
    const categoryMap = new Map();
    
    for (const item of items) {
      const categoryName = item.category_name || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, createCategoryFromItem(item));
      }
    }
    
    const categories = Array.from(categoryMap.values());
    log('info', `Found ${categories.length} unique categories to create`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would create categories', { count: categories.length });
      return { created: 0, errors: 0 };
    }
    
    let created = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < categories.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchCategories = categories.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const category of batchCategories) {
        try {
          const docRef = db.collection(MIGRATION_CONFIG.collections.newItemCategories).doc(category.category_id);
          batch.set(docRef, category, { merge: true });
          created++;
        } catch (error) {
          log('error', `Error creating category ${category.category_name}:`, error.message);
          errors++;
        }
      }
      
      // Commit batch
      await batch.commit();
    }
    
    log('info', `Categories creation completed: ${created} created, ${errors} errors`);
    return { created, errors };
    
  } catch (error) {
    log('error', 'Categories creation failed:', error.message);
    throw error;
  }
}

/**
 * Create default warehouse
 */
async function createDefaultWarehouseData() {
  log('info', 'Creating default warehouse...');
  
  try {
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would create default warehouse');
      return { created: 0, errors: 0 };
    }
    
    const defaultWarehouse = createDefaultWarehouse();
    const docRef = db.collection(MIGRATION_CONFIG.collections.newWarehouses).doc(defaultWarehouse.warehouse_id);
    
    await docRef.set(defaultWarehouse, { merge: true });
    
    log('info', 'Default warehouse created successfully');
    return { created: 1, errors: 0 };
    
  } catch (error) {
    log('error', 'Default warehouse creation failed:', error.message);
    throw error;
  }
}

/**
 * Create default branch
 */
async function createDefaultBranchData() {
  log('info', 'Creating default branch...');
  
  try {
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would create default branch');
      return { created: 0, errors: 0 };
    }
    
    const defaultBranch = createDefaultBranch();
    const docRef = db.collection(MIGRATION_CONFIG.collections.newBranches).doc(defaultBranch.branch_id);
    
    await docRef.set(defaultBranch, { merge: true });
    
    log('info', 'Default branch created successfully');
    return { created: 1, errors: 0 };
    
  } catch (error) {
    log('error', 'Default branch creation failed:', error.message);
    throw error;
  }
}

/**
 * Create migration summary
 */
async function createMigrationSummary(results) {
  log('info', 'Creating migration summary...');
  
  const summary = {
    migration_date: Timestamp.now(),
    migration_version: '2.0.0', // Updated version for enhanced fields
    dry_run: MIGRATION_CONFIG.options.dryRun,
    results: results,
    collections_created: Object.values(MIGRATION_CONFIG.collections),
    config: MIGRATION_CONFIG.options,
    enhanced_fields: [
      'Item dimensions and package info',
      'Manufacturer information',
      'Enhanced pricing (wholesale, cost, bulk)',
      'Inventory valuation methods',
      'Enhanced shipping information',
      'Branch management',
      'Enhanced vendor and customer fields',
      'Sales order and invoice improvements'
    ]
  };
  
  try {
    await db.collection('migration_logs').doc(`inventory_migration_${Date.now()}`).set(summary);
    log('info', 'Migration summary saved');
  } catch (error) {
    log('error', 'Failed to save migration summary:', error.message);
  }
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

async function runMigration() {
  const startTime = Date.now();
  
  log('info', 'Starting enhanced inventory system migration...');
  log('info', `Configuration:`, MIGRATION_CONFIG.options);
  
  try {
    // Step 1: Create collections
    await createCollections();
    
    // Step 2: Create vendors from items data (suppliers)
    const vendorsResult = await createVendorsFromItems();
    
    // Step 3: Migrate items (with enhanced fields)
    const itemsResult = await migrateItems();
    
    // Step 4: Migrate customers (keep as customers - they buy from you)
    const customersResult = await migrateCustomers();
    
    // Step 5: Migrate orders to sales orders
    const ordersResult = await migrateOrders();
    
    // Step 6: Migrate invoices
    const invoicesResult = await migrateInvoices();
    
    // Step 7: Create categories from items
    const categoriesResult = await createCategoriesFromItems();
    
    // Step 8: Create default warehouse
    const warehouseResult = await createDefaultWarehouseData();
    
    // Step 9: Create default branch
    const branchResult = await createDefaultBranchData();
    
    // Step 10: Create migration summary
    const results = {
      vendors: vendorsResult,
      items: itemsResult,
      customers: customersResult,
      orders: ordersResult,
      invoices: invoicesResult,
      categories: categoriesResult,
      warehouse: warehouseResult,
      branch: branchResult
    };
    
    await createMigrationSummary(results);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    log('info', 'Enhanced migration completed successfully!');
    log('info', `Total duration: ${duration.toFixed(2)} seconds`);
    log('info', 'Results:', results);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'This was a DRY RUN. No data was actually modified.');
      log('info', 'To perform the actual migration, set dryRun: false in the configuration.');
    }
    
  } catch (error) {
    log('error', 'Migration failed:', error.message);
    process.exit(1);
  }
}

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().then(() => {
    log('info', 'Migration script completed');
    process.exit(0);
  }).catch((error) => {
    log('error', 'Migration script failed:', error.message);
    process.exit(1);
  });
}

export { runMigration, MIGRATION_CONFIG }; 