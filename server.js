#!/usr/bin/env node

// server/server.js
// Main entry point for the Splitfin Inventory Server

import './src/index.js';

console.log('🚀 Splitfin Inventory Server starting...');
console.log('📦 Version: 1.0.0');
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('⏰ Started at:', new Date().toISOString()); 