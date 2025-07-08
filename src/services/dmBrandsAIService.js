// DM Brands Enhanced AI Analytics Service
// Specialized for UK Homeware/Giftware Distribution
// server/src/services/dmBrandsAIService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';
// Enhanced response parser with validation
function parseAIResponse(text, expectedFormat = null) {
  try {
    // Clean the response
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();
    
    // Find JSON in response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate against expected format if provided
    if (expectedFormat) {
      for (const key of Object.keys(expectedFormat)) {
        if (!(key in parsed)) {
          console.warn(`Missing expected key: ${key}`);
          parsed[key] = expectedFormat[key];
        }
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('Parse error:', error);
    throw error;
  }
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Use Flash for most analyses, Pro for complex strategic insights
const flashModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    maxOutputTokens: 2048,
  }
});

const proModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.8,
    topP: 0.9,
    maxOutputTokens: 4096,
  }
});

// DM Brands Business Context
const DM_BRANDS_CONTEXT = {
  company: "DM Brands Limited",
  type: "UK Distributor and Agency",
  distributorBrands: ["Rader", "Elvang", "Remember", "Relaxound", "My Flame Lifestyle"],
  agencyBrands: ["Blomus", "GEFU", "PPD"],
  productCategories: {
    candles: ["My Flame Lifestyle", "PPD"],
    soundboxes: ["Relaxound"],
    porcelain: ["Rader"],
    textiles: ["Elvang"],
    kitchenware: ["GEFU", "Remember"],
    homeDecor: ["Blomus", "Rader", "Remember"],
    outdoor: ["Blomus", "Remember"]
  },
  customerTypes: [
    "National Trust Properties",
    "Zoos, Parks & Attractions", 
    "Cafes & Restaurants",
    "Gift Shops",
    "Homeware Retailers",
    "Furniture Stores",
    "Candle Specialists",
    "Interior Designers",
    "Department Stores",
    "Boutiques"
  ],
  seasonality: {
    peak: ["September-December (Christmas)", "March-May (Spring/Easter)"],
    low: ["January-February", "July-August"],
    giftingSeasons: ["Christmas", "Easter", "Mother's Day", "Valentine's Day"]
  },
  competitorSites: ["homearama.com", "nordicnest.com", "royaldesign.com"],
  businessPriorities: [
    "Stock optimization for distributor brands",
    "Rate of sale analysis",
    "Agent performance (respectful insights for self-employed partners)",
    "Seasonal planning",
    "Cash flow management"
  ]
};

// Enhanced Stock Analysis for Distributor Brands
export async function analyzeStockPerformance(stockData, salesHistory, marketData) {
  const prompt = `You are analyzing stock performance for DM Brands Limited, a UK distributor of premium homeware and giftware.

BUSINESS CONTEXT:
${JSON.stringify(DM_BRANDS_CONTEXT, null, 2)}

CURRENT STOCK SITUATION:
${JSON.stringify(stockData, null, 2)}

SALES HISTORY (Last 90 days):
${JSON.stringify(salesHistory.slice(0, 20), null, 2)}

MARKET INTELLIGENCE:
${JSON.stringify(marketData, null, 2)}

CRITICAL ANALYSIS NEEDED:
1. Rate of Sale Analysis - Which items are moving well/poorly?
2. Stock Level Assessment - Do we have too much/too little?
3. Seasonal Considerations - Are we stocked appropriately for upcoming seasons?
4. Price Point Analysis - Should we consider pricing adjustments?
5. Online Market Comparison - How are these items priced/performing online?

PROVIDE ACTIONABLE INSIGHTS (JSON):
{
  "stockHealthSummary": {
    "overall": "healthy|concerning|critical",
    "urgentActions": ["action 1", "action 2"],
    "keyMetrics": {
      "slowMovingValue": "£X tied in slow stock",
      "stockTurnRate": "X times per year",
      "daysOfStock": "X days at current rate"
    }
  },
  "performanceByBrand": {
    "Rader": {
      "status": "performing well|average|underperforming",
      "topItems": ["item 1", "item 2"],
      "problemItems": ["item 1", "item 2"],
      "recommendation": "Specific action"
    },
    "Elvang": { ... },
    "Remember": { ... },
    "Relaxound": { ... },
    "My Flame Lifestyle": { ... }
  },
  "categoryInsights": {
    "candles": {
      "trend": "growing|stable|declining",
      "seasonalRelevance": "high|medium|low",
      "stockPosition": "well positioned|needs adjustment",
      "action": "Specific recommendation"
    },
    // ... other categories
  },
  "pricingOpportunities": [
    {
      "item": "SKU/Name",
      "currentPrice": "£X",
      "marketPrice": "£Y",
      "recommendation": "Adjust to £Z because...",
      "impact": "Expected impact"
    }
  ],
  "purchaseOrderStrategy": {
    "immediate": ["Order X units of Y", "Stop ordering Z"],
    "nextMonth": ["Plan for Easter stock", "Phase out winter items"],
    "longTerm": ["Consider new product lines in X category"]
  },
  "riskAlerts": [
    {
      "type": "overstock|stockout|seasonal|pricing",
      "item": "Specific item",
      "severity": "high|medium|low",
      "action": "What to do"
    }
  ]
}`;

  try {
    const result = await flashModel.generateContent(prompt);
    const response = await result.response;
    return parseAIResponse(response.text());
  } catch (error) {
    console.error('Stock analysis error:', error);
    return generateStockFallback(stockData);
  }
}

