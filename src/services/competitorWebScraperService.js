// Competitor Web Scraper Service
// Real-time competitor analysis for DM Brands
// server/src/services/competitorWebScraperService.js

import puppeteer from 'puppeteer';
import axios from 'axios';
import admin from 'firebase-admin';
import { parseAIResponse, proModel } from './dmBrandsAIService.js';

class CompetitorWebScraperService {
  constructor() {
    this.db = admin.firestore();
    this.browser = null;
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour
    
    // Real competitor websites to analyze
    this.competitors = {
      homearama: {
        name: 'Homearama',
        url: 'https://www.homearama.com',
        searchPatterns: ['/search?q=', '/products/'],
        brandSelectors: {
          rader: ['[data-brand*="rader" i]', '[class*="rader" i]'],
          elvang: ['[data-brand*="elvang" i]', '[class*="elvang" i]'],
          remember: ['[data-brand*="remember" i]', '[class*="remember" i]'],
          relaxound: ['[data-brand*="relaxound" i]', '[class*="relaxound" i]'],
          myFlame: ['[data-brand*="my flame" i]', '[class*="myflame" i]']
        }
      },
      nordicnest: {
        name: 'Nordic Nest',
        url: 'https://www.nordicnest.com',
        searchPatterns: ['/search/', '/brands/'],
        brandSelectors: {
          rader: ['[data-brand="rader"]', '.brand-rader'],
          elvang: ['[data-brand="elvang"]', '.brand-elvang'],
          remember: ['[data-brand="remember"]', '.brand-remember'],
          relaxound: ['[data-brand="relaxound"]', '.brand-relaxound'],
          myFlame: ['[data-brand="my-flame"]', '.brand-myflame']
        }
      },
      royaldesign: {
        name: 'Royal Design',
        url: 'https://www.royaldesign.com',
        searchPatterns: ['/search/', '/brands/'],
        brandSelectors: {
          rader: ['[data-brand="rader"]', '.brand-rader'],
          elvang: ['[data-brand="elvang"]', '.brand-elvang'],
          remember: ['[data-brand="remember"]', '.brand-remember'],
          relaxound: ['[data-brand="relaxound"]', '.brand-relaxound'],
          myFlame: ['[data-brand="my-flame"]', '.brand-myflame']
        }
      }
    };
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Scrape competitor website for our brands
  async scrapeCompetitorSite(competitorKey, brands = null) {
    const competitor = this.competitors[competitorKey];
    if (!competitor) {
      throw new Error(`Unknown competitor: ${competitorKey}`);
    }

    const cacheKey = `${competitorKey}_${Date.now()}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    await this.initialize();
    const page = await this.browser.newPage();
    
    try {
      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      const scrapedData = {
        competitor: competitor.name,
        url: competitor.url,
        timestamp: new Date().toISOString(),
        brands: {},
        pricing: {},
        featured: [],
        categories: {},
        totalProducts: 0
      };

      // Scrape each brand
      const brandsToScrape = brands || Object.keys(competitor.brandSelectors);
      
      for (const brand of brandsToScrape) {
        const brandData = await this.scrapeBrandFromSite(page, competitor, brand);
        scrapedData.brands[brand] = brandData;
        scrapedData.totalProducts += brandData.productCount || 0;
      }

      // Get featured products
      scrapedData.featured = await this.getFeaturedProducts(page, competitor);
      
      // Get category breakdown
      scrapedData.categories = await this.getCategoryBreakdown(page, competitor);

      // Cache the results
      this.cache.set(cacheKey, {
        data: scrapedData,
        timestamp: Date.now()
      });

      return scrapedData;

    } catch (error) {
      console.error(`Error scraping ${competitor.name}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeBrandFromSite(page, competitor, brand) {
    const selectors = competitor.brandSelectors[brand];
    if (!selectors) return { error: 'No selectors defined' };

    const brandData = {
      brand,
      productCount: 0,
      products: [],
      priceRange: { min: null, max: null },
      categories: [],
      featured: false
    };

    try {
      // Try different search strategies
      for (const selector of selectors) {
        try {
          await page.goto(competitor.url, { waitUntil: 'networkidle2', timeout: 10000 });
          
          // Wait for content to load
          await page.waitForSelector('body', { timeout: 5000 });
          
          // Search for brand products
          const products = await page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(el => {
              const product = {
                name: el.querySelector('.product-name, .title, h1, h2, h3')?.textContent?.trim(),
                price: el.querySelector('.price, .product-price')?.textContent?.trim(),
                image: el.querySelector('img')?.src,
                url: el.href || el.querySelector('a')?.href,
                category: el.querySelector('.category, .breadcrumb')?.textContent?.trim()
              };
              return product;
            }).filter(p => p.name && p.price);
          }, selector);

          if (products.length > 0) {
            brandData.products = products;
            brandData.productCount = products.length;
            
            // Calculate price range
            const prices = products
              .map(p => parseFloat(p.price.replace(/[£,]/g, '')))
              .filter(p => !isNaN(p));
            
            if (prices.length > 0) {
              brandData.priceRange = {
                min: Math.min(...prices),
                max: Math.max(...prices)
              };
            }

            // Extract categories
            brandData.categories = [...new Set(products.map(p => p.category).filter(Boolean))];
            
            break; // Found products, no need to try other selectors
          }
        } catch (error) {
          console.warn(`Selector ${selector} failed for ${brand}:`, error.message);
          continue;
        }
      }

      // Check if brand is featured
      brandData.featured = await this.isBrandFeatured(page, competitor, brand);

    } catch (error) {
      console.error(`Error scraping brand ${brand}:`, error);
      brandData.error = error.message;
    }

    return brandData;
  }

