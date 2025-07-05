#!/usr/bin/env node

// server/run-migration.js
// Simple script to run the inventory system migration
// Usage: node run-migration.js [--dry-run] [--log-level=debug|info|warn|error]

import { runMigration, MIGRATION_CONFIG } from './src/scripts/migrateToNewInventorySystem.js';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const logLevelArg = args.find(arg => arg.startsWith('--log-level='));
const logLevel = logLevelArg ? logLevelArg.split('=')[1] : 'info';

// Update configuration based on command line arguments
MIGRATION_CONFIG.options.dryRun = dryRun;
MIGRATION_CONFIG.options.logLevel = logLevel;

console.log('🚀 Inventory System Migration Tool');
console.log('==================================');
console.log(`Dry Run: ${dryRun ? 'YES' : 'NO'}`);
console.log(`Log Level: ${logLevel}`);
console.log('');

if (dryRun) {
  console.log('⚠️  DRY RUN MODE: No data will be modified');
  console.log('');
}

// Run the migration
runMigration()
  .then(() => {
    console.log('');
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }); 