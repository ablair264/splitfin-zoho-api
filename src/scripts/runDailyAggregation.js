#!/usr/bin/env node

// Script to run daily aggregation manually
import '../config/firebase.js'; // Initialize Firebase first
import DailyDashboardAggregator from '../services/dailyDashboardAggregator.js';

async function runDailyAggregation() {
  try {
    console.log('🚀 Starting manual daily aggregation...\n');
    
    const aggregator = new DailyDashboardAggregator();
    await aggregator.runDailyAggregation();
    
    console.log('\n✅ Daily aggregation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during daily aggregation:', error);
    process.exit(1);
  }
}

// Run the aggregation
runDailyAggregation();