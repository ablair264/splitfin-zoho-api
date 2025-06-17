import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Use Gemini 1.5 Pro for larger token capacity (2M tokens)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

/**
 * Token Management Utilities
 */
const TOKEN_LIMITS = {
  'gemini-1.5-flash': 1048575,
  'gemini-1.5-pro': 2097152
};

const MAX_SAFE_TOKENS = 900000; // Leave buffer for safety
const CHARS_PER_TOKEN = 4; // Rough estimate

function estimateTokens(text) {
  if (!text) return 0;
  const stringified = typeof text === 'string' ? text : JSON.stringify(text);
  return Math.ceil(stringified.length / CHARS_PER_TOKEN);
}

function truncateText(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
}

/**
 * Data Limiting Utilities
 */
function limitArrayData(arr, maxItems = 10, keepFields = null) {
  if (!Array.isArray(arr)) return arr || [];
  
  return arr.slice(0, maxItems).map(item => {
    if (!keepFields || typeof item !== 'object') return item;
    
    // Keep only specified fields to reduce size
    const limited = {};
    keepFields.forEach(field => {
      if (item[field] !== undefined) limited[field] = item[field];
    });
    return limited;
  });
}

function limitObjectData(obj, maxKeys = 10, keepKeys = null) {
  if (!obj || typeof obj !== 'object') return obj || {};
  
  const limited = {};
  const keys = keepKeys || Object.keys(obj).slice(0, maxKeys);
  
  keys.forEach(key => {
    if (obj[key] !== undefined) {
      limited[key] = obj[key];
    }
  });
  
  return limited;
}

function summarizeData(data, config = {}) {
  const {
    maxArrayItems = 5,
    maxObjectKeys = 10,
    keepArrayFields = null,
    keepObjectKeys = null
  } = config;

  if (!data) return {};

  if (Array.isArray(data)) {
    return limitArrayData(data, maxArrayItems, keepArrayFields);
  }
  
  if (typeof data === 'object' && data !== null) {
    const summarized = {};
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        summarized[key] = limitArrayData(value, maxArrayItems, keepArrayFields);
      } else if (typeof value === 'object' && value !== null) {
        summarized[key] = limitObjectData(value, maxObjectKeys, keepObjectKeys);
      } else {
        summarized[key] = value;
      }
    });
    return summarized;
  }
  
  return data;
}

/**
 * Context Management System
 */
class ContextManager {
  static getBaseContext(role, analysisType = 'general') {
    const contexts = {
      salesAgent: {
        general: 'You are a sales coach for a DM Brands agent. Focus on actionable advice for their assigned customers only.',
        revenue: 'Analyze the agent\'s personal revenue performance from their customers.',
        orders: 'Evaluate the agent\'s order patterns and customer engagement.',
        customers: 'Review the agent\'s customer portfolio and relationships.',
        seasonal: 'Provide seasonal strategies for the agent\'s territory.'
      },
      brandManager: {
        general: 'You analyze DM Brands, a UK luxury import company specializing in European home and giftware.',
        revenue: 'Analyze revenue performance considering brand mix and profitability.',
        orders: 'Evaluate sales patterns, agent performance, and market trends.',
        customers: 'Assess customer value, segmentation, and growth opportunities.',
        seasonal: 'Analyze seasonal trends for luxury import planning.'
      }
    };

    const roleContext = contexts[role] || contexts.brandManager;
    return roleContext[analysisType] || roleContext.general;
  }

  static getCriticalInstructions(role, agentId = null) {
    if (role === 'salesAgent') {
      return `CRITICAL: Analyze ONLY data for Agent ${agentId || 'unspecified'}. All customers shown are THEIR assigned customers. Never suggest contacting customers not in the data.`;
    }
    return 'Focus on strategic insights for DM Brands\' luxury import business model.';
  }
}

/**
 * Prompt Builder with Token Management
 */
