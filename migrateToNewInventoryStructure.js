import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper functions from inventoryCollections.ts
const generateItemId = () => {
  return `ITEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateVendorId = () => {
  return `VEND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateCategoryId = () => {
  return `CAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateSalesOrderId = () => {
  return `SO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateInvoiceId = () => {
  return `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generatePurchaseOrderId = () => {
  return `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const generatePurchaseOrderNumber = () => {
  return `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

// Add customer ID generator
const generateCustomerId = () => {
  return `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const COLLECTIONS = {
  items: 'items',
  item_categories: 'item_categories',
  vendors: 'vendors',
  vendor_contacts: 'vendor_contacts',
  sales_orders: 'sales_orders',
  sales_order_items: 'sales_order_items',
  invoices: 'invoices',
  invoice_items: 'invoice_items',
  purchase_orders: 'purchase_orders',
  purchase_order_items: 'purchase_order_items',
  stock_transactions: 'stock_transactions',
  stock_alerts: 'stock_alerts',
  warehouses: 'warehouses',
  shipping_methods: 'shipping_methods',
  couriers: 'couriers',
  branches: 'branches',
  customers: 'customers', // Add customers collection
};

// Load service account
const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Migration configuration
const CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run'),
  BATCH_SIZE: 500,
  DELETE_OLD_DATA: process.argv.includes('--delete-old'),
  COLLECTIONS_TO_MIGRATE: {
    items: true,
    vendors: true,
    sales_orders: true,
    invoices: true,
    purchase_orders: true,
    categories: true,
    customers: true // Add customers to migration
  }
};

// ============================================================
// PREDEFINED VENDOR DATA
// ============================================================

const PREDEFINED_VENDORS = [
  {
    vendor_id: 've-001',
    vendor_name: 'Blomus',
    brand_normalized: 'blomus',
    vendor_location: 'Germany',
    vendor_address: {
      street_1: 'Kornharpener Straße 126',
      city: 'Bochum',
      postcode: '44791',
      country: 'Germany'
    },
    vendor_phone: '+49 (0) 234 95987-0'
  },
  {
    vendor_id: 've-002',
    vendor_name: 'Elvang',
    brand_normalized: 'elvang',
    vendor_location: 'Denmark',
    vendor_address: {
      street_1: 'Banevej 7',
      city: 'Soroe',
      postcode: 'DK-4180',
      country: 'Denmark'
    },
    vendor_phone: '+45 3537 8989'
  },
  {
    vendor_id: 've-003',
    vendor_name: 'GEFU',
    brand_normalized: 'gefu',
    vendor_location: 'Germany',
    vendor_address: {
      street_1: 'Braukweg 28',
      city: 'Eslohe',
      postcode: '59889',
      country: 'Germany'
    },
    vendor_phone: ''
  },
  {
    vendor_id: 've-004',
    vendor_name: 'My Flame Lifestyle',
    brand_normalized: 'my-flame',
    vendor_location: 'Netherlands',
    vendor_address: {
      street_1: 'Energieweg 65',
      city: 'Alphen aan den Rijn',
      postcode: '2404 HE',
      country: 'Netherlands'
    },
    vendor_phone: ''
  },
  {
    vendor_id: 've-005',
    vendor_name: 'Räder',
    brand_normalized: 'rader',
    vendor_location: 'Germany',
    vendor_address: {
      street_1: 'Kornharpener Straße 126',
      city: 'Bochum',
      postcode: '44791',
      country: 'Germany'
    },
    vendor_phone: '+49 (0) 234 95987-0'
  },
  {
    vendor_id: 've-006',
    vendor_name: 'Remember',
    brand_normalized: 'remember',
    vendor_location: 'Germany',
    vendor_address: {
      street_1: '',
      city: '',
      postcode: '',
      country: 'Germany'
    },
    vendor_phone: ''
  },
  {
    vendor_id: 've-007',
    vendor_name: 'Relaxound',
    brand_normalized: 'relaxound',
    vendor_location: 'Germany',
    vendor_address: {
      street_1: 'Wilhelm-von-Siemens-Straße 12-14',
      city: 'Berlin',
      postcode: '12277',
      country: 'Germany'
    },
    vendor_phone: '+49 30 74 68 44 50'
  }
];

// Progress tracking with update stats
const stats = {
  items: { processed: 0, created: 0, updated: 0, errors: 0 },
  vendors: { processed: 0, created: 0, updated: 0, errors: 0, predefined: PREDEFINED_VENDORS.length },
  categories: { processed: 0, created: 0, updated: 0, errors: 0 },
  sales_orders: { processed: 0, created: 0, updated: 0, errors: 0 },
  invoices: { processed: 0, created: 0, updated: 0, errors: 0 },
  purchase_orders: { processed: 0, created: 0, updated: 0, errors: 0 },
  customers: { processed: 0, created: 0, updated: 0, errors: 0 }
};

// Cache for avoiding duplicates
const cache = {
  vendors: new Map(), // vendor_name -> vendor_id
  categories: new Map(), // category_name -> category_id
  items: new Map(), // old_item_id -> new_item_id
  customers: new Map() // old_customer_id -> new_customer_id
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📊',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📊';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function processBatch(batch) {
  if (CONFIG.DRY_RUN) {
    log('DRY RUN: Would commit batch', 'warning');
    return;
  }
  await batch.commit();
}

async function documentExists(collection, docId) {
  const doc = await db.collection(collection).doc(docId).get();
  return doc.exists;
}

// Calculate customer segment
function calculateSegment(totalSpent, orderCount) {
  if (totalSpent >= 10000 || orderCount >= 30) return 'VIP';
  if (totalSpent >= 5000 || orderCount >= 15) return 'High';
  if (totalSpent >= 1000 || orderCount >= 5) return 'Medium';
  if (orderCount > 0) return 'Low';
  return 'New';
}

// Determine customer status
function determineStatus(zohoStatus, lastOrderDate) {
  if (zohoStatus === 'inactive') return 'inactive';
  if (!lastOrderDate) return 'active';
  
  const daysSinceLastOrder = (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastOrder > 365) return 'dormant';
  if (daysSinceLastOrder > 180) return 'at_risk';
  return 'active';
}

// ============================================================
// CLEAR AND POPULATE PREDEFINED VENDORS
// ============================================================

async function clearAndPopulateVendors() {
  log('Clearing existing vendors collection...');
  
  try {
    // Clear existing vendors
    const vendorsSnapshot = await db.collection(COLLECTIONS.vendors).get();
    const batchSize = 500;
    const batches = [];
    
    vendorsSnapshot.docs.forEach((doc, index) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!batches[batchIndex]) {
        batches[batchIndex] = db.batch();
      }
      batches[batchIndex].delete(doc.ref);
    });
    
    for (const batch of batches) {
      if (!CONFIG.DRY_RUN) {
        await batch.commit();
      }
    }
    
    log(`Cleared ${vendorsSnapshot.size} existing vendors`, 'success');
    
    // Populate predefined vendors
    log('Populating predefined vendors...');
    
    let batch = db.batch();
    let batchCount = 0;
    
    for (const vendorData of PREDEFINED_VENDORS) {
      const vendorRef = db.collection(COLLECTIONS.vendors).doc(vendorData.vendor_id);
      
      const vendor = {
        id: vendorData.vendor_id,
        vendor_id: vendorData.vendor_id,
        vendor_name: vendorData.vendor_name,
        brand_normalized: vendorData.brand_normalized,
        vendor_location: vendorData.vendor_location,
        vendor_address: vendorData.vendor_address,
        vendor_contacts: [{
          venc_id: `VENC_${vendorData.vendor_id}_001`,
          venc_name: 'Primary Contact',
          venc_phone: vendorData.vendor_phone,
          venc_email: '',
          venc_primary: true,
          venc_created: admin.firestore.Timestamp.now()
        }],
        vendor_status: 'active',
        vendor_bank_name: '',
        vendor_bank_sortcode: '',
        vendor_bank_acc: '',
        vendor_bank_vat: '',
        vendor_bank_verified: false,
        
        // Initialize statistics
        vendor_stats: {
          total_items: 0,
          active_items: 0,
          inactive_items: 0,
          total_skus: 0,
          categories: [],
          total_stock_value: 0,
          average_item_value: 0
        },
        
        vendor_performance: {
          total_ordered: 0,
          total_received: 0,
          on_time_delivery_rate: 0,
          quality_rating: 0,
          last_order_date: null
        },
        
        created_date: admin.firestore.Timestamp.now(),
        created_by: 'migration_script',
        updated_by: 'migration_script',
        last_modified: admin.firestore.Timestamp.now(),
        _predefined: true
      };
      
      batch.set(vendorRef, vendor);
      
      // Add to cache with various name variations
      cache.vendors.set(vendorData.vendor_name, vendorData.vendor_id);
      cache.vendors.set(vendorData.vendor_name.toLowerCase(), vendorData.vendor_id);
      cache.vendors.set(vendorData.brand_normalized, vendorData.vendor_id);
      
      // Add special variations for matching
      if (vendorData.vendor_name === 'My Flame Lifestyle') {
        cache.vendors.set('My Flame', vendorData.vendor_id);
        cache.vendors.set('MyFlame', vendorData.vendor_id);
      }
      
      batchCount++;
      
      if (batchCount >= CONFIG.BATCH_SIZE) {
        await processBatch(batch);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await processBatch(batch);
    }
    
    log(`Created ${PREDEFINED_VENDORS.length} predefined vendors`, 'success');
    
  } catch (error) {
    log(`Error clearing/populating vendors: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================================
// CUSTOMER MIGRATION (WITH UPDATE SUPPORT) - FIXED
// ============================================================

async function migrateCustomers() {
  log('Starting customer migration...');
  
  try {
    const customersSnapshot = await db.collection('customer_data').get();
    log(`Found ${customersSnapshot.size} customers to migrate`);
    
    let batch = db.batch();
    let batchCount = 0;
    
    for (const doc of customersSnapshot.docs) {
      try {
        const oldData = doc.data();
        const customerId = oldData.firebase_uid || generateCustomerId();
        const customerRef = db.collection(COLLECTIONS.customers).doc(customerId);
        
        // Check if customer already exists
        const existingDoc = await customerRef.get();
        const exists = existingDoc.exists;
        
        // Extract data from nested structure
        const zoho = oldData.zoho_data || {};
        const firebase = oldData.original_firebase_data || {};
        
        // Calculate values
        const totalSpent = zoho.total_invoiced || firebase.total_spent || 0;
        const orderCount = zoho.invoice_count || firebase.order_count || 0;
        const segment = firebase.segment || calculateSegment(totalSpent, orderCount);
        
        if (exists) {
          // Update only specific fields that might have changed
          const updates = {
            // Update financial information
            'financial.outstanding_amount': parseFloat(zoho.outstanding_receivable_amount || oldData.outstanding_receivable_amount || 0),
            'financial.overdue_amount': parseFloat(zoho.overdue_amount || 0),
            'financial.unused_credits': parseFloat(zoho.unused_credits_receivable_amount || 0),
            
            // Update metrics
            'metrics.total_spent': parseFloat(totalSpent),
            'metrics.total_invoiced': parseFloat(zoho.total_invoiced || totalSpent),
            'metrics.total_paid': parseFloat(totalSpent) - parseFloat(zoho.outstanding_receivable_amount || 0),
            'metrics.payment_performance': parseFloat(zoho.payment_performance || 100),
            'metrics.average_order_value': parseFloat(oldData.average_order_value || firebase.average_order_value || 0),
            'metrics.order_count': parseInt(orderCount),
            'metrics.invoice_count': parseInt(zoho.invoice_count || orderCount),
            'metrics.last_order_date': firebase.last_order_date || oldData.last_order_date,
            'metrics.days_since_last_order': firebase.last_order_date ? 
              Math.floor((Date.now() - new Date(firebase.last_order_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
            
            // Update enrichment data if available
            'enrichment.segment': segment,
            
            // Update sync information
            'sync.last_synced': oldData._lastSynced || oldData.last_synced || admin.firestore.Timestamp.now(),
            'sync.sync_status': oldData.sync_status || 'success',
            'sync.zoho_last_modified': zoho.last_modified_time || null,
            
            // Update modified date
            'last_modified': admin.firestore.Timestamp.now(),
            'updated_by': 'migration_script',
            
            // Add migration metadata
            '_migration.last_updated': admin.firestore.Timestamp.now(),
            '_migration.update_count': admin.firestore.FieldValue.increment(1)
          };
          
          // Add enrichment data if available and not already present
          const existingData = existingDoc.data();
          if (firebase.coordinates && !existingData?.enrichment?.coordinates) {
            updates['enrichment.coordinates'] = firebase.coordinates;
          }
          if (firebase.brand_preferences && firebase.brand_preferences.length > 0) {
            updates['enrichment.brand_preferences'] = firebase.brand_preferences;
          }
          if (firebase.top_purchased_items && firebase.top_purchased_items.length > 0) {
            updates['enrichment.top_purchased_items'] = firebase.top_purchased_items;
          }
          
          batch.update(customerRef, updates);
          stats.customers.updated++;
          
        } else {
          // Create new customer document
          const newCustomer = {
            // Identity
            customer_id: customerId,
            zoho_customer_id: oldData.customer_id || zoho.contact_id || zoho.customer_id,
            firebase_uid: oldData.firebase_uid,
            
            // Basic Information
            customer_name: zoho.customer_name || firebase.customer_name || 'Unknown Customer',
            company_name: zoho.company_name || '',
            email: zoho.email || oldData.Primary_Email || '',
            phone: zoho.phone || zoho.cf_phone_number || '',
            mobile: zoho.mobile || '',
            website: zoho.website || '',
            
            // Addresses
            billing_address: {
              attention: zoho.billing_address?.attention || '',
              street_1: zoho.billing_address?.address || zoho.billing_address?.street || '',
              street_2: zoho.billing_address?.street2 || '',
              city: zoho.billing_address?.city || '',
              state: zoho.billing_address?.state || '',
              postcode: zoho.billing_address?.zip || zoho.billing_address?.postcode || '',
              country: zoho.billing_address?.country || 'United Kingdom',
              country_code: zoho.billing_address?.country_code || 'GB'
            },
            shipping_address: {
              attention: zoho.shipping_address?.attention || '',
              street_1: zoho.shipping_address?.address || zoho.shipping_address?.street || '',
              street_2: zoho.shipping_address?.street2 || '',
              city: zoho.shipping_address?.city || '',
              state: zoho.shipping_address?.state || '',
              postcode: zoho.shipping_address?.zip || zoho.shipping_address?.postcode || '',
              country: zoho.shipping_address?.country || 'United Kingdom',
              country_code: zoho.shipping_address?.country_code || 'GB'
            },
            
            // Financial Information
            financial: {
              credit_limit: parseFloat(zoho.credit_limit || 0),
              credit_used: parseFloat(zoho.credit_limit || 0) - parseFloat(zoho.unused_credits_receivable_amount || 0),
              payment_terms: parseInt(zoho.payment_terms || firebase.payment_terms || 30),
              payment_terms_label: zoho.payment_terms_label || 'Net 30',
              currency_code: zoho.currency_code || 'GBP',
              vat_number: zoho.vat_reg_no || '',
              tax_reg_number: zoho.tax_reg_no || '',
              tax_treatment: zoho.vat_treatment || zoho.tax_treatment || 'uk',
              outstanding_amount: parseFloat(zoho.outstanding_receivable_amount || oldData.outstanding_receivable_amount || 0),
              overdue_amount: parseFloat(zoho.overdue_amount || 0),
              unused_credits: parseFloat(zoho.unused_credits_receivable_amount || 0)
            },
            
            // Calculated Metrics
            metrics: {
              total_spent: parseFloat(totalSpent),
              total_invoiced: parseFloat(zoho.total_invoiced || totalSpent),
              total_paid: parseFloat(totalSpent) - parseFloat(zoho.outstanding_receivable_amount || 0),
              payment_performance: parseFloat(zoho.payment_performance || 100),
              average_order_value: parseFloat(oldData.average_order_value || firebase.average_order_value || 0),
              order_count: parseInt(orderCount),
              invoice_count: parseInt(zoho.invoice_count || orderCount),
              first_order_date: firebase.first_order_date || zoho.created_time,
              last_order_date: firebase.last_order_date || oldData.last_order_date,
              days_since_last_order: firebase.last_order_date ? 
                Math.floor((Date.now() - new Date(firebase.last_order_date).getTime()) / (1000 * 60 * 60 * 24)) : null,
              customer_lifetime_days: zoho.created_time ? 
                Math.floor((Date.now() - new Date(zoho.created_time).getTime()) / (1000 * 60 * 60 * 24)) : null
            },
            
            // Enrichment Data
            enrichment: {
              coordinates: firebase.coordinates || null,
              location_region: firebase.location_region || zoho.location_region || 'Unknown',
              segment: segment,
              brand_preferences: firebase.brand_preferences || [],
              top_purchased_items: firebase.top_purchased_items || []
            },
            
            // Contacts
            contacts: (zoho.contact_persons || []).map(contact => ({
              contact_id: contact.contact_person_id,
              first_name: contact.first_name || '',
              last_name: contact.last_name || '',
              email: contact.email || '',
              phone: contact.phone || '',
              mobile: contact.mobile || '',
              designation: contact.designation || '',
              department: contact.department || '',
              is_primary: contact.is_primary_contact || false,
              salutation: contact.salutation || ''
            })),
            
            // Sales Information
            sales: {
              assigned_agent_id: oldData.salesagent || firebase.salesperson_ids?.[0] || '',
              assigned_agent_name: oldData._salesagent_name || '',
              salesperson_zoho_id: oldData._salesagent_zoho_sp_id || firebase.salesperson_ids?.[0] || '',
              sales_channel: zoho.sales_channel || 'direct_sales',
              salesperson_names: firebase.salesperson_names || []
            },
            
            // Status
            status: determineStatus(zoho.status, firebase.last_order_date),
            customer_type: zoho.customer_sub_type || 'business',
            customer_sub_type: zoho.customer_sub_type || 'business',
            
            // System Fields
            created_date: zoho.created_time ? 
              admin.firestore.Timestamp.fromDate(new Date(zoho.created_time)) : 
              admin.firestore.Timestamp.now(),
            created_by: 'migration_script',
            last_modified: zoho.last_modified_time ? 
              admin.firestore.Timestamp.fromDate(new Date(zoho.last_modified_time)) : 
              admin.firestore.Timestamp.now(),
            updated_by: 'migration_script',
            
            // Sync Information
            sync: {
              last_synced: oldData._lastSynced || oldData.last_synced || admin.firestore.Timestamp.now(),
              sync_status: oldData.sync_status || 'success',
              sync_source: oldData._source || 'zoho_inventory',
              zoho_last_modified: zoho.last_modified_time || null,
              last_enriched: oldData._enriched_at || null
            },
            
            // Additional fields
            notes: zoho.notes || '',
            tags: zoho.tags || [],
            custom_fields: zoho.custom_fields || {},
            
            // Migration Metadata
            _migration: {
              migrated_from: 'customer_data',
              migration_date: admin.firestore.Timestamp.now(),
              original_doc_id: doc.id,
              migration_version: '1.0',
              update_count: 0
            }
          };
          
          batch.set(customerRef, newCustomer);
          stats.customers.created++;
        }
        
        cache.customers.set(oldData.firebase_uid || doc.id, customerId);
        
        batchCount++;
        
        if (batchCount >= CONFIG.BATCH_SIZE) {
          await processBatch(batch);
          batch = db.batch(); // Create new batch
          batchCount = 0;
        }
        
      } catch (error) {
        log(`Error migrating customer ${doc.id}: ${error.message}`, 'error');
        stats.customers.errors++;
      }
      
      stats.customers.processed++;
      
      if (stats.customers.processed % 100 === 0) {
        log(`Progress: ${stats.customers.processed}/${customersSnapshot.size} customers processed`);
      }
    }
    
    if (batchCount > 0) {
      await processBatch(batch);
    }
    
    log(`Customer migration completed: ${stats.customers.created} created, ${stats.customers.updated} updated, ${stats.customers.errors} errors`, 'success');
    
  } catch (error) {
    log(`Customer migration error: ${error.message}`, 'error');
  }
}

// ============================================================
// VENDOR MIGRATION (WITH PREDEFINED SUPPORT)
// ============================================================

async function extractAndCreateVendors() {
  log('Starting vendor extraction and migration...');
  
  try {
    // First, clear and populate predefined vendors
    await clearAndPopulateVendors();
    
    // Get unique vendors from existing items
    const itemsSnapshot = await db.collection('items').get();
    const vendorMap = new Map(); // vendor_name -> vendor stats
    
    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      // Normalize vendor name from various fields
      const vendorName = data.vendor_name || data.Manufacturer || data.manufacturer || data.brand || data.cf_brand || 'Unknown Vendor';
      
      if (vendorName && vendorName !== 'Unknown Vendor') {
        // Check if this vendor already exists in predefined list
        const existingVendorId = cache.vendors.get(vendorName) || 
                                cache.vendors.get(vendorName.toLowerCase()) ||
                                cache.vendors.get(vendorName.replace(/\s+/g, '-').toLowerCase());
        
        if (!existingVendorId) {
          // Only add if not predefined
          if (!vendorMap.has(vendorName)) {
            vendorMap.set(vendorName, {
              name: vendorName,
              itemCount: 0,
              skus: new Set(),
              categories: new Set(),
              totalStockValue: 0,
              vendorInfo: {}
            });
          }
          
          const vendorStats = vendorMap.get(vendorName);
          vendorStats.itemCount++;
          
          // Collect SKUs
          if (data.sku) {
            vendorStats.skus.add(data.sku);
          }
          
          // Collect categories
          const category = data.category || data.group_name || 'Uncategorized';
          vendorStats.categories.add(category);
          
          // Calculate total stock value
          const stockQty = parseInt(data.stock_on_hand || 0);
          const price = parseFloat(data.purchase_rate || data.cost || 0);
          vendorStats.totalStockValue += (stockQty * price);
          
          // Collect vendor contact info if available
          if (data.vendor_id || data.vendor_email || data.vendor_phone) {
            vendorStats.vendorInfo = {
              zoho_vendor_id: data.vendor_id,
              email: data.vendor_email,
              phone: data.vendor_phone
            };
          }
        }
      }
    });
    
    log(`Found ${vendorMap.size} additional unique vendors (not predefined)`);
    
    let batch = db.batch();
    let batchCount = 0;
    
    for (const [vendorName, vendorStats] of vendorMap) {
      const vendorId = generateVendorId();
      const vendorRef = db.collection(COLLECTIONS.vendors).doc(vendorId);
      
      const vendor = {
        id: vendorId,
        vendor_id: vendorId,
        vendor_name: vendorName,
        vendor_location: 'Unknown',
        vendor_address: {
          street_1: '',
          city: '',
          postcode: '',
          country: 'GB' // Default to UK
        },
        vendor_contacts: [{
          venc_id: `VENC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          venc_name: 'Primary Contact',
          venc_phone: vendorStats.vendorInfo.phone || '',
          venc_email: vendorStats.vendorInfo.email || '',
          venc_primary: true,
          venc_created: admin.firestore.Timestamp.now()
        }],
        vendor_status: 'active',
        vendor_bank_name: '',
        vendor_bank_sortcode: '',
        vendor_bank_acc: '',
        vendor_bank_vat: '',
        vendor_bank_verified: false,
        
        // Vendor Statistics
        vendor_stats: {
          total_items: vendorStats.itemCount,
          active_items: vendorStats.itemCount,
          inactive_items: 0,
          total_skus: vendorStats.skus.size,
          categories: Array.from(vendorStats.categories),
          total_stock_value: vendorStats.totalStockValue,
          average_item_value: vendorStats.itemCount > 0 ? vendorStats.totalStockValue / vendorStats.itemCount : 0
        },
        
        vendor_performance: {
          total_ordered: 0,
          total_received: 0,
          on_time_delivery_rate: 0,
          quality_rating: 0,
          last_order_date: null
        },
        
        created_date: admin.firestore.Timestamp.now(),
        created_by: 'migration_script',
        updated_by: 'migration_script',
        last_modified: admin.firestore.Timestamp.now(),
        _migrated_from_zoho: true,
        _original_zoho_id: vendorStats.vendorInfo.zoho_vendor_id,
        _discovered_from_items: true
      };
      
      batch.set(vendorRef, vendor);
      cache.vendors.set(vendorName, vendorId);
      
      batchCount++;
      stats.vendors.created++;
      
      if (batchCount >= CONFIG.BATCH_SIZE) {
        await processBatch(batch);
        batch = db.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await processBatch(batch);
    }
    
    log(`Vendor migration completed: ${PREDEFINED_VENDORS.length} predefined + ${stats.vendors.created} discovered = ${PREDEFINED_VENDORS.length + stats.vendors.created} total vendors`, 'success');
    
  } catch (error) {
    log(`Vendor migration error: ${error.message}`, 'error');
    stats.vendors.errors++;
  }
}

// ============================================================
// CATEGORY MIGRATION
// ============================================================

async function extractAndCreateCategories() {
  log('Starting category extraction and migration...');
  
  try {
    const itemsSnapshot = await db.collection('items').get();
    const categorySet = new Set();
    
    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      const category = data.category || data.group_name || 'Uncategorized';
      if (category) {
        categorySet.add(category);
      }
    });
    
    log(`Found ${categorySet.size} unique categories`);
    
    let batch = db.batch();
    let batchCount = 0;
    
    for (const categoryName of categorySet) {
      const categoryId = generateCategoryId();
      const categoryRef = db.collection(COLLECTIONS.item_categories).doc(categoryId);
      
      const category = {
        id: categoryId,
        category_id: categoryId,
        category_name: categoryName,
        description: '',
        is_active: true,
        created_date: admin.firestore.Timestamp.now(),
        created_by: 'migration_script',
        _migrated_from_zoho: true
      };
      
      batch.set(categoryRef, category);
      cache.categories.set(categoryName, categoryId);
      
      batchCount++;
      stats.categories.created++;
      
      if (batchCount >= CONFIG.BATCH_SIZE) {
        await processBatch(batch);
        batch = db.batch(); // Create new batch
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await processBatch(batch);
    }
    
    log(`Category migration completed: ${stats.categories.created} categories created`, 'success');
    
  } catch (error) {
    log(`Category migration error: ${error.message}`, 'error');
    stats.categories.errors++;
  }
}

