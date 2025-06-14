// server/src/scripts/deleteAllProducts.js
import admin from 'firebase-admin';
import '../config/firebase.js'; // Your Firebase initialization

async function deleteAllProducts() {
  const db = admin.firestore();
  
  console.log('🗑️ Starting product deletion...');
  
  try {
    // Get all products
    const productsSnapshot = await db.collection('products').get();
    console.log(`Found ${productsSnapshot.size} products to delete`);
    
    if (productsSnapshot.empty) {
      console.log('No products found to delete');
      return;
    }
    
    // Delete in batches
    const batchSize = 500;
    let batch = db.batch();
    let count = 0;
    
    for (const doc of productsSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      
      if (count % batchSize === 0) {
        await batch.commit();
        console.log(`Deleted ${count} products...`);
        batch = db.batch();
      }
    }
    
    // Commit remaining
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Successfully deleted ${count} products`);
    
    // Also clear normalized_products if it exists
    const normalizedSnapshot = await db.collection('normalized_products').get();
    if (!normalizedSnapshot.empty) {
      console.log(`Found ${normalizedSnapshot.size} normalized products to delete`);
      
      batch = db.batch();
      count = 0;
      
      for (const doc of normalizedSnapshot.docs) {
        batch.delete(doc.ref);
        count++;
        
        if (count % batchSize === 0) {
          await batch.commit();
          console.log(`Deleted ${count} normalized products...`);
          batch = db.batch();
        }
      }
      
      if (count % batchSize !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Successfully deleted ${count} normalized products`);
    }
    
  } catch (error) {
    console.error('❌ Error deleting products:', error);
    throw error;
  }
}

// Run the deletion
deleteAllProducts()
  .then(() => {
    console.log('✅ Product deletion completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Product deletion failed:', error);
    process.exit(1);
  });