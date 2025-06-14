// server/src/routes/searchTrends.js
import express from 'express';
import NodeCache from 'node-cache';

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour to save API credits

// ScrapingDog API configuration
const SCRAPINGDOG_API_KEY = process.env.SCRAPINGDOG_API_KEY;
const SCRAPINGDOG_BASE_URL = 'https://api.scrapingdog.com';

router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const cacheKey = `trends_${brandName}`;
    
    // Check cache first to save API credits
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, trends: cached, cached: true });
    }
    
    // Fetch from ScrapingDog Google Trends API
    const trends = await fetchGoogleTrends(brandName);
    
    // Also fetch product-specific trends
    const productTrends = await fetchProductTrends(brandName);
    
    const allTrends = [trends, ...productTrends].filter(Boolean);
    
    // Cache the results
    cache.set(cacheKey, allTrends);
    
    res.json({ 
      success: true, 
      trends: allTrends,
      cached: false 
    });
    
  } catch (error) {
    console.error('Search trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search trends',
      message: error.message
    });
  }
});

router.get('/test-config', (req, res) => {
  res.json({
    apiKeyPresent: !!process.env.SCRAPINGDOG_API_KEY,
    apiKeyLength: process.env.SCRAPINGDOG_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Fetch brand-level trends
async function fetchGoogleTrends(keyword) {
  try {
    // ScrapingDog Google Trends endpoint
    const params = new URLSearchParams({
      api_key: SCRAPINGDOG_API_KEY,
      keyword: keyword,
      geo: 'GB', // Great Britain
      time: 'today 3-m', // Last 3 months
      hl: 'en' // Language
    });
    
    const url = `${SCRAPINGDOG_BASE_URL}/google_trends?${params}`;
    
    console.log('Fetching trends for:', keyword);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ScrapingDog API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process ScrapingDog response
    return processScrapingDogData(data, keyword);
    
  } catch (error) {
    console.error('ScrapingDog error:', error);
    throw error;
  }
}

// Fetch product-specific trends (common product categories)
async function fetchProductTrends(brandName) {
  const productCategories = [
    'candles', 'diffusers', 'home decor', 'gifts', 'vases'
  ];
  
  const productTrends = [];
  
  // Fetch trends for top 3 product categories
  for (const category of productCategories.slice(0, 3)) {
    try {
      const keyword = `${brandName} ${category}`;
      const trend = await fetchGoogleTrends(keyword);
      if (trend) {
        productTrends.push(trend);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Failed to fetch trend for ${keyword}:`, error);
    }
  }
  
  return productTrends;
}

// Process ScrapingDog response into your format
function processScrapingDogData(data, keyword) {
  try {
    // ScrapingDog returns interest over time data
    const timelineData = data.interest_over_time || [];
    
    if (timelineData.length === 0) {
      return {
        keyword: keyword,
        volume: 0,
        trend: 'no_data',
        percentageChange: 0,
        relatedQueries: [],
        rawData: data
      };
    }
    
    // Calculate trend metrics
    const recentData = timelineData.slice(-4); // Last 4 data points
    const olderData = timelineData.slice(-8, -4); // Previous 4 data points
    
    const recentAvg = recentData.reduce((sum, item) => sum + (item.value || 0), 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, item) => sum + (item.value || 0), 0) / olderData.length;
    
    const percentageChange = olderAvg > 0 
      ? ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1)
      : 0;
    
    // Get the latest value as "volume" (relative 0-100)
    const latestValue = timelineData[timelineData.length - 1]?.value || 0;
    
    // Extract related queries if available
    const relatedQueries = data.related_queries?.map(q => q.query) || [];
    
    return {
      keyword: keyword,
      volume: latestValue * 100, // Scale up for display
      trend: percentageChange > 5 ? 'rising' : 
             percentageChange < -5 ? 'falling' : 'stable',
      percentageChange: parseFloat(percentageChange),
      relatedQueries: relatedQueries.slice(0, 5),
      timelineData: timelineData, // Include raw timeline for charts
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error processing ScrapingDog data:', error);
    return {
      keyword: keyword,
      volume: 0,
      trend: 'error',
      percentageChange: 0,
      relatedQueries: [],
      error: error.message
    };
  }
}

// Get related searches for a keyword
router.get('/related/:keyword', async (req, res) => {
  try {
    const { keyword } = req.params;
    
    const params = new URLSearchParams({
      api_key: SCRAPINGDOG_API_KEY,
      keyword: keyword,
      geo: 'GB',
      type: 'RELATED_QUERIES'
    });
    
    const url = `${SCRAPINGDOG_BASE_URL}/google_trends?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ScrapingDog API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      relatedQueries: data.related_queries || [],
      risingQueries: data.rising_queries || []
    });
    
  } catch (error) {
    console.error('Related queries error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get historical trend data for deeper analysis
router.get('/historical/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const { timeRange = 'today 12-m' } = req.query; // Default to 12 months
    
    const params = new URLSearchParams({
      api_key: SCRAPINGDOG_API_KEY,
      keyword: brandName,
      geo: 'GB',
      time: timeRange,
      hl: 'en'
    });
    
    const url = `${SCRAPINGDOG_BASE_URL}/google_trends?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ScrapingDog API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    res.json({
      success: true,
      historical: data.interest_over_time || [],
      averageInterest: calculateAverageInterest(data.interest_over_time),
      seasonalPatterns: identifySeasonalPatterns(data.interest_over_time)
    });
    
  } catch (error) {
    console.error('Historical data error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to calculate average interest
function calculateAverageInterest(timelineData) {
  if (!timelineData || timelineData.length === 0) return 0;
  
  const sum = timelineData.reduce((acc, item) => acc + (item.value || 0), 0);
  return Math.round(sum / timelineData.length);
}

// Helper function to identify seasonal patterns
function identifySeasonalPatterns(timelineData) {
  if (!timelineData || timelineData.length < 12) return null;
  
  // Group by month
  const monthlyAverages = {};
  
  timelineData.forEach(item => {
    const date = new Date(item.time);
    const month = date.toLocaleString('en-US', { month: 'short' });
    
    if (!monthlyAverages[month]) {
      monthlyAverages[month] = { total: 0, count: 0 };
    }
    
    monthlyAverages[month].total += item.value || 0;
    monthlyAverages[month].count += 1;
  });
  
  // Calculate averages
  const patterns = {};
  Object.entries(monthlyAverages).forEach(([month, data]) => {
    patterns[month] = Math.round(data.total / data.count);
  });
  
  return patterns;
}

export default router;