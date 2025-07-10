// Quick backfill endpoint for Render
// This creates an API endpoint to trigger the backfill process

import DailyDashboardAggregator from './dailyDashboardAggregator.js';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function backfillAgentAggregatesForUser(userId) {
    try {
        console.log(`🔍 Backfilling aggregates for user: ${userId}`);
        
        // Find the agent by user ID
        const agentQuery = await db.collection('sales_agents')
            .where('uid', '==', userId)
            .limit(1)
            .get();
            
        if (agentQuery.empty) {
            throw new Error(`No agent found for user ID: ${userId}`);
        }
        
        const agentDoc = agentQuery.docs[0];
        const agentId = agentDoc.id;
        const agentData = agentDoc.data();
        
        console.log(`✅ Found agent: ${agentData.name} (${agentId})`);
        
        // Get date range - last 90 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        
        // Process each date
        const aggregator = new DailyDashboardAggregator();
        const current = new Date(startDate);
        let daysProcessed = 0;
        
        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            
            // Check if aggregate already exists
            const existingAggregate = await db
                .collection('sales_agents')
                .doc(agentId)
                .collection('daily_aggregates')
                .doc(dateStr)
                .get();
            
            if (!existingAggregate.exists) {
                console.log(`📊 Creating aggregate for ${dateStr}...`);
                await aggregator.calculateAgentDailyAggregates(
                    new Date(current),
                    new Date(current.getTime() + 24 * 60 * 60 * 1000 - 1)
                );
                daysProcessed++;
            }
            
            current.setDate(current.getDate() + 1);
        }
        
        console.log(`✅ Backfill complete! Created ${daysProcessed} daily aggregates for agent ${agentData.name}`);
        
        return {
            success: true,
            agentId,
            agentName: agentData.name,
            daysProcessed,
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            }
        };
        
    } catch (error) {
        console.error('❌ Backfill error:', error);
        throw error;
    }
}

export async function backfillAllAgents() {
    try {
        console.log('🚀 Starting backfill for ALL agents...');
        
        const aggregator = new DailyDashboardAggregator();
        
        // Get date range - last 90 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        
        await aggregator.backfillDailyAggregates(startDate, endDate);
        
        return {
            success: true,
            message: 'Backfill started for all agents',
            dateRange: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            }
        };
        
    } catch (error) {
        console.error('❌ Backfill all error:', error);
        throw error;
    }
}