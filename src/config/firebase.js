import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Parse the service account from the environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
    
    // Configure Firestore settings
    admin.firestore().settings({
      ignoreUndefinedProperties: true
    });
    console.log('✅ Firestore configured to ignore undefined properties.');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    // Exit if Firebase can't be initialized, as it's critical
    process.exit(1); 
  }
}

// Export the initialized services
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;