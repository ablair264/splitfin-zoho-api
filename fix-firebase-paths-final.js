#!/usr/bin/env node

// server/fix-firebase-paths-final.js
// Final script to fix Firebase import paths correctly

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  return results;
}

function fixImportPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Determine the correct path based on file location
  let correctPath;
  if (filePath.includes('/src/services/') || filePath.includes('/src/routes/') || filePath.includes('/src/api/') || filePath.includes('/src/scripts/')) {
    correctPath = '../config/firebase.js';
  } else if (filePath.includes('/src/')) {
    correctPath = './config/firebase.js';
  } else {
    return; // Skip files not in src/
  }

  // Replace any firebase.js imports with the correct path
  const patterns = [
    /'config\/firebase\.js'/g,
    /"config\/firebase\.js"/g,
    /'\.\/config\/firebase\.js'/g,
    /"\.\/config\/firebase\.js"/g,
    /'\.\.\/config\/firebase\.js'/g,
    /"\.\.\/config\/firebase\.js"/g,
    /'\.\.\/\.\.\/config\/firebase\.js'/g,
    /"\.\.\/\.\.\/config\/firebase\.js"/g
  ];

  patterns.forEach(pattern => {
    if (content.match(pattern)) {
      content = content.replace(pattern, `'${correctPath}'`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath} (using: ${correctPath})`);
  }
}

console.log('🚀 Final Firebase import path fixes...');
const jsFiles = getAllJsFiles(path.join(__dirname, 'src'));
jsFiles.forEach(fixImportPaths);
console.log('✅ Firebase import paths fixed!\nNow install dependencies and try: node server.js'); 