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
 * NEW: Middleware to get user context and validate access
 */
async function getUserContext(req, res, next) {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }
    
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userData = userDoc.data();
    req.userContext = {
      userId,
      role: userData.role,
      agentCRMId: userData.agentID,           // For Firebase customer filtering
      zohospID: userData.zohospID,    // For Inventory API filtering
      email: userData.email,
      name: userData.name
    };
    
    next();
  } catch (error) {
    console.error('❌ Error getting user context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate user access'
    });
  }
}

/**
 * NEW: Middleware to check role permissions
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.userContext) {
      return res.status(401).json({
        success: false,
        error: 'User context required'
      });
    }
    
    if (!allowedRoles.includes(req.userContext.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    
    next();
  };
}

/**
 * Get role-based dashboard data - UPDATED with proper user context
 */
router.get('/dashboard', validateDateRange, getUserContext, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    const { userId } = req.userContext;
    
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
      userContext: {
        role: req.userContext.role,
        userId: req.userContext.userId
      },
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
 * Get revenue analysis (Brand Managers only) - UPDATED with role check
 */
router.get('/revenue/analysis', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
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
  }
);

/**
 * Get brand performance metrics - UPDATED with role check
 */
router.get('/brands/performance', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
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
  }
);

/**
 * Get regional performance metrics - UPDATED with role check
 */
router.get('/regions/performance', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
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
  }
);

/**
 * Get invoices with filtering - FIXED agent filtering
 */
router.get('/invoices', validateDateRange, getUserContext, async (req, res) => {
  try {
    const { 
      dateRange = '30_days', 
      startDate, 
      endDate,
      status
    } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    let invoices;
    
    // FIXED: Use proper agent context based on role
if (req.userContext.role === 'salesAgent') {
const zohospID = req.userContext.zohospID;

invoices = await zohoReportsService.getAgentInvoices(zohospID, dateRange, customDateRange);
    } else {
      // Brand managers see all invoices
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
      userRole: req.userContext.role,
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
 * Get sales orders - NEW endpoint with proper agent filtering
 */
router.get('/sales-orders', validateDateRange, getUserContext, async (req, res) => {
  try {
    const { 
      dateRange = '30_days', 
      startDate, 
      endDate 
    } = req.query;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    let salesOrders;
    
    if (req.userContext.role === 'salesAgent') {
      // Sales agents see only their orders (using Inventory ID)
      salesOrders = await zohoReportsService.getSalesOrders(
        dateRange, 
        customDateRange, 
        req.userContext.zohpspID  // Use Inventory ID for Inventory API
      );
    } else {
      // Brand managers see all orders
      salesOrders = await zohoReportsService.getSalesOrders(dateRange, customDateRange);
    }
    
    res.json({
      success: true,
      data: {
        orders: salesOrders,
        summary: {
          total: salesOrders.length,
          totalValue: salesOrders.reduce((sum, order) => 
            sum + parseFloat(order.total || 0), 0
          ),
          averageValue: salesOrders.length > 0
            ? salesOrders.reduce((sum, order) => 
                sum + parseFloat(order.total || 0), 0
              ) / salesOrders.length
            : 0
        }
      },
      userRole: req.userContext.role,
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
 * Get purchase orders (Brand Managers only) - UPDATED with role check
 */
router.get('/purchase-orders', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
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
  }
);

/**
 * Get agent performance (Brand Managers only) - NEW endpoint
 */
router.get('/agents/performance', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
    try {
      const { dateRange = '30_days' } = req.query;
      
      const agentPerformance = await zohoReportsService.getAgentPerformance(dateRange);
      
      res.json({
        success: true,
        data: agentPerformance,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error fetching agent performance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch agent performance'
      });
    }
  }
);

/**
 * Enhanced metadata endpoint with all date ranges - UPDATED
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
        { value: 'salesAgent', label: 'Sales Agent' },
        { value: 'admin', label: 'Administrator' }
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
        'Regional Performance',
        'Agent Performance Analysis'
      ],
      salesAgentMetrics: [
        'Total Orders (Number and Value)',
        'Latest Orders',
        'Customer Performance',
        'Top Selling Items',
        'Outstanding Invoices (Own Customers Only)',
        'Personal Sales Trends'
      ],
      security: {
        note: 'All endpoints require userId parameter. Sales agents can only access their own data.',
        agentIdTypes: {
          inventory: 'Used for Inventory API calls (sales orders, purchase orders)',
          crm: 'Used for Firebase customer filtering and CRM data'
        }
      },
      endpoints: {
        dashboard: '/api/reports/dashboard',
        revenue: '/api/reports/revenue/analysis (Brand Managers only)',
        brands: '/api/reports/brands/performance (Brand Managers only)',
        regions: '/api/reports/regions/performance (Brand Managers only)',
        invoices: '/api/reports/invoices',
        salesOrders: '/api/reports/sales-orders (NEW)',
        purchaseOrders: '/api/reports/purchase-orders (Brand Managers only)',
        agentPerformance: '/api/reports/agents/performance (Brand Managers only)'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;