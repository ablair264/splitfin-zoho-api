import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const router = express.Router();

// Shopify app credentials from environment variables
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'df7b19db6ac2b418bd954389ab47c867';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '22456d13620254b26d8d9ff783d471df';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://splitfin.co.uk';

/**
 * Start OAuth flow
 * Frontend calls this to get the Shopify authorization URL
 */
router.post('/oauth/init', (req, res) => {
  try {
    const { shopDomain } = req.body;
    
    if (!shopDomain) {
      return res.status(400).json({ error: 'Shop domain is required' });
    }

    // Generate a random state for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store state in session or database (for now, we'll pass it through)
    // In production, you should store this server-side
    
    const redirectUri = `${process.env.API_URL || 'https://api.splitfin.co.uk'}/api/shopify/oauth/callback`;
    const scopes = 'read_products,write_products,read_inventory,write_inventory';
    
    const authUrl = `https://${shopDomain}/admin/oauth/authorize?` +
      `client_id=${SHOPIFY_CLIENT_ID}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    logger.info(`Shopify OAuth initiated for shop: ${shopDomain}`);
    
    res.json({ 
      authUrl,
      state 
    });
  } catch (error) {
    logger.error('Error initiating Shopify OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

/**
 * OAuth callback
 * Shopify redirects here after user approves the app
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { shop, code, state, error: shopifyError } = req.query;

    if (shopifyError) {
      logger.error('Shopify OAuth error:', shopifyError);
      return res.redirect(`${FRONTEND_URL}/shopify?error=${encodeURIComponent(shopifyError)}`);
    }

    if (!shop || !code) {
      return res.redirect(`${FRONTEND_URL}/shopify?error=missing_parameters`);
    }

    // Verify state parameter (in production, compare with stored state)
    // For now, we'll skip this check

    // Exchange authorization code for access token
    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    
    try {
      const tokenResponse = await axios.post(accessTokenUrl, {
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code: code
      });

      const { access_token } = tokenResponse.data;

      // Get shop information
      const shopInfoResponse = await axios.get(`https://${shop}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': access_token
        }
      });

      const shopInfo = shopInfoResponse.data.shop;

      // Here you would typically:
      // 1. Save the access_token and shop info to your database
      // 2. Create a session token for the frontend
      
      // For now, we'll pass the data to the frontend
      // In production, NEVER send access_token to frontend
      const successData = {
        shop: shop,
        access_token: access_token,
        shop_info: {
          name: shopInfo.name,
          email: shopInfo.email,
          owner: shopInfo.shop_owner
        }
      };

      // Redirect to frontend with success
      const encodedData = Buffer.from(JSON.stringify(successData)).toString('base64');
      res.redirect(`${FRONTEND_URL}/shopify/callback?data=${encodedData}`);

    } catch (error) {
      logger.error('Error exchanging code for token:', error);
      res.redirect(`${FRONTEND_URL}/shopify?error=token_exchange_failed`);
    }
  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/shopify?error=callback_failed`);
  }
});

/**
 * Save store connection (called by frontend after successful OAuth)
 */
router.post('/connect', async (req, res) => {
  try {
    const { companyId, shopDomain, accessToken, shopInfo } = req.body;

    // Here you would save to database
    // For now, we'll just return success
    
    logger.info(`Shopify store connected: ${shopDomain} for company ${companyId}`);
    
    res.json({
      success: true,
      store: {
        id: crypto.randomUUID(),
        company_id: companyId,
        shop_domain: shopDomain,
        shop_name: shopInfo.name,
        shop_email: shopInfo.email,
        shop_owner: shopInfo.owner,
        is_active: true,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error saving store connection:', error);
    res.status(500).json({ error: 'Failed to save store connection' });
  }
});

/**
 * Create a product in Shopify
 */
router.post('/products/create', async (req, res) => {
  try {
    const { shopDomain, accessToken, product } = req.body;

    const shopifyProduct = {
      product: {
        title: product.name,
        body_html: product.description || '',
        vendor: product.brand_name,
        product_type: product.category || '',
        status: product.status === 'active' ? 'active' : 'draft',
        variants: [{
          title: 'Default Title',
          price: (product.retail_price || 0).toFixed(2),
          sku: product.sku,
          inventory_quantity: 0,
          inventory_management: 'shopify'
        }]
      }
    };

    if (product.image_url) {
      shopifyProduct.product.images = [{
        src: product.image_url,
        alt: product.name
      }];
    }

    const response = await axios.post(
      `https://${shopDomain}/admin/api/2024-01/products.json`,
      shopifyProduct,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      shopify_product_id: response.data.product.id,
      product: response.data.product
    });
  } catch (error) {
    logger.error('Error creating Shopify product:', error.response?.data || error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error.response?.data?.errors || error.message
    });
  }
});

export { router as shopifyRouter };