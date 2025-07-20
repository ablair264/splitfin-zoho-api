#!/usr/bin/env node

// Quick script to reactivate all products in Firebase
// Usage: npm run reactivate-products:quick

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = join(__dirname, '../../../../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function quickReactivate() {
  console.log('⚡ Quick Product Reactivation\n');
  
  try {
    const startTime = Date.now();
    
    // Get only inactive items for efficiency
    const inactiveItems = await db.collection('items_data')
      .where('status', '!=', 'active')
      .get();
    
    const totalInactive = inactiveItems.size;
    
    if (totalInactive === 0) {
      console.log('✅ All products are already active! Nothing to do.');
      process.exit(0);
    }
    
    console.log(`Found ${totalInactive} inactive products to reactivate.\n`);
    
    let batch = db.batch();
    let count = 0;
    const batchSize = 400;
    
    for (const doc of inactiveItems.docs) {
      const item = doc.data();
      
      // Update to active and remove deactivation metadata
      batch.update(doc.ref, {
        status: 'active',
        _deactivated_reason: admin.firestore.FieldValue.delete(),
        _deactivated_at: admin.firestore.FieldValue.delete(),
        _reactivated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      count++;
      
      if (count % batchSize === 0) {
        await batch.commit();
        console.log(`Processed ${count}/${totalInactive} items...`);
        batch = db.batch();
      }
    }
    
    // Commit remaining
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Successfully reactivated ${count} products in ${duration}s!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run immediately
quickReactivate();