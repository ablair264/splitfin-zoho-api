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
    
    // New collections to create
    newItems: 'items', // Same name, different structure
    newVendors: 'vendors',
    newItemCategories: 'item_categories',
    newSalesOrders: 'sales_orders',
    newInvoices: 'invoices',
    newWarehouses: 'warehouses',
    newStockTransactions: 'stock_transactions',
    newStockAlerts: 'stock_alerts',
    newShippingMethods: 'shipping_methods',
    newCouriers: 'couriers',
    newVendorContacts: 'vendor_contacts'
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
 * Transform existing item data to new Item interface
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
  
  // Transform to new Item structure
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
    
    // Dimensions (placeholder - not in existing data)
    dimensions: {
      length: null,
      height: null,
      width: null,
      diameter: null,
      volume: null
    },
    
    part_no: existingItem.sku || '',
    product_type: 'Goods',
    purchase_price: parseFloat(existingItem.purchase_rate || 0),
    retail_price: parseFloat(existingItem.rate || 0),
    reorder_level: 10, // Default value
    estimated_delivery: 7, // Default 7 days
    sku: existingItem.sku || '',
    status: existingItem.status || 'active',
    
    // Tax structure
    tax: {
      tax_rate: 20, // Default UK VAT rate
      tax_exempt: false
    },
    
    minimum_order_qty: 1,
    variable_pricing: false,
    
    // Metadata
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
 * Extract vendors from existing items data
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
        vendor_location: 'United Kingdom', // Default, can be updated later
        vendor_address: {
          street_1: '',
          street_2: '',
          city: '',
          state: '',
          postcode: '',
          country: 'United Kingdom'
        },
        
        // Vendor contacts (placeholder - can be updated later)
        vendor_contacts: [{
          venc_id: generateId('VENCONT'),
          venc_name: vendorName,
          venc_phone: '',
          venc_email: '',
          venc_primary: true,
          venc_comments: '',
          venc_created: now
        }],
        
        vendor_status: 'active',
        
        // Bank details (placeholder)
        vendor_bank_name: '',
        vendor_bank_sortcode: '',
        vendor_bank_acc: '',
        vendor_bank_vat: '',
        vendor_bank_verified: false,
        
        // Metadata
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
 * Transform existing customer data to new Customer interface
 * (Keep customers as customers - they are different from vendors)
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
    
    // Addresses
    customer_billing_address: {
      street_1: billingAddress.address || '',
      street_2: '',
      city: billingAddress.city || '',
      state: billingAddress.state || '',
      postcode: billingAddress.zip || existingCustomer.postcode || '',
      country: billingAddress.country || 'United Kingdom'
    },
    
    customer_shipping_address: {
      street_1: shippingAddress.address || '',
      street_2: '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postcode: shippingAddress.zip || existingCustomer.postcode || '',
      country: shippingAddress.country || 'United Kingdom'
    },
    
    // Business information
    customer_company_name: existingCustomer.company_name || '',
    customer_vat_number: existingCustomer.vat_number || '',
    customer_registration_number: existingCustomer.registration_number || '',
    
    // Credit and payment
    customer_credit_limit: parseFloat(existingCustomer.credit_limit || 0),
    customer_payment_terms: existingCustomer.payment_terms || '30 days',
    customer_discount_rate: parseFloat(existingCustomer.discount_rate || 0),
    
    // Metadata
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
 * Create default warehouse
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
 * Migrate items data
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
 * Migrate customers to vendors
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
          const docRef = db.collection('customers').doc(newCustomer.customer_id);
          
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
 * Create migration summary
 */
async function createMigrationSummary(results) {
  log('info', 'Creating migration summary...');
  
  const summary = {
    migration_date: Timestamp.now(),
    migration_version: '1.0.0',
    dry_run: MIGRATION_CONFIG.options.dryRun,
    results: results,
    collections_created: Object.values(MIGRATION_CONFIG.collections),
    config: MIGRATION_CONFIG.options
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
  
  log('info', 'Starting inventory system migration...');
  log('info', `Configuration:`, MIGRATION_CONFIG.options);
  
  try {
    // Step 1: Create collections
    await createCollections();
    
    // Step 2: Create vendors from items data (suppliers)
    const vendorsResult = await createVendorsFromItems();
    
    // Step 3: Migrate items (with vendor references)
    const itemsResult = await migrateItems();
    
    // Step 4: Migrate customers (keep as customers - they buy from you)
    const customersResult = await migrateCustomers();
    
    // Step 5: Create categories from items
    const categoriesResult = await createCategoriesFromItems();
    
    // Step 6: Create default warehouse
    const warehouseResult = await createDefaultWarehouseData();
    
    // Step 7: Create migration summary
    const results = {
      vendors: vendorsResult,
      items: itemsResult,
      customers: customersResult,
      categories: categoriesResult,
      warehouse: warehouseResult
    };
    
    await createMigrationSummary(results);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    log('info', 'Migration completed successfully!');
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