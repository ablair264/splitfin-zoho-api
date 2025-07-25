// server/src/services/aiAnalyticsService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Utility functions
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function summarizeData(data, maxLength = 1000) {
  const stringified = JSON.stringify(data);
  if (stringified.length <= maxLength) return stringified;
  return stringified.substring(0, maxLength - 20) + '... [truncated]';
}

export class ContextManager {
  constructor() {
    this.context = new Map();
  }
  
  set(key, value) {
    this.context.set(key, value);
  }
  
  get(key) {
    return this.context.get(key);
  }
  
  clear() {
    this.context.clear();
  }
}

export class PromptBuilder {
  constructor() {
    this.sections = [];
  }
  
  addSection(title, content) {
    this.sections.push(`${title}:\n${content}\n`);
    return this;
  }
  
  build() {
    return this.sections.join('\n');
  }
}

/**
 * Parse AI response with better error handling
 */
function parseAIResponse(text) {
  try {
    // First, try to extract JSON from the response
    let jsonStr = text;
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON object in the text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Clean up any remaining markdown or formatting
    jsonStr = jsonStr.trim();
    
    // Parse the JSON
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw response:', text);
    
    // Return a fallback response
    return {
      insight: 'Analysis completed but response format was invalid',
      trend: 'stable',
      action: 'Please review the data manually',
      priority: 'medium',
      impact: 'Analysis available with limitations',
      error: 'Response parsing failed'
    };
  }
}

/**
 * Generate fallback insights when AI fails
 */
function generateFallbackInsight(type, data) {
  const value = data?.current || data?.revenue || data?.totalValue || 0;
  const count = data?.count || data?.totalOrders || 0;
  
  return {
    insight: `Current ${type}: ${count > 0 ? count : '£' + value}`,
    trend: 'stable',
    action: 'Monitor performance',
    priority: 'medium',
    impact: 'Normal operations'
  };
}

/**
 * Generate comprehensive dashboard insights
 */
export async function generateAIInsights(dashboardData) {
  try {
    const prompt = `
      Analyze comprehensive dashboard data for DM Brands luxury imports.
      
      DATA:
      ${JSON.stringify(dashboardData, null, 2).slice(0, 3000)}
      
      Provide executive-level analysis.
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "summary": "Executive summary of the dashboard performance",
        "keyDrivers": ["driver1", "driver2", "driver3"],
        "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
        "criticalAlerts": ["alert1", "alert2"],
        "opportunities": ["opportunity1", "opportunity2"]
      }
      
      DO NOT include any markdown, explanations, or text outside the JSON object.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    return {
      summary: "Dashboard analysis temporarily unavailable",
      keyDrivers: ["Unable to analyze at this time"],
      recommendations: ["Please try again later"],
      criticalAlerts: [],
      opportunities: []
    };
  }
}

/**
 * Generate card-specific insights
 */
export async function generateCardInsights(cardType, cardData, dashboardData) {
  try {
    const prompt = `
      Analyze ${cardType} metrics for DM Brands luxury imports.
      
      Card Data: ${JSON.stringify(cardData)}
      Context: ${summarizeData(dashboardData, 1000)}
      
      IMPORTANT: Return ONLY valid JSON in this exact format:
      {
        "insight": "Specific analysis of the metric",
        "trend": "increasing" or "decreasing" or "stable",
        "action": "Recommended action to take",
        "priority": "high" or "medium" or "low",
        "impact": "Business impact description"
      }
      
      DO NOT include any markdown or text outside the JSON.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return parseAIResponse(text);
  } catch (error) {
    console.error(`Error generating ${cardType} insights:`, error);
    return generateFallbackInsight(cardType, cardData);
  }
}

