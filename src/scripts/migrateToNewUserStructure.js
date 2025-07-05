// server/src/scripts/migrateToNewUserStructure.js
// Migration script to separate users by role and create enhanced data structure
// Run with: node src/scripts/migrateToNewUserStructure.js

import admin from 'firebase-admin';
import './config/firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

// ============================================================
// MIGRATION CONFIGURATION
// ============================================================

const MIGRATION_CONFIG = {
  // Collection mappings
  collections: {
    // Existing collections
    existingUsers: 'users',
    existingCustomers: 'customer_data',
    existingItems: 'items',
    existingOrders: 'salesorders',
    existingInvoices: 'invoices',
    
    // New collections to create
    newBrandManagers: 'brand_managers',
    newSalesAgents: 'sales_agents', 
    newCustomers: 'customers',
    newVendors: 'vendors',
    newItems: 'items_enhanced',
    newSalesOrders: 'sales_orders',
    newInvoices: 'invoices_enhanced',
    newDataAdapters: 'data_adapters'
  },
  
  // Migration options
  options: {
    dryRun: false,
    batchSize: 100,
    createMissingCollections: true,
    preserveExistingData: true,
    logLevel: 'info'
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

// ============================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================

/**
 * Transform existing user to role-specific collection
 */
function transformUserByRole(existingUser) {
  const now = Timestamp.now();
  const baseUser = {
    user_id: existingUser.uid || existingUser.id,
    email: existingUser.email || '',
    created_date: now,
    status: 'active',
    _migrated_from: 'users',
    _original_id: existingUser.id,
    _migration_date: now
  };

  switch (existingUser.role) {
    case 'brandManager':
      return {
        manager_id: generateId('BM'),
        ...baseUser,
        name: existingUser.name || existingUser.displayName || '',
        role: 'brandManager',
        permissions: ['all'],
        zoho_manager_id: existingUser.zohospID || null
      };

    case 'salesAgent':
      return {
        agent_id: generateId('SA'),
        ...baseUser,
        name: existingUser.name || existingUser.displayName || '',
        role: 'salesAgent',
        zoho_agent_id: existingUser.zohoAgentID || existingUser.zohospID || null,
        assigned_customers: existingUser.assigned_customers || [],
        performance_metrics: {
          total_orders: 0,
          total_revenue: 0,
          customer_count: 0,
          last_activity: now
        }
      };

    case 'customer':
      return {
        customer_id: generateId('CUST'),
        ...baseUser,
        role: 'customer',
        company_name: existingUser.company_name || '',
        contact_name: existingUser.contact_name || existingUser.name || '',
        phone: existingUser.phone || '',
        billing_address: existingUser.billing_address || {},
        shipping_address: existingUser.shipping_address || {},
        credit_limit: existingUser.credit_limit || 0,
        payment_terms: existingUser.payment_terms || '30 days'
      };

    default:
      log('warn', `Unknown user role: ${existingUser.role}`, { userId: existingUser.id });
      return null;
  }
}

/**
 * Transform existing customer data to new customer structure
 */
function transformCustomerData(existingCustomer) {
  const now = Timestamp.now();
  
  // Extract address information
  const billingAddress = existingCustomer.billing_address || {};
  const shippingAddress = existingCustomer.shipping_address || billingAddress;
  
  return {
    customer_id: generateId('CUST'),
    user_id: existingCustomer.firebase_uid || existingCustomer.id,
    company_name: existingCustomer.zoho_data?.company_name || existingCustomer.customer_name || 'Unknown Company',
    contact_name: existingCustomer.zoho_data?.customer_name || '',
    email: existingCustomer.zoho_data?.email || existingCustomer.Primary_Email || '',
    phone: existingCustomer.zoho_data?.phone || existingCustomer.zoho_data?.cf_phone_number || '',
    role: 'customer',
    
    // Addresses
    billing_address: {
      street_1: billingAddress.address || '',
      street_2: '',
      city: billingAddress.city || '',
      state: billingAddress.state || '',
      postcode: billingAddress.zip || existingCustomer.postcode || '',
      country: billingAddress.country || 'United Kingdom'
    },
    
    shipping_address: {
      street_1: shippingAddress.address || '',
      street_2: '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      postcode: shippingAddress.zip || existingCustomer.postcode || '',
      country: shippingAddress.country || 'United Kingdom'
    },
    
    // Business information
    vat_number: existingCustomer.zoho_data?.vat_number || '',
    registration_number: existingCustomer.zoho_data?.registration_number || '',
    
    // Credit and payment
    credit_limit: parseFloat(existingCustomer.zoho_data?.credit_limit || 0),
    payment_terms: existingCustomer.zoho_data?.payment_terms_label || '30 days',
    discount_rate: parseFloat(existingCustomer.zoho_data?.discount_rate || 0),
    
    // Metadata
    created_date: now,
    status: existingCustomer.zoho_data?.status || 'active',
    
    // Migration metadata
    _migrated_from: 'customer_data',
    _original_id: existingCustomer.id || existingCustomer.firebase_uid,
    _migration_date: now
  };
}

/**
 * Transform existing items to enhanced structure
 */
function transformItemToEnhanced(existingItem) {
  const now = Timestamp.now();
  
  // Extract vendor name from existing fields
  const vendorName = existingItem.vendor_name || existingItem.brand || existingItem.Manufacturer || 'Unknown Vendor';
  
  return {
    item_id: existingItem.item_id || generateId('ITEM'),
    vendor_name: vendorName,
    item_name: existingItem.name || existingItem.item_name || 'Unknown Item',
    item_description: existingItem.description || existingItem.pro_desc || '',
    item_sku: existingItem.sku || '',
    item_barcode: existingItem.barcode || existingItem.ean || '',
    item_category: existingItem.category || 'Uncategorized',
    item_subcategory: existingItem.subcategory || '',
    item_brand: existingItem.brand || '',
    item_model: existingItem.model || '',
    item_condition: existingItem.condition || 'new',
    item_status: existingItem.status || 'active',
    
    // Stock information
    item_stock: {
      total: parseInt(existingItem.stock_on_hand || existingItem.available_stock || 0),
      available: parseInt(existingItem.actual_available_stock || existingItem.available_stock || 0),
      committed: parseInt(existingItem.stock_on_hand || 0) - parseInt(existingItem.actual_available_stock || 0),
      reorder_level: parseInt(existingItem.reorder_level || 10),
      reorder_quantity: parseInt(existingItem.reorder_quantity || 50),
      max_stock: parseInt(existingItem.max_stock || 1000)
    },
    
    // Pricing
    item_pricing: {
      cost_price: parseFloat(existingItem.purchase_rate || existingItem.cost_price || 0),
      selling_price: parseFloat(existingItem.rate || existingItem.selling_price || 0),
      wholesale_price: parseFloat(existingItem.wholesale_price || 0),
      retail_price: parseFloat(existingItem.retail_price || 0),
      currency: existingItem.currency || 'GBP'
    },
    
    // Images
    item_images: existingItem.images || (existingItem.imageUrl ? [existingItem.imageUrl] : []),
    
    // Metadata
    created_date: existingItem.created_time || now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'items',
    _original_id: existingItem.id || existingItem.item_id,
    _migration_date: now
  };
}

/**
 * Transform existing orders to new structure
 */
function transformSalesOrder(existingOrder) {
  const now = Timestamp.now();
  
  return {
    order_id: existingOrder.id || generateId('SO'),
    customer_id: existingOrder.customer_id || '',
    agent_id: existingOrder.salesperson_id || null,
    order_date: existingOrder.date || now,
    order_status: existingOrder.status || 'pending',
    order_number: existingOrder.order_number || existingOrder.id,
    
    // Order items (simplified for now)
    order_items: existingOrder.items || [],
    order_total: parseFloat(existingOrder.total || 0),
    
    // Addresses
    shipping_address: existingOrder.shipping_address || {},
    billing_address: existingOrder.billing_address || {},
    
    // Metadata
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'salesorders',
    _original_id: existingOrder.id,
    _migration_date: now
  };
}

/**
 * Transform existing invoices to new structure
 */
function transformInvoice(existingInvoice) {
  const now = Timestamp.now();
  
  return {
    invoice_id: existingInvoice.id || generateId('INV'),
    order_id: existingInvoice.order_id || '',
    customer_id: existingInvoice.customer_id || '',
    agent_id: existingInvoice.salesperson_id || null,
    invoice_number: existingInvoice.invoice_number || existingInvoice.invoice_id || '',
    invoice_date: existingInvoice.date || now,
    due_date: existingInvoice.due_date || now,
    total_amount: parseFloat(existingInvoice.total || 0),
    paid_amount: parseFloat(existingInvoice.paid_amount || 0),
    balance: parseFloat(existingInvoice.balance || existingInvoice.total || 0),
    status: existingInvoice.status || 'unpaid',
    payment_terms: existingInvoice.payment_terms || '30 days',
    
    // Metadata
    created_date: now,
    created_by: 'migration_script',
    updated_by: 'migration_script',
    last_modified: now,
    
    // Migration metadata
    _migrated_from: 'invoices',
    _original_id: existingInvoice.id,
    _migration_date: now
  };
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

/**
 * Create new collections
 */
async function createCollections() {
  log('info', 'Creating new collections...');
  
  const collections = Object.values(MIGRATION_CONFIG.collections);
  
  for (const collectionName of collections) {
    try {
      // Check if collection exists by trying to get a document
      const testDoc = await db.collection(collectionName).limit(1).get();
      log('info', `Collection '${collectionName}' exists`);
    } catch (error) {
      if (MIGRATION_CONFIG.options.createMissingCollections) {
        // Create collection by adding a dummy document
        await db.collection(collectionName).doc('_migration_init').set({
          created_by: 'migration_script',
          created_date: Timestamp.now()
        });
        log('info', `Created collection '${collectionName}'`);
      }
    }
  }
  
  log('info', 'Collection creation completed');
}

/**
 * Migrate users to role-specific collections
 */
async function migrateUsers() {
  log('info', 'Starting users migration...');
  
  try {
    const usersSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingUsers).get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${users.length} users to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate users', { count: users.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Group users by role
    const brandManagers = [];
    const salesAgents = [];
    const customers = [];
    
    for (const user of users) {
      const transformed = transformUserByRole(user);
      if (!transformed) {
        skipped++;
        continue;
      }
      
      switch (user.role) {
        case 'brandManager':
          brandManagers.push(transformed);
          break;
        case 'salesAgent':
          salesAgents.push(transformed);
          break;
        case 'customer':
          customers.push(transformed);
          break;
        default:
          skipped++;
      }
    }
    
    // Migrate brand managers
    if (brandManagers.length > 0) {
      const batch = db.batch();
      for (const manager of brandManagers) {
        const docRef = db.collection(MIGRATION_CONFIG.collections.newBrandManagers).doc(manager.manager_id);
        batch.set(docRef, manager, { merge: true });
      }
      await batch.commit();
      migrated += brandManagers.length;
      log('info', `Migrated ${brandManagers.length} brand managers`);
    }
    
    // Migrate sales agents
    if (salesAgents.length > 0) {
      const batch = db.batch();
      for (const agent of salesAgents) {
        const docRef = db.collection(MIGRATION_CONFIG.collections.newSalesAgents).doc(agent.agent_id);
        batch.set(docRef, agent, { merge: true });
      }
      await batch.commit();
      migrated += salesAgents.length;
      log('info', `Migrated ${salesAgents.length} sales agents`);
    }
    
    // Migrate customers
    if (customers.length > 0) {
      const batch = db.batch();
      for (const customer of customers) {
        const docRef = db.collection(MIGRATION_CONFIG.collections.newCustomers).doc(customer.customer_id);
        batch.set(docRef, customer, { merge: true });
      }
      await batch.commit();
      migrated += customers.length;
      log('info', `Migrated ${customers.length} customers`);
    }
    
    log('info', `Users migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Users migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate customer data to new structure
 */
async function migrateCustomerData() {
  log('info', 'Starting customer data migration...');
  
  try {
    const customersSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingCustomers).get();
    const customers = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${customers.length} customer records to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate customer data', { count: customers.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < customers.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchCustomers = customers.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const customer of batchCustomers) {
        try {
          const newCustomer = transformCustomerData(customer);
          const docRef = db.collection(MIGRATION_CONFIG.collections.newCustomers).doc(newCustomer.customer_id);
          batch.set(docRef, newCustomer, { merge: true });
          migrated++;
        } catch (error) {
          log('error', `Error migrating customer ${customer.id}:`, error.message);
          errors++;
        }
      }
      
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Customer data migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Customer data migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate items to enhanced structure
 */
async function migrateItems() {
  log('info', 'Starting items migration...');
  
  try {
    const itemsSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingItems).get();
    const items = itemsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${items.length} items to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate items', { count: items.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < items.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchItems = items.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const item of batchItems) {
        try {
          const newItem = transformItemToEnhanced(item);
          const docRef = db.collection(MIGRATION_CONFIG.collections.newItems).doc(newItem.item_id);
          batch.set(docRef, newItem, { merge: true });
          migrated++;
        } catch (error) {
          log('error', `Error migrating item ${item.id}:`, error.message);
          errors++;
        }
      }
      
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
 * Migrate sales orders
 */
async function migrateSalesOrders() {
  log('info', 'Starting sales orders migration...');
  
  try {
    const ordersSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingOrders).get();
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${orders.length} sales orders to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate sales orders', { count: orders.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < orders.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchOrders = orders.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const order of batchOrders) {
        try {
          const newOrder = transformSalesOrder(order);
          const docRef = db.collection(MIGRATION_CONFIG.collections.newSalesOrders).doc(newOrder.order_id);
          batch.set(docRef, newOrder, { merge: true });
          migrated++;
        } catch (error) {
          log('error', `Error migrating order ${order.id}:`, error.message);
          errors++;
        }
      }
      
      await batch.commit();
      log('info', `Processed batch ${Math.floor(i / MIGRATION_CONFIG.options.batchSize) + 1}`);
    }
    
    log('info', `Sales orders migration completed: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
    return { migrated, skipped, errors };
    
  } catch (error) {
    log('error', 'Sales orders migration failed:', error.message);
    throw error;
  }
}

/**
 * Migrate invoices
 */
async function migrateInvoices() {
  log('info', 'Starting invoices migration...');
  
  try {
    const invoicesSnapshot = await db.collection(MIGRATION_CONFIG.collections.existingInvoices).get();
    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    log('info', `Found ${invoices.length} invoices to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN: Would migrate invoices', { count: invoices.length });
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    for (let i = 0; i < invoices.length; i += MIGRATION_CONFIG.options.batchSize) {
      const batch = db.batch();
      const batchInvoices = invoices.slice(i, i + MIGRATION_CONFIG.options.batchSize);
      
      for (const invoice of batchInvoices) {
        try {
          const newInvoice = transformInvoice(invoice);
          const docRef = db.collection(MIGRATION_CONFIG.collections.newInvoices).doc(newInvoice.invoice_id);
          batch.set(docRef, newInvoice, { merge: true });
          migrated++;
        } catch (error) {
          log('error', `Error migrating invoice ${invoice.id}:`, error.message);
          errors++;
        }
      }
      
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
 * Create migration summary
 */
async function createMigrationSummary(results) {
  log('info', 'Creating migration summary...');
  
  const summary = {
    migration_date: Timestamp.now(),
    migration_version: '2.0.0',
    migration_type: 'user_structure_separation',
    dry_run: MIGRATION_CONFIG.options.dryRun,
    results: results,
    collections_created: Object.values(MIGRATION_CONFIG.collections),
    config: MIGRATION_CONFIG.options
  };
  
  try {
    await db.collection('migration_logs').doc(`user_structure_migration_${Date.now()}`).set(summary);
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
  
  log('info', 'Starting user structure migration...');
  log('info', `Configuration:`, MIGRATION_CONFIG.options);
  
  try {
    // Step 1: Create collections
    await createCollections();
    
    // Step 2: Migrate users to role-specific collections
    const usersResult = await migrateUsers();
    
    // Step 3: Migrate customer data
    const customerDataResult = await migrateCustomerData();
    
    // Step 4: Migrate items to enhanced structure
    const itemsResult = await migrateItems();
    
    // Step 5: Migrate sales orders
    const ordersResult = await migrateSalesOrders();
    
    // Step 6: Migrate invoices
    const invoicesResult = await migrateInvoices();
    
    // Step 7: Create migration summary
    const results = {
      users: usersResult,
      customerData: customerDataResult,
      items: itemsResult,
      orders: ordersResult,
      invoices: invoicesResult
    };
    
    await createMigrationSummary(results);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    log('info', 'User structure migration completed successfully!');
    log('info', `Total duration: ${duration.toFixed(2)} seconds`);
    log('info', 'Results:', results);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'This was a DRY RUN. No data was actually modified.');
      log('info', 'To perform the actual migration, set dryRun: false in the configuration.');
    }
    
  } catch (error) {
    log('error', 'User structure migration failed:', error.message);
    process.exit(1);
  }
}

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().then(() => {
    log('info', 'User structure migration script completed');
    process.exit(0);
  }).catch((error) => {
    log('error', 'User structure migration script failed:', error.message);
    process.exit(1);
  });
}

export { runMigration, MIGRATION_CONFIG }; 