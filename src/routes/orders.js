import express from 'express';
import OrdersController from '../services/ordersController.js';

const router = express.Router();
const ordersController = new OrdersController();

/**
 * Get orders data for a specific date range
 * GET /api/orders/data?rangeKey=this_week
 */
router.get('/data', ordersController.getOrdersData.bind(ordersController));

/**
 * Get orders data for custom date range
 * GET /api/orders/data/custom?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/data/custom', ordersController.getOrdersDataCustomRange.bind(ordersController));

/**
 * Trigger daily aggregation manually
 * POST /api/orders/aggregate
 */
router.post('/aggregate', ordersController.runDailyAggregation.bind(ordersController));

/**
 * Get available date ranges
 * GET /api/orders/ranges
 */
router.get('/ranges', ordersController.getAvailableRanges.bind(ordersController));

export default router; 