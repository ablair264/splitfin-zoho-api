// Enhanced AI Analytics Service with Performance Optimizations
// server/src/services/aiAnalyticsService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import admin from 'firebase-admin';
import crypto from 'crypto';

// Initialize AI models with optimization
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const flashModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  }
});

const proModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.8,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 4096,
  }
});

// Enhanced caching system
class InsightCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 3600000; // 1 hour default
  }

  generateKey(type, data) {
    const dataStr = JSON.stringify(data);
    return `${type}_${crypto.createHash('md5').update(dataStr).digest('hex')}`;
  }

  get(type, data) {
    const key = this.generateKey(type, data);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log(`✅ Cache hit for ${type}`);
      return cached.data;
    }
    
    return null;
  }

  set(type, data, result) {
    const key = this.generateKey(type, data);
    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

const insightCache = new InsightCache();

// Enhanced Context Manager with persistent memory
export class EnhancedContextManager {
  constructor() {
    this.context = new Map();
    this.history = [];
    this.maxHistory = 10;
  }
  
  set(key, value) {
    this.context.set(key, value);
    this.history.push({ key, value, timestamp: Date.now() });
    
    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }
  
  get(key) {
    return this.context.get(key);
  }
  
  getHistory() {
    return this.history;
  }
  
  getRelevantContext(type) {
    // Return context relevant to the analysis type
    const relevantKeys = {
      revenue: ['previousRevenue', 'revenueTarget', 'seasonalTrends'],
      orders: ['orderHistory', 'customerSegments', 'productPerformance'],
      customers: ['customerSegments', 'lifetimeValue', 'churnRate'],
      inventory: ['stockLevels', 'turnoverRate', 'seasonalDemand']
    };
    
    const context = {};
    const keys = relevantKeys[type] || [];
    
    keys.forEach(key => {
      if (this.context.has(key)) {
        context[key] = this.context.get(key);
      }
    });
    
    return context;
  }
}

const contextManager = new EnhancedContextManager();

// Enhanced Prompt Builder with templates
export class EnhancedPromptBuilder {
  constructor() {
    this.sections = [];
    this.templates = {
      revenue: this.getRevenueTemplate(),
      orders: this.getOrdersTemplate(),
      customers: this.getCustomersTemplate(),
      inventory: this.getInventoryTemplate()
    };
  }
  
  getRevenueTemplate() {
    return `You are analyzing revenue data for DM Brands, a UK-based luxury import company specializing in premium European furniture and lifestyle products.

CONTEXT:
- Company: DM Brands (luxury imports)
- Focus: High-end furniture from Italy, Spain, Portugal
- Business Model: B2B sales through agents to retailers
- Key Metrics: Revenue growth, seasonal patterns, brand performance

ANALYSIS FRAMEWORK:
1. Current Performance vs Historical Trends
2. Seasonal Patterns (peak seasons: Spring/Autumn)
3. Brand Mix Analysis
4. Agent Performance Impact
5. Customer Segment Contribution

DATA PROVIDED:
{data}

PREVIOUS CONTEXT:
{context}

TASK: Provide executive-level revenue analysis with actionable insights.

OUTPUT FORMAT (JSON ONLY):
{
  "insight": "Comprehensive revenue analysis with specific numbers and percentages",
  "trend": "increasing|decreasing|stable|volatile",
  "drivers": ["specific factor 1", "specific factor 2", "specific factor 3"],
  "action": "Specific, actionable recommendation",
  "priority": "high|medium|low",
  "impact": "Quantified business impact",
  "forecast": "Short-term revenue outlook based on current trends",
  "risks": ["identified risk 1", "identified risk 2"],
  "opportunities": ["growth opportunity 1", "growth opportunity 2"]
}`;
  }
  
  getOrdersTemplate() {
    return `Analyze order patterns for DM Brands luxury imports.

BUSINESS CONTEXT:
- Average Order Value: £5,000-£15,000
- Order Frequency: Seasonal peaks in March-May and September-November
- Key Segments: Interior Designers, Luxury Retailers, Hotels

ANALYSIS FOCUS:
1. Order volume trends and patterns
2. Customer ordering behavior
3. Product category performance
4. Agent effectiveness
5. Fulfillment efficiency

DATA:
{data}

CONTEXT:
{context}

Provide insights following this JSON structure:
{
  "insight": "Order pattern analysis with specific metrics",
  "trend": "increasing|decreasing|stable|seasonal",
  "patterns": ["pattern 1", "pattern 2"],
  "action": "Specific recommendation to improve order metrics",
  "priority": "high|medium|low",
  "impact": "Expected impact on business",
  "customerBehavior": "Key customer ordering insights",
  "productInsights": "Top performing categories/items"
}`;
  }
  
  getCustomersTemplate() {
    return `Analyze customer data for DM Brands B2B luxury imports.

CUSTOMER SEGMENTS:
- VIP: >£100k annual orders
- Premium: £50k-£100k annual orders
- Standard: <£50k annual orders
- New: First-time buyers

FOCUS AREAS:
1. Segment performance and migration
2. Customer lifetime value trends
3. Retention and churn patterns
4. Geographic distribution
5. Brand preferences by segment

DATA:
{data}

CONTEXT:
{context}

Return JSON analysis:
{
  "insight": "Customer base analysis with key findings",
  "trend": "growing|stable|concerning",
  "segments": {
    "vip": { "count": 0, "revenue": 0, "trend": "" },
    "premium": { "count": 0, "revenue": 0, "trend": "" },
    "standard": { "count": 0, "revenue": 0, "trend": "" }
  },
  "action": "Strategic recommendation for customer growth",
  "priority": "high|medium|low",
  "impact": "Business impact of recommendation",
  "retentionInsights": "Customer retention analysis",
  "growthOpportunities": ["opportunity 1", "opportunity 2"]
}`;
  }
  
  getInventoryTemplate() {
    return `Analyze inventory for DM Brands luxury furniture imports.

INVENTORY CONTEXT:
- Lead Times: 8-12 weeks from European suppliers
- Storage Costs: High due to furniture size
- Seasonal Demand: Spring/Autumn peaks
- Cash Flow Impact: Significant capital tied in stock

ANALYSIS REQUIREMENTS:
1. Stock turnover rates by brand
2. Slow-moving item identification
3. Seasonal stock optimization
4. Cash flow impact analysis
5. Reorder point recommendations

DATA:
{data}

CONTEXT:
{context}

Provide JSON insights:
{
  "insight": "Inventory analysis with key metrics",
  "trend": "optimizing|concerning|stable",
  "turnoverRate": "X times per year",
  "slowMovers": ["item 1", "item 2"],
  "action": "Specific inventory optimization recommendation",
  "priority": "high|medium|low",
  "cashImpact": "£X tied in slow-moving stock",
  "seasonalRecommendations": ["recommendation 1", "recommendation 2"],
  "reorderSuggestions": ["brand/category 1", "brand/category 2"]
}`;
  }
  
  useTemplate(type, data, context = {}) {
    const template = this.templates[type];
    if (!template) {
      throw new Error(`Template not found for type: ${type}`);
    }
    
    return template
      .replace('{data}', JSON.stringify(data, null, 2))
      .replace('{context}', JSON.stringify(context, null, 2));
  }
}

// Enhanced data preprocessing
export function preprocessData(data, type) {
  // Remove sensitive or irrelevant data
  const processed = { ...data };
  
  // Remove internal IDs and timestamps that don't add value
  delete processed._id;
  delete processed.createdAt;
  delete processed.updatedAt;
  delete processed.firebase_uid;
  
  // Summarize arrays if too large
  if (processed.orders && Array.isArray(processed.orders)) {
    processed.ordersSummary = {
      count: processed.orders.length,
      totalValue: processed.orders.reduce((sum, o) => sum + (o.value || 0), 0),
      recent: processed.orders.slice(-5) // Last 5 orders only
    };
    delete processed.orders;
  }
  
  // Add calculated metrics
  if (type === 'revenue' && processed.current && processed.target) {
    processed.achievementRate = ((processed.current / processed.target) * 100).toFixed(1) + '%';
  }
  
  return processed;
}

// Enhanced response parser with validation
export function parseAIResponse(text, expectedFormat = null) {
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

// Main insight generation with intelligent routing
export async function generateEnhancedInsights(type, data, options = {}) {
  try {
    // Check cache first
    const cached = insightCache.get(type, data);
    if (cached) return cached;
    
    // Preprocess data
    const processedData = preprocessData(data, type);
    
    // Get relevant context
    const context = contextManager.getRelevantContext(type);
    
    // Build prompt using template
    const promptBuilder = new EnhancedPromptBuilder();
    const prompt = promptBuilder.useTemplate(type, processedData, context);
    
    // Choose model based on complexity
    const model = options.detailed ? proModel : flashModel;
    
    // Generate with retry logic
    let attempts = 0;
    let result = null;
    
    while (attempts < 3 && !result) {
      try {
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        result = parseAIResponse(text, getExpectedFormat(type));
        
        // Validate result quality
        if (!isValidInsight(result, type)) {
          throw new Error('Invalid insight format');
        }
        
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed:`, error);
        
        if (attempts === 3) {
          // Return intelligent fallback
          return generateIntelligentFallback(type, processedData);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    // Cache successful result
    insightCache.set(type, data, result);
    
    // Update context for future requests
    contextManager.set(`last${type}Insight`, result);
    
    return result;
    
  } catch (error) {
    console.error(`Enhanced insights error for ${type}:`, error);
    return generateIntelligentFallback(type, data);
  }
}

// Get expected format for validation
function getExpectedFormat(type) {
  const formats = {
    revenue: {
      insight: '',
      trend: 'stable',
      drivers: [],
      action: '',
      priority: 'medium',
      impact: '',
      forecast: '',
      risks: [],
      opportunities: []
    },
    orders: {
      insight: '',
      trend: 'stable',
      patterns: [],
      action: '',
      priority: 'medium',
      impact: '',
      customerBehavior: '',
      productInsights: ''
    },
    customers: {
      insight: '',
      trend: 'stable',
      segments: {},
      action: '',
      priority: 'medium',
      impact: '',
      retentionInsights: '',
      growthOpportunities: []
    }
  };
  
  return formats[type] || formats.revenue;
}

// Validate insight quality
function isValidInsight(insight, type) {
  if (!insight || typeof insight !== 'object') return false;
  
  // Check for minimum required fields
  const required = ['insight', 'trend', 'action'];
  for (const field of required) {
    if (!insight[field] || insight[field].length < 10) {
      return false;
    }
  }
  
  // Check trend value
  const validTrends = ['increasing', 'decreasing', 'stable', 'volatile', 'seasonal'];
  if (!validTrends.includes(insight.trend)) {
    return false;
  }
  
  return true;
}

// Generate intelligent fallback based on data
function generateIntelligentFallback(type, data) {
  const value = data?.current || data?.totalValue || data?.value || 0;
  const count = data?.count || data?.total || 0;
  const previous = data?.previous || data?.lastPeriod || 0;
  
  const trend = value > previous ? 'increasing' : value < previous ? 'decreasing' : 'stable';
  const change = previous > 0 ? ((value - previous) / previous * 100).toFixed(1) : 0;
  
  const fallbacks = {
    revenue: {
      insight: `Revenue stands at £${value.toLocaleString()} with ${count} transactions recorded. ${
        trend === 'increasing' ? `Performance shows ${change}% growth from previous period.` :
        trend === 'decreasing' ? `Performance declined ${Math.abs(change)}% from previous period.` :
        'Performance remains stable compared to previous period.'
      }`,
      trend,
      drivers: ['Market conditions', 'Seasonal factors', 'Product mix'],
      action: trend === 'decreasing' ? 
        'Review pricing strategy and enhance customer engagement' :
        'Maintain momentum and explore expansion opportunities',
      priority: trend === 'decreasing' ? 'high' : 'medium',
      impact: 'Direct impact on quarterly targets and cash flow',
      forecast: 'Continued monitoring recommended',
      risks: ['Market volatility', 'Supply chain delays'],
      opportunities: ['New product lines', 'Geographic expansion']
    }
  };
  
  return fallbacks[type] || fallbacks.revenue;
}

// Batch processing for multiple insights
export async function batchGenerateInsights(requests) {
  const results = await Promise.allSettled(
    requests.map(req => generateEnhancedInsights(req.type, req.data, req.options))
  );
  
  return results.map((result, index) => ({
    type: requests[index].type,
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason.message : null
  }));
}

// Export enhanced versions of existing functions
// Note: These functions should be implemented separately to avoid circular imports
export async function estimateTokens(text) {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export async function summarizeData(data, maxLength = 1000) {
  if (typeof data === 'string') {
    return data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
  }
  return JSON.stringify(data).length > maxLength ? 
    JSON.stringify(data).substring(0, maxLength) + '...' : 
    JSON.stringify(data);
}

// Specific insight generators using enhanced system
export async function generateCardInsights(cardType, cardData, dashboardData) {
  return generateEnhancedInsights(cardType, {
    ...cardData,
    dashboardContext: dashboardData
  });
}

export async function generateAIInsights(dashboardData) {
  const summaryData = {
    revenue: dashboardData.revenue,
    orders: dashboardData.orders,
    customers: dashboardData.customers,
    inventory: dashboardData.inventory
  };
  
  const insights = await batchGenerateInsights([
    { type: 'revenue', data: summaryData.revenue },
    { type: 'orders', data: summaryData.orders },
    { type: 'customers', data: summaryData.customers }
  ]);
  
  return {
    summary: insights.map(i => i.data?.insight).join(' '),
    keyDrivers: insights.flatMap(i => i.data?.drivers || []),
    recommendations: insights.map(i => i.data?.action).filter(Boolean),
    criticalAlerts: insights.filter(i => i.data?.priority === 'high').map(i => i.data?.action),
    opportunities: insights.flatMap(i => i.data?.opportunities || [])
  };
}