class PromptBuilder {
  constructor(maxTokens = MAX_SAFE_TOKENS) {
    this.maxTokens = maxTokens;
    this.sections = [];
    this.currentTokens = 0;
  }

  addSection(content, priority = 1) {
    if (!content) return this;
    const tokens = estimateTokens(content);
    this.sections.push({ content, tokens, priority });
    this.sections.sort((a, b) => b.priority - a.priority);
    return this;
  }

  build() {
    let prompt = '';
    let usedTokens = 0;

    for (const section of this.sections) {
      if (usedTokens + section.tokens <= this.maxTokens) {
        prompt += section.content + '\n\n';
        usedTokens += section.tokens;
      }
    }

    return prompt.trim();
  }
}

/**
 * Main AI Insights Generation Functions
 */
export async function generateAIInsights(dashboardData) {
  try {
    if (!dashboardData) {
      throw new Error('No dashboard data provided');
    }

    const role = dashboardData.role || 'brandManager';
    const isAgent = role === 'salesAgent';
    
    // Prepare limited data based on role
    const essentialData = {
      period: dashboardData.dateRange || 'Unknown period',
      revenue: {
        current: dashboardData.revenue?.current || 0,
        previous: dashboardData.revenue?.previous || 0,
        change: dashboardData.revenue?.percentageChange || 0
      },
      orders: {
        count: dashboardData.orders?.count || 0,
        value: dashboardData.orders?.totalValue || 0,
        average: dashboardData.orders?.averageValue || 0
      },
      topCustomers: limitArrayData(
        dashboardData.overview?.customers?.topCustomers,
        5,
        ['name', 'value', 'orders']
      ),
      topProducts: limitArrayData(
        dashboardData.overview?.topItems,
        5,
        ['name', 'quantity', 'revenue']
      )
    };

    // Add role-specific data
    if (!isAgent) {
      essentialData.agents = limitArrayData(
        dashboardData.agentPerformance?.agents,
        3,
        ['name', 'revenue', 'customers']
      );
      essentialData.brands = limitArrayData(
        dashboardData.performance?.brands,
        5,
        ['name', 'revenue', 'growth']
      );
    }

    const promptBuilder = new PromptBuilder();
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(role, 'general'), 3)
      .addSection(ContextManager.getCriticalInstructions(role, dashboardData.agentId), 3)
      .addSection(`Data: ${JSON.stringify(essentialData)}`, 2)
      .addSection(`
        Generate a JSON response with these keys:
        - summary: 2-3 sentence overview
        - keyDrivers: Array of 3-4 performance drivers
        - recommendations: Array of 4-5 actionable items
        - criticalAlerts: Array of 1-2 urgent issues (if any)
        - opportunities: Array of 2-3 growth opportunities
        
        ${isAgent ? 'Focus on the agent\'s specific customers and territory.' : 'Focus on company-wide strategic insights.'}
        Return ONLY valid JSON.
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error("❌ Error generating AI insights:", error);
    return {
      summary: "AI analysis could not be completed. Data may be too large.",
      keyDrivers: ["Please try with a smaller date range"],
      recommendations: ["Consider filtering data before analysis"],
      criticalAlerts: [],
      opportunities: []
    };
  }
}

/**
 * Card-specific insights with optimized prompts
 */
export async function generateCardInsights(cardType, cardData, fullDashboardData) {
  try {
    const role = fullDashboardData?.role || 'brandManager';
    const validCardType = cardType || 'general';
    
    // Limit card data
    const limitedCardData = summarizeData(cardData, {
      maxArrayItems: 5,
      maxObjectKeys: 10
    });

    const promptBuilder = new PromptBuilder(200000); // Smaller limit for card insights
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(role, validCardType), 3)
      .addSection(`Analyze this ${validCardType} data: ${JSON.stringify(limitedCardData)}`, 2)
      .addSection(`
        Generate focused JSON insights:
        - insight: 2-3 sentences of key findings
        - trend: Direction and significance
        - action: 1-2 specific recommendations
        - priority: "low", "medium", or "high"
        - impact: Business impact statement
        
        Be concise and actionable.
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error(`❌ Error generating ${cardType} insights:`, error);
    return {
      insight: "Analysis temporarily unavailable.",
      trend: "Unknown",
      action: "Please retry",
      priority: "low",
      impact: "Unable to determine"
    };
  }
}

