// syncMonitor.js - Monitor sync performance and detect issues
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

class SyncMonitor {
  /**
   * Get sync statistics for a specific sync type
   */
  async getSyncStats(syncType = 'high_frequency_sync') {
    try {
      const doc = await db.collection('sync_metadata').doc(syncType).get();
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      const lastSync = data.lastSyncTimestamp ? new Date(data.lastSyncTimestamp) : null;
      const timeSinceLastSync = lastSync ? Date.now() - lastSync.getTime() : null;
      
      return {
        syncType,
        lastSync: lastSync?.toISOString(),
        timeSinceLastSync: timeSinceLastSync ? `${Math.round(timeSinceLastSync / 1000 / 60)} minutes` : 'Never',
        lastRecordsProcessed: data.recordsProcessed,
        status: data.status || 'unknown'
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return null;
    }
  }

  /**
   * Get all sync statistics
   */
  async getAllSyncStats() {
    const syncTypes = ['high_frequency_sync', 'medium_frequency_sync', 'low_frequency_sync'];
    const stats = {};
    
    for (const type of syncTypes) {
      stats[type] = await this.getSyncStats(type);
    }
    
    return stats;
  }

  /**
   * Check for sync issues
   */
  async checkSyncHealth() {
    const issues = [];
    const stats = await this.getAllSyncStats();
    
    // Check high frequency sync (should run every 15 minutes)
    if (stats.high_frequency_sync) {
      const lastSync = new Date(stats.high_frequency_sync.lastSync);
      const minutesSinceSync = (Date.now() - lastSync.getTime()) / 1000 / 60;
      
      if (minutesSinceSync > 30) {
        issues.push({
          severity: 'high',
          type: 'high_frequency_sync',
          message: `High frequency sync hasn't run in ${Math.round(minutesSinceSync)} minutes (expected: every 15 minutes)`
        });
      }
      
      // Check if too many records are being processed
      const records = stats.high_frequency_sync.lastRecordsProcessed;
      if (records?.orders?.total > 300) {
        issues.push({
          severity: 'medium',
          type: 'high_frequency_sync',
          message: `Processing ${records.orders.total} orders in high frequency sync (this seems high for a 15-minute window)`
        });
      }
      
      // Check if mostly unchanged records
      if (records?.orders && records.orders.unchanged > records.orders.total * 0.9) {
        issues.push({
          severity: 'low',
          type: 'high_frequency_sync',
          message: `90%+ of orders are unchanged - consider reducing sync frequency or improving change detection`
        });
      }
    }
    
    // Check medium frequency sync (should run every 2-4 hours)
    if (stats.medium_frequency_sync) {
      const lastSync = new Date(stats.medium_frequency_sync.lastSync);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / 1000 / 60 / 60;
      
      if (hoursSinceSync > 6) {
        issues.push({
          severity: 'medium',
          type: 'medium_frequency_sync',
          message: `Medium frequency sync hasn't run in ${Math.round(hoursSinceSync)} hours (expected: every 2-4 hours)`
        });
      }
    }
    
    // Check low frequency sync (should run daily)
    if (stats.low_frequency_sync) {
      const lastSync = new Date(stats.low_frequency_sync.lastSync);
      const daysSinceSync = (Date.now() - lastSync.getTime()) / 1000 / 60 / 60 / 24;
      
      if (daysSinceSync > 2) {
        issues.push({
          severity: 'medium',
          type: 'low_frequency_sync',
          message: `Daily sync hasn't run in ${Math.round(daysSinceSync)} days`
        });
      }
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      stats
    };
  }

  /**
   * Get recent order statistics
   */
  async getOrderStats(hours = 24) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const ordersSnapshot = await db.collection('sales_orders')
        .where('_lastSynced', '>=', since)
        .get();
      
      const modifiedCount = ordersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.last_modified_time && new Date(data.last_modified_time) >= since;
      }).length;
      
      return {
        totalSynced: ordersSnapshot.size,
        actuallyModified: modifiedCount,
        percentModified: ordersSnapshot.size > 0 ? (modifiedCount / ordersSnapshot.size * 100).toFixed(1) : 0,
        period: `last ${hours} hours`
      };
    } catch (error) {
      console.error('Error getting order stats:', error);
      return null;
    }
  }

  /**
   * Generate a sync report
   */
  async generateReport() {
    console.log('📊 Sync Monitor Report');
    console.log('====================\n');
    
    const health = await this.checkSyncHealth();
    
    // Overall health
    console.log(`Overall Health: ${health.healthy ? '✅ Healthy' : '⚠️ Issues Detected'}\n`);
    
    // Sync statistics
    console.log('Sync Statistics:');
    Object.entries(health.stats).forEach(([type, stats]) => {
      if (stats) {
        console.log(`\n${type}:`);
        console.log(`  Last run: ${stats.lastSync || 'Never'}`);
        console.log(`  Time since: ${stats.timeSinceLastSync}`);
        if (stats.lastRecordsProcessed) {
          const records = stats.lastRecordsProcessed;
          if (records.orders) {
            console.log(`  Orders: ${records.orders.new} new, ${records.orders.updated} updated, ${records.orders.unchanged} unchanged (${records.orders.total} total)`);
          }
          if (records.invoices) {
            console.log(`  Invoices: ${records.invoices.new} new, ${records.invoices.updated} updated, ${records.invoices.unchanged} unchanged (${records.invoices.total} total)`);
          }
        }
      }
    });
    
    // Issues
    if (health.issues.length > 0) {
      console.log('\n⚠️ Issues:');
      health.issues.forEach(issue => {
        const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
    }
    
    // Order statistics
    const orderStats = await this.getOrderStats(24);
    if (orderStats) {
      console.log('\nOrder Statistics (last 24 hours):');
      console.log(`  Total synced: ${orderStats.totalSynced}`);
      console.log(`  Actually modified: ${orderStats.actuallyModified} (${orderStats.percentModified}%)`);
    }
    
    console.log('\n====================');
  }
}

// Run the monitor
const monitor = new SyncMonitor();
monitor.generateReport().then(() => process.exit(0));