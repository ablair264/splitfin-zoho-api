#!/usr/bin/env node

// server/fix-firebase-imports.js
// Script to fix Firebase import issues across all server files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to fix
const filesToFix = [
  'src/services/zohoInventoryService.js',
  'src/services/productSyncService.js',
  'src/services/customerAuthService.js',
  'src/services/collectionDashboardService.js',
  'src/services/customerEnrichmentService.js',
  'src/services/zohoReportsService.js',
  'src/services/cronDataSyncService.js',
  'src/services/reportGeneratorService.js',
  'src/services/aiAnalyticsService.js',
  'src/services/purchaseAnalysisService.js',
  'src/services/fastDashboardService.js',
  'src/routes/reports.js',
  'src/routes/sync.js',
  'src/routes/ai_insights.js',
  'src/routes/auth.js',
  'src/routes/webhooks.js',
  'src/routes/reportGenerator.js',
  'src/api/zoho.js',
  'src/firebaseOrderListener.js',
  'src/firestoreSyncService.js',
  'src/syncInventory.js'
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  console.log(`🔧 Fixing: ${filePath}`);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Fix import statements
  if (content.includes("import admin from 'firebase-admin';")) {
    content = content.replace(
      "import admin from 'firebase-admin';",
      "import { db, auth } from '../config/firebase.js';"
    );
    modified = true;
  }
  
  // Fix admin.firestore() calls
  if (content.includes('admin.firestore()')) {
    content = content.replace(/admin\.firestore\(\)/g, 'db');
    modified = true;
  }
  
  // Fix admin.auth() calls
  if (content.includes('admin.auth()')) {
    content = content.replace(/admin\.auth\(\)/g, 'auth');
    modified = true;
  }
  
  // Fix admin.firestore.FieldValue.serverTimestamp() calls
  if (content.includes('admin.firestore.FieldValue.serverTimestamp()')) {
    content = content.replace(/admin\.firestore\.FieldValue\.serverTimestamp\(\)/g, 'new Date()');
    modified = true;
  }
  
  // Fix constructor assignments
  if (content.includes('this.db = admin.firestore();')) {
    content = content.replace(/this\.db = admin\.firestore\(\);/g, 'this.db = db;');
    modified = true;
  }
  
  if (content.includes('this.auth = admin.auth();')) {
    content = content.replace(/this\.auth = admin\.auth\(\);/g, 'this.auth = auth;');
    modified = true;
  }
  
  // Fix duplicate const declarations
  const lines = content.split('\n');
  const newLines = [];
  let skipNext = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip duplicate const db/auth declarations
    if (line.trim().startsWith('const db = admin.firestore();') || 
        line.trim().startsWith('const auth = admin.auth();')) {
      skipNext = true;
      continue;
    }
    
    if (skipNext && line.trim() === '') {
      skipNext = false;
      continue;
    }
    
    newLines.push(line);
  }
  
  content = newLines.join('\n');
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
}

// Fix all files
console.log('🚀 Starting Firebase import fixes...\n');

filesToFix.forEach(fixFile);

console.log('\n✅ Firebase import fixes completed!');
console.log('Now try running: node server.js'); 