/**
 * Drill-down insights with chunking support
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData, userRole, agentId) {
  try {
    // Add validation for viewType
    const validViewType = viewType || 'analysis';
    
    // Check if data needs chunking
    const dataSize = estimateTokens(detailData);
    if (dataSize > 500000) {
      return await generateChunkedDrillDownInsights(validViewType, detailData, summaryData, userRole, agentId);
    }

    // Regular processing for smaller data
    const limitedDetail = summarizeData(detailData, {
      maxArrayItems: 20,
      maxObjectKeys: 15
    });
    
    const limitedSummary = summarizeData(summaryData, {
      maxArrayItems: 5,
      maxObjectKeys: 10
    });

    const promptBuilder = new PromptBuilder();
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(userRole, validViewType), 3)
      .addSection(ContextManager.getCriticalInstructions(userRole, agentId), 3)
      .addSection(`Detailed ${validViewType} data: ${JSON.stringify(limitedDetail)}`, 2)
      .addSection(`Summary context: ${JSON.stringify(limitedSummary)}`, 1)
      .addSection(`
        Generate drill-down analysis as JSON:
        - executiveSummary: 2-3 sentence overview
        - keyFindings: Array of 3-4 specific findings
        - strategicRecommendations: Array of 3-4 recommendations
        - tacticalActions: Array of 2-3 immediate actions
        - riskFactors: Array of 1-2 risks
        - opportunities: Array of 2-3 opportunities
        
        Focus on actionable insights for ${validViewType}.
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error(`❌ Error generating drill-down insights:`, error);
    return {
      executiveSummary: "Detailed analysis unavailable.",
      keyFindings: ["Data too large for analysis"],
      strategicRecommendations: ["Consider date range filtering"],
      tacticalActions: ["Retry with less data"],
      riskFactors: ["Analysis incomplete"],
      opportunities: ["Unable to determine"]
    };
  }
}

/**
 * Chunked analysis for large datasets
 */
async function generateChunkedDrillDownInsights(viewType, detailData, summaryData, userRole, agentId) {
  const chunks = [];
  const chunkSize = 10;
  
  // Split data into chunks
  if (Array.isArray(detailData)) {
    for (let i = 0; i < detailData.length; i += chunkSize) {
      chunks.push(detailData.slice(i, i + chunkSize));
    }
  } else {
    // For objects, split by keys
    const entries = Object.entries(detailData || {});
    for (let i = 0; i < entries.length; i += chunkSize) {
      chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
    }
  }

  // Analyze each chunk
  const chunkInsights = [];
  for (const [index, chunk] of chunks.entries()) {
    const insight = await analyzeSingleChunk(chunk, viewType, userRole, index, chunks.length);
    chunkInsights.push(insight);
  }

  // Combine insights
  return combineChunkInsights(chunkInsights, viewType);
}

