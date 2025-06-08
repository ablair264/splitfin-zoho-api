// server/src/routes/products.js
import express from 'express';
import { ProductSyncService } from '../services/productSync.js';
import { admin } from '../config/firebase.js'; // Your Firebase admin config

const router = express.Router();
const productSync = new ProductSyncService(admin.firestore());

/**
 * GET /api/products/sync
 * Syncs all products from CRM to Firebase
 */
router.get('/sync', async (req, res) => {
  try {
    const results = await productSync.syncAllProducts();
    res.json({
      success: true,
      message: 'Product sync completed',
      data: results
    });
  } catch (error) {
    console.error('Product sync failed:', error);
    res.status(500).json({
      success: false,
      message: 'Product sync failed',
      error: error.message
    });
  }
});

/**
 * GET /api/products/sync/:zohoId
 * Syncs a single product by Zoho ID
 */
router.get('/sync/:zohoId', async (req, res) => {
  try {
    const { zohoId } = req.params;
    const product = await productSync.syncSingleProduct(zohoId);
    
    res.json({
      success: true,
      message: 'Product synced successfully',
      data: product
    });
  } catch (error) {
    console.error(`Single product sync failed for ${req.params.zohoId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Product sync failed',
      error: error.message
    });
  }
});

/**
 * GET /api/products/brand/:brandName
 * Get products by brand (normalized search)
 */
router.get('/brand/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;
    const products = await productSync.getProductsByBrand(brandName);
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error(`Brand search failed for ${req.params.brandName}:`, error);
    res.status(500).json({
      success: false,
      message: 'Brand search failed',
      error: error.message
    });
  }
});

/**
 * GET /api/products/search?q=searchTerm
 * Search products by name, SKU, or brand
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const products = await productSync.searchProducts(q.trim());
    
    res.json({
      success: true,
      data: products,
      count: products.length,
      searchTerm: q.trim()
    });
  } catch (error) {
    console.error(`Product search failed for "${req.query.q}":`, error);
    res.status(500).json({
      success: false,
      message: 'Product search failed',
      error: error.message
    });
  }
});

/**
 * POST /api/products/migrate-brands
 * Migration endpoint to update brand normalization for existing products
 */
router.post('/migrate-brands', async (req, res) => {
  try {
    const results = await productSync.migrateBrandNormalization();
    
    res.json({
      success: true,
      message: 'Brand migration completed',
      data: results
    });
  } catch (error) {
    console.error('Brand migration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Brand migration failed',
      error: error.message
    });
  }
});

/**
 * GET /api/products/health
 * Quick health check for product service
 */
router.get('/health', async (req, res) => {
  try {
    // Quick count of products in Firebase
    const snapshot = await admin.firestore().collection('products').limit(1).get();
    
    res.json({
      success: true,
      message: 'Product service is healthy',
      hasProducts: !snapshot.empty,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Product service health check failed',
      error: error.message
    });
  }
});

export default router;