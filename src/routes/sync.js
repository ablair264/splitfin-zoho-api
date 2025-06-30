// server/src/routes/sync.js
import express from 'express';
import admin from 'firebase-admin';
import firestoreSyncService from '../firestoreSyncService.js';
import { syncInventory, syncCustomersFromCRM } from '../syncInventory.js';
import zohoInventoryService from '../services/zohoInventoryService.js';

const router = express.Router();

/**
 * Get pending sync changes for the current user
 * Query params:
 * - lastSyncTime: timestamp of last successful sync
 * - agentId: filter changes for specific agent (optional)
 */
router.get('/changes', async (req, res) => {
  try {
    const { lastSyncTime, agentId } = req.query;
    
    // Convert lastSyncTime to number if provided
    const lastSync = lastSyncTime ? parseInt(lastSyncTime) : null;
    
    const changes = await firestoreSyncService.getPendingSyncChanges(agentId, lastSync);
    
    res.json({
      success: true,
      changes,
      timestamp: Date.now(),
      count: changes.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching sync changes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/products-full', async (req, res) => {  // Remove the /sync prefix
  try {
    console.log('🚀 Starting full product sync...');
    
    const result = await zohoInventoryService.syncProductsWithChangeDetection();
    
    res.json({
      success: true,
      message: 'Product sync completed',
      stats: result.stats
    });
    
  } catch (error) {
    console.error('Product sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Mark specific changes as processed by the client
 */
router.post('/acknowledge', async (req, res) => {
  try {
    const { changeIds } = req.body;
    
    if (!Array.isArray(changeIds)) {
      return res.status(400).json({
        success: false,
        error: 'changeIds must be an array'
      });
    }
    
    await firestoreSyncService.markChangesAsProcessed(changeIds);
    
    res.json({
      success: true,
      message: `Marked ${changeIds.length} changes as processed`
    });
    
  } catch (error) {
    console.error('❌ Error acknowledging sync changes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync service status
 */
router.get('/status', (req, res) => {
  const status = firestoreSyncService.getStatus();
  
  res.json({
    success: true,
    syncService: status,
    timestamp: Date.now()
  });
});

/**
 * Manually trigger cleanup of old sync changes
 */
router.post('/cleanup', async (req, res) => {
  try {
    await firestoreSyncService.cleanupOldSyncChanges();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Force sync for a specific collection
 * Useful for testing or manual sync triggers
 */
router.post('/force/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const validCollections = ['customers', 'users', 'products'];
    
    if (!validCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collection. Must be one of: ${validCollections.join(', ')}`
      });
    }
    
    // Get all documents from the collection and broadcast as changes
    const db = admin.firestore();
    const snapshot = await db.collection(collection).get();
    
    const changes = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data(),
      changeType: 'modified', // Treat as modified for force sync
      timestamp: Date.now()
    }));
    
    await firestoreSyncService.broadcastChanges(collection, changes);
    
    res.json({
      success: true,
      message: `Force synced ${changes.length} documents from ${collection}`,
      count: changes.length
    });
    
  } catch (error) {
    console.error('❌ Error during force sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get filtered changes for a specific agent
 * This endpoint respects agent permissions and only returns relevant data
 */
router.get('/changes/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { lastSyncTime } = req.query;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      });
    }
    
    const lastSync = lastSyncTime ? parseInt(lastSyncTime) : null;
    const changes = await firestoreSyncService.getPendingSyncChanges(agentId, lastSync);
    
    res.json({
      success: true,
      changes,
      agentId,
      timestamp: Date.now(),
      count: changes.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching agent-specific changes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Batch endpoint for apps to sync multiple operations
 */
router.post('/batch', async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'operations must be an array'
      });
    }
    
    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case 'getChanges':
            const changes = await firestoreSyncService.getPendingSyncChanges(
              op.agentId, 
              op.lastSyncTime
            );
            results.push({
              type: 'getChanges',
              success: true,
              data: changes
            });
            break;
            
          case 'acknowledge':
            await firestoreSyncService.markChangesAsProcessed(op.changeIds);
            results.push({
              type: 'acknowledge',
              success: true,
              processed: op.changeIds.length
            });
            break;
            
          default:
            results.push({
              type: op.type,
              success: false,
              error: 'Unknown operation type'
            });
        }
      } catch (error) {
        results.push({
          type: op.type,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      results,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Error processing batch operations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// POST /api/sync
router.post('/', async (req, res) => {
  try {
    const result = await syncInventory();
    res.json({
      success: true,
      message: 'Inventory sync complete',
      result
    });
  } catch (error) {
    console.error('❌ Error during /api/sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sync-customers
router.post('/customers', async (req, res) => {
  try {
    const result = await syncCustomersFromCRM();
    res.json({
      success: true,
      message: 'Customer sync complete',
      result
    });
  } catch (error) {
    console.error('❌ Error during /api/sync-customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;