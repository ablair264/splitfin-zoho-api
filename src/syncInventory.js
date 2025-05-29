// server/src/syncInventory.js
import admin from 'firebase-admin';
import { fetchItems } from './api/zoho.js';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

/**
 * Syncs Zoho items into Firestore.
 */
export async function syncInventory() {
  console.log('⏳ Fetching items from Zoho…');
  const items = await fetchItems();
  console.log(`Got ${items.length} items; writing to Firestore…`);

  const batch = db.batch();
  items.forEach(item => {
    const ref = db.collection('products').doc(item.item_code);
    batch.set(ref, {
      sku: item.item_code,
      name: item.item_name,
      available_stock: item.available_stock,
      actual_available_stock: item.actual_available_stock,
      lastSynced: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
  console.log('✅ Inventory sync complete.');
}
