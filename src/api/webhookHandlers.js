// src/services/webhookHandlers.js
const admin = require('firebase-admin');
const cronDataSyncService = require('./cronDataSyncService');
const zohoReportsService = require('./zohoReportsService');

const webhookHandlers = {
  /**
   * Handle Make.com webhook after customer creation in Zoho
   */
  async handleCustomerCreated(req, res) {
    try {
      const { 
        firebase_doc_id, 
        zoho_customer_id,
        customer_data 
      } = req.body;

      if (!firebase_doc_id || !zoho_customer_id) {
        return res.status(400).json({ 
          error: 'Missing required fields: firebase_doc_id or zoho_customer_id' 
        });
      }

      const db = admin.firestore();
      
      // Update the Firebase document with Zoho customer ID
      await db.collection('customer_data').doc(firebase_doc_id).update({
        customer_id: zoho_customer_id,
        sync_status: 'synced',
        zoho_sync_date: admin.firestore.FieldValue.serverTimestamp(),
        last_modified_in_zoho: new Date().toISOString()
      });

      // Optionally update with full customer data if provided
      if (customer_data) {
        await db.collection('customer_data').doc(firebase_doc_id).update({
          ...customer_data,
          _lastSynced: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log(`✅ Customer ${zoho_customer_id} synced to Firebase doc ${firebase_doc_id}`);
      
      res.json({ 
        success: true, 
        message: 'Customer synced successfully',
        firebase_doc_id,
        zoho_customer_id 
      });
      
    } catch (error) {
      console.error('❌ Webhook customer sync error:', error);
      res.status(500).json({ 
        error: 'Failed to sync customer',
        details: error.message 
      });
    }
  },

  /**
   * Handle Make.com webhook after sales order creation in Zoho
   */
  async handleSalesOrderCreated(req, res) {
    try {
      const { 
        salesorder_id,
        salesorder_number,
        customer_id,
        order_data,
        line_items 
      } = req.body;

      if (!salesorder_id) {
        return res.status(400).json({ 
          error: 'Missing required field: salesorder_id' 
        });
      }

      const db = admin.firestore();
      
      // Fetch the specific order from Zoho to ensure we have complete data
      const orderDetails = await zohoReportsService.getSalesOrderById(salesorder_id);
      
      if (orderDetails) {
        // Enrich the order with UIDs
        const enrichedOrders = await cronDataSyncService.enrichOrdersWithUIDs([orderDetails]);
        const enrichedOrder = enrichedOrders[0];
        
        // Save to salesorders collection
        await db.collection('salesorders').doc(salesorder_id).set({
          ...enrichedOrder,
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _syncSource: 'webhook'
        });
        
        // Process sales transactions
        const transactions = await cronDataSyncService.processSalesTransactions(
          [enrichedOrder], 
          db
        );
        
        // Save transactions
        const batch = db.batch();
        let batchCount = 0;
        
        for (const transaction of transactions) {
          const docRef = db.collection('sales_transactions').doc(transaction.transaction_id);
          batch.set(docRef, transaction);
          batchCount++;
          
          // Commit batch if it reaches limit
          if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
        
        // Commit remaining transactions
        if (batchCount > 0) {
          await batch.commit();
        }
        
        // Update brand statistics for the affected brands
        await cronDataSyncService.updateBrandStatistics(transactions, '30_days');
        
        console.log(`✅ Sales order ${salesorder_id} synced with ${transactions.length} transactions`);
        
        res.json({ 
          success: true, 
          salesorder_id,
          transactions_created: transactions.length
        });
        
      } else {
        throw new Error('Could not fetch order details from Zoho');
      }
      
    } catch (error) {
      console.error('❌ Webhook sales order sync error:', error);
      res.status(500).json({ 
        error: 'Failed to sync sales order',
        details: error.message 
      });
    }
  },

  /**
   * Trigger immediate sync - useful for testing
   */
  async triggerSync(req, res) {
    try {
      const { sync_type = 'high' } = req.body;
      
      let result;
      switch (sync_type) {
        case 'high':
          result = await cronDataSyncService.highFrequencySync();
          break;
        case 'medium':
          result = await cronDataSyncService.mediumFrequencySync();
          break;
        case 'low':
          result = await cronDataSyncService.lowFrequencySync();
          break;
        default:
          return res.status(400).json({ error: 'Invalid sync type' });
      }
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Manual sync trigger error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = webhookHandlers;