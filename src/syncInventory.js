// server/src/syncInventory.js - Enhanced with delta sync
import admin from 'firebase-admin';
import { fetchItems, fetchCustomersFromCRM } from './api/zoho.js';
import { getInventoryContactIdByEmail } from './api/zoho.js';

const db = admin.firestore();

// Store last sync timestamps
let lastInventorySync = 0;
let lastCustomerSync = 0;

/**
 * Enhanced inventory sync with delta detection
 */
export async function syncInventory() {
  console.log('🔄 Starting inventory sync...');
  
  try {
    const items = await fetchItems();
    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const item of items) {
      const docRef = db.collection('products').doc(item.item_id);
      
      // Check if document exists and has changed
      const existingDoc = await docRef.get();
      
      if (!existingDoc.exists) {
        // New item
        batch.set(docRef, {
          ...item,
          lastModified: admin.firestore.FieldValue.serverTimestamp(),
          syncedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        addedCount++;
      } else {
        // Check if data has actually changed
        const existingData = existingDoc.data();
        const hasChanged = hasItemChanged(existingData, item);
        
        if (hasChanged) {
          batch.update(docRef, {
            ...item,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
            syncedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      await batch.commit();
      lastInventorySync = Date.now();
      
      // Store sync timestamp
      await db.collection('sync_metadata').doc('inventory').set({
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        itemsProcessed: items.length,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      });
    }

    console.log(`✅ Inventory sync complete: ${addedCount} added, ${updatedCount} updated, ${unchangedCount} unchanged`);
    
    return {
      success: true,
      stats: { added: addedCount, updated: updatedCount, unchanged: unchangedCount }
    };
    
  } catch (error) {
    console.error('❌ Inventory sync failed:', error);
    throw error;
  }
}

/**
 * Enhanced customer sync with proper Zoho ID mapping
 */
export async function syncCustomersFromCRM() {
  console.log('👥 Starting customer sync from CRM...');
  
  try {
    const accounts = await fetchCustomersFromCRM();
    const batch = db.batch();
    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const account of accounts) {
      // Use Zoho CRM ID as document ID for consistent mapping
      const docRef = db.collection('customers').doc(account.id);
      
      const customerData = {
        // Zoho identifiers
        zohoCRMId: account.id,
        zohoInventoryId: null, // Will be populated when needed
        
        // Customer data
        Account_Name: account.Account_Name,
        Phone: account.Phone,
        Primary_Email: account.Primary_Email,
        
        // Agent assignment
        Agent: account.Agent ? {
          id: account.Agent.id,
          name: account.Agent.name
        } : null,
        
        // Address information
        Billing_City: account.Billing_City,
        Billing_Code: account.Billing_Code,
        Billing_Country: account.Billing_Country,
        Billing_State: account.Billing_State,
        Billing_Street: account.Billing_Street,
        
        // Contact person
        Primary_First_Name: account.Primary_First_Name,
        Primary_Last_Name: account.Primary_Last_Name,
        
        // Sync metadata
        lastModified: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const existingDoc = await docRef.get();
      
      if (!existingDoc.exists) {
        batch.set(docRef, customerData);
        addedCount++;
      } else {
        const existingData = existingDoc.data();
        const hasChanged = hasCustomerChanged(existingData, customerData);
        
        if (hasChanged) {
          // Preserve existing zohoInventoryId if it exists
          if (existingData.zohoInventoryId) {
            customerData.zohoInventoryId = existingData.zohoInventoryId;
          }
          
          batch.update(docRef, customerData);
          updatedCount++;
        } else {
          unchangedCount++;
        }
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      await batch.commit();
      lastCustomerSync = Date.now();
      
      await db.collection('sync_metadata').doc('customers').set({
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        customersProcessed: accounts.length,
        added: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      });
    }

    console.log(`✅ Customer sync complete: ${addedCount} added, ${updatedCount} updated, ${unchangedCount} unchanged`);
    
    return {
      success: true,
      stats: { added: addedCount, updated: updatedCount, unchanged: unchangedCount }
    };
    
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