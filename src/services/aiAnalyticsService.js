// src/services/aiAnalyticsService.js - Enhanced version

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Import existing utilities
import { 
  estimateTokens, 
  summarizeData, 
  ContextManager, 
  PromptBuilder 
} from './aiAnalyticsService.js';

/**
 * Enhanced MetricCard Insights with Deep Analysis
 */
export async function generateEnhancedCardInsights(cardType, cardData, fullDashboardData) {
  try {
    console.log('🧠 Generating enhanced insights for:', cardType);
    
    // Get historical data for comparison
    const historicalData = await fetchHistoricalData(
      fullDashboardData.userId,
      fullDashboardData.dateRange,
      cardType
    );
    
    // Get detailed analysis based on card type
    switch (cardType) {
      case 'orders':
      case 'total_orders':
        return await analyzeTotalOrders(cardData, fullDashboardData, historicalData);
        
      case 'revenue':
      case 'total_revenue':
      case 'order_value':
        return await analyzeRevenue(cardData, fullDashboardData, historicalData);
        
      case 'aov':
      case 'average_order_value':
        return await analyzeAOV(cardData, fullDashboardData, historicalData);
        
      case 'invoices':
      case 'outstanding_invoices':
        return await analyzeInvoices(cardData, fullDashboardData, historicalData);
        
      case 'orders_vs_last_year':
        return await analyzeYearOverYear(cardData, fullDashboardData, 'orders');
        
      case 'value_vs_last_year':
        return await analyzeYearOverYear(cardData, fullDashboardData, 'value');
        
      case 'customers':
        return await analyzeCustomers(cardData, fullDashboardData, historicalData);
        
      case 'agents':
        return await analyzeAgents(cardData, fullDashboardData, historicalData);
        
      case 'brands':
        return await analyzeBrands(cardData, fullDashboardData, historicalData);
        
      default:
        return await generateCardInsights(cardType, cardData, fullDashboardData);
    }
  } catch (error) {
    console.error('Error in enhanced card insights:', error);
    throw error;
  }
}

/**
 * Analyze Total Orders with deep insights
 */
async function analyzeTotalOrders(cardData, dashboardData, historicalData) {
  const prompt = `
    You are analyzing order data for DM Brands, a UK luxury import company.
    
    CURRENT DATA:
    - Total Orders: ${cardData.count || cardData.totalOrders || 0}
    - Order Value: £${cardData.totalValue || cardData.revenue || 0}
    - Average Order Value: £${cardData.averageValue || cardData.aov || 0}
    - Date Range: ${dashboardData.dateRange}
    
    ITEM ANALYSIS:
    ${JSON.stringify(dashboardData.performance?.top_items?.slice(0, 10) || [])}
    
    HISTORICAL COMPARISON:
    ${JSON.stringify(historicalData)}
    
    ANALYZE:
    1. Item Variety & Trends:
       - Is there a specific item more popular than others?
       - Are there new trending items?
       - Any items showing declining popularity?
    
    2. Order Value Analysis:
       - How does average order value compare to historical data?
       - What can be done to improve/maintain AOV?
    
    3. Order Volume Trends:
       - How do total orders compare to historical trends?
       - Analyze seasonal patterns
       - Monthly comparisons within the date range
    
    Provide specific, actionable insights with numbers and percentages.
    
    Return as JSON:
    {
      "insight": "Comprehensive analysis with specific findings",
      "itemTrends": {
        "topItem": "name and performance",
        "emergingTrends": ["trend1", "trend2"],
        "decliningItems": ["item1", "item2"]
      },
      "valueAnalysis": {
        "currentAOV": number,
        "historicalComparison": "percentage change",
        "recommendations": ["rec1", "rec2"]
      },
      "volumeTrends": {
        "comparison": "vs historical",
        "seasonalPattern": "description",
        "monthlyTrend": "description"
      },
      "trend": "increasing|decreasing|stable|volatile",
      "action": "Primary recommendation",
      "priority": "high|medium|low",
      "impact": "Potential business impact"
    }
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
}

/**
 * Analyze Revenue with comprehensive insights
 */
async function analyzeRevenue(cardData, dashboardData, historicalData) {
  const prompt = `
    Analyze revenue performance for DM Brands luxury imports.
    
    CURRENT REVENUE DATA:
    - Total Revenue: £${cardData.current || cardData.revenue || 0}
    - Order Count: ${cardData.orders || cardData.orderCount || 0}
    - Average per Order: £${cardData.average || 0}
    
    BRAND PERFORMANCE:
    ${JSON.stringify(dashboardData.performance?.brands || [])}
    
    CUSTOMER SEGMENTS:
    ${JSON.stringify(dashboardData.performance?.top_customers?.slice(0, 10) || [])}
    
    HISTORICAL DATA:
    ${JSON.stringify(historicalData)}
    
    ANALYZE:
    1. Revenue trends and patterns
    2. Brand/product contribution to revenue
    3. Customer segment analysis
    4. Growth opportunities
    5. Risk factors
    
    Return comprehensive JSON with:
    - insight: Main findings
    - revenueBreakdown: By brand/product
    - customerAnalysis: Segment performance
    - growthDrivers: Key factors
    - recommendations: Specific actions
    - forecast: Next period prediction
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
}

