// Populate Sales Order Items from Zoho
// Fetches missing line items and populates Firebase subcollections
// server/src/scripts/populateSalesOrderItems.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load service account
const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuration
const CONFIG = {
  DRY_RUN: process.argv.includes('--dry-run'),
  BATCH_SIZE: 100,
  ZOHO_BASE_URL: 'https://inventory.zoho.com/api/v1',
  ZOHO_ORGANIZATION_ID: process.env.ZOHO_ORGANIZATION_ID,
  ZOHO_AUTH_TOKEN: process.env.ZOHO_AUTH_TOKEN,
  MAX_CONCURRENT_REQUESTS: 5
};

// Statistics tracking
const stats = {
  sales_orders_checked: 0,
  sales_orders_with_missing_items: 0,
  sales_orders_updated: 0,
  line_items_added: 0,
  errors: 0,
  zoho_requests: 0
};

// Cache for item mappings
const itemCache = new Map();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📊',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    zoho: '🔄'
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

// Rate limiting for Zoho API
class RateLimiter {
  constructor(maxRequests = 5, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async waitForSlot() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      if (waitTime > 0) {
        log(`Rate limiting: waiting ${waitTime}ms`, 'warning');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(CONFIG.MAX_CONCURRENT_REQUESTS, 1000);

// ============================================================
// ZOHO API FUNCTIONS
// ============================================================

async function fetchSalesOrderFromZoho(salesOrderId) {
  try {
    await rateLimiter.waitForSlot();
    
    const url = `${CONFIG.ZOHO_BASE_URL}/salesorders/${salesOrderId}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${CONFIG.ZOHO_AUTH_TOKEN}`,
        'orgId': CONFIG.ZOHO_ORGANIZATION_ID
      },
      params: {
        organization_id: CONFIG.ZOHO_ORGANIZATION_ID
      }
    });
    
    stats.zoho_requests++;
    
    if (response.data && response.data.salesorder) {
      return response.data.salesorder;
    }
    
    return null;
  } catch (error) {
    if (error.response?.status === 404) {
      log(`Sales order ${salesOrderId} not found in Zoho`, 'warning');
      return null;
    }
    
    log(`Error fetching sales order ${salesOrderId} from Zoho: ${error.message}`, 'error');
    throw error;
  }
}

