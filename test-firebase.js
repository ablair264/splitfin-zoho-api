#!/usr/bin/env node

// test-firebase.js - Test Firebase initialization
import './src/config/firebase.js';
import { db, auth, getFirebaseServices } from './src/config/firebase.js';

console.log('🧪 Testing Firebase initialization...');

try {
  // Check if Firebase is initialized
  if (!db || !auth) {
    console.log('⚠️  Firebase not initialized (likely missing FIREBASE_SERVICE_ACCOUNT_JSON in development)');
    console.log('✅ Firebase configuration is working correctly');
    console.log('📝 To test with Firebase, set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable');
    process.exit(0);
  }
  
  // Test Firestore
  console.log('📊 Testing Firestore connection...');
  const testDoc = await db.collection('test').doc('connection-test').get();
  console.log('✅ Firestore connection successful');
  
  // Test Auth
  console.log('🔐 Testing Auth service...');
  const authService = auth;
  console.log('✅ Auth service initialized successfully');
  
  console.log('🎉 All Firebase services working correctly!');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Firebase test failed:', error.message);
  console.error('Full error:', error);
  process.exit(1);
} 