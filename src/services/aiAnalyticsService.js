import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Base context for DM Brands Limited business understanding (for Brand Managers)
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
 * NEW: Base context for a Sales Agent's perspective
 */
const SALES_AGENT_CONTEXT = `
You are an expert personal sales coach for a sales agent at DM Brands Limited, a UK-based premium import company.

Your goal is to provide direct, actionable advice to the sales agent to help them improve their personal performance. Use "you" and "your" to address the agent directly.

Focus your analysis on:
1. Identifying the agent's top-performing customers and products.
2. Spotting opportunities for the agent to re-engage customers or increase order values.
3. Providing clear, simple, and actionable steps the agent can take today to improve their sales.

Do NOT discuss overall company performance, other agents' results, or high-level business strategy. The focus is 100% on this individual agent's data and performance.
`;

/**
 * Generate comprehensive dashboard insights based on user role
 */
export async function generateAIInsights(dashboardData) {
  let prompt;

  // Check the user's role and build the appropriate prompt
  if (dashboardData.role === 'salesAgent') {
    // --- PROMPT FOR SALES AGENT ---
    prompt = `
      ${SALES_AGENT_CONTEXT}
      
      **YOUR PERSONAL PERFORMANCE ANALYSIS**
      
      **Data Period:** ${dashboardData.dateRange}
      
      **YOUR REVENUE:**
      ${JSON.stringify(dashboardData.revenue, null, 2)}
      
      **YOUR ORDERS:**
      ${JSON.stringify(dashboardData.orders, null, 2)}
      
      **YOUR TOP CUSTOMERS:**
      ${JSON.stringify(dashboardData.overview?.customers?.topCustomers, null, 2)}
      
      **YOUR TOP SELLING ITEMS:**
      ${JSON.stringify(dashboardData.overview?.topItems, null, 2)}
      
      **ANALYSIS REQUIREMENTS:**
      
      Generate a personal sales analysis for the agent as a JSON object with these keys:
      
      1. "performanceSummary": A 2-3 sentence summary of your personal performance for the period. Be encouraging but direct.
      2. "customerOpportunities": A list of 2-3 bullet points identifying specific customers you should focus on (e.g., top performers to thank, or inactive ones to re-engage).
      3. "productFocus": A list of 2-3 bullet points suggesting which products you should push, based on what is selling well for you.
      4. "personalActionItems": A list of 3 clear, simple, and actionable steps you can take to improve your results.
      
      Respond with ONLY a clean JSON object - no markdown formatting.
    `;
  } else {
    // --- PROMPT FOR BRAND MANAGER (Original Prompt) ---
    prompt = `
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
      
      1. "summary": 2-3 sentences providing executive-level overview of business performance, highlighting the most critical insights for DM Brands' luxury import business model.
      2. "keyDrivers": 3-4 specific bullet points identifying the primary factors driving current performance.
      3. "recommendations": 4-5 prioritized, actionable recommendations.
      4. "criticalAlerts": 1-2 urgent issues requiring immediate attention (if any).
      5. "opportunities": 2-3 growth opportunities based on the data.
      
      **IMPORTANT:** Only reference agents with real names (ignore "Undefined" or "Unknown" agents). Focus on actionable insights specific to DM Brands' luxury import business model.
      
      Respond with ONLY a clean JSON object - no markdown formatting or code blocks.
    `;
  }

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
 * Generate card-specific AI insights for individual metrics based on user role
 */
export async function generateCardInsights(cardType, cardData, fullDashboardData) {
  // Prompts for Brand Managers
  const managerContextPrompts = {
    revenue: `
      **REVENUE PERFORMANCE ANALYSIS**
      Current Revenue Data: ${JSON.stringify(cardData, null, 2)}
      Supporting Context:
      - Brand Performance: ${JSON.stringify(fullDashboardData.performance?.brands?.slice(0, 3), null, 2)}
      - Agent Performance: ${JSON.stringify(fullDashboardData.agentPerformance?.summary, null, 2)}
      **Analysis Focus:** Analyze revenue performance for DM Brands' luxury import business, considering brand contribution, margins, and cash flow.
    `,
    orders: `
      **SALES ORDERS ANALYSIS**
      Orders Data: ${JSON.stringify(cardData, null, 2)}
      Supporting Context:
      - Top Items: ${JSON.stringify(fullDashboardData.overview?.topItems?.slice(0, 5), null, 2)}
      - Agent Performance: ${JSON.stringify(fullDashboardData.agentPerformance?.agents?.slice(0, 3), null, 2)}
      **Analysis Focus:** Evaluate sales order patterns for the luxury B2B market, including AOV trends and agent effectiveness.
    `,
    // ... (Your other original prompts for managers)
  };

  // NEW: Prompts for Sales Agents
  const agentContextPrompts = {
    revenue: `
      **YOUR PERSONAL REVENUE ANALYSIS**
      Your Revenue Data for the period: ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** Analyze YOUR personal sales revenue. What does this number tell YOU about your performance? Which of YOUR customers or products are driving this success?
    `,
    orders: `
      **YOUR SALES ORDERS ANALYSIS**
      Your Orders Data for the period: ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** Evaluate YOUR personal order patterns. Is your average order value high? How can YOU encourage customers to place larger or more frequent orders?
    `,
    // ... (Define other agent-specific card prompts as needed)
  };

  // Determine which set of prompts and context to use based on the user's role
  const role = fullDashboardData?.role;
  const contextPrompts = role === 'salesAgent' ? agentContextPrompts : managerContextPrompts;
  const baseContext = role === 'salesAgent' ? SALES_AGENT_CONTEXT : DM_BRANDS_CONTEXT;

  // Default to a generic revenue prompt if the specific cardType isn't defined for the role
  const specificPrompt = contextPrompts[cardType] || contextPrompts.revenue;
  
  const prompt = `
    ${baseContext}
    
    ${specificPrompt}
    
    **Data Period:** ${fullDashboardData.dateRange}
    
    **TASK:** Generate focused insights for this specific metric as a JSON object with:
    
    1. "insight": 2-3 sentences of key insight specific to this metric.
    2. "trend": Current trend direction and significance.
    3. "action": 1-2 specific, actionable recommendations. 
    4. "priority": Risk level ("low", "medium", "high").
    5. "impact": Potential business impact of the current trend.
    
    Respond with ONLY clean JSON - no formatting.
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