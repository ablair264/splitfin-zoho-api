// Diagnose Sales Orders Structure
// server/src/scripts/diagnoseSalesOrders.js

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

async function diagnoseSalesOrders() {
  console.log('🔍 Diagnosing Sales Orders Structure');
  console.log('=====================================\n');
  
  try {
    // Get all sales orders
    const allSalesOrders = await db.collection('sales_orders').get();
    console.log(`📊 Total sales orders: ${allSalesOrders.size}`);
    
    let withMigration = 0;
    let withoutMigration = 0;
    let withLineItems = 0;
    let withoutLineItems = 0;
    let missingItemsList = [];
    
    for (const doc of allSalesOrders.docs) {
      const data = doc.data();
      
      // Check migration metadata
      if (data._migration && data._migration.migrated_from_zoho) {
        withMigration++;
      } else {
        withoutMigration++;
      }
      
      // Check line items
      const lineItemsSnapshot = await doc.ref.collection('sales_order_items').get();
      if (lineItemsSnapshot.empty) {
        withoutLineItems++;
        missingItemsList.push({
          id: doc.id,
          number: data.sales_order_number,
          hasMigration: !!(data._migration && data._migration.migrated_from_zoho),
          zohoId: data._migration?.original_zoho_id
        });
      } else {
        withLineItems++;
      }
    }
    
    console.log(`\n📋 Breakdown:`);
    console.log(`  Sales orders with migration metadata: ${withMigration}`);
    console.log(`  Sales orders without migration metadata: ${withoutMigration}`);
    console.log(`  Sales orders with line items: ${withLineItems}`);
    console.log(`  Sales orders without line items: ${withoutLineItems}`);
    
    if (missingItemsList.length > 0) {
      console.log(`\n❌ Sales orders missing line items (${missingItemsList.length}):`);
      missingItemsList.forEach((order, index) => {
        console.log(`  ${index + 1}. ${order.number} (ID: ${order.id})`);
        console.log(`     Has migration: ${order.hasMigration}`);
        console.log(`     Zoho ID: ${order.zohoId || 'N/A'}`);
      });
    } else {
      console.log(`\n✅ All sales orders have line items!`);
    }
    
    // Check original salesorders collection
    console.log(`\n🔍 Checking original salesorders collection...`);
    const originalOrders = await db.collection('salesorders').get();
    console.log(`  Original salesorders count: ${originalOrders.size}`);
    
    if (originalOrders.size > 0) {
      console.log(`\n📋 Sample original sales order:`);
      const sampleOrder = originalOrders.docs[0].data();
      console.log(`  ID: ${originalOrders.docs[0].id}`);
      console.log(`  Number: ${sampleOrder.salesorder_number}`);
      console.log(`  Has line_items: ${!!sampleOrder.line_items}`);
      if (sampleOrder.line_items) {
        console.log(`  Line items count: ${sampleOrder.line_items.length}`);
        console.log(`  Sample line item:`, JSON.stringify(sampleOrder.line_items[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

diagnoseSalesOrders(); 