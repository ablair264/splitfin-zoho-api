import productSyncService from '../services/productSyncService.js';
import './config/firebase.js'; // Your Firebase initialization

async function runProductSync() {
  console.log('🚀 Starting product sync process...');
  console.log(`Time: ${new Date().toISOString()}`);
  
  try {
    // Check current status
    const status = await productSyncService.getSyncStatus();
    console.log('Current status:', status);
    
    // Run the sync
    const result = await productSyncService.syncProductsToFirebase();
    
    console.log('✅ Sync completed successfully!');
    console.log(`Total products synced: ${result.count}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
runProductSync()
  .then(() => {
    console.log('✅ Product sync process completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Product sync process failed:', error);
    process.exit(1);
  });