// ============================================================
// ITEM MIGRATION (WITH UPDATE SUPPORT)
// ============================================================

async function migrateItems() {
  log('Starting item migration...');
  
  try {
    const itemsSnapshot = await db.collection('items').get();
    log(`Found ${itemsSnapshot.size} items to migrate`);
    
    let batch = db.batch();
    let batchCount = 0;
    
    // Track vendor item counts for updating vendor stats
    const vendorItemCounts = new Map();
    
    for (const doc of itemsSnapshot.docs) {
      try {
        const oldData = doc.data();
        
        // Check if item already exists in new collection by SKU or original ID
        let existingItemId = null;
        let existingItemData = null;
        
        // First check by SKU
        if (oldData.sku) {
          const skuQuery = await db.collection(COLLECTIONS.items)
            .where('sku', '==', oldData.sku)
            .limit(1)
            .get();
          
          if (!skuQuery.empty) {
            existingItemId = skuQuery.docs[0].id;
            existingItemData = skuQuery.docs[0].data();
          }
        }
        
        // If not found by SKU, check by original Firebase ID
        if (!existingItemId) {
          const originalIdQuery = await db.collection(COLLECTIONS.items)
            .where('_original_firebase_id', '==', doc.id)
            .limit(1)
            .get();
          
          if (!originalIdQuery.empty) {
            existingItemId = originalIdQuery.docs[0].id;
            existingItemData = originalIdQuery.docs[0].data();
          }
        }
        
        const itemId = existingItemId || generateItemId();
        const itemRef = db.collection(COLLECTIONS.items).doc(itemId);
        
        // Get vendor name and IDs
        const vendorName = oldData.vendor_name || oldData.Manufacturer || oldData.manufacturer || oldData.brand || oldData.cf_brand || 'Unknown Vendor';
        const categoryName = oldData.category || oldData.group_name || 'Uncategorized';
        
        const vendorId = cache.vendors.get(vendorName) || 
                        cache.vendors.get(vendorName.toLowerCase()) ||
                        cache.vendors.get(vendorName.replace(/\s+/g, '-').toLowerCase());
        const categoryId = cache.categories.get(categoryName);
        
        // Track vendor item counts
        if (vendorId) {
          if (!vendorItemCounts.has(vendorId)) {
            vendorItemCounts.set(vendorId, { active: 0, inactive: 0 });
          }
          const counts = vendorItemCounts.get(vendorId);
          if (oldData.status === 'active') {
            counts.active++;
          } else {
            counts.inactive++;
          }
        }
        
        if (existingItemId) {
          // Update existing item with only changed fields
          const updates = {
            // Update stock levels
            stock_total: parseInt(oldData.stock_on_hand || 0),
            stock_committed: parseInt(oldData.committed_stock || oldData.cf_committed_stock || 0),
            stock_available: parseInt(oldData.available_stock || oldData.actual_available_stock || 0),
            
            // Update pricing if changed
            purchase_price: parseFloat(oldData.purchase_rate || oldData.cost || 0),
            retail_price: parseFloat(oldData.rate || oldData.selling_price || 0),
            
            // Update status
            status: oldData.status || 'active',
            
            // Update reorder level
            reorder_level: parseInt(oldData.reorder_level || 0),
            
            // Update modification info
            last_modified: admin.firestore.Timestamp.now(),
            updated_by: 'migration_script',
            
            // Update migration metadata
            '_migration.last_updated': admin.firestore.Timestamp.now(),
            '_migration.update_count': admin.firestore.FieldValue.increment(1)
          };
          
          // Only update vendor if it changed
          if (vendorId && vendorId !== existingItemData.vendor_id) {
            updates.vendor_id = vendorId;
            updates.vendor_name = vendorName;
          }
          
          // Only update category if it changed
          if (categoryId && categoryId !== existingItemData.category_id) {
            updates.category_id = categoryId;
            updates.category_name = categoryName;
          }
          
          batch.update(itemRef, updates);
          stats.items.updated++;
          
        } else {
          // Create new item
          const newItem = {
            id: itemId,
            item_id: itemId,
            vendor_name: vendorName,
            vendor_id: vendorId,
            item_name: oldData.name || oldData.item_name || '',
            item_description: oldData.description || '',
            item_imgs: oldData.images || [],
            stock_total: parseInt(oldData.stock_on_hand || 0),
            stock_committed: parseInt(oldData.committed_stock || oldData.cf_committed_stock || 0),
            stock_available: parseInt(oldData.available_stock || oldData.actual_available_stock || 0),
            category_id: categoryId || '',
            category_name: categoryName,
            created_date: oldData.created_time ? 
              admin.firestore.Timestamp.fromDate(new Date(oldData.created_time)) : 
              admin.firestore.Timestamp.now(),
            ean: oldData.ean || oldData.upc || '',
            dimensions: {
              length: parseFloat(oldData.length || 0),
              height: parseFloat(oldData.height || 0),
              width: parseFloat(oldData.width || 0),
              weight: parseFloat(oldData.weight || 0),
              dimension_unit: oldData.dimension_unit || 'cm',
              weight_unit: oldData.weight_unit || 'kg'
            },
            part_no: oldData.part_number || '',
            product_type: oldData.product_type || 'Goods',
            purchase_price: parseFloat(oldData.purchase_rate || oldData.cost || 0),
            retail_price: parseFloat(oldData.rate || oldData.selling_price || 0),
            reorder_level: parseInt(oldData.reorder_level || 0),
            estimated_delivery: parseInt(oldData.lead_time || 7),
            sku: oldData.sku || '',
            status: oldData.status || 'active',
            tax: {
              tax_rate: parseFloat(oldData.tax_percentage || 20),
              tax_exempt: oldData.is_taxable === false,
              tax_name: oldData.tax_name || 'Standard Rate',
              tax_type: oldData.tax_type || 'ItemAmount'
            },
            minimum_order_qty: parseInt(oldData.minimum_order_quantity || 1),
            variable_pricing: false,
            is_returnable: oldData.is_returnable || true,
            created_by: oldData.created_by || 'migration_script',
            updated_by: 'migration_script',
            last_modified: admin.firestore.Timestamp.now(),
            _original_brand: oldData.brand || oldData.cf_brand || '',
            _original_manufacturer: oldData.manufacturer || '',
            _migration: {
              migrated_from_zoho: true,
              migration_date: admin.firestore.Timestamp.now(),
              original_zoho_id: oldData.item_id || doc.id,
              original_firebase_id: doc.id,
              update_count: 0
            }
          };
          
          batch.set(itemRef, newItem);
          stats.items.created++;
        }
        
        cache.items.set(oldData.item_id || doc.id, itemId);
        
        batchCount++;
        
        if (batchCount >= CONFIG.BATCH_SIZE) {
          await processBatch(batch);
          batch = db.batch(); // Create new batch
          batchCount = 0;
        }
        
      } catch (error) {
        log(`Error migrating item ${doc.id}: ${error.message}`, 'error');
        stats.items.errors++;
      }
      
      stats.items.processed++;
      
      if (stats.items.processed % 100 === 0) {
        log(`Progress: ${stats.items.processed}/${itemsSnapshot.size} items processed`);
      }
    }
    
    if (batchCount > 0) {
      await processBatch(batch);
    }
    
    // Update vendor statistics
    if (!CONFIG.DRY_RUN) {
      await updateVendorStatistics(vendorItemCounts);
    }
    
    log(`Item migration completed: ${stats.items.created} created, ${stats.items.updated} updated, ${stats.items.errors} errors`, 'success');
    
  } catch (error) {
    log(`Item migration error: ${error.message}`, 'error');
  }
}