async function fetchSalesOrderLineItemsFromZoho(salesOrderId) {
  try {
    await rateLimiter.waitForSlot();
    
    const url = `${CONFIG.ZOHO_BASE_URL}/salesorders/${salesOrderId}/lineitems`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${CONFIG.ZOHO_AUTH_TOKEN}`,
        'orgId': CONFIG.ZOHO_ORGANIZATION_ID
      },
      params: {
        organization_id: CONFIG.ZOHO_ORGANIZATION_ID
      }
    });
    
    stats.zoho_requests++;
    
    if (response.data && response.data.line_items) {
      return response.data.line_items;
    }
    
    return [];
  } catch (error) {
    if (error.response?.status === 404) {
      log(`Line items for sales order ${salesOrderId} not found in Zoho`, 'warning');
      return [];
    }
    
    log(`Error fetching line items for sales order ${salesOrderId} from Zoho: ${error.message}`, 'error');
    throw error;
  }
}

// ============================================================
// FIREBASE FUNCTIONS
// ============================================================

async function getItemMapping(zohoItemId) {
  // Check cache first
  if (itemCache.has(zohoItemId)) {
    return itemCache.get(zohoItemId);
  }
  
  try {
    // Look for item by original Zoho ID
    const itemsSnapshot = await db.collection('items')
      .where('_migration.original_zoho_id', '==', zohoItemId)
      .limit(1)
      .get();
    
    if (!itemsSnapshot.empty) {
      const itemDoc = itemsSnapshot.docs[0];
      const itemData = itemDoc.data();
      const mapping = {
        newItemId: itemDoc.id,
        itemName: itemData.item_name,
        sku: itemData.sku
      };
      
      itemCache.set(zohoItemId, mapping);
      return mapping;
    }
    
    // If not found by original_zoho_id, try by _original_firebase_id
    const itemsSnapshot2 = await db.collection('items')
      .where('_migration.original_firebase_id', '==', zohoItemId)
      .limit(1)
      .get();
    
    if (!itemsSnapshot2.empty) {
      const itemDoc = itemsSnapshot2.docs[0];
      const itemData = itemDoc.data();
      const mapping = {
        newItemId: itemDoc.id,
        itemName: itemData.item_name,
        sku: itemData.sku
      };
      
      itemCache.set(zohoItemId, mapping);
      return mapping;
    }
    
    // If still not found, return null
    itemCache.set(zohoItemId, null);
    return null;
    
  } catch (error) {
    log(`Error getting item mapping for ${zohoItemId}: ${error.message}`, 'error');
    return null;
  }
}

async function checkSalesOrderHasLineItems(salesOrderRef) {
  try {
    const lineItemsSnapshot = await salesOrderRef.collection('sales_order_items').limit(1).get();
    return !lineItemsSnapshot.empty;
  } catch (error) {
    log(`Error checking line items for sales order: ${error.message}`, 'error');
    return false;
  }
}

async function populateSalesOrderLineItems(salesOrderRef, salesOrderData, zohoLineItems) {
  try {
    if (!zohoLineItems || zohoLineItems.length === 0) {
      log(`No line items found in Zoho for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    const batch = db.batch();
    let itemsAdded = 0;
    
    for (let index = 0; index < zohoLineItems.length; index++) {
      const zohoItem = zohoLineItems[index];
      
      // Get item mapping
      const itemMapping = await getItemMapping(zohoItem.item_id);
      
      if (!itemMapping) {
        log(`No item mapping found for Zoho item ${zohoItem.item_id} in sales order ${salesOrderData.sales_order_number}`, 'warning');
        continue;
      }
      
      // Create line item document
      const lineItemRef = salesOrderRef.collection('sales_order_items').doc();
      
      const lineItem = {
        id: lineItemRef.id,
        item_id: itemMapping.newItemId,
        item_name: zohoItem.name || itemMapping.itemName || '',
        sku: zohoItem.sku || itemMapping.sku || '',
        description: zohoItem.description || '',
        quantity: parseInt(zohoItem.quantity || 0),
        unit: zohoItem.unit || 'pcs',
        unit_price: parseFloat(zohoItem.rate || zohoItem.price || 0),
        discount_amount: parseFloat(zohoItem.discount || 0),
        tax_amount: parseFloat(zohoItem.tax_amount || 0),
        total_price: parseFloat(zohoItem.item_total || zohoItem.total || 0),
        sort_order: index,
        _original_item_id: zohoItem.item_id,
        _original_zoho_item_id: zohoItem.item_id,
        created_at: admin.firestore.Timestamp.now(),
        _populated_from_zoho: true,
        _population_date: admin.firestore.Timestamp.now()
      };
      
      batch.set(lineItemRef, lineItem);
      itemsAdded++;
    }
    
    if (itemsAdded > 0) {
      if (!CONFIG.DRY_RUN) {
        await batch.commit();
        log(`Added ${itemsAdded} line items to sales order ${salesOrderData.sales_order_number}`, 'success');
      } else {
        log(`DRY RUN: Would add ${itemsAdded} line items to sales order ${salesOrderData.sales_order_number}`, 'warning');
      }
      
      stats.line_items_added += itemsAdded;
      stats.sales_orders_updated++;
    }
    
  } catch (error) {
    log(`Error populating line items for sales order ${salesOrderData.sales_order_number}: ${error.message}`, 'error');
    stats.errors++;
  }
}

// ============================================================
// MAIN PROCESSING FUNCTIONS
// ============================================================