// In your aiAnalyticsService.js, update the generateEnhancedCardInsights function
export async function generateEnhancedCardInsights(cardType, cardData, fullDashboardData) {
  try {
    console.log('🧠 Generating enhanced insights for:', cardType);
    
    // Use the specific analysis function based on card type
    switch (cardType) {
      case 'totalRevenue':
        return await analyzeRevenue(cardData, fullDashboardData);
      case 'totalOrders':
        return await analyzeTotalOrders(cardData, fullDashboardData);
      case 'averageOrderValue':
        return await analyzeAOV(cardData, fullDashboardData);
      case 'outstandingInvoices':
        return await analyzeInvoices(cardData, fullDashboardData);
      case 'totalCustomers':
        return await analyzeCustomers(cardData, fullDashboardData);
      case 'marketplaceOrders':
        return await analyzeMarketplace(cardData, fullDashboardData);
      default:
        return await generateCardInsights(cardType, cardData, fullDashboardData);
    }
  } catch (error) {
    console.error('Error in enhanced card insights:', error);
    return generateFallbackInsight(cardType, cardData);
  }
}

/**
 * Analyze Total Orders with deep insights
 */
async function analyzeTotalOrders(cardData, dashboardData) {
  const prompt = `
    Analyze order volume performance for DM Brands.

    Current Period Data:
    Total Orders: ${cardData.orders || cardData.orderCount || 0}

    Historical Context & Broader Dashboard Data:
    ${summarizeData(dashboardData, 2000)}

    IMPORTANT: Return ONLY valid JSON. Based on the historical context, analyze trends in ORDER VOLUME, performance, and provide a forecast.
    {
      "insight": "Main findings based on the number of orders, comparing current period to historical trends.",
      "growthDrivers": "Key factors driving order volume.",
      "recommendations": ["actionable_recommendation_1", "actionable_recommendation_2"],
      "forecast": "A brief, data-driven prediction for order volume for the next period.",
      "trend": "'increasing', 'decreasing', or 'stable' based on historical order counts.",
      "action": "The single most important recommendation to influence order volume.",
      "priority": "'high', 'medium', or 'low'.",
      "impact": "The potential business impact of the current order trend."
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing total orders:', error);
    return generateFallbackInsight('orders', cardData);
  }
}

/**
 * Analyze Revenue with comprehensive insights
 */
async function analyzeRevenue(cardData, dashboardData) {
  const prompt = `
    Analyze revenue performance for DM Brands luxury imports.

    Current Period Data:
    Total Revenue: £${cardData.current || 0}

    Historical Context & Broader Dashboard Data:
    ${summarizeData(dashboardData, 2000)}

    IMPORTANT: Return ONLY valid JSON. Based on the historical context, analyze revenue trends, performance drivers, and provide actionable insights.
    {
      "insight": "Main findings on revenue performance, comparing current period to historical trends.",
      "growthDrivers": "Key factors driving revenue growth or decline.",
      "recommendations": ["actionable_recommendation_1 for increasing revenue", "actionable_recommendation_2"],
      "forecast": "A brief, data-driven prediction for revenue for the next period.",
      "trend": "'increasing', 'decreasing', or 'stable' based on historical revenue data.",
      "action": "The single most important recommendation to improve revenue.",
      "priority": "'high', 'medium', or 'low'.",
      "impact": "The potential business impact of the current revenue trend."
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing revenue:', error);
    return generateFallbackInsight('revenue', cardData);
  }
}

/**
 * Analyze Average Order Value with comprehensive insights
 */
