// Check Missing Line Items
// server/src/scripts/checkMissingLineItems.js

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

async function checkMissingLineItems() {
  try {
    console.log('🔍 Checking sales orders for missing line items...');
    
    // Get all sales orders
    const salesOrdersSnapshot = await db.collection('sales_orders').get();
    console.log(`Total sales orders: ${salesOrdersSnapshot.size}`);
    
    let withLineItems = 0;
    let withoutLineItems = 0;
    let examples = [];
    
    for (const doc of salesOrdersSnapshot.docs) {
      const salesOrderData = doc.data();
      
      // Check if sales order has line items in subcollection
      const subcollectionSnapshot = await doc.ref.collection('sales_order_items').get();
      
      if (subcollectionSnapshot.size > 0) {
        withLineItems++;
      } else {
        withoutLineItems++;
        if (examples.length < 5) {
          examples.push({
            id: doc.id,
            number: salesOrderData.sales_order_number,
            total: salesOrderData.total
          });
        }
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`Sales orders with line items: ${withLineItems}`);
    console.log(`Sales orders without line items: ${withoutLineItems}`);
    
    if (examples.length > 0) {
      console.log(`\n📝 Examples of sales orders without line items:`);
      examples.forEach(example => {
        console.log(`  - ${example.number} (ID: ${example.id}, Total: ${example.total})`);
      });
    }
    
    // Check if we can find original data for examples
    if (examples.length > 0) {
      console.log(`\n🔍 Checking if original data exists for examples...`);
      for (const example of examples) {
        const originalSnapshot = await db.collection('salesorders')
          .where('salesorder_number', '==', example.number)
          .get();
        
        if (!originalSnapshot.empty) {
          const originalData = originalSnapshot.docs[0].data();
          const hasLineItems = originalData.line_items && Object.keys(originalData.line_items).length > 0;
          console.log(`  ${example.number}: Original data found, has line items: ${hasLineItems}`);
        } else {
          console.log(`  ${example.number}: No original data found`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkMissingLineItems(); 