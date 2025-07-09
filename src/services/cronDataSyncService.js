// src/services/cronDataSyncService.js
// Enhanced version with customer data organization for sub-collections

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';
import productSyncService from './productSyncService.js';
import zohoInventoryService from './zohoInventoryService.js';

class CronDataSyncService {
  constructor() {
    this.isRunning = new Map();
    this.lastSync = {};
    
    // Brand mappings for sales transactions
    this.brandMappings = {
      'rader': { display: 'Räder', normalized: 'rader' },
      'räder': { display: 'Räder', normalized: 'rader' },
      'remember': { display: 'Remember', normalized: 'remember' },
      'my flame lifestyle': { display: 'My Flame Lifestyle', normalized: 'my-flame-lifestyle' },
      'my flame': { display: 'My Flame Lifestyle', normalized: 'my-flame-lifestyle' },
      'blomus': { display: 'Blomus', normalized: 'blomus' },
      'relaxound': { display: 'Relaxound', normalized: 'relaxound' },
      'junglebox': { display: 'Relaxound', normalized: 'relaxound' },
      'zwitscherbox': { display: 'Relaxound', normalized: 'relaxound' },
      'oceanbox': { display: 'Relaxound', normalized: 'relaxound' },
      'lakesidebox': { display: 'Relaxound', normalized: 'relaxound' },
      'birdybox': { display: 'Relaxound', normalized: 'relaxound' },
      'gefu': { display: 'GEFU', normalized: 'gefu' },
      'elvang': { display: 'Elvang', normalized: 'elvang' }
    };
  }

  // ============================================================
  // DATA ORGANIZATION METHODS (NEW)
  // ============================================================

