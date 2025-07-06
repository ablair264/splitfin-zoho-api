// Debug Specific Order
// server/src/scripts/debugSpecificOrder.js

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

async function debugSpecificOrder() {
  const orderNumber = 'SO-00085'; // Example from the list
  
  try {
    console.log(`🔍 Debugging sales order: ${orderNumber}`);
    
    // Check original data
    console.log('\n📋 Original Data:');
    const originalSnapshot = await db.collection('salesorders')
      .where('salesorder_number', '==', orderNumber)
      .get();
    
    if (!originalSnapshot.empty) {
      const originalData = originalSnapshot.docs[0].data();
      console.log('✅ Found original data');
      console.log('Keys:', Object.keys(originalData).filter(k => k.includes('line') || k.includes('item')));
      console.log('Has line_items:', !!originalData.line_items);
      console.log('line_items type:', typeof originalData.line_items);
      
      if (originalData.line_items) {
        console.log('line_items keys:', Object.keys(originalData.line_items));
        console.log('line_items length:', Object.keys(originalData.line_items).length);
        
        // Convert to array
        const lineItemsArray = Object.values(originalData.line_items);
        console.log('Array length:', lineItemsArray.length);
        
        if (lineItemsArray.length > 0) {
          console.log('First item:', JSON.stringify(lineItemsArray[0], null, 2));
        }
      }
    } else {
      console.log('❌ No original data found');
    }
    
    // Check new data
    console.log('\n📋 New Data:');
    const newSnapshot = await db.collection('sales_orders')
      .where('sales_order_number', '==', orderNumber)
      .get();
    
    if (!newSnapshot.empty) {
      const newData = newSnapshot.docs[0].data();
      console.log('✅ Found new data');
      console.log('ID:', newSnapshot.docs[0].id);
      console.log('Total:', newData.total);
      
      // Check subcollection
      const subcollectionSnapshot = await newSnapshot.docs[0].ref.collection('sales_order_items').get();
      console.log('Subcollection items:', subcollectionSnapshot.size);
      
      if (subcollectionSnapshot.size === 0) {
        console.log('❌ No line items in subcollection');
      } else {
        console.log('✅ Has line items in subcollection');
      }
    } else {
      console.log('❌ No new data found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

debugSpecificOrder(); 