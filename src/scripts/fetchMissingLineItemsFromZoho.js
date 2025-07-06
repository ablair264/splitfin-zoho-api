// Fetch Missing Line Items from Zoho API
// server/src/scripts/fetchMissingLineItemsFromZoho.js

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
  BATCH_SIZE: 10,
  DRY_RUN: process.argv.includes('--dry-run'),
  ZOHO_ACCESS_TOKEN: process.env.ZOHO_ACCESS_TOKEN,
  ZOHO_ORG_ID: process.env.ZOHO_ORG_ID
};

// Statistics
const stats = {
  total_checked: 0,
  sales_orders_updated: 0,
  line_items_added: 0,
  errors: 0,
  zoho_fetches: 0
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : level === 'success' ? '✅' : '📝';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function getZohoAccessToken() {
  if (!CONFIG.ZOHO_ACCESS_TOKEN) {
    log('ZOHO_ACCESS_TOKEN environment variable not set', 'error');
    log('Please set ZOHO_ACCESS_TOKEN and ZOHO_ORG_ID environment variables', 'error');
    process.exit(1);
  }
  return CONFIG.ZOHO_ACCESS_TOKEN;
}

async function fetchSalesOrderFromZoho(salesOrderNumber) {
  try {
    const accessToken = await getZohoAccessToken();
    
    const url = `https://www.zohoapis.com/crm/v3/Sales_Orders/${salesOrderNumber}`;
    const headers = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const response = await axios.get(url, { headers });
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log(`Sales order ${salesOrderNumber} not found in Zoho`, 'warning');
      return null;
    }
    log(`Error fetching sales order ${salesOrderNumber} from Zoho: ${error.message}`, 'error');
    return null;
  }
}

async function getItemMapping(itemId) {
  try {
    const itemSnapshot = await db.collection('items')
      .where('_original_zoho_id', '==', itemId)
      .limit(1)
      .get();
    
    if (!itemSnapshot.empty) {
      const itemData = itemSnapshot.docs[0].data();
      return {
        newItemId: itemSnapshot.docs[0].id,
        itemName: itemData.name || '',
        sku: itemData.sku || ''
      };
    }
    
    return null;
  } catch (error) {
    log(`Error getting item mapping for ${itemId}: ${error.message}`, 'error');
    return null;
  }
}

async function populateSalesOrderLineItems(salesOrderRef, salesOrderData, zohoData) {
  try {
    if (!zohoData.Product_Details || zohoData.Product_Details.length === 0) {
      log(`No line items found in Zoho for sales order ${salesOrderData.sales_order_number}`, 'warning');
      return;
    }
    
    const batch = db.batch();
    let itemsAdded = 0;
    
    for (let index = 0; index < zohoData.Product_Details.length; index++) {
      const zohoItem = zohoData.Product_Details[index];
      
      // Get item mapping
      const itemMapping = await getItemMapping(zohoItem.product.id);
      
      if (!itemMapping) {
        log(`No item mapping found for Zoho product ${zohoItem.product.id} in sales order ${salesOrderData.sales_order_number}`, 'warning');
        continue;
      }
      
      // Create line item document
      const lineItemRef = salesOrderRef.collection('sales_order_items').doc();
      
      const lineItem = {
        id: lineItemRef.id,
        item_id: itemMapping.newItemId,
        item_name: zohoItem.product.name || itemMapping.itemName || '',
        sku: zohoItem.product.code || itemMapping.sku || '',
        description: zohoItem.description || '',
        quantity: parseInt(zohoItem.quantity || 0),
        unit: zohoItem.unit || 'pcs',
        unit_price: parseFloat(zohoItem.list_price || 0),
        discount_amount: parseFloat(zohoItem.discount || 0),
        tax_amount: parseFloat(zohoItem.tax || 0),
        total_price: parseFloat(zohoItem.total || 0),
        sort_order: index,
        _original_item_id: zohoItem.product.id,
        _source: 'zoho_api',
        created_at: admin.firestore.Timestamp.now(),
        _fetched_from_zoho: true,
        _fetch_date: admin.firestore.Timestamp.now()
      };
      
      batch.set(lineItemRef, lineItem);
      itemsAdded++;
    }
    
    if (itemsAdded > 0) {
      if (!CONFIG.DRY_RUN) {
        await batch.commit();
        log(`Added ${itemsAdded} line items to sales order ${salesOrderData.sales_order_number} from Zoho`, 'success');
      } else {
        log(`DRY RUN: Would add ${itemsAdded} line items to sales order ${salesOrderData.sales_order_number} from Zoho`, 'warning');
      }
      
      stats.line_items_added += itemsAdded;
      stats.sales_orders_updated++;
    }
    
  } catch (error) {
    log(`Error populating line items for sales order ${salesOrderData.sales_order_number}: ${error.message}`, 'error');
    stats.errors++;
  }
}

