// server/src/syncInventory.js
import admin from 'firebase-admin'
import { fetchItems } from './api/zoho.js'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}
const db = admin.firestore()

/**
 * Syncs Zoho items into Firestore, _merging_ only the two stock fields
 * and a timestamp onto your existing docs keyed by SKU
 */
export async function syncInventory() {
  console.log('⏳ Fetching items from Zoho…');
  const items = await fetchItems();

  console.log(`📝 Writing ${items.length} records to Firestore…`);
  const batch = db.batch();
  const coll  = db.collection('products');

  items.forEach(zItem => {
    const sku = String(zItem.item_code || '').trim();
    if (!sku) {
      console.warn(`⚠️  Skipping item with missing SKU (item_id=${zItem.item_id})`);
      return;
    }

    const ref = coll.doc(sku);
    batch.set(
      ref,
      {
        available_stock:        zItem.available_stock,
        actual_available_stock: zItem.actual_available_stock,
        lastSynced:             admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log('✅ syncInventory complete.');
}