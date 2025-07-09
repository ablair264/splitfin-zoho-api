// server/src/index.js - Cleaned and organized version
import admin from 'firebase-admin';
import './config/firebase.js'; // Your existing firebase config
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron'; // Import node-cron

// Import your existing services and routes
import { createZohoSalesOrder } from './services/salesOrder.js';
import { syncCustomerWithZoho, syncAllCustomers } from './services/customerSync.js';
import { createZohoContact } from './services/createContact.js';
import { updateZohoContact } from './services/updateContact.js';
import { getSyncStatus } from './syncInventory.js';

// Import the new dashboard aggregator service
import DashboardAggregator from './services/dashboardAggregator.js';

// Import routes
import webhookRoutes from './routes/webhooks.js';
import syncRoutes from './routes/sync.js';
import reportsRoutes from './routes/reports.js';
import cronRoutes from './routes/cron.js';
import aiInsightsRoutes from './routes/ai_insights.js';
import productsRoutes from './routes/products.js';
import authRoutes from './routes/auth.js';
import purchaseAnalysisRoutes from './routes/purchaseAnalysis.js';
import searchTrendsRoutes from './routes/searchTrends.js';
import emailRoutes from './routes/email.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration ───────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const API_VERSION = '3.1.0'; // Version bump for new feature

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://splitfin.co.uk',
  'https://splitfin-zoho-api.onrender.com'
];

// ── Express Setup ───────────────────────────────────────────────────
const app = express();

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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────
app.use('/api/cron', cronRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/products', productsRoutes);
app.use('/oauth', authRoutes);
app.use('/api/purchase-analysis', purchaseAnalysisRoutes);
app.use('/api/search-trends', searchTrendsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);

app.put('/api/zoho/update-contact', updateZohoContact);
app.post('/api/zoho/create-contact', createZohoContact);
app.post('/api/zoho/salesorder', createZohoSalesOrder);
app.post('/api/customers/sync', syncCustomerWithZoho);
app.post('/api/customers/sync-all', syncAllCustomers);

// ── NEW DASHBOARD AGGREGATION ROUTES & CRON ─────────────────────────
const dashboardAggregator = new DashboardAggregator();

// New endpoint to manually trigger the aggregation
app.post('/api/dashboard/run-aggregation', async (req, res) => {
  console.log('Received request to manually run dashboard aggregation...');
  try {
    // Run without 'await' to return a response immediately
    dashboardAggregator.runAllCalculations().catch(err => {
        console.error("Error during background aggregation:", err);
    });
    res.status(202).json({ 
      message: "Accepted. Dashboard aggregation process started in the background." 
    });
  } catch (error) {
    console.error('Failed to start aggregation process:', error);
    res.status(500).json({ error: 'Failed to start aggregation process.' });
  }
});

// New cron job to run the aggregation automatically every hour
cron.schedule('0 * * * *', () => {
  console.log('⏰ Cron job triggered: Running scheduled dashboard aggregation...');
  dashboardAggregator.runAllCalculations().catch(error => {
    console.error('Scheduled dashboard aggregation failed:', error);
  });
});

// ── Root & Health Endpoints ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Splitfin Zoho Integration API',
    version: API_VERSION,
    status: 'running',
    // ... (rest of your root response)
  });
});

app.get('/health', async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection('_health').doc('check').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    const syncStatus = await getSyncStatus();
    res.json({
      status: 'healthy',
      version: API_VERSION,
      database: 'connected',
      sync: {
        lastSync: syncStatus?.lastSync || 'never',
        status: syncStatus?.status || 'unknown'
      }
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// ── Error Handling ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Server Startup ──────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Splitfin Zoho Integration API                    ║');
  console.log(`║ Version    : ${API_VERSION.padEnd(46)}║`);
  // ... (rest of your startup log)
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Run aggregation once on startup
  console.log('\n🚀 Running initial dashboard aggregation on startup...');
  dashboardAggregator.runAllCalculations().catch(error => {
      console.error('Initial startup aggregation failed:', error);
  });
});
