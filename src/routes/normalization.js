// src/routes/normalization.js
import express from 'express';
import dataNormalizationService from '../services/dataNormalizerService.js';
import collectionDashboardService from '../services/collectionDashboardService.js';

const router = express.Router();

/**
 * Manually trigger data normalization
 */
router.post('/normalize', async (req, res) => {
  try {
    console.log('📊 Manual data normalization triggered');
    
    const result = await dataNormalizationService.normalizeAllData();
    
    res.json({
      success: true,
      message: 'Data normalization completed successfully',
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Data normalization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get normalization status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await dataNormalizationService.getNormalizationStatus();
    const health = await collectionDashboardService.healthCheck();
    
    res.json({
      success: true,
      normalization: status,
      health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting normalization status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test normalized dashboard data
 */
router.get('/test-dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dateRange = '30_days' } = req.query;
    
    console.log(`🧪 Testing normalized dashboard for user ${userId}`);
    
    const dashboardData = await collectionDashboardService.getDashboardData(
      userId,
      dateRange
    );
    
    res.json({
      success: true,
      data: dashboardData,
      structure: {
        hasMetrics: !!dashboardData.metrics,
        metricsKeys: dashboardData.metrics ? Object.keys(dashboardData.metrics) : [],
        hasRevenue: !!dashboardData.revenue,
        revenueAmount: dashboardData.revenue?.grossRevenue || 0,
        ordersCount: dashboardData.orders?.salesOrders?.total || 0,
        dataSource: dashboardData.dataSource
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test dashboard failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Normalize specific collection
 */
router.post('/normalize/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const validCollections = ['orders', 'customers', 'products', 'purchase_orders'];
    
    if (!validCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collection. Must be one of: ${validCollections.join(', ')}`
      });
    }
    
    console.log(`📊 Normalizing ${collection} collection...`);
    
    let result;
    switch (collection) {
      case 'orders':
        result = await dataNormalizationService.normalizeOrders();
        break;
      case 'customers':
        result = await dataNormalizationService.normalizeCustomers();
        break;
      case 'products':
        result = await dataNormalizationService.normalizeProducts();
        break;
      case 'purchase_orders':
        result = await dataNormalizationService.normalizePurchaseOrders();
        break;
    }
    
    res.json({
      success: true,
      message: `${collection} normalization completed`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ ${collection} normalization failed:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Preview normalized data
 */
router.get('/preview/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const { limit = 10 } = req.query;
    
    const validCollections = [
      'normalized_orders',
      'normalized_customers', 
      'normalized_products',
      'normalized_purchase_orders'
    ];
    
    if (!validCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collection. Must be one of: ${validCollections.join(', ')}`
      });
    }
    
    const db = admin.firestore();
    const snapshot = await db.collection(collection)
      .limit(parseInt(limit))
      .get();
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      collection,
      count: data.length,
      data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Preview failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;