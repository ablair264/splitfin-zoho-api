import admin from 'firebase-admin';
import './config/firebase.js'; 
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import collectionDashboardService from './services/collectionDashboardService.js';
import { 
  syncInventory, 
  syncCustomersFromCRM, 
  syncInventoryCustomerIds,
  smartSync,
  getSyncStatus,
  performInitialSync
} from './syncInventory.js';
import { createSalesOrder } from './api/zoho.js';
import webhookRoutes from './routes/webhooks.js';
import syncRoutes from './routes/sync.js';
import firebaseOrderListener from './firebaseOrderListener.js';
import firestoreSyncService from './firestoreSyncService.js';
import reportsRoutes from './routes/reports.js';
import cronRoutes from './routes/cron.js';
import aiInsightsRoutes from './routes/ai_insights.js';
import productsRoutes from './routes/products.js'; // Add this import

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_AUTO_SYNC = process.env.ENABLE_AUTO_SYNC !== 'false';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL_MINUTES || '30') * 60 * 1000;

// NEW: CRON optimization mode
const CRON_MODE = process.env.CRON_MODE === 'true' || IS_PRODUCTION;

const app = express();
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REDIRECT_URI,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  PORT = 3001
} = process.env;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://splitfin.co.uk',
  'https://splitfin-zoho-api.onrender.com'
];

