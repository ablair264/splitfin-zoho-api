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
 * Parse AI response with error handling
 */
function parseAIResponse(text) {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      insight: 'Analysis in progress',
      trend: 'stable',
      action: 'Continue monitoring',
      priority: 'medium'
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
      
      Provide executive-level analysis including:
      1. Key performance indicators summary
      2. Critical business trends
      3. Strategic recommendations
      4. Risk alerts
      5. Growth opportunities
      
      Return as JSON with:
      - summary: Executive summary
      - keyDrivers: Array of key performance drivers
      - recommendations: Array of strategic recommendations
      - criticalAlerts: Array of urgent issues
      - opportunities: Array of growth opportunities
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
    const prompt = new PromptBuilder()
      .addSection('CONTEXT', `Analyzing ${cardType} metrics for DM Brands luxury imports`)
      .addSection('CARD DATA', JSON.stringify(cardData))
      .addSection('DASHBOARD CONTEXT', summarizeData(dashboardData, 2000))
      .addSection('ANALYSIS REQUEST', `
        Provide actionable insights for the ${cardType} metric including:
        - Current performance analysis
        - Trend identification
        - Recommended actions
        - Business impact assessment
        
        Return as JSON with: insight, trend, action, priority, impact
      `)
      .build();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return parseAIResponse(text);
  } catch (error) {
    console.error(`Error generating ${cardType} insights:`, error);
    return generateFallbackInsight(cardType, cardData);
  }
}

/**
 * Enhanced card insights with deep analysis
 */