  async getFeaturedProducts(page, competitor) {
    try {
      await page.goto(competitor.url, { waitUntil: 'networkidle2' });
      
      const featured = await page.evaluate(() => {
        const selectors = [
          '.featured-products .product',
          '.hero .product',
          '.bestsellers .product',
          '.new-arrivals .product'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return Array.from(elements).slice(0, 10).map(el => ({
              name: el.querySelector('.product-name, .title')?.textContent?.trim(),
              price: el.querySelector('.price')?.textContent?.trim(),
              image: el.querySelector('img')?.src,
              category: el.querySelector('.category')?.textContent?.trim()
            })).filter(p => p.name && p.price);
          }
        }
        return [];
      });

      return featured;
    } catch (error) {
      console.error('Error getting featured products:', error);
      return [];
    }
  }

  async getCategoryBreakdown(page, competitor) {
    try {
      await page.goto(competitor.url, { waitUntil: 'networkidle2' });
      
      const categories = await page.evaluate(() => {
        const categoryElements = document.querySelectorAll('.category, .nav-item, .menu-item');
        const categoryMap = {};
        
        categoryElements.forEach(el => {
          const name = el.textContent?.trim();
          const count = el.querySelector('.count')?.textContent?.trim();
          if (name) {
            categoryMap[name] = parseInt(count) || 0;
          }
        });
        
        return categoryMap;
      });

      return categories;
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      return {};
    }
  }

  async isBrandFeatured(page, competitor, brand) {
    try {
      const featured = await page.evaluate((brandName) => {
        const text = document.body.textContent.toLowerCase();
        return text.includes(brandName.toLowerCase());
      }, brand);
      
      return featured;
    } catch (error) {
      return false;
    }
  }

  // Analyze scraped data with AI
  async analyzeCompetitorData(scrapedData, ourProducts) {
    const prompt = `Analyze real competitor website data for DM Brands.

SCRAPED COMPETITOR DATA:
${JSON.stringify(scrapedData, null, 2)}

OUR PRODUCTS:
${JSON.stringify(ourProducts, null, 2)}

ANALYSIS REQUIRED:
1. How are our brands positioned vs competitors?
2. Pricing strategy insights
3. Product mix analysis
4. Featured product opportunities
5. Market positioning recommendations

PROVIDE STRATEGIC INSIGHTS (JSON):
{
  "marketPosition": {
    "summary": "Real analysis based on scraped data",
    "brandPerception": {
      "premium": ["brands actually seen as premium"],
      "mainstream": ["brands in mainstream positioning"],
      "niche": ["brands in specific niches"]
    }
  },
  "pricingIntelligence": {
    "ourAdvantage": ["where we're actually competitive"],
    "concerns": ["where we're overpriced based on real data"],
    "recommendations": [
      {
        "product": "Actual product name",
        "ourPrice": "£X",
        "marketPrice": "£Y (from competitor)",
        "action": "Specific recommendation"
      }
    ]
  },
  "productStrategy": {
    "topPerformers": ["products actually doing well"],
    "missingOpportunities": ["products we should stock"],
    "oversaturated": ["products to avoid"],
    "trends": ["emerging patterns from real data"]
  },
  "competitorInsights": {
    "${scrapedData.competitor}": {
      "strength": "What they actually do well",
      "ourOpportunity": "How to differentiate",
      "productCount": ${scrapedData.totalProducts},
      "featuredBrands": ["brands they feature"]
    }
  },
  "actionableTakeaways": [
    {
      "insight": "Key finding from real data",
      "action": "What to do",
      "priority": "high|medium|low",
      "owner": "sales|purchasing|marketing"
    }
  ]
}`;

    try {
      const result = await proModel.generateContent(prompt);
      return parseAIResponse(result.response.text());
    } catch (error) {
      console.error('Competitor analysis error:', error);
      return { error: "Unable to analyze competitor data" };
    }
  }

  // Batch scrape all competitors
  async scrapeAllCompetitors(brands = null) {
    const results = {};
    
    for (const [key, competitor] of Object.entries(this.competitors)) {
      try {
        console.log(`Scraping ${competitor.name}...`);
        results[key] = await this.scrapeCompetitorSite(key, brands);
        console.log(`✅ Scraped ${competitor.name}: ${results[key].totalProducts} products`);
      } catch (error) {
        console.error(`❌ Failed to scrape ${competitor.name}:`, error);
        results[key] = { error: error.message };
      }
      
      // Be respectful with delays
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  // Save scraped data to Firestore
  async saveCompetitorData(data) {
    try {
      const batch = this.db.batch();
      
      for (const [competitorKey, competitorData] of Object.entries(data)) {
        const docRef = this.db.collection('competitor_analysis')
          .doc(competitorKey)
          .collection('snapshots')
          .doc(new Date().toISOString().split('T')[0]);
        
        batch.set(docRef, {
          ...competitorData,
          scraped_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      await batch.commit();
      console.log('✅ Competitor data saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving competitor data:', error);
      throw error;
    }
  }

  // Get historical competitor data
  async getHistoricalData(competitorKey, days = 30) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      
      const snapshot = await this.db.collection('competitor_analysis')
        .doc(competitorKey)
        .collection('snapshots')
        .where('scraped_at', '>=', cutoff)
        .orderBy('scraped_at', 'desc')
        .get();
      
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error getting historical data:', error);
      return [];
    }
  }
}

export default new CompetitorWebScraperService();