// Helper function to update vendor statistics
async function updateVendorStatistics(vendorItemCounts) {
  log('Updating vendor item counts...');
  let vendorUpdateBatch = db.batch();
  let vendorUpdateCount = 0;
  
  for (const [vendorId, counts] of vendorItemCounts) {
    const vendorRef = db.collection(COLLECTIONS.vendors).doc(vendorId);
    vendorUpdateBatch.update(vendorRef, {
      'vendor_stats.active_items': counts.active,
      'vendor_stats.inactive_items': counts.inactive,
      'vendor_stats.total_items': counts.active + counts.inactive,
      'last_modified': admin.firestore.Timestamp.now()
    });
    
    vendorUpdateCount++;
    if (vendorUpdateCount >= CONFIG.BATCH_SIZE) {
      await vendorUpdateBatch.commit();
      vendorUpdateBatch = db.batch(); // Create new batch
      vendorUpdateCount = 0;
    }
  }
  
  if (vendorUpdateCount > 0) {
    await vendorUpdateBatch.commit();
  }
  log('Vendor item counts updated', 'success');
}

// ============================================================
// SALES ORDER MIGRATION (WITH UPDATE SUPPORT)
// ============================================================

async function migrateSalesOrders() {
  log('Starting sales order migration...');
  
  try {
    const ordersSnapshot = await db.collection('salesorders').get();
    log(`Found ${ordersSnapshot.size} sales orders to migrate`);
    
    for (const doc of ordersSnapshot.docs) {
      try {
        const oldOrder = doc.data();
        
        // Check if order already exists by salesorder_number or original ID
        let existingOrderId = null;
        let existingOrderData = null;
        
        // First check by salesorder_number
        if (oldOrder.salesorder_number) {
          const orderNumberQuery = await db.collection(COLLECTIONS.sales_orders)
            .where('sales_order_number', '==', oldOrder.salesorder_number)
            .limit(1)
            .get();
          
          if (!orderNumberQuery.empty) {
            existingOrderId = orderNumberQuery.docs[0].id;
            existingOrderData = orderNumberQuery.docs[0].data();
          }
        }
        
        // If not found by order number, check by original Firebase ID
        if (!existingOrderId) {
          const originalIdQuery = await db.collection(COLLECTIONS.sales_orders)
            .where('_original_firebase_id', '==', doc.id)
            .limit(1)
            .get();
          
          if (!originalIdQuery.empty) {
            existingOrderId = originalIdQuery.docs[0].id;
            existingOrderData = originalIdQuery.docs[0].data();
          }
        }
        
        const orderId = existingOrderId || generateSalesOrderId();
        const orderRef = db.collection(COLLECTIONS.sales_orders).doc(orderId);
        
        // Map customer ID
        const mappedCustomerId = cache.customers.get(oldOrder.customer_id) || oldOrder.customer_id;
        
        if (existingOrderId) {
          // Update existing order with only changed fields
          const updates = {
            // Update status (most likely to change)
            status: mapOrderStatus(oldOrder.status),
            
            // Update financial totals (in case of adjustments)
            subtotal: parseFloat(oldOrder.sub_total || 0),
            tax_total: parseFloat(oldOrder.tax_total || 0),
            shipping_charge: parseFloat(oldOrder.shipping_charge || 0),
            discount_total: parseFloat(oldOrder.discount || 0),
            total: parseFloat(oldOrder.total || 0),
            
            // Update delivery information
            delivery_date: oldOrder.delivery_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldOrder.delivery_date)) : 
              existingOrderData.delivery_date,
            
            // Update notes if they've changed
            notes: oldOrder.notes || existingOrderData.notes || '',
            internal_notes: oldOrder.internal_notes || existingOrderData.internal_notes || '',
            
            // Update modification tracking
            updated_at: admin.firestore.Timestamp.now(),
            
            // Update migration metadata
            '_migration.last_updated': admin.firestore.Timestamp.now(),
            '_migration.update_count': admin.firestore.FieldValue.increment(1)
          };
          
          // Only update customer if it's different and we have a mapping
          if (mappedCustomerId !== oldOrder.customer_id && mappedCustomerId !== existingOrderData.customer_id) {
            updates.customer_id = mappedCustomerId;
          }
          
          // Update addresses only if they're different
          if (oldOrder.shipping_address && JSON.stringify(oldOrder.shipping_address) !== JSON.stringify(existingOrderData.shipping_address)) {
            updates.shipping_address = oldOrder.shipping_address;
          }
          if (oldOrder.billing_address && JSON.stringify(oldOrder.billing_address) !== JSON.stringify(existingOrderData.billing_address)) {
            updates.billing_address = oldOrder.billing_address;
          }
          
          if (!CONFIG.DRY_RUN) {
            await orderRef.update(updates);
            
            // Handle line items - check if they need updating
            await updateSalesOrderLineItems(orderRef, oldOrder.line_items, existingOrderData);
          }
          
          stats.sales_orders.updated++;
          
        } else {
          // Create new order
          const newOrder = {
            id: orderId,
            sales_order_id: orderId,
            sales_order_number: oldOrder.salesorder_number || oldOrder.order_number,
            customer_id: mappedCustomerId,
            customer_name: oldOrder.customer_name,
            order_date: oldOrder.date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldOrder.date)) : 
              admin.firestore.Timestamp.now(),
            delivery_date: oldOrder.delivery_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldOrder.delivery_date)) : 
              null,
            status: mapOrderStatus(oldOrder.status),
            payment_terms: oldOrder.payment_terms || 'Net 30',
            currency_code: oldOrder.currency_code || 'GBP',
            subtotal: parseFloat(oldOrder.sub_total || 0),
            tax_total: parseFloat(oldOrder.tax_total || 0),
            shipping_charge: parseFloat(oldOrder.shipping_charge || 0),
            discount_total: parseFloat(oldOrder.discount || 0),
            total: parseFloat(oldOrder.total || 0),
            notes: oldOrder.notes || '',
            internal_notes: oldOrder.internal_notes || '',
            shipping_address: oldOrder.shipping_address || {},
            billing_address: oldOrder.billing_address || {},
            salesperson_id: oldOrder.salesperson_id,
            salesperson_name: oldOrder.salesperson_name,
            created_by: oldOrder.created_by || 'migration_script',
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            _migration: {
              migrated_from_zoho: true,
              migration_date: admin.firestore.Timestamp.now(),
              original_zoho_id: oldOrder.salesorder_id || doc.id,
              original_firebase_id: doc.id,
              update_count: 0
            }
          };
          
          if (!CONFIG.DRY_RUN) {
            await orderRef.set(newOrder);
            
            // Create line items
            if (oldOrder.line_items && Array.isArray(oldOrder.line_items)) {
              await createSalesOrderLineItems(orderRef, oldOrder.line_items);
            }
          }
          
          stats.sales_orders.created++;
        }
        
      } catch (error) {
        log(`Error migrating order ${doc.id}: ${error.message}`, 'error');
        stats.sales_orders.errors++;
      }
      
      stats.sales_orders.processed++;
      
      if (stats.sales_orders.processed % 50 === 0) {
        log(`Progress: ${stats.sales_orders.processed}/${ordersSnapshot.size} orders processed`);
      }
    }
    
    log(`Sales order migration completed: ${stats.sales_orders.created} created, ${stats.sales_orders.updated} updated, ${stats.sales_orders.errors} errors`, 'success');
    
  } catch (error) {
    log(`Sales order migration error: ${error.message}`, 'error');
  }
}

