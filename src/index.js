// server/src/index.js - Updated with ShipStation integration
import './config/firebase.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
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
import searchTrendsRoutes from './routes/searchTrends.js';
import emailRoutes from './routes/email.js';
import dmBrandsRoutes from './routes/dmBrandsRoutes.js';
import backfillRoutes from './api/backfillEndpoint.js';
import imagekitRoutes from './routes/imagekit.js';
import shipstationRoutes from './routes/shipstation.js'; // NEW: ShipStation routes
import zohoRoutes from './routes/zoho.js'; // Zoho routes

// Import services (only what's actually used in production)
import { getSyncStatus } from './syncInventory.js';
import { updateZohoContact } from './services/updateContact.js';
import customerEnrichmentService from './services/customerEnrichmentService.js';
import zohoReportsService from './services/zohoReportsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Configuration ───────────────────────────────────────────────────
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;
const API_VERSION = '3.2.0'; // Bumped for ShipStation integration

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://splitfin.co.uk',
  'http://splitfin.co.uk',
  'https://www.splitfin.co.uk',
  'http://www.splitfin.co.uk',
  'https://splitfin-zoho-api.onrender.com',
];

// Initialize Firebase Admin SDK (assuming './config/firebase.js' handles admin.initializeApp)
const db = admin.firestore();
const auth = admin.auth();

// ── Express Setup ───────────────────────────────────────────────────
const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow images from ImageKit and ShipStation
}));

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

// Rate limiting for ShipStation API calls
const shipstationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes per IP (ShipStation allows 40 requests per minute)
  message: { error: 'Too many ShipStation API requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

// Rate limiting for ImageKit uploads
const imagekitUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 minutes per IP
  message: { error: 'Too many upload requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: { error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' })); // Increased for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware (consider using Morgan in production)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Special logging for AI insights, ImageKit uploads, and ShipStation calls
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url.includes('/ai-insights')) {
    const size = JSON.stringify(req.body).length / (1024 * 1024);
    console.log(`AI Insights request size: ${size.toFixed(2)}MB`);
  }
  if (req.method === 'POST' && req.url.includes('/imagekit/upload')) {
    console.log(`ImageKit upload request for: ${req.body?.brand || 'unknown brand'}`);
  }
  if (req.url.includes('/shipstation/')) {
    console.log(`ShipStation API call: ${req.method} ${req.url}`);
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
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dm-brands', dmBrandsRoutes);
app.use('/api/search-trends', searchTrendsRoutes);
app.use('/api/admin', backfillRoutes);

// NEW: ShipStation routes with rate limiting
app.use('/api/shipstation', shipstationLimiter, shipstationRoutes);

// ImageKit routes with upload rate limiting
app.use('/api/imagekit', imagekitUploadLimiter, imagekitRoutes);

// Zoho routes
app.use('/api/zoho', zohoRoutes);

// Legacy Zoho endpoints (keep for backward compatibility)
app.put('/api/zoho/update-contact', updateZohoContact);
app.post('/api/zoho/create-contact', createZohoContact);
app.post('/api/zoho/salesorder', createZohoSalesOrder);
app.post('/api/customers/sync', syncCustomerWithZoho);
app.post('/api/customers/sync-all', syncAllCustomers);

// --- API Endpoint: Migrate a single user (ONE per customer) ---
app.post('/migrate-single-user', async (req, res) => {
  // IMPORTANT: In production, add authentication here!
  // if (!req.headers.authorization || !isValidAdminToken(req.headers.authorization)) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  const { 
    email, 
    password, 
    customerId, 
    contactName, 
    customerName, 
    companyName, 
    sendEmail 
  } = req.body;

  if (!email || !password || !customerId) {
    return res.status(400).json({ 
      message: 'Missing required fields: email, password, customerId' 
    });
  }

  try {
    // 1. Create Firebase Auth User
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        displayName: contactName || customerName || 'Customer',
        emailVerified: false,
        disabled: false,
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        // Get existing user
        const existingUser = await auth.getUserByEmail(email);
        return res.status(200).json({ 
          message: 'User already exists, skipped creation', 
          uid: existingUser.uid 
        });
      }
      throw authError;
    }

    const firebaseUserUid = userRecord.uid;
    console.log(`Firebase Auth user created: ${firebaseUserUid} for customer ${customerId}`);

    // Skip creating customer_data - we don't need this legacy collection
    
    // Update the users/{customerId} document if needed
    const userDocRef = db.collection('users').doc(customerId);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      await userDocRef.set({
        customer_id: customerId,
        customer_name: customerName || '',
        company_name: companyName || '',
        email: email,
        firebase_uid: firebaseUserUid,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        migrated: true
      });
    } else {
      // Just update the firebase_uid if document exists
      await userDocRef.update({
        firebase_uid: firebaseUserUid,
        auth_email: email
      });
    }

    // 4. Send password reset email if requested
    if (sendEmail) {
      try {
        const resetLink = await auth.generatePasswordResetLink(email);
        // TODO: Send email using your email service (SendGrid, etc.)
        console.log(`Password reset link generated for ${email}`);
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Don't fail the whole operation if email fails
      }
    }

    res.status(200).json({ 
      success: true,
      message: 'User migrated successfully', 
      uid: firebaseUserUid 
    });

  } catch (error) {
    console.error('Error migrating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to migrate user', 
      error: error.message 
    });
  }
});