async function analyzeSingleChunk(chunk, viewType, userRole, chunkIndex, totalChunks) {
  const prompt = `
    ${ContextManager.getBaseContext(userRole, viewType)}
    
    Analyzing chunk ${chunkIndex + 1} of ${totalChunks} for ${viewType}.
    Data: ${JSON.stringify(chunk)}
    
    Provide key insights from this data segment as JSON:
    - findings: Array of key findings
    - risks: Any risks identified
    - opportunities: Growth opportunities
    
    Be concise.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text().replace(/```json/g, '').replace(/```/g, '').trim());
  } catch (error) {
    console.error(`Error analyzing chunk ${chunkIndex}:`, error);
    return { findings: [], risks: [], opportunities: [] };
  }
}

function combineChunkInsights(chunkInsights, viewType) {
  const combined = {
    executiveSummary: `Analysis of ${viewType} across ${chunkInsights.length} data segments.`,
    keyFindings: [],
    strategicRecommendations: [],
    tacticalActions: [],
    riskFactors: [],
    opportunities: []
  };

  // Aggregate findings from all chunks
  chunkInsights.forEach(chunk => {
    if (chunk.findings) combined.keyFindings.push(...chunk.findings);
    if (chunk.risks) combined.riskFactors.push(...chunk.risks);
    if (chunk.opportunities) combined.opportunities.push(...chunk.opportunities);
  });

  // Limit to reasonable sizes
  combined.keyFindings = [...new Set(combined.keyFindings)].slice(0, 4);
  combined.riskFactors = [...new Set(combined.riskFactors)].slice(0, 2);
  combined.opportunities = [...new Set(combined.opportunities)].slice(0, 3);
  
  // Generate recommendations based on findings
  combined.strategicRecommendations = generateRecommendations(combined.keyFindings).slice(0, 4);
  combined.tacticalActions = generateTacticalActions(combined.keyFindings).slice(0, 3);

  return combined;
}

function generateRecommendations(findings) {
  // Simple recommendation generation based on findings
  return findings.map(finding => `Address: ${finding}`).slice(0, 4);
}

function generateTacticalActions(findings) {
  // Simple tactical action generation
  return findings.map(finding => `Immediate action for: ${finding}`).slice(0, 3);
}

/**
 * Comparative insights with optimized data handling
 */
export async function generateComparativeInsights(currentData, previousData, comparisonType = 'period', userRole, agentId) {
  try {
    // Validate comparison type
    const validComparisonType = comparisonType || 'period';
    
    // Summarize both datasets
    const summarizedCurrent = summarizeData(currentData, {
      maxArrayItems: 10,
      maxObjectKeys: 15
    });
    
    const summarizedPrevious = summarizeData(previousData, {
      maxArrayItems: 10,
      maxObjectKeys: 15
    });

    const promptBuilder = new PromptBuilder();
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(userRole, 'general'), 3)
      .addSection(ContextManager.getCriticalInstructions(userRole, agentId), 3)
      .addSection(`Current period: ${JSON.stringify(summarizedCurrent)}`, 2)
      .addSection(`Previous period: ${JSON.stringify(summarizedPrevious)}`, 2)
      .addSection(`
        Generate ${validComparisonType} comparison as JSON:
        - overallChange: Summary of performance change
        - significantChanges: Array of 3-4 major changes
        - positiveIndicators: Array of 2-3 positive trends
        - concerningTrends: Array of 1-2 concerns
        - forecastImplications: Forward-looking statement
        - recommendedActions: Array of 3-4 actions
        
        Focus on meaningful differences and trends.
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error(`❌ Error generating comparative insights:`, error);
    return {
      overallChange: "Comparison unavailable.",
      significantChanges: ["Analysis failed"],
      positiveIndicators: ["Unknown"],
      concerningTrends: ["Unable to determine"],
      forecastImplications: "Analysis required",
      recommendedActions: ["Retry comparison"]
    };
  }
}

/**
 * Customer insights with focused data
 */
