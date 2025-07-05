// server/src/services/firestoreSyncService.js
import { db } from './config/firebase.js'; // <-- IMPORT DB
import { db, auth } from './config/firebase.js';

class FirestoreSyncService {
  constructor() {
    this.db = db; // <-- USE THE IMPORTED DB
    this.listeners = new Map();
    this.lastSyncTimestamps = new Map();
    this.initialSyncCompleted = new Map();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Start comprehensive Firestore listeners for all collections
   */
  async startAllListeners() {
    console.log('🎧 Starting all Firestore sync listeners...');
    
    // Check initial sync status
    await this.checkInitialSyncStatus();
    
    this.startCustomerListener();
    this.startUsersListener();
    this.startProductsListener();
    
    console.log('✅ All Firestore sync listeners started');
  }

  /**
   * Check if initial sync has been completed for all collections
   */
  async checkInitialSyncStatus() {
    const collections = ['customers', 'users', 'products'];
    
    for (const collection of collections) {
      const metaDoc = await this.db.collection('sync_metadata').doc(collection).get();
      if (metaDoc.exists && metaDoc.data().initialSyncCompleted) {
        this.initialSyncCompleted.set(collection, true);
        console.log(`✅ ${collection} initial sync already completed`);
      } else {
        this.initialSyncCompleted.set(collection, false);
        console.log(`⚠️ ${collection} needs initial sync`);
      }
    }
  }

  /**
   * Stop all active listeners
   */
  stopAllListeners() {
    console.log('🛑 Stopping all Firestore sync listeners...');
    
    this.listeners.forEach((unsubscribe, collection) => {
      unsubscribe();
      console.log(`📌 Stopped listener for ${collection}`);
    });
    
    this.listeners.clear();
    console.log('✅ All Firestore sync listeners stopped');
  }

  /**
   * Listen for customer changes and broadcast updates
   */
  startCustomerListener() {
    let query = this.db.collection('customers');
    
    // In production, only listen for recent changes after initial sync
    if (this.isProduction && this.initialSyncCompleted.get('customers')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query = query.where('lastModified', '>', admin.firestore.Timestamp.fromDate(fiveMinutesAgo));
    }
    
    const unsubscribe = query.onSnapshot(
      (snapshot) => this.handleCustomerSnapshot(snapshot),
      (error) => this.handleError('customers', error)
    );
    
    this.listeners.set('customers', unsubscribe);
    console.log('👥 Customer listener started');
  }

  /**
   * Listen for users (sales agents) changes
   */
  startUsersListener() {
    let query = this.db.collection('users')
      .where('role', '==', 'Sales Agent');
    
    // In production, only listen for recent changes after initial sync
    if (this.isProduction && this.initialSyncCompleted.get('users')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query = query.where('lastModified', '>', admin.firestore.Timestamp.fromDate(fiveMinutesAgo));
    }
    
    const unsubscribe = query.onSnapshot(
      (snapshot) => this.handleUsersSnapshot(snapshot),
      (error) => this.handleError('users', error)
    );
    
    this.listeners.set('users', unsubscribe);
    console.log('👤 Users/Sales Agents listener started');
  }

  /**
   * Listen for product changes
   */
  startProductsListener() {
    let query = this.db.collection('products');
    
    // In production, only listen for recent changes after initial sync
    if (this.isProduction && this.initialSyncCompleted.get('products')) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      query = query.where('lastModified', '>', admin.firestore.Timestamp.fromDate(fiveMinutesAgo));
    }
    
    const unsubscribe = query.onSnapshot(
      (snapshot) => this.handleProductsSnapshot(snapshot),
      (error) => this.handleError('products', error)
    );
    
    this.listeners.set('products', unsubscribe);
    console.log('📦 Products listener started');
  }