// --- API Endpoint: Delete users created YESTERDAY ---
app.post('/delete-yesterday-users', async (req, res) => {
  // IMPORTANT: Add strong authentication for this endpoint!
  // if (!req.headers.authorization || !isValidAdminToken(req.headers.authorization)) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  try {
    // Calculate yesterday's date range
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(now);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    console.log(`Deleting users created between ${yesterdayStart.toISOString()} and ${yesterdayEnd.toISOString()}`);

    let deletedCount = 0;
    const errors = [];
    const deletedUsers = [];

    // 1. Get all Firebase Auth users and filter by creation date
    let nextPageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      for (const user of listUsersResult.users) {
        const creationTime = new Date(user.metadata.creationTime);
        
        if (creationTime >= yesterdayStart && creationTime <= yesterdayEnd) {
          try {
            console.log(`Deleting user: ${user.email} (${user.uid})`);
            
            // Delete from Firebase Auth
            await auth.deleteUser(user.uid);
            
            // Delete from customer_data collection
            await db.collection('customer_data')
              .doc(user.uid)
              .delete();
            
            // Find and update customer document to remove firebase_uid
            const customersSnapshot = await db.collection('customers')
              .where('firebase_uid', '==', user.uid)
              .get();
            
            for (const doc of customersSnapshot.docs) {
              await doc.ref.update({
                firebase_uid: admin.firestore.FieldValue.delete(),
                auth_email: admin.firestore.FieldValue.delete()
              });
              console.log(`Updated customer ${doc.id} to remove firebase_uid`);
            }
            
            // Also check users collection for any documents with this firebase_uid
            const usersSnapshot = await db.collection('users')
              .where('firebase_uid', '==', user.uid)
              .get();
            
            for (const doc of usersSnapshot.docs) {
              await doc.ref.update({
                firebase_uid: admin.firestore.FieldValue.delete(),
                auth_email: admin.firestore.FieldValue.delete()
              });
            }
            
            deletedUsers.push({
              uid: user.uid,
              email: user.email,
              createdAt: user.metadata.creationTime
            });
            deletedCount++;
            
          } catch (error) {
            console.error(`Error deleting user ${user.uid}:`, error);
            errors.push({
              uid: user.uid,
              email: user.email,
              error: error.message
            });
          }
        }
      }
      
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`Successfully deleted ${deletedCount} users created yesterday`);

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} users created yesterday`,
      deletedCount: deletedCount,
      deletedUsers: deletedUsers,
      errors: errors
    });

  } catch (error) {
    console.error('Error during deletion process:', error);
    res.status(500).json({ 
      success: false,
      message: 'Deletion failed', 
      error: error.message 
    });
  }
});

// ── Admin Migration Endpoint ──────────────────────────────────────────────
// WARNING: Protect this endpoint in production!
app.post('/admin/run-zoho-migration', async (req, res) => {
  // Optionally add authentication here!
  try {
    const { clear } = req.body; // pass { clear: true } to wipe collections
    await zohoReportsService.runFullMigration({ clear: !!clear });
    res.json({ success: true, message: 'Migration and metrics complete.' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
          imagekit: '/api/imagekit/*',
          shipstation: '/api/shipstation/*', // NEW: ShipStation endpoints
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
      'Product Management',
      'ImageKit Image Management',
      'ShipStation Shipping Integration' // NEW: ShipStation feature
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

    // Check if ImageKit environment variables are configured
    const imagekitConfigured = !!(
      process.env.IMAGEKIT_PUBLIC_KEY && 
      process.env.IMAGEKIT_PRIVATE_KEY && 
      process.env.IMAGEKIT_URL_ENDPOINT
    );

    // Check if ShipStation environment variables are configured
    const shipstationConfigured = !!(
      process.env.SHIPSTATION_API_KEY && 
      process.env.SHIPSTATION_API_SECRET
    );

    res.json({
      status: 'healthy',
      version: API_VERSION,
      environment: IS_PRODUCTION ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      database: 'connected',
      sync: {
        lastSync: syncStatus?.lastSync || 'never',
        status: syncStatus?.status || 'unknown'
      },
      services: {
        imagekit: imagekitConfigured ? 'configured' : 'not configured',
        shipstation: shipstationConfigured ? 'configured' : 'not configured',
        firebase: 'connected',
        zoho: 'configured'
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

  // Handle specific error types
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      timestamp: new Date().toISOString()
    });
  }

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
  console.log('║ • ImageKit Image Management                                ║');
  console.log('║ • ShipStation Shipping Integration                         ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║ Main Endpoints:                                            ║');
  console.log(`║ • Health     : http://localhost:${PORT}/health              ║`);
  console.log(`║ • API Docs   : http://localhost:${PORT}/                    ║`);
  console.log(`║ • Dashboard  : /api/reports/dashboard                      ║`);
  console.log(`║ • CRON Jobs  : /api/cron/*                                 ║`);
  console.log(`║ • ImageKit   : /api/imagekit/*                             ║`);
  console.log(`║ • ShipStation: /api/shipstation/*                          ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check ImageKit configuration
  const imagekitConfigured = !!(
    process.env.IMAGEKIT_PUBLIC_KEY && 
    process.env.IMAGEKIT_PRIVATE_KEY && 
    process.env.IMAGEKIT_URL_ENDPOINT
  );

  // Check ShipStation configuration
  const shipstationConfigured = !!(
    process.env.SHIPSTATION_API_KEY && 
    process.env.SHIPSTATION_API_SECRET
  );

  if (imagekitConfigured) {
    console.log('\n✅ ImageKit: Configuration detected and ready');
  } else {
    console.log('\n⚠️  ImageKit: Not configured (add IMAGEKIT_* environment variables)');
  }

  if (shipstationConfigured) {
    console.log('✅ ShipStation: Configuration detected and ready');
  } else {
    console.log('⚠️  ShipStation: Not configured (add SHIPSTATION_* environment variables)');
  }

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