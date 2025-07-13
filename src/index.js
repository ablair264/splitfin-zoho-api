// server/src/index.js - Updated with daily aggregation system
import admin from 'firebase-admin';
import './config/firebase.js'; // Your existing firebase config
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Using Render's cron jobs instead of node-cron

// Import the backfill service
import { backfillAgentAggregatesForUser, backfillAllAgents } from './services/agentBackfillService.js';

// Import your existing services and routes
import { createZohoSalesOrder } from './services/salesOrder.js';
import { syncCustomerWithZoho, syncAllCustomers } from './services/customerSync.js';
import { createZohoContact } from './services/createContact.js';
import { updateZohoContact } from './services/updateContact.js';
import { getSyncStatus } from './syncInventory.js';

// Import the new daily dashboard aggregator and xcontroller
import DailyDashboardAggregator from './services/dailyDashboardAggregator.js';
import DashboardController from './services/dashboardController.js';

// Import routes
import webhookRoutes from './routes/webhooks.js';
import syncRoutes from './routes/sync.js';
import cronRoutes from './routes/cron.js';
import aiInsightsRoutes from './routes/ai_insights.js';
import productsRoutes from './routes/products.js';
import authRoutes from './routes/auth.js';
import purchaseAnalysisRoutes from './routes/purchaseAnalysis.js';
import searchTrendsRoutes from './routes/searchTrends.js';
import emailRoutes from './routes/email.js';
import dmBrandsRoutes from './routes/dmBrandsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration ───────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const API_VERSION = '3.2.0'; // Version bump for daily aggregation

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
app.use('/api/ai-insights', aiInsightsRoutes);
app.use('/api/products', productsRoutes);
app.use('/oauth', authRoutes);
app.use('/api/purchase-analysis', purchaseAnalysisRoutes);
app.use('/api/search-trends', searchTrendsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dm-brands', dmBrandsRoutes);

app.put('/api/zoho/update-contact', updateZohoContact);
app.post('/api/zoho/create-contact', createZohoContact);
app.post('/api/zoho/salesorder', createZohoSalesOrder);
app.post('/api/customers/sync', syncCustomerWithZoho);
app.post('/api/customers/sync-all', syncAllCustomers);

// ── NEW DASHBOARD ROUTES ────────────────────────────────────────────
const dashboardController = new DashboardController();
const dailyAggregator = new DailyDashboardAggregator();

// Dashboard data endpoint (supports custom date ranges)
app.post('/api/dashboard/data', (req, res) => 
  dashboardController.getDashboardData(req, res)
);

// Check missing dates
app.post('/api/dashboard/calculate-missing', (req, res) => 
  dashboardController.calculateMissingDates(req, res)
);

// Manual trigger for daily aggregation
app.post('/api/dashboard/run-daily-aggregation', async (req, res) => {
  console.log('Received request to manually run daily aggregation...');
  try {
    // Run without 'await' to return a response immediately
    dailyAggregator.runDailyAggregation().catch(err => {
      console.error("Error during background aggregation:", err);
    });
    res.status(202).json({ 
      message: "Accepted. Daily aggregation process started in the background." 
    });
  } catch (error) {
    console.error('Failed to start aggregation process:', error);
    res.status(500).json({ error: 'Failed to start aggregation process.' });
  }
});

// Backfill endpoint for historical data
app.post('/api/dashboard/backfill', async (req, res) => {
  const { startDate, endDate } = req.body;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start and end dates required' });
  }
  
  console.log(`Received request to backfill from ${startDate} to ${endDate}`);
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Run without 'await' to return a response immediately
    dailyAggregator.backfillDailyAggregates(start, end).catch(err => {
      console.error("Error during backfill:", err);
    });
    
    res.status(202).json({ 
      message: "Accepted. Backfill process started in the background.",
      range: { startDate, endDate }
    });
  } catch (error) {
    console.error('Failed to start backfill process:', error);
    res.status(500).json({ error: 'Failed to start backfill process.' });
  }
});

// Backfill specific agent endpoint
app.post('/api/dashboard/backfill-agent', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }
  
  console.log(`Received request to backfill agent data for user: ${userId}`);
  
  try {
    // Run without 'await' to return a response immediately
    backfillAgentAggregatesForUser(userId)
      .then(result => {
        console.log('Agent backfill completed:', result);
      })
      .catch(err => {
        console.error("Error during agent backfill:", err);
      });
    
    res.status(202).json({ 
      message: "Accepted. Agent backfill process started in the background.",
      userId
    });
  } catch (error) {
    console.error('Failed to start agent backfill process:', error);
    res.status(500).json({ error: 'Failed to start agent backfill process.' });
  }
});

