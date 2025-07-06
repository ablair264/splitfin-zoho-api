// Analyze Original Data Structure
// server/src/scripts/analyzeOriginalData.js

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

async function analyzeOriginalData() {
  try {
    console.log('🔍 Analyzing original sales orders data structure...');
    
    // Get a sample of sales orders
    const sampleSnapshot = await db.collection('salesorders').limit(10).get();
    console.log(`Analyzing ${sampleSnapshot.size} sample sales orders...`);
    
    const fieldAnalysis = {};
    const lineItemFields = new Set();
    
    for (const doc of sampleSnapshot.docs) {
      const data = doc.data();
      const orderNumber = data.salesorder_number;
      
      console.log(`\n📋 Sales Order: ${orderNumber}`);
      console.log('All keys:', Object.keys(data));
      
      // Look for any fields that might contain line items
      const itemRelatedKeys = Object.keys(data).filter(key => 
        key.includes('line') || 
        key.includes('item') || 
        key.includes('product') ||
        key.includes('goods')
      );
      
      console.log('Item-related keys:', itemRelatedKeys);
      
      // Check each item-related field
      for (const key of itemRelatedKeys) {
        const value = data[key];
        console.log(`  ${key}:`, typeof value, Array.isArray(value) ? `(array, length: ${value.length})` : 
          typeof value === 'object' ? `(object, keys: ${Object.keys(value || {}).length})` : value);
        
        if (value && (Array.isArray(value) || typeof value === 'object')) {
          lineItemFields.add(key);
        }
      }
      
      // Track field presence
      for (const key of Object.keys(data)) {
        if (!fieldAnalysis[key]) {
          fieldAnalysis[key] = { count: 0, types: new Set() };
        }
        fieldAnalysis[key].count++;
        fieldAnalysis[key].types.add(typeof data[key]);
      }
    }
    
    console.log('\n📊 Field Analysis:');
    const sortedFields = Object.entries(fieldAnalysis)
      .sort((a, b) => b[1].count - a[1].count);
    
    for (const [field, info] of sortedFields) {
      console.log(`  ${field}: ${info.count}/${sampleSnapshot.size} (${Array.from(info.types).join(', ')})`);
    }
    
    console.log('\n🔍 Potential Line Item Fields:');
    for (const field of lineItemFields) {
      console.log(`  - ${field}`);
    }
    
    // Check if there are any sales orders with line_items
    const withLineItems = await db.collection('salesorders')
      .where('line_items', '!=', null)
      .limit(5)
      .get();
    
    console.log(`\n📋 Sales orders with line_items: ${withLineItems.size}`);
    if (withLineItems.size > 0) {
      const example = withLineItems.docs[0].data();
      console.log('Example:', example.salesorder_number);
      console.log('line_items keys:', Object.keys(example.line_items || {}));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

analyzeOriginalData(); 