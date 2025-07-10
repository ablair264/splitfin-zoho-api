#!/usr/bin/env node

import '../config/firebase.js'; // Initialize Firebase first
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

/**
 * Test agent dashboard performance
 */
async function testAgentDashboardPerformance() {
  try {
    console.log('🧪 Testing Agent Dashboard Performance\n');
    
    // Get first agent
    const agentsSnapshot = await db.collection('sales_agents').limit(1).get();
    if (agentsSnapshot.empty) {
      console.log('❌ No agents found');
      return;
    }
    
    const agentDoc = agentsSnapshot.docs[0];
    const agentData = agentDoc.data();
    const agentId = agentDoc.id;
    
    console.log(`👤 Testing with agent: ${agentData.name} (${agentId})\n`);
    
    // Test 1: Check if agent has daily aggregates
    console.log('📊 Test 1: Checking for daily aggregates...');
    const startTime1 = Date.now();
    
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const aggregatesSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('daily_aggregates')
      .where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
      .where('date', '<=', today.toISOString().split('T')[0])
      .get();
    
    const queryTime1 = Date.now() - startTime1;
    console.log(`  ✅ Found ${aggregatesSnapshot.size} daily aggregates`);
    console.log(`  ⏱️  Query time: ${queryTime1}ms\n`);
    
    if (aggregatesSnapshot.empty) {
      console.log('  ⚠️  No aggregates found! Run backfillAgentAggregates.js first.\n');
    }
    
    // Test 2: Compare with querying orders directly
    console.log('📊 Test 2: Comparing with direct order queries...');
    const startTime2 = Date.now();
    
    const ordersSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('customers_orders')
      .where('order_date', '>=', thirtyDaysAgo.toISOString())
      .where('order_date', '<=', today.toISOString())
      .get();
    
    const queryTime2 = Date.now() - startTime2;
    console.log(`  ✅ Found ${ordersSnapshot.size} orders`);
    console.log(`  ⏱️  Query time: ${queryTime2}ms\n`);
    
    // Test 3: Calculate metrics from aggregates
    console.log('📊 Test 3: Calculating dashboard metrics...');
    const startTime3 = Date.now();
    
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalCommission = 0;
    
    aggregatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      totalRevenue += data.totalRevenue || 0;
      totalOrders += data.totalOrders || 0;
      totalCommission += data.commission || 0;
    });
    
    const calcTime = Date.now() - startTime3;
    
    console.log(`  💰 Total Revenue: £${totalRevenue.toFixed(2)}`);
    console.log(`  📦 Total Orders: ${totalOrders}`);
    console.log(`  💵 Total Commission: £${totalCommission.toFixed(2)}`);
    console.log(`  ⏱️  Calculation time: ${calcTime}ms\n`);
    
    // Summary
    console.log('📈 Performance Summary:');
    console.log(`  Daily Aggregates Query: ${queryTime1}ms`);
    console.log(`  Direct Orders Query: ${queryTime2}ms`);
    console.log(`  Metrics Calculation: ${calcTime}ms`);
    console.log(`  Total Dashboard Time: ${queryTime1 + calcTime}ms\n`);
    
    const improvement = ((queryTime2 - (queryTime1 + calcTime)) / queryTime2 * 100).toFixed(1);
    if (improvement > 0) {
      console.log(`  🚀 Performance improvement: ${improvement}% faster with aggregates!`);
    } else {
      console.log(`  ⚠️  Aggregates not providing performance benefit. Check if they exist.`);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
  
  process.exit(0);
}

// Run the test
testAgentDashboardPerformance();