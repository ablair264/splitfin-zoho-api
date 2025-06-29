// src/services/aiAnalyticsService.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// Initialize Gemini AI with proper environment variable
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

// Define interfaces
interface CardData {
  count?: number;
  totalOrders?: number;
  totalValue?: number;
  revenue?: number;
  averageValue?: number;
  aov?: number;
  current?: number;
  orders?: number;
  orderCount?: number;
  average?: number;
}

interface DashboardData {
  userId?: string;
  dateRange: string;
  performance?: {
    top_items?: any[];
    brands?: any[];
    top_customers?: any[];
  };
}

interface HistoricalData {
  lastPeriod: any;
  lastYear: any;
  seasonal: any;
}

// Utility functions that were referenced but not defined
export function estimateTokens(text: string): number {
  // Simple token estimation (roughly 4 chars per token)
  return Math.ceil(text.length / 4);
}

export function summarizeData(data: any, maxLength: number = 1000): string {
  const stringified = JSON.stringify(data);
  if (stringified.length <= maxLength) return stringified;
  
  // Truncate and add summary
  return stringified.substring(0, maxLength - 20) + '... [truncated]';
}

// Context Manager for maintaining conversation context
export class ContextManager {
  private context: Map<string, any> = new Map();
  
  set(key: string, value: any) {
    this.context.set(key, value);
  }
  
  get(key: string) {
    return this.context.get(key);
  }
  
  clear() {
    this.context.clear();
  }
}

// Prompt Builder for consistent prompt formatting
export class PromptBuilder {
  private sections: string[] = [];
  
  addSection(title: string, content: string) {
    this.sections.push(`${title}:\n${content}\n`);
    return this;
  }
  
  build(): string {
    return this.sections.join('\n');
  }
}

/**
 * Enhanced MetricCard Insights with Deep Analysis
 */
export async function generateEnhancedCardInsights(
  cardType: string, 
  cardData: CardData, 
  fullDashboardData: DashboardData
) {
  try {
    console.log('🧠 Generating enhanced insights for:', cardType);
    
    // Get historical data for comparison
    const historicalData = await fetchHistoricalData(
      fullDashboardData.userId || '',
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
async function analyzeTotalOrders(
  cardData: CardData, 
  dashboardData: DashboardData, 
  historicalData: HistoricalData | null
) {
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
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON with error handling
    return parseAIResponse(text);
  } catch (error) {
    console.error('Error analyzing total orders:', error);
    return generateFallbackInsight('orders', cardData);
  }
}

/**
 * Analyze Revenue with comprehensive insights
 */
async function analyzeRevenue(
  cardData: CardData, 
  dashboardData: DashboardData, 
  historicalData: HistoricalData | null
) {
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
 * Parse AI response with error handling
 */
function parseAIResponse(text: string): any {
  try {
    // Remove markdown code blocks
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
function generateFallbackInsight(type: string, data: CardData): any {
  const value = data.current || data.revenue || data.totalValue || 0;
  const count = data.count || data.totalOrders || 0;
  
  return {
    insight: `Current ${type}: ${count > 0 ? count : '£' + value}`,
    trend: 'stable',
    action: 'Monitor performance',
    priority: 'medium',
    impact: 'Normal operations'
  };
}

/**
 * Fetch historical data for comparison
 */
async function fetchHistoricalData(
  userId: string, 
  currentRange: string, 
  metricType: string
): Promise<HistoricalData | null> {
  try {
    // Calculate comparison periods
    const periods = calculateComparisonPeriods(currentRange);
    
    // Fetch data from Firebase for each period
    const historicalData: HistoricalData = {
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
 * Calculate comparison periods based on current range
 */
function calculateComparisonPeriods(currentRange: string) {
  const now = new Date();
  const [start, end] = currentRange.split(' to ').map(d => new Date(d));
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    lastPeriod: {
      start: new Date(start.getTime() - daysDiff * 24 * 60 * 60 * 1000),
      end: new Date(end.getTime() - daysDiff * 24 * 60 * 60 * 1000)
    },
    lastYear: {
      start: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()),
      end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
    }
  };
}

/**
 * Fetch data for a specific period
 */
async function fetchPeriodData(
  userId: string, 
  period: { start: Date; end: Date }, 
  metricType: string
) {
  try {
    const ordersRef = collection(db, 'salesorders');
    const q = query(
      ordersRef,
      where('date', '>=', Timestamp.fromDate(period.start)),
      where('date', '<=', Timestamp.fromDate(period.end)),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate metrics based on type
    switch (metricType) {
      case 'orders':
        return {
          count: orders.length,
          value: orders.reduce((sum, o) => sum + (o.total || 0), 0)
        };
      case 'revenue':
        return {
          total: orders.reduce((sum, o) => sum + (o.total || 0), 0),
          average: orders.length > 0 ? 
            orders.reduce((sum, o) => sum + (o.total || 0), 0) / orders.length : 0
        };
      default:
        return { orders };
    }
  } catch (error) {
    console.error('Error fetching period data:', error);
    return null;
  }
}

/**
 * Fetch seasonal data
 */
async function fetchSeasonalData(userId: string, metricType: string) {
  // This would fetch seasonal patterns from historical data
  // For now, returning placeholder
  return {
    pattern: 'Higher sales in Q4',
    peakMonth: 'December',
    lowMonth: 'February'
  };
}

// Placeholder functions for missing implementations
async function analyzeAOV(cardData: CardData, dashboardData: DashboardData, historicalData: HistoricalData | null) {
  return generateFallbackInsight('aov', cardData);
}

async function analyzeInvoices(cardData: CardData, dashboardData: DashboardData, historicalData: HistoricalData | null) {
  return generateFallbackInsight('invoices', cardData);
}

async function analyzeYearOverYear(cardData: CardData, dashboardData: DashboardData, type: string) {
  return generateFallbackInsight('yoy', cardData);
}

async function analyzeCustomers(cardData: CardData, dashboardData: DashboardData, historicalData: HistoricalData | null) {
  return generateFallbackInsight('customers', cardData);
}

async function analyzeAgents(cardData: CardData, dashboardData: DashboardData, historicalData: HistoricalData | null) {
  return generateFallbackInsight('agents', cardData);
}

async function analyzeBrands(cardData: CardData, dashboardData: DashboardData, historicalData: HistoricalData | null) {
  return generateFallbackInsight('brands', cardData);
}

async function generateCardInsights(cardType: string, cardData: CardData, dashboardData: DashboardData) {
  return generateFallbackInsight(cardType, cardData);
}

// Export all functions
export {
  generateEnhancedPurchaseInsights,
  generateEnhancedForecast,
  generateAgentInsights,
  fetchSearchTrends
};

// Placeholder implementations for exported functions
export async function generateEnhancedPurchaseInsights(brand: string, suggestions: any, comprehensiveData: any) {
  // Implementation would go here
  return {
    insights: 'Purchase analysis',
    recommendations: []
  };
}

export async function generateEnhancedForecast(dashboardData: any) {
  // Implementation would go here
  return {
    forecast: 'Next period prediction',
    confidence: 'medium'
  };
}

export async function generateAgentInsights(agentData: any, performanceHistory: any, customerBase: any) {
  // Implementation would go here
  return {
    performance: 'Agent analysis',
    recommendations: []
  };
}

export async function fetchSearchTrends(brand: string) {
  // Implementation would go here
  return {
    trends: [],
    volume: 0
  };
}