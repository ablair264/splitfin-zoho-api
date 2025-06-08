// server/src/routes/reports.js
import express from 'express';
import zohoReportsService from '../services/zohoReportsService.js';

const router = express.Router();

// Middleware to validate date range
function validateDateRange(req, res, next) {
  const validRanges = ['7_days', '30_days', '90_days', 'this_month', 'last_month', 'this_year'];
  const { dateRange } = req.query;
  
  if (dateRange && !validRanges.includes(dateRange)) {
    return res.status(400).json({
      success: false,
      error: `Invalid date range. Must be one of: ${validRanges.join(', ')}`
    });
  }
  
  next();
}

/**
 * Get comprehensive dashboard data
 * Query params: agentId, dateRange
 */
router.get('/dashboard', validateDateRange, async (req, res) => {
  try {
    const { agentId, dateRange = '30_days' } = req.query;
    
    const dashboardData = await zohoReportsService.getDashboardData(agentId, dateRange);
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dashboard data'
    });
  }
});

/**
 * Get sales overview
 * Query params: agentId, dateRange
 */
router.get('/sales/overview', validateDateRange, async (req, res) => {
  try {
    const { agentId, dateRange = '30_days' } = req.query;
    
    const overview = await zohoReportsService.getSalesOverview(dateRange, agentId);
    
    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching sales overview:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales overview'
    });
  }
});

/**
 * Get sales trends
 * Query params: agentId, period (daily/weekly/monthly), months
 */
router.get('/sales/trends', async (req, res) => {
  try {
    const { 
      agentId, 
      period = 'monthly', 
      months = 12 
    } = req.query;
    
    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    const monthsNum = parseInt(months);
    if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
      return res.status(400).json({
        success: false,
        error: 'Months must be a number between 1 and 24'
      });
    }
    
    const trends = await zohoReportsService.getSalesTrends(period, monthsNum, agentId);
    
    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales trends'
    });
  }
});

/**
 * Get inventory insights
 */
router.get('/inventory/insights', async (req, res) => {
  try {
    const insights = await zohoReportsService.getInventoryInsights();
    
    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching inventory insights:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch inventory insights'
    });
  }
});

/**
 * Get agent performance
 * Query params: dateRange
 */
router.get('/agents/performance', validateDateRange, async (req, res) => {
  try {
    const { dateRange = '30_days' } = req.query;
    
    const performance = await zohoReportsService.getAgentPerformance(dateRange);
    
    res.json({
      success: true,
      data: performance,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching agent performance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch agent performance'
    });
  }
});

/**
 * Get top selling items
 * Query params: agentId, dateRange, limit
 */
router.get('/sales/top-items', validateDateRange, async (req, res) => {
  try {
    const { 
      agentId, 
      dateRange = '30_days',
      limit = 20 
    } = req.query;
    
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 100'
      });
    }
    
    const items = await zohoReportsService.getTopSellingItems(dateRange, agentId);
    
    res.json({
      success: true,
      data: {
        items: items.slice(0, limitNum),
        period: dateRange,
        agentId,
        total: items.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching top selling items:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch top selling items'
    });
  }
});

/**
 * Get customer statistics
 * Query params: agentId, dateRange
 */
router.get('/customers/stats', validateDateRange, async (req, res) => {
  try {
    const { agentId, dateRange = '30_days' } = req.query;
    
    const stats = await zohoReportsService.getCustomerStats(dateRange, agentId);
    
    res.json({
      success: true,
      data: {
        ...stats,
        period: dateRange,
        agentId
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch customer stats'
    });
  }
});

/**
 * Get sales orders with filtering
 * Query params: agentId, dateRange, status, limit, offset
 */
router.get('/sales/orders', validateDateRange, async (req, res) => {
  try {
    const { 
      agentId, 
      dateRange = '30_days',
      status,
      limit = 50,
      offset = 0
    } = req.query;
    
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be a number between 1 and 200'
      });
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Offset must be a non-negative number'
      });
    }
    
    let orders = await zohoReportsService.getSalesOrders(dateRange, agentId);
    
    // Filter by status if specified
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    // Apply pagination
    const paginatedOrders = orders.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          total: orders.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < orders.length
        },
        filters: {
          agentId,
          dateRange,
          status
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching sales orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sales orders'
    });
  }
});

/**
 * Clear reports cache (for development/testing)
 */
router.post('/cache/clear', async (req, res) => {
  try {
    zohoReportsService.clearCache();
    
    res.json({
      success: true,
      message: 'Reports cache cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear cache'
    });
  }
});

/**
 * Get available report options/metadata
 */
router.get('/metadata', (req, res) => {
  res.json({
    success: true,
    data: {
      dateRanges: [
        { value: '7_days', label: 'Last 7 days' },
        { value: '30_days', label: 'Last 30 days' },
        { value: '90_days', label: 'Last 90 days' },
        { value: 'this_month', label: 'This month' },
        { value: 'last_month', label: 'Last month' },
        { value: 'this_year', label: 'This year' }
      ],
      trendPeriods: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' }
      ],
      orderStatuses: [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'shipped', label: 'Shipped' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      endpoints: {
        dashboard: '/api/reports/dashboard',
        salesOverview: '/api/reports/sales/overview',
        salesTrends: '/api/reports/sales/trends',
        inventoryInsights: '/api/reports/inventory/insights',
        agentPerformance: '/api/reports/agents/performance',
        topItems: '/api/reports/sales/top-items',
        customerStats: '/api/reports/customers/stats',
        salesOrders: '/api/reports/sales/orders'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;