// Backfill all agents endpoint
app.post('/api/dashboard/backfill-all-agents', async (req, res) => {
  console.log('Received request to backfill all agents');
  
  try {
    // Run without 'await' to return a response immediately
    backfillAllAgents()
      .then(result => {
        console.log('All agents backfill completed:', result);
      })
      .catch(err => {
        console.error("Error during all agents backfill:", err);
      });
    
    res.status(202).json({ 
      message: "Accepted. All agents backfill process started in the background."
    });
  } catch (error) {
    console.error('Failed to start all agents backfill process:', error);
    res.status(500).json({ error: 'Failed to start all agents backfill process.' });
  }
});

// ── CRON JOB ENDPOINTS FOR RENDER ──────────────────────────────────

// Endpoint for Render's daily cron job (2 AM)
app.post('/api/cron/daily-aggregation', async (req, res) => {
  // Verify the request is from Render (optional security)
  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('⏰ Daily cron job triggered via Render: Running daily aggregation...');
  
  try {
    dailyAggregator.runDailyAggregation().catch(error => {
      console.error('Scheduled daily aggregation failed:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Daily aggregation started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to start daily aggregation:', error);
    res.status(500).json({ error: 'Failed to start daily aggregation' });
  }
});

// Endpoint for Render's hourly cron job
app.post('/api/cron/hourly-update', async (req, res) => {
  // Verify the request is from Render (optional security)
  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  console.log('⏰ Hourly cron job triggered via Render: Updating today\'s aggregate...');
  
  try {
    dailyAggregator.calculateDailyAggregate(new Date()).catch(error => {
      console.error('Hourly aggregate update failed:', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Hourly update started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to start hourly update:', error);
    res.status(500).json({ error: 'Failed to start hourly update' });
  }
});

// ── Root & Health Endpoints ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Splitfin Zoho Integration API',
    version: API_VERSION,
    status: 'running',
    features: {
      zoho_integration: true,
      ai_insights: true,
      dashboard_aggregation: 'daily',
      custom_date_ranges: true,
      realtime_updates: 'hourly'
    },
    endpoints: {
      dashboard: {
        data: 'POST /api/dashboard/data',
        calculate_missing: 'POST /api/dashboard/calculate-missing',
        run_aggregation: 'POST /api/dashboard/run-daily-aggregation',
        backfill: 'POST /api/dashboard/backfill'
      },
      cron: {
        daily_aggregation: 'POST /api/cron/daily-aggregation',
        hourly_update: 'POST /api/cron/hourly-update'
      },
      zoho: {
        create_contact: 'POST /api/zoho/create-contact',
        update_contact: 'PUT /api/zoho/update-contact',
        create_order: 'POST /api/zoho/salesorder'
      },
      sync: {
        inventory: '/api/sync/*',
        customers: 'POST /api/customers/sync'
      }
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    const db = admin.firestore();
    await db.collection('_health').doc('check').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check daily aggregates health
    const today = new Date().toISOString().split('T')[0];
    const todayAggregate = await db.collection('daily_aggregates').doc(today).get();
    
    const syncStatus = await getSyncStatus();
    
    res.json({
      status: 'healthy',
      version: API_VERSION,
      database: 'connected',
      sync: {
        lastSync: syncStatus?.lastSync || 'never',
        status: syncStatus?.status || 'unknown'
      },
      dailyAggregates: {
        todayExists: todayAggregate.exists,
        lastUpdate: todayAggregate.exists ? todayAggregate.data().timestamp?.toDate() : null
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
  console.log(`║ Port       : ${String(PORT).padEnd(46)}║`);
  console.log(`║ Environment: ${(IS_PRODUCTION ? 'Production' : 'Development').padEnd(46)}║`);
  console.log('║                                                            ║');
  console.log('║ Features:                                                  ║');
  console.log('║ - Daily Dashboard Aggregation                              ║');
  console.log('║ - Custom Date Range Support                                ║');
  console.log('║ - Real-time Updates (Hourly)                               ║');
  console.log('║ - Agent-specific Reports                                   ║');
  console.log('║ - Render Cron Job Integration                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Check if we need to run initial aggregation
  console.log('\n🔍 Checking daily aggregates status...');
  const db = admin.firestore();
  const today = new Date().toISOString().split('T')[0];
  
  db.collection('daily_aggregates').doc(today).get()
    .then(doc => {
      if (!doc.exists) {
        console.log('📊 Today\'s aggregate missing. Running initial aggregation...');
        return dailyAggregator.calculateDailyAggregate(new Date());
      } else {
        console.log('✅ Today\'s aggregate already exists.');
      }
    })
    .catch(error => {
      console.error('Error checking daily aggregates:', error);
    });
});