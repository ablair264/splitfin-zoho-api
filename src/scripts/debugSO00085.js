// Debug SO-00085
// server/src/scripts/debugSO00085.js

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = join(__dirname, 'key.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugSO00085() {
  try {
    console.log('🔍 Debugging SO-00085...');
    
    // Check original data
    const originalSnapshot = await db.collection('salesorders')
      .where('salesorder_number', '==', 'SO-00085')
      .get();
    
    if (!originalSnapshot.empty) {
      const data = originalSnapshot.docs[0].data();
      console.log('✅ Found original data for SO-00085');
      console.log('line_items exists:', !!data.line_items);
      console.log('line_items type:', typeof data.line_items);
      console.log('line_items keys:', Object.keys(data.line_items || {}));
      console.log('line_items length:', Object.keys(data.line_items || {}).length);
      
      if (data.line_items && Object.keys(data.line_items).length > 0) {
        const lineItemsArray = Object.values(data.line_items);
        console.log('Array length:', lineItemsArray.length);
        console.log('First item:', JSON.stringify(lineItemsArray[0], null, 2));
      }
    } else {
      console.log('❌ No original data found for SO-00085');
    }
    
    // Check new data
    const newSnapshot = await db.collection('sales_orders')
      .where('sales_order_number', '==', 'SO-00085')
      .get();
    
    if (!newSnapshot.empty) {
      const data = newSnapshot.docs[0].data();
      console.log('\n✅ Found new data for SO-00085');
      console.log('ID:', newSnapshot.docs[0].id);
      console.log('Total:', data.total);
      
      // Check subcollection
      const subcollectionSnapshot = await newSnapshot.docs[0].ref.collection('sales_order_items').get();
      console.log('Subcollection items:', subcollectionSnapshot.size);
    } else {
      console.log('\n❌ No new data found for SO-00085');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

debugSO00085(); 