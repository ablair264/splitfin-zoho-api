#!/usr/bin/env node

// server/fix-duplicate-db-auth.js
// Script to remove duplicate db and auth declarations/imports

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

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let seenDbImport = false;
  let seenAuthImport = false;
  let cleanedLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Remove duplicate db imports
    if (line.match(/import\s+\{\s*db(,\s*auth)?\s*\}\s+from ['\"](\.\.\/)?config\/firebase\.js['\"]/)) {
      if (seenDbImport) continue;
      seenDbImport = true;
    }
    // Remove duplicate auth imports
    if (line.match(/import\s+\{\s*auth\s*\}\s+from ['\"](\.\.\/)?config\/firebase\.js['\"]/)) {
      if (seenAuthImport) continue;
      seenAuthImport = true;
    }
    // Remove duplicate const db/auth declarations
    if (line.match(/^\s*const\s+db\s*=\s*.*firebase.*;?$/) || line.match(/^\s*const\s+auth\s*=\s*.*firebase.*;?$/)) {
      continue;
    }
    cleanedLines.push(line);
  }

  // Remove duplicate blank lines
  let finalLines = [];
  let lastBlank = false;
  for (let l of cleanedLines) {
    if (l.trim() === '') {
      if (lastBlank) continue;
      lastBlank = true;
    } else {
      lastBlank = false;
    }
    finalLines.push(l);
  }

  const cleaned = finalLines.join('\n');
  if (cleaned !== content) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`✅ Cleaned: ${filePath}`);
  }
}

console.log('🚀 Scanning for duplicate db/auth imports and declarations...');
const jsFiles = getAllJsFiles(path.join(__dirname, 'src'));
jsFiles.forEach(cleanFile);
console.log('✅ Duplicate db/auth cleanup complete!\nNow try running: node server.js'); 