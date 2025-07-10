#!/usr/bin/env node

// server/fix-import-paths.js
// Script to fix incorrect Firebase import paths

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

  // Fix incorrect import paths for files in src/ directory
  if (filePath.includes('/src/')) {
    // Replace './config/firebase.js' with '../config/firebase.js'
    if (content.includes("'./config/firebase.js'")) {
      content = content.replace(/'\.\/config\/firebase\.js'/g, "'../config/firebase.js'");
      modified = true;
    }
    if (content.includes('"./config/firebase.js"')) {
      content = content.replace(/"\.\/config\/firebase\.js"/g, '"../config/firebase.js"');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed import paths: ${filePath}`);
  }
}

console.log('🚀 Fixing Firebase import paths...');
const jsFiles = getAllJsFiles(path.join(__dirname, 'src'));
jsFiles.forEach(fixImportPaths);
console.log('✅ Import path fixes complete!\nNow try running: node server.js'); 