// Helper function to create sales order line items
async function createSalesOrderLineItems(orderRef, lineItems) {
  if (!lineItems || !Array.isArray(lineItems)) return;
  
  const itemsBatch = db.batch();
  
  lineItems.forEach((item, index) => {
    const lineItemRef = orderRef.collection(COLLECTIONS.sales_order_items).doc();
    
    // Map old item_id to new item_id
    const newItemId = cache.items.get(item.item_id) || item.item_id;
    
    const lineItem = {
      id: lineItemRef.id,
      item_id: newItemId,
      item_name: item.name || item.item_name || '',
      sku: item.sku || '',
      description: item.description || '',
      quantity: parseInt(item.quantity || 0),
      unit: item.unit || 'pcs',
      unit_price: parseFloat(item.rate || item.price || 0),
      discount_amount: parseFloat(item.discount || 0),
      tax_amount: parseFloat(item.tax_amount || 0),
      total_price: parseFloat(item.item_total || item.total || 0),
      sort_order: index,
      _original_item_id: item.item_id,
      created_at: admin.firestore.Timestamp.now()
    };
    
    itemsBatch.set(lineItemRef, lineItem);
  });
  
  await itemsBatch.commit();
}

// Helper function to update sales order line items
async function updateSalesOrderLineItems(orderRef, newLineItems, existingOrderData) {
  if (!newLineItems || !Array.isArray(newLineItems)) return;
  
  // Get existing line items
  const existingItemsSnapshot = await orderRef.collection(COLLECTIONS.sales_order_items).get();
  const existingItems = new Map();
  
  existingItemsSnapshot.docs.forEach(doc => {
    const data = doc.data();
    // Create a key based on item_id and SKU
    const key = `${data._original_item_id || data.item_id}_${data.sku}`;
    existingItems.set(key, { id: doc.id, data });
  });
  
  const batch = db.batch();
  let hasChanges = false;
  
  // Process new line items
  for (let index = 0; index < newLineItems.length; index++) {
    const item = newLineItems[index];
    const itemKey = `${item.item_id}_${item.sku || ''}`;
    const existingItem = existingItems.get(itemKey);
    
    const newItemId = cache.items.get(item.item_id) || item.item_id;
    
    if (existingItem) {
      // Check if update is needed
      const needsUpdate = 
        existingItem.data.quantity !== parseInt(item.quantity || 0) ||
        existingItem.data.unit_price !== parseFloat(item.rate || item.price || 0) ||
        existingItem.data.discount_amount !== parseFloat(item.discount || 0) ||
        existingItem.data.tax_amount !== parseFloat(item.tax_amount || 0) ||
        existingItem.data.total_price !== parseFloat(item.item_total || item.total || 0) ||
        existingItem.data.item_id !== newItemId;
      
      if (needsUpdate) {
        const lineItemRef = orderRef.collection(COLLECTIONS.sales_order_items).doc(existingItem.id);
        batch.update(lineItemRef, {
          item_id: newItemId,
          quantity: parseInt(item.quantity || 0),
          unit_price: parseFloat(item.rate || item.price || 0),
          discount_amount: parseFloat(item.discount || 0),
          tax_amount: parseFloat(item.tax_amount || 0),
          total_price: parseFloat(item.item_total || item.total || 0),
          sort_order: index,
          updated_at: admin.firestore.Timestamp.now()
        });
        hasChanges = true;
      }
      
      // Remove from map to track what's been processed
      existingItems.delete(itemKey);
      
    } else {
      // New line item - create it
      const lineItemRef = orderRef.collection(COLLECTIONS.sales_order_items).doc();
      const lineItem = {
        id: lineItemRef.id,
        item_id: newItemId,
        item_name: item.name || item.item_name || '',
        sku: item.sku || '',
        description: item.description || '',
        quantity: parseInt(item.quantity || 0),
        unit: item.unit || 'pcs',
        unit_price: parseFloat(item.rate || item.price || 0),
        discount_amount: parseFloat(item.discount || 0),
        tax_amount: parseFloat(item.tax_amount || 0),
        total_price: parseFloat(item.item_total || item.total || 0),
        sort_order: index,
        _original_item_id: item.item_id,
        created_at: admin.firestore.Timestamp.now()
      };
      
      batch.set(lineItemRef, lineItem);
      hasChanges = true;
    }
  }
  
  // Delete any line items that are no longer in the order
  for (const [key, existingItem] of existingItems) {
    const lineItemRef = orderRef.collection(COLLECTIONS.sales_order_items).doc(existingItem.id);
    batch.delete(lineItemRef);
    hasChanges = true;
  }
  
  if (hasChanges) {
    await batch.commit();
  }
}

