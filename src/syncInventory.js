import admin from 'firebase-admin';
import { fetchItems } from './api/zoho.js';
import { fetchCustomersFromCRM } from './api/zoho.js';
import { getInventoryContactIdByEmail } from './api/zoho.js'; // or adjust the path

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db   = admin.firestore();
const coll = db.collection('products');

/**
 * Syncs Zoho items into Firestore by matching on the `sku` field.
 */
export async function syncInventory() {
  console.log('⏳ Fetching items from Zoho…');
  const items = await fetchItems();
  console.log(`📝 Received ${items.length} records from Zoho`);

  const batch = db.batch();

  for (const zItem of items) {
    // 1) Determine SKU
    const skuRaw = zItem.item_code ?? zItem.sku ?? '';
    const sku    = String(skuRaw).trim();
    if (!sku) {
      console.warn(`⚠️ Skipping item with missing SKU (item_id=${zItem.item_id})`);
      continue;
    }

    // 2) Find the existing Firestore doc by sku
    const qSnap = await coll.where('sku', '==', sku).limit(1).get();
    if (qSnap.empty) {
      console.warn(`⚠️ No Firestore product found for SKU=${sku}; skipping`);
      continue;
    }
    const docRef = qSnap.docs[0].ref;

    // 3) Prepare safe stock values
    const available   = typeof zItem.available_stock === 'number'
                        ? zItem.available_stock : 0;
    const actualAvail = typeof zItem.actual_available_stock === 'number'
                        ? zItem.actual_available_stock : 0;

    // 4) Merge-update those two fields
    batch.set(
      docRef,
      {
        available_stock:        available,
        actual_available_stock: actualAvail,
        lastSynced:             admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 5) Commit once
  await batch.commit();
  console.log('✅ syncInventory complete.');
}


export async function syncCustomersFromCRM() {
  console.log('⏳ Fetching customers from Zoho CRM…');
  const customers = await fetchCustomersFromCRM();
  console.log(`📝 Received ${customers.length} customers from Zoho CRM`);

  const batch = db.batch();
  const customerColl = db.collection('customers');

  for (const account of customers) {
    const id = account.id;
    if (!id) continue;

    const docRef = customerColl.doc(id);

    const data = {
      id,
      Account_Name: account.Account_Name || '',
      Phone: account.Phone || '',
      Primary_Email: account.Primary_Email || '',
      Agent: account.Agent || '',
      Billing_City: account.Billing_City || '',
      Billing_Code: account.Billing_Code || '',
      Billing_Country: account.Billing_Country || '',
      Billing_State: account.Billing_State || '',
      Billing_Street: account.Billing_Street || '',
      Primary_First_Name: account.Primary_First_Name || '',
      Primary_Last_Name: account.Primary_Last_Name || '',
      source: 'ZohoCRM',
      createdTime: admin.firestore.FieldValue.serverTimestamp()
    };

    batch.set(docRef, data, { merge: true });
  }

  await batch.commit();
  console.log('✅ syncCustomersFromCRM complete.');
}


export async function syncInventoryCustomerIds(singleDocId?: string, singleEmail?: string) {
  const docsToProcess = [];

  if (singleDocId && singleEmail) {
    // Only sync a single customer
    const docRef = db.collection('customers').doc(singleDocId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.warn(`❌ Customer doc ${singleDocId} not found`);
      return;
    }
    docsToProcess.push({ id: singleDocId, ref: docRef, data: docSnap.data(), email: singleEmail });
  } else {
    // Bulk mode — sync all customers
    const snapshot = await db.collection('customers').get();
    snapshot.forEach(doc => {
      const data = doc.data();
      const email = data.Primary_Email || data.email;
      if (!email) {
        console.warn(`⚠️ No email for customer ${doc.id}`);
        return;
      }
      docsToProcess.push({ id: doc.id, ref: doc.ref, data, email });
    });
  }

  for (const item of docsToProcess) {
    const { id, ref, email } = item;

    try {
      const inventoryId = await getInventoryContactIdByEmail(email);
      if (!inventoryId) {
        console.warn(`❌ No Inventory ID found for ${email}`);
        continue;
      }

      await ref.update({ zohoInventoryId: inventoryId });
      console.log(`✅ Updated ${email} with Inventory ID: ${inventoryId}`);
    } catch (err) {
      console.error(`❌ Error updating ${email}:`, err.message);
    }
  }
}