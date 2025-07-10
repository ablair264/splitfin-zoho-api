import admin from 'firebase-admin';

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  import('dotenv').then(dotenv => dotenv.config());
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Check if we have the service account JSON
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
    }
    
    // Parse the service account from the environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        throw new Error(`Missing required field in service account: ${field}`);
      }
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
    console.log(`📁 Connected to project: ${serviceAccount.project_id}`);
    
    // Configure Firestore settings
    admin.firestore().settings({
      ignoreUndefinedProperties: true
    });
    console.log('✅ Firestore configured to ignore undefined properties.');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    
    // In production, we want to know immediately if Firebase fails
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Critical: Firebase initialization failed in production');
      process.exit(1);
    } else {
      console.warn('⚠️  Running in development mode without Firebase');
    }
  }
}

// Export the initialized services
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;