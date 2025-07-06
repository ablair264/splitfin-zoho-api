// DM Brands AI Service Integration Guide
// Complete implementation with API routes and frontend integration

// ============================================
// 1. UPDATED API ROUTES (ai_insights.js)
// ============================================

import express from 'express';
import admin from 'firebase-admin';
import {
  // Core AI functions
  generateEnhancedInsights,
  generateCardInsights,
  generateAIInsights,
  
  // DM Brands specific functions
  analyzeStockPerformance,
  analyzeAgentPerformance,
  analyzeCompetitorPerformance,
  generateSeasonalStrategy,
  analyzeCustomerSegments,
  
  // Advanced analytics
  analyzeCrossSelling,
  analyzeBrandCannibalization,
  analyzeGeographicPerformance,
  predictCustomerLifetimeValue,
  optimizeCashFlow,
  analyzeProductLifecycle,
  analyzeWeatherImpact,
  analyzeEventImpact,
  analyzeSupplyChainRisks
} from '../services/dmBrandsAIService.js';

import competitorScraper from '../services/competitorWebScraperService.js';

const router = express.Router();

// Middleware for user validation
const validateUserForAI = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    // Verify user exists and has AI access
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    if (!userData.aiAccess) {
      return res.status(403).json({ error: 'AI access not granted' });
    }
    
    req.user = userData;
    next();
  } catch (error) {
    console.error('User validation error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Rate limiting middleware
const checkAIRateLimit = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.body.userId;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 10; // 10 requests per minute
    
    const rateLimitKey = `ai_rate_limit_${userId}`;
    const rateLimitDoc = await admin.firestore().collection('rate_limits').doc(rateLimitKey).get();
    
    if (rateLimitDoc.exists) {
      const rateData = rateLimitDoc.data();
      if (now - rateData.timestamp < windowMs && rateData.count >= maxRequests) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((windowMs - (now - rateData.timestamp)) / 1000)
        });
      }
    }
    
    // Update rate limit
    await admin.firestore().collection('rate_limits').doc(rateLimitKey).set({
      count: (rateLimitDoc.data()?.count || 0) + 1,
      timestamp: now
    });
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue on error
  }
};

// ============================================
// CORE AI INSIGHTS ENDPOINTS
// ============================================

// Enhanced Dashboard Insights
router.post('/dashboard-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { dashboardData } = req.body;
    
    if (!dashboardData) {
      return res.status(400).json({ error: 'Dashboard data required' });
    }
    
    const insights = await generateAIInsights(dashboardData);
    
    res.json({
      success: true,
      data: insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Insights generation failed'
    });
  }
});

// Card-specific insights
router.post('/card-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { cardType, cardData, dashboardData } = req.body;
    
    if (!cardType || !cardData) {
      return res.status(400).json({ error: 'Card type and data required' });
    }
    
    const insights = await generateCardInsights(cardType, cardData, dashboardData);
    
    res.json({
      success: true,
      data: insights,
      cardType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Card insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Card analysis failed'
    });
  }
});

// ============================================
// DM BRANDS SPECIFIC ENDPOINTS
// ============================================

// Stock Performance Analysis
router.post('/stock-analysis', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { stockData, salesHistory, marketData } = req.body;
    
    if (!stockData) {
      return res.status(400).json({ error: 'Stock data required' });
    }
    
    const insights = await analyzeStockPerformance(
      stockData,
      salesHistory || [],
      marketData || {}
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'stock_performance',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stock analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Stock analysis temporarily unavailable'
    });
  }
});

// Agent Performance Analysis (Respectful for Self-Employed Partners)
router.post('/agent-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { agentData, performanceHistory, customerBase } = req.body;
    
    if (!agentData) {
      return res.status(400).json({ error: 'Agent data required' });
    }
    
    const insights = await analyzeAgentPerformance(
      agentData,
      performanceHistory || [],
      customerBase || []
    );
    
    res.json({
      success: true,
      data: insights,
      tone: 'supportive_partner_focused',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Analysis temporarily unavailable'
    });
  }
});

// ============================================
// REAL COMPETITOR ANALYSIS ENDPOINTS
// ============================================