async function processSalesOrderBatch(salesOrders) {
  for (const salesOrder of salesOrders) {
    try {
      stats.total_checked++;
      
      // Check if sales order already has line items
      const subcollectionSnapshot = await salesOrder.ref.collection('sales_order_items').get();
      
      if (subcollectionSnapshot.size > 0) {
        log(`Sales order ${salesOrder.data().sales_order_number} already has ${subcollectionSnapshot.size} line items, skipping`, 'info');
        continue;
      }
      
      // Fetch from Zoho
      log(`Fetching sales order ${salesOrder.data().sales_order_number} from Zoho...`, 'info');
      const zohoData = await fetchSalesOrderFromZoho(salesOrder.data().sales_order_number);
      stats.zoho_fetches++;
      
      if (zohoData) {
        await populateSalesOrderLineItems(salesOrder.ref, salesOrder.data(), zohoData);
      } else {
        log(`Could not fetch data for sales order ${salesOrder.data().sales_order_number} from Zoho`, 'warning');
      }
      
    } catch (error) {
      log(`Error processing sales order ${salesOrder.data().sales_order_number}: ${error.message}`, 'error');
      stats.errors++;
    }
  }
}

async function main() {
  try {
    log('🔧 Starting Missing Line Items Fetch from Zoho');
    log('======================================================');
    log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    log('======================================================');
    
    if (!CONFIG.ZOHO_ACCESS_TOKEN) {
      log('ZOHO_ACCESS_TOKEN not set. Please set environment variables:', 'error');
      log('export ZOHO_ACCESS_TOKEN="your_token_here"', 'error');
      log('export ZOHO_ORG_ID="your_org_id_here"', 'error');
      process.exit(1);
    }
    
    // Get all sales orders without line items
    const salesOrdersSnapshot = await db.collection('sales_orders').get();
    const salesOrdersWithoutItems = [];
    
    for (const doc of salesOrdersSnapshot.docs) {
      const subcollectionSnapshot = await doc.ref.collection('sales_order_items').get();
      if (subcollectionSnapshot.size === 0) {
        salesOrdersWithoutItems.push(doc);
      }
    }
    
    log(`📊 Found ${salesOrdersSnapshot.size} total sales orders`);
    log(`📊 Found ${salesOrdersWithoutItems.length} sales orders without line items`);
    
    if (salesOrdersWithoutItems.length === 0) {
      log('✅ All sales orders already have line items!', 'success');
      return;
    }
    
    // Process in batches
    const totalBatches = Math.ceil(salesOrdersWithoutItems.length / CONFIG.BATCH_SIZE);
    
    for (let i = 0; i < salesOrdersWithoutItems.length; i += CONFIG.BATCH_SIZE) {
      const batch = salesOrdersWithoutItems.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      
      log(`📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} sales orders)`);
      await processSalesOrderBatch(batch);
      
      const progress = ((i + batch.length) / salesOrdersWithoutItems.length * 100).toFixed(1);
      log(`📊 Progress: ${progress}% (${i + batch.length} checked, ${stats.sales_orders_updated} updated)`);
      
      // Add delay to avoid rate limiting
      if (i + CONFIG.BATCH_SIZE < salesOrdersWithoutItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Final statistics
    log('======================================================');
    log('📊 Final Statistics:');
    log(`  Total checked: ${stats.total_checked}`);
    log(`  Sales orders updated: ${stats.sales_orders_updated}`);
    log(`  Line items added: ${stats.line_items_added}`);
    log(`  Zoho API calls: ${stats.zoho_fetches}`);
    log(`  Errors: ${stats.errors}`);
    log('======================================================');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main(); 