// Agent Performance Analysis (Respectful for Self-Employed Partners)
export async function analyzeAgentPerformance(agentData, salesHistory, customerBase) {
  const prompt = `Analyze sales performance for a DM Brands sales agent (self-employed partner).

IMPORTANT: The agent is a valued self-employed partner, not an employee. Provide supportive, constructive insights that help them grow their business.

AGENT PROFILE:
${JSON.stringify({
  name: agentData.agentName,
  territory: agentData.territory,
  monthsActive: agentData.experienceMonths,
  customerCount: customerBase.length
}, null, 2)}

PERFORMANCE METRICS:
${JSON.stringify({
  revenue: agentData.totalRevenue,
  orders: agentData.totalOrders,
  averageOrderValue: agentData.totalRevenue / (agentData.totalOrders || 1),
  topBrands: agentData.topBrands,
  customerTypes: agentData.customerTypes
}, null, 2)}

CUSTOMER BASE ANALYSIS:
${JSON.stringify({
  byType: customerBase.reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {}),
  activeCustomers: customerBase.filter(c => c.dayssinceLastOrder < 90).length,
  dormantCustomers: customerBase.filter(c => c.dayssinceLastOrder > 180).length
}, null, 2)}

PROVIDE SUPPORTIVE ANALYSIS (JSON):
{
  "executiveSummary": {
    "tone": "supportive and encouraging",
    "highlights": ["achievement 1", "achievement 2"],
    "businessHealth": "thriving|growing|steady|developing",
    "keyMessage": "Positive, actionable summary"
  },
  "strengthsAnalysis": {
    "topStrengths": ["strength 1", "strength 2", "strength 3"],
    "brandExpertise": {
      "strongest": ["brand 1", "brand 2"],
      "opportunity": ["brand to explore"],
      "reasoning": "Why these brands work well"
    },
    "customerSuccess": {
      "bestPerforming": ["customer type 1", "customer type 2"],
      "successFactors": ["what's working well"]
    }
  },
  "growthOpportunities": {
    "immediate": [
      {
        "opportunity": "Specific opportunity",
        "action": "How to capture it",
        "potentialValue": "£X additional revenue"
      }
    ],
    "strategic": [
      {
        "focus": "Long-term opportunity",
        "approach": "Suggested strategy",
        "support": "How DM Brands can help"
      }
    ]
  },
  "brandDevelopment": {
    "recommendations": [
      {
        "brand": "Brand name",
        "currentPerformance": "£X revenue",
        "potential": "Could grow to £Y",
        "products": ["suggested products to introduce"],
        "targetCustomers": ["ideal customer types"]
      }
    ]
  },
  "customerEngagement": {
    "reactivation": [
      {
        "segment": "Dormant gift shops",
        "count": 5,
        "approach": "Suggested re-engagement strategy",
        "products": ["products that might interest them"]
      }
    ],
    "expansion": [
      {
        "customerType": "National Trust Properties",
        "rationale": "Why this is a good fit",
        "brandFit": ["Rader porcelain", "Elvang textiles"],
        "approach": "How to approach them"
      }
    ]
  },
  "seasonalPlanning": {
    "upcoming": "Easter/Spring 2024",
    "preparation": ["action 1", "action 2"],
    "keyProducts": ["product suggestions"],
    "targetRevenue": "£X based on last year +20%"
  },
  "supportNeeded": {
    "training": ["brand knowledge areas that could help"],
    "materials": ["sales tools that would be useful"],
    "products": ["new lines to consider"]
  }
}`;

  try {
    const result = await flashModel.generateContent(prompt);
    const response = await result.response;
    return parseAIResponse(response.text());
  } catch (error) {
    console.error('Agent analysis error:', error);
    return generateAgentFallback(agentData);
  }
}

