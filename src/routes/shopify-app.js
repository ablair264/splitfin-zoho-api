import express from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const router = express.Router();

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'df7b19db6ac2b418bd954389ab47c867';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || '22456d13620254b26d8d9ff783d471df';

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
router.get('/', async (req, res) => {
  const { shop, hmac } = req.query;

  // Verify the request is from Shopify
  if (!verifyShopifyRequest(req)) {
    return res.status(401).send('Unauthorized');
  }

  // Simple confirmation page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Splitfin - Connected</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f4f6f8;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 8px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          margin: 0 auto 24px;
        }
        h1 {
          color: #1a1a1a;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .status {
          background: #f0fdf4;
          color: #166534;
          padding: 12px 20px;
          border-radius: 6px;
          margin-bottom: 32px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .button {
          background: #5850ec;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          display: inline-block;
          font-weight: 500;
          transition: background 0.2s;
        }
        .button:hover {
          background: #4338ca;
        }
        .secondary-link {
          color: #5850ec;
          text-decoration: none;
          font-size: 14px;
          margin-top: 16px;
          display: inline-block;
        }
        .secondary-link:hover {
          text-decoration: underline;
        }
        .info {
          background: #f9fafb;
          border-radius: 6px;
          padding: 16px;
          margin: 24px 0;
          font-size: 14px;
          color: #4b5563;
          text-align: left;
        }
        .info strong {
          color: #1f2937;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo"></div>
        
        <h1>Splitfin App Installed!</h1>
        
        <p>Your Shopify store <strong>${shop}</strong> is ready to connect with Splitfin.</p>
        
        <div class="status">
          ✓ App installed successfully
        </div>
        
        <div class="info">
          <strong>Next steps:</strong><br>
          1. Go to Splitfin and log in to your account<br>
          2. Navigate to Extensions → Shopify Integration<br>
          3. Click "Connect Store" and enter your shop domain<br>
          4. Start syncing your products!
        </div>
        
        <a href="https://splitfin.co.uk/extensions" class="button" target="_blank">
          Go to Splitfin →
        </a>
        
        <br>
        
        <a href="https://help.splitfin.co.uk/shopify" class="secondary-link" target="_blank">
          View setup guide
        </a>
      </div>
    </body>
    </html>
  `;

  res.send(html);
});

export { router as shopifyAppRouter };