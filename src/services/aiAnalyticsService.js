import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Enhanced AI Analytics Service for DM Brands Limited
 * Provides contextual insights for different dashboard components
 */

/**
 * Base context for DM Brands Limited business understanding
 */
const DM_BRANDS_CONTEXT = `
You are an expert business analyst for DM Brands Limited, a UK-based premium import company specializing in European luxury home and giftware. 

**Company Background:**
- DM Brands imports high-end European brands to sell to UK businesses
- Primary sales model: Sales agents visit and contact B2B customers
- Product portfolio: Luxury home décor, premium giftware, lifestyle products
- Target market: UK retailers, boutiques, and specialty stores
- Sales cycle: Relationship-driven with seasonal trends

**Current Brand Portfolio Analysis:**
- Remember: Design-forward home accessories with strong seasonal appeal
- Relaxound: Premium audio lifestyle products with high average order values
- Räder: Traditional European home décor with consistent demand
- My Flame Lifestyle: Scented lifestyle products with growing market share
- Elvang: Luxury textiles with premium positioning
- Blomus: Modern design homeware with architectural appeal

**Key Business Drivers:**
- Agent relationship management and territory optimization
- Seasonal buying patterns (Christmas, Spring, Summer gift seasons)
- Customer loyalty and repeat business cycles
- Product mix optimization for margin improvement
- Geographic expansion opportunities
- Inventory turnover and cash flow management

**Success Metrics:**
- Agent productivity and territory performance
- Customer acquisition vs. retention balance
- Average order values and frequency
- Brand performance and market penetration
- Seasonal sales optimization
- Cash flow from outstanding invoices management

When analyzing data, focus on actionable insights that can improve:
1. Sales agent effectiveness and territory management
2. Customer relationship development and retention
3. Product portfolio optimization and brand performance
4. Seasonal planning and inventory management
5. Cash flow improvement through better invoice management
`;

/**
 * Generate comprehensive dashboard insights
 */
export async function generateAIInsights(dashboardData) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **COMPREHENSIVE DASHBOARD ANALYSIS**
    
    **Data Period:** ${dashboardData.dateRange}
    **User Role:** ${dashboardData.role}
    
    **REVENUE ANALYSIS:**
    ${JSON.stringify(dashboardData.revenue, null, 2)}
    
    **SALES PERFORMANCE:**
    ${JSON.stringify(dashboardData.orders, null, 2)}
    
    **AGENT PERFORMANCE:**
    ${JSON.stringify(dashboardData.agentPerformance, null, 2)}
    
    **CUSTOMER INSIGHTS:**
    ${JSON.stringify(dashboardData.overview?.customers, null, 2)}
    
    **BRAND PERFORMANCE:**
    ${JSON.stringify(dashboardData.performance?.brands, null, 2)}
    
    **TOP SELLING ITEMS:**
    ${JSON.stringify(dashboardData.overview?.topItems, null, 2)}
    
    **OUTSTANDING INVOICES:**
    ${JSON.stringify(dashboardData.invoices?.summary, null, 2)}
    
    **ANALYSIS REQUIREMENTS:**
    
    Generate a comprehensive business analysis as a JSON object with these keys:
    
    1. **"summary"**: 2-3 sentences providing executive-level overview of business performance, highlighting the most critical insights for DM Brands' luxury import business model.
    
    2. **"keyDrivers"**: 3-4 specific bullet points identifying the primary factors driving current performance. Focus on:
       - Agent productivity patterns and territory effectiveness
       - Brand performance trends and customer preferences  
       - Seasonal impacts and market dynamics
       - Customer loyalty and acquisition patterns
    
    3. **"recommendations"**: 4-5 prioritized, actionable recommendations with specific focus on:
       - Sales agent coaching and territory optimization opportunities
       - Customer relationship development strategies
       - Product portfolio and brand mix optimization
       - Seasonal planning and inventory management improvements
       - Cash flow optimization through invoice management
    
    4. **"criticalAlerts"**: 1-2 urgent issues requiring immediate attention (if any), such as:
       - Significant agent performance drops
       - Major customer payment delays
       - Inventory or cash flow concerns
       - Market opportunity risks
    
    5. **"opportunities"**: 2-3 growth opportunities based on the data, such as:
       - Underperforming territories with potential
       - Customer expansion possibilities
       - Product category growth areas
       - Seasonal optimization chances
    
    **IMPORTANT:** Only reference agents with real names (ignore "Undefined" or "Unknown" agents). Focus on actionable insights specific to DM Brands' luxury import business model.
    
    Respond with ONLY a clean JSON object - no markdown formatting or code blocks.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error("❌ Error generating comprehensive AI insights:", error);
    return {
      summary: "AI analysis could not be completed at this time.",
      keyDrivers: ["Data analysis temporarily unavailable"],
      recommendations: ["Please try again later"],
      criticalAlerts: [],
      opportunities: []
    };
  }
}

