import admin from 'firebase-admin';
import { Firestore } from '@google-cloud/firestore';

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then(dotenv => dotenv.config());
}

// Global Firebase instance
let firebaseApp = null;
let firestoreDb = null;
let authService = null;

/**
 * Initialize Firebase Admin SDK with proper error handling
 */
function initializeFirebase() {
  // Prevent multiple initializations
  if (firebaseApp) {
    return { app: firebaseApp, db: firestoreDb, auth: authService };
  }

  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      firebaseApp = admin.apps[0];
      // Use direct Firestore import for existing apps too
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      firestoreDb = new Firestore({
        projectId: serviceAccount.project_id,
        credentials: serviceAccount
      });
      authService = admin.auth();
      console.log('✅ Using existing Firebase Admin SDK instance.');
      return { app: firebaseApp, db: firestoreDb, auth: authService };
    }

    // Check if we have the service account JSON
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }
    
    // Parse the service account from the environment variable
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (parseError) {
      throw new Error(`Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
    }
    
    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        throw new Error(`Missing required field in service account: ${field}`);
      }
    }
    
    // Initialize Firebase Admin SDK
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    // Force initialize Firestore to catch any module resolution issues early
    try {
      // Use direct Firestore import to avoid module resolution issues
      firestoreDb = new Firestore({
        projectId: serviceAccount.project_id,
        keyFilename: undefined, // We're using credentials directly
        credentials: serviceAccount
      });
    } catch (firestoreError) {
      console.error('❌ Firestore initialization failed:', firestoreError.message);
      throw new Error(`Firestore module resolution failed: ${firestoreError.message}`);
    }
    
    console.log('✅ Firebase Admin SDK initialized successfully.');
    console.log(`📁 Connected to project: ${serviceAccount.project_id}`);
    
    // Configure Firestore settings (already initialized above)
    firestoreDb.settings({
      ignoreUndefinedProperties: true
    });
    console.log('✅ Firestore configured to ignore undefined properties.');
    
    // Initialize Auth service
    authService = admin.auth();
    
    return { app: firebaseApp, db: firestoreDb, auth: authService };
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    
    // In production, we want to know immediately if Firebase fails
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Critical: Firebase initialization failed in production');
      console.error('Full error:', error);
      process.exit(1);
    } else {
      console.warn('⚠️  Running in development mode without Firebase');
      return { app: null, db: null, auth: null };
    }
  }
}

// Initialize Firebase immediately
const { app, db, auth } = initializeFirebase();

// Export the initialized services
export { db, auth };
export default admin;

// Export a function to get Firebase services (for lazy loading)
export function getFirebaseServices() {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return { app: firebaseApp, db: firestoreDb, auth: authService };
}