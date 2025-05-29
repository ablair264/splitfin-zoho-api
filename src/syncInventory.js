import admin from 'firebase-admin';
import { fetchItems } from './api/zoho.js';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

/**
 * Syncs Zoho items into Firestore.
 */
export async function syncInventory() {
  console.log('⏳ Fetching items from Zoho…');
  const items = await fetchItems();
  console.log(`📝 Received ${items.length} records from Zoho`);

  const batch = db.batch();
  const coll  = db.collection('products');

  items.forEach(zItem => {
    // 1) Determine SKU
    const skuRaw = zItem.item_code ?? zItem.sku ?? '';
    const sku    = String(skuRaw).trim();
    if (!sku) {
      console.warn(`⚠️  Skipping item with missing SKU (item_id=${zItem.item_id}).`);
      return;
    }

    // 2) Safely pull stock values (default to 0 if undefined)
    const available = typeof zItem.available_stock === 'number'
      ? zItem.available_stock
      : 0;
    const actualAvail = typeof zItem.actual_available_stock === 'number'
      ? zItem.actual_available_stock
      : 0;

    // 3) Merge only those values
    const ref = coll.doc(sku);
    batch.set(
      ref,
      {
        available_stock:        available,
        actual_available_stock: actualAvail,
        lastSynced:             admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  console.log('✅ syncInventory complete.');
}