// ============================================================
// INVOICE MIGRATION (WITH UPDATE SUPPORT)
// ============================================================

async function migrateInvoices() {
  log('Starting invoice migration...');
  
  try {
    const invoicesSnapshot = await db.collection('invoices').get();
    log(`Found ${invoicesSnapshot.size} invoices to migrate`);
    
    for (const doc of invoicesSnapshot.docs) {
      try {
        const oldInvoice = doc.data();
        
        // Check if invoice already exists by invoice_number or original ID
        let existingInvoiceId = null;
        let existingInvoiceData = null;
        
        // First check by invoice_number
        if (oldInvoice.invoice_number) {
          const invoiceNumberQuery = await db.collection(COLLECTIONS.invoices)
            .where('invoice_number', '==', oldInvoice.invoice_number)
            .limit(1)
            .get();
          
          if (!invoiceNumberQuery.empty) {
            existingInvoiceId = invoiceNumberQuery.docs[0].id;
            existingInvoiceData = invoiceNumberQuery.docs[0].data();
          }
        }
        
        // If not found by invoice number, check by original Firebase ID
        if (!existingInvoiceId) {
          const originalIdQuery = await db.collection(COLLECTIONS.invoices)
            .where('_original_firebase_id', '==', doc.id)
            .limit(1)
            .get();
          
          if (!originalIdQuery.empty) {
            existingInvoiceId = originalIdQuery.docs[0].id;
            existingInvoiceData = originalIdQuery.docs[0].data();
          }
        }
        
        const invoiceId = existingInvoiceId || generateInvoiceId();
        const invoiceRef = db.collection(COLLECTIONS.invoices).doc(invoiceId);
        
        // Map customer ID
        const mappedCustomerId = cache.customers.get(oldInvoice.customer_id) || oldInvoice.customer_id;
        
        if (existingInvoiceId) {
          // Update existing invoice
          const updates = {
            // Update status
            status: mapInvoiceStatus(oldInvoice.status),
            payment_status: oldInvoice.payment_status || 'unpaid',
            
            // Update financial totals
            balance: parseFloat(oldInvoice.balance || oldInvoice.total || 0),
            
            // Update dates
            due_date: oldInvoice.due_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldInvoice.due_date)) : 
              existingInvoiceData.due_date,
            
            // Update modification tracking
            updated_at: admin.firestore.Timestamp.now(),
            
            // Update migration metadata
            '_migration.last_updated': admin.firestore.Timestamp.now(),
            '_migration.update_count': admin.firestore.FieldValue.increment(1)
          };
          
          // Only update customer if it's different
          if (mappedCustomerId !== oldInvoice.customer_id && mappedCustomerId !== existingInvoiceData.customer_id) {
            updates.customer_id = mappedCustomerId;
          }
          
          if (!CONFIG.DRY_RUN) {
            await invoiceRef.update(updates);
          }
          
          stats.invoices.updated++;
          
        } else {
          // Create new invoice
          const newInvoice = {
            id: invoiceId,
            invoice_id: invoiceId,
            invoice_number: oldInvoice.invoice_number,
            sales_order_id: oldInvoice.salesorder_id || '',
            customer_id: mappedCustomerId,
            customer_name: oldInvoice.customer_name,
            invoice_date: oldInvoice.date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldInvoice.date)) : 
              admin.firestore.Timestamp.now(),
            due_date: oldInvoice.due_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldInvoice.due_date)) : 
              admin.firestore.Timestamp.now(),
            status: mapInvoiceStatus(oldInvoice.status),
            payment_status: oldInvoice.payment_status || 'unpaid',
            currency_code: oldInvoice.currency_code || 'GBP',
            subtotal: parseFloat(oldInvoice.sub_total || 0),
            tax_total: parseFloat(oldInvoice.tax_total || 0),
            shipping_charge: parseFloat(oldInvoice.shipping_charge || 0),
            discount_total: parseFloat(oldInvoice.discount || 0),
            total: parseFloat(oldInvoice.total || 0),
            balance: parseFloat(oldInvoice.balance || oldInvoice.total || 0),
            payment_terms: oldInvoice.payment_terms || 'Net 30',
            notes: oldInvoice.notes || '',
            shipping_address: oldInvoice.shipping_address || {},
            billing_address: oldInvoice.billing_address || {},
            salesperson_id: oldInvoice.salesperson_id,
            salesperson_name: oldInvoice.salesperson_name,
            created_by: oldInvoice.created_by || 'migration_script',
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            _migration: {
              migrated_from_zoho: true,
              migration_date: admin.firestore.Timestamp.now(),
              original_zoho_id: oldInvoice.invoice_id || doc.id,
              original_firebase_id: doc.id,
              update_count: 0
            }
          };
          
          if (!CONFIG.DRY_RUN) {
            await invoiceRef.set(newInvoice);
            
            // Migrate line items
            if (oldInvoice.line_items && Array.isArray(oldInvoice.line_items)) {
              const itemsBatch = db.batch();
              
              oldInvoice.line_items.forEach((item, index) => {
                const lineItemRef = invoiceRef.collection(COLLECTIONS.invoice_items).doc();
                
                const newItemId = cache.items.get(item.item_id) || item.item_id;
                
                const lineItem = {
                  id: lineItemRef.id,
                  item_id: newItemId,
                  item_name: item.name || item.item_name || '',
                  sku: item.sku || '',
                  description: item.description || '',
                  quantity: parseInt(item.quantity || 0),
                  unit: item.unit || 'pcs',
                  unit_price: parseFloat(item.rate || item.price || 0),
                  discount_amount: parseFloat(item.discount || 0),
                  tax_amount: parseFloat(item.tax_amount || 0),
                  total_price: parseFloat(item.item_total || item.total || 0),
                  sort_order: index,
                  _original_item_id: item.item_id
                };
                
                itemsBatch.set(lineItemRef, lineItem);
              });
              
              await itemsBatch.commit();
            }
          }
          
          stats.invoices.created++;
        }
        
      } catch (error) {
        log(`Error migrating invoice ${doc.id}: ${error.message}`, 'error');
        stats.invoices.errors++;
      }
      
      stats.invoices.processed++;
      
      if (stats.invoices.processed % 50 === 0) {
        log(`Progress: ${stats.invoices.processed}/${invoicesSnapshot.size} invoices processed`);
      }
    }
    
    log(`Invoice migration completed: ${stats.invoices.created} created, ${stats.invoices.updated} updated, ${stats.invoices.errors} errors`, 'success');
    
  } catch (error) {
    log(`Invoice migration error: ${error.message}`, 'error');
  }
}

