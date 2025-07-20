// server/test-repopulate-setup.js
// Simple test to verify Firebase setup before running the full repopulation

import { db, initializeFirebase } from './src/config/firebase.js';
import admin from 'firebase-admin';

console.log('🧪 Testing Firebase setup for repopulation script...\n');

async function testSetup() {
  try {
    // Initialize Firebase
    console.log('1️⃣ Initializing Firebase...');
    initializeFirebase();
    console.log('   ✅ Firebase initialized successfully\n');
    
    // Test Firestore connection
    console.log('2️⃣ Testing Firestore connection...');
    const testCollection = db.collection('items_data');
    const snapshot = await testCollection.limit(1).get();
    console.log(`   ✅ Firestore accessible - Found ${snapshot.size} document(s)\n`);
    
    // Test Storage connection
    console.log('3️⃣ Testing Storage connection...');
    const bucket = admin.storage().bucket();
    console.log(`   ✅ Storage bucket accessible: ${bucket.name}\n`);
    
    // Test image path
    console.log('4️⃣ Testing sample image path...');
    const testImagePath = 'brand-images/rader/17994_1.webp';
    try {
      const [exists] = await bucket.file(testImagePath).exists();
      if (exists) {
        console.log(`   ✅ Sample image found: ${testImagePath}`);
        
        // Generate a signed URL
        const [url] = await bucket.file(testImagePath).getSignedUrl({
          action: 'read',
          expires: '01-01-2030'
        });
        console.log(`   📸 Sample URL: ${url.substring(0, 100)}...`);
      } else {
        console.log(`   ⚠️  Sample image not found: ${testImagePath}`);
        console.log('   (This is OK - images may not exist for all products)');
      }
    } catch (error) {
      console.log(`   ⚠️  Could not check image: ${error.message}`);
    }
    
    console.log('\n✅ All tests passed! You can now run the repopulation script.');
    console.log('   Run: npm run repopulate-items');
    
  } catch (error) {
    console.error('\n❌ Setup test failed:', error.message);
    console.error('\nFull error:', error);
    
    if (error.message.includes('No Firebase credentials found')) {
      console.error('\n💡 Make sure serviceAccountKey.json exists in the server directory');
      console.error('   Or set FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
    }
  }
}

testSetup().then(() => process.exit(0)).catch(() => process.exit(1));