#!/usr/bin/env node
// server/repopulate-items.js
// Simple runner script for repopulating items_data collection

import { repopulateItemsData } from './src/scripts/repopulateItemsData.js';

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  ITEMS DATA REPOPULATION TOOL                  ║
║                                                                ║
║  This will:                                                    ║
║  1. DELETE all records in items_data collection                ║
║  2. Fetch all items from Zoho Inventory                        ║
║  3. Filter out: inactive items, £0 items, XXX SKUs             ║
║  4. Add normalized brand names                                 ║
║  5. Add Firebase Storage image URLs                            ║
╚═══════════════════════════════════════════════════════════════╝
`);

// Give user a chance to cancel
console.log('⚠️  WARNING: This will DELETE ALL existing items_data records!\n');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  repopulateItemsData()
    .then((result) => {
      console.log('\n✅ Repopulation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Repopulation failed:', error);
      process.exit(1);
    });
}, 5000);