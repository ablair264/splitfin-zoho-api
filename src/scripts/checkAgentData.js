#!/usr/bin/env node

import '../config/firebase.js'; // Initialize Firebase first
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

async function checkAgentData(userId) {
  try {
    console.log(`\n🔍 Checking data for user: ${userId}\n`);
    
    // 1. Find agent by user ID
    const agentQuery = await db.collection('sales_agents')
      .where('uid', '==', userId)
      .limit(1)
      .get();
    
    if (agentQuery.empty) {
      console.log('❌ No agent found with this user ID');
      console.log('   Checking if user exists...');
      
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log(`   ✅ User exists: ${userData.email}`);
        console.log(`   Role: ${userData.role || 'not set'}`);
      } else {
        console.log('   ❌ User document not found');
      }
      return;
    }
    
    const agentDoc = agentQuery.docs[0];
    const agentData = agentDoc.data();
    const agentId = agentDoc.id;
    
    console.log(`✅ Agent found:`);
    console.log(`   Name: ${agentData.name}`);
    console.log(`   ID: ${agentId}`);
    console.log(`   Zoho ID: ${agentData.zohospID || 'not set'}`);
    
    // 2. Check for daily aggregates
    console.log(`\n📊 Checking daily aggregates...`);
    const aggregatesSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('daily_aggregates')
      .orderBy('date', 'desc')
      .limit(10)
      .get();
    
    if (aggregatesSnapshot.empty) {
      console.log('   ❌ No daily aggregates found');
    } else {
      console.log(`   ✅ Found ${aggregatesSnapshot.size} recent aggregates:`);
      aggregatesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`      ${data.date}: ${data.totalOrders} orders, £${data.totalRevenue}`);
      });
    }
    
    // 3. Check for orders in subcollection
    console.log(`\n📦 Checking orders...`);
    const ordersSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('customers_orders')
      .orderBy('order_date', 'desc')
      .limit(5)
      .get();
    
    if (ordersSnapshot.empty) {
      console.log('   ❌ No orders found in subcollection');
    } else {
      console.log(`   ✅ Found recent orders:`);
      ordersSnapshot.docs.forEach(doc => {
        const order = doc.data();
        console.log(`      ${order.order_date}: ${order.customer_name} - £${order.total}`);
      });
    }
    
    // 4. Check assigned customers
    console.log(`\n👥 Checking assigned customers...`);
    const customersSnapshot = await db
      .collection('sales_agents')
      .doc(agentId)
      .collection('assigned_customers')
      .limit(5)
      .get();
    
    if (customersSnapshot.empty) {
      console.log('   ❌ No assigned customers found');
    } else {
      console.log(`   ✅ Found ${customersSnapshot.size} assigned customers`);
    }
    
    // 5. Recommendation
    console.log(`\n💡 Recommendation:`);
    if (aggregatesSnapshot.empty && !ordersSnapshot.empty) {
      console.log('   Run backfill to create daily aggregates from existing orders');
      console.log(`   Command: npm run backfill-agent-aggregates ${userId}`);
    } else if (ordersSnapshot.empty) {
      console.log('   No orders found. Agent may not have any sales data yet.');
    } else {
      console.log('   Agent data looks good!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node checkAgentData.js <userId>');
  console.log('Example: node checkAgentData.js U1G9cYFSCCfp4U5mqSfDPVsDaF22');
  process.exit(1);
}

checkAgentData(userId);