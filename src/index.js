// server/src/index.js - Cleaned and organized version
import './config/firebase.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { createZohoSalesOrder } from './services/salesOrder.js';
import { syncCustomerWithZoho, syncAllCustomers } from './services/customerSync.js';
import { createZohoContact } from './services/createContact.js';
import { getAccessToken, fetchPaginatedData, createInventoryContact } from './api/zoho.js';

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
import dmBrandsRoutes from './routes/dmBrandsRoutes.js';

// Import services (only what's actually used in production)
import { getSyncStatus } from './syncInventory.js';
import { updateZohoContact } from './services/updateContact.js';
import customerEnrichmentService from './services/customerEnrichmentService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration ───────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const API_VERSION = '3.0.0'; // Bumped for major cleanup

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://splitfin.co.uk',
  'https://splitfin-zoho-api.onrender.com',
];


// ── Express Setup ───────────────────────────────────────────────────
const app = express();

// CORS configuration
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

// Body parsing middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Request logging middleware (consider using Morgan in production)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/ai-insights')) {
    const size = JSON.stringify(req.body).length / (1024 * 1024);
    console.log(`AI Insights request size: ${size.toFixed(2)}MB`);
  }
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
app.use('/api/email', emailRoutes);  // ← ADD THIS LINE HERE
app.use('/api/dm-brands', dmBrandsRoutes);

app.put('/api/zoho/update-contact', updateZohoContact);
app.post('/api/zoho/create-contact', createZohoContact);
app.post('/api/zoho/salesorder', createZohoSalesOrder);
app.post('/api/customers/sync', syncCustomerWithZoho);
app.post('/api/customers/sync-all', syncAllCustomers);

// ── Root & Health Endpoints ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Splitfin Zoho Integration API',
    version: API_VERSION,
    status: 'running',
    environment: IS_PRODUCTION ? 'production' : 'development',
    documentation: {
      base_url: `${req.protocol}://${req.get('host')}`,
      endpoints: {
        health: '/health',
        api: {
          webhooks: '/api/webhooks/*',
          sync: '/api/sync/*',
          reports: '/api/reports/*',
          cron: '/api/cron/*',
          'ai-insights': '/api/ai-insights/*',
          products: '/api/products/*',
        },
        auth: {
          oauth: '/oauth/url',
          callback: '/oauth/callback'
        }
      }
    },
    features: [
      'OAuth 2.0 Authentication',
      'CRM & Inventory Integration',
      'CRON-based Data Sync',
      'Normalized Data Collections',
      'AI-Powered Analytics',
      'Real-time Dashboard',
      'Product Management'
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/customers/enrich', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    if (customerId) {
      // Enrich single customer
      const result = await customerEnrichmentService.enrichCustomer(customerId);
      res.json({ success: true, data: result });
    } else {
      // Enrich all customers missing data
      const result = await customerEnrichmentService.enrichMissingCustomers();
      res.json({ success: true, data: result });
    }
  } catch (error) {
    console.error('Enrichment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/zoho/test/contact-creation', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Get the access token first
    const token = await getAccessToken();
    
    // Get org ID from environment
    const orgId = process.env.ZOHO_ORG_ID;
    
    // Test 1: Create a simple contact using the existing function
    const testContact = {
      contact_name: `API Test ${Date.now()}`,
      contact_type: 'customer',
      email: `apitest${Date.now()}@test.com`
    };
    
    console.log('Creating test contact:', testContact);
    
    try {
      const createResult = await createInventoryContact(testContact);
      
      results.tests.push({
        test: 'create',
        success: true,
        response: createResult
      });
      
      // If we got a contact ID, try to verify it exists
      if (createResult.contact?.contact_id) {
        const contactId = createResult.contact.contact_id;
        
        // Wait a moment for Zoho to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to fetch the contact
        try {
          const fetchResponse = await axios.get(
            `https://www.zohoapis.eu/inventory/v1/contacts/${contactId}`,
            {
              headers: {
                'Authorization': `Zoho-oauthtoken ${token}`,
                'X-com-zoho-inventory-organizationid': orgId
              }
            }
          );
          
          results.tests.push({
            test: 'fetch',
            success: true,
            found: true,
            contact: fetchResponse.data.contact
          });
        } catch (fetchError) {
          results.tests.push({
            test: 'fetch',
            success: false,
            error: fetchError.response?.data || fetchError.message
          });
        }
      }
      
    } catch (createError) {
      results.tests.push({
        test: 'create',
        success: false,
        error: createError.message,
        details: createError.response?.data
      });
    }
    
    try {
      const listResponse = await axios.get(
        'https://www.zohoapis.eu/inventory/v1/contacts',
        {
          params: {
            sort_column: 'created_time',
            sort_order: 'D',
            per_page: 10
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'X-com-zoho-inventory-organizationid': orgId
          }
        }
      );
      
      results.tests.push({
        test: 'list',
        success: true,
        totalContacts: listResponse.data.page_context?.total || 0,
        recentContacts: listResponse.data.contacts?.slice(0, 5).map(c => ({
          id: c.contact_id,
          name: c.contact_name,
          email: c.email,
          created: c.created_time
        }))
      });
    } catch (listError) {
      results.tests.push({
        test: 'list',
        success: false,
        error: listError.message
      });
    }
    
    res.json({
      success: true,
      orgId: orgId,
      results: results
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get('/health', async (req, res) => {
  try {
    // Basic health check
    const db = admin.firestore();
    await db.collection('_health').doc('check').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get sync status
    const syncStatus = await getSyncStatus();
    
    res.json({
      status: 'healthy',
      version: API_VERSION,
      environment: IS_PRODUCTION ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      database: 'connected',
      sync: {
        lastSync: syncStatus?.lastSync || 'never',
        status: syncStatus?.status || 'unknown'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ── Error Handling ──────────────────────────────────────────────────
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    }),
    timestamp: new Date().toISOString()
  });
});

// ── Server Startup ──────────────────────────────────────────────────
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Splitfin Zoho Integration API                    ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║ Version    : ${API_VERSION.padEnd(46)}║`);
  console.log(`║ Environment: ${(IS_PRODUCTION ? 'production' : 'development').padEnd(46)}║`);
  console.log(`║ Port       : ${PORT.toString().padEnd(46)}║`);
  console.log(`║ Base URL   : http://localhost:${PORT.toString().padEnd(29)}║`);
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Features:                                                  ║');
  console.log('║ • OAuth 2.0 Authentication                                 ║');
  console.log('║ • CRON-based Data Synchronization                          ║');
  console.log('║ • Normalized Data Collections                              ║');
  console.log('║ • AI-Powered Analytics                                     ║');
  console.log('║ • Real-time Dashboard                                      ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Main Endpoints:                                            ║');
  console.log(`║ • Health     : http://localhost:${PORT}/health              ║`);
  console.log(`║ • API Docs   : http://localhost:${PORT}/                    ║`);
  console.log(`║ • Dashboard  : /api/reports/dashboard                      ║`);
  console.log(`║ • CRON Jobs  : /api/cron/*                                 ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (IS_PRODUCTION) {
    console.log('\n✅ Production mode: CRON jobs handle all data synchronization');
  } else {
    console.log('\n🔧 Development mode: All debugging endpoints available');
  }
});

// ── Graceful Shutdown ───────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⚠️ Forcefully shutting down after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;