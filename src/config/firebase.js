import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to get service account from environment variable first (for production)
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log('✅ Using Firebase service account from environment variable');
    } else {
      // Fallback to file for local development
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      const fs = await import('fs');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      console.log('✅ Using Firebase service account from file');
    }
    
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
    console.error('Make sure FIREBASE_SERVICE_ACCOUNT_JSON is set in your environment variables');
    // Exit if Firebase can't be initialized, as it's critical
    process.exit(1); 
  }
}

// Export the initialized services
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;