// ============================================================
// PURCHASE ORDER MIGRATION (WITH UPDATE SUPPORT)
// ============================================================

async function migratePurchaseOrders() {
  log('Starting purchase order migration...');
  
  try {
    const poSnapshot = await db.collection('purchaseorders').get();
    log(`Found ${poSnapshot.size} purchase orders to migrate`);
    
    for (const doc of poSnapshot.docs) {
      try {
        const oldPO = doc.data();
        
        // Check if PO already exists
        let existingPOId = null;
        let existingPOData = null;
        
        // First check by purchaseorder_number
        if (oldPO.purchaseorder_number) {
          const poNumberQuery = await db.collection(COLLECTIONS.purchase_orders)
            .where('purchase_order_number', '==', oldPO.purchaseorder_number)
            .limit(1)
            .get();
          
          if (!poNumberQuery.empty) {
            existingPOId = poNumberQuery.docs[0].id;
            existingPOData = poNumberQuery.docs[0].data();
          }
        }
        
        // If not found by PO number, check by original Firebase ID
        if (!existingPOId) {
          const originalIdQuery = await db.collection(COLLECTIONS.purchase_orders)
            .where('_original_firebase_id', '==', doc.id)
            .limit(1)
            .get();
          
          if (!originalIdQuery.empty) {
            existingPOId = originalIdQuery.docs[0].id;
            existingPOData = originalIdQuery.docs[0].data();
          }
        }
        
        const poId = existingPOId || generatePurchaseOrderId();
        const poRef = db.collection(COLLECTIONS.purchase_orders).doc(poId);
        
        // Get vendor ID from cache
        const vendorName = oldPO.vendor_name || 'Unknown Vendor';
        const vendorId = cache.vendors.get(vendorName) || 
                        cache.vendors.get(vendorName.toLowerCase()) ||
                        cache.vendors.get(vendorName.replace(/\s+/g, '-').toLowerCase());
        
        if (existingPOId) {
          // Update existing PO
          const updates = {
            // Update status
            status: mapPurchaseOrderStatus(oldPO.status),
            
            // Update expected delivery date
            expected_delivery_date: oldPO.expected_delivery_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldPO.expected_delivery_date)) : 
              existingPOData.expected_delivery_date,
            
            // Update modification tracking
            updated_at: admin.firestore.Timestamp.now(),
            
            // Update migration metadata
            '_migration.last_updated': admin.firestore.Timestamp.now(),
            '_migration.update_count': admin.firestore.FieldValue.increment(1)
          };
          
          // Only update vendor if it changed
          if (vendorId && vendorId !== existingPOData.vendor_id) {
            updates.vendor_id = vendorId;
          }
          
          if (!CONFIG.DRY_RUN) {
            await poRef.update(updates);
          }
          
          stats.purchase_orders.updated++;
          
        } else {
          // Create new PO
          const newPO = {
            id: poId,
            purchase_order_id: poId,
            purchase_order_number: oldPO.purchaseorder_number || oldPO.order_number,
            vendor_id: vendorId || oldPO.vendor_id,
            vendor_name: vendorName,
            order_date: oldPO.date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldPO.date)) : 
              admin.firestore.Timestamp.now(),
            expected_delivery_date: oldPO.expected_delivery_date ? 
              admin.firestore.Timestamp.fromDate(new Date(oldPO.expected_delivery_date)) : 
              null,
            status: mapPurchaseOrderStatus(oldPO.status),
            currency_code: oldPO.currency_code || 'GBP',
            subtotal: parseFloat(oldPO.sub_total || 0),
            tax_total: parseFloat(oldPO.tax_total || 0),
            total: parseFloat(oldPO.total || 0),
            notes: oldPO.notes || '',
            delivery_address: oldPO.delivery_address || {},
            created_by: oldPO.created_by || 'migration_script',
            created_at: admin.firestore.Timestamp.now(),
            updated_at: admin.firestore.Timestamp.now(),
            _migration: {
              migrated_from_zoho: true,
              migration_date: admin.firestore.Timestamp.now(),
              original_zoho_id: oldPO.purchaseorder_id || doc.id,
              original_firebase_id: doc.id,
              update_count: 0
            }
          };
          
          if (!CONFIG.DRY_RUN) {
            await poRef.set(newPO);
            
            // Migrate line items
            if (oldPO.line_items && Array.isArray(oldPO.line_items)) {
              const itemsBatch = db.batch();
              
              oldPO.line_items.forEach((item, index) => {
                const lineItemRef = poRef.collection(COLLECTIONS.purchase_order_items).doc();
                
                const newItemId = cache.items.get(item.item_id) || item.item_id;
                
                const lineItem = {
                  id: lineItemRef.id,
                  item_id: newItemId,
                  item_name: item.name || item.item_name || '',
                  sku: item.sku || '',
                  description: item.description || '',
                  quantity_ordered: parseInt(item.quantity || 0),
                  quantity_received: parseInt(item.quantity_received || 0),
                  unit: item.unit || 'pcs',
                  unit_cost: parseFloat(item.rate || item.cost || 0),
                  tax_amount: parseFloat(item.tax_amount || 0),
                  total_cost: parseFloat(item.item_total || item.total || 0),
                  sort_order: index,
                  _original_item_id: item.item_id
                };
                
                itemsBatch.set(lineItemRef, lineItem);
              });
              
              await itemsBatch.commit();
            }
          }
          
          stats.purchase_orders.created++;
        }
        
      } catch (error) {
        log(`Error migrating purchase order ${doc.id}: ${error.message}`, 'error');
        stats.purchase_orders.errors++;
      }
      
      stats.purchase_orders.processed++;
      
      if (stats.purchase_orders.processed % 50 === 0) {
        log(`Progress: ${stats.purchase_orders.processed}/${poSnapshot.size} purchase orders processed`);
      }
    }
    
    log(`Purchase order migration completed: ${stats.purchase_orders.created} created, ${stats.purchase_orders.updated} updated, ${stats.purchase_orders.errors} errors`, 'success');
    
  } catch (error) {
    log(`Purchase order migration error: ${error.message}`, 'error');
  }
}

