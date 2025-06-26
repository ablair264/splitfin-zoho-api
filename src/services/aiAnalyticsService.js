// src/services/aiAnalyticsService.js
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
        seasonal: 'Provide seasonal strategies for the agent\'s territory.',
        purchase: 'Recommend purchase quantities based on the agent\'s customer demand patterns.'
      },
      brandManager: {
        general: 'You analyze DM Brands, a UK luxury import company specializing in European home and giftware.',
        revenue: 'Analyze revenue performance considering brand mix and profitability.',
        orders: 'Evaluate sales patterns, agent performance, and market trends.',
        customers: 'Assess customer value, segmentation, and growth opportunities.',
        seasonal: 'Analyze seasonal trends for luxury import planning.',
        purchase: 'Recommend optimal purchase quantities based on comprehensive business data.'
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
 * Card-specific insights with comprehensive data
 */
export async function generateCardInsights(cardType, cardData, fullDashboardData) {
  try {
    const role = fullDashboardData?.role || 'brandManager';
    const validCardType = cardType || 'general';
    
    console.log('AI Insights - Processing:', {
      cardType: validCardType,
      hasCardData: !!cardData,
      cardDataKeys: Object.keys(cardData || {}),
      role,
      cardDataSample: JSON.stringify(cardData).substring(0, 200)
    });
    
    // Validate we have actual data
    if (!cardData || Object.keys(cardData).length === 0) {
      return {
        insight: "No data available for analysis. Please ensure data is loaded.",
        trend: "unavailable",
        action: "Refresh the dashboard to load current data",
        priority: "high",
        impact: "Cannot analyze without data"
      };
    }
    
    // Extract specific metrics based on card type
    let metrics = {};
    
    switch (validCardType) {
      case 'orders':
        metrics = {
          ordersCount: cardData.count || cardData.totalOrders || cardData.orders?.length || 0,
          ordersValue: cardData.totalValue || cardData.value || cardData.revenue || 0,
          avgValue: cardData.averageValue || cardData.averageOrderValue || cardData.aov || 0,
          recentOrdersCount: cardData.recentOrders?.length || cardData.orders?.slice(0, 5).length || 0,
          highestOrder: Math.max(...(cardData.orders?.map(o => o.total || o.value || 0) || [0])),
          lowestOrder: Math.min(...(cardData.orders?.map(o => o.total || o.value || 0) || [0]))
        };
        break;
        
      case 'order_value':
      case 'revenue':
        metrics = {
          revenue: cardData.current || cardData.revenue || cardData.total || 0,
          orderCount: cardData.orders || cardData.orderCount || cardData.count || 0,
          average: cardData.average || cardData.averageValue || cardData.aov || 0,
          percentOfTarget: ((cardData.current || cardData.revenue || 0) / 100000) * 100
        };
        break;
        
      case 'aov':
        metrics = {
          aov: cardData.averageValue || 0,
          totalOrders: cardData.totalOrders || 0,
          totalRevenue: cardData.totalRevenue || 0,
          targetAOV: 600,
          percentOfTarget: ((cardData.averageValue || 0) / 600) * 100
        };
        break;
        
      case 'invoices':
        metrics = {
          outstanding: cardData.totalOutstanding || 0,
          overdueCount: cardData.overdue?.length || 0,
          overdueValue: cardData.overdue?.reduce((sum, inv) => sum + inv.balance, 0) || 0,
          oldestOverdue: cardData.overdue?.[0]?.days_overdue || 0
        };
        break;
        
      default:
        metrics = { dataPoints: Object.keys(cardData).length };
    }

    // Create a comprehensive prompt with business context
    const systemPrompt = `You are a business analyst for DM Brands, a UK luxury home and giftware import company. 
    You MUST provide specific, data-driven insights using the exact numbers provided.
    Your response MUST be valid JSON only, no other text.`;

    const analysisPrompt = `
    Analyze this ${validCardType} data for a ${role === 'salesAgent' ? 'sales agent' : 'brand manager'}:
    
    METRICS:
    ${Object.entries(metrics).map(([key, value]) => `- ${key}: ${typeof value === 'number' ? value.toLocaleString() : value}`).join('\n')}
    
    REQUIREMENTS:
    1. Your insight MUST reference at least 2 specific numbers from the metrics above
    2. Your trend analysis MUST be based on the data patterns
    3. Your action MUST be specific and measurable
    4. Your priority MUST reflect the business impact
    5. Your impact statement MUST quantify the potential effect
    
    RESPONSE FORMAT (JSON only):
    {
      "insight": "[2-3 sentences using specific numbers from the data. For example: 'With X orders worth £Y, performance shows Z trend...']",
      "trend": "[Choose based on data: increasing|decreasing|stable|volatile]",
      "action": "[Specific action with measurable outcome. For example: 'Increase average order value by £X through Y strategy']",
      "priority": "[high if metrics are below 70% of target, medium if 70-90%, low if above 90%]",
      "impact": "[Quantified impact. For example: 'Could increase revenue by £X or Y%']"
    }
    
    IMPORTANT: You MUST use the actual numbers provided above. Generic responses will be rejected.`;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: systemPrompt + '\n\n' + analysisPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log('AI Raw Response:', text);
    
    // Parse and validate the response
    let parsedResponse;
    try {
      const cleanedText = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/^[^{]*/, '')
        .replace(/[^}]*$/, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return createDataDrivenFallback(validCardType, metrics, role);
    }
    
    // Validate the response contains actual data references
    const responseText = JSON.stringify(parsedResponse).toLowerCase();
    const hasNumbers = /\d+/.test(parsedResponse.insight || '');
    const hasSpecificData = Object.values(metrics).some(value => 
      responseText.includes(value.toString().toLowerCase())
    );
    
    // If response is too generic, create a better one
    if (!hasNumbers || parsedResponse.insight?.split(' ').length < 10) {
      console.warn('AI response too generic, creating data-driven response');
      return createDataDrivenFallback(validCardType, metrics, role);
    }
    
    // Ensure all fields are present
    return {
      insight: parsedResponse.insight || createInsightFromMetrics(validCardType, metrics, role),
      trend: validateTrend(parsedResponse.trend) || determineTrendFromMetrics(metrics, validCardType),
      action: parsedResponse.action || createActionFromMetrics(validCardType, metrics, role),
      priority: validatePriority(parsedResponse.priority) || determinePriorityFromMetrics(metrics, validCardType),
      impact: parsedResponse.impact || createImpactFromMetrics(validCardType, metrics)
    };

  } catch (error) {
    console.error(`❌ Error generating ${cardType} insights:`, error);
    return createDataDrivenFallback(cardType, cardData, fullDashboardData?.role);
  }
}

// Helper function to create data-driven fallbacks
function createDataDrivenFallback(cardType, metrics, role) {
  switch (cardType) {
    case 'orders':
      return {
        insight: `You have ${metrics.ordersCount || 0} orders totaling £${(metrics.ordersValue || 0).toLocaleString()} with an average value of £${Math.round(metrics.avgValue || 0)}. ${metrics.avgValue < 600 ? 'Average order value is below the £600 target.' : 'Average order value meets targets.'}`,
        trend: metrics.ordersCount > 10 ? 'increasing' : 'stable',
        action: metrics.avgValue < 600 ? 
          `Focus on increasing average order value by £${Math.round(600 - metrics.avgValue)} through product bundling and upselling.` :
          `Maintain current performance while targeting ${Math.round(metrics.ordersCount * 1.2)} orders next period.`,
        priority: metrics.ordersCount < 10 || metrics.avgValue < 500 ? 'high' : 'medium',
        impact: `Achieving target AOV of £600 could increase revenue by £${Math.round((600 - metrics.avgValue) * metrics.ordersCount).toLocaleString()}.`
      };
      
    case 'revenue':
    case 'order_value':
      const revenueTarget = 100000;
      const percentOfTarget = (metrics.revenue / revenueTarget) * 100;
      return {
        insight: `Revenue of £${(metrics.revenue || 0).toLocaleString()} represents ${percentOfTarget.toFixed(1)}% of the £100k target from ${metrics.orderCount || 0} orders. Average order value is £${Math.round(metrics.average || 0)}.`,
        trend: percentOfTarget > 80 ? 'increasing' : percentOfTarget > 50 ? 'stable' : 'decreasing',
        action: percentOfTarget < 100 ? 
          `Increase order count by ${Math.round((revenueTarget - metrics.revenue) / (metrics.average || 600))} orders to reach target.` :
          `Exceeded target by ${percentOfTarget - 100}%. Focus on maintaining quality and customer satisfaction.`,
        priority: percentOfTarget < 70 ? 'high' : percentOfTarget < 90 ? 'medium' : 'low',
        impact: `Reaching £100k target requires additional £${(revenueTarget - metrics.revenue).toLocaleString()} in revenue.`
      };
      
    case 'aov':
      const aovGap = 600 - (metrics.aov || 0);
      return {
        insight: `Average order value of £${Math.round(metrics.aov || 0)} is ${metrics.percentOfTarget?.toFixed(1) || 0}% of the £600 target across ${metrics.totalOrders || 0} orders. ${aovGap > 0 ? `£${aovGap} below target.` : 'Exceeding target.'}`,
        trend: metrics.aov > 550 ? 'increasing' : metrics.aov > 450 ? 'stable' : 'decreasing',
        action: aovGap > 0 ? 
          `Implement minimum order incentives at £600 and train team on upselling to increase AOV by £${Math.round(aovGap)}.` :
          `Maintain current strategies while exploring premium product placement to further increase AOV.`,
        priority: metrics.aov < 450 ? 'high' : metrics.aov < 550 ? 'medium' : 'low',
        impact: `Achieving £600 AOV target would generate additional £${Math.round(aovGap * metrics.totalOrders).toLocaleString()} revenue.`
      };
      
    case 'invoices':
      return {
        insight: `Outstanding invoices total £${(metrics.outstanding || 0).toLocaleString()} with ${metrics.overdueCount || 0} overdue invoices worth £${(metrics.overdueValue || 0).toLocaleString()}. Oldest overdue by ${metrics.oldestOverdue || 0} days.`,
        trend: metrics.overdueCount > 5 ? 'increasing' : 'stable',
        action: metrics.overdueCount > 0 ? 
          `Contact all ${metrics.overdueCount} customers with overdue invoices to recover £${(metrics.overdueValue || 0).toLocaleString()}. Prioritize oldest overdue.` :
          `Maintain current collection practices. Consider early payment incentives to improve cash flow.`,
        priority: metrics.overdueValue > 10000 ? 'high' : metrics.overdueValue > 5000 ? 'medium' : 'low',
        impact: `Collecting overdue invoices would improve cash flow by £${(metrics.overdueValue || 0).toLocaleString()} immediately.`
      };
      
    default:
      return {
        insight: `Analysis of ${cardType} shows ${metrics.dataPoints || 0} data points available for review.`,
        trend: 'stable',
        action: 'Review detailed metrics and identify improvement opportunities.',
        priority: 'medium',
        impact: 'Further analysis needed to quantify impact.'
      };
  }
}

/**
 * Enhanced Purchase Order Insights with comprehensive data
 */
export async function generatePurchaseOrderInsights(brand, suggestions, historicalSales, marketData) {
  try {
    // Validate brand parameter
    const validBrand = brand || 'Unknown Brand';
    
    // Limit suggestions to top items
    const topSuggestions = limitArrayData(suggestions, 20, [
      'sku', 'product_name', 'recommendedQuantity', 'confidence', 'reasoning'
    ]);

    // Create a comprehensive prompt with all available data
    const prompt = `
      Business context: UK luxury import company DM Brands analyzing ${validBrand} purchase order.
      
      COMPREHENSIVE BUSINESS DATA:
      
      Sales Performance (6 months):
      - Total Revenue: £${historicalSales.totalRevenue?.toFixed(0) || 0}
      - Total Units Sold: ${historicalSales.totalUnits || 0}
      - Average Order Value: £${historicalSales.salesOrders?.avgOrderValue?.toFixed(0) || 0}
      - Top Products: ${JSON.stringify(historicalSales.topProducts?.slice(0, 5) || [])}
      - Monthly Revenue Pattern: ${JSON.stringify(historicalSales.seasonalPattern || {})}
      
      Customer Insights:
      - Active Customers: ${historicalSales.customerMetrics?.totalActiveCustomers || 0}
      - VIP Customers: ${historicalSales.customerMetrics?.customerSegments?.vip?.length || 0}
      - Repeat Purchase Rate: ${((historicalSales.customerMetrics?.repeatCustomers || 0) / 
        Math.max(historicalSales.customerMetrics?.totalActiveCustomers || 1, 1) * 100).toFixed(1)}%
      - Customer Retention: ${historicalSales.customerMetrics?.retentionRate?.toFixed(1) || 0}%
      - Churn Risk Customers: ${historicalSales.customerMetrics?.churnRisk?.length || 0}
      
      Order Patterns:
      - Total Orders: ${historicalSales.salesOrders?.totalOrders || 0}
      - Direct vs Marketplace: ${JSON.stringify(historicalSales.salesOrders?.channelBreakdown || {})}
      - Popular Bundles: ${(historicalSales.salesOrders?.topBundles || []).slice(0, 3).map(b => b.items.join('+')).join(', ')}
      - Average Items per Order: ${historicalSales.salesOrders?.avgItemsPerOrder?.toFixed(1) || 0}
      
      Cash Flow Situation:
      - Outstanding Invoices: £${historicalSales.invoiceMetrics?.totalOutstanding || 0}
      - Average Payment Days: ${historicalSales.invoiceMetrics?.avgPaymentDays?.toFixed(0) || 30}
      - Overdue Risk: £${historicalSales.invoiceMetrics?.overdueAmount || 0}
      - High Risk Invoices: ${historicalSales.invoiceMetrics?.riskAssessment?.high?.length || 0}
      - Expected Cash (30 days): £${historicalSales.invoiceMetrics?.cashFlowProjection?.next30Days || 0}
      
      Supply Chain:
      - Pending Purchase Orders: ${historicalSales.purchaseHistory?.pendingOrders?.length || 0}
      - Total Pending Value: £${historicalSales.purchaseHistory?.totalPending || 0}
      - Average Lead Time: ${historicalSales.purchaseHistory?.avgLeadTime || 14} days
      - Reorder Patterns: ${Object.keys(historicalSales.purchaseHistory?.reorderPatterns || {}).length} SKUs tracked
      
      Inventory Status:
      - Current Stock Value: £${historicalSales.zohoMetrics?.totalValue || 0}
      - Low Stock Items: ${historicalSales.zohoMetrics?.lowStockItems?.length || 0}
      - Out of Stock Items: ${historicalSales.zohoMetrics?.outOfStockItems?.length || 0}
      - Overstock Items: ${historicalSales.zohoMetrics?.overstockItems?.length || 0}
      
      Market Trends:
      - Search Trends: ${JSON.stringify(marketData.searchTrends?.slice(0, 3) || [])}
      - Market Share: ${marketData.marketShare?.toFixed(1) || 0}%
      - Category Growth: ${marketData.categoryGrowth?.toFixed(1) || 0}%
      
      Purchase Suggestions (top 20):
      ${JSON.stringify(topSuggestions)}
      
      Generate comprehensive purchase insights as JSON:
      - executiveSummary: Comprehensive analysis including customer demand, cash flow, and market position (3-4 sentences)
      - marketTiming: Assessment based on search trends, seasonality, and current inventory levels
      - trendBasedRecommendations: Array of 4-5 specific actions based on all data points
      - riskAssessment: Key risks considering cash flow, customer patterns, and market trends
      - categoryOptimization: Which product categories to focus on based on bundles, customer segments, and trends
      - cashFlowImpact: Specific impact on cash flow considering payment patterns and outstanding invoices
      - customerImpact: How this order will serve different customer segments (VIP, regular, churn risk)
      - channelStrategy: Recommendations for direct vs marketplace allocation based on channel performance
      - inventoryOptimization: How to balance low stock, overstock, and new purchases
      - confidenceAssessment: Overall confidence with specific reasoning based on data quality and trends
      
      Be specific and reference the actual data provided. Consider the luxury import business model.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

  } catch (error) {
    console.error("❌ Error generating purchase insights:", error);
    return {
      executiveSummary: "Analysis unavailable due to processing error",
      marketTiming: "Unable to assess market timing",
      trendBasedRecommendations: ["Manual review recommended", "Check data completeness"],
      riskAssessment: "Risk analysis pending",
      categoryOptimization: ["Focus on best-selling categories"],
      cashFlowImpact: "Cash flow impact unknown",
      customerImpact: "Customer impact analysis unavailable",
      channelStrategy: "Review channel performance manually",
      inventoryOptimization: "Check current stock levels",
      confidenceAssessment: "Low confidence due to error"
    };
  }
}

/**
 * Product-specific purchase insights
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
      suggestedQty: suggestion?.recommendedQuantity || 0,
      category: product.category || 'General',
      price: product.retailPrice || 0
    };

    const prompt = `
      Product purchase analysis for DM Brands luxury import:
      
      Product: ${JSON.stringify(productSummary)}
      Confidence: ${(suggestion?.confidence * 100)?.toFixed(0) || 0}%
      Reasoning: ${suggestion?.reasoning || 'Based on historical sales'}
      
      Market Intelligence:
      - Competitor Stock: ${competitorData?.competitorStock || 'Unknown'}
      - Search Trend: ${searchTrends?.trend || 'Unknown'} (${searchTrends?.volume || 0} searches)
      - Related Searches: ${searchTrends?.relatedQueries?.slice(0, 3).join(', ') || 'None'}
      
      Generate insights as JSON:
      - purchaseRationale: Why stock this quantity for a luxury import business
      - seasonalConsiderations: Seasonal factors for UK market
      - competitiveAdvantage: Market positioning for this product
      - targetCustomers: Specific customer segments (luxury retailers, boutiques, etc.)
      - pricingStrategy: Premium pricing approach for luxury market
      - displaySuggestions: Merchandising tips for luxury presentation
      
      Be specific and actionable for the UK luxury home and giftware market.
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

/**
 * Validation for purchase adjustments
 */
export async function validatePurchaseAdjustments(originalSuggestions, userAdjustments, brand) {
  try {
    // Validate brand
    const validBrand = brand || 'Unknown Brand';
    
    // Map adjustments to suggestions
    const adjustmentDetails = userAdjustments.map(adj => {
      const original = originalSuggestions.find(s => s.sku === adj.sku);
      return {
        sku: adj.sku,
        name: original?.product_name || 'Unknown Product',
        originalQty: adj.originalQuantity,
        adjustedQty: adj.adjustedQuantity || adj.quantity,
        difference: (adj.adjustedQuantity || adj.quantity) - adj.originalQuantity,
        percentChange: ((adj.adjustedQuantity || adj.quantity) - adj.originalQuantity) / adj.originalQuantity * 100
      };
    });

    const prompt = `
      Validate purchase adjustments for ${validBrand} (UK luxury import business):
      
      Adjustments: ${JSON.stringify(adjustmentDetails)}
      
      Total Original Quantity: ${adjustmentDetails.reduce((sum, a) => sum + a.originalQty, 0)}
      Total Adjusted Quantity: ${adjustmentDetails.reduce((sum, a) => sum + a.adjustedQty, 0)}
      
      Generate validation as JSON:
      - adjustmentAssessment: Overall assessment of the changes
      - potentialRisks: Array of specific risks (overstock, understock, cash flow)
      - improvements: Array of positive aspects of the adjustments
      - alternativeSuggestions: Array of alternative approaches
      - confidenceInAdjustments: Score 0-100 with reasoning
      
      Consider cash flow, storage capacity, and seasonal demand for luxury goods.
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
 * Drill-down insights with comprehensive data
 */
export async function generateDrillDownInsights(viewType, detailData, summaryData, userRole, agentId) {
  try {
    // Validate viewType
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
  return findings.map(finding => `Address: ${finding}`).slice(0, 4);
}

function generateTacticalActions(findings) {
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

// Helper functions for parsing
function extractBetween(text, key, delimiter = '"') {
  const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'i');
  const match = text.match(regex);
  return match ? match[1] : null;
}

function extractTrend(text) {
  const trends = ['increasing', 'decreasing', 'stable', 'volatile'];
  const lowerText = text.toLowerCase();
  return trends.find(trend => lowerText.includes(trend)) || 'stable';
}

function extractPriority(text) {
  const priorities = ['high', 'medium', 'low'];
  const lowerText = text.toLowerCase();
  return priorities.find(priority => lowerText.includes(priority)) || 'medium';
}

function validateTrend(trend) {
  const validTrends = ['increasing', 'decreasing', 'stable', 'volatile'];
  return validTrends.includes(trend) ? trend : 'stable';
}

function validatePriority(priority) {
  const validPriorities = ['low', 'medium', 'high'];
  return validPriorities.includes(priority) ? priority : 'medium';
}

// Helper functions for metrics
function createInsightFromMetrics(cardType, metrics, role) {
  const insights = {
    orders: `With ${metrics.ordersCount} orders worth £${metrics.ordersValue.toLocaleString()}, average order value is £${Math.round(metrics.avgValue)}.`,
    revenue: `Revenue of £${metrics.revenue.toLocaleString()} from ${metrics.orderCount} orders shows ${metrics.percentOfTarget.toFixed(1)}% of target.`,
    aov: `Average order value is £${Math.round(metrics.aov)}, ${metrics.percentOfTarget.toFixed(1)}% of £600 target.`,
    invoices: `£${metrics.outstanding.toLocaleString()} outstanding with ${metrics.overdueCount} overdue invoices.`
  };
  return insights[cardType] || 'Data analysis complete.';
}

function determineTrendFromMetrics(metrics, cardType) {
  switch (cardType) {
    case 'orders':
      return metrics.ordersCount > 20 ? 'increasing' : metrics.ordersCount < 10 ? 'decreasing' : 'stable';
    case 'revenue':
      return metrics.percentOfTarget > 90 ? 'increasing' : metrics.percentOfTarget < 70 ? 'decreasing' : 'stable';
    case 'aov':
      return metrics.percentOfTarget > 90 ? 'increasing' : metrics.percentOfTarget < 75 ? 'decreasing' : 'stable';
    case 'invoices':
      return metrics.overdueCount > 5 ? 'increasing' : 'stable';
    default:
      return 'stable';
  }
}

function createActionFromMetrics(cardType, metrics, role) {
  const actions = {
    orders: metrics.avgValue < 600 ? 
      `Increase AOV by £${Math.round(600 - metrics.avgValue)} through bundling.` : 
      'Focus on increasing order volume.',
    revenue: `Target ${Math.round((100000 - metrics.revenue) / metrics.average)} more orders to reach £100k.`,
    aov: `Implement strategies to increase AOV by £${Math.round(600 - metrics.aov)}.`,
    invoices: `Contact ${metrics.overdueCount} customers to collect £${metrics.overdueValue.toLocaleString()}.`
  };
  return actions[cardType] || 'Review metrics and set improvement targets.';
}

function determinePriorityFromMetrics(metrics, cardType) {
  switch (cardType) {
    case 'orders':
      return metrics.ordersCount < 10 || metrics.avgValue < 450 ? 'high' : metrics.avgValue < 550 ? 'medium' : 'low';
    case 'revenue':
      return metrics.percentOfTarget < 70 ? 'high' : metrics.percentOfTarget < 90 ? 'medium' : 'low';
    case 'aov':
      return metrics.percentOfTarget < 75 ? 'high' : metrics.percentOfTarget < 90 ? 'medium' : 'low';
    case 'invoices':
      return metrics.overdueValue > 10000 ? 'high' : metrics.overdueValue > 5000 ? 'medium' : 'low';
    default:
      return 'medium';
  }
}

function createImpactFromMetrics(cardType, metrics) {
  const impacts = {
    orders: `Improving AOV to £600 could add £${Math.round((600 - metrics.avgValue) * metrics.ordersCount).toLocaleString()} revenue.`,
    revenue: `Reaching target would add £${(100000 - metrics.revenue).toLocaleString()} revenue.`,
    aov: `Each £10 AOV increase generates £${(10 * metrics.totalOrders).toLocaleString()} additional revenue.`,
    invoices: `Collecting overdue improves cash flow by £${metrics.overdueValue.toLocaleString()}.`
  };
  return impacts[cardType] || 'Quantified impact pending further analysis.';
}

// Export utility functions for external use
export {
  estimateTokens,
  summarizeData,
  ContextManager,
  PromptBuilder
};