  /**
   * Handle customer snapshot changes
   */
  async handleCustomerSnapshot(snapshot) {
    if (snapshot.empty) return;

    const changes = [];
    const now = Date.now();
    let processedCount = 0;

    // Limit processing in production
    const maxChangesToProcess = this.isProduction ? 50 : snapshot.size;

    for (const docChange of snapshot.docChanges()) {
      if (processedCount >= maxChangesToProcess) {
        console.log(`⚠️ Limiting customer changes to ${maxChangesToProcess} items`);
        break;
      }

      const customerData = {
        id: docChange.doc.id,
        data: docChange.doc.data(),
        changeType: docChange.type, // 'added', 'modified', 'removed'
        timestamp: now
      };

      // Only include customers that have been modified recently
      if (this.isRecentChange(customerData.data.lastModified, 'customers')) {
        changes.push(customerData);
        console.log(`👥 Customer ${docChange.type}: ${customerData.data.Account_Name || customerData.id}`);
        processedCount++;
      }
    }

    if (changes.length > 0) {
      await this.broadcastChanges('customers', changes);
      this.updateLastSyncTimestamp('customers', now);
    }
  }

  /**
   * Handle users/sales agents snapshot changes
   */
  async handleUsersSnapshot(snapshot) {
    if (snapshot.empty) return;

    const changes = [];
    const now = Date.now();
    let processedCount = 0;

    // Limit processing in production
    const maxChangesToProcess = this.isProduction ? 20 : snapshot.size;

    for (const docChange of snapshot.docChanges()) {
      if (processedCount >= maxChangesToProcess) {
        console.log(`⚠️ Limiting user changes to ${maxChangesToProcess} items`);
        break;
      }

      const userData = {
        id: docChange.doc.id,
        data: docChange.doc.data(),
        changeType: docChange.type,
        timestamp: now
      };

      changes.push(userData);
      console.log(`👤 User ${docChange.type}: ${userData.data.name || userData.id}`);
      processedCount++;
    }

    if (changes.length > 0) {
      await this.broadcastChanges('users', changes);
      this.updateLastSyncTimestamp('users', now);
    }
  }

  /**
   * Handle products snapshot changes
   */
  async handleProductsSnapshot(snapshot) {
    if (snapshot.empty) return;

    const changes = [];
    const now = Date.now();
    let processedCount = 0;

    // Limit processing in production
    const maxChangesToProcess = this.isProduction ? 100 : Math.min(snapshot.size, 500);

    for (const docChange of snapshot.docChanges()) {
      if (processedCount >= maxChangesToProcess) {
        console.log(`⚠️ Limiting product changes to ${maxChangesToProcess} items`);
        break;
      }

      const productData = {
        id: docChange.doc.id,
        data: docChange.doc.data(),
        changeType: docChange.type,
        timestamp: now
      };

      // Only include products that have been modified recently
      if (this.isRecentChange(productData.data.lastModified, 'products')) {
        changes.push(productData);
        console.log(`📦 Product ${docChange.type}: ${productData.data.name || productData.id}`);
        processedCount++;
      }
    }

    if (changes.length > 0) {
      await this.broadcastChanges('products', changes);
      this.updateLastSyncTimestamp('products', now);
    }
  }

  /**
   * Check if a change is recent enough to broadcast
   */
  isRecentChange(lastModified, collection) {
    if (!lastModified) return true; // Always include if no timestamp

    const lastSyncTime = this.lastSyncTimestamps.get(collection) || 0;
    const changeTime = lastModified.toDate ? lastModified.toDate().getTime() : lastModified;
    
    // In production, only sync changes from last 5 minutes
    if (this.isProduction) {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      return changeTime > Math.max(lastSyncTime, fiveMinutesAgo);
    }
    
    return changeTime > lastSyncTime;
  }

  /**
   * Update the last sync timestamp for a collection
   */
  updateLastSyncTimestamp(collection, timestamp) {
    this.lastSyncTimestamps.set(collection, timestamp);
  }

