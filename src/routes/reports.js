// server/src/routes/reports.js - UPDATED TO USE DIRECT ZOHO DATA
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
 * Middleware to get user context and validate access
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
      zohospID: userData.zohospID,            // For Inventory API filtering
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
 * Middleware to check role permissions
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
 * ENHANCED: Get comprehensive dashboard data from Zoho APIs
 */
router.get('/dashboard', validateDateRange, getUserContext, async (req, res) => {
  try {
    const { dateRange = '30_days', startDate, endDate } = req.query;
    const { userId } = req.userContext;
    
    const customDateRange = dateRange === 'custom' 
      ? { start: startDate, end: endDate }
      : null;
    
    console.log(`📊 Fetching dashboard data for user ${userId}, role: ${req.userContext.role}`);
    
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
        userId: req.userContext.userId,
        name: req.userContext.name
      },
      dataSource: 'Zoho APIs (CRM + Inventory)',
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
 * NEW: Get detailed revenue analytics from Zoho
 */
router.get('/revenue/detailed', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
    try {
      const { dateRange = '30_days', startDate, endDate, breakdown = 'daily' } = req.query;
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const revenue = await zohoReportsService.getRevenueAnalysis(dateRange, customDateRange);
      const salesOrders = await zohoReportsService.getSalesOrders(dateRange, customDateRange);
      const brandPerformance = await zohoReportsService.getBrandPerformance(dateRange, customDateRange);
      
      // Calculate trends by period
      const trends = zohoReportsService.calculateTrends(salesOrders);
      
      // Calculate breakdown by source
      const revenueBySource = brandPerformance.brands.map(brand => ({
        source: brand.brand,
        revenue: brand.revenue,
        percentage: revenue.grossRevenue > 0 ? (brand.revenue / revenue.grossRevenue) * 100 : 0,
        growth: 0 // TODO: Calculate vs previous period
      }));
      
      res.json({
        success: true,
        data: {
          summary: revenue,
          trends: trends,
          breakdown: revenueBySource,
          topSources: revenueBySource.slice(0, 10)
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error fetching detailed revenue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch detailed revenue'
      });
    }
  }
);

/**
 * NEW: Get individual agent performance details
 */
router.get('/agents/individual/:agentId', 
  validateDateRange, 
  getUserContext, 
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { dateRange = '30_days', startDate, endDate } = req.query;
      
      // Check permissions - agents can only see their own data
      if (req.userContext.role === 'salesAgent' && req.userContext.zohospID !== agentId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - can only view your own performance'
        });
      }
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const [salesOrders, invoices] = await Promise.all([
        zohoReportsService.getSalesOrders(dateRange, customDateRange, agentId),
        zohoReportsService.getAgentInvoices(agentId, dateRange, customDateRange)
      ]);
      
      // Calculate agent-specific metrics
      const totalRevenue = salesOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const totalOrders = salesOrders.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const uniqueCustomers = new Set(salesOrders.map(order => order.customer_id)).size;
      
      res.json({
        success: true,
        data: {
          agentId,
          summary: {
            totalOrders,
            totalRevenue,
            avgOrderValue,
            customers: uniqueCustomers,
            outstandingInvoices: invoices.summary.totalOutstanding
          },
          orders: salesOrders.slice(0, 20), // Latest 20 orders
          invoices: invoices.outstanding.slice(0, 10), // Latest 10 outstanding invoices
          trends: zohoReportsService.calculateTrends(salesOrders)
        },
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
 * NEW: Get customer segmentation analysis
 */
router.get('/customers/segmentation', 
  validateDateRange, 
  getUserContext, 
  async (req, res) => {
    try {
      const { dateRange = '30_days', startDate, endDate } = req.query;
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const customerAnalytics = await zohoReportsService.getCustomerAnalytics(dateRange, customDateRange);
      
      res.json({
        success: true,
        data: customerAnalytics,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error fetching customer segmentation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch customer segmentation'
      });
    }
  }
);

/**
 * NEW: Get product performance matrix
 */
router.get('/products/performance', 
  validateDateRange, 
  getUserContext, 
  async (req, res) => {
    try {
      const { dateRange = '30_days', startDate, endDate } = req.query;
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const salesOrders = await zohoReportsService.getSalesOrders(dateRange, customDateRange);
      const topItems = zohoReportsService.calculateTopItems(salesOrders);
      
      // Get all products from CRM for inventory data
      const token = await zohoReportsService.getAccessToken();
      const products = await zohoReportsService.fetchPaginatedData(
        'https://www.zohoapis.eu/crm/v5/Products',
        {
          fields: 'Product_Name,Product_Code,Manufacturer,Unit_Price,Qty_in_Stock,Product_Active'
        }
      );
      
      // Enhance top items with inventory data
      const enhancedItems = topItems.map(item => {
        const product = products.find(p => p.id === item.itemId);
        return {
          ...item,
          unitPrice: product?.Unit_Price || 0,
          stockOnHand: product?.Qty_in_Stock || 0,
          manufacturer: product?.Manufacturer || '',
          isActive: product?.Product_Active !== false
        };
      });
      
      res.json({
        success: true,
        data: {
          topItems: enhancedItems,
          summary: {
            totalProducts: products.length,
            activeProducts: products.filter(p => p.Product_Active !== false).length,
            avgProductValue: enhancedItems.length > 0 ? 
              enhancedItems.reduce((sum, item) => sum + item.unitPrice, 0) / enhancedItems.length : 0,
            totalInventoryValue: products.reduce((sum, p) => 
              sum + (parseFloat(p.Unit_Price || 0) * parseInt(p.Qty_in_Stock || 0)), 0)
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error fetching product performance:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch product performance'
      });
    }
  }
);

/**
 * ENHANCED: Get brand performance comparison
 */
router.get('/brands/comparison', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
    try {
      const { dateRange = '30_days', startDate, endDate } = req.query;
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const brandPerformance = await zohoReportsService.getBrandPerformance(dateRange, customDateRange);
      
      // Add comparison metrics
      const enhancedBrands = brandPerformance.brands.map((brand, index) => ({
        ...brand,
        rank: index + 1,
        marketShare: brandPerformance.summary.totalRevenue > 0 ? 
          (brand.revenue / brandPerformance.summary.totalRevenue) * 100 : 0,
        color: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]
      }));
      
      res.json({
        success: true,
        data: {
          brands: enhancedBrands,
          summary: brandPerformance.summary,
          comparison: {
            topBrand: enhancedBrands[0],
            marketLeader: {
              name: enhancedBrands[0]?.brand,
              percentage: enhancedBrands[0]?.marketShare || 0
            },
            brandDiversity: enhancedBrands.length > 1 ? 
              1 - Math.pow(enhancedBrands[0].marketShare / 100, 2) : 0
          }
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error fetching brand comparison:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch brand comparison'
      });
    }
  }
);

/**
 * EXISTING ENDPOINTS WITH ZOHO DATA - Updated to use new service
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
        dataSource: 'Zoho Inventory API',
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
        dataSource: 'Zoho CRM + Inventory APIs',
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
    
    if (req.userContext.role === 'salesAgent') {
      const zohospID = req.userContext.zohospID;
      invoices = await zohoReportsService.getAgentInvoices(zohospID, dateRange, customDateRange);
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
      userRole: req.userContext.role,
      dataSource: 'Zoho Inventory API',
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
      salesOrders = await zohoReportsService.getSalesOrders(
        dateRange, 
        customDateRange, 
        req.userContext.zohospID
      );
    } else {
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
      dataSource: 'Zoho Inventory API',
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

router.get('/agents/performance', 
  validateDateRange, 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
    try {
      const { dateRange = '30_days', startDate, endDate } = req.query;
      
      const customDateRange = dateRange === 'custom' 
        ? { start: startDate, end: endDate }
        : null;
      
      const agentPerformance = await zohoReportsService.getAgentPerformance(dateRange, customDateRange);
      
      res.json({
        success: true,
        data: agentPerformance,
        dataSource: 'Zoho CRM + Inventory APIs',
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
 * NEW: Clear reports cache endpoint
 */
router.post('/cache/clear', 
  getUserContext, 
  requireRole(['brandManager', 'admin']), 
  async (req, res) => {
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
  }
);

/**
 * Enhanced metadata endpoint
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
      dataSource: 'Zoho APIs (CRM + Inventory)',
      caching: 'Enabled (5 minute cache)',
      endpoints: {
        dashboard: '/api/reports/dashboard',
        revenueDetailed: '/api/reports/revenue/detailed (Brand Managers only)',
        agentIndividual: '/api/reports/agents/individual/:agentId',
        customerSegmentation: '/api/reports/customers/segmentation',
        productPerformance: '/api/reports/products/performance',
        brandComparison: '/api/reports/brands/comparison (Brand Managers only)',
        revenue: '/api/reports/revenue/analysis (Brand Managers only)',
        brands: '/api/reports/brands/performance (Brand Managers only)',
        invoices: '/api/reports/invoices',
        salesOrders: '/api/reports/sales-orders',
        agentPerformance: '/api/reports/agents/performance (Brand Managers only)',
        clearCache: '/api/reports/cache/clear (Brand Managers only)'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;