export async function generateCustomerInsights(customer, orderHistory, userRole, agentId) {
  try {
    // Validate customer data
    if (!customer) {
      throw new Error('No customer data provided');
    }

    // Limit order history to recent orders
    const recentOrders = limitArrayData(orderHistory, 20, [
      'date', 'value', 'items', 'brand'
    ]);

    const customerSummary = {
      name: customer.name || 'Unknown',
      totalValue: customer.totalValue || 0,
      orderCount: customer.orderCount || 0,
      lastOrder: customer.lastOrderDate || 'Unknown',
      averageOrder: customer.averageOrderValue || 0
    };

    const promptBuilder = new PromptBuilder(300000);
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(userRole, 'customers'), 3)
      .addSection(ContextManager.getCriticalInstructions(userRole, agentId), 3)
      .addSection(`Customer: ${JSON.stringify(customerSummary)}`, 2)
      .addSection(`Recent orders: ${JSON.stringify(recentOrders)}`, 2)
      .addSection(`
        Generate customer analysis as JSON:
        - customerProfile: 2-3 sentence overview
        - orderTrends: Object with frequency, averageValue, seasonalPatterns, brandPreferences
        - opportunities: Array of 3-4 growth opportunities
        - riskFactors: Array of risks or concerns
        - recommendedActions: Array of 3-5 specific actions
        - relationshipStrategy: Long-term strategy statement
        - nextSteps: Array of immediate actions
        
        ${userRole === 'salesAgent' ? 'Make it personal and actionable for the agent.' : 'Focus on strategic value.'}
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error(`❌ Error generating customer insights:`, error);
    return {
      customerProfile: "Customer analysis unavailable.",
      orderTrends: {
        frequency: "Unknown",
        averageValue: "Unable to calculate",
        seasonalPatterns: "Analysis pending",
        brandPreferences: []
      },
      opportunities: ["Analysis failed"],
      riskFactors: ["Unable to assess"],
      recommendedActions: ["Retry analysis"],
      relationshipStrategy: "Pending",
      nextSteps: ["Please retry"]
    };
  }
}

/**
 * Purchase order insights with market data
 */
export async function generatePurchaseOrderInsights(brand, suggestions, historicalSales, marketData) {
  try {
    // Validate brand parameter
    const validBrand = brand || 'Unknown Brand';
    
    // Limit suggestions to top items
    const topSuggestions = limitArrayData(suggestions, 10, [
      'sku', 'product_name', 'recommendedQuantity', 'confidence'
    ]);

    // Summarize market data
    const marketSummary = {
      searchTrend: marketData?.searchTrends?.[0]?.trend || 'Unknown',
      trendChange: marketData?.searchTrends?.[0]?.percentageChange || 0,
      relatedSearches: marketData?.searchTrends?.[0]?.relatedQueries?.slice(0, 3) || []
    };

    const prompt = `
      Business context: UK luxury import company analyzing ${validBrand} purchase order.
      
      Top suggestions: ${JSON.stringify(topSuggestions)}
      Market trends: ${JSON.stringify(marketSummary)}
      Historical revenue: £${historicalSales?.totalRevenue?.toFixed(0) || 0}
      
      Generate purchase insights as JSON:
      - executiveSummary: How search trends affect this order
      - marketTiming: Assessment based on ${marketSummary.searchTrend} trend (${marketSummary.trendChange}% change)
      - trendBasedRecommendations: Array of 3 actions based on trends
      - riskAssessment: Key risks considering market signals
      - categoryOptimization: Array of categories to focus on
      - confidenceAssessment: Overall confidence statement
      
      Be concise and data-driven.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error("❌ Error generating purchase insights:", error);
    return {
      executiveSummary: "Analysis unavailable",
      marketTiming: "Unable to assess",
      trendBasedRecommendations: ["Check market data"],
      riskAssessment: "Analysis pending",
      categoryOptimization: [],
      confidenceAssessment: "Low confidence"
    };
  }
}

/**
 * Seasonal insights with pattern recognition
 */
