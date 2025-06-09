// server/src/routes/ai-insights.js
import express from 'express';
import { 
  generateAIInsights, 
  generateCardInsights, 
  generateDrillDownInsights,
  generateComparativeInsights,
  generateSeasonalInsights
} from '../services/aiAnalyticsService.js';
import admin from 'firebase-admin';

const router = express.Router();

/**
 * Middleware to validate user context for AI insights
 */
async function validateUserForAI(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.userId = decodedToken.uid;
    
    // Get user context from Firestore
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(req.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    req.userContext = userDoc.data();
    next();
  } catch (error) {
    console.error('❌ Error validating user for AI:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid authorization token'
    });
  }
}

/**
 * Rate limiting for AI requests (to manage API costs)
 */
const aiRequestLimiter = new Map();
const AI_REQUEST_LIMIT = 20; // requests per hour per user
const AI_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkAIRateLimit(req, res, next) {
  const userId = req.userId;
  const now = Date.now();
  
  if (!aiRequestLimiter.has(userId)) {
    aiRequestLimiter.set(userId, { count: 1, window: now });
    return next();
  }
  
  const userLimit = aiRequestLimiter.get(userId);
  
  // Reset window if expired
  if (now - userLimit.window > AI_WINDOW_MS) {
    userLimit.count = 1;
    userLimit.window = now;
    return next();
  }
  
  // Check limit
  if (userLimit.count >= AI_REQUEST_LIMIT) {
    return res.status(429).json({
      success: false,
      error: 'AI request limit exceeded. Please try again later.',
      retryAfter: Math.ceil((AI_WINDOW_MS - (now - userLimit.window)) / 1000 / 60) // minutes
    });
  }
  
  userLimit.count++;
  next();
}

/**
 * Generate comprehensive dashboard AI insights
 */
router.post('/dashboard-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { dashboardData } = req.body;
    
    if (!dashboardData) {
      return res.status(400).json({
        success: false,
        error: 'Dashboard data is required'
      });
    }
    
    console.log(`🤖 Generating comprehensive AI insights for user ${req.userId}`);
    
    const insights = await generateAIInsights(dashboardData);
    
    res.json({
      success: true,
      data: insights,
      generatedAt: new Date().toISOString(),
      userRole: req.userContext.role
    });
    
  } catch (error) {
    console.error('❌ Error generating dashboard AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI insights'
    });
  }
});

/**
 * Generate card-specific AI insights
 */
router.post('/card-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { cardType, cardData, fullDashboardData } = req.body;
    
    if (!cardType || !cardData) {
      return res.status(400).json({
        success: false,
        error: 'Card type and data are required'
      });
    }
    
    console.log(`🤖 Generating AI insights for ${cardType} card for user ${req.userId}`);
    
    const insights = await generateCardInsights(cardType, cardData, fullDashboardData);
    
    res.json({
      success: true,
      data: insights,
      cardType,
      generatedAt: new Date().toISOString(),
      userRole: req.userContext.role
    });
    
  } catch (error) {
    console.error(`❌ Error generating ${req.body.cardType} AI insights:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to generate AI insights for ${req.body.cardType}`
    });
  }
});

/**
 * Generate drill-down view AI insights
 */
router.post('/drill-down-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { viewType, detailData, summaryData } = req.body;
    
    if (!viewType || !detailData) {
      return res.status(400).json({
        success: false,
        error: 'View type and detail data are required'
      });
    }
    
    console.log(`🤖 Generating drill-down AI insights for ${viewType} view for user ${req.userId}`);
    
    const insights = await generateDrillDownInsights(viewType, detailData, summaryData);
    
    res.json({
      success: true,
      data: insights,
      viewType,
      generatedAt: new Date().toISOString(),
      userRole: req.userContext.role
    });
    
  } catch (error) {
    console.error(`❌ Error generating drill-down AI insights for ${req.body.viewType}:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to generate drill-down insights for ${req.body.viewType}`
    });
  }
});

/**
 * Generate comparative period AI insights
 */
router.post('/comparative-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { currentData, previousData, comparisonType = 'period' } = req.body;
    
    if (!currentData || !previousData) {
      return res.status(400).json({
        success: false,
        error: 'Current and previous period data are required'
      });
    }
    
    console.log(`🤖 Generating comparative AI insights (${comparisonType}) for user ${req.userId}`);
    
    const insights = await generateComparativeInsights(currentData, previousData, comparisonType);
    
    res.json({
      success: true,
      data: insights,
      comparisonType,
      generatedAt: new Date().toISOString(),
      userRole: req.userContext.role
    });
    
  } catch (error) {
    console.error('❌ Error generating comparative AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparative insights'
    });
  }
});

/**
 * Generate seasonal planning AI insights
 */
router.post('/seasonal-insights', validateUserForAI, checkAIRateLimit, async (req, res) => {
  try {
    const { historicalData, currentSeason } = req.body;
    
    if (!historicalData) {
      return res.status(400).json({
        success: false,
        error: 'Historical data is required'
      });
    }
    
    const season = currentSeason || getCurrentSeason();
    
    console.log(`🤖 Generating seasonal AI insights for ${season} for user ${req.userId}`);
    
    const insights = await generateSeasonalInsights(historicalData, season);
    
    res.json({
      success: true,
      data: insights,
      season,
      generatedAt: new Date().toISOString(),
      userRole: req.userContext.role
    });
    
  } catch (error) {
    console.error('❌ Error generating seasonal AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate seasonal insights'
    });
  }
});

/**
 * Get AI usage statistics for the current user
 */
router.get('/usage-stats', validateUserForAI, async (req, res) => {
  try {
    const userId = req.userId;
    const userLimit = aiRequestLimiter.get(userId);
    
    const stats = {
      requestsUsed: userLimit ? userLimit.count : 0,
      requestsRemaining: AI_REQUEST_LIMIT - (userLimit ? userLimit.count : 0),
      windowResetTime: userLimit ? userLimit.window + AI_WINDOW_MS : Date.now() + AI_WINDOW_MS,
      limitPerHour: AI_REQUEST_LIMIT
    };
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting AI usage stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage statistics'
    });
  }
});

/**
 * Health check for AI service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Insights service is healthy',
    features: [
      'Dashboard comprehensive insights',
      'Card-specific insights',
      'Drill-down analysis',
      'Comparative period analysis',
      'Seasonal planning insights'
    ],
    rateLimit: {
      requestsPerHour: AI_REQUEST_LIMIT,
      windowMinutes: AI_WINDOW_MS / 1000 / 60
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Helper function to determine current season
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export default router;