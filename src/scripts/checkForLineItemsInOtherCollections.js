// Check for Line Items in Other Collections
// server/src/scripts/checkForLineItemsInOtherCollections.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkCollections() {
  console.log('🔍 Checking for line items in other collections...');
  
  // Check if there's a separate line_items collection
  try {
    const lineItemsSnapshot = await db.collection('line_items').limit(5).get();
    console.log(`📋 Found ${lineItemsSnapshot.size} documents in 'line_items' collection`);
    
    if (lineItemsSnapshot.size > 0) {
      const sample = lineItemsSnapshot.docs[0].data();
      console.log('Sample line item:', JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.log('❌ No "line_items" collection found');
  }
  
  // Check if there's a sales_order_items collection
  try {
    const salesOrderItemsSnapshot = await db.collection('sales_order_items').limit(5).get();
    console.log(`📋 Found ${salesOrderItemsSnapshot.size} documents in 'sales_order_items' collection`);
    
    if (salesOrderItemsSnapshot.size > 0) {
      const sample = salesOrderItemsSnapshot.docs[0].data();
      console.log('Sample sales order item:', JSON.stringify(sample, null, 2));
    }
  } catch (error) {
    console.log('❌ No "sales_order_items" collection found');
  }
  
  // Check original salesorders for any field that might contain line items
  const originalSnapshot = await db.collection('salesorders').limit(3).get();
  console.log('\n📋 Checking original salesorders structure:');
  
  for (const doc of originalSnapshot.docs) {
    const data = doc.data();
    console.log(`\nSales Order: ${data.salesorder_number}`);
    
    // Look for any field that might contain line items
    const potentialFields = Object.keys(data).filter(key => 
      key.includes('item') || 
      key.includes('product') || 
      key.includes('goods') ||
      key.includes('line')
    );
    
    console.log('Potential line item fields:', potentialFields);
    
    for (const field of potentialFields) {
      const value = data[field];
      console.log(`  ${field}:`, typeof value, 
        Array.isArray(value) ? `(array, length: ${value.length})` : 
        typeof value === 'object' ? `(object, keys: ${Object.keys(value || {}).length})` : 
        value);
    }
  }
  
  process.exit(0);
}

checkCollections(); 