/**
 * Generate card-specific AI insights for individual metrics
 */
export async function generateCardInsights(cardType, cardData, fullDashboardData) {
  const contextPrompts = {
    revenue: `
      **REVENUE PERFORMANCE ANALYSIS**
      
      Current Revenue Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Brand Performance: ${JSON.stringify(fullDashboardData.performance?.brands?.slice(0, 3), null, 2)}
      - Top Items: ${JSON.stringify(fullDashboardData.overview?.topItems?.slice(0, 3), null, 2)}
      - Agent Performance: ${JSON.stringify(fullDashboardData.agentPerformance?.summary, null, 2)}
      
      **Analysis Focus:**
      Analyze revenue performance for DM Brands' luxury import business. Consider:
      - Revenue trends vs. seasonal expectations for luxury goods
      - Brand contribution analysis and portfolio balance
      - Margin optimization opportunities in luxury market
      - Geographic and customer segment performance
      - Cash flow implications and collection efficiency
    `,
    
    orders: `
      **SALES ORDERS ANALYSIS**
      
      Orders Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Customer Data: ${JSON.stringify(fullDashboardData.overview?.customers, null, 2)}
      - Top Items: ${JSON.stringify(fullDashboardData.overview?.topItems?.slice(0, 5), null, 2)}
      - Agent Performance: ${JSON.stringify(fullDashboardData.agentPerformance?.agents?.slice(0, 3), null, 2)}
      
      **Analysis Focus:**
      Evaluate sales order patterns for luxury home and giftware business:
      - Order frequency and customer buying patterns
      - Average order value trends for B2B luxury market
      - Seasonal ordering patterns and inventory planning
      - Customer loyalty indicators and retention metrics
      - Agent effectiveness in order generation
    `,
    
    agents: `
      **SALES AGENT PERFORMANCE ANALYSIS**
      
      Agent Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Customer Distribution: ${JSON.stringify(fullDashboardData.overview?.customers, null, 2)}
      - Revenue Data: ${JSON.stringify(fullDashboardData.revenue, null, 2)}
      - Order Patterns: ${JSON.stringify(fullDashboardData.orders?.salesOrders?.summary, null, 2)}
      
      **Analysis Focus:**
      Analyze sales agent performance for luxury B2B sales:
      - Territory effectiveness and coverage optimization
      - Customer relationship management quality
      - Product knowledge and selling effectiveness
      - Seasonal performance variations
      - Training and coaching opportunities
      - Commission and motivation alignment
    `,
    
    customers: `
      **CUSTOMER ANALYTICS INSIGHTS**
      
      Customer Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Revenue Patterns: ${JSON.stringify(fullDashboardData.revenue, null, 2)}
      - Product Preferences: ${JSON.stringify(fullDashboardData.overview?.topItems?.slice(0, 5), null, 2)}
      - Brand Performance: ${JSON.stringify(fullDashboardData.performance?.brands?.slice(0, 3), null, 2)}
      
      **Analysis Focus:**
      Evaluate customer base for luxury retail business:
      - Customer segmentation and value analysis
      - Loyalty patterns and retention opportunities
      - Geographic distribution and market penetration
      - Buying pattern seasonality and trends
      - Customer acquisition cost vs. lifetime value
      - Market expansion opportunities
    `,
    
    products: `
      **PRODUCT PERFORMANCE ANALYSIS**
      
      Product Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Brand Performance: ${JSON.stringify(fullDashboardData.performance?.brands, null, 2)}
      - Customer Preferences: ${JSON.stringify(fullDashboardData.overview?.customers, null, 2)}
      - Sales Trends: ${JSON.stringify(fullDashboardData.performance?.trends, null, 2)}
      
      **Analysis Focus:**
      Analyze product portfolio for European luxury imports:
      - Product mix optimization for margin improvement
      - Seasonal demand patterns and inventory planning
      - Brand performance and market positioning
      - Customer preference trends and market shifts
      - Inventory turnover and cash flow impact
      - New product introduction opportunities
    `,
    
    brands: `
      **BRAND PORTFOLIO ANALYSIS**
      
      Brand Data:
      ${JSON.stringify(cardData, null, 2)}
      
      Supporting Context:
      - Customer Segments: ${JSON.stringify(fullDashboardData.overview?.customers, null, 2)}
      - Revenue Distribution: ${JSON.stringify(fullDashboardData.revenue, null, 2)}
      - Agent Performance: ${JSON.stringify(fullDashboardData.agentPerformance?.summary, null, 2)}
      
      **Analysis Focus:**
      Evaluate brand portfolio performance for luxury European imports:
      - Brand positioning and market differentiation
      - Revenue contribution and margin analysis
      - Customer brand loyalty and cross-selling opportunities
      - Seasonal brand performance variations
      - Market expansion potential for each brand
      - Resource allocation optimization across brands
    `
  };

  const specificPrompt = contextPrompts[cardType] || contextPrompts.revenue;
  
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    ${specificPrompt}
    
    **Data Period:** ${fullDashboardData.dateRange}
    
    **TASK:** Generate focused insights for this specific metric as a JSON object with:
    
    1. **"insight"**: 2-3 sentences of key insight specific to this metric for DM Brands
    2. **"trend"**: Current trend direction and significance
    3. **"action"**: 1-2 specific, actionable recommendations 
    4. **"priority"**: Risk level ("low", "medium", "high") based on the data
    5. **"impact"**: Potential business impact of the current trend
    
    Focus on actionable insights for luxury import business model. Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error(`❌ Error generating ${cardType} insights:`, error);
    return {
      insight: "AI analysis temporarily unavailable for this metric.",
      trend: "Analysis pending",
      action: "Please try again later",
      priority: "low",
      impact: "Unknown"
    };
  }
}

