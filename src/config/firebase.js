import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Get the directory of the current file
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Read the service account from the file
    const serviceAccountPath = join(__dirname, '../../serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
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