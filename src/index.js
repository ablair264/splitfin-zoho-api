// server/src/index.js - Cleaned and organized version
import './config/firebase.js';
import express from 'express';
import cors from 'cors';
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
const API_VERSION = '3.0.0'; // Bumped for major cleanup

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
// If './config/firebase.js' does not export `db` and `auth` from admin, you'll need to adjust.
// Assuming `admin` is globally available after `admin.initializeApp` is called in './config/firebase.js'
const db = admin.firestore();
const auth = admin.auth();


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
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dm-brands', dmBrandsRoutes);
app.use('/api/search-trends', searchTrendsRoutes);
app.use('/api/admin', backfillRoutes);

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

    // 2. Create customer_data document for backwards compatibility
    const customerDataDoc = {
      firebaseUID: firebaseUserUid,
      firebase_uid: firebaseUserUid,
      customer_id: customerId,
      email: email,
      contact_name: contactName || customerName || 'Customer',
      contactName: contactName || customerName || 'Customer',
      customer_name: customerName || '',
      company_name: companyName || null,
      companyName: companyName || null,
      lastLogin: null,
      isOnline: false,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('customer_data')
      .doc(firebaseUserUid)
      .set(customerDataDoc);
    
    console.log(`customer_data document created for UID: ${firebaseUserUid}`);

    // 3. Update the users/{customerId} document if needed
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
  console.log(`║ • CRON Jobs  : /api/cron/* ║`);
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
