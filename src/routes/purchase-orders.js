import express from 'express';
import PurchaseOrdersController from '../services/purchaseOrdersController.js';

const router = express.Router();
const purchaseOrdersController = new PurchaseOrdersController();

/**
 * Get purchase orders data for a specific date range
 * GET /api/purchase-orders/data?rangeKey=this_week
 */
router.get('/data', purchaseOrdersController.getPurchaseOrdersData.bind(purchaseOrdersController));

/**
 * Get purchase orders data for custom date range
 * GET /api/purchase-orders/data/custom?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/data/custom', purchaseOrdersController.getPurchaseOrdersDataCustomRange.bind(purchaseOrdersController));

/**
 * Trigger daily aggregation manually
 * POST /api/purchase-orders/aggregate
 */
router.post('/aggregate', purchaseOrdersController.runDailyAggregation.bind(purchaseOrdersController));

/**
 * Get available date ranges
 * GET /api/purchase-orders/ranges
 */
router.get('/ranges', purchaseOrdersController.getAvailableRanges.bind(purchaseOrdersController));

export default router; 