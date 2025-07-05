#!/usr/bin/env node

// server/fix-all-import-paths.js
// Script to fix all Firebase import paths based on directory structure

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

  // Calculate the correct relative path to config/firebase.js
  const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, 'src', 'config'));
  const correctPath = relativePath.replace(/\\/g, '/'); // Convert Windows paths to Unix

  // Fix import paths based on directory structure
  if (filePath.includes('/src/')) {
    // Replace any incorrect firebase.js imports with the correct path
    const patterns = [
      /'\.\/config\/firebase\.js'/g,
      /"\.\/config\/firebase\.js"/g,
      /'\.\.\/config\/firebase\.js'/g,
      /"\.\.\/config\/firebase\.js"/g,
      /'\.\.\/\.\.\/config\/firebase\.js'/g,
      /"\.\.\/\.\.\/config\/firebase\.js"/g
    ];

    patterns.forEach(pattern => {
      if (content.match(pattern)) {
        content = content.replace(pattern, `'${correctPath}/firebase.js'`);
        modified = true;
      }
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed import paths in: ${filePath} (using: ${correctPath}/firebase.js)`);
  }
}

console.log('🚀 Fixing all Firebase import paths based on directory structure...');
const jsFiles = getAllJsFiles(path.join(__dirname, 'src'));
jsFiles.forEach(fixImportPaths);
console.log('✅ All import path fixes complete!\nNow try running: node server.js'); 