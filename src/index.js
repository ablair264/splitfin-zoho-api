// server/src/index.js - Complete setup with both Firebase services
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { syncInventory, syncCustomersFromCRM, syncInventoryCustomerIds } from './syncInventory.js';
import { getInventoryContactIdByEmail, createSalesOrder } from './api/zoho.js';
import webhookRoutes from './routes/webhooks.js';
import syncRoutes from './routes/sync.js';
import firebaseOrderListener from './firebaseOrderListener.js';
import firestoreSyncService from './firestoreSyncService.js';

// ── ESM __dirname hack ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Load .env ───────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
    version: '2.0.0',
    features: [
      'OAuth', 
      'Inventory Sync', 
      'Sales Orders', 
      'Webhooks', 
      'Firebase Order Listener',
      'Real-time Firestore Sync',
      'Client Sync API'
    ],
    endpoints: {
      health: '/health',
      webhooks: '/api/*',
      sync: '/api/sync/*',
      oauth: '/oauth/url'
    }
  });
});

// ── Mount routes ────────────────────────────────────────────────────
app.use('/api', webhookRoutes);
app.use('/api/sync', syncRoutes);

// ── Enhanced Health check endpoint ──────────────────────────────────
app.get('/health', (req, res) => {
  const orderListenerStatus = firebaseOrderListener.getStatus();
  const syncServiceStatus = firestoreSyncService.getStatus();
  
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Splitfin Zoho Integration API',
    version: '2.0.0',
    features: ['OAuth', 'Inventory Sync', 'Sales Orders', 'Webhooks', 'Firebase Listeners', 'Sync Services'],
    services: {
      firebaseOrderListener: orderListenerStatus,
      firestoreSyncService: syncServiceStatus
    }
  });
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
    timestamp: new Date().toISOString()
  });
});

app.post('/api/listener/start', (req, res) => {
  try {
    firebaseOrderListener.startListening();
    firestoreSyncService.startAllListeners();
    
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
    fs.writeFileSync(envPath,
`ZOHO_CLIENT_ID=${ZOHO_CLIENT_ID}
ZOHO_CLIENT_SECRET=${ZOHO_CLIENT_SECRET}
ZOHO_REDIRECT_URI=${ZOHO_REDIRECT_URI}
ZOHO_ORG_ID=${ZOHO_ORG_ID}
ZOHO_REFRESH_TOKEN=${data.refresh_token}
PORT=${PORT}
`, 'utf8');
    return res.send(`
      <h1>Connected to Zoho!</h1>
      <p>Token expires in ${data.expires_in}s</p>
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

// ── Existing API endpoints ──────────────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    const snap = await db.collection('products').get();
    const products = snap.docs.map(d => d.data());
    res.json({ items: products });
  } catch (err) {
    console.error('Firestore /api/items failed:', err);
    res.status(500).send('Items fetch failed');
  }
});

app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const token = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/inventory/v1/purchaseorders?status=${status}&organization_id=${ZOHO_ORG_ID}`,
      { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err.response?.data || err);
    res.status(500).send('Purchase Orders fetch failed');
  }
});

app.post('/api/sync-inventory', async (req, res) => {
  console.log('👤 Manual inventory sync requested');
  try {
    await syncInventory();
    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ Manual sync failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/zoho/salesorder', async (req, res) => {
  try {
    const result = await createSalesOrder(req.body);
    res.status(200).json({ success: true, zohoSalesOrder: result });
  } catch (err) {
    console.error('❌ Error in /api/zoho/salesorder:', err);
    res.status(500).json({ error: err.message || 'Zoho Sales Order failed' });
  }
});
 
app.post('/api/sync-customers', async (req, res) => {
  try {
	await syncCustomersFromCRM();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync-inventory-contact', async (req, res) => {
  const { email, docId } = req.body;
  try {
    const inventoryId = await getInventoryContactIdByEmail(email);
    if (!inventoryId) {
      return res.status(404).json({ success: false, error: 'Inventory contact not found' });
    }

    await db.collection('customers').doc(docId).update({
      zohoInventoryId: inventoryId
    });

    res.json({ success: true, inventoryId });
  } catch (err) {
    console.error('❌ Error in sync-inventory-contact:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Legacy webhook endpoint (kept for backward compatibility)
app.post('/api/create-order', async (req, res) => {
  const { firebaseUID, customer_id, line_items } = req.body;

  if (!firebaseUID || !customer_id || !Array.isArray(line_items)) {
    return res.status(400).json({ error: 'Missing or invalid payload' });
  }

  try {
    const userSnap = await admin.firestore().collection('users').doc(firebaseUID).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'SalesAgent not found in Firestore' });
    }

    const agentData = userSnap.data();
    const agentZohoID = agentData.zohospID;

    if (!agentZohoID) {
      return res.status(400).json({ error: 'SalesAgent missing Zoho CRM ID' });
    }

    const salesOrder = await createSalesOrder({
      zohoCustID: customer_id,
      items: line_items,
      agentZohoCRMId: agentZohoID,
    });

    await admin.firestore().collection('submittedOrders').add({
      firebaseUID,
      customer_id,
      line_items,
      agentZohoID,
      zohoResponse: salesOrder,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, zohoSalesOrder: salesOrder });
  } catch (err) {
    console.error('❌ Error in /api/create-order:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
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
  console.log(`🚀 Splitfin Zoho Integration API v2.0.0 running on port ${PORT}`);
  console.log(`📍 Root endpoint: http://localhost:${PORT}/`);
  console.log(`📍 Webhook endpoint: http://localhost:${PORT}/api/create-order`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Sync API: http://localhost:${PORT}/api/sync/*`);
  console.log(`🧪 Test webhook: http://localhost:${PORT}/api/test`);
  console.log(`🔐 OAuth URL: http://localhost:${PORT}/oauth/url`);
  console.log(`📦 Items endpoint: http://localhost:${PORT}/api/items`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🎯 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  
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