// Scrape and analyze competitor websites
router.post('/competitor-analysis', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { brands, saveToDatabase = true } = req.body;
    
    console.log('🔄 Starting competitor analysis...');
    
    // Scrape all competitor sites
    const scrapedData = await competitorScraper.scrapeAllCompetitors(brands);
    
    // Get our products for comparison
    const ourProducts = await getOurProducts();
    
    // Analyze each competitor
    const analysisResults = {};
    
    for (const [competitorKey, competitorData] of Object.entries(scrapedData)) {
      if (competitorData.error) {
        analysisResults[competitorKey] = { error: competitorData.error };
        continue;
      }
      
      try {
        const analysis = await competitorScraper.analyzeCompetitorData(competitorData, ourProducts);
        analysisResults[competitorKey] = analysis;
      } catch (error) {
        console.error(`Analysis failed for ${competitorKey}:`, error);
        analysisResults[competitorKey] = { error: 'Analysis failed' };
      }
    }
    
    // Save to database if requested
    if (saveToDatabase) {
      try {
        await competitorScraper.saveCompetitorData(scrapedData);
      } catch (error) {
        console.error('Failed to save competitor data:', error);
      }
    }
    
    res.json({
      success: true,
      data: {
        scrapedData,
        analysis: analysisResults
      },
      analysisType: 'real_competitor_analysis',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Competitor analysis failed'
    });
  }
});

// Get historical competitor data
router.get('/competitor-history/:competitorKey', validateUserForAI, async (req, res) => {
  try {
    const { competitorKey } = req.params;
    const { days = 30 } = req.query;
    
    const historicalData = await competitorScraper.getHistoricalData(competitorKey, parseInt(days));
    
    res.json({
      success: true,
      data: historicalData,
      competitor: competitorKey,
      days: parseInt(days),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical data'
    });
  }
});

// ============================================
// ADVANCED ANALYTICS ENDPOINTS
// ============================================

// Cross-Selling Analysis
router.post('/cross-selling-analysis', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { transactionData, productCatalog } = req.body;
    
    if (!transactionData) {
      return res.status(400).json({ error: 'Transaction data required' });
    }
    
    const insights = await analyzeCrossSelling(
      transactionData,
      productCatalog || {}
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'basket_analysis',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cross-selling analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Cross-selling analysis unavailable'
    });
  }
});

// Geographic Performance
router.post('/geographic-analysis', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { salesByRegion, agentTerritories, demographics } = req.body;
    
    if (!salesByRegion) {
      return res.status(400).json({ error: 'Sales data required' });
    }
    
    const insights = await analyzeGeographicPerformance(
      salesByRegion,
      agentTerritories || {},
      demographics || {}
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'geographic_performance',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Geographic analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Geographic analysis unavailable'
    });
  }
});

// Cash Flow Optimization
router.post('/cash-flow-optimization', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { purchaseOrders, paymentTerms, salesForecast } = req.body;
    
    if (!purchaseOrders) {
      return res.status(400).json({ error: 'Purchase order data required' });
    }
    
    const insights = await optimizeCashFlow(
      purchaseOrders,
      paymentTerms || {},
      salesForecast || {}
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'cash_flow_optimization',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cash flow analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Cash flow analysis unavailable'
    });
  }
});

// Seasonal Strategy
router.post('/seasonal-strategy', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { currentStock, historicalData, upcomingSeason } = req.body;
    
    if (!currentStock || !upcomingSeason) {
      return res.status(400).json({ error: 'Stock data and season required' });
    }
    
    const insights = await generateSeasonalStrategy(
      currentStock,
      historicalData || {},
      upcomingSeason
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'seasonal_strategy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Seasonal strategy error:', error);
    res.status(500).json({
      success: false,
      error: 'Seasonal planning unavailable'
    });
  }
});

// Customer Segmentation
router.post('/customer-segments', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { customerData, orderHistory } = req.body;
    
    if (!customerData) {
      return res.status(400).json({ error: 'Customer data required' });
    }
    
    const insights = await analyzeCustomerSegments(
      customerData,
      orderHistory || []
    );
    
    res.json({
      success: true,
      data: insights,
      analysisType: 'customer_segmentation',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Customer segmentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Customer analysis unavailable'
    });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      ai: 'operational',
      competitorScraper: 'operational',
      cache: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Clear cache
router.post('/clear-cache', validateUserForAI, async (req, res) => {
  try {
    // Clear AI cache
    const { insightCache } = await import('../services/aiAnalyticsService.js');
    insightCache.clear();
    
    // Clear competitor cache
    competitorScraper.cache.clear();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getOurProducts() {
  try {
    const productsSnapshot = await admin.firestore()
      .collection('products')
      .where('status', '==', 'active')
      .limit(100)
      .get();
    
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching our products:', error);
    return [];
  }
}

export default router;