app.use(cors({
  origin: (incomingOrigin, callback) => {
    if (!incomingOrigin || ALLOWED_ORIGINS.includes(incomingOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${incomingOrigin}`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ── Routes setup (order matters) ────────────────────────────────────
app.use('/api/cron', cronRoutes);  // CRON routes first for priority
app.use('/api', webhookRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportsRoutes);
// ADD THIS: Mount the AI insights routes
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/products', productsRoutes);       // Add products routes

// ── Root endpoint ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'Splitfin Zoho Integration API',
    status: 'running',
    version: '2.6.0',  // Updated version for products and AI fixes
    environment: IS_PRODUCTION ? 'production' : 'development',
    mode: CRON_MODE ? 'cron-optimized' : 'real-time',
    features: [
      'OAuth', 
      'CRM-first Product Sync',
      'Sales Orders', 
      'Webhooks', 
      'CRON Data Sync',
      'Cached Dashboard',
      'Reports & Analytics',
      'Incremental Sync',
      'AI-Powered Insights',
      'Product Management'  // NEW: Added products feature
    ],
    dataStrategy: 'CRON-cached with live fallback',
    config: {
      cronMode: CRON_MODE,
      autoSync: ENABLE_AUTO_SYNC,
      syncInterval: `${process.env.SYNC_INTERVAL_MINUTES || 30} minutes`,
      aiInsights: 'enabled',
      productManagement: 'enabled'  // NEW
    },
    endpoints: {
      health: '/health',
      webhooks: '/api/*',
      sync: '/api/sync/*',
      reports: '/api/reports/*',
      cron: '/api/cron/*',
      aiInsights: '/api/ai-insights/*',
      products: '/api/products/*',  // NEW: Products endpoint
      oauth: '/oauth/url',
      initialSync: '/api/initial-sync'
    }
  });
});

// Add a specific debug endpoint for AI routes
app.get('/api/ai-insights/test', (req, res) => {
  res.json({
    success: true,
    message: 'AI Insights routes are working',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/ai-insights/card-insights',
      'POST /api/ai-insights/dashboard-insights',
      'POST /api/ai-insights/drill-down-insights',
      'GET /api/ai-insights/health'
    ]
  });
});

// Add a specific debug endpoint for products routes
app.get('/api/products/test', (req, res) => {
  res.json({
    success: true,
    message: 'Products routes are working',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/products/sync',
      'GET /api/products/brand/:brandName',
      'GET /api/products/search',
      'GET /api/products/health'
    ]
  });
});

// ── Legacy sync endpoints (kept for compatibility) ──────────────────
app.post('/api/sync', async (req, res) => {
  try {
    console.log('🔄 Triggering syncInventory from POST /api/sync');
    const result = await syncInventory();
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error in /api/sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync-customers', async (req, res) => {
  try {
    console.log('🔄 Triggering syncCustomersFromCRM from POST /api/sync-customers');
    const result = await syncCustomersFromCRM();
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error in /api/sync-customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Enhanced Health check endpoint ──────────────────────────────────
app.get('/health', async (req, res) => {
  // Only check services that are actually running
  const healthData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Splitfin Zoho Integration API',
    version: '2.5.0',  // Updated version
    environment: IS_PRODUCTION ? 'production' : 'development',
    mode: CRON_MODE ? 'cron-optimized' : 'real-time',
    features: [
      'OAuth', 
      'CRM-first Product Sync', 
      'Sales Orders', 
      'Webhooks', 
      'CRON Jobs',
      'AI-Powered Insights'  // NEW: Added AI insights to health check
    ],
    dataStrategy: 'CRON-cached with live fallback',
  };

  // Only include Firebase service status if not in CRON mode
  if (!CRON_MODE) {
    const orderListenerStatus = firebaseOrderListener.getStatus();
    const syncServiceStatus = firestoreSyncService.getStatus();
    const syncStatus = await getSyncStatus();
    
    healthData.services = {
      firebaseOrderListener: orderListenerStatus,
      firestoreSyncService: syncServiceStatus,
      syncMetadata: syncStatus,
      aiInsights: 'enabled'  // NEW: AI insights service status
    };
  } else {
    healthData.services = {
      cronJobs: 'external',
      aiInsights: 'enabled',  // NEW: AI insights work in both modes
      message: 'Firebase listeners disabled in CRON mode for performance'
    };
  }
  
  res.status(200).json(healthData);
});

// ── Firebase Services Management (conditional) ──────────────────────
app.get('/api/listener/status', (req, res) => {
  if (CRON_MODE) {
    return res.json({
      success: true,
      mode: 'cron-optimized',
      message: 'Firebase listeners disabled in CRON mode',
      cronJobs: 'handling data sync',
      autoSyncEnabled: false,
      environment: IS_PRODUCTION ? 'production' : 'development',
      dataStrategy: 'CRON-cached with live fallback',
      aiInsights: 'enabled',  // NEW: AI insights available in both modes
      timestamp: new Date().toISOString()
    });
  }

  const orderStatus = firebaseOrderListener.getStatus();
  const syncStatus = firestoreSyncService.getStatus();
  
  res.json({
    success: true,
    services: {
      orderListener: orderStatus,
      syncService: syncStatus,
      aiInsights: 'enabled'  // NEW: AI insights status
    },
    autoSyncEnabled: ENABLE_AUTO_SYNC,
    environment: IS_PRODUCTION ? 'production' : 'development',
    dataStrategy: 'Real-time with Firebase listeners',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/listener/start', async (req, res) => {
  if (CRON_MODE) {
    return res.status(400).json({
      success: false,
      error: 'Firebase listeners are disabled in CRON mode. Use CRON jobs for data sync.',
      mode: 'cron-optimized'
    });
  }

  try {
    // Check if initial sync has been done in production
    if (IS_PRODUCTION) {
      const syncStatus = await getSyncStatus();
      if (!syncStatus?.inventory?.initialSyncCompleted || !syncStatus?.customers?.initialSyncCompleted) {
        return res.status(400).json({
          success: false,
          error: 'Initial CRM-first sync must be completed before starting listeners. Run POST /api/initial-sync first.'
        });
      }
    }
    
    firebaseOrderListener.startListening();
    await firestoreSyncService.startAllListeners();
    
    res.json({
      success: true,
      message: 'All Firebase listeners started',
      status: {
        orderListener: firebaseOrderListener.getStatus(),
        syncService: firestoreSyncService.getStatus()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/listener/stop', (req, res) => {
  try {
    firebaseOrderListener.stopListening();
    firestoreSyncService.stopAllListeners();
    
    res.json({
      success: true,
      message: 'All Firebase listeners stopped',
      status: {
        orderListener: firebaseOrderListener.getStatus(),
        syncService: firestoreSyncService.getStatus()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual order processing endpoint (conditional)
app.post('/api/process-order/:orderId', async (req, res) => {
  if (CRON_MODE) {
    return res.status(400).json({
      success: false,
      error: 'Manual order processing disabled in CRON mode',
      suggestion: 'Orders are processed via CRON jobs'
    });
  }

  try {
    const { orderId } = req.params;
    const result = await firebaseOrderListener.processOrderById(orderId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── OAuth endpoints ──────────────────────────────────────────────────
app.get('/oauth/url', (req, res) => {
  const AUTH_BASE = 'https://accounts.zoho.eu/oauth/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ZOHO_CLIENT_ID,
    redirect_uri:  ZOHO_REDIRECT_URI,
    scope:         'ZohoInventory.fullaccess.all,ZohoCRM.modules.ALL',
    access_type:   'offline',
    prompt:        'consent'
  });
  res.redirect(`${AUTH_BASE}?${params}`);
});

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code received from Zoho.');
  }

  try {
    // This part remains the same: exchange the code for tokens.
    const { data } = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri: ZOHO_REDIRECT_URI,
          code
        }
      }
    );

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    // --- THIS IS THE MODIFIED PART ---
    // Instead of writing to a file, we will display the new refresh token.
    const newRefreshToken = data.refresh_token;

    // Send a success page with clear instructions and the new token.
    return res.status(200).send(`
      <div style="font-family: sans-serif; padding: 2em;">
        <h1>✅ Success! New Refresh Token Generated</h1>
        <p>Your new Refresh Token has been generated successfully. Please copy the token below and save it in your Render Environment Group.</p>
        <hr>
        <h3>Your New Refresh Token:</h3>
        <pre style="background-color: #f4f4f4; padding: 1em; border-radius: 5px; word-wrap: break-word;"><code>${newRefreshToken}</code></pre>
        <hr>
        <h4>Next Steps:</h4>
        <ol>
          <li>Copy the token above.</li>
          <li>Go to your Environment Group on Render.com.</li>
          <li>Update the value for the <strong>ZOHO_REFRESH_TOKEN</strong> variable by pasting in this new token.</li>
          <li>Save the changes and restart your services.</li>
        </ol>
      </div>
    `);

  } catch (err) {
    console.error('❌ Token exchange failed:', err.response?.data || err.message);
    return res.status(500).send('Token exchange failed. Check server logs for details.');
  }
});

// ── Zoho token management ─────────────────────────────────────────────
let cachedToken  = null;
let cachedExpiry = 0;
let refreshInFly = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) {
    return cachedToken;
  }
  if (refreshInFly) {
    return await refreshInFly;
  }
  refreshInFly = (async () => {
    const { data } = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      { params: {
          grant_type:    'refresh_token',
          client_id:     ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          refresh_token: ZOHO_REFRESH_TOKEN
        }
      }
    );
    if (data.error) throw new Error(data.error_description || data.error);
    cachedToken  = data.access_token;
    cachedExpiry = now + data.expires_in * 1000 - 60*1000;
    refreshInFly = null;
    return cachedToken;
  })();
  return await refreshInFly;
}

// ── API endpoints ───────────────────────────────────────────────────

// Items endpoint with sync status metadata (enhanced with CRM info)
app.get('/api/items', async (req, res) => {
  try {
    const db = admin.firestore(); // Now properly using the imported admin

    const includeMetadata = req.query.metadata === 'true';
    
    const snap = await db.collection('products').get();
    const products = snap.docs.map(d => d.data());
    
    let response = { 
      items: products,
      dataStrategy: CRON_MODE ? 'CRON-cached with live fallback' : 'CRM-first with Inventory fallback'
    };
    
    if (includeMetadata) {
      const syncStatus = await getSyncStatus();
      response.syncMetadata = syncStatus;
      response.syncMetadata.dataSource = 'CRM';
      response.syncMetadata.mode = CRON_MODE ? 'cron-optimized' : 'real-time';
    }
    
    res.json(response);
  } catch (err) {
    console.error('Firestore /api/items failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Batch sync endpoint for mobile apps (conditional)
app.post('/api/sync-batch', async (req, res) => {
  if (CRON_MODE) {
    return res.status(400).json({
      success: false,
      error: 'Batch sync disabled in CRON mode',
      message: 'Data is synced via scheduled CRON jobs',
      suggestion: 'Use the cached dashboard API instead'
    });
  }

  try {
    const { lastSyncTime, collections } = req.body;
    
    // Get changes since last sync time
    const changes = await firestoreSyncService.getPendingSyncChanges(null, lastSyncTime);
    
    // Filter by requested collections if specified
    const filteredChanges = collections 
      ? changes.filter(change => collections.includes(change.collection))
      : changes;
    
    // Check if we need to trigger a sync
    const shouldSync = !lastSyncTime || (Date.now() - lastSyncTime) > (5 * 60 * 1000);
    
    if (shouldSync) {
      // Trigger background sync without waiting
      smartSync().catch(error => {
        console.error('❌ Background sync failed:', error);
      });
    }
    
    res.json({
      success: true,
      changes: filteredChanges,
      syncTriggered: shouldSync,
      dataStrategy: 'Real-time with Firebase',
      timestamp: Date.now()
    });
    
  } catch (err) {
    console.error('❌ Batch sync failed:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ── Maintenance endpoints ───────────────────────────────────────────
app.post('/api/maintenance/cleanup-sync', async (req, res) => {
  try {
    await firestoreSyncService.cleanupOldSyncChanges();
    res.json({
      success: true,
      message: 'Sync cleanup completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schedule periodic cleanup (every 24 hours) - only if not in CRON mode
if (!CRON_MODE) {
  setInterval(() => {
    console.log('🧹 Running periodic sync cleanup...');
    firestoreSyncService.cleanupOldSyncChanges().catch(error => {
      console.error('❌ Periodic cleanup failed:', error);
    });
  }, 24 * 60 * 60 * 1000);
}

// ── Global error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ── Start server ────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Splitfin Zoho Integration API v2.5.0 running on port ${PORT}`);
  console.log(`📍 Root endpoint: http://localhost:${PORT}/`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/create-order`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync API: http://localhost:${PORT}/api/sync/*`);
  console.log(`📊 Reports API: http://localhost:${PORT}/api/reports/*`);
  console.log(`⏰ CRON API: http://localhost:${PORT}/api/cron/*`);
  console.log(`🤖 AI Insights API: http://localhost:${PORT}/api/ai-insights/*`);  // NEW: AI insights endpoint logging
  console.log(`🧪 Test webhook: http://localhost:${PORT}/api/test`);
  console.log(`🔐 OAuth URL: http://localhost:${PORT}/oauth/url`);
  console.log(`📦 Items endpoint: http://localhost:${PORT}/api/items`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🎛️ Mode: ${CRON_MODE ? 'CRON-optimized' : 'Real-time'}`);
  console.log(`📊 Data Strategy: ${CRON_MODE ? 'CRON-cached with live fallback' : 'CRM-first with Inventory fallback'}`);
  console.log(`🤖 AI Insights: Enabled with rate limiting`);  // NEW: AI insights status logging
  
  // Conditional Firebase services startup
  if (CRON_MODE) {
    console.log('⚡ CRON mode enabled - Firebase listeners disabled for performance');
    console.log('📅 Data sync handled by external CRON jobs');
    console.log('🚀 Fast dashboard loading enabled');
  } else {
    console.log('🎧 Initializing Firebase services...');
    firebaseOrderListener.startListening();
    firestoreSyncService.startAllListeners();
    console.log('✅ Real-time Firebase services started');
  }
  
  console.log('✅ Server startup completed');
});

// ── Graceful shutdown ───────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Only stop Firebase listeners if they're running
  if (!CRON_MODE) {
    firebaseOrderListener.stopListening();
    firestoreSyncService.stopAllListeners();
  }
  
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  // Only stop Firebase listeners if they're running
  if (!CRON_MODE) {
    firebaseOrderListener.stopListening();
    firestoreSyncService.stopAllListeners();
  }
  
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

export default app;