export async function generateSeasonalInsights(historicalData, currentSeason, userRole, agentId) {
  try {
    // Validate current season
    const validSeason = currentSeason || 'Current Season';
    
    // Summarize historical patterns
    const seasonalSummary = {
      currentSeason: validSeason,
      lastYearSame: historicalData?.[validSeason]?.lastYear || {},
      yearOverYear: historicalData?.[validSeason]?.growth || 0,
      topSeasons: Object.entries(historicalData || {})
        .sort(([,a], [,b]) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 3)
        .map(([season, data]) => ({ season, revenue: data.revenue || 0 }))
    };

    const promptBuilder = new PromptBuilder(200000);
    
    promptBuilder
      .addSection(ContextManager.getBaseContext(userRole, 'seasonal'), 3)
      .addSection(ContextManager.getCriticalInstructions(userRole, agentId), 2)
      .addSection(`Seasonal data: ${JSON.stringify(seasonalSummary)}`, 2)
      .addSection(`
        Generate seasonal insights as JSON:
        - seasonalTrends: Key patterns identified
        - currentSeasonOutlook: Performance vs. historical
        - inventoryRecommendations: Product focus for season
        - salesFocus: Array of sales priorities
        - customerTargeting: Customer strategy for season
        - brandEmphasis: Brands to emphasize
        
        ${userRole === 'salesAgent' ? 'Focus on the agent\'s territory.' : 'Focus on company strategy.'}
      `, 1);

    const prompt = promptBuilder.build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error(`❌ Error generating seasonal insights:`, error);
    return {
      seasonalTrends: "Analysis unavailable",
      currentSeasonOutlook: "Unable to determine",
      inventoryRecommendations: "Analysis required",
      salesFocus: ["Focus on core products"],
      customerTargeting: "Target active customers",
      brandEmphasis: "Emphasize top brands"
    };
  }
}

/**
 * Validation for purchase adjustments
 */
export async function validatePurchaseAdjustments(originalSuggestions, userAdjustments, brand) {
  try {
    // Validate brand
    const validBrand = brand || 'Unknown Brand';
    
    // Only analyze adjusted items
    const relevantSuggestions = originalSuggestions
      .filter(s => userAdjustments.some(a => a.sku === s.sku))
      .map(s => ({
        sku: s.sku,
        name: s.product_name || 'Unknown Product',
        recommended: s.recommendedQuantity || 0,
        userAdjusted: userAdjustments.find(a => a.sku === s.sku)?.quantity || 0
      }));

    const prompt = `
      Validate purchase adjustments for ${validBrand}:
      
      Adjustments: ${JSON.stringify(relevantSuggestions)}
      
      Generate validation as JSON:
      - adjustmentAssessment: Overall assessment
      - potentialRisks: Array of risks
      - improvements: Array of positive aspects
      - alternativeSuggestions: Array of alternatives
      - confidenceInAdjustments: Score 0-100
      
      Consider cash flow and inventory capacity.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error("❌ Error validating adjustments:", error);
    return {
      adjustmentAssessment: "Validation unavailable",
      potentialRisks: ["Manual review recommended"],
      improvements: ["User expertise applied"],
      alternativeSuggestions: [],
      confidenceInAdjustments: 50
    };
  }
}

/**
 * Product purchase insights
 */
export async function generateProductPurchaseInsights(product, suggestion, competitorData, searchTrends) {
  try {
    // Validate product data
    if (!product) {
      throw new Error('No product data provided');
    }

    const productSummary = {
      name: product.name || 'Unknown Product',
      sku: product.sku || 'Unknown SKU',
      currentStock: product.stock || 0,
      suggestedQty: suggestion?.recommendedQuantity || 0
    };

    const prompt = `
      Product purchase analysis:
      
      Product: ${JSON.stringify(productSummary)}
      Competitors: ${JSON.stringify(competitorData?.slice(0, 3) || [])}
      Search trend: ${searchTrends?.trend || 'Unknown'}
      
      Generate insights as JSON:
      - purchaseRationale: Why stock this quantity
      - seasonalConsiderations: Seasonal factors
      - competitiveAdvantage: Market positioning
      - targetCustomers: Customer segments
      - pricingStrategy: Pricing approach
      - displaySuggestions: Merchandising tips
      
      Be specific and actionable.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error("❌ Error generating product insights:", error);
    return null;
  }
}

// Export utility functions for external use
export {
  estimateTokens,
  summarizeData,
  ContextManager,
  PromptBuilder
};