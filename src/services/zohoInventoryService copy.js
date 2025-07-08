// server/services/dataOrganizationService.js
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require('../serviceAccountKey.json'))
  });
}

const db = admin.firestore();

/**
 * Service to organize customer data into sub-collections
 * This runs periodically to maintain data structure for better performance
 */
class DataOrganizationService {
  constructor() {
    this.batchSize = 500; // Firestore batch write limit
    this.isRunning = false;
  }

  /**
   * Main method to organize all customer data
   */
  async organizeCustomerData() {
    if (this.isRunning) {
      console.log('Data organization already in progress...');
      return;
    }

    this.isRunning = true;
    console.log('Starting customer data organization...');
    
    try {
      const startTime = Date.now();
      const stats = {
        customersProcessed: 0,
        ordersProcessed: 0,
        invoicesProcessed: 0,
        itemsEnriched: 0,
        errors: []
      };

      // Get all customers
      const customersSnapshot = await db.collection('customers').get();
      console.log(`Found ${customersSnapshot.size} customers to process`);

      // Process customers in batches
      const customerBatches = this.chunkArray(customersSnapshot.docs, 10);
      
      for (const batch of customerBatches) {
        await Promise.all(batch.map(async (customerDoc) => {
          try {
            await this.processCustomer(customerDoc, stats);
            stats.customersProcessed++;
          } catch (error) {
            console.error(`Error processing customer ${customerDoc.id}:`, error);
            stats.errors.push({
              customerId: customerDoc.id,
              error: error.message
            });
          }
        }));
      }

      const duration = Date.now() - startTime;
      console.log(`Data organization completed in ${duration}ms`);
      console.log('Statistics:', stats);
      
      // Log results to a collection for monitoring
      await this.logResults(stats, duration);
      
    } catch (error) {
      console.error('Data organization failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single customer's data
   */
  async processCustomer(customerDoc, stats) {
    const customerId = customerDoc.data().customer_id;
    const customerRef = customerDoc.ref;
    
    console.log(`Processing customer: ${customerId}`);

    // Process orders
    await this.processCustomerOrders(customerRef, customerId, stats);
    
    // Process invoices
    await this.processCustomerInvoices(customerRef, customerId, stats);
  }

  /**
   * Process and organize customer orders
   */
  async processCustomerOrders(customerRef, customerId, stats) {
    const ordersSnapshot = await db.collection('sales_orders')
      .where('customer_id', '==', customerId)
      .get();

    if (ordersSnapshot.empty) return;

    const batches = this.createBatches();
    let currentBatch = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      
      // Create sub-collection reference
      const subOrderRef = customerRef
        .collection('orders')
        .doc(orderDoc.id);
      
      // Add order to batch
      batches[currentBatch].set(subOrderRef, {
        ...orderData,
        _organized_at: Timestamp.now(),
        _source_id: orderDoc.id
      });
      
      stats.ordersProcessed++;
      
      // Process order items
      if (orderData.line_items && Array.isArray(orderData.line_items)) {
        await this.processOrderItems(subOrderRef, orderData.line_items, stats);
      }
      
      // Switch to next batch if current is full
      if (batches[currentBatch]._operations.length >= this.batchSize) {
        await batches[currentBatch].commit();
        currentBatch++;
        if (currentBatch >= batches.length) {
          batches.push(db.batch());
        }
      }
    }
    
    // Commit remaining batches
    for (const batch of batches) {
      if (batch._operations.length > 0) {
        await batch.commit();
      }
    }
  }

  /**
   * Process order items and enrich with product data
   */
  async processOrderItems(orderRef, lineItems, stats) {
    const itemsBatch = db.batch();
    
    for (const [index, item] of lineItems.entries()) {
      try {
        // Fetch full item details from items_data
        let itemData = null;
        
        if (item.item_id) {
          const itemSnapshot = await db.collection('items_data')
            .where('item_id', '==', item.item_id)
            .limit(1)
            .get();
          
          if (!itemSnapshot.empty) {
            itemData = itemSnapshot.docs[0].data();
          }
        }
        
        // Fallback to SKU if item_id not found
        if (!itemData && item.sku) {
          const skuSnapshot = await db.collection('items_data')
            .where('sku', '==', item.sku)
            .limit(1)
            .get();
          
          if (!skuSnapshot.empty) {
            itemData = skuSnapshot.docs[0].data();
          }
        }
        
        // Create enriched item document
        const itemRef = orderRef.collection('sales_order_items').doc();
        itemsBatch.set(itemRef, {
          ...item,
          item_details: itemData || null,
          _enriched: !!itemData,
          _enriched_at: Timestamp.now(),
          _position: index
        });
        
        if (itemData) {
          stats.itemsEnriched++;
        }
        
      } catch (error) {
        console.error(`Error enriching item ${item.item_id || item.sku}:`, error);
      }
    }
    
    if (itemsBatch._operations.length > 0) {
      await itemsBatch.commit();
    }
  }

  /**
   * Process and organize customer invoices
   */
  async processCustomerInvoices(customerRef, customerId, stats) {
    const invoicesSnapshot = await db.collection('invoices')
      .where('customer_id', '==', customerId)
      .get();

    if (invoicesSnapshot.empty) return;

    const batch = db.batch();
    
    for (const invoiceDoc of invoicesSnapshot.docs) {
      const invoiceData = invoiceDoc.data();
      
      // Create sub-collection reference
      const subInvoiceRef = customerRef
        .collection('invoices')
        .doc(invoiceDoc.id);
      
      // Add invoice to batch
      batch.set(subInvoiceRef, {
        ...invoiceData,
        _organized_at: Timestamp.now(),
        _source_id: invoiceDoc.id
      });
      
      stats.invoicesProcessed++;
    }
    
    if (batch._operations.length > 0) {
      await batch.commit();
    }
  }

  /**
   * Helper to create batches
   */
  createBatches() {
    return [db.batch()];
  }

  /**
   * Helper to chunk array
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Log organization results for monitoring
   */
  async logResults(stats, duration) {
    await db.collection('data_organization_logs').add({
      timestamp: Timestamp.now(),
      duration_ms: duration,
      stats: stats,
      success: stats.errors.length === 0
    });
  }

  /**
   * Clean up old sub-collections (optional)
   */
  async cleanupOldData(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    console.log(`Cleaning up data older than ${daysToKeep} days...`);
    
    // This would require iterating through all customers and their sub-collections
    // Implementation depends on your data retention requirements
  }
}

// Export singleton instance
const dataOrganizationService = new DataOrganizationService();

// Export for use in cron jobs or API endpoints
module.exports = {
  dataOrganizationService,
  
  // Express endpoint handler
  async handleOrganizeData(req, res) {
    try {
      await dataOrganizationService.organizeCustomerData();
      res.json({ success: true, message: 'Data organization completed' });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },
  
  // Cron job function
  async runDataOrganization() {
    console.log('Running scheduled data organization...');
    try {
      await dataOrganizationService.organizeCustomerData();
    } catch (error) {
      console.error('Scheduled data organization failed:', error);
    }
  }
};