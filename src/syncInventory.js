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

export async function syncInventory() {
  console.log('⏳ Fetching items from Zoho…');
  const items = await fetchItems();
  console.log(`📝 Received ${items.length} records from Zoho`);

  const batch = db.batch();
  const coll  = db.collection('products');

  items.forEach(zItem => {
    const skuRaw = zItem.item_code;
    const sku     = skuRaw ? String(skuRaw).trim() : '';

    if (!sku) {
      // ► Log the full object so we can see what fields _are_ present
      console.warn(
        `⚠️  Skipping item with missing SKU (item_id=${zItem.item_id}). Full record:`,
        JSON.stringify(zItem, null, 2)
      );
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