// ============================================================
// STATUS MAPPING FUNCTIONS
// ============================================================

function mapOrderStatus(oldStatus) {
  const statusMap = {
    'draft': 'draft',
    'open': 'open',
    'confirmed': 'confirmed',
    'closed': 'delivered',
    'void': 'cancelled',
    'on_hold': 'on_hold'
  };
  
  return statusMap[oldStatus?.toLowerCase()] || 'open';
}

function mapInvoiceStatus(oldStatus) {
  const statusMap = {
    'draft': 'draft',
    'sent': 'sent',
    'paid': 'paid',
    'void': 'void',
    'overdue': 'overdue',
    'partially_paid': 'partially_paid'
  };
  
  return statusMap[oldStatus?.toLowerCase()] || 'sent';
}

function mapPurchaseOrderStatus(oldStatus) {
  const statusMap = {
    'draft': 'draft',
    'open': 'issued',
    'billed': 'billed',
    'cancelled': 'cancelled',
    'closed': 'received'
  };
  
  return statusMap[oldStatus?.toLowerCase()] || 'issued';
}

// ============================================================
// CLEANUP FUNCTION
// ============================================================

async function cleanupOldData() {
  if (!CONFIG.DELETE_OLD_DATA) {
    log('Skipping old data cleanup (use --delete-old flag to enable)', 'warning');
    return;
  }
  
  log('Starting cleanup of old data...', 'warning');
  
  const collectionsToDelete = ['salesorders', 'purchaseorders', 'customer_data'];
  
  for (const collectionName of collectionsToDelete) {
    try {
      const snapshot = await db.collection(collectionName).get();
      const batchSize = 500;
      const batches = [];
      
      snapshot.docs.forEach((doc, index) => {
        const batchIndex = Math.floor(index / batchSize);
        if (!batches[batchIndex]) {
          batches[batchIndex] = db.batch();
        }
        batches[batchIndex].delete(doc.ref);
      });
      
      for (const batch of batches) {
        await batch.commit();
      }
      
      log(`Deleted ${snapshot.size} documents from ${collectionName}`, 'success');
      
    } catch (error) {
      log(`Error cleaning up ${collectionName}: ${error.message}`, 'error');
    }
  }
}

