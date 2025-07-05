#!/usr/bin/env node

// server/run-user-migration.js
// Script to run the new user structure migration

import { runMigration, MIGRATION_CONFIG } from './src/scripts/migrateToNewUserStructure.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  logLevel: args.find(arg => arg.startsWith('--log-level='))?.split('=')[1] || 'info'
};

console.log('🚀 User Structure Migration Tool');
console.log('==================================');
console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
console.log(`Log Level: ${options.logLevel}`);
console.log('');

if (options.dryRun) {
  console.log('⚠️  DRY RUN MODE: No data will be modified');
  console.log('');
}

// Update configuration
MIGRATION_CONFIG.options.dryRun = options.dryRun;
MIGRATION_CONFIG.options.logLevel = options.logLevel;

// Run migration
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