async function analyzeAOV(cardData, dashboardData) {
  const prompt = `
    Analyze Average Order Value (AOV) performance for DM Brands.

    Current Period Data:
    Average Order Value: £${cardData.current || cardData.aov || 0}

    Historical Context & Broader Dashboard Data:
    ${summarizeData(dashboardData, 2000)}

    IMPORTANT: Return ONLY valid JSON. Based on the historical context (revenue and order trends), analyze trends in AOV, performance, and provide a forecast.
    {
      "insight": "Main findings on AOV, noting if changes in revenue are outpacing changes in order volume.",
      "growthDrivers": "Are customers buying more items, or more expensive items? What's driving AOV?",
      "recommendations": ["actionable_recommendation_1 for increasing AOV", "actionable_recommendation_2"],
      "forecast": "A brief, data-driven prediction for AOV for the next period.",
      "trend": "'increasing', 'decreasing', or 'stable' based on the relationship between historical revenue and orders.",
      "action": "The single most important recommendation to improve AOV.",
      "priority": "'high', 'medium', or 'low'.",
      "impact": "The potential business impact of the current AOV trend (e.g., profitability)."
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing revenue:', error);
    return generateFallbackInsight('revenue', cardData);
  }
}

async function analyzeNewCustomers(cardData, dashboardData) {
  const prompt = `
    Analyze new customer acquisition performance for DM Brands.

    Current Period Data:
    New Customers: ${cardData.current || cardData.newCustomers || 0}

    Historical Context & Broader Dashboard Data:
    ${summarizeData(dashboardData, 2000)}

    IMPORTANT: Return ONLY valid JSON. Based on the historical context, especially the 'historicalNewCustomerTrend', analyze trends in new customer acquisition.
    {
      "insight": "Main findings on new customer acquisition, comparing the current period to historical trends.",
      "growthDrivers": "What factors might be driving new customer growth? Correlate with marketing campaigns if data is available.",
      "recommendations": ["actionable_recommendation_1 for acquiring more customers", "actionable_recommendation_2"],
      "forecast": "A brief, data-driven prediction for new customer acquisition for the next period.",
      "trend": "'increasing', 'decreasing', or 'stable' based on historical new customer counts.",
      "action": "The single most important recommendation to boost customer acquisition.",
      "priority": "'high', 'medium', or 'low'.",
      "impact": "The potential business impact of the current acquisition trend (e.g., long-term growth)."
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing new customers:', error);
    return generateFallbackInsight('newCustomers', cardData);
  }
}

/**
 * Analyze Invoices
 */
async function analyzeInvoices(cardData, dashboardData) {
  const prompt = `
    Analyze invoice data for DM Brands.
    
    Return ONLY JSON:
    {
      "insight": "Invoice analysis",
      "trend": "stable",
      "action": "Recommendation",
      "priority": "high",
      "impact": "Cash flow impact"
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    return generateFallbackInsight('invoices', cardData);
  }
}

/**
 * Analyze Customers
 */
async function analyzeCustomers(cardData, dashboardData) {
  return generateFallbackInsight('customers', cardData);
}

/**
 * Analyze Agents
 */
async function analyzeAgents(cardData, dashboardData) {
  return generateFallbackInsight('agents', cardData);
}

/**
 * Analyze Brands
 */
async function analyzeBrands(cardData, dashboardData) {
  return generateFallbackInsight('brands', cardData);
}

/**
 * Analyze Marketplace Orders
 */
async function analyzeMarketplace(cardData, dashboardData) {
  const prompt = `
    Analyze marketplace order performance for DM Brands.

    Current Period Data:
    Marketplace Orders: ${cardData.current || cardData.marketplaceOrders || 0}

    Historical Context & Broader Dashboard Data:
    ${summarizeData(dashboardData, 2000)}

    IMPORTANT: Return ONLY valid JSON. Analyze marketplace channel performance (Amazon, eBay, etc.) and provide strategic insights.
    {
      "insight": "Analysis of marketplace order volume and trends compared to direct sales.",
      "growthDrivers": "What's driving marketplace performance? Channel-specific insights.",
      "recommendations": ["actionable_recommendation_1 for marketplace growth", "actionable_recommendation_2"],
      "forecast": "Prediction for marketplace order volume in the next period.",
      "trend": "'increasing', 'decreasing', or 'stable' based on marketplace order history.",
      "action": "The most important action to optimize marketplace performance.",
      "priority": "'high', 'medium', or 'low'.",
      "impact": "The impact of marketplace performance on overall business."
    }
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing marketplace orders:', error);
    return generateFallbackInsight('marketplace', cardData);
  }
}

