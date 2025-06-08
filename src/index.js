// server/src/index.js - Complete setup with CRM-first optimizations
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { 
  syncInventory, 
  syncCustomersFromCRM, 
  syncInventoryCustomerIds,
  smartSync,
  getSyncStatus,
  performInitialSync
} from './syncInventory.js';
import { getInventoryContactIdByEmail, createSalesOrder } from './api/zoho.js';
import webhookRoutes from './routes/webhooks.js';
import syncRoutes from './routes/sync.js';
import firebaseOrderListener from './firebaseOrderListener.js';
import firestoreSyncService from './firestoreSyncService.js';
import reportsRoutes from './routes/reports.js';

// ── ESM __dirname hack ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Load .env ───────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Environment Configuration ───────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ENABLE_AUTO_SYNC = process.env.ENABLE_AUTO_SYNC !== 'false';
const SYNC_INTERVAL = parseInt(process.env.SYNC_INTERVAL_MINUTES || '30') * 60 * 1000;

// ── Firebase init (only once) ───────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// ── Express setup ───────────────────────────────────────────────────
const app = express();
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REDIRECT_URI,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  PORT = 3001
} = process.env;

// Enhanced CORS configuration
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

// ── Enhanced Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ── Root route ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'Splitfin Zoho Integration API',
    status: 'running',
    version: '2.3.0', // Updated version
    environment: IS_PRODUCTION ? 'production' : 'development',
    features: [
      'OAuth', 
      'CRM-first Product Sync', // Updated
      'Sales Orders', 
      'Webhooks', 
      'Firebase Order Listener',
      'Real-time Firestore Sync',
      'Client Sync API',
      'Reports & Analytics',
      'Incremental Sync'
    ],
    dataStrategy: 'CRM-first with Inventory fallback', // NEW
    config: {
      autoSync: ENABLE_AUTO_SYNC,
      syncInterval: `${process.env.SYNC_INTERVAL_MINUTES || 30} minutes`
    },
    endpoints: {
      health: '/health',
      webhooks: '/api/*',
      sync: '/api/sync/*',
      reports: '/api/reports/*',
      oauth: '/oauth/url',
      initialSync: '/api/initial-sync'
    }
  });
});

// ── Mount routes ────────────────────────────────────────────────────
app.use('/api', webhookRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportsRoutes);

// ── Enhanced Health check endpoint ──────────────────────────────────
app.get('/health', async (req, res) => {
  const orderListenerStatus = firebaseOrderListener.getStatus();
  const syncServiceStatus = firestoreSyncService.getStatus();
  const syncStatus = await getSyncStatus();
  
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Splitfin Zoho Integration API',
    version: '2.3.0', // Updated version
    environment: IS_PRODUCTION ? 'production' : 'development',
    features: ['OAuth', 'CRM-first Product Sync', 'Sales Orders', 'Webhooks', 'Firebase Listeners', 'Sync Services'], // Updated
    dataStrategy: 'CRM-first with Inventory fallback', // NEW
    services: {
      firebaseOrderListener: orderListenerStatus,
      firestoreSyncService: syncServiceStatus,
      syncMetadata: syncStatus
    }
  });
});