// Competitor Website Analysis
export async function analyzeCompetitorPerformance(websiteData, ourProducts) {
  const prompt = `Analyze competitor websites selling products we distribute at DM Brands.

OUR CONTEXT:
${JSON.stringify({
  distributor: "DM Brands Limited",
  brands: DM_BRANDS_CONTEXT.distributorBrands,
  focus: "Understanding market positioning and opportunities"
}, null, 2)}

COMPETITOR DATA:
${JSON.stringify(websiteData, null, 2)}

OUR PRODUCTS ON THEIR SITES:
${JSON.stringify(ourProducts, null, 2)}

ANALYSIS REQUIRED:
1. How are our brands positioned on these sites?
2. Pricing comparison and strategy insights
3. Which products are featured/promoted?
4. What's their product mix telling us?
5. Opportunities we're missing

PROVIDE STRATEGIC INSIGHTS (JSON):
{
  "marketPosition": {
    "summary": "How our brands are positioned in the market",
    "brandPerception": {
      "premium": ["brands seen as premium"],
      "mainstream": ["brands seen as mainstream"],
      "niche": ["brands in specific niches"]
    }
  },
  "pricingIntelligence": {
    "ourAdvantage": ["where we're competitive"],
    "concerns": ["where we're overpriced"],
    "recommendations": [
      {
        "product": "Product name",
        "ourPrice": "£X",
        "marketPrice": "£Y",
        "action": "Suggested response"
      }
    ]
  },
  "productStrategy": {
    "topPerformers": ["products doing well online"],
    "missingOpportunities": ["products we should stock"],
    "oversaturated": ["products to avoid"],
    "trends": ["emerging patterns"]
  },
  "competitorInsights": {
    "homearama": {
      "strength": "What they do well",
      "ourOpportunity": "How to differentiate"
    },
    "nordicnest": { ... },
    "royaldesign": { ... }
  },
  "actionableTakeaways": [
    {
      "insight": "Key finding",
      "action": "What to do",
      "priority": "high|medium|low",
      "owner": "sales|purchasing|marketing"
    }
  ]
}`;

  try {
    const result = await proModel.generateContent(prompt);
    const response = await result.response;
    return parseAIResponse(response.text());
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return { error: "Unable to analyze competitor data" };
  }
}

// Seasonal Planning Intelligence
export async function generateSeasonalStrategy(currentStock, historicalData, upcomingSeason) {
  const prompt = `Create seasonal planning strategy for DM Brands Limited.

SEASONAL CONTEXT:
Current Season: ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
Planning For: ${upcomingSeason}
Key Events: ${JSON.stringify(DM_BRANDS_CONTEXT.seasonality)}

CURRENT POSITION:
${JSON.stringify(currentStock, null, 2)}

HISTORICAL PERFORMANCE:
${JSON.stringify(historicalData, null, 2)}

STRATEGIC PLANNING NEEDED:
1. Which products to stock up on
2. Which to clear before season ends
3. New products to introduce
4. Pricing strategies
5. Agent guidance for the season

PROVIDE SEASONAL STRATEGY (JSON):
{
  "seasonalOverview": {
    "season": "${upcomingSeason}",
    "theme": "Key seasonal theme",
    "startPlanning": "When to start preparations",
    "keyDates": ["important dates"]
  },
  "productStrategy": {
    "mustStock": [
      {
        "category": "Candles",
        "brands": ["My Flame Lifestyle"],
        "rationale": "Gift giving season",
        "targetStock": "X weeks of supply",
        "orderBy": "Date to place orders"
      }
    ],
    "clearance": [
      {
        "category": "Summer outdoor",
        "products": ["specific items"],
        "currentStock": "X units",
        "strategy": "Discount strategy"
      }
    ],
    "newIntroductions": [
      {
        "brand": "Rader",
        "products": ["Easter decorations"],
        "rationale": "Market opportunity",
        "testQuantity": "Conservative first order"
      }
    ]
  },
  "brandFocus": {
    "primary": ["brands to push this season"],
    "secondary": ["supporting brands"],
    "rationale": "Why this mix"
  },
  "agentGuidance": {
    "keyMessages": ["message 1", "message 2"],
    "targetCustomers": {
      "giftShops": "Focus on X products",
      "nationalTrust": "Emphasize Y range"
    },
    "salesTools": ["materials to prepare"],
    "training": ["product knowledge needed"]
  },
  "revenueProjection": {
    "conservative": "£X based on last year",
    "target": "£Y with good execution",
    "stretch": "£Z if all goes well",
    "keyDrivers": ["what will drive success"]
  },
  "risks": [
    {
      "risk": "Supply chain delays",
      "mitigation": "Order early, maintain buffer"
    }
  ]
}`;

  try {
    const result = await proModel.generateContent(prompt);
    const response = await result.response;
    return parseAIResponse(response.text());
  } catch (error) {
    console.error('Seasonal planning error:', error);
    return generateSeasonalFallback(upcomingSeason);
  }
}