/**
 * Generate insights for drill-down views
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **DETAILED VIEW ANALYSIS: ${viewType.toUpperCase()}**
    
    **Detailed Data:**
    ${JSON.stringify(detailData, null, 2)}
    
    **Summary Context:**
    ${JSON.stringify(summaryData, null, 2)}
    
    **TASK:** Generate detailed analytical insights for this drill-down view as JSON:
    
    1. **"executiveSummary"**: 2-3 sentences of executive-level insight
    2. **"keyFindings"**: 3-4 specific findings from the detailed data
    3. **"strategicRecommendations"**: 3-4 strategic recommendations
    4. **"tacticalActions"**: 2-3 immediate tactical actions
    5. **"riskFactors"**: 1-2 risk factors to monitor
    6. **"opportunities"**: 2-3 growth opportunities identified
    
    Focus on insights specific to DM Brands' luxury import business model and ${viewType} performance.
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error(`❌ Error generating drill-down insights for ${viewType}:`, error);
    return {
      executiveSummary: "Detailed analysis temporarily unavailable.",
      keyFindings: ["Analysis pending"],
      strategicRecommendations: ["Please try again later"],
      tacticalActions: ["Retry analysis"],
      riskFactors: ["Unknown"],
      opportunities: ["To be determined"]
    };
  }
}

/**
 * Generate comparative insights between periods
 */
export async function generateComparativeInsights(currentData, previousData, comparisonType = 'period') {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **COMPARATIVE ANALYSIS: ${comparisonType.toUpperCase()}**
    
    **Current Period Data:**
    ${JSON.stringify(currentData, null, 2)}
    
    **Previous Period Data:**
    ${JSON.stringify(previousData, null, 2)}
    
    **TASK:** Generate comparative business insights as JSON:
    
    1. **"overallChange"**: Summary of overall performance change
    2. **"significantChanges"**: 3-4 most significant changes identified
    3. **"positiveIndicators"**: 2-3 positive performance indicators
    4. **"concerningTrends"**: 1-2 trends requiring attention
    5. **"forecastImplications"**: Forward-looking implications
    6. **"recommendedActions"**: 3-4 actions based on comparison
    
    Focus on changes relevant to DM Brands' luxury import business strategy.
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error(`❌ Error generating comparative insights:`, error);
    return {
      overallChange: "Comparative analysis temporarily unavailable.",
      significantChanges: ["Analysis pending"],
      positiveIndicators: ["Please try again"],
      concerningTrends: ["Unknown"],
      forecastImplications: "To be determined",
      recommendedActions: ["Retry analysis"]
    };
  }
}

/**
 * Generate seasonal insights for planning
 */
export async function generateSeasonalInsights(historicalData, currentSeason) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **SEASONAL BUSINESS ANALYSIS**
    
    **Historical Seasonal Data:**
    ${JSON.stringify(historicalData, null, 2)}
    
    **Current Season:** ${currentSeason}
    
    **TASK:** Generate seasonal planning insights for luxury home and giftware business as JSON:
    
    1. **"seasonalTrends"**: Key seasonal patterns identified
    2. **"currentSeasonOutlook"**: Current season performance vs. historical
    3. **"inventoryRecommendations"**: Seasonal inventory planning advice
    4. **"salesFocus"**: Recommended sales focus areas for current season
    5. **"customerTargeting"**: Seasonal customer targeting strategy
    6. **"brandEmphasis"**: Which brands to emphasize this season
    
    Focus on actionable seasonal planning for European luxury imports.
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error(`❌ Error generating seasonal insights:`, error);
    return {
      seasonalTrends: "Seasonal analysis temporarily unavailable.",
      currentSeasonOutlook: "Analysis pending",
      inventoryRecommendations: "Please try again",
      salesFocus: "Unknown",
      customerTargeting: "To be determined",
      brandEmphasis: "Retry analysis"
    };
  }
}