export async function generateEnhancedCardInsights(cardType, cardData, fullDashboardData) {
  try {
    console.log('🧠 Generating enhanced insights for:', cardType);
    
    // Get detailed analysis based on card type
    switch (cardType) {
      case 'orders':
      case 'total_orders':
        return await analyzeTotalOrders(cardData, fullDashboardData);
        
      case 'revenue':
      case 'total_revenue':
      case 'order_value':
        return await analyzeRevenue(cardData, fullDashboardData);
        
      case 'aov':
      case 'average_order_value':
        return await analyzeAOV(cardData, fullDashboardData);
        
      case 'invoices':
      case 'outstanding_invoices':
        return await analyzeInvoices(cardData, fullDashboardData);
        
      case 'customers':
        return await analyzeCustomers(cardData, fullDashboardData);
        
      case 'agents':
        return await analyzeAgents(cardData, fullDashboardData);
        
      case 'brands':
        return await analyzeBrands(cardData, fullDashboardData);
        
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
    You are analyzing order data for DM Brands, a UK luxury import company.
    
    CURRENT DATA:
    - Total Orders: ${cardData.count || cardData.totalOrders || 0}
    - Order Value: £${cardData.totalValue || cardData.revenue || 0}
    - Average Order Value: £${cardData.averageValue || cardData.aov || 0}
    - Date Range: ${dashboardData.dateRange}
    
    ITEM ANALYSIS:
    ${JSON.stringify(dashboardData.performance?.top_items?.slice(0, 10) || [])}
    
    ANALYZE:
    1. Item Variety & Trends:
       - Is there a specific item more popular than others?
       - Are there new trending items?
       - Any items showing declining popularity?
    
    2. Order Value Analysis:
       - How does average order value compare to targets?
       - What can be done to improve/maintain AOV?
    
    3. Order Volume Trends:
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
    
    CURRENT REVENUE DATA:
    - Total Revenue: £${cardData.current || cardData.revenue || 0}
    - Order Count: ${cardData.orders || cardData.orderCount || 0}
    - Average per Order: £${cardData.average || 0}
    
    BRAND PERFORMANCE:
    ${JSON.stringify(dashboardData.performance?.brands || [])}
    
    CUSTOMER SEGMENTS:
    ${JSON.stringify(dashboardData.performance?.top_customers?.slice(0, 10) || [])}
    
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
    - trend: increasing/decreasing/stable
    - action: Primary recommendation
    - priority: high/medium/low
    - impact: Business impact
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
 * Analyze Average Order Value
 */
async function analyzeAOV(cardData, dashboardData) {
  const prompt = `
    Analyze Average Order Value for DM Brands.
    
    CURRENT AOV: £${cardData.averageValue || cardData.aov || 0}
    TARGET AOV: £600
    
    ANALYZE:
    1. What's driving current AOV?
    2. Which products/brands contribute most?
    3. Customer behavior patterns
    4. Improvement strategies
    
    Return JSON with insight, trend, action, priority, impact
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    return generateFallbackInsight('aov', cardData);
  }
}

/**
 * Analyze Invoices
 */
async function analyzeInvoices(cardData, dashboardData) {
  const prompt = `
    Analyze invoice data for DM Brands.
    
    INVOICE DATA:
    ${JSON.stringify(cardData)}
    
    Focus on:
    - Outstanding amounts and aging
    - Payment patterns
    - Customer risk assessment
    - Cash flow impact
    
    Return JSON with insight, trend, action, priority, impact
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
 * Generate drill-down insights
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData, userRole, userId) {
  try {
    const prompt = `
      Analyze detailed ${viewType} data for DM Brands.
      
      VIEW TYPE: ${viewType}
      DETAIL DATA: ${summarizeData(detailData, 2000)}
      SUMMARY: ${summarizeData(summaryData, 1000)}
      
      Provide deep operational insights including patterns, anomalies, and recommendations.
      
      Return JSON with detailed analysis.
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
      
      COMPARISON TYPE: ${comparisonType}
      CURRENT PERIOD: ${summarizeData(currentData, 1500)}
      PREVIOUS PERIOD: ${summarizeData(previousData, 1500)}
      
      Analyze:
      - Key changes and trends
      - Performance drivers
      - Areas of concern
      - Opportunities
      
      Return comprehensive comparison analysis as JSON.
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
      Analyze seasonal patterns for DM Brands luxury imports.
      
      SEASON: ${season}
      HISTORICAL DATA: ${summarizeData(historicalData, 2000)}
      
      Provide:
      - Seasonal trends for luxury gift items
      - Product recommendations
      - Inventory planning advice
      - Marketing opportunities
      
      Return as JSON with seasonal analysis.
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
      
      CUSTOMER: ${JSON.stringify(customer)}
      ORDER HISTORY: ${summarizeData(orderHistory, 1500)}
      
      Provide:
      - Customer profile analysis
      - Purchase patterns
      - Relationship opportunities
      - Risk assessment
      
      Return as JSON.
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
      Comprehensive purchase order analysis for ${brand}.
      
      SUGGESTIONS: ${JSON.stringify(suggestions)}
      HISTORICAL SALES: ${summarizeData(historicalSales, 2000)}
      MARKET DATA: ${JSON.stringify(marketData)}
      
      PROVIDE DEEP ANALYSIS:
      1. Executive Summary
      2. Market Timing Assessment
      3. Risk Assessment
      4. Category Optimization
      5. Cash Flow Impact
      6. Customer Impact
      7. Channel Strategy
      8. Inventory Optimization
      9. Confidence Assessment
      
      Include trend-based recommendations and alternative strategies.
      
      Return comprehensive JSON analysis.
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
      Analyze purchase recommendation for specific product.
      
      PRODUCT: ${JSON.stringify(product)}
      SUGGESTION: ${JSON.stringify(suggestion)}
      COMPETITOR DATA: ${JSON.stringify(competitorData)}
      SEARCH TRENDS: ${JSON.stringify(searchTrends)}
      
      Provide:
      - Purchase rationale
      - Target customers
      - Seasonal considerations
      - Competitive advantage
      - Pricing strategy
      - Display suggestions
      
      Return as JSON.
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
      Validate user adjustments to purchase suggestions for ${brand}.
      
      ORIGINAL: ${JSON.stringify(originalSuggestions)}
      ADJUSTMENTS: ${JSON.stringify(userAdjustments)}
      
      Assess:
      - Adjustment rationale
      - Potential risks
      - Improvements
      - Alternative suggestions
      - Confidence level
      
      Return as JSON.
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
      Generate comprehensive business forecast for DM Brands.
      
      DASHBOARD DATA: ${summarizeData(dashboardData, 3000)}
      
      PROVIDE:
      1. 3-Month Revenue Forecast
      2. Seasonal Trend Analysis
      3. Customer Behavior Predictions
      4. Agent Performance Optimization
      5. Risk Factors & Mitigation
      
      Return detailed forecast with specific numbers and recommendations.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return {
      forecast: 'Forecast generation failed',
      confidence: 'low'
    };
  }
}

/**
 * Generate agent insights
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
      1. Performance Overview
      2. Performance Trends
      3. Customer Insights
      4. Growth Opportunities
      5. Actionable Recommendations
      6. Efficiency Score
      
      Return comprehensive analysis as JSON:
      {
        "performanceOverview": "string",
        "performanceTrends": {
          "revenueTrend": "increasing|decreasing|stable",
          "orderFrequency": "string",
          "customerRetention": "string"
        },
        "customerInsights": {
          "summary": "string",
          "segments": []
        },
        "opportunities": [],
        "recommendations": [
          {
            "title": "string",
            "description": "string",
            "priority": "high|medium|low"
          }
        ],
        "efficiencyScore": {
          "score": number,
          "analysis": "string",
          "factors": []
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