// Customer Segmentation Analysis
export async function analyzeCustomerSegments(customerData, orderHistory) {
  const prompt = `Analyze customer segments for DM Brands Limited.

CUSTOMER TYPES:
${JSON.stringify(DM_BRANDS_CONTEXT.customerTypes)}

CUSTOMER DATA:
${JSON.stringify(
  customerData.slice(0, 50).map(c => ({
    type: c.type,
    revenue: c.totalRevenue,
    orders: c.orderCount,
    lastOrder: c.lastOrderDate,
    brands: c.preferredBrands
  }))
)}

ANALYZE:
1. Performance by customer type
2. Brand preferences by segment
3. Growth opportunities
4. At-risk segments
5. Untapped potential

PROVIDE INSIGHTS (JSON):
{
  "segmentPerformance": {
    "topPerforming": [
      {
        "segment": "Gift Shops",
        "revenue": "£X",
        "growth": "+X%",
        "keyBrands": ["brand1", "brand2"],
        "characteristics": ["what makes them successful"]
      }
    ],
    "emerging": [
      {
        "segment": "Interior Designers",
        "potential": "High growth potential",
        "currentRevenue": "£X",
        "strategy": "How to develop"
      }
    ],
    "struggling": [
      {
        "segment": "Segment name",
        "issues": ["challenge 1", "challenge 2"],
        "recovery": "Suggested approach"
      }
    ]
  },
  "brandAlignment": {
    "perfectMatches": [
      {
        "segment": "National Trust",
        "brands": ["Rader", "Elvang"],
        "reason": "Heritage aesthetic alignment"
      }
    ],
    "opportunities": [
      {
        "segment": "Cafes",
        "underutilizedBrands": ["GEFU", "Remember"],
        "products": ["specific products to introduce"]
      }
    ]
  },
  "growthStrategy": {
    "quickWins": ["immediate actions"],
    "development": ["medium-term strategies"],
    "innovation": ["new approaches to try"]
  }
}`;

  try {
    const result = await flashModel.generateContent(prompt);
    const response = await result.response;
    return parseAIResponse(response.text());
  } catch (error) {
    return generateCustomerSegmentFallback(customerData);
  }
}

// Fallback Generators
function generateStockFallback(stockData) {
  return {
    stockHealthSummary: {
      overall: "analysis pending",
      urgentActions: ["Review stock levels manually"],
      keyMetrics: {
        slowMovingValue: "Calculation required",
        stockTurnRate: "Analysis needed",
        daysOfStock: "Review required"
      }
    }
  };
}

function generateAgentFallback(agentData) {
  return {
    executiveSummary: {
      tone: "supportive and encouraging",
      highlights: [`${agentData.agentName} continues to serve their customers well`],
      businessHealth: "steady",
      keyMessage: "Keep up the good work. Full analysis will be available shortly."
    }
  };
}

function generateSeasonalFallback(season) {
  return {
    seasonalOverview: {
      season: season,
      theme: "Seasonal planning",
      startPlanning: "Begin preparations soon",
      keyDates: ["Check calendar for key dates"]
    }
  };
}

function generateCustomerSegmentFallback(customerData) {
  return {
    segmentPerformance: {
      topPerforming: [{
        segment: "Analysis pending",
        revenue: "Calculating...",
        growth: "TBD"
      }]
    }
  };
}