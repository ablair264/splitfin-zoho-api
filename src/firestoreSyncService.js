// server/src/services/firestoreSyncService.js
import admin from 'firebase-admin';

class FirestoreSyncService {
  constructor() {
    this.db = admin.firestore();
    this.listeners = new Map();
    this.lastSyncTimestamps = new Map();
  }

  /**
   * Start comprehensive Firestore listeners for all collections
   */
  startAllListeners() {
    console.log('🎧 Starting all Firestore sync listeners...');
    
    this.startCustomerListener();
    this.startUsersListener();
    this.startProductsListener();
    
    console.log('✅ All Firestore sync listeners started');
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
    const unsubscribe = this.db.collection('customers')
      .onSnapshot(
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
    const unsubscribe = this.db.collection('users')
      .where('role', '==', 'Sales Agent')
      .onSnapshot(
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
    const unsubscribe = this.db.collection('products')
      .onSnapshot(
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

    for (const docChange of snapshot.docChanges()) {
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

    for (const docChange of snapshot.docChanges()) {
      const userData = {
        id: docChange.doc.id,
        data: docChange.doc.data(),
        changeType: docChange.type,
        timestamp: now
      };

      changes.push(userData);
      console.log(`👤 User ${docChange.type}: ${userData.data.name || userData.id}`);
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

    for (const docChange of snapshot.docChanges()) {
      const productData = {
        id: docChange.doc.id,
        data: docChange.doc.data(),
        changeType: docChange.type,
        timestamp: now
      };

      changes.push(productData);
      console.log(`📦 Product ${docChange.type}: ${productData.data.name || productData.id}`);
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
    
    return changeTime > lastSyncTime;
  }

  /**
   * Update the last sync timestamp for a collection
   */
  updateLastSyncTimestamp(collection, timestamp) {
    this.lastSyncTimestamps.set(collection, timestamp);
  }

  /**
   * Broadcast changes to connected clients
   * This could be WebSockets, Server-Sent Events, or a push notification service
   */
  async broadcastChanges(collection, changes) {
    console.log(`📡 Broadcasting ${changes.length} changes for ${collection}`);
    
    // Store changes in a 'sync_queue' collection for apps to poll
    const batch = this.db.batch();
    
    changes.forEach(change => {
      const syncDoc = this.db.collection('sync_queue').doc();
      batch.set(syncDoc, {
        collection,
        changeType: change.changeType,
        documentId: change.id,
        data: change.data,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        processed: false
      });
    });

    try {
      await batch.commit();
      console.log(`✅ Queued ${changes.length} changes for ${collection}`);
    } catch (error) {
      console.error(`❌ Failed to queue changes for ${collection}:`, error);
    }

    // Optional: Send push notifications to apps
    await this.sendPushNotifications(collection, changes);
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
      .limit(100);

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
   * Filter changes based on agent permissions
   */
  filterChangesForAgent(changes, agentId) {
    return changes.filter(change => {
      // For customers, only return customers assigned to this agent
      if (change.collection === 'customers') {
        return change.data?.Agent?.id === agentId;
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

    const batch = this.db.batch();
    
    changeIds.forEach(changeId => {
      const docRef = this.db.collection('sync_queue').doc(changeId);
      batch.update(docRef, { 
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    try {
      await batch.commit();
      console.log(`✅ Marked ${changeIds.length} changes as processed`);
    } catch (error) {
      console.error('❌ Error marking changes as processed:', error);
    }
  }

  /**
   * Clean up old processed sync changes
   */
  async cleanupOldSyncChanges() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    try {
      const snapshot = await this.db.collection('sync_queue')
        .where('processed', '==', true)
        .where('processedAt', '<', admin.firestore.Timestamp.fromDate(oneWeekAgo))
        .limit(500)
        .get();

      if (snapshot.empty) return;

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`🧹 Cleaned up ${snapshot.size} old sync changes`);
    } catch (error) {
      console.error('❌ Error cleaning up old sync changes:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      activeListeners: Array.from(this.listeners.keys()),
      lastSyncTimestamps: Object.fromEntries(this.lastSyncTimestamps),
      isRunning: this.listeners.size > 0
    };
  }
}

// Export singleton instance
export default new FirestoreSyncService();