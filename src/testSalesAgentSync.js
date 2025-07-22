// Test script to manually trigger sales agent counters update
// Run this with: node testSalesAgentSync.js

import admin from 'firebase-admin';
import salesAgentSyncService from './services/salesAgentSyncService.js';

// Initialize Firebase Admin (ensure your service account key is set up)
if (!admin.apps.length) {
  admin.initializeApp({
    // Your Firebase config
  });
}

async function testSalesAgentSync() {
  console.log('🚀 Starting manual sales agent counters update...');
  
  try {
    const result = await salesAgentSyncService.updateAllAgentCounters();
    
    console.log('✅ Sales agent sync completed:');
    console.log(`   - Processed: ${result.processed} agents`);
    console.log(`   - Errors: ${result.errors}`);
    console.log(`   - Timestamp: ${result.timestamp}`);
    
    // Test getting metrics for a specific agent
    if (result.processed > 0) {
      // You can replace this with a specific agent ID for testing
      const testAgentId = 'YOUR_TEST_AGENT_ID';
      console.log(`\n📊 Testing metrics retrieval for agent ${testAgentId}...`);
      
      const metrics = await salesAgentSyncService.getCurrentMetrics(testAgentId, 'this_month');
      console.log('Current month metrics:', metrics);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  process.exit(0);
}

// Run the test
testSalesAgentSync();
