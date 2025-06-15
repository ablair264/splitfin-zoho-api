// server/src/services/purchaseAnalysisService.js
// Modified version that works without Google Ads API initially

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as tf from '@tensorflow/tfjs-node';
import NodeCache from 'node-cache';
import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import axios from 'axios';

puppeteer.use(StealthPlugin());

class PurchaseAnalysisService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache
    this.googleAdsClient = null;
    this.model = null;
    this.initializeServices();
  }

  async initializeServices() {
    // Skip Google Ads initialization for now
    console.log('🚀 Initializing Purchase Analysis Service (without Google Ads)...');
    
    // Load or create ML model
    await this.initializeMLModel();
  }

  async initializeMLModel() {
    try {
      // Try to load existing model
      this.model = await tf.loadLayersModel('file://./models/purchase-predictor/model.json');
      console.log('✅ Loaded existing ML model');
    } catch {
      // Create new model if not found
      console.log('📊 Creating new ML model...');
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [10],
            units: 32,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'linear'
          })
        ]
      });
      
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });
      
      console.log('✅ Created new ML model');
    }
  }

  async getKeywordData(keywords) {
    const cacheKey = keywords.sort().join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // For now, return simulated data based on category patterns
    console.log('📊 Using simulated keyword data (Google Ads not configured)');
    
    const simulatedData = keywords.map(keyword => {
      // Simulate different search volumes based on category
      let avgSearches = 1000;
      let trend = 'stable';
      
      if (keyword.toLowerCase().includes('christmas')) {
        avgSearches = 5000;
        const month = new Date().getMonth();
        trend = (month >= 6 && month <= 11) ? 'up' : 'down';
      } else if (keyword.toLowerCase().includes('easter')) {
        avgSearches = 3000;
        const month = new Date().getMonth();
        trend = (month >= 0 && month <= 3) ? 'up' : 'down';
      } else if (keyword.toLowerCase().includes('summer')) {
        avgSearches = 2500;
        const month = new Date().getMonth();
        trend = (month >= 3 && month <= 7) ? 'up' : 'down';
      }
      
      // Add some randomness
      avgSearches = Math.floor(avgSearches * (0.8 + Math.random() * 0.4));
      
      return {
        keyword,
        avgMonthlySearches: avgSearches,
        competition: 'MEDIUM',
        trending: trend
      };
    });
    
    this.cache.set(cacheKey, simulatedData);
    return simulatedData;
  }

  async scrapeCompetitorData(products) {
    console.log(`🔍 Starting competitor analysis for ${products.length} products...`);
    
    const byDomain = this.groupByDomain(products);
    const results = [];
    
    for (const [domain, domainProducts] of Object.entries(byDomain)) {
      try {
        const domainResults = await this.scrapeDomain(domain, domainProducts);
        results.push(...domainResults);
        
        // Save to Firebase immediately
        await this.saveCompetitorData(domainResults);
        
        // Polite delay
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Error scraping domain ${domain}:`, error.message);
        // Continue with other domains
      }
    }
    
    return results;
  }

  async scrapeDomain(domain, products) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await this.setupPage(page);
      
      const results = [];
      
      for (const product of products) {
        try {
          console.log(`Checking ${product.url}...`);
          await page.goto(product.url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
          });
          
          const data = await page.evaluate(() => {
            // Generic selectors for e-commerce sites
            const priceSelectors = [
              '[class*="price"]:not([class*="was"]):not([class*="old"]):not([class*="strike"])',
              '[data-price]',
              '[itemprop="price"]',
              '.product-price',
              '.price-now',
              'span[class*="amount"]'
            ];
            
            const stockSelectors = [
              '[class*="stock"]',
              '[class*="availability"]',
              '[data-stock]',
              '[itemprop="availability"]',
              '.stock-level',
              '[class*="inventory"]'
            ];
            
            // Extract price
            let price = null;
            for (const selector of priceSelectors) {
              try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                  const text = element.textContent || '';
                  const match = text.match(/[\d,]+\.?\d*/);
                  if (match) {
                    const extractedPrice = parseFloat(match[0].replace(',', ''));
                    if (extractedPrice > 0 && extractedPrice < 100000) { // Sanity check
                      price = extractedPrice;
                      break;
                    }
                  }
                }
                if (price) break;
              } catch (e) {
                // Continue trying other selectors
              }
            }
            
            // Extract stock status
            let stockStatus = 'unknown';
            const pageText = document.body.textContent?.toLowerCase() || '';
            
            if (pageText.includes('out of stock') || pageText.includes('sold out') || pageText.includes('unavailable')) {
              stockStatus = 'out_of_stock';
            } else if (pageText.includes('in stock') || pageText.includes('available')) {
              stockStatus = 'in_stock';
            } else if (pageText.includes('low stock') || pageText.includes('only') || pageText.includes('left')) {
              stockStatus = 'low_stock';
            }
            
            // Try specific selectors if text search didn't work
            if (stockStatus === 'unknown') {
              for (const selector of stockSelectors) {
                try {
                  const element = document.querySelector(selector);
                  if (element) {
                    const text = element.textContent?.toLowerCase() || '';
                    if (text.includes('in stock') || text.includes('available')) {
                      stockStatus = 'in_stock';
                      break;
                    } else if (text.includes('out') || text.includes('unavailable')) {
                      stockStatus = 'out_of_stock';
                      break;
                    } else if (text.includes('low') || text.includes('limited')) {
                      stockStatus = 'low_stock';
                      break;
                    }
                  }
                } catch (e) {
                  // Continue trying other selectors
                }
              }
            }
            
            return { price, stockStatus };
          });
          
          results.push({
            sku: product.sku,
            competitorUrl: product.url,
            price: data.price,
            stockStatus: data.stockStatus,
            timestamp: new Date().toISOString(),
            domain
          });
          
          // Random delay between 1-3 seconds
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
        } catch (error) {
          console.error(`Error scraping ${product.url}:`, error.message);
          results.push({
            sku: product.sku,
            competitorUrl: product.url,
            price: null,
            stockStatus: 'error',
            timestamp: new Date().toISOString(),
            domain,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Browser error for domain ${domain}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async setupPage(page) {
    // Set a realistic viewport
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100)
    });
    
    // Set user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
    ];
    
    await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
    
    // Block unnecessary resources to speed up scraping
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  groupByDomain(products) {
    return products.reduce((acc, product) => {
      try {
        const domain = new URL(product.url).hostname;
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(product);
      } catch (error) {
        console.error(`Invalid URL: ${product.url}`);
      }
      return acc;
    }, {});
  }

  async saveCompetitorData(results) {
    const db = admin.firestore();
    const batch = db.batch();
    
    results.forEach(result => {
      const docRef = db.collection('competitor_data').doc(`${result.sku}_${Date.now()}`);
      batch.set(docRef, result);
    });
    
    await batch.commit();
    console.log(`💾 Saved ${results.length} competitor data points`);
  }

async analyzeBrand(brandId, limit = 100) {
  console.log(`🔄 Analyzing brand ${brandId}`);
  
  try {
    const db = admin.firestore();
    
    // 1. Get products for this brand - try both normalized and display name
    let productsSnapshot = await db.collection('products')
      .where('brand_normalized', '==', brandId)
      .limit(limit)
      .get();
    
    // If no products found with normalized, try with display name
    if (productsSnapshot.empty) {
      console.log(`No products found with brand_normalized: ${brandId}, trying brand field...`);
      productsSnapshot = await db.collection('products')
        .where('brand', '==', brandId)
        .limit(limit)
        .get();
    }
    
    // If still empty, try case-insensitive match
    if (productsSnapshot.empty) {
      console.log(`No products found with brand: ${brandId}, trying case variations...`);
      // Try common variations
      const variations = [
        brandId,
        brandId.charAt(0).toUpperCase() + brandId.slice(1).toLowerCase(), // Capitalize first letter
        brandId.toUpperCase(),
        brandId.toLowerCase()
      ];
      
      for (const variant of variations) {
        productsSnapshot = await db.collection('products')
          .where('brand', '==', variant)
          .limit(limit)
          .get();
        
        if (!productsSnapshot.empty) {
          console.log(`Found products with brand variant: ${variant}`);
          break;
        }
      }
    }
    
    if (productsSnapshot.empty) {
      console.log(`No products found for any variation of brand ${brandId}`);
      return {
        predictions: [],
        message: `No products found for brand: ${brandId}`
      };
    }
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${products.length} products for brand ${brandId}`);
      
      // 2. Get sales history from sales_transactions
      const salesHistory = await this.getSalesHistory(products.map(p => p.sku));
      
      // 3. Get keyword data for product categories
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const searchData = categories.length > 0 ? await this.getKeywordData(categories) : [];
      
      // 4. Get competitor data (if URLs available)
      const competitorProducts = products
        .filter(p => p.competitorUrls?.length > 0)
        .slice(0, 20) // Limit to 20 for cost
        .flatMap(p => 
          p.competitorUrls.map(url => ({
            sku: p.sku,
            url
          }))
        );
      
      let competitorData = [];
      if (competitorProducts.length > 0) {
        console.log(`Analyzing ${competitorProducts.length} competitor URLs...`);
        competitorData = await this.scrapeCompetitorData(competitorProducts);
      } else {
        console.log('No competitor URLs configured for these products');
      }
      
      // 5. Generate predictions for each product
      const predictions = await Promise.all(
        products.map(async (product) => {
          const categorySearch = searchData.find(s => 
            s.keyword.toLowerCase().includes((product.category || '').toLowerCase())
          );
          
          const competitorInfo = competitorData.filter(c => c.sku === product.sku);
          const productSalesHistory = salesHistory.get(product.sku) || {
            avgMonthlySales: 0,
            trendSlope: 0,
            seasonalityScore: 0,
            stockoutFrequency: 0,
            lastOrderDaysAgo: 999
          };
          
          const brandData = {
            searchVolume: categorySearch?.avgMonthlySearches || 0,
            searchTrend: categorySearch?.trending || 'stable',
            competitorStockLevel: competitorInfo[0]?.stockStatus || 'unknown',
            competitorPriceRatio: competitorInfo[0]?.price 
              ? (product.rate || product.price || 0) / competitorInfo[0].price 
              : 1,
            daysUntilPeakSeason: this.calculateDaysUntilPeakSeason(product.category),
            competitorDataPoints: competitorInfo.length,
            salesHistory: productSalesHistory
          };
          
          return await this.predictPurchaseQuantity(product.sku, product, brandData);
        })
      );
      
      // 6. Save analysis results
       const analysisId = `${brandId}_${Date.now()}`;
    await db.collection('purchase_analyses').doc(analysisId).set({
      brandId,
      // userId removed
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      predictions: predictions.filter(p => p.recommendedQuantity > 0),
      searchData,
      competitorDataSummary: competitorData.length,
      productsAnalyzed: products.length
    });
      
      return {
      analysisId,
      predictions: predictions
        .filter(p => p.recommendedQuantity > 0)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 50)
    };
      
    } catch (error) {
      console.error('Brand analysis error:', error);
      throw error;
    }
  }

  async getSalesHistory(skus) {
    const db = admin.firestore();
    const salesMap = new Map();
    
    // Get last 90 days of sales
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    for (const sku of skus) {
      try {
        const salesQuery = await db.collection('sales_transactions')
          .where('sku', '==', sku)
          .where('order_date', '>=', ninetyDaysAgo.toISOString())
          .orderBy('order_date', 'desc')
          .get();
        
        const sales = salesQuery.docs.map(doc => doc.data());
        
        if (sales.length > 0) {
          const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
          const avgMonthlySales = totalQuantity / 3; // 3 months
          const trendSlope = this.calculateTrendSlope(sales);
          const seasonalityScore = this.calculateSeasonality(sales);
          
          salesMap.set(sku, {
            avgMonthlySales,
            trendSlope,
            seasonalityScore,
            stockoutFrequency: 0, // TODO: Calculate from inventory data
            lastOrderDaysAgo: this.daysSinceLastOrder(sales[0]),
            totalSales: totalQuantity,
            salesCount: sales.length
          });
        } else {
          // No sales history - new or slow-moving product
          salesMap.set(sku, {
            avgMonthlySales: 0,
            trendSlope: 0,
            seasonalityScore: 0,
            stockoutFrequency: 0,
            lastOrderDaysAgo: 999,
            totalSales: 0,
            salesCount: 0
          });
        }
      } catch (error) {
        console.error(`Error getting sales history for SKU ${sku}:`, error);
      }
    }
    
    return salesMap;
  }

  calculateTrendSlope(sales) {
    if (sales.length < 2) return 0;
    
    // Simple linear regression
    const n = sales.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = sales.map(s => s.quantity || 0);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  calculateSeasonality(sales) {
    const monthlySales = {};
    
    sales.forEach(sale => {
      const month = new Date(sale.order_date).toISOString().slice(0, 7);
      monthlySales[month] = (monthlySales[month] || 0) + (sale.quantity || 0);
    });
    
    const values = Object.values(monthlySales);
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean; // Coefficient of variation
    
    return Math.min(cv, 1);
  }

  daysSinceLastOrder(lastSale) {
    if (!lastSale || !lastSale.order_date) return 999;
    
    const lastDate = new Date(lastSale.order_date);
    const today = new Date();
    const diff = today - lastDate;
    
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  calculateDaysUntilPeakSeason(category) {
    if (!category) return 180;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const categoryLower = category.toLowerCase();
    
    const peakSeasons = {
      'christmas': new Date(currentYear, 11, 15), // December 15
      'xmas': new Date(currentYear, 11, 15),
      'easter': new Date(currentYear, 3, 1), // April 1
      'summer': new Date(currentYear, 6, 1), // July 1
      'halloween': new Date(currentYear, 9, 15), // October 15
      'valentines': new Date(currentYear, 1, 7), // February 7
      'valentine': new Date(currentYear, 1, 7)
    };
    
    for (const [season, date] of Object.entries(peakSeasons)) {
      if (categoryLower.includes(season)) {
        let targetDate = date;
        
        // If the date has passed this year, use next year
        if (targetDate < today) {
          targetDate = new Date(date);
          targetDate.setFullYear(currentYear + 1);
        }
        
        const days = Math.floor((targetDate - today) / (1000 * 60 * 60 * 24));
        return days;
      }
    }
    
    return 180; // Default to 6 months
  }

  async predictPurchaseQuantity(sku, product, brandData) {
    // Simple prediction logic without ML model training
    // You can enhance this with actual ML training once you have enough data
    
    const salesHistory = brandData.salesHistory;
    let baseQuantity = salesHistory.avgMonthlySales * 3; // 3 months of stock
    
    // Adjustments based on various factors
    let adjustmentFactor = 1.0;
    
    // Search trend adjustment
    if (brandData.searchTrend === 'up') {
      adjustmentFactor *= 1.2;
    } else if (brandData.searchTrend === 'down') {
      adjustmentFactor *= 0.8;
    }
    
    // Competitor stock adjustment
    if (brandData.competitorStockLevel === 'out_of_stock') {
      adjustmentFactor *= 1.3; // Opportunity to capture market share
    } else if (brandData.competitorStockLevel === 'low_stock') {
      adjustmentFactor *= 1.1;
    }
    
    // Seasonality adjustment
    if (brandData.daysUntilPeakSeason < 90 && salesHistory.seasonalityScore > 0.5) {
      adjustmentFactor *= 1.5; // Prepare for peak season
    }
    
    // Sales trend adjustment
    if (salesHistory.trendSlope > 0.1) {
      adjustmentFactor *= 1.1;
    } else if (salesHistory.trendSlope < -0.1) {
      adjustmentFactor *= 0.9;
    }
    
    // Calculate final quantity
    let recommendedQuantity = Math.round(baseQuantity * adjustmentFactor);
    
    // For products with no sales history, use minimum order quantities
    if (salesHistory.salesCount === 0) {
      recommendedQuantity = brandData.searchVolume > 1000 ? 10 : 5;
    }
    
    // Ensure minimum quantity
    recommendedQuantity = Math.max(recommendedQuantity, 1);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(salesHistory, brandData);
    
    return {
      sku,
      product_name: product.name,
      recommendedQuantity,
      confidence,
      reasoning: this.generateReasoning(brandData, salesHistory, adjustmentFactor),
      metrics: {
        avgMonthlySales: salesHistory.avgMonthlySales,
        searchVolume: brandData.searchVolume,
        competitorStatus: brandData.competitorStockLevel,
        daysUntilPeak: brandData.daysUntilPeakSeason
      }
    };
  }

  calculateConfidence(salesHistory, brandData) {
    let confidence = 0.3; // Base confidence
    
    // More sales history = higher confidence
    if (salesHistory.salesCount > 20) confidence += 0.2;
    else if (salesHistory.salesCount > 10) confidence += 0.1;
    else if (salesHistory.salesCount > 5) confidence += 0.05;
    
    // Search data available
    if (brandData.searchVolume > 0) confidence += 0.1;
    
    // Competitor data available
    if (brandData.competitorDataPoints > 0) confidence += 0.1;
    
    // Clear trend
    if (Math.abs(salesHistory.trendSlope) > 0.1) confidence += 0.1;
    
    // Clear seasonality
    if (salesHistory.seasonalityScore > 0.5) confidence += 0.1;
    
    // Recent sales
    if (salesHistory.lastOrderDaysAgo < 30) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  generateReasoning(brandData, salesHistory, adjustmentFactor) {
    const reasons = [];
    
    if (salesHistory.avgMonthlySales > 0) {
      reasons.push(`Average monthly sales: ${salesHistory.avgMonthlySales.toFixed(0)} units`);
    }
    
    if (brandData.searchTrend === 'up') {
      reasons.push('Search interest is trending upward');
    } else if (brandData.searchTrend === 'down') {
      reasons.push('Search interest is declining');
    }
    
    if (brandData.competitorStockLevel === 'out_of_stock') {
      reasons.push('Competitors are out of stock - opportunity to capture market share');
    } else if (brandData.competitorStockLevel === 'low_stock') {
      reasons.push('Competitors have low stock');
    }
    
    if (brandData.daysUntilPeakSeason < 90 && salesHistory.seasonalityScore > 0.5) {
      reasons.push(`Peak season in ${brandData.daysUntilPeakSeason} days - order now for optimal timing`);
    }
    
    if (salesHistory.trendSlope > 0.1) {
      reasons.push('Sales have been trending upward');
    } else if (salesHistory.trendSlope < -0.1) {
      reasons.push('Sales have been declining');
    }
    
    if (salesHistory.salesCount === 0) {
      reasons.push('New or slow-moving product - minimum quantity recommended');
    }
    
    return reasons.join('. ') || 'Based on current market conditions';
  }

  async getLatestAnalysis(brandId) {
  const db = admin.firestore();
  
  try {
    const snapshot = await db.collection('purchase_analyses')
      .where('brandId', '==', brandId)
      // userId filter removed
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const data = snapshot.docs[0].data();
    const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
    
    return {
      ...data,
      age: Date.now() - timestamp.getTime()
    };
  } catch (error) {
    console.error('Error getting latest analysis:', error);
    return null;
  }
}

export default new PurchaseAnalysisService();