async function processSalesOrder(salesOrderDoc) {
  try {
    const salesOrderData = salesOrderDoc.data();
    stats.sales_orders_checked++;
    
    // Check if sales order has line items
    const hasLineItems = await checkSalesOrderHasLineItems(salesOrderDoc.ref);
    
    if (hasLineItems) {
      return; // Skip if already has line items
    }
    
    // Get Zoho ID from migration metadata
    const zohoId = salesOrderData._migration?.original_zoho_id;
    
    if (!zohoId) {
      log(`No Zoho ID found for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    stats.sales_orders_with_missing_items++;
    
    log(`Fetching line items for sales order ${salesOrderData.sales_order_number} (Zoho ID: ${zohoId})`, 'zoho');
    
    // Fetch line items from Zoho
    const zohoLineItems = await fetchSalesOrderLineItemsFromZoho(zohoId);
    
    if (zohoLineItems.length > 0) {
      await populateSalesOrderLineItems(salesOrderDoc.ref, salesOrderData, zohoLineItems);
    } else {
      log(`No line items found in Zoho for sales order ${salesOrderData.sales_order_number}`, 'warning');
    }
    
  } catch (error) {
    log(`Error processing sales order ${salesOrderDoc.id}: ${error.message}`, 'error');
    stats.errors++;
  }
}

async function processSalesOrdersBatch(salesOrdersSnapshot) {
  log(`Processing batch of ${salesOrdersSnapshot.docs.length} sales orders...`);
  
  // Process sales orders with limited concurrency to avoid overwhelming Zoho API
  const concurrencyLimit = 3;
  const chunks = [];
  
  for (let i = 0; i < salesOrdersSnapshot.docs.length; i += concurrencyLimit) {
    chunks.push(salesOrdersSnapshot.docs.slice(i, i + concurrencyLimit));
  }
  
  for (const chunk of chunks) {
    await Promise.all(chunk.map(doc => processSalesOrder(doc)));
    
    // Small delay between chunks to be respectful to Zoho API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function populateMissingSalesOrderItems() {
  console.log('🔄 Starting Sales Order Items Population from Zoho');
  console.log('==============================================');
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Zoho Organization ID: ${CONFIG.ZOHO_ORGANIZATION_ID ? 'Set' : 'NOT SET'}`);
  console.log(`Zoho Auth Token: ${CONFIG.ZOHO_AUTH_TOKEN ? 'Set' : 'NOT SET'}`);
  console.log('==============================================\n');
  
  if (!CONFIG.ZOHO_ORGANIZATION_ID || !CONFIG.ZOHO_AUTH_TOKEN) {
    console.error('❌ ZOHO_ORGANIZATION_ID and ZOHO_AUTH_TOKEN environment variables must be set');
    process.exit(1);
  }
  
  const startTime = Date.now();
  
  try {
    // Get all sales orders that were migrated from Zoho
    const salesOrdersSnapshot = await db.collection('sales_orders')
      .where('_migration.migrated_from_zoho', '==', true)
      .get();
    
    log(`Found ${salesOrdersSnapshot.size} sales orders migrated from Zoho`);
    
    // Process in batches
    const batchSize = CONFIG.BATCH_SIZE;
    const batches = [];
    
    for (let i = 0; i < salesOrdersSnapshot.docs.length; i += batchSize) {
      batches.push(salesOrdersSnapshot.docs.slice(i, i + batchSize));
    }
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      log(`Processing batch ${i + 1}/${batches.length} (${batch.length} sales orders)`);
      
      await processSalesOrdersBatch({
        docs: batch
      });
      
      // Progress update
      const progress = ((i + 1) / batches.length * 100).toFixed(1);
      log(`Progress: ${progress}% (${stats.sales_orders_checked} checked, ${stats.sales_orders_updated} updated)`);
    }
    
    // Print final statistics
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n==============================================');
    console.log('📊 POPULATION COMPLETE - FINAL STATS');
    console.log('==============================================');
    console.log(`Duration: ${duration} seconds`);
    console.log(`Sales Orders Checked: ${stats.sales_orders_checked}`);
    console.log(`Sales Orders with Missing Items: ${stats.sales_orders_with_missing_items}`);
    console.log(`Sales Orders Updated: ${stats.sales_orders_updated}`);
    console.log(`Line Items Added: ${stats.line_items_added}`);
    console.log(`Zoho API Requests: ${stats.zoho_requests}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (CONFIG.DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no data was actually modified');
      console.log('Run without --dry-run flag to perform actual population');
    }
    
  } catch (error) {
    console.error('\n❌ Population failed with error:', error);
    process.exit(1);
  }
}

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Show usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Populate Sales Order Items from Zoho
====================================

This script fetches missing line items from Zoho and populates the Firebase sales_order_items subcollections.

Usage: node populateSalesOrderItems.js [options]

Options:
  --dry-run       Run in dry-run mode (no data will be modified)
  --help          Show this help message

Environment Variables Required:
  ZOHO_ORGANIZATION_ID    Your Zoho organization ID
  ZOHO_AUTH_TOKEN         Your Zoho OAuth token

Examples:
  # Dry run to see what would happen
  node populateSalesOrderItems.js --dry-run
  
  # Run actual population
  node populateSalesOrderItems.js
  `);
  process.exit(0);
}

// Run the population
populateSalesOrderItems()
  .then(() => {
    console.log('\n✅ Sales order items population completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sales order items population failed:', error);
    process.exit(1);
  }); 