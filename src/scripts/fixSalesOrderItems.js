// Fix Sales Order Items from Original Firebase Data
// Creates subcollections for sales orders that are missing line items
// server/src/scripts/fixSalesOrderItems.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  BATCH_SIZE: 100
};

// Statistics tracking
const stats = {
  sales_orders_checked: 0,
  sales_orders_with_missing_items: 0,
  sales_orders_updated: 0,
  line_items_added: 0,
  errors: 0,
  original_orders_found: 0
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
    fix: '🔧'
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

async function findOriginalSalesOrder(zohoId) {
  try {
    // Look in the original salesorders collection
    const originalSnapshot = await db.collection('salesorders')
      .where('salesorder_id', '==', zohoId)
      .limit(1)
      .get();
    
    if (!originalSnapshot.empty) {
      return originalSnapshot.docs[0].data();
    }
    
    // Try by salesorder_number
    const originalSnapshot2 = await db.collection('salesorders')
      .where('salesorder_number', '==', zohoId)
      .limit(1)
      .get();
    
    if (!originalSnapshot2.empty) {
      return originalSnapshot2.docs[0].data();
    }
    
    return null;
  } catch (error) {
    log(`Error finding original sales order for ${zohoId}: ${error.message}`, 'error');
    return null;
  }
}

async function populateSalesOrderLineItems(salesOrderRef, salesOrderData, originalOrderData) {
  try {
    if (!originalOrderData.line_items || originalOrderData.line_items.length === 0) {
      log(`No line items found in original data for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    const batch = db.batch();
    let itemsAdded = 0;
    
    for (let index = 0; index < originalOrderData.line_items.length; index++) {
      const originalItem = originalOrderData.line_items[index];
      
      // Get item mapping
      const itemMapping = await getItemMapping(originalItem.item_id);
      
      if (!itemMapping) {
        log(`No item mapping found for item ${originalItem.item_id} in sales order ${salesOrderData.sales_order_number}`, 'warning');
        continue;
      }
      
      // Create line item document
      const lineItemRef = salesOrderRef.collection('sales_order_items').doc();
      
      const lineItem = {
        id: lineItemRef.id,
        item_id: itemMapping.newItemId,
        item_name: originalItem.name || itemMapping.itemName || '',
        sku: originalItem.sku || itemMapping.sku || '',
        description: originalItem.description || '',
        quantity: parseInt(originalItem.quantity || 0),
        unit: originalItem.unit || 'pcs',
        unit_price: parseFloat(originalItem.rate || originalItem.price || 0),
        discount_amount: parseFloat(originalItem.discount || 0),
        tax_amount: parseFloat(originalItem.tax_amount || 0),
        total_price: parseFloat(originalItem.item_total || originalItem.total || 0),
        sort_order: index,
        _original_item_id: originalItem.item_id,
        created_at: admin.firestore.Timestamp.now(),
        _fixed_from_original_data: true,
        _fix_date: admin.firestore.Timestamp.now()
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
    
    log(`Looking for original data for sales order ${salesOrderData.sales_order_number} (Zoho ID: ${zohoId})`, 'fix');
    
    // Find original sales order data
    const originalOrderData = await findOriginalSalesOrder(zohoId);
    
    if (originalOrderData) {
      stats.original_orders_found++;
      await populateSalesOrderLineItems(salesOrderDoc.ref, salesOrderData, originalOrderData);
    } else {
      log(`No original data found for sales order ${salesOrderData.sales_order_number}`, 'warning');
    }
    
  } catch (error) {
    log(`Error processing sales order ${salesOrderDoc.id}: ${error.message}`, 'error');
    stats.errors++;
  }
}

async function processSalesOrdersBatch(salesOrdersSnapshot) {
  log(`Processing batch of ${salesOrdersSnapshot.docs.length} sales orders...`);
  
  for (const doc of salesOrdersSnapshot.docs) {
    await processSalesOrder(doc);
  }
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function fixSalesOrderItems() {
  console.log('🔧 Starting Sales Order Items Fix from Original Data');
  console.log('==============================================');
  console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('==============================================\n');
  
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
    console.log('📊 FIX COMPLETE - FINAL STATS');
    console.log('==============================================');
    console.log(`Duration: ${duration} seconds`);
    console.log(`Sales Orders Checked: ${stats.sales_orders_checked}`);
    console.log(`Sales Orders with Missing Items: ${stats.sales_orders_with_missing_items}`);
    console.log(`Original Orders Found: ${stats.original_orders_found}`);
    console.log(`Sales Orders Updated: ${stats.sales_orders_updated}`);
    console.log(`Line Items Added: ${stats.line_items_added}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (CONFIG.DRY_RUN) {
      console.log('\n⚠️  This was a DRY RUN - no data was actually modified');
      console.log('Run without --dry-run flag to perform actual fix');
    }
    
  } catch (error) {
    console.error('\n❌ Fix failed with error:', error);
    process.exit(1);
  }
}

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Show usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Fix Sales Order Items from Original Firebase Data
================================================

This script fixes missing line items by using the original Firebase data and creating proper subcollections.

Usage: node fixSalesOrderItems.js [options]

Options:
  --dry-run       Run in dry-run mode (no data will be modified)
  --help          Show this help message

Examples:
  # Dry run to see what would happen
  node fixSalesOrderItems.js --dry-run
  
  # Run actual fix
  node fixSalesOrderItems.js
  `);
  process.exit(0);
}

// Run the fix
fixSalesOrderItems()
  .then(() => {
    console.log('\n✅ Sales order items fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Sales order items fix failed:', error);
    process.exit(1);
  }); 