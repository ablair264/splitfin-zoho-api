import express from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const router = express.Router();

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'c181af0af68ba3078881698ff0f83747';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '6710cc767d094aab06ee72aa10689154';

/**
 * Verify Shopify webhook/request signature
 */
const verifyShopifyRequest = (req) => {
  const { shop, timestamp, hmac } = req.query;
  
  // Create the query string without hmac
  const queryString = Object.keys(req.query)
    .filter(key => key !== 'hmac' && key !== 'signature')
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join('&');

  const hash = crypto
    .createHmac('sha256', SHOPIFY_CLIENT_SECRET)
    .update(queryString)
    .digest('hex');

  return hash === hmac;
};

/**
 * Main app entry point - This is what Shopify loads in the admin
 */
router.get('/', (req, res) => {
  const { shop, hmac } = req.query;

  // Verify the request is from Shopify
  if (!verifyShopifyRequest(req)) {
    return res.status(401).send('Unauthorized');
  }

  // For embedded apps, we need to render a page that:
  // 1. Loads Shopify App Bridge
  // 2. Authenticates with our backend
  // 3. Shows the app UI

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Splitfin for Shopify</title>
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge/3/app-bridge.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f6f6f7;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: white;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .header h1 {
          color: #202223;
          font-size: 24px;
          margin-bottom: 8px;
        }
        .header p {
          color: #6d7175;
          font-size: 16px;
        }
        .card {
          background: white;
          border-radius: 8px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .card h2 {
          color: #202223;
          font-size: 20px;
          margin-bottom: 16px;
        }
        .button {
          background: #008060;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .button:hover {
          background: #006e52;
        }
        .button-secondary {
          background: #f6f6f7;
          color: #202223;
        }
        .button-secondary:hover {
          background: #e4e5e7;
        }
        .status {
          padding: 16px;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .status.success {
          background: #e3f3e9;
          color: #004c3f;
        }
        .status.error {
          background: #fbeae5;
          color: #d72c0d;
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .product-card {
          background: #f6f6f7;
          border-radius: 8px;
          padding: 16px;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #6d7175;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Splitfin Product Sync</h1>
          <p>Sync your Splitfin catalog with your Shopify store</p>
        </div>

        <div class="card">
          <h2>Connection Status</h2>
          <div id="connectionStatus" class="loading">Checking connection...</div>
        </div>

        <div class="card" id="syncSection" style="display: none;">
          <h2>Product Sync</h2>
          <p style="margin-bottom: 16px;">Sync your Splitfin products to this Shopify store.</p>
          <button class="button" onclick="startSync()">Sync Products</button>
          <button class="button button-secondary" onclick="viewProducts()" style="margin-left: 10px;">View Synced Products</button>
          
          <div id="syncStatus"></div>
        </div>

        <div class="card" id="productsSection" style="display: none;">
          <h2>Recent Products</h2>
          <div id="productsList" class="products-grid"></div>
        </div>
      </div>

      <script>
        // Initialize Shopify App Bridge
        const AppBridge = window['app-bridge'];
        const createApp = AppBridge.default;
        const app = createApp({
          apiKey: '${SHOPIFY_CLIENT_ID}',
        });

        // Shop domain from URL
        const shop = '${shop}';
        
        // Check connection status
        async function checkConnection() {
          try {
            const response = await fetch('/api/shopify-app/status?shop=' + shop);
            const data = await response.json();
            
            const statusDiv = document.getElementById('connectionStatus');
            if (data.connected) {
              statusDiv.className = 'status success';
              statusDiv.innerHTML = '✓ Connected to Splitfin';
              document.getElementById('syncSection').style.display = 'block';
              loadRecentProducts();
            } else {
              statusDiv.className = 'status error';
              statusDiv.innerHTML = '✗ Not connected. <a href="/api/shopify-app/connect?shop=' + shop + '">Connect to Splitfin</a>';
            }
          } catch (error) {
            console.error('Error checking connection:', error);
          }
        }

        // Start product sync
        async function startSync() {
          const statusDiv = document.getElementById('syncStatus');
          statusDiv.className = 'status';
          statusDiv.innerHTML = 'Syncing products...';
          
          try {
            const response = await fetch('/api/shopify-app/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop })
            });
            
            const data = await response.json();
            if (data.success) {
              statusDiv.className = 'status success';
              statusDiv.innerHTML = '✓ Synced ' + data.count + ' products successfully';
              loadRecentProducts();
            } else {
              statusDiv.className = 'status error';
              statusDiv.innerHTML = '✗ Sync failed: ' + data.error;
            }
          } catch (error) {
            statusDiv.className = 'status error';
            statusDiv.innerHTML = '✗ Sync failed: ' + error.message;
          }
        }

        // Load recent products
        async function loadRecentProducts() {
          try {
            const response = await fetch('/api/shopify-app/products?shop=' + shop);
            const products = await response.json();
            
            const productsSection = document.getElementById('productsSection');
            const productsList = document.getElementById('productsList');
            
            if (products.length > 0) {
              productsSection.style.display = 'block';
              productsList.innerHTML = products.slice(0, 6).map(product => \`
                <div class="product-card">
                  <strong>\${product.name}</strong>
                  <p style="color: #6d7175; font-size: 14px;">\${product.sku}</p>
                  <p style="color: #6d7175; font-size: 14px;">\${product.brand_name}</p>
                </div>
              \`).join('');
            }
          } catch (error) {
            console.error('Error loading products:', error);
          }
        }

        // View products in Shopify admin
        function viewProducts() {
          // Use App Bridge to navigate to products page
          const redirect = AppBridge.actions.Redirect.create(app);
          redirect.dispatch(AppBridge.actions.Redirect.Action.ADMIN_PATH, {
            path: '/products',
            newContext: true
          });
        }

        // Initialize
        checkConnection();
      </script>
    </body>
    </html>
  `;

  res.send(html);
});

/**
 * Check connection status
 */
router.get('/status', async (req, res) => {
  const { shop } = req.query;
  
  // TODO: Check if this shop is connected to a Splitfin account
  // For now, return mock data
  res.json({
    connected: false,
    shop: shop
  });
});

/**
 * Connect shop to Splitfin account
 */
router.get('/connect', (req, res) => {
  const { shop } = req.query;
  
  // Redirect to Splitfin OAuth flow
  // This would typically involve:
  // 1. Store shop domain in session
  // 2. Redirect to Splitfin login
  // 3. After Splitfin auth, link the accounts
  
  res.redirect(`https://splitfin.co.uk/shopify/link?shop=${shop}`);
});

/**
 * Sync products endpoint
 */
router.post('/sync', async (req, res) => {
  const { shop } = req.body;
  
  try {
    // TODO: Implement actual sync logic
    // 1. Get Splitfin products
    // 2. Transform to Shopify format
    // 3. Create/update in Shopify
    
    res.json({
      success: true,
      count: 0,
      message: 'Sync functionality coming soon'
    });
  } catch (error) {
    logger.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get recent synced products
 */
router.get('/products', async (req, res) => {
  const { shop } = req.query;
  
  // TODO: Get actual synced products from database
  res.json([]);
});

export { router as shopifyAppRouter };