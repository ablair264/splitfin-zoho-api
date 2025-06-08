// server/src/routes/reports.js
import express from 'express';
import zohoReportsService from '../services/zohoReportsService.js';
import admin from 'firebase-admin';

const router = express.Router();

// Middleware to validate date range
function validateDateRange(req, res, next) {
  const validRanges = ['today', '7_days', '30_days', 'quarter', 'year', 'this_month', 'last_month', 'this_year', 'custom'];
  const { dateRange } = req.query;
  
  if (dateRange && !validRanges.includes(dateRange)) {
    return res.status(400).json({
      success: false,
      error: `Invalid date range. Must be one of: ${validRanges.join(', ')}`
    });
  }
  
  // Validate custom date range
  if (dateRange === 'custom') {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Custom date range requires startDate and endDate parameters'
      });
    }
  }
  
  next();
}

/**
 * Get role-based dashboard data
 * Query params: userId, dateRange, startDate (for custom), endDate (for custom)
 */
router.get('/dashboard', validateDateRange, async (req, res) => {
  try {
    const { userId, dateRange = '30_days', startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    const dashboardData = await zohoReportsService.getDashboardData(
      userId, 
      dateRange, 
      customDateRange
    );
    
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
 * Get revenue analysis (Brand Managers only)
 */
router.get('/revenue/analysis', validateDateRange, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    const revenue = await zohoReportsService.getRevenueAnalysis(dateRange, customDateRange);
    
    res.json({
      success: true,
      data: revenue,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching revenue analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch revenue analysis'
    });
  }
});

/**
 * Get brand performance metrics
 */
router.get('/brands/performance', validateDateRange, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    const brands = await zohoReportsService.getBrandPerformance(dateRange, customDateRange);
    
    res.json({
      success: true,
      data: brands,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching brand performance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch brand performance'
    });
  }
});

/**
 * Get regional performance metrics
 */
router.get('/regions/performance', validateDateRange, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    const regions = await zohoReportsService.getRegionalPerformance(dateRange, customDateRange);
    
    res.json({
      success: true,
      data: regions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching regional performance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch regional performance'
    });
  }
});

/**
 * Get invoices with filtering
 */
router.get('/invoices', validateDateRange, async (req, res) => {
  try {
    const { 
      dateRange = '30_days', 
      startDate, 
      endDate,
      status,
      agentId 
    } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    let invoices;
    
    if (agentId) {
      // Get agent's customer IDs from Firebase
      const db = admin.firestore();
      const customersSnapshot = await db.collection('customers')
        .where('Agent.id', '==', agentId)
        .get();
      
      const agentCustomerIds = customersSnapshot.docs.map(doc => 
        doc.data().zohoInventoryId || doc.id
      );
      
      invoices = await zohoReportsService.getAgentInvoices(
        agentCustomerIds, 
        dateRange, 
        customDateRange
      );
    } else {
      invoices = await zohoReportsService.getInvoices(dateRange, customDateRange);
    }
    
    // Filter by status if specified
    let filteredInvoices = invoices;
    if (status === 'outstanding') {
      filteredInvoices = {
        ...invoices,
        all: invoices.outstanding
      };
    } else if (status === 'paid') {
      filteredInvoices = {
        ...invoices,
        all: invoices.paid
      };
    }
    
    res.json({
      success: true,
      data: filteredInvoices,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch invoices'
    });
  }
});

/**
 * Get purchase orders (Brand Managers only)
 */
router.get('/purchase-orders', validateDateRange, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    const purchaseOrders = await zohoReportsService.getPurchaseOrders(
      dateRange, 
      customDateRange
    );
    
    res.json({
      success: true,
      data: {
        orders: purchaseOrders,
        summary: {
          total: purchaseOrders.length,
          totalValue: purchaseOrders.reduce((sum, order) => 
            sum + parseFloat(order.total || 0), 0
          ),
          averageValue: purchaseOrders.length > 0
            ? purchaseOrders.reduce((sum, order) => 
                sum + parseFloat(order.total || 0), 0
              ) / purchaseOrders.length
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch purchase orders'
    });
  }
});

/**
 * Enhanced metadata endpoint with all date ranges
 */
router.get('/metadata', (req, res) => {
  res.json({
    success: true,
    data: {
      dateRanges: [
        { value: 'today', label: 'Today' },
        { value: '7_days', label: 'Last 7 days' },
        { value: '30_days', label: 'Last 30 days' },
        { value: 'quarter', label: 'Last Quarter' },
        { value: 'year', label: 'Last Year' },
        { value: 'this_month', label: 'This month' },
        { value: 'last_month', label: 'Last month' },
        { value: 'this_year', label: 'This year' },
        { value: 'custom', label: 'Custom Date Range' }
      ],
      roles: [
        { value: 'brandManager', label: 'Brand Manager' },
        { value: 'salesAgent', label: 'Sales Agent' }
      ],
      brandManagerMetrics: [
        'Total Revenue (Gross & Net)',
        'Average Sales Order Value',
        'Average Purchase Order Value',
        'Latest Sales Orders',
        'Latest Paid Invoices',
        'Outstanding Invoices',
        'Top Performing Salespersons',
        'Top Performing Customers',
        'Top Selling Items',
        'Brand Performance',
        'Regional Performance'
      ],
      salesAgentMetrics: [
        'Total Orders (Number and Value)',
        'Latest Orders',
        'Customer Performance',
        'Top Selling Items',
        'Outstanding Invoices'
      ],
      endpoints: {
        dashboard: '/api/reports/dashboard',
        revenue: '/api/reports/revenue/analysis',
        brands: '/api/reports/brands/performance',
        regions: '/api/reports/regions/performance',
        invoices: '/api/reports/invoices',
        purchaseOrders: '/api/reports/purchase-orders'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;