  /**
   * Organize customer data into sub-collections
   * This improves query performance for customer-specific data
   */
  async organizeCustomerData() {
    const startTime = Date.now();
    console.log('🔄 Starting customer data organization...');
    
    try {
      const db = admin.firestore();
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

      // Process customers in batches of 10
      const customerBatches = this.chunkArray(customersSnapshot.docs, 10);
      
      for (const batch of customerBatches) {
        await Promise.all(batch.map(async (customerDoc) => {
          try {
            await this.processCustomerSubCollections(customerDoc, stats);
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
      console.log(`✅ Data organization completed in ${duration}ms`);
      console.log('📊 Statistics:', {
        customers: stats.customersProcessed,
        orders: stats.ordersProcessed,
        invoices: stats.invoicesProcessed,
        itemsEnriched: stats.itemsEnriched,
        errors: stats.errors.length
      });
      
      // Log results for monitoring
      await this.logDataOrganizationResults(stats, duration);
      
      return { success: true, stats, duration };
      
    } catch (error) {
      console.error('❌ Data organization failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process sub-collections for a single customer
   */
  async processCustomerSubCollections(customerDoc, stats) {
    const db = admin.firestore();
    const customerId = customerDoc.data().customer_id;
    const customerRef = customerDoc.ref;
    
    // Process orders
    await this.organizeCustomerOrders(db, customerRef, customerId, stats);
    
    // Process invoices
    await this.organizeCustomerInvoices(db, customerRef, customerId, stats);
  }

  /**
   * Organize customer orders into sub-collection with enriched item data
   */
  async organizeCustomerOrders(db, customerRef, customerId, stats) {
    const ordersSnapshot = await db.collection('sales_orders')
      .where('customer_id', '==', customerId)
      .get();

    if (ordersSnapshot.empty) return;

    const batch = db.batch();
    let batchCount = 0;
    
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      
      // Create sub-collection reference
      const subOrderRef = customerRef
        .collection('orders')
        .doc(orderDoc.id);
      
      // Add order to batch
      batch.set(subOrderRef, {
        ...orderData,
        _organized_at: admin.firestore.FieldValue.serverTimestamp(),
        _source_id: orderDoc.id
      });
      
      stats.ordersProcessed++;
      batchCount++;
      
      // Commit batch if it's getting large
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
      
      // Process order items separately to enrich with product data
      if (orderData.line_items && Array.isArray(orderData.line_items)) {
        await this.enrichOrderItems(subOrderRef, orderData.line_items, stats);
      }
    }
    
    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Enrich order items with full product data from items_data collection
   */
  async enrichOrderItems(orderRef, lineItems, stats) {
    const db = admin.firestore();
    const itemsBatch = db.batch();
    
    for (const [index, item] of lineItems.entries()) {
      try {
        let itemData = null;
        
        // Try to fetch from items_data collection first
        if (item.item_id) {
          const itemSnapshot = await db.collection('items_data')
            .where('item_id', '==', item.item_id)
            .limit(1)
            .get();
          
          if (!itemSnapshot.empty) {
            itemData = itemSnapshot.docs[0].data();
          }
        }
        
        // Fallback to SKU search if item_id not found
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
          _enriched_at: admin.firestore.FieldValue.serverTimestamp(),
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
   * Organize customer invoices into sub-collection
   */
  async organizeCustomerInvoices(db, customerRef, customerId, stats) {
    const invoicesSnapshot = await db.collection('invoices')
      .where('customer_id', '==', customerId)
      .get();

    if (invoicesSnapshot.empty) return;

    const batch = db.batch();
    let batchCount = 0;
    
    for (const invoiceDoc of invoicesSnapshot.docs) {
      const invoiceData = invoiceDoc.data();
      
      // Create sub-collection reference
      const subInvoiceRef = customerRef
        .collection('invoices')
        .doc(invoiceDoc.id);
      
      // Add invoice to batch
      batch.set(subInvoiceRef, {
        ...invoiceData,
        _organized_at: admin.firestore.FieldValue.serverTimestamp(),
        _source_id: invoiceDoc.id
      });
      
      stats.invoicesProcessed++;
      batchCount++;
      
      // Commit batch if it's getting large
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  /**
   * Log data organization results for monitoring
   */
  async logDataOrganizationResults(stats, duration) {
    const db = admin.firestore();
    await db.collection('data_organization_logs').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      duration_ms: duration,
      stats: stats,
      success: stats.errors.length === 0,
      sync_type: 'customer_subcollections'
    });
  }

  /**
   * Helper to chunk arrays
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================
  // EXISTING SYNC METHODS (with data organization added)
  // ============================================================
  
  /**
   * Get sync metadata for a specific sync type		
   */
  async getSyncMetadata(syncType) {
    try {
      const db = admin.firestore();
      const doc = await db.collection('sync_metadata').doc(syncType).get();
      
      if (doc.exists) {
        return doc.data();
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting sync metadata for ${syncType}:`, error);
      return null;
    }
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(syncType, data) {
    try {
      const db = admin.firestore();
      await db.collection('sync_metadata').doc(syncType).set({
        ...data,
        lastSync: new Date().toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(`Error updating sync metadata for ${syncType}:`, error);
    }
  }

  /**
   * Determine brand from item name
   */
  determineBrand(itemName) {
    if (!itemName) return { display: 'Unknown', normalized: 'unknown' };
    
    const itemNameLower = itemName.toLowerCase();
    
    for (const [pattern, brandInfo] of Object.entries(this.brandMappings)) {
      if (itemNameLower.includes(pattern)) {
        return brandInfo;
      }
    }
    
    return { display: 'Unknown', normalized: 'unknown' };
  }
  
  /**
   * Process and enrich sales transactions with proper brand info
   */
async processSalesTransactions(orders, db) {
  const transactions = [];
  
  // First, collect all unique item IDs to batch fetch
  const itemIds = new Set();
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach(item => {
        if (item.item_id) itemIds.add(item.item_id);
      });
    }
  });
  
  // Batch fetch items to get Manufacturer field
  const itemsMap = new Map();
  const itemIdsArray = Array.from(itemIds);
  
  for (let i = 0; i < itemIdsArray.length; i += 10) {
    const batch = itemIdsArray.slice(i, i + 10);
    
    // Try items_data collection first
    const itemsDataSnapshot = await db.collection('items_data')
      .where('item_id', 'in', batch)
      .get();
    
    itemsDataSnapshot.forEach(doc => {
      const itemData = doc.data();
      // Extract manufacturer name from the object structure
      const manufacturerName = typeof itemData.manufacturer === 'object' 
        ? (itemData.manufacturer?.manufacturer_name || itemData.brand_name || 'Unknown')
        : (itemData.manufacturer || itemData.brand_name || 'Unknown');
      
      itemsMap.set(itemData.item_id, {
        manufacturer: manufacturerName,
        name: itemData.item_name || itemData.name,
        sku: itemData.sku
      });
    });
    
    // Fallback to items collection for any missing
    const missingIds = batch.filter(id => !itemsMap.has(id));
    if (missingIds.length > 0) {
      const itemsSnapshot = await db.collection('items')
        .where('item_id', 'in', missingIds)
        .get();
      
      itemsSnapshot.forEach(doc => {
        const itemData = doc.data();
        // Handle manufacturer field which might be a string or object
        const manufacturerName = typeof itemData.Manufacturer === 'object'
          ? (itemData.Manufacturer?.manufacturer_name || 'Unknown')
          : (itemData.Manufacturer || itemData.manufacturer || 'Unknown');
        
        itemsMap.set(itemData.item_id, {
          manufacturer: manufacturerName,
          name: itemData.name || itemData.item_name,
          sku: itemData.sku
        });
      });
    }
  }
    
    // Process orders
orders.forEach(order => {
  if (order.line_items && Array.isArray(order.line_items)) {
    order.line_items.forEach(item => {
      const itemInfo = itemsMap.get(item.item_id) || {};
      
      // Ensure manufacturer is always a valid string
      let manufacturer = itemInfo.manufacturer;
      if (!manufacturer || typeof manufacturer !== 'string') {
        manufacturer = 'Unknown';
      }
      
      // Check if marketplace order
      const isMarketplaceOrder = 
        order.customer_name === 'Amazon UK - Customer';
      
      const itemTotal = item.item_total || item.total || 
                      (parseFloat(item.rate || 0) * parseInt(item.quantity || 0));
      
      transactions.push({
        transaction_id: item.line_item_id || `${order.salesorder_id}_${item.item_id}`,
        item_id: item.item_id,
        item_name: item.name || item.item_name || 'Unknown Item',
        sku: item.sku || itemInfo.sku || '',
        manufacturer: manufacturer,
        brand: manufacturer,
        brand_normalized: manufacturer.toLowerCase().replace(/\s+/g, '-'),
        quantity: parseInt(item.quantity || 0),
        price: parseFloat(item.rate || 0),
        total: itemTotal,
        order_id: order.salesorder_id,
        order_number: order.salesorder_number,
        order_date: order.date,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        salesperson_id: order.salesperson_id || '',
        salesperson_name: order.salesperson_name || '',
        is_marketplace_order: isMarketplaceOrder,
        created_at: order.date,
        last_modified: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  }
});
  
  return transactions;
}

  /**
   * Update brand backorder information from purchase orders
   */
  async updateBrandBackorders() {
    const db = admin.firestore();
    
    try {
      console.log('📦 Calculating brand backorders from purchase orders...');
      
      // Get all purchase orders
      const poSnapshot = await db.collection('purchaseorders').get();
      
      // Calculate backorders by brand
      const backordersByBrand = new Map();
      
      for (const doc of poSnapshot.docs) {
        const po = doc.data();
        
        if (po.line_items && Array.isArray(po.line_items)) {
          for (const item of po.line_items) {
            // Calculate actual backorder quantity for this item
            const quantity = parseInt(item.quantity || 0);
            const quantityReceived = parseInt(item.quantity_received || 0);
            const quantityCancelled = parseInt(item.quantity_cancelled || 0);
            const quantityInTransit = parseInt(item.quantity_intransit || 0);
            
            // Backorder = ordered - received - cancelled
            const backorderQuantity = quantity - quantityReceived - quantityCancelled;
            
            // Only process if there's actually a backorder
if (backorderQuantity > 0) {
  // Get item info from items_data collection first
  let itemData = null;
  const itemDoc = await db.collection('items_data')
    .where('item_id', '==', item.item_id)
    .limit(1)
    .get();
  
  if (!itemDoc.empty) {
    itemData = itemDoc.docs[0].data();
    
    // Extract manufacturer name from object structure
    const brand = typeof itemData.manufacturer === 'object'
      ? (itemData.manufacturer?.manufacturer_name || itemData.brand_name || 'Unknown')
      : (itemData.manufacturer || itemData.brand_name || 'Unknown');
    
    const brandNormalized = brand.toLowerCase().replace(/\s+/g, '-');
    
    if (!backordersByBrand.has(brandNormalized)) {
      backordersByBrand.set(brandNormalized, {
        brand_name: brand,
        items_on_backorder: 0,
        backorder_value: 0,
        items_in_transit: 0,
        backorder_details: []
      });
    }
    
    const brandBackorder = backordersByBrand.get(brandNormalized);
    brandBackorder.items_on_backorder += backorderQuantity;
    brandBackorder.backorder_value += backorderQuantity * (parseFloat(item.rate) || 0);
    brandBackorder.items_in_transit += quantityInTransit;
    
    brandBackorder.backorder_details.push({
      item_id: item.item_id,
      item_name: item.name || item.item_name,
      sku: item.sku,
      po_number: po.purchaseorder_number,
      po_date: po.date,
      po_status: po.status,
      vendor_name: po.vendor_name,
      quantity_ordered: quantity,
      quantity_received: quantityReceived,
      quantity_cancelled: quantityCancelled,
      quantity_in_transit: quantityInTransit,
      quantity_billed: parseInt(item.quantity_billed || 0),
      quantity_marked_as_received: parseInt(item.quantity_marked_as_received || 0),
      backorder_quantity: backorderQuantity,
      rate: parseFloat(item.rate || 0),
      backorder_value: backorderQuantity * (parseFloat(item.rate) || 0)
    });
  }
            }
          }
        }
      }
      
      // Update brands collection with backorder info
      const batch = db.batch();
      let count = 0;
      
      // First, reset all brands' backorder info
      const allBrandsSnapshot = await db.collection('brands').get();
      allBrandsSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          backorder_info: {
            items_on_backorder: 0,
            backorder_value: 0,
            items_in_transit: 0,
            backorder_details: [],
            last_updated: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        count++;
        
        if (count % 400 === 0) {
          batch.commit();
          batch = db.batch();
        }
      });
      
      // Now update brands that have backorders
      for (const [brandNormalized, backorderInfo] of backordersByBrand) {
        const docRef = db.collection('brands').doc(brandNormalized);
        
        // Sort backorder details by value (highest first)
        backorderInfo.backorder_details.sort((a, b) => b.backorder_value - a.backorder_value);
        
        // Keep only top 20 items for storage efficiency
        const topBackorders = backorderInfo.backorder_details.slice(0, 20);
        
        batch.set(docRef, {
          brand_name: backorderInfo.brand_name,
          brand_normalized: brandNormalized,
          backorder_info: {
            items_on_backorder: backorderInfo.items_on_backorder,
            backorder_value: backorderInfo.backorder_value,
            items_in_transit: backorderInfo.items_in_transit,
            backorder_details: topBackorders,
            total_backorder_items: backorderInfo.backorder_details.length,
            last_updated: admin.firestore.FieldValue.serverTimestamp()
          },
          last_backorder_update: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        count++;
        
        if (count % 400 === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
      
      // Commit remaining
      if (count % 400 !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Brand backorder information updated:`);
      console.log(`   - Brands with backorders: ${backordersByBrand.size}`);
      
      let totalBackorderItems = 0;
      let totalBackorderValue = 0;
      
      backordersByBrand.forEach(info => {
        totalBackorderItems += info.items_on_backorder;
        totalBackorderValue += info.backorder_value;
      });
      
      console.log(`   - Total items on backorder: ${totalBackorderItems}`);
      console.log(`   - Total backorder value: £${totalBackorderValue.toFixed(2)}`);
      
      return { 
        success: true, 
        brandsWithBackorders: backordersByBrand.size,
        totalBackorderItems,
        totalBackorderValue
      };
      
    } catch (error) {
      console.error('❌ Error updating brand backorders:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update brand statistics from sales transactions
   */
  async updateBrandStatistics(transactions, dateRange = '30_days') {
    const db = admin.firestore();
    console.log('📊 Updating brand statistics from sales transactions...');
    
    try {
      // Brand mappings with Firebase document IDs
      const brandMappings = {
        'rader': { id: '14gZGdIzCx4FXk688pFU', display: 'Räder', normalized: 'rader', variants: ['rader', 'räder', 'Rader', 'Räder'] },
        'relaxound': { id: 'EgCkp88aE2tBGuMJffeg', display: 'Relaxound', normalized: 'relaxound', variants: ['relaxound', 'Relaxound'] },
        'myflame': { id: 'RSIgBqXEEyvL5edkwBCh', display: 'My Flame', normalized: 'myflame', variants: ['my flame', 'My Flame', 'myflame', 'MyFlame'] },
        'blomus': { id: 'U3IP2jxNGYpae9WGkCQJ', display: 'Blomus', normalized: 'blomus', variants: ['blomus', 'Blomus'] },
        'remember': { id: 'fMIJ7hHmyXczdfCAdn4Q', display: 'Remember', normalized: 'remember', variants: ['remember', 'Remember'] },
        'elvang': { id: 'zYcbCnehcmGw3sud81UZ', display: 'Elvang', normalized: 'elvang', variants: ['elvang', 'Elvang'] }
      };
      
      // Get date range
      const { startDate, endDate } = this.getDateRange(dateRange);
      
      // Query sales_transactions for all relevant brands
      const brandQueries = [];
      Object.values(brandMappings).forEach(brandInfo => {
        brandInfo.variants.forEach(variant => {
          brandQueries.push(
            db.collection('sales_transactions')
              .where('brand', '==', variant)
              .where('order_date', '>=', startDate.toISOString().split('T')[0])
              .where('order_date', '<=', endDate.toISOString().split('T')[0])
              .get()
          );
        });
      });
      
      // Execute all queries
      const results = await Promise.all(brandQueries);
      
      // Combine all transactions
      const allTransactions = [];
      results.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          allTransactions.push({ id: doc.id, ...doc.data() });
        });
      });
      
      // Group transactions by normalized brand
      const brandStats = new Map();
      
      // Initialize all brands
      Object.entries(brandMappings).forEach(([key, brandInfo]) => {
        brandStats.set(key, {
          brand_name: brandInfo.display,
          brand_normalized: brandInfo.normalized,
          brand_id: brandInfo.id,
          total_quantity: 0,
          total_revenue: 0,
          unique_orders: new Set(),
          marketplace_orders: new Set(),
          direct_orders: new Set(),
          items: new Map(),
          transactions: []
        });
      });
      
      // Process transactions
      allTransactions.forEach(trans => {
        // Find which brand this belongs to
        let brandKey = null;
        Object.entries(brandMappings).forEach(([key, brandInfo]) => {
          if (brandInfo.variants.some(variant => 
            variant.toLowerCase() === (trans.brand || '').toLowerCase()
          )) {
            brandKey = key;
          }
        });
        
        if (brandKey && brandStats.has(brandKey)) {
          const stats = brandStats.get(brandKey);
          
          // Update stats
          stats.total_quantity += trans.quantity || 0;
          stats.total_revenue += trans.total || 0;
          stats.unique_orders.add(trans.order_id);
          
          // Track order types
          if (trans.is_marketplace_order) {
            stats.marketplace_orders.add(trans.order_id);
          } else {
            stats.direct_orders.add(trans.order_id);
          }
          
          // Track items for best sellers
          const itemKey = trans.item_id;
          if (!stats.items.has(itemKey)) {
            stats.items.set(itemKey, {
              item_id: trans.item_id,
              item_name: trans.item_name,
              sku: trans.sku,
              quantity: 0,
              revenue: 0
            });
          }
          const item = stats.items.get(itemKey);
          item.quantity += trans.quantity || 0;
          item.revenue += trans.total || 0;
          
          stats.transactions.push(trans);
        }
      });
      
      // Calculate total revenue for market share
      let totalRevenue = 0;
      brandStats.forEach(stats => {
        totalRevenue += stats.total_revenue;
      });
      
      // Get active product counts
      const activeProductCounts = await this.getActiveProductCounts();
      
      // Update brands collection
      const batch = db.batch();
      
      for (const [brandKey, stats] of brandStats) {
        const brandInfo = brandMappings[brandKey];
        const orderCount = stats.unique_orders.size;
        const avgOrderValue = orderCount > 0 ? stats.total_revenue / orderCount : 0;
        const marketShare = totalRevenue > 0 ? (stats.total_revenue / totalRevenue) * 100 : 0;
        
        // Get best selling item for this brand
        let bestSellingItem = null;
        let maxQuantity = 0;
        stats.items.forEach(item => {
          if (item.quantity > maxQuantity) {
            maxQuantity = item.quantity;
            bestSellingItem = item;
          }
        });
        
        // Get top selling items (sorted by quantity)
        const topSellingItems = Array.from(stats.items.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
        
        // Get top revenue items
        const topRevenueItems = Array.from(stats.items.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);
        
        // Prepare brand document
        const brandDoc = {
          brand_name: brandInfo.display,
          brand_normalized: stats.brand_normalized,
          
          // Metrics for current period
          [`metrics_${dateRange}`]: {
            total_quantity: stats.total_quantity,
            total_revenue: stats.total_revenue,
            marketplace_orders: stats.marketplace_orders.size,
            direct_orders: stats.direct_orders.size,
            total_orders: orderCount,
            average_order_value: avgOrderValue,
            market_share: marketShare,
            active_products: activeProductCounts[brandKey] || 0,
            best_selling_item: bestSellingItem,
            top_selling_items: topSellingItems,
            top_revenue_items: topRevenueItems,
            last_updated: admin.firestore.FieldValue.serverTimestamp()
          },
          
          last_updated: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Use the specific Firebase document ID
        const docRef = db.collection('brands').doc(brandInfo.id);
        batch.set(docRef, brandDoc, { merge: true });
      }
      
      // Commit all updates
      await batch.commit();
      
      console.log(`✅ Updated statistics for ${brandStats.size} brands`);
      
      return { 
        success: true, 
        brandsUpdated: brandStats.size
      };
      
    } catch (error) {
      console.error('❌ Error updating brand statistics:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active product counts by brand
   */
 async getActiveProductCounts() {
  const db = admin.firestore();
  
  try {
    // Brand name mappings for items collection
    const brandSearchTerms = {
      'rader': ['Räder', 'Rader', 'räder', 'rader'],
      'relaxound': ['Relaxound', 'relaxound'],
      'myflame': ['My Flame', 'my flame', 'MyFlame', 'myflame'],
      'blomus': ['Blomus', 'blomus'],
      'remember': ['Remember', 'remember'],
      'elvang': ['Elvang', 'elvang']
    };
    
    const counts = {};
    
    // Query items_data collection for each brand
    for (const [brandKey, searchTerms] of Object.entries(brandSearchTerms)) {
      let activeCount = 0;
      
      for (const term of searchTerms) {
        // Check items_data collection - manufacturer is an object
        const itemsDataSnapshot = await db.collection('items_data')
          .where('manufacturer.manufacturer_name', '==', term)
          .where('status', '==', 'active')
          .get();
        
        // Create a set to track unique item IDs and avoid duplicates
        const uniqueItemIds = new Set();
        
        itemsDataSnapshot.forEach(doc => {
          uniqueItemIds.add(doc.data().item_id);
        });
        
        // Also check brand_name field
        const brandNameSnapshot = await db.collection('items_data')
          .where('brand_name', '==', term)
          .where('status', '==', 'active')
          .get();
        
        brandNameSnapshot.forEach(doc => {
          uniqueItemIds.add(doc.data().item_id);
        });
        
        activeCount += uniqueItemIds.size;
      }
      
      counts[brandKey] = activeCount;
    }
    
    return counts;
    
  } catch (error) {
    console.error('Error getting active product counts:', error);
    return {};
  }
}

  /**
   * Helper to get date range
   */
  getDateRange(dateRange) {
    const now = new Date();
    let startDate, endDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case '7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case '30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    
    return { startDate, endDate };
  }

  /**
   * Enrich orders with UIDs
   */
  async enrichOrdersWithUIDs(orders) {
    const db = admin.firestore();
    
    // Get user mappings
    const usersSnapshot = await db.collection('users').get();
    const usersByZohoId = new Map();
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.zohospID) {
        usersByZohoId.set(userData.zohospID, {
          uid: doc.id,
          name: userData.name,
          email: userData.email
        });
      }
    });
    
    // Enrich orders
    return orders.map(order => {
      let salespersonUid = null;
      
      // Check if it's a marketplace order
      const isMarketplaceOrder = 
        order.customer_name === 'Amazon UK Limited' ||
        order.customer_name === 'Amazon UK - Customer' ||
        order.company_name === 'Amazon UK Limited' ||
        order.company_name?.toLowerCase().includes('amazon') ||
        false;
      
      // Map salesperson_id to uid if not marketplace
      if (!isMarketplaceOrder && order.salesperson_id && usersByZohoId.has(order.salesperson_id)) {
        salespersonUid = usersByZohoId.get(order.salesperson_id).uid;
      }
      
      return {
        ...order,
        salesperson_uid: salespersonUid || null,
        is_marketplace_order: isMarketplaceOrder,
        marketplace_source: isMarketplaceOrder ? 'Amazon' : null
      };
    });
  }

  /**
   * HIGH FREQUENCY SYNC - Every 15 minutes
   * Only syncs orders and invoices modified in the last hour
   */
  async highFrequencySync() {
    const jobType = 'high';
    
    if (this.isRunning.get(jobType)) {
      console.log('⏩ High frequency sync already running, skipping...');
      return { success: false, reason: 'Already running' };
    }
    
    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();
    
    try {
      console.log('🚀 Starting high frequency sync...');
      
      // Initialize counters
      let orderCount = 0;
      let transactionCount = 0;
      let invoiceCount = 0;
      
      // Get metadata from last sync
      const metadata = await this.getSyncMetadata('high_frequency') || {};
      const lastSync = metadata.lastSync ? new Date(metadata.lastSync) : new Date(Date.now() - 60 * 60 * 1000);
      
      console.log(`Syncing changes since: ${lastSync.toISOString()}`);
      
      // Get recently modified orders (last hour)
      const recentOrders = await zohoReportsService.getSalesOrders('today');
      
      // Filter orders modified after last sync
      const newOrders = recentOrders.filter(order => {
        const orderDate = new Date(order.last_modified_time || order.date);
        return orderDate > lastSync;
      });
      
      if (newOrders.length > 0) {
        console.log(`Found ${newOrders.length} new/modified orders`);
        
        // Enrich orders with UIDs
        const enrichedOrders = await this.enrichOrdersWithUIDs(newOrders);
        await this._batchWrite(db, 'salesorders', enrichedOrders, 'salesorder_id');
        orderCount = enrichedOrders.length;
        
        // Process transactions
        const transactions = await this.processSalesTransactions(enrichedOrders, db);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
          transactionCount = transactions.length;
          
          // Update brand statistics
          await this.updateBrandStatistics(transactions, '30_days');
        }
      }
      
      // Get recent invoices
      const recentInvoices = await zohoReportsService.getInvoices('today');
      const invoiceData = Array.isArray(recentInvoices) ? recentInvoices : 
                         [...(recentInvoices.all || []), ...(recentInvoices.outstanding || [])];
      
      // Filter invoices modified after last sync
      const newInvoices = invoiceData.filter(invoice => {
        const invoiceDate = new Date(invoice.last_modified_time || invoice.date);
        return invoiceDate > lastSync;
      });
      
      if (newInvoices.length > 0) {
        console.log(`Found ${newInvoices.length} new/modified invoices`);
        await this.syncAndNormalizeInvoices(newInvoices);
        invoiceCount = newInvoices.length;
      }
      
      // Update metadata
      await this.updateSyncMetadata('high_frequency', {
        recordsProcessed: {
          orders: orderCount,
          transactions: transactionCount,
          invoices: invoiceCount
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      
      return { 
        success: true, 
        duration, 
        recordsProcessed: {
          orders: orderCount,
          transactions: transactionCount,
          invoices: invoiceCount
        }
      };
      
    } catch (error) {
      console.error('❌ High frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * MEDIUM FREQUENCY SYNC - Every 2 hours
   * Catches any missed records from the last 24 hours
   * NOW INCLUDES DATA ORGANIZATION
   */
  async mediumFrequencySync() {
    const jobType = 'medium-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Medium frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }
    
    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();
    
    try {
      console.log('🔄 Starting medium frequency sync (last 24 hours)...');
      
      // Get yesterday and today's data to catch any missed records
      const [ordersToday, ordersYesterday] = await Promise.all([
        zohoReportsService.getSalesOrders('today'),
        zohoReportsService.getSalesOrders('yesterday')
      ]);
      
      const allOrders = [...ordersToday, ...ordersYesterday];
      
      // Remove duplicates
      const uniqueOrders = Array.from(
        new Map(allOrders.map(order => [order.salesorder_id, order])).values()
      );
      
      if (uniqueOrders.length > 0) {
        const enrichedOrders = await this.enrichOrdersWithUIDs(uniqueOrders);
        await this._batchWrite(db, 'salesorders', enrichedOrders, 'salesorder_id');
        
        // Process transactions
        const transactions = await this.processSalesTransactions(enrichedOrders, db);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
          
          // Update brand statistics
          await this.updateBrandStatistics(transactions, '30_days');
        }
      }
      
      // Sync invoices from last 24 hours
      const invoicesResult = await zohoReportsService.getInvoices('7_days');
      const recentInvoices = [...(invoicesResult.all || []), ...(invoicesResult.outstanding || [])];
      
      // Filter to last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24HourInvoices = recentInvoices.filter(inv => 
        new Date(inv.date) >= oneDayAgo
      );
      
      if (last24HourInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(last24HourInvoices);
      }
      
      // Check for product updates
      console.log('📦 Checking for product updates...');
      const productSyncResult = await zohoInventoryService.syncProductsWithChangeDetection();
      console.log(`✅ Product sync: ${productSyncResult.stats.updated} updated, ${productSyncResult.stats.new} new`);
      
      // NEW: Run data organization to create/update sub-collections
      console.log('🔄 Running customer data organization...');
      const dataOrgResult = await this.organizeCustomerData();
      
      // Update metadata
      await this.updateSyncMetadata('medium_frequency', {
        recordsProcessed: {
          orders: uniqueOrders.length,
          invoices: last24HourInvoices.length,
          products: {
            total: productSyncResult.stats.total,
            updated: productSyncResult.stats.updated,
            new: productSyncResult.stats.new,
            deactivated: productSyncResult.stats.deactivated
          },
          dataOrganization: dataOrgResult.stats || {}
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Medium frequency sync completed in ${duration}ms`);
      
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          orders: uniqueOrders.length,
          invoices: last24HourInvoices.length,
          products: {
            total: productSyncResult.stats.total,
            updated: productSyncResult.stats.updated,
            new: productSyncResult.stats.new,
            deactivated: productSyncResult.stats.deactivated
          },
          dataOrganization: dataOrgResult.stats || {}
        }
      };
      
    } catch (error) {
      console.error('❌ Medium frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * LOW FREQUENCY SYNC - Daily at 2 AM
   * Comprehensive sync of last 7 days + cleanup
   */
  async lowFrequencySync() {
    const jobType = 'low-frequency';
    
    if (this.isRunning.get(jobType)) {
      console.log('⚠️ Low frequency sync already running, skipping...');
      return { success: false, message: 'Job already running' };
    }

    this.isRunning.set(jobType, true);
    const startTime = Date.now();
    const db = admin.firestore();

    try {
      console.log('🔄 Starting low frequency sync (weekly cleanup)...');
      
      // Sync product updates
      console.log('📦 Syncing product catalog updates...');
      const productSyncResult = await syncInventory(false); // incremental update
      
      // Get last 7 days of data for comprehensive sync
      const [orders7Days, invoices7Days, purchaseOrders7Days] = await Promise.all([
        zohoReportsService.getSalesOrders('7_days'),
        zohoReportsService.getInvoices('7_days'),
        zohoReportsService.getPurchaseOrders('7_days')
      ]);

      // Process all data
      if (orders7Days.length > 0) {
        const enrichedOrders = await this.enrichOrdersWithUIDs(orders7Days);
        await this._batchWrite(db, 'salesorders', enrichedOrders, 'salesorder_id');
        
        // Process transactions
        const transactions = await this.processSalesTransactions(enrichedOrders, db);
        if (transactions.length > 0) {
          await this._batchWrite(db, 'sales_transactions', transactions, 'transaction_id');
          
          // Update brand statistics
          await this.updateBrandStatistics(transactions, '30_days');
        }
      }
      
      // Process invoices
      const allInvoices = [
        ...(invoices7Days.all || []),
        ...(invoices7Days.outstanding || []),
        ...(invoices7Days.overdue || [])
      ];
      
      const uniqueInvoices = Array.from(
        new Map(allInvoices.map(inv => [inv.invoice_id, inv])).values()
      );
      
      if (uniqueInvoices.length > 0) {
        await this.syncAndNormalizeInvoices(uniqueInvoices);
      }
      
      // Process purchase orders
      if (purchaseOrders7Days.length > 0) {
        await this._batchWrite(db, 'purchaseorders', purchaseOrders7Days, 'purchaseorder_id');
      }
      
      // Update brand backorders
      console.log('📦 Updating brand backorder information...');
      const backorderResult = await this.updateBrandBackorders();
      
      // Customer enrichment
      console.log('🌍 Enriching customer data...');
      const customerEnrichmentService = await import('./customerEnrichmentService.js');
      const enrichmentResult = await customerEnrichmentService.default.enrichMissingCustomers();
      console.log(`✅ Enriched ${enrichmentResult.enriched} customers`);
      
      // Sync customers
      console.log('👥 Syncing customers from Zoho Inventory...');
      const customerSyncResult = await zohoReportsService.syncCustomers('all');
      console.log(`✅ Synced ${customerSyncResult.synced} customers`);
      
      // Update metadata
      await this.updateSyncMetadata('low_frequency', {
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders7Days.length,
          invoices: uniqueInvoices.length,
          purchaseOrders: purchaseOrders7Days.length,
          customers: customerSyncResult.synced || 0,
          backorderResult: backorderResult
        },
        duration: Date.now() - startTime
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ Low frequency sync completed in ${duration}ms`);
      
      return { 
        success: true, 
        duration,
        recordsProcessed: {
          products: productSyncResult.stats,
          orders: orders7Days.length,
          invoices: uniqueInvoices.length,
          purchaseOrders: purchaseOrders7Days.length,
          customers: customerSyncResult.synced || 0
        }
      };
      
    } catch (error) {
      console.error('❌ Low frequency sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning.set(jobType, false);
    }
  }

  /**
   * Sync and normalize invoices
   */
  async syncAndNormalizeInvoices(invoices) {
    console.log(`🔄 Processing ${invoices.length} invoices...`);
    try {
      const db = admin.firestore();
      
      // Get user mappings
      const usersSnapshot = await db.collection('users').get();
      const usersByZohoId = new Map();
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.zohospID) {
          usersByZohoId.set(userData.zohospID, {
            uid: doc.id,
            ...userData
          });
        }
      });
      
      // Process invoices
      const normalizedInvoices = invoices.map(invoice => {
        let salesAgentUid = null;
        if (invoice.salesperson_id && usersByZohoId.has(invoice.salesperson_id)) {
          salesAgentUid = usersByZohoId.get(invoice.salesperson_id).uid;
        }
        
        // Calculate days overdue
        let daysOverdue = 0;
        if (invoice.status !== 'paid' && invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate < today) {
            daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
          }
        }
        
        return {
          invoice_id: invoice.invoice_id,
          invoice_number: invoice.invoice_number,
          balance: parseFloat(invoice.balance || 0),
          total: parseFloat(invoice.total || 0),
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          customer_email: invoice.email || invoice.customer_email || '',
          status: invoice.status,
          due_date: invoice.due_date,
          days_overdue: daysOverdue,
          salesperson_id: invoice.salesperson_id || null,
          salesAgent_uid: salesAgentUid,
          date: invoice.date || invoice.invoice_date,
          _source: 'zoho_api',
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _normalized_at: admin.firestore.FieldValue.serverTimestamp()
        };
      });
      
      // Write to collections
      await this._batchWrite(db, 'normalized_invoices', normalizedInvoices, 'invoice_id');
      await this._batchWrite(db, 'invoices', invoices, 'invoice_id');
      
      console.log(`✅ Processed ${normalizedInvoices.length} invoices`);
      return { success: true, count: normalizedInvoices.length };
      
    } catch (error) {
      console.error('❌ Invoice processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper function to write data in batches
   */
  async _batchWrite(db, collectionName, dataArray, idKey) {
    if (!dataArray || dataArray.length === 0) {
      return;
    }

    const collectionRef = db.collection(collectionName);
    const BATCH_SIZE = 400;
    
    let currentBatch = db.batch();
    let currentBatchSize = 0;
    let batchCount = 0;
    let skippedCount = 0;
    
    for (const item of dataArray) {
      const docId = item[idKey];
      
      if (!docId || String(docId).trim() === '') {
        skippedCount++;
        continue;
      }
      
      const cleanDocId = String(docId).trim();
      
      try {
        if (currentBatchSize >= BATCH_SIZE) {
          await currentBatch.commit();
          batchCount++;
          currentBatch = db.batch();
          currentBatchSize = 0;
        }
        
        const docRef = collectionRef.doc(cleanDocId);
        const itemWithMetadata = {
          ...item,
          _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          _syncSource: 'zoho_api'
        };
        
        currentBatch.set(docRef, itemWithMetadata, { merge: true });
        currentBatchSize++;
        
      } catch (error) {
        console.error(`Error processing document ${cleanDocId}:`, error.message);
        skippedCount++;
      }
    }
    
    if (currentBatchSize > 0) {
      await currentBatch.commit();
      batchCount++;
    }
    
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} documents in ${collectionName}`);
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      runningJobs: Array.from(this.isRunning.entries())
        .filter(([_, running]) => running)
        .map(([job]) => job),
      lastSync: this.lastSync,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}

export default new CronDataSyncService();