// server/src/services/purchaseAnalysisService.js
import { GoogleAdsApi } from 'google-ads-api';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as tf from '@tensorflow/tfjs-node';
import NodeCache from 'node-cache';
import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';

puppeteer.use(StealthPlugin());

class PurchaseAnalysisService {
  constructor() {
    this.cache = new NodeCache({ stdTTL: 86400 }); // 24 hour cache
    this.googleAdsClient = null;
    this.model = null;
    this.initializeServices();
  }

  async initializeServices() {
    // Initialize Google Ads client if credentials are available
    if (process.env.GOOGLE_ADS_CLIENT_ID) {
      this.googleAdsClient = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      });
    }
    
    // Load or create ML model
    await this.initializeMLModel();
  }

  async initializeMLModel() {
    try {
      // Try to load existing model
      this.model = await tf.loadLayersModel('file://./models/purchase-predictor/model.json');
    } catch {
      // Create new model if not found
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
    }
  }

  async getKeywordData(keywords) {
    const cacheKey = keywords.sort().join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    if (!this.googleAdsClient) {
      console.log('Google Ads not configured, returning mock data');
      return keywords.map(k => ({
        keyword: k,
        avgMonthlySearches: Math.floor(Math.random() * 10000),
        competition: 'MEDIUM',
        trending: 'stable'
      }));
    }

    try {
      const customer = this.googleAdsClient.Customer({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      });

      const keywordPlanService = customer.keywordPlanIdeas();
      
      const response = await keywordPlanService.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
        language: 'en',
        geo_target_constants: ['geoTargetConstants/2826'], // UK
        keywords: keywords.slice(0, 20),
      });

      const results = response.results.map(result => ({
        keyword: result.text,
        avgMonthlySearches: result.keyword_idea_metrics?.avg_monthly_searches || 0,
        competition: result.keyword_idea_metrics?.competition || 'UNKNOWN',
        trending: this.calculateTrend(result.keyword_idea_metrics?.monthly_search_volumes || [])
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Google Ads API error:', error);
      return [];
    }
  }

  calculateTrend(monthlyVolumes) {
    if (monthlyVolumes.length < 3) return 'stable';
    
    const recent = monthlyVolumes.slice(-3).map(v => v.monthly_searches || 0);
    const older = monthlyVolumes.slice(-6, -3).map(v => v.monthly_searches || 0);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg * 1.2) return 'up';
    if (recentAvg < olderAvg * 0.8) return 'down';
    return 'stable';
  }

  async scrapeCompetitorData(products) {
    const byDomain = this.groupByDomain(products);
    const results = [];
    
    for (const [domain, domainProducts] of Object.entries(byDomain)) {
      const domainResults = await this.scrapeDomain(domain, domainProducts);
      results.push(...domainResults);
      
      // Save to Firebase immediately
      await this.saveCompetitorData(domainResults);
      
      // Polite delay
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return results;
  }

  async scrapeDomain(domain, products) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await this.setupPage(page);
      
      const results = [];
      
      for (const product of products) {
        try {
          await page.goto(product.url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
          });
          
          const data = await page.evaluate(() => {
            // Generic selectors for e-commerce sites
            const priceSelectors = [
              '[class*="price"]',
              '[data-price]',
              '[itemprop="price"]',
              '.product-price',
              '.price-now'
            ];
            
            const stockSelectors = [
              '[class*="stock"]',
              '[class*="availability"]',
              '[data-stock]',
              '[itemprop="availability"]',
              '.stock-level'
            ];
            
            // Extract price
            let price = null;
            for (const selector of priceSelectors) {
              const element = document.querySelector(selector);
              if (element) {
                const text = element.textContent || '';
                const match = text.match(/[\d,]+\.?\d*/);
                if (match) {
                  price = parseFloat(match[0].replace(',', ''));
                  break;
                }
              }
            }
            
            // Extract stock status
            let stockStatus = 'unknown';
            const pageText = document.body.textContent?.toLowerCase() || '';
            
            if (pageText.includes('out of stock') || pageText.includes('sold out')) {
              stockStatus = 'out_of_stock';
            } else if (pageText.includes('in stock')) {
              stockStatus = 'in_stock';
            } else if (pageText.includes('low stock')) {
              stockStatus = 'low_stock';
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
          
          // Random delay
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
        } catch (error) {
          console.error(`Error scraping ${product.url}:`, error);
          results.push({
            sku: product.sku,
            competitorUrl: product.url,
            price: null,
            stockStatus: 'error',
            timestamp: new Date().toISOString(),
            domain
          });
        }
      }
      
      return results;
    } finally {
      await browser.close();
    }
  }

  async setupPage(page) {
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100)
    });
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );
    
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });
  }

  groupByDomain(products) {
    return products.reduce((acc, product) => {
      const domain = new URL(product.url).hostname;
      if (!acc[domain]) acc[domain] = [];
      acc[domain].push(product);
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
  }

  async analyzeBrand(brandId, userId, limit = 100) {
    console.log(`🔄 Analyzing brand ${brandId} for user ${userId}`);
    
    try {
      const db = admin.firestore();
      
      // 1. Get products for this brand
      const productsSnapshot = await db.collection('products')
        .where('brand_normalized', '==', brandId)
        .orderBy('totalSales', 'desc')
        .limit(limit)
        .get();
      
      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Found ${products.length} products for brand ${brandId}`);
      
      // 2. Get sales history from sales_transactions
      const salesHistory = await this.getSalesHistory(products.map(p => p.sku));
      
      // 3. Get keyword data for product categories
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      const searchData = await this.getKeywordData(categories);
      
      // 4. Get competitor data (if URLs available)
      const competitorProducts = products
        .filter(p => p.competitorUrls?.length > 0)
        .slice(0, 20)
        .flatMap(p => 
          p.competitorUrls.map(url => ({
            sku: p.sku,
            url
          }))
        );
      
      let competitorData = [];
      if (competitorProducts.length > 0) {
        competitorData = await this.scrapeCompetitorData(competitorProducts);
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
              ? product.retailPrice / competitorInfo[0].price 
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
        userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        predictions: predictions.filter(p => p.recommendedQuantity > 0),
        searchData,
        competitorDataSummary: competitorData.length
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
      const salesQuery = await db.collection('sales_transactions')
        .where('sku', '==', sku)
        .where('order_date', '>=', ninetyDaysAgo.toISOString())
        .orderBy('order_date', 'desc')
        .get();
      
      const sales = salesQuery.docs.map(doc => doc.data());
      
      if (sales.length > 0) {
        const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
        const avgMonthlySales = totalQuantity / 3;
        const trendSlope = this.calculateTrendSlope(sales);
        const seasonalityScore = this.calculateSeasonality(sales);
        
        salesMap.set(sku, {
          avgMonthlySales,
          trendSlope,
          seasonalityScore,
          stockoutFrequency: 0,
          lastOrderDaysAgo: this.daysSinceLastOrder(sales[0])
        });
      }
    }
    
    return salesMap;
  }

  calculateTrendSlope(sales) {
    if (sales.length < 2) return 0;
    
    const n = sales.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = sales.map(s => s.quantity || 0);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  calculateSeasonality(sales) {
    const monthlySales = {};
    
    sales.forEach(sale => {
      const month = new Date(sale.order_date).toISOString().slice(0, 7);
      monthlySales[month] = (monthlySales[month] || 0) + (sale.quantity || 0);
    });
    
    const values = Object.values(monthlySales);
    if (values.length < 3) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean;
    
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
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const peakSeasons = {
      'christmas': new Date(currentYear, 11, 15),
      'easter': new Date(currentYear, 3, 1),
      'summer': new Date(currentYear, 6, 1),
      'halloween': new Date(currentYear, 9, 15),
      'valentines': new Date(currentYear, 1, 7),
    };
    
    for (const [season, date] of Object.entries(peakSeasons)) {
      if (category?.toLowerCase().includes(season)) {
        const days = Math.floor((date - today) / (1000 * 60 * 60 * 24));
        return days > 0 ? days : days + 365;
      }
    }
    
    return 180;
  }

  async predictPurchaseQuantity(sku, product, brandData) {
    // Extract features
    const features = [
      brandData.searchVolume / 1000,
      brandData.searchTrend === 'up' ? 1 : brandData.searchTrend === 'down' ? -1 : 0,
      brandData.competitorStockLevel === 'out_of_stock' ? 1 : 0,
      brandData.competitorPriceRatio || 1,
      brandData.salesHistory.avgMonthlySales / 100,
      brandData.salesHistory.trendSlope,
      brandData.salesHistory.seasonalityScore,
      brandData.daysUntilPeakSeason / 365,
      brandData.salesHistory.stockoutFrequency,
      brandData.salesHistory.lastOrderDaysAgo / 365
    ];
    
    // Make prediction
    const prediction = this.model.predict(tf.tensor2d([features]));
    const quantity = Math.round((await prediction.data())[0]);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(features, brandData);
    
    return {
      sku,
      product_name: product.name,
      recommendedQuantity: Math.max(0, quantity),
      confidence,
      reasoning: this.generateReasoning(brandData),
      features
    };
  }

  calculateConfidence(features, brandData) {
    let confidence = 0.5;
    
    if (brandData.searchVolume > 1000) confidence += 0.1;
    if (brandData.competitorDataPoints > 3) confidence += 0.1;
    if (features[4] > 10) confidence += 0.1;
    if (Math.abs(features[5]) > 0.1) confidence += 0.1;
    if (features[6] > 0.5) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  generateReasoning(brandData) {
    const reasons = [];
    
    if (brandData.searchTrend === 'up') {
      reasons.push('Search interest is trending upward');
    }
    
    if (brandData.competitorStockLevel === 'out_of_stock') {
      reasons.push('Competitors are out of stock - opportunity to capture market share');
    }
    
    if (brandData.seasonalityScore > 0.5 && brandData.daysUntilPeakSeason < 90) {
      reasons.push('Peak season approaching - order now for optimal timing');
    }
    
    if (brandData.salesHistory.trendSlope > 0.1) {
      reasons.push('Sales have been trending upward');
    }
    
    return reasons.join('. ') || 'Based on current market conditions';
  }

  async getLatestAnalysis(brandId, userId) {
    const db = admin.firestore();
    
    const snapshot = await db.collection('purchase_analyses')
      .where('brandId', '==', brandId)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const data = snapshot.docs[0].data();
    return {
      ...data,
      age: Date.now() - data.timestamp.toMillis()
    };
  }
}

export default new PurchaseAnalysisService();