// server/syncInventory.js
import admin from 'firebase-admin';
import { fetchItems } from './api/zoho.js';   // your paginated fetchItems()
import serviceAccount from './serviceAccountKey.json';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

export async function syncInventory() {
  console.log('⏳ Fetching all Zoho items…');
  const items = await fetchItems();
  console.log(`✅ Retrieved ${items.length} items. Writing to Firestore…`);

  const batch = db.batch();
  items.forEach(item => {
    const docRef = db.collection('products').doc(item.item_code);
    batch.set(docRef, {
      sku: item.item_code,
      name: item.item_name,
      available_stock: item.available_stock,
      actual_available_stock: item.actual_available_stock,
      lastSynced: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  await batch.commit();
  console.log('🎉 Sync complete.');
}

// If run directly, execute once:
if (require.main === module) {
  syncInventory().catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
  });
}