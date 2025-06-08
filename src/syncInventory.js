// server/src/syncInventory.js
import admin from 'firebase-admin';
import crypto from 'crypto';
import { fetchItems, fetchCustomersFromCRM } from './api/zoho.js';
import dotenv from 'dotenv';
 
// Load environment variables
dotenv.config();
 
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
 
const db = admin.firestore();

/**
 * Compute a stable hash of relevant fields on an inventory item for change detection
 */
function computeItemHash(item) {
  const relevant = {
    name: item.name,
    sku: item.sku,
    rate: item.rate,
    stock_on_hand: item.stock_on_hand,
    available_stock: item.available_stock,
    status: item.status,
    description: item.description,
  };
  const str = JSON.stringify(relevant);
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Compute a stable hash of relevant fields on a customer record for change detection
 */
function computeCustomerHash(customer) {
  // We omit zohoInventoryId because that may be updated independently and not part of main sync fields
  const relevant = {
    Account_Name: customer.Account_Name,
    Phone: customer.Phone,
    Primary_Email: customer.Primary_Email,
    Billing_City: customer.Billing_City,
    Billing_Code: customer.Billing_Code,
    Billing_Country: customer.Billing_Country,
    Billing_State: customer.Billing_State,
    Billing_Street: customer.Billing_Street,
    Primary_First_Name: customer.Primary_First_Name,
    Primary_Last_Name: customer.Primary_Last_Name,
    Agent: customer.Agent || null
  };
  const str = JSON.stringify(relevant);
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Optimized syncInventory with bulk doc fetch and hash comparison
 */
export async function syncInventory() {
  console.log('🔄 Starting optimized inventory sync...');

  try {
    const items = await fetchItems();

    if (items.length === 0) {
      console.log('ℹ️ No inventory items fetched from Zoho.');
      return { success: true, stats: { added: 0, updated: 0, unchanged: 0 } };
    }

    // Bulk fetch existing products
    const docRefs = items.map(item => db.collection('products').doc(item.item_id));
    const existingDocs = await db.getAll(...docRefs);

    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const doc = existingDocs[i];
      const newHash = computeItemHash(item);

      if (!doc.exists) {
        batch.set(db.collection('products').doc(item.item_id), {
          ...item,
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          dataHash: newHash
        });
        addedCount++;
      } else {
        const existingData = doc.data();
        if (existingData.dataHash !== newHash) {
          batch.update(doc.ref, {
            ...item,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            dataHash: newHash
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      await batch.commit();
      // Update sync metadata
      await db.collection('sync_metadata').doc('inventory').set({
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        itemsProcessed: items.length,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      });
    }

    console.log(`✅ Inventory sync complete: ${addedCount} added, ${updatedCount} updated, ${unchangedCount} unchanged`);
    return { success: true, stats: { added: addedCount, updated: updatedCount, unchanged: unchangedCount } };

  } catch (error) {
    console.error('❌ Inventory sync failed:', error);
    throw error;
  }
}

/**
 * Optimized syncCustomersFromCRM with bulk doc fetch and hash comparison
 */
export async function syncCustomersFromCRM() {
  console.log('👥 Starting optimized customer sync from CRM...');

  try {
    const accounts = await fetchCustomersFromCRM();

    if (accounts.length === 0) {
      console.log('ℹ️ No customers fetched from Zoho CRM.');
      return { success: true, stats: { added: 0, updated: 0, unchanged: 0 } };
    }

    // Bulk fetch existing customer docs by zohoCRMId (account.id)
    const docRefs = accounts.map(account => db.collection('customers').doc(account.id));
    const existingDocs = await db.getAll(...docRefs);

    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const doc = existingDocs[i];

      // Prepare customer data to sync
      const customerData = {
        zohoCRMId: account.id,
        zohoInventoryId: null, // default to null, will preserve if existing
        Account_Name: account.Account_Name,
        Phone: account.Phone,
        Primary_Email: account.Primary_Email,
        Agent: account.Agent ? {
          id: account.Agent.id,
          name: account.Agent.name
        } : null,
        Billing_City: account.Billing_City,
        Billing_Code: account.Billing_Code,
        Billing_Country: account.Billing_Country,
        Billing_State: account.Billing_State,
        Billing_Street: account.Billing_Street,
        Primary_First_Name: account.Primary_First_Name,
        Primary_Last_Name: account.Primary_Last_Name,
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const newHash = computeCustomerHash(customerData);

      if (!doc.exists) {
        customerData.dataHash = newHash;
        batch.set(db.collection('customers').doc(account.id), customerData);
        addedCount++;
      } else {
        const existingData = doc.data();

        // Preserve existing zohoInventoryId if available
        if (existingData.zohoInventoryId) {
          customerData.zohoInventoryId = existingData.zohoInventoryId;
        }

        // Check hash to detect changes
        if (existingData.dataHash !== newHash) {
          customerData.dataHash = newHash;
          batch.update(doc.ref, customerData);
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      await batch.commit();
      await db.collection('sync_metadata').doc('customers').set({
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        customersProcessed: accounts.length,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      });
    }

    console.log(`✅ Customer sync complete: ${addedCount} added, ${updatedCount} updated, ${unchangedCount} unchanged`);
    return { success: true, stats: { added: addedCount, updated: updatedCount, unchanged: unchangedCount } };

  } catch (error) {
    console.error('❌ Customer sync failed:', error);
    throw error;
  }
}

/**
 * Sync Zoho Inventory customer IDs for existing customers
 */
export async function syncInventoryCustomerIds() {
  console.log('🔗 Starting Inventory customer ID sync...');
  
  try {
    const customersSnapshot = await db.collection('customers')
      .where('zohoInventoryId', '==', null)
      .limit(50) // Process in batches to avoid timeouts
      .get();

    if (customersSnapshot.empty) {
      console.log('✅ All customers already have Inventory IDs');
      return { success: true, processed: 0 };
    }

    const batch = db.batch();
    let processedCount = 0;

    for (const doc of customersSnapshot.docs) {
      const customer = doc.data();
      
      if (customer.Primary_Email) {
        const inventoryId = await getInventoryContactIdByEmail(customer.Primary_Email);
        
        if (inventoryId) {
          batch.update(doc.ref, {
            zohoInventoryId: inventoryId,
            inventoryIdSyncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          processedCount++;
          console.log(`📋 Mapped ${customer.Account_Name} to Inventory ID: ${inventoryId}`);
        }
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (processedCount > 0) {
      await batch.commit();
    }

    console.log(`✅ Inventory ID sync complete: ${processedCount} customers mapped`);
    
    return { success: true, processed: processedCount };
    
  } catch (error) {
    console.error('❌ Inventory ID sync failed:', error);
    throw error;
  }
}

/**
 * Check if item data has actually changed
 */
function hasItemChanged(existing, newItem) {
  const fieldsToCheck = [
    'name', 'sku', 'rate', 'stock_on_hand', 
    'available_stock', 'status', 'description'
  ];
  
  return fieldsToCheck.some(field => existing[field] !== newItem[field]);
}

/**
 * Check if customer data has actually changed
 */
function hasCustomerChanged(existing, newCustomer) {
  const fieldsToCheck = [
    'Account_Name', 'Phone', 'Primary_Email',
    'Billing_City', 'Billing_Code', 'Billing_Country',
    'Billing_State', 'Billing_Street',
    'Primary_First_Name', 'Primary_Last_Name'
  ];
  
  // Check simple fields
  const simpleFieldsChanged = fieldsToCheck.some(field => 
    existing[field] !== newCustomer[field]
  );
  
  // Check agent assignment
  const agentChanged = JSON.stringify(existing.Agent) !== JSON.stringify(newCustomer.Agent);
  
  return simpleFieldsChanged || agentChanged;
}

/**
 * Get last sync timestamps
 */
export async function getSyncStatus() {
  try {
    const inventorySync = await db.collection('sync_metadata').doc('inventory').get();
    const customerSync = await db.collection('sync_metadata').doc('customers').get();
    
    return {
      inventory: inventorySync.exists ? inventorySync.data() : null,
      customers: customerSync.exists ? customerSync.data() : null,
      inMemoryTimestamps: {
        lastInventorySync,
        lastCustomerSync
      }
    };
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    return null;
  }
}

/**
 * Smart sync that only runs if enough time has passed
 */
export async function smartSync(forceSync = false) {
  const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();
  
  try {
    let shouldSyncInventory = forceSync || (now - lastInventorySync) > SYNC_INTERVAL;
    let shouldSyncCustomers = forceSync || (now - lastCustomerSync) > SYNC_INTERVAL;
    
    const results = {};
    
    if (shouldSyncInventory) {
      results.inventory = await syncInventory();
    } else {
      console.log('⏭️ Skipping inventory sync - too soon since last sync');
      results.inventory = { skipped: true, reason: 'Recent sync' };
    }
    
    if (shouldSyncCustomers) {
      results.customers = await syncCustomersFromCRM();
      
      // Also run inventory ID sync for new customers
      results.inventoryIds = await syncInventoryCustomerIds();
    } else {
      console.log('⏭️ Skipping customer sync - too soon since last sync');
      results.customers = { skipped: true, reason: 'Recent sync' };
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Smart sync failed:', error);
    throw error;
  }
}