  /**
   * Helper function to safely extract field values, filtering out undefined values
   */
  safeExtractFields(data, fields) {
    const result = {};
    fields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        result[field] = data[field];
      }
    });
    return result;
  }

  /**
   * Optimized broadcast changes with batching and notifications
   */
  async broadcastChanges(collection, changes) {
    console.log(`📡 Broadcasting ${changes.length} changes for ${collection}`);
    
    // Skip if no changes
    if (changes.length === 0) return;
    
    // For large change sets, use bulk notification instead
    if (changes.length > 100) {
      await this.createBulkNotification(collection, changes.length);
      return;
    }
    
    // For smaller changes, batch them
    const BATCH_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < changes.length; i += BATCH_SIZE) {
      chunks.push(changes.slice(i, i + BATCH_SIZE));
    }
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const batch = this.db.batch();
      
      chunk.forEach(change => {
        const syncDoc = this.db.collection('sync_queue').doc();
        
        // Store minimal data to reduce document size
        const syncData = {
          collection,
          changeType: change.changeType,
          documentId: change.id,
          timestamp: new Date(),
          processed: false
        };
        
        // Only include essential fields for each collection type, filtering out undefined values
        if (collection === 'products' && change.data) {
          syncData.essentialData = this.safeExtractFields(change.data, [
            'name', 'sku', 'rate', 'stock_on_hand', 'status'
          ]);
        } else if (collection === 'customers' && change.data) {
          syncData.essentialData = this.safeExtractFields(change.data, [
            'Account_Name', 'Primary_Email', 'Phone'
          ]);
          
          // Handle Agent field separately as it might be an object
          if (change.data.Agent !== undefined && change.data.Agent !== null) {
            syncData.essentialData.Agent = change.data.Agent;
          }
        } else if (collection === 'users' && change.data) {
          syncData.essentialData = this.safeExtractFields(change.data, [
            'name', 'email', 'role', 'zohoCRMId'
          ]);
        }
        
        batch.set(syncDoc, syncData);
      });

      try {
        await batch.commit();
        console.log(`✅ Queued batch ${i + 1}/${chunks.length} (${chunk.length} changes) for ${collection}`);
        
        // Add delay between batches to avoid overwhelming the system
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Failed to queue batch ${i + 1} for ${collection}:`, error);
      }
    }

    // Send push notifications
    await this.sendPushNotifications(collection, changes);
  }

  /**
   * Create bulk notification for large change sets
   */
  async createBulkNotification(collection, changeCount) {
    try {
      const notification = {
        type: 'bulk_update',
        collection,
        changeCount,
        message: `${changeCount} ${collection} have been updated. Please sync to get latest data.`,
        timestamp: new Date(),
        processed: false
      };
      
      await this.db.collection('sync_notifications').add(notification);
      console.log(`📢 Bulk update notification created for ${changeCount} ${collection}`);
    } catch (error) {
      console.error(`❌ Failed to create bulk notification:`, error);
    }
  }

  /**
   * Send push notifications to apps about data changes
   */
  async sendPushNotifications(collection, changes) {
    // Skip push notifications for now, but this is where you'd integrate
    // with Firebase Cloud Messaging (FCM) to notify apps of changes
    console.log(`🔔 Would send push notification for ${changes.length} ${collection} changes`);
  }

  /**
   * Handle listener errors
   */
  handleError(collection, error) {
    console.error(`❌ Firestore listener error for ${collection}:`, error);
    
    // Attempt to restart the listener after a delay
    setTimeout(() => {
      console.log(`🔄 Attempting to restart ${collection} listener...`);
      
      if (collection === 'customers') this.startCustomerListener();
      else if (collection === 'users') this.startUsersListener();
      else if (collection === 'products') this.startProductsListener();
      
    }, 5000);
  }

  /**
   * Get pending sync changes for a specific agent or all changes
   */
  async getPendingSyncChanges(agentId = null, lastSyncTime = null) {
    let query = this.db.collection('sync_queue')
      .where('processed', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(100); // Always limit to prevent large reads

    if (lastSyncTime) {
      query = query.where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date(lastSyncTime)));
    }

    try {
      const snapshot = await query.get();
      
      const changes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()?.getTime() || Date.now()
      }));

      // Filter changes based on agent permissions if specified
      if (agentId) {
        return this.filterChangesForAgent(changes, agentId);
      }

      return changes;
    } catch (error) {
      console.error('❌ Error fetching pending sync changes:', error);
      return [];
    }
  }

  /**
   * Get bulk notifications for a collection
   */
  async getBulkNotifications(collection = null, since = null) {
    let query = this.db.collection('sync_notifications')
      .where('processed', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(10);

    if (collection) {
      query = query.where('collection', '==', collection);
    }

    if (since) {
      query = query.where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date(since)));
    }

    try {
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching bulk notifications:', error);
      return [];
    }
  }

  /**
   * Filter changes based on agent permissions
   */
  filterChangesForAgent(changes, agentId) {
    return changes.filter(change => {
      // For customers, only return customers assigned to this agent
      if (change.collection === 'customers') {
        return change.essentialData?.Agent?.id === agentId;
      }
      
      // For users and products, return all changes
      return true;
    });
  }

  /**
   * Mark sync changes as processed
   */
  async markChangesAsProcessed(changeIds) {
    if (!changeIds || changeIds.length === 0) return;

    const BATCH_SIZE = 500;
    const chunks = [];
    
    for (let i = 0; i < changeIds.length; i += BATCH_SIZE) {
      chunks.push(changeIds.slice(i, i + BATCH_SIZE));
    }

    for (const chunk of chunks) {
      const batch = this.db.batch();
      
      chunk.forEach(changeId => {
        const docRef = this.db.collection('sync_queue').doc(changeId);
        batch.update(docRef, { 
          processed: true,
          processedAt: new Date()
        });
      });

      try {
        await batch.commit();
        console.log(`✅ Marked ${chunk.length} changes as processed`);
      } catch (error) {
        console.error('❌ Error marking changes as processed:', error);
      }
    }
  }

  /**
   * Mark bulk notifications as processed
   */
  async markNotificationAsProcessed(notificationId) {
    try {
      await this.db.collection('sync_notifications').doc(notificationId).update({
        processed: true,
        processedAt: new Date()
      });
      console.log(`✅ Marked notification ${notificationId} as processed`);
    } catch (error) {
      console.error('❌ Error marking notification as processed:', error);
    }
  }

  /**
   * Clean up old processed sync changes
   */
  async cleanupOldSyncChanges() {
    const cleanupAge = this.isProduction 
      ? 3 * 24 * 60 * 60 * 1000  // 3 days in production
      : 7 * 24 * 60 * 60 * 1000; // 7 days in development
      
    const cutoffDate = new Date(Date.now() - cleanupAge);
    
    try {
      // Clean sync_queue
      const syncSnapshot = await this.db.collection('sync_queue')
        .where('processed', '==', true)
        .where('processedAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(500)
        .get();

      if (!syncSnapshot.empty) {
        const batch = this.db.batch();
        syncSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🧹 Cleaned up ${syncSnapshot.size} old sync changes`);
      }

      // Clean sync_notifications
      const notifSnapshot = await this.db.collection('sync_notifications')
        .where('processed', '==', true)
        .where('processedAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(100)
        .get();

      if (!notifSnapshot.empty) {
        const batch = this.db.batch();
        notifSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🧹 Cleaned up ${notifSnapshot.size} old notifications`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old sync changes:', error);
    }
  }

  /**
   * Mark initial sync as completed for a collection
   */
  async markInitialSyncComplete(collection) {
    try {
      this.initialSyncCompleted.set(collection, true);
      await this.db.collection('sync_metadata').doc(collection).set({
        initialSyncCompleted: true,
        initialSyncDate: new Date()
      }, { merge: true });
      console.log(`✅ Marked initial sync complete for ${collection}`);
    } catch (error) {
      console.error(`❌ Error marking initial sync complete for ${collection}:`, error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      activeListeners: Array.from(this.listeners.keys()),
      lastSyncTimestamps: Object.fromEntries(this.lastSyncTimestamps),
      initialSyncStatus: Object.fromEntries(this.initialSyncCompleted),
      isRunning: this.listeners.size > 0,
      environment: this.isProduction ? 'production' : 'development'
    };
  }
}

// Export singleton instance
export default new FirestoreSyncService();