/**
 * Analyze Average Order Value patterns
 */
async function analyzeAOV(cardData, dashboardData, historicalData) {
  const prompt = `
    Analyze Average Order Value for DM Brands.
    
    CURRENT AOV: £${cardData.averageValue || 0}
    TARGET AOV: £600
    
    ORDER DISTRIBUTION:
    - Recent orders with values
    - Bundle patterns
    - Product mix impact
    
    FACTORS ANALYSIS:
    1. What's driving current AOV?
    2. Which products/brands contribute most?
    3. Customer behavior patterns
    4. Seasonal impacts
    
    IMPROVEMENT STRATEGIES:
    - Bundle recommendations
    - Pricing optimization
    - Upsell opportunities
    - Customer targeting
    
    Return detailed JSON analysis.
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
}

/**
 * Fetch historical data for comparison
 */
async function fetchHistoricalData(userId, currentRange, metricType) {
  try {
    // Calculate comparison periods
    const periods = calculateComparisonPeriods(currentRange);
    
    // Fetch data from Firebase for each period
    const historicalData = {
      lastPeriod: await fetchPeriodData(userId, periods.lastPeriod, metricType),
      lastYear: await fetchPeriodData(userId, periods.lastYear, metricType),
      seasonal: await fetchSeasonalData(userId, metricType)
    };
    
    return historicalData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return null;
  }
}

/**
 * Enhanced Purchase Order Insights with Search Trends
 */
export async function generateEnhancedPurchaseInsights(brand, suggestions, comprehensiveData) {
  try {
    // Fetch search trends from external API
    const searchTrends = await fetchSearchTrends(brand);
    
    // Analyze competitor data
    const competitorAnalysis = await analyzeCompetitors(brand, suggestions);
    
    const prompt = `
      Comprehensive purchase order analysis for ${brand}.
      
      BUSINESS DATA:
      ${JSON.stringify(comprehensiveData)}
      
      SEARCH TRENDS:
      ${JSON.stringify(searchTrends)}
      
      COMPETITOR ANALYSIS:
      ${JSON.stringify(competitorAnalysis)}
      
      PURCHASE SUGGESTIONS:
      ${JSON.stringify(suggestions)}
      
      PROVIDE DEEP ANALYSIS:
      1. Market Demand Analysis
         - Search volume trends
         - Seasonal patterns
         - Emerging product interests
      
      2. Competitive Positioning
         - Price competitiveness
         - Stock availability vs competitors
         - Market share opportunities
      
      3. Cash Flow Optimization
         - Impact on working capital
         - Payment term considerations
         - ROI projections
      
      4. Risk Assessment
         - Overstock risks
         - Obsolescence probability
         - Market volatility
      
      5. Strategic Recommendations
         - Optimal order quantities
         - Timing recommendations
         - Product mix optimization
      
      Return comprehensive JSON analysis.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('Error in enhanced purchase insights:', error);
    throw error;
  }
}

