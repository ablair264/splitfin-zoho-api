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
 * UPDATED: Base context for a Sales Agent's perspective
 */
const SALES_AGENT_CONTEXT = `
You are an expert personal sales coach for a sales agent at DM Brands Limited, a UK-based premium import company.

Your goal is to provide direct, actionable advice to the sales agent to help them improve their personal performance. Use "you" and "your" to address the agent directly.

**CRITICAL INSTRUCTION:** You are ONLY analyzing data for customers that belong to this specific sales agent. All customers, orders, and revenue data shown are exclusively from this agent's portfolio. Do NOT reference or suggest contacting customers that aren't shown in the data, as they belong to other agents.

Focus your analysis on:
1. Identifying the agent's own top-performing customers and products from their portfolio
2. Spotting opportunities to re-engage their inactive customers or increase order values from their existing customer base
3. Providing clear, simple, and actionable steps the agent can take with THEIR customers

Do NOT discuss:
- Overall company performance
- Other agents' results or customers
- High-level business strategy
- Customers not shown in the provided data (they belong to other agents)

The focus is 100% on this individual agent's data, customers, and performance.
`;

/**
 * Generate comprehensive dashboard insights based on user role
 */
export async function generateAIInsights(dashboardData) {
  let prompt;

  // Check the user's role and build the appropriate prompt
  if (dashboardData.role === 'salesAgent') {
    // --- UPDATED PROMPT FOR SALES AGENT ---
    prompt = `
      ${SALES_AGENT_CONTEXT}
      
      **YOUR PERSONAL PERFORMANCE ANALYSIS**
      
      **Data Period:** ${dashboardData.dateRange}
      **Your Agent ID:** ${dashboardData.agentId || 'Not specified'}
      
      **YOUR REVENUE (from YOUR customers only):**
      ${JSON.stringify(dashboardData.revenue, null, 2)}
      
      **YOUR ORDERS (from YOUR customers only):**
      ${JSON.stringify(dashboardData.orders, null, 2)}
      
      **YOUR CUSTOMERS (these are the ONLY customers you manage):**
      ${JSON.stringify(dashboardData.overview?.customers?.topCustomers, null, 2)}
      
      **YOUR TOP SELLING ITEMS (from YOUR sales only):**
      ${JSON.stringify(dashboardData.overview?.topItems, null, 2)}
      
      **IMPORTANT REMINDER:** The customers shown above are YOUR customers. Do not suggest reaching out to customers not listed here, as they are managed by other agents.
      
      **ANALYSIS REQUIREMENTS:**
      
      Generate a personal sales analysis for the agent as a JSON object with these keys:
      
      1. "performanceSummary": A 2-3 sentence summary of your personal performance for the period. Be encouraging but direct. Reference only YOUR actual results.
      
      2. "customerOpportunities": A list of 2-3 bullet points identifying specific customers FROM YOUR LIST that you should focus on. Include their names and specific actions (e.g., "Contact [Customer Name] - they haven't ordered in X days" or "Thank [Customer Name] for their recent large order"). Only reference customers shown in YOUR data.
      
      3. "productFocus": A list of 2-3 bullet points suggesting which products you should push to YOUR customers, based on what is selling well in YOUR portfolio.
      
      4. "personalActionItems": A list of 3 clear, simple, and actionable steps you can take with YOUR EXISTING customers to improve your results. Each action should reference specific customers or patterns from YOUR data.
      
      CRITICAL: Only reference customers that appear in the provided data. These are YOUR assigned customers. Never suggest contacting customers not shown in the data.
      
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

  // UPDATED: Prompts for Sales Agents
  const agentContextPrompts = {
    revenue: `
      **YOUR PERSONAL REVENUE ANALYSIS**
      Your Revenue Data for the period (from YOUR customers only): ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** Analyze YOUR personal sales revenue from YOUR assigned customers. What does this number tell YOU about your performance with YOUR customer base? Which of YOUR specific customers or products are driving this success?
      **REMINDER:** This data represents revenue from YOUR customers only. Focus on how to maximize revenue from YOUR existing customer relationships.
    `,
    orders: `
      **YOUR SALES ORDERS ANALYSIS**
      Your Orders Data for the period (from YOUR customers only): ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** Evaluate YOUR personal order patterns from YOUR customer portfolio. Is your average order value from YOUR customers high? How can YOU encourage YOUR specific customers to place larger or more frequent orders?
      **REMINDER:** These orders are exclusively from YOUR assigned customers. Focus on patterns within YOUR customer base.
    `,
    customers: `
      **YOUR CUSTOMER PORTFOLIO ANALYSIS**
      Your Customer Data: ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** These are YOUR assigned customers. Analyze their buying patterns, identify who needs attention, and who deserves recognition. Remember, you can only work with the customers shown here - they are YOUR responsibility.
    `,
    invoices: `
      **YOUR OUTSTANDING INVOICES ANALYSIS**
      Your Invoice Data (from YOUR customers only): ${JSON.stringify(cardData, null, 2)}
      **Analysis Focus:** Review outstanding invoices from YOUR customers. Which of YOUR customers need a friendly payment reminder? How can you maintain good relationships while ensuring timely payments?
    `
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
    ${role === 'salesAgent' ? `**Your Agent ID:** ${fullDashboardData.agentId || 'Not specified'}` : ''}
    
    **TASK:** Generate focused insights for this specific metric as a JSON object with:
    
    1. "insight": 2-3 sentences of key insight specific to this metric. ${role === 'salesAgent' ? 'Focus ONLY on YOUR customers and YOUR performance.' : ''}
    2. "trend": Current trend direction and significance.
    3. "action": 1-2 specific, actionable recommendations. ${role === 'salesAgent' ? 'Must reference YOUR specific customers by name where relevant.' : ''}
    4. "priority": Risk level ("low", "medium", "high").
    5. "impact": Potential business impact of the current trend.
    
    ${role === 'salesAgent' ? 'CRITICAL: Only reference customers and data shown above. These are YOUR assigned customers.' : ''}
    
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
/**
 * Generate insights for drill-down views
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData, userRole, agentId) {
  // Determine which context to use based on role
  const baseContext = userRole === 'salesAgent' ? SALES_AGENT_CONTEXT : DM_BRANDS_CONTEXT;
  
  // Role-specific prompt additions
  const roleSpecificInstructions = userRole === 'salesAgent' 
    ? `
      **CRITICAL REMINDER:** You are analyzing data for a sales agent's personal performance.
      - ALL customers shown are THEIR assigned customers
      - ALL revenue and orders are from THEIR portfolio only
      - Focus on actionable insights for THIS agent's customers
      - Never suggest contacting customers not shown in the data
      **Agent ID:** ${agentId || 'Not specified'}
    `
    : '';

  const prompt = `
    ${baseContext}
    
    **DETAILED VIEW ANALYSIS: ${viewType.toUpperCase()}**
    
    ${roleSpecificInstructions}
    
    **Detailed Data:**
    ${JSON.stringify(detailData, null, 2)}
    
    **Summary Context:**
    ${JSON.stringify(summaryData, null, 2)}
    
    **TASK:** Generate detailed analytical insights for this drill-down view as JSON:
    
    1. **"executiveSummary"**: 2-3 sentences of ${userRole === 'salesAgent' ? 'personal performance' : 'executive-level'} insight
    2. **"keyFindings"**: 3-4 specific findings from the detailed data ${userRole === 'salesAgent' ? '(about YOUR customers only)' : ''}
    3. **"strategicRecommendations"**: 3-4 ${userRole === 'salesAgent' ? 'actions you can take with YOUR customers' : 'strategic recommendations'}
    4. **"tacticalActions"**: 2-3 immediate tactical actions ${userRole === 'salesAgent' ? 'for YOUR customer relationships' : ''}
    5. **"riskFactors"**: 1-2 risk factors to monitor ${userRole === 'salesAgent' ? 'in YOUR portfolio' : ''}
    6. **"opportunities"**: 2-3 growth opportunities identified ${userRole === 'salesAgent' ? 'with YOUR existing customers' : ''}
    
    ${userRole === 'salesAgent' 
      ? 'Focus on insights specific to YOUR assigned customers and how YOU can improve performance with them.'
      : `Focus on insights specific to DM Brands' luxury import business model and ${viewType} performance.`
    }
    
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
export async function generateComparativeInsights(currentData, previousData, comparisonType = 'period', userRole, agentId) {
  // Determine which context to use based on role
  const baseContext = userRole === 'salesAgent' ? SALES_AGENT_CONTEXT : DM_BRANDS_CONTEXT;
  
  // Role-specific prompt additions
  const roleSpecificInstructions = userRole === 'salesAgent' 
    ? `
      **CRITICAL REMINDER:** You are comparing YOUR personal sales performance across periods.
      - Both datasets represent YOUR customers only
      - Changes reflect YOUR individual performance trajectory
      - Recommendations must focus on YOUR existing customer relationships
      - Do not suggest reaching out to customers not in YOUR portfolio
      **Agent ID:** ${agentId || 'Not specified'}
    `
    : '';

  const prompt = `
    ${baseContext}
    
    **COMPARATIVE ANALYSIS: ${comparisonType.toUpperCase()}**
    
    ${roleSpecificInstructions}
    
    **Current Period Data (${userRole === 'salesAgent' ? 'YOUR performance' : ''}):**
    ${JSON.stringify(currentData, null, 2)}
    
    **Previous Period Data (${userRole === 'salesAgent' ? 'YOUR performance' : ''}):**
    ${JSON.stringify(previousData, null, 2)}
    
    **TASK:** Generate comparative ${userRole === 'salesAgent' ? 'personal performance' : 'business'} insights as JSON:
    
    1. **"overallChange"**: Summary of ${userRole === 'salesAgent' ? 'YOUR' : 'overall'} performance change
    2. **"significantChanges"**: 3-4 most significant changes ${userRole === 'salesAgent' ? 'in YOUR customer portfolio' : 'identified'}
    3. **"positiveIndicators"**: 2-3 positive ${userRole === 'salesAgent' ? 'aspects of YOUR' : ''} performance indicators
    4. **"concerningTrends"**: 1-2 trends requiring ${userRole === 'salesAgent' ? 'YOUR' : ''} attention
    5. **"forecastImplications"**: Forward-looking implications ${userRole === 'salesAgent' ? 'for YOUR territory' : ''}
    6. **"recommendedActions"**: 3-4 actions based on comparison ${userRole === 'salesAgent' ? '(specific to YOUR customers)' : ''}
    
    ${userRole === 'salesAgent' 
      ? 'Focus on changes in YOUR customer relationships and YOUR sales performance. All recommendations should be about YOUR assigned customers.'
      : 'Focus on changes relevant to DM Brands\' luxury import business strategy.'
    }
    
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

export async function validatePurchaseAdjustments(
  originalSuggestions,
  userAdjustments,
  brand
) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **PURCHASE ORDER ADJUSTMENT VALIDATION**
    
    **Brand:** ${brand}
    
    **Original AI Suggestions:**
    ${JSON.stringify(originalSuggestions.filter(s => 
      userAdjustments.some(a => a.sku === s.sku)
    ).map(s => ({
      sku: s.sku,
      name: s.product_name,
      recommended: s.recommendedQuantity,
      confidence: s.confidence
    })), null, 2)}
    
    **User Adjustments:**
    ${JSON.stringify(userAdjustments, null, 2)}
    
    **TASK:** Analyze the user's quantity adjustments and provide feedback as JSON:
    
    1. **"adjustmentAssessment"**: Overall assessment of the changes
    2. **"potentialRisks"**: Any risks introduced by the adjustments
    3. **"improvements"**: Positive aspects of the adjustments
    4. **"alternativeSuggestions"**: Better ways to achieve the user's apparent goals
    5. **"confidenceInAdjustments"**: Confidence score (0-100) in the adjusted order
    
    Consider DM Brands' cash flow, storage capacity, and B2B sales model.
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error("❌ Error validating adjustments:", error);
    return {
      adjustmentAssessment: "Unable to validate adjustments",
      potentialRisks: ["Review adjustments manually"],
      improvements: ["User expertise applied"],
      alternativeSuggestions: [],
      confidenceInAdjustments: 50
    };
  }
}

export async function generateCustomerInsights(customer, orderHistory, userRole, agentId) {
  // Determine which context to use based on role
  const baseContext = userRole === 'salesAgent' ? SALES_AGENT_CONTEXT : DM_BRANDS_CONTEXT;
  
  // Role-specific prompt additions
  const roleSpecificInstructions = userRole === 'salesAgent' 
    ? `
      **CRITICAL REMINDER:** This is YOUR customer. Focus on:
      - How to strengthen YOUR relationship with this specific customer
      - Opportunities to increase sales to THIS customer
      - Personalized strategies based on THEIR buying patterns
      **Agent ID:** ${agentId || 'Not specified'}
    `
    : `
      **ANALYSIS PERSPECTIVE:** As a brand manager, focus on:
      - Customer value and profitability analysis
      - Brand preferences and opportunities
      - Strategic importance to DM Brands
    `;

  const prompt = `
    ${baseContext}
    
    **CUSTOMER DEEP DIVE ANALYSIS**
    
    ${roleSpecificInstructions}
    
    **Customer Profile:**
    ${JSON.stringify(customer, null, 2)}
    
    **Order History (if available):**
    ${JSON.stringify(orderHistory || 'No order history provided', null, 2)}
    
    **TASK:** Generate comprehensive customer insights as JSON:
    
    1. **"customerProfile"**: 2-3 sentence overview of this customer's value and characteristics
    
    2. **"orderTrends"**: Analysis of their ordering patterns including:
       - Frequency of orders
       - Average order value trends
       - Seasonal buying patterns
       - Product/brand preferences
    
    3. **"opportunities"**: 3-4 specific opportunities to grow business with this customer
    
    4. **"riskFactors"**: Any risks or concerns (e.g., declining orders, overdue payments)
    
    5. **"recommendedActions"**: 3-5 specific, actionable recommendations for ${userRole === 'salesAgent' ? 'YOUR next interaction with this customer' : 'managing this account'}
    
    6. **"relationshipStrategy"**: Long-term strategy for this customer relationship
    
    7. **"nextSteps"**: Immediate next steps (within next 2 weeks)
    
    ${userRole === 'salesAgent' 
      ? 'Make recommendations personal and actionable - what should YOU do next with THIS customer?'
      : 'Focus on strategic account management and profitability optimization.'
    }
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error(`❌ Error generating customer insights:`, error);
    return {
      customerProfile: "Customer analysis temporarily unavailable.",
      orderTrends: {
        frequency: "Analysis pending",
        averageValue: "Unknown",
        seasonalPatterns: "To be determined",
        brandPreferences: []
      },
      opportunities: ["Analysis unavailable - please try again"],
      riskFactors: ["Unable to assess at this time"],
      recommendedActions: ["Please retry analysis"],
      relationshipStrategy: "Strategy pending",
      nextSteps: ["Retry customer analysis"]
    };
  }
}

export async function generatePurchaseOrderInsights(
  brand,
  suggestions,
  historicalSales,
  marketData
) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **PURCHASE ORDER ANALYSIS FOR ${brand.toUpperCase()}**
    
    **Current AI Suggestions (${suggestions.length} products):**
    ${JSON.stringify(suggestions.slice(0, 10), null, 2)}
    
    **Real-Time Search Trends:**
    - Brand Search Volume: ${marketData.searchTrends[0]?.volume || 'Unknown'}
    - Trend Direction: ${marketData.searchTrends[0]?.trend || 'Unknown'}
    - Recent Change: ${marketData.searchTrends[0]?.percentageChange || 0}%
    - Related Searches: ${marketData.searchTrends[0]?.relatedQueries?.join(', ') || 'None'}
    
    **Historical Performance:**
    - Total Revenue (6 months): £${historicalSales.totalRevenue?.toFixed(2) || 0}
    - Seasonal Patterns: ${JSON.stringify(historicalSales.seasonalPattern, null, 2)}
    
    **Current Date:** ${new Date().toLocaleDateString()}
    **UK Market Context:** Focus on British retail seasonality and consumer trends
    
    **TASK:** Generate strategic insights considering the REAL search trend data:
    
    1. **"executiveSummary"**: How do current search trends support or challenge this purchase order?
    2. **"marketTiming"**: Based on the ${marketData.searchTrends[0]?.trend} trend (${marketData.searchTrends[0]?.percentageChange}% change), is this good timing?
    3. **"trendBasedRecommendations"**: Specific actions based on the search trend data
    4. **"riskAssessment"**: Risks considering current search interest levels
    5. **"categoryOptimization"**: Which product categories align with trending searches?
    6. **"confidenceAssessment"**: Confidence level considering real market signals
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);
  } catch (error) {
    console.error("❌ Error generating purchase order insights:", error);
    return {
      executiveSummary: "AI analysis unavailable",
      marketTiming: "Unable to assess",
      riskAssessment: "Analysis pending",
      categoryOptimization: [],
      cashFlowImpact: "Unknown",
      alternativeStrategies: [],
      confidenceAssessment: "Low confidence due to analysis error"
    };
  }
}