/**
 * Generate drill-down insights
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData, userRole, userId) {
  try {
    const prompt = `
      Analyze detailed ${viewType} data for DM Brands.
      
      Return ONLY JSON:
      {
        "analysis": "Detailed analysis",
        "patterns": ["pattern1", "pattern2"],
        "anomalies": ["anomaly1"],
        "recommendations": ["rec1", "rec2"]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in drill-down insights:', error);
    return { analysis: 'Drill-down analysis temporarily unavailable' };
  }
}

/**
 * Generate comparative insights
 */
export async function generateComparativeInsights(currentData, previousData, comparisonType, userRole, userId) {
  try {
    const prompt = `
      Compare performance data for DM Brands.
      
      Return ONLY JSON:
      {
        "comparison": "Period comparison analysis",
        "keyChanges": ["change1", "change2"],
        "trends": ["trend1", "trend2"],
        "concerns": ["concern1"],
        "opportunities": ["opp1", "opp2"]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in comparative insights:', error);
    return { comparison: 'Comparative analysis temporarily unavailable' };
  }
}

/**
 * Generate seasonal insights
 */
export async function generateSeasonalInsights(historicalData, season, userRole, userId) {
  try {
    const prompt = `
      Analyze seasonal patterns for DM Brands luxury imports in ${season}.
      
      Return ONLY JSON:
      {
        "seasonal": "Seasonal analysis",
        "trends": ["trend1", "trend2"],
        "productRecommendations": ["product1", "product2"],
        "inventoryAdvice": "Inventory planning advice",
        "marketingOpportunities": ["opp1", "opp2"]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in seasonal insights:', error);
    return { seasonal: 'Seasonal analysis temporarily unavailable' };
  }
}

/**
 * Generate customer insights
 */
export async function generateCustomerInsights(customer, orderHistory, userRole, agentId) {
  try {
    const prompt = `
      Analyze customer data for DM Brands.
      
      Return ONLY JSON:
      {
        "customerProfile": "Profile analysis",
        "orderTrends": {
          "frequency": "Order frequency",
          "averageValue": "Average value",
          "seasonalPatterns": "Patterns",
          "brandPreferences": ["brand1", "brand2"]
        },
        "opportunities": ["opp1", "opp2"],
        "riskFactors": ["risk1"],
        "recommendedActions": ["action1", "action2"],
        "relationshipStrategy": "Strategy",
        "nextSteps": ["step1", "step2"]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in customer insights:', error);
    return {
      customerProfile: "Analysis unavailable",
      orderTrends: {},
      opportunities: [],
      riskFactors: []
    };
  }
}

/**
 * Generate purchase order insights
 */
export async function generatePurchaseOrderInsights(brand, suggestions, historicalSales, marketData) {
  try {
    const prompt = `
      Analyze purchase order for ${brand}.
      ${suggestions.length} products suggested.
      
      Return ONLY JSON:
      {
        "executiveSummary": "Summary of purchase recommendations",
        "marketTiming": "Market timing assessment",
        "riskAssessment": "Risk analysis",
        "categoryOptimization": ["optimization1", "optimization2"],
        "cashFlowImpact": "Cash flow analysis",
        "customerImpact": "Customer impact analysis",
        "channelStrategy": "Channel recommendations",
        "inventoryOptimization": "Inventory strategy",
        "confidenceAssessment": "Overall confidence level",
        "trendBasedRecommendations": ["rec1", "rec2"],
        "alternativeStrategies": ["alt1", "alt2"]
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in purchase order insights:', error);
    return {
      executiveSummary: "AI analysis temporarily unavailable",
      marketTiming: "Unable to assess",
      riskAssessment: "Analysis pending",
      categoryOptimization: [],
      cashFlowImpact: "Unknown",
      customerImpact: "Unable to determine",
      channelStrategy: "Review channel performance",
      inventoryOptimization: "Check stock levels",
      confidenceAssessment: "Low confidence due to error"
    };
  }
}

/**
 * Generate product purchase insights
 */
export async function generateProductPurchaseInsights(product, suggestion, competitorData, searchTrends) {
  try {
    const prompt = `
      Analyze purchase for ${product.name} (${product.sku}).
      
      Return ONLY JSON:
      {
        "purchaseRationale": "Why to purchase this product",
        "targetCustomers": "Target customer segments",
        "seasonalConsiderations": "Seasonal factors",
        "competitiveAdvantage": "Competitive positioning",
        "pricingStrategy": "Pricing recommendations",
        "displaySuggestions": "Display and merchandising tips"
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error in product insights:', error);
    return {
      purchaseRationale: "Analysis pending",
      targetCustomers: "Premium UK retailers",
      seasonalConsiderations: "Standard seasonality",
      competitiveAdvantage: "Unique positioning",
      pricingStrategy: "Competitive pricing",
      displaySuggestions: "Premium display"
    };
  }
}

/**
 * Validate purchase adjustments
 */
export async function validatePurchaseAdjustments(originalSuggestions, userAdjustments, brand) {
  try {
    const prompt = `
      Validate adjustments for ${brand} purchase order.
      
      Return ONLY JSON:
      {
        "adjustmentAssessment": "Overall assessment",
        "potentialRisks": ["risk1", "risk2"],
        "improvements": ["improvement1"],
        "alternativeSuggestions": ["alt1"],
        "confidenceInAdjustments": 85
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error validating adjustments:', error);
    return {
      adjustmentAssessment: "Unable to validate",
      potentialRisks: [],
      improvements: [],
      alternativeSuggestions: [],
      confidenceInAdjustments: 50
    };
  }
}

/**
 * Fetch search trends
 */
export async function fetchSearchTrends(brand) {
  try {
    // This would integrate with Google Trends API or similar
    // For now, returning mock data
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
    return { trends: [], volume: 0 };
  }
}

/**
 * Generate enhanced forecast
 */
export async function generateEnhancedForecast(dashboardData) {
  try {
    const prompt = `
      Generate business forecast for DM Brands.
      
      Return ONLY valid JSON:
      {
        "overview": "Forecast overview",
        "revenueForecast": "3-month revenue projection",
        "seasonalAnalysis": "Seasonal trends analysis", 
        "customerForecast": "Customer behavior predictions",
        "agentForecast": "Agent performance forecast",
        "riskAssessment": "Risk factors and mitigation"
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return {
      overview: 'Forecast generation failed',
      revenueForecast: 'Unable to project',
      seasonalAnalysis: 'Analysis unavailable',
      customerForecast: 'Prediction unavailable',
      agentForecast: 'Unable to forecast',
      riskAssessment: 'Risk analysis pending'
    };
  }
}

/**
 * Generate agent insights
 */
export async function generateAgentInsights(agentData, performanceHistory, customerBase) {
  try {
    const prompt = `
      Analyze sales agent ${agentData.name} performance.
      Revenue: £${agentData.totalRevenue || 0}
      Orders: ${agentData.totalOrders || 0}
      
      Return ONLY JSON:
      {
        "performanceOverview": "Overall performance summary",
        "performanceTrends": {
          "revenueTrend": "increasing",
          "orderFrequency": "Weekly average",
          "customerRetention": "Retention rate"
        },
        "customerInsights": {
          "summary": "Customer base summary",
          "segments": [
            {
              "name": "VIP Customers",
              "description": "High-value repeat customers"
            }
          ]
        },
        "opportunities": ["opportunity1", "opportunity2"],
        "recommendations": [
          {
            "title": "Focus on VIP retention",
            "description": "Increase touchpoints with top customers",
            "priority": "high"
          }
        ],
        "efficiencyScore": {
          "score": 85,
          "analysis": "Above average efficiency",
          "factors": ["Strong customer relationships", "Good product knowledge"]
        }
      }
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error generating agent insights:', error);
    return {
      performanceOverview: 'Analysis failed',
      performanceTrends: {},
      customerInsights: {},
      opportunities: [],
      recommendations: [],
      efficiencyScore: { score: 0, analysis: 'Unable to calculate' }
    };
  }
}