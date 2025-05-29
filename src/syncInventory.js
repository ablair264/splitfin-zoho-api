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
    // 1) Try item_code, then sku, trim whitespace
    const skuRaw = zItem.item_code ?? zItem.sku ?? '';
    const sku    = String(skuRaw).trim();

    // 2) Skip if still empty
    if (!sku) {
      console.warn(
        `⚠️  Skipping item with missing SKU (item_id=${zItem.item_id}).`
      );
      return;
    }

    // 3) Write only the two stock fields (merge preserves all others)
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