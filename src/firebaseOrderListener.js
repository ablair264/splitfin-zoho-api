// server/src/firebaseOrderListener.js
import { db } from './config/firebase.js'; // <-- IMPORT DB
import { createSalesOrder } from './api/zoho.js';
import admin from 'firebase-admin';


class FirebaseOrderListener {
  constructor() {
    this.db = db; // <-- USE THE IMPORTED DB
    this.isListening = false;
    this.unsubscribe = null;
  }

  /**
   * Start listening for orders that need Zoho upload
   */
  startListening() {
    if (this.isListening) {
      console.log('📡 Firebase listener already running');
      return;
    }

    console.log('🎧 Starting Firebase order listener...');
    
    // Listen for orders with needsZohoUpload = true
    this.unsubscribe = this.db.collection('orders')
      .where('needsZohoUpload', '==', true)
      .onSnapshot(
        (snapshot) => this.handleOrderSnapshot(snapshot),
        (error) => this.handleError(error)
      );

    this.isListening = true;
    console.log('✅ Firebase order listener started');
  }

  /**
   * Stop listening for order changes
   */
  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isListening = false;
    console.log('🛑 Firebase order listener stopped');
  }

  /**
   * Handle incoming order snapshots
   */
  async handleOrderSnapshot(snapshot) {
    if (snapshot.empty) {
      return;
    }

    console.log(`📦 Found ${snapshot.size} orders needing Zoho upload`);

    // Process each order
    for (const doc of snapshot.docs) {
      const orderData = doc.data();
      const orderId = doc.id;

      try {
        await this.processOrder(orderId, orderData);
      } catch (error) {
        console.error(`❌ Failed to process order ${orderId}:`, error.message);
        await this.markOrderError(orderId, error.message);
      }
    }
  }

  /**
   * Process individual order and upload to Zoho
   */
  async processOrder(orderId, orderData) {
    console.log(`🔄 Processing order ${orderId}...`);

    // Validate required fields
    const { firebaseUID, customer_id, line_items, status } = orderData;
    
    if (!firebaseUID || !customer_id || !Array.isArray(line_items) || line_items.length === 0) {
      throw new Error('Missing required order data');
    }

    // Get agent information
    const agentZohoID = await this.getAgentZohoID(firebaseUID);
    if (!agentZohoID) {
      throw new Error('Agent Zoho CRM ID not found');
    }

    // Prepare order for Zoho
    const zohoOrderData = {
      zohoCustID: customer_id,
      items: line_items,
      agentZohoCRMId: agentZohoID
    };

    console.log(`📤 Uploading order ${orderId} to Zoho...`);

    // Create sales order in Zoho
    const zohoResponse = await createSalesOrder(zohoOrderData);

    if (!zohoResponse.salesorder) {
      throw new Error('Invalid Zoho response');
    }

    // Update order with Zoho information
    await this.markOrderUploaded(orderId, zohoResponse);

    console.log(`✅ Order ${orderId} successfully uploaded to Zoho as ${zohoResponse.salesorder.salesorder_number}`);
  }

  /**
   * Get agent's Zoho CRM ID from Firebase
   */
  async getAgentZohoID(firebaseUID) {
    try {
      const userDoc = await this.db.collection('users').doc(firebaseUID).get();
      
      if (!userDoc.exists) {
        throw new Error('User not found in Firebase');
      }

      const userData = userDoc.data();
      const agentId = userData.zohospID || userData.agentID;
    } catch (error) {
      console.error(`❌ Error fetching agent data for ${firebaseUID}:`, error.message);
      return null;
    }
  }

  /**
   * Mark order as successfully uploaded to Zoho
   */
  async markOrderUploaded(orderId, zohoResponse) {
    const updateData = {
      needsZohoUpload: false,
      zohoUploaded: true,
      zohoOrderID: zohoResponse.salesorder.salesorder_id,
      zohoOrderNumber: zohoResponse.salesorder.salesorder_number,
      zohoUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      zohoResponse: zohoResponse
    };

    await this.db.collection('orders').doc(orderId).update(updateData);
    console.log(`📝 Order ${orderId} marked as uploaded to Zoho`);
  }

  /**
   * Mark order as having an error during upload
   */
  async markOrderError(orderId, errorMessage) {
    const updateData = {
      needsZohoUpload: false,
      zohoUploadError: true,
      zohoUploadErrorMessage: errorMessage,
      zohoUploadErrorAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await this.db.collection('orders').doc(orderId).update(updateData);
    console.log(`❌ Order ${orderId} marked with error: ${errorMessage}`);
  }

  /**
   * Handle listener errors
   */
  handleError(error) {
    console.error('❌ Firebase listener error:', error);
    
    // Attempt to restart listener after a delay
    setTimeout(() => {
      if (!this.isListening) {
        console.log('🔄 Attempting to restart Firebase listener...');
        this.startListening();
      }
    }, 5000);
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      hasUnsubscribe: !!this.unsubscribe
    };
  }

  /**
   * Manually process a specific order (for debugging/retries)
   */
  async processOrderById(orderId) {
    try {
      const doc = await this.db.collection('orders').doc(orderId).get();
      
      if (!doc.exists) {
        throw new Error('Order not found');
      }

      const orderData = doc.data();
      await this.processOrder(orderId, orderData);
      
      return { success: true, message: `Order ${orderId} processed successfully` };
    } catch (error) {
      console.error(`❌ Manual order processing failed for ${orderId}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new FirebaseOrderListener();