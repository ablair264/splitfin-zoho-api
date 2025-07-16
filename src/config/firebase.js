import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    let serviceAccount;
    
    // First, try to get service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.log('🔍 Using Firebase service account from environment variable');
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseError);
        throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
      }
    } else {
      // Fallback to reading from file (for local development)
      console.log('🔍 Using Firebase service account from file');
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
        serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      } catch (fileError) {
        console.error('❌ Failed to read service account file:', fileError);
        throw new Error('No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable or provide serviceAccountKey.json file');
      }
    }
    
    // Validate service account has required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account: missing required fields');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Firebase Admin SDK initialized successfully.');
    console.log(`📊 Connected to project: ${serviceAccount.project_id}`);
    
    // Configure Firestore settings
    admin.firestore().settings({
      ignoreUndefinedProperties: true
    });
    console.log('✅ Firestore configured to ignore undefined properties.');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    
    // Provide helpful error messages
    if (process.env.NODE_ENV === 'production') {
      console.error('💡 In production: Ensure FIREBASE_SERVICE_ACCOUNT_JSON is set in your environment variables');
      console.error('💡 The value should be the entire JSON content of your service account key file');
    } else {
      console.error('💡 In development: Either set FIREBASE_SERVICE_ACCOUNT_JSON or ensure serviceAccountKey.json exists');
    }
    
    // Exit if Firebase can't be initialized, as it's critical
    process.exit(1); 
  }
}

// Export the initialized services
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;