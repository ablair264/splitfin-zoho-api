// Fix All Sales Order Items from Original Data
// Creates subcollections for all sales orders missing line items
// server/src/scripts/fixAllSalesOrderItems.js

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
  BATCH_SIZE: 50
};

// Statistics tracking
const stats = {
  total_sales_orders: 0,
  sales_orders_with_missing_items: 0,
  original_orders_found: 0,
  sales_orders_updated: 0,
  line_items_added: 0,
  errors: 0
};

// Cache for item mappings
const itemCache = new Map();

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : level === 'success' ? '✅' : '📝';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

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

async function findOriginalSalesOrder(salesOrderNumber) {
  try {
    // Look in the original salesorders collection by salesorder_number
    const originalSnapshot = await db.collection('salesorders')
      .where('salesorder_number', '==', salesOrderNumber)
      .limit(1)
      .get();
    
    if (!originalSnapshot.empty) {
      return originalSnapshot.docs[0].data();
    }
    
    return null;
  } catch (error) {
    log(`Error finding original sales order for ${salesOrderNumber}: ${error.message}`, 'error');
    return null;
  }
}

async function populateSalesOrderLineItems(salesOrderRef, salesOrderData, originalOrderData) {
  try {
    if (!originalOrderData.line_items) {
      log(`No line items found in original data for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    // Convert line_items object to array if it's an object
    let lineItemsArray = [];
    if (Array.isArray(originalOrderData.line_items)) {
      lineItemsArray = originalOrderData.line_items;
    } else if (typeof originalOrderData.line_items === 'object') {
      // Convert object to array
      lineItemsArray = Object.values(originalOrderData.line_items);
    }
    
    if (lineItemsArray.length === 0) {
      log(`No line items found in original data for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    log(`Found ${lineItemsArray.length} line items for sales order ${salesOrderData.sales_order_number}`, 'success');
    
    const batch = db.batch();
    let itemsAdded = 0;
    
    for (let index = 0; index < lineItemsArray.length; index++) {
      const originalItem = lineItemsArray[index];
      
      // Get item mapping using product_id (which is the Zoho item ID)
      const itemMapping = await getItemMapping(originalItem.product_id);
      
      if (!itemMapping) {
        log(`No item mapping found for product ${originalItem.product_id} in sales order ${salesOrderData.sales_order_number}`, 'warning');
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
        unit_price: parseFloat(originalItem.rate || originalItem.sales_rate || 0),
        discount_amount: parseFloat(originalItem.discount || 0),
        tax_amount: parseFloat(originalItem.tax_percentage || 0),
        total_price: parseFloat(originalItem.item_total || originalItem.item_sub_total || 0),
        sort_order: index,
        _original_item_id: originalItem.product_id,
        _original_line_item_id: originalItem.line_item_id,
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

async function processSalesOrder(salesOrderDoc) {
  try {
    const salesOrderData = salesOrderDoc.data();
    
    // Check if sales order already has line items
    const subcollectionSnapshot = await salesOrderDoc.ref.collection('sales_order_items').get();
    
    if (subcollectionSnapshot.size > 0) {
      return; // Skip if already has line items
    }
    
    stats.sales_orders_with_missing_items++;
    
    log(`🔗 Found original data for sales order ${salesOrderData.sales_order_number}`, 'info');
    
    // Find original sales order data
    const originalOrderData = await findOriginalSalesOrder(salesOrderData.sales_order_number);
    
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

async function main() {
  try {
    log('🔧 Starting All Sales Order Items Fix from Original Data');
    log('======================================================');
    log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    log('======================================================');
    
    // Get all sales orders
    const salesOrdersSnapshot = await db.collection('sales_orders').get();
    stats.total_sales_orders = salesOrdersSnapshot.size;
    
    log(`📊 Found ${stats.total_sales_orders} total sales orders`);
    
    // Process in batches
    const batchSize = CONFIG.BATCH_SIZE;
    const totalBatches = Math.ceil(salesOrdersSnapshot.docs.length / batchSize);
    
    for (let i = 0; i < salesOrdersSnapshot.docs.length; i += batchSize) {
      const batch = salesOrdersSnapshot.docs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      log(`📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} sales orders)`);
      log(`📊 Processing batch of ${batch.length} sales orders...`);
      
      for (const doc of batch) {
        await processSalesOrder(doc);
      }
      
      // Progress update
      const progress = ((i + batch.length) / salesOrdersSnapshot.docs.length * 100).toFixed(1);
      log(`📊 Progress: ${progress}% (${i + batch.length} checked, ${stats.sales_orders_updated} updated)`);
    }
    
    // Final statistics
    log('======================================================');
    log('📊 Final Statistics:');
    log(`  Total sales orders: ${stats.total_sales_orders}`);
    log(`  Sales orders with missing items: ${stats.sales_orders_with_missing_items}`);
    log(`  Original orders found: ${stats.original_orders_found}`);
    log(`  Sales orders updated: ${stats.sales_orders_updated}`);
    log(`  Line items added: ${stats.line_items_added}`);
    log(`  Errors: ${stats.errors}`);
    log('======================================================');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();

// ============================================================
// SCRIPT EXECUTION
// ============================================================

// Show usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Fix All Sales Order Items from Original Data
============================================

This script fixes missing line items for ALL sales orders by matching them with original data.

Usage: node fixAllSalesOrderItems.js [options]

Options:
  --dry-run       Run in dry-run mode (no data will be modified)
  --help          Show this help message

Examples:
  # Dry run to see what would happen
  node fixAllSalesOrderItems.js --dry-run
  
  # Run actual fix
  node fixAllSalesOrderItems.js
  `);
  process.exit(0);
}

// Run the fix
main()
  .then(() => {
    console.log('\n✅ All sales order items fix completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ All sales order items fix failed:', error);
    process.exit(1);
  }); 