// ── Initial Sync Endpoint (Production) ──────────────────────────────
app.post('/api/initial-sync', async (req, res) => {
  try {
    const { secret } = req.body;
    
    // Add a secret to prevent accidental triggers
    if (IS_PRODUCTION && secret !== process.env.INITIAL_SYNC_SECRET) {
      return res.status(401).json({
        success: false,
        error: 'Invalid secret'
      });
    }
    
    console.log('🚀 Starting initial CRM-first sync...'); // Updated message
    
    const result = await performInitialSync();
    
    res.json({
      success: true,
      result,
      message: 'Initial CRM-first sync completed. You can now enable auto-sync.', // Updated message
      dataStrategy: 'Products synced from CRM, customers from CRM with Inventory mapping', // NEW
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Initial sync failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── Firebase Services Management ────────────────────────────────────
app.get('/api/listener/status', (req, res) => {
  const orderStatus = firebaseOrderListener.getStatus();
  const syncStatus = firestoreSyncService.getStatus();
  
  res.json({
    success: true,
    services: {
      orderListener: orderStatus,
      syncService: syncStatus
    },
    autoSyncEnabled: ENABLE_AUTO_SYNC,
    environment: IS_PRODUCTION ? 'production' : 'development',
    dataStrategy: 'CRM-first with Inventory fallback', // NEW
    timestamp: new Date().toISOString()
  });
});

app.post('/api/listener/start', async (req, res) => {
  try {
    // Check if initial sync has been done in production
    if (IS_PRODUCTION) {
      const syncStatus = await getSyncStatus();
      if (!syncStatus?.inventory?.initialSyncCompleted || !syncStatus?.customers?.initialSyncCompleted) {
        return res.status(400).json({
          success: false,
          error: 'Initial CRM-first sync must be completed before starting listeners. Run POST /api/initial-sync first.' // Updated message
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

// Manual order processing endpoint
app.post('/api/process-order/:orderId', async (req, res) => {
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
  if (!code) return res.status(400).send('No code received');
  try {
    const { data } = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      { params: {
          grant_type:    'authorization_code',
          client_id:     ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri:  ZOHO_REDIRECT_URI,
          code
        }
      }
    );
    if (data.error) {
      return res
        .status(400)
        .send(`Zoho OAuth error: ${data.error_description||data.error}`);
    }
    
    const envPath = path.resolve(__dirname, '../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const updatedEnv = envContent.replace(
      /ZOHO_REFRESH_TOKEN=.*/,
      `ZOHO_REFRESH_TOKEN=${data.refresh_token}`
    );
    fs.writeFileSync(envPath, updatedEnv, 'utf8');
    
    return res.send(`
      <h1>Connected to Zoho!</h1>
      <p>Token expires in ${data.expires_in}s</p>
      <p>Refresh token has been saved.</p>
    `);
  } catch (err) {
    console.error(err.response?.data||err);
    return res.status(500).send('Token exchange failed');
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
    const includeMetadata = req.query.metadata === 'true';
    
    const snap = await db.collection('products').get();
    const products = snap.docs.map(d => d.data());
    
    let response = { 
      items: products,
      dataStrategy: 'CRM-first with Inventory fallback' // NEW
    };
    
    if (includeMetadata) {
      const syncStatus = await getSyncStatus();
      response.syncMetadata = syncStatus;
      response.syncMetadata.dataSource = 'CRM'; // NEW
    }
    
    res.json(response);
  } catch (err) {
    console.error('Firestore /api/items failed:', err);
    res.status(500).send('Items fetch failed');
  }
});

// Batch sync endpoint for mobile apps
app.post('/api/sync-batch', async (req, res) => {
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
      dataStrategy: 'CRM-first with Inventory fallback', // NEW
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

// Schedule periodic cleanup (every 24 hours)
setInterval(() => {
  console.log('🧹 Running periodic sync cleanup...');
  firestoreSyncService.cleanupOldSyncChanges().catch(error => {
    console.error('❌ Periodic cleanup failed:', error);
  });
}, 24 * 60 * 60 * 1000);

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
  console.log(`🚀 Splitfin Zoho Integration API v2.3.0 running on port ${PORT}`); // Updated version
  console.log(`📍 Root endpoint: http://localhost:${PORT}/`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/create-order`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync API: http://localhost:${PORT}/api/sync/*`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/api/test`);
  console.log(`🔐 OAuth URL: http://localhost:${PORT}/oauth/url`);
  console.log(`📦 Items endpoint: http://localhost:${PORT}/api/items`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`📊 Data Strategy: CRM-first with Inventory fallback`); // NEW
  
  // Start both Firebase services
  console.log('🎧 Initializing Firebase services...');
  firebaseOrderListener.startListening();
  firestoreSyncService.startAllListeners();
  
  console.log('✅ All services started successfully');
});

// ── Graceful shutdown ───────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop all Firebase listeners
  firebaseOrderListener.stopListening();
  firestoreSyncService.stopAllListeners();
  
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  // Stop all Firebase listeners
  firebaseOrderListener.stopListening();
  firestoreSyncService.stopAllListeners();
  
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

export default app;