/**
 * Fetch search trends from external APIs
 */
async function fetchSearchTrends(brand) {
  try {
    // This would integrate with Google Trends API or similar
    // For now, returning mock data structure
    return {
      brandTrend: {
        interest: 75,
        direction: 'rising',
        seasonality: 'high in Q4'
      },
      productTrends: [
        {
          keyword: `${brand} candles`,
          volume: 2400,
          trend: 'rising',
          competition: 'medium'
        },
        {
          keyword: `${brand} home decor`,
          volume: 1800,
          trend: 'stable',
          competition: 'high'
        }
      ],
      relatedSearches: [
        'luxury home accessories',
        'scandinavian design',
        'sustainable homeware'
      ]
    };
  } catch (error) {
    console.error('Error fetching search trends:', error);
    return null;
  }
}

/**
 * Enhanced Forecasting Analysis
 */
export async function generateEnhancedForecast(dashboardData) {
  try {
    // Gather comprehensive historical data
    const historicalAnalysis = await analyzeHistoricalTrends(dashboardData);
    const seasonalPatterns = await identifySeasonalPatterns(dashboardData);
    const customerAnalysis = await analyzeCustomerBehavior(dashboardData);
    const agentPerformance = await analyzeAgentTrends(dashboardData);
    
    const prompt = `
      Generate comprehensive business forecast for DM Brands.
      
      HISTORICAL TRENDS:
      ${JSON.stringify(historicalAnalysis)}
      
      SEASONAL PATTERNS:
      ${JSON.stringify(seasonalPatterns)}
      
      CUSTOMER ANALYSIS:
      ${JSON.stringify(customerAnalysis)}
      
      AGENT PERFORMANCE:
      ${JSON.stringify(agentPerformance)}
      
      PROVIDE:
      1. 3-Month Revenue Forecast
         - Expected revenue by month
         - Confidence intervals
         - Key assumptions
      
      2. Seasonal Trend Analysis
         - Upcoming seasonal impacts
         - Product category performance
         - Inventory recommendations
      
      3. Customer Behavior Predictions
         - Churn risk assessment
         - Growth opportunities
         - Segment-specific strategies
      
      4. Agent Performance Optimization
         - Performance trajectories
         - Training needs
         - Territory adjustments
      
      5. Risk Factors & Mitigation
         - Market risks
         - Operational challenges
         - Mitigation strategies
      
      Return detailed forecast with specific numbers and recommendations.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('Error generating forecast:', error);
    throw error;
  }
}

/**
 * Agent Performance Deep Dive
 */
export async function generateAgentInsights(agentData, performanceHistory, customerBase) {
  try {
    const prompt = `
      Deep analysis of sales agent performance for ${agentData.name}.
      
      CURRENT PERFORMANCE:
      - Revenue: £${agentData.totalRevenue || 0}
      - Orders: ${agentData.totalOrders || 0}
      - Customers: ${agentData.customerCount || 0}
      - Brands: ${JSON.stringify(agentData.brandsAssigned)}
      
      HISTORICAL PERFORMANCE:
      ${JSON.stringify(performanceHistory)}
      
      CUSTOMER BASE ANALYSIS:
      ${JSON.stringify(customerBase)}
      
      ANALYZE:
      1. Performance Trends
         - Revenue trajectory
         - Order patterns
         - Seasonal variations
      
      2. Customer Relationship Quality
         - Customer retention
         - Average customer value
         - Relationship depth
      
      3. Brand Performance
         - Best performing brands
         - Underperforming categories
         - Cross-selling opportunities
      
      4. Efficiency Metrics
         - Orders per customer
         - Revenue per visit
         - Time allocation
      
      5. Improvement Opportunities
         - Territory optimization
         - Customer targeting
         - Skill development
      
      Return comprehensive analysis with actionable recommendations.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error('Error generating agent insights:', error);
    throw error;
  }
}

// Export all functions
export {
  generateEnhancedCardInsights,
  generateEnhancedPurchaseInsights,
  generateEnhancedForecast,
  generateAgentInsights,
  fetchSearchTrends
};