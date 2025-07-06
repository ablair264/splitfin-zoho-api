// server/src/scripts/migrateCustomerData.js

const { admin, db } = require('../firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Configuration
const MIGRATION_CONFIG = {
  collections: {
    oldCustomers: 'customer_data',
    newCustomers: 'customers'
  },
  options: {
    dryRun: false, // Set to true to test without writing
    batchSize: 100,
    preserveExistingData: true,
    logLevel: 'info' // 'debug', 'info', 'warn', 'error'
  }
};

// Logging utility
function log(level, message, data = {}) {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(MIGRATION_CONFIG.options.logLevel)) {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`, data);
  }
}

// Generate customer ID
function generateCustomerId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `CUST_${timestamp}_${random}`;
}

// Transform address
function transformAddress(address) {
  if (!address) {
    return {
      street_1: '',
      street_2: '',
      city: '',
      state: '',
      country: '',
      postcode: ''
    };
  }
  
  return {
    street_1: address.address || address.street || '',
    street_2: address.street2 || '',
    city: address.city || '',
    state: address.state || '',
    country: address.country || '',
    postcode: address.zip || address.postcode || '',
    is_default: address.is_default || false
  };
}

// Transform contact person
function transformContactPerson(contact) {
  return {
    contact_id: contact.contact_id,
    first_name: contact.first_name || '',
    last_name: contact.last_name || '',
    email: contact.email || '',
    phone: contact.phone || null,
    mobile: contact.mobile || null,
    designation: contact.designation || null,
    department: contact.department || null,
    is_primary: contact.is_primary_contact || false,
    salutation: contact.salutation || null
  };
}

// Transform brand preference
function transformBrandPreference(pref) {
  return {
    brand: pref.brand || 'Unknown',
    brand_id: pref.brand_id || null,
    quantity: pref.quantity || 0,
    revenue: pref.revenue || 0,
    percentage: pref.percentage || 0,
    last_purchase_date: pref.last_purchase_date ? 
      Timestamp.fromDate(new Date(pref.last_purchase_date)) : null
  };
}

// Transform top item
function transformTopItem(item) {
  return {
    item_id: item.item_id,
    sku: item.sku || '',
    name: item.name || '',
    quantity: item.quantity || 0,
    revenue: item.revenue || 0,
    last_purchase_date: item.last_purchase_date ? 
      Timestamp.fromDate(new Date(item.last_purchase_date)) : null
  };
}

// Main transformation function
function transformCustomerData(oldData, docId) {
  const zoho = oldData.zoho_data || {};
  const original = oldData.original_firebase_data || {};
  const now = Timestamp.now();
  
  // Determine customer type based on existing data
  let customerType = 'retail';
  if (zoho.customer_sub_type) {
    if (zoho.customer_sub_type.toLowerCase().includes('wholesale')) {
      customerType = 'wholesale';
    } else if (zoho.customer_sub_type.toLowerCase().includes('distributor')) {
      customerType = 'distributor';
    }
  }
  
  return {
    // Primary identifiers
    customer_id: oldData.firebase_uid || docId || generateCustomerId(),
    firebase_uid: oldData.firebase_uid || null,
    zoho_contact_id: zoho.contact_id || null,
    
    // Company information
    company_name: zoho.company_name || zoho.customer_name || 'Unknown Company',
    contact_name: zoho.customer_name !== zoho.company_name ? zoho.customer_name : null,
    email: zoho.email || '',
    phone: zoho.phone || zoho.cf_phone_number || null,
    website: zoho.website || null,
    
    // Business details
    customer_type: customerType,
    customer_sub_type: zoho.customer_sub_type || null,
    segment: original.segment || 'Low',
    status: zoho.status || 'active',
    
    // Financial information
    credit_limit: zoho.credit_limit || 0,
    payment_terms: zoho.payment_terms || 0,
    payment_terms_label: zoho.payment_terms_label || '',
    outstanding_receivable_amount: zoho.outstanding_receivable_amount || 0,
    overdue_amount: zoho.overdue_amount || 0,
    payment_performance: zoho.payment_performance || 0,
    
    // Addresses
    billing_address: transformAddress(zoho.billing_address),
    shipping_address: transformAddress(zoho.shipping_address || zoho.billing_address),
    
    // Location data
    coordinates: original.coordinates || null,
    location_region: original.location_region || zoho.location_region || null,
    location_country: zoho.billing_address?.country || zoho.shipping_address?.country || null,
    
    // Contact persons
    contacts: (zoho.contact_persons || []).map(transformContactPerson),
    
    // Sales information
    assigned_agent_ids: original.salesperson_ids || [],
    total_invoiced: zoho.total_invoiced || original.total_spent || 0,
    invoice_count: zoho.invoice_count || original.order_count || 0,
    last_order_date: original.last_order_date ? 
      Timestamp.fromDate(new Date(original.last_order_date)) : null,
    first_order_date: original.first_order_date ? 
      Timestamp.fromDate(new Date(original.first_order_date)) : 
      (zoho.created_time ? Timestamp.fromDate(new Date(zoho.created_time)) : now),
    
    // Preferences and analytics
    brand_preferences: (original.brand_preferences || []).map(transformBrandPreference),
    top_purchased_items: (original.top_purchased_items || []).map(transformTopItem),
    
    // Metadata
    created_date: zoho.created_time ? 
      Timestamp.fromDate(new Date(zoho.created_time)) : now,
    created_by: 'migration_script',
    last_modified: zoho.last_modified_time ? 
      Timestamp.fromDate(new Date(zoho.last_modified_time)) : now,
    modified_by: 'migration_script',
    
    // Sync metadata
    last_synced: oldData.last_synced || null,
    sync_status: oldData.sync_status || 'synced',
    sync_error: null,
    
    // Migration metadata
    _migrated_from: 'customer_data',
    _original_id: docId,
    _migration_date: now,
    
    // Custom fields
    notes: zoho.notes || null,
    tags: original.tags || [],
    custom_fields: original.custom_fields || {}
  };
}

// Validate transformed data
function validateCustomerData(customer) {
  const errors = [];
  
  if (!customer.customer_id) {
    errors.push('Missing customer_id');
  }
  
  if (!customer.company_name) {
    errors.push('Missing company_name');
  }
  
  if (!customer.email) {
    errors.push('Missing email');
  }
  
  if (!customer.billing_address) {
    errors.push('Missing billing_address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Main migration function
async function migrateCustomers() {
  log('info', 'Starting customer data migration...');
  
  try {
    // Get all documents from old collection
    const oldSnapshot = await db.collection(MIGRATION_CONFIG.collections.oldCustomers).get();
    log('info', `Found ${oldSnapshot.size} customers to migrate`);
    
    if (MIGRATION_CONFIG.options.dryRun) {
      log('info', 'DRY RUN MODE - No data will be written');
    }
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    // Process in batches
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of oldSnapshot.docs) {
      try {
        const oldData = doc.data();
        const newData = transformCustomerData(oldData, doc.id);
        
        // Validate
        const validation = validateCustomerData(newData);
        if (!validation.isValid) {
          log('warn', `Validation failed for customer ${doc.id}:`, validation.errors);
          errors++;
          continue;
        }
        
        if (!MIGRATION_CONFIG.options.dryRun) {
          // Check if already exists
          const existingDoc = await db
            .collection(MIGRATION_CONFIG.collections.newCustomers)
            .doc(newData.customer_id)
            .get();
          
          if (existingDoc.exists() && MIGRATION_CONFIG.options.preserveExistingData) {
            log('debug', `Customer ${newData.customer_id} already exists, skipping`);
            skipped++;
            continue;
          }
          
          // Add to batch
          const newDocRef = db
            .collection(MIGRATION_CONFIG.collections.newCustomers)
            .doc(newData.customer_id);
          batch.set(newDocRef, newData, { merge: true });
          batchCount++;
          
          // Commit batch if full
          if (batchCount >= MIGRATION_CONFIG.options.batchSize) {
            await batch.commit();
            log('info', `Committed batch of ${batchCount} customers`);
            migrated += batchCount;
            batchCount = 0;
          }
        } else {
          log('debug', `Would migrate customer ${newData.customer_id}`, {
            company: newData.company_name,
            email: newData.email
          });
          migrated++;
        }
        
      } catch (error) {
        log('error', `Error processing customer ${doc.id}:`, error.message);
        errors++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0 && !MIGRATION_CONFIG.options.dryRun) {
      await batch.commit();
      log('info', `Committed final batch of ${batchCount} customers`);
      migrated += batchCount;
    }
    
    // Log migration summary
    log('info', 'Migration completed', {
      total: oldSnapshot.size,
      migrated,
      skipped,
      errors
    });
    
    // Create migration log
    if (!MIGRATION_CONFIG.options.dryRun) {
      await db.collection('migration_logs').add({
        migration_type: 'customer_data',
        migration_date: Timestamp.now(),
        source_collection: MIGRATION_CONFIG.collections.oldCustomers,
        target_collection: MIGRATION_CONFIG.collections.newCustomers,
        stats: {
          total: oldSnapshot.size,
          migrated,
          skipped,
          errors
        },
        config: MIGRATION_CONFIG
      });
    }
    
  } catch (error) {
    log('error', 'Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateCustomers()
    .then(() => {
      log('info', 'Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      log('error', 'Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCustomers, transformCustomerData };