// ============================================================
// MAIN MIGRATION FUNCTION
// ============================================================

async function runMigration() {
  console.log('🚀 Starting Firebase Inventory & Customer Migration');
  console.log('==============================================');
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Delete old data: ${CONFIG.DELETE_OLD_DATA ? 'YES' : 'NO'}`);
  console.log('==============================================\n');
  
  const startTime = Date.now();
  
  try {
    // Phase 0: Migrate customers first (they're referenced by orders)
    if (CONFIG.COLLECTIONS_TO_MIGRATE.customers) {
      await migrateCustomers();
    }
    
    // Phase 1: Extract and create reference data
    if (CONFIG.COLLECTIONS_TO_MIGRATE.vendors) {
      await extractAndCreateVendors();
    }
    
    if (CONFIG.COLLECTIONS_TO_MIGRATE.categories) {
      await extractAndCreateCategories();
    }
    
    // Phase 2: Migrate main data
    if (CONFIG.COLLECTIONS_TO_MIGRATE.items) {
      await migrateItems();
    }
    
    if (CONFIG.COLLECTIONS_TO_MIGRATE.sales_orders) {
      await migrateSalesOrders();
    }
    
    if (CONFIG.COLLECTIONS_TO_MIGRATE.invoices) {
      await migrateInvoices();
    }
    
    if (CONFIG.COLLECTIONS_TO_MIGRATE.purchase_orders) {
      await migratePurchaseOrders();
    }
    
    // Phase 3: Cleanup (if requested)
    if (!CONFIG.DRY_RUN && CONFIG.DELETE_OLD_DATA) {
      await cleanupOldData();
    }
    
    // Print final statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n==============================================');
    console.log('📊 MIGRATION COMPLETE - FINAL STATS');
    console.log('==============================================');
    console.log(`Duration: ${duration} seconds`);
    console.log('\nCustomers:');
    console.log(`  Processed: ${stats.customers.processed}`);
    console.log(`  Created: ${stats.customers.created}`);
    console.log(`  Updated: ${stats.customers.updated}`);
    console.log(`  Errors: ${stats.customers.errors}`);
    console.log('\nItems:');
    console.log(`  Processed: ${stats.items.processed}`);
    console.log(`  Created: ${stats.items.created}`);
    console.log(`  Updated: ${stats.items.updated}`);
    console.log(`  Errors: ${stats.items.errors}`);
    console.log('\nVendors:');
    console.log(`  Predefined: ${stats.vendors.predefined}`);
    console.log(`  Discovered: ${stats.vendors.created}`);
    console.log(`  Total: ${stats.vendors.predefined + stats.vendors.created}`);
    console.log(`  Errors: ${stats.vendors.errors}`);
    console.log('\nCategories:');
    console.log(`  Created: ${stats.categories.created}`);
    console.log(`  Errors: ${stats.categories.errors}`);
    console.log('\nSales Orders:');
    console.log(`  Processed: ${stats.sales_orders.processed}`);
    console.log(`  Created: ${stats.sales_orders.created}`);
    console.log(`  Updated: ${stats.sales_orders.updated}`);
    console.log(`  Errors: ${stats.sales_orders.errors}`);
    console.log('\nInvoices:');
    console.log(`  Processed: ${stats.invoices.processed}`);
    console.log(`  Created: ${stats.invoices.created}`);
    console.log(`  Updated: ${stats.invoices.updated}`);
    console.log(`  Errors: ${stats.invoices.errors}`);
    console.log('\nPurchase Orders:');
    console.log(`  Processed: ${stats.purchase_orders.processed}`);
    console.log(`  Created: ${stats.purchase_orders.created}`);
    console.log(`  Updated: ${stats.purchase_orders.updated}`);
    console.log(`  Errors: ${stats.purchase_orders.errors}`);
    
    if (CONFIG.DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no data was actually modified');
      console.log('Run without --dry-run flag to perform actual migration');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Show usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Firebase Inventory & Customer Migration Script
==============================================

Usage: node migrateToNewInventoryStructure.js [options]

Options:
  --dry-run       Run in dry-run mode (no data will be modified)
  --delete-old    Delete old collections after migration
  --help          Show this help message

Examples:
  # Dry run to see what would happen
  node migrateToNewInventoryStructure.js --dry-run
  
  # Run actual migration
  node migrateToNewInventoryStructure.js
  
  # Run migration and delete old data
  node migrateToNewInventoryStructure.js --delete-old
  `);
  process.exit(0);
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });