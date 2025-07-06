// Debug Line Items Issue
// server/src/scripts/debugLineItems.js

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

async function debugLineItems() {
  try {
    // Check original data for SO-00001
    console.log('🔍 Checking original data for SO-00001...');
    const originalSnapshot = await db.collection('salesorders')
      .where('salesorder_number', '==', 'SO-00001')
      .get();
    
    if (!originalSnapshot.empty) {
      const originalData = originalSnapshot.docs[0].data();
      console.log('✅ Found original data');
      console.log('Has line_items:', !!originalData.line_items);
      console.log('line_items type:', typeof originalData.line_items);
      
      if (originalData.line_items) {
        console.log('line_items keys:', Object.keys(originalData.line_items));
        console.log('line_items length:', Object.keys(originalData.line_items).length);
        
        // Convert to array
        const lineItemsArray = Object.values(originalData.line_items);
        console.log('Array length:', lineItemsArray.length);
        console.log('First item:', JSON.stringify(lineItemsArray[0], null, 2));
      }
    } else {
      console.log('❌ No original data found');
    }
    
    // Check new data for SO-00001
    console.log('\n🔍 Checking new data for SO-00001...');
    const newSnapshot = await db.collection('sales_orders')
      .where('sales_order_number', '==', 'SO-00001')
      .get();
    
    if (!newSnapshot.empty) {
      const newData = newSnapshot.docs[0].data();
      console.log('✅ Found new data');
      console.log('ID:', newSnapshot.docs[0].id);
      console.log('Has line_items:', !!newData.line_items);
      
      // Check subcollection
      const subcollectionSnapshot = await newSnapshot.docs[0].ref.collection('sales_order_items').get();
      console.log('Subcollection items:', subcollectionSnapshot.size);
    } else {
      console.log('❌ No new data found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

debugLineItems(); 