export async function generateProductPurchaseInsights(
  product,
  suggestion,
  competitorData,
  searchTrends
) {
  const prompt = `
    ${DM_BRANDS_CONTEXT}
    
    **PRODUCT PURCHASE DECISION ANALYSIS**
    
    **Product Details:**
    ${JSON.stringify(product, null, 2)}
    
    **AI Suggestion:**
    ${JSON.stringify(suggestion, null, 2)}
    
    **Competitor Intelligence:**
    ${JSON.stringify(competitorData, null, 2)}
    
    **Search Trends:**
    ${JSON.stringify(searchTrends, null, 2)}
    
    **TASK:** Provide detailed purchase justification as JSON:
    
    1. **"purchaseRationale"**: Detailed explanation of why to stock this quantity
    2. **"seasonalConsiderations"**: How seasonality affects this recommendation
    3. **"competitiveAdvantage"**: How this product positions against competitors
    4. **"targetCustomers"**: Which customer segments will be interested
    5. **"pricingStrategy"**: Recommended pricing approach
    6. **"displaySuggestions"**: How to merchandise this product effectively
    
    Respond with ONLY clean JSON - no formatting.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error("❌ Error generating product insights:", error);
    return null;
  }
}
/**
 * Generate seasonal insights for planning
 */
export async function generateSeasonalInsights(historicalData, currentSeason, userRole, agentId) {
  // Determine which context to use based on role
  const baseContext = userRole === 'salesAgent' ? SALES_AGENT_CONTEXT : DM_BRANDS_CONTEXT;
  
  // Role-specific prompt additions
  const roleSpecificInstructions = userRole === 'salesAgent' 
    ? `
      **CRITICAL REMINDER:** You are analyzing seasonal patterns for YOUR customers only.
      - Historical data represents YOUR customer portfolio's seasonal behavior
      - Recommendations must focus on YOUR existing customers
      - Suggest seasonal strategies for customers YOU already manage
      - Do not reference customers outside YOUR assigned portfolio
      **Agent ID:** ${agentId || 'Not specified'}
    `
    : '';

  const prompt = `
    ${baseContext}
    
    **SEASONAL ${userRole === 'salesAgent' ? 'PERFORMANCE' : 'BUSINESS'} ANALYSIS**
    
    ${roleSpecificInstructions}
    
    **Historical Seasonal Data ${userRole === 'salesAgent' ? '(YOUR customers)' : ''}:**
    ${JSON.stringify(historicalData, null, 2)}
    
    **Current Season:** ${currentSeason}
    
    **TASK:** Generate seasonal ${userRole === 'salesAgent' ? 'sales' : 'planning'} insights for ${userRole === 'salesAgent' ? 'YOUR territory' : 'luxury home and giftware business'} as JSON:
    
    1. **"seasonalTrends"**: Key seasonal patterns ${userRole === 'salesAgent' ? 'in YOUR customer buying behavior' : 'identified'}
    2. **"currentSeasonOutlook"**: ${userRole === 'salesAgent' ? 'YOUR' : 'Current'} season performance vs. historical
    3. **"inventoryRecommendations"**: ${userRole === 'salesAgent' ? 'Products to promote to YOUR customers this season' : 'Seasonal inventory planning advice'}
    4. **"salesFocus"**: Recommended sales focus areas ${userRole === 'salesAgent' ? 'for YOUR customer meetings' : 'for current season'}
    5. **"customerTargeting"**: ${userRole === 'salesAgent' ? 'Which of YOUR customers to prioritize this season' : 'Seasonal customer targeting strategy'}
    6. **"brandEmphasis"**: Which brands to emphasize ${userRole === 'salesAgent' ? 'to YOUR customers' : ''} this season
    
    ${userRole === 'salesAgent' 
      ? 'Focus on actionable seasonal strategies for YOUR assigned customers. Reference specific customers from YOUR portfolio when making recommendations.'
      : 'Focus on actionable seasonal planning for European luxury imports.'
    }
    
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