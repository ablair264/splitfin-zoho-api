#!/usr/bin/env node

import '../config/firebase.js'; // Initialize Firebase first
import { getFirestore } from 'firebase-admin/firestore';
import DailyDashboardAggregator from '../services/dailyDashboardAggregator.js';

const db = getFirestore();
const aggregator = new DailyDashboardAggregator();

/**
 * Backfill agent-specific aggregates for historical data
 */
async function backfillAgentAggregates() {
  try {
    console.log('🚀 Starting agent aggregates backfill...\n');
    
    // Get date range from command line arguments or use defaults
    const args = process.argv.slice(2);
    let startDate = new Date();
    let endDate = new Date();
    
    if (args.length >= 2) {
      startDate = new Date(args[0]);
      endDate = new Date(args[1]);
    } else {
      // Default: last 90 days
      startDate.setDate(startDate.getDate() - 90);
      console.log('ℹ️  No date range specified. Using last 90 days.');
      console.log('   Usage: node backfillAgentAggregates.js YYYY-MM-DD YYYY-MM-DD\n');
    }
    
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // Get all agents
    const agentsSnapshot = await db.collection('sales_agents').get();
    console.log(`👥 Found ${agentsSnapshot.size} agents\n`);
    
    // Process each date
    const current = new Date(startDate);
    let daysProcessed = 0;
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      console.log(`\n📊 Processing ${dateStr}...`);
      
      // Check if overall aggregate exists for this date
      const overallAggregate = await db.collection('daily_aggregates').doc(dateStr).get();
      
      if (!overallAggregate.exists) {
        console.log('  ⚠️  No overall aggregate found. Creating both overall and agent aggregates...');
        await aggregator.calculateDailyAggregate(current);
      } else {
        // Check if agent aggregates exist
        let missingAgents = 0;
        
        for (const agentDoc of agentsSnapshot.docs) {
          const agentAggregate = await db
            .collection('sales_agents')
            .doc(agentDoc.id)
            .collection('daily_aggregates')
            .doc(dateStr)
            .get();
          
          if (!agentAggregate.exists) {
            missingAgents++;
          }
        }
        
        if (missingAgents > 0) {
          console.log(`  ⚠️  Missing aggregates for ${missingAgents} agents. Creating...`);
          await aggregator.calculateAgentDailyAggregates(
            new Date(current),
            new Date(current.getTime() + 24 * 60 * 60 * 1000 - 1)
          );
        } else {
          console.log('  ✅ All agent aggregates already exist');
        }
      }
      
      daysProcessed++;
      current.setDate(current.getDate() + 1);
      
      // Progress update every 10 days
      if (daysProcessed % 10 === 0) {
        console.log(`\n✅ Processed ${daysProcessed} days...`);
      }
    }
    
    console.log(`\n🎉 Backfill complete! Processed ${daysProcessed} days.`);
    
    // Verify results
    console.log('\n📊 Verification:');
    for (const agentDoc of agentsSnapshot.docs) {
      const agentData = agentDoc.data();
      const aggregatesCount = await db
        .collection('sales_agents')
        .doc(agentDoc.id)
        .collection('daily_aggregates')
        .where('date', '>=', startDate.toISOString().split('T')[0])
        .where('date', '<=', endDate.toISOString().split('T')[0])
        .count()
        .get();
      
      console.log(`  Agent ${agentData.name}: ${aggregatesCount.data().count} daily aggregates`);
    }
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the backfill
backfillAgentAggregates();