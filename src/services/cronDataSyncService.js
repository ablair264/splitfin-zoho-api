// src/services/cronDataSyncService.js
// Cleaned up version with proper incremental syncing and brand handling

import admin from 'firebase-admin';
import zohoReportsService from './zohoReportsService.js';
import { syncInventory, syncInventoryCustomerIds } from '../syncInventory.js';
import productSyncService from './productSyncService.js';

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
    const itemsSnapshot = await db.collection('items')
      .where('item_id', 'in', batch)
      .get();
    
    itemsSnapshot.forEach(doc => {
      const itemData = doc.data();
      itemsMap.set(itemData.item_id, {
        manufacturer: itemData.Manufacturer || itemData.manufacturer || 'Unknown',
        name: itemData.name || itemData.item_name,
        sku: itemData.sku
      });
    });
  }
  
  // Process orders
  orders.forEach(order => {
    if (order.line_items && Array.isArray(order.line_items)) {
      order.line_items.forEach(item => {
        const itemInfo = itemsMap.get(item.item_id) || {};
        const manufacturer = itemInfo.manufacturer || 'Unknown';
        
        // Check if marketplace order
        const isMarketplaceOrder = 
          order.customer_name === 'Amazon UK - Customer' ||
        
        const itemTotal = item.item_total || item.total || 
                        (parseFloat(item.rate || 0) * parseInt(item.quantity || 0));
        
        transactions.push({
          transaction_id: item.line_item_id || `${order.salesorder_id}_${item.item_id}`,
          item_id: item.item_id,
          item_name: item.name,
          sku: item.sku || itemInfo.sku,
          manufacturer: manufacturer,
          brand: manufacturer, // Keep for compatibility
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
    
    // Get all purchase orders (not just pending ones, since we need to check received quantities)
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
            // Get item info to find manufacturer
            const itemDoc = await db.collection('items')
              .where('item_id', '==', item.item_id)
              .limit(1)
              .get();
            
            if (!itemDoc.empty) {
              const itemData = itemDoc.docs[0].data();
              const brand = itemData.Manufacturer || itemData.manufacturer || 'Unknown';
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
    
    // Log summary
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
 * Get detailed backorder report for a specific brand
 */
async getBrandBackorderDetails(brandNormalized) {
  const db = admin.firestore();
  
  try {
    const brandDoc = await db.collection('brands').doc(brandNormalized).get();
    
    if (!brandDoc.exists) {
      return null;
    }
    
    const brand = brandDoc.data();
    const backorderInfo = brand.backorder_info || {};
    
    // Group backorders by purchase order
    const backordersByPO = {};
    
    if (backorderInfo.backorder_details) {
      backorderInfo.backorder_details.forEach(item => {
        if (!backordersByPO[item.po_number]) {
          backordersByPO[item.po_number] = {
            po_number: item.po_number,
            po_date: item.po_date,
            po_status: item.po_status,
            vendor_name: item.vendor_name,
            items: [],
            total_backorder_value: 0,
            total_backorder_quantity: 0
          };
        }
        
        backordersByPO[item.po_number].items.push(item);
        backordersByPO[item.po_number].total_backorder_value += item.backorder_value;
        backordersByPO[item.po_number].total_backorder_quantity += item.backorder_quantity;
      });
    }
    
    return {
      brand_name: brand.brand_name,
      summary: {
        items_on_backorder: backorderInfo.items_on_backorder || 0,
        backorder_value: backorderInfo.backorder_value || 0,
        items_in_transit: backorderInfo.items_in_transit || 0,
        total_backorder_items: backorderInfo.total_backorder_items || 0
      },
      backorders_by_po: Object.values(backordersByPO),
      last_updated: backorderInfo.last_updated
    };
    
  } catch (error) {
    console.error('❌ Error fetching brand backorder details:', error);
    return null;
  }
}

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
        items: new Map(), // For tracking best selling items
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
    
    // Generate summary statistics
    const brandsSummary = Array.from(brandStats.entries()).map(([key, stats]) => ({
      brand: brandMappings[key].display,
      revenue: stats.total_revenue,
      orders: stats.unique_orders.size,
      quantity: stats.total_quantity,
      marketShare: totalRevenue > 0 ? (stats.total_revenue / totalRevenue) * 100 : 0
    }));
    
    // Sort for top 5
    const top5Revenue = [...brandsSummary].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const top5Orders = [...brandsSummary].sort((a, b) => b.orders - a.orders).slice(0, 5);
    
    console.log(`✅ Updated statistics for ${brandStats.size} brands`);
    console.log('📊 Top 5 Brands by Revenue:', top5Revenue.map(b => `${b.brand}: £${b.revenue.toFixed(2)}`));
    console.log('📦 Top 5 Brands by Orders:', top5Orders.map(b => `${b.brand}: ${b.orders} orders`));
    
    return { 
      success: true, 
      brandsUpdated: brandStats.size,
      summary: {
        top5Revenue,
        top5Orders,
        totalRevenue,
        brands: brandsSummary
      }
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
    
    // Query items collection for each brand
    for (const [brandKey, searchTerms] of Object.entries(brandSearchTerms)) {
      let activeCount = 0;
      
      for (const term of searchTerms) {
        const snapshot = await db.collection('items')
          .where('Manufacturer', '==', term)
          .where('status', '==', 'active')
          .get();
        
        activeCount += snapshot.size;
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
      false; // Add false as default to ensure it's never undefined
    
    // Map salesperson_id to uid if not marketplace
    if (!isMarketplaceOrder && order.salesperson_id && usersByZohoId.has(order.salesperson_id)) {
      salespersonUid = usersByZohoId.get(order.salesperson_id).uid;
    }
    
    return {
      ...order,
      salesperson_uid: salespersonUid || null, // Use null instead of undefined
      is_marketplace_order: isMarketplaceOrder, // Will always be boolean now
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
  const db = admin.firestore(); // Add this
  
  try {
    console.log('🚀 Starting high frequency sync...');
    
    // Initialize counters - ONLY ONCE
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
    // REMOVED the extra } and the enrichNormalizedOrdersWithLineItems call
    
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
    
    // Update metadata
    await this.updateSyncMetadata('medium_frequency', {
      recordsProcessed: {
        orders: uniqueOrders.length,
        invoices: last24HourInvoices.length
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
        invoices: last24HourInvoices.length
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
      
      // Process transactions - REMOVE DUPLICATE
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
    
    // Process purchase orders - FIXED COLLECTION NAME
    if (purchaseOrders7Days.length > 0) {
      await this._batchWrite(db, 'purchaseorders', purchaseOrders7Days, 'purchaseorder_id');
    }
    
    // Update brand backorders
    console.log('📦 Updating brand backorder information...');
    const backorderResult = await this.updateBrandBackorders();
    
    console.log('🌍 Enriching customer data...');
const customerEnrichmentService = await import('./customerEnrichmentService.js');
const enrichmentResult = await customerEnrichmentService.default.enrichMissingCustomers();
console.log(`✅ Enriched ${enrichmentResult.enriched} customers`);
    
    // Update customer analytics
    console.log('👥 Updating customer analytics...');
    const customers = await zohoReportsService.getCustomerAnalytics('7_days');
    if (customers.customers && customers.customers.length > 0) {
      const customerData = customers.customers.map(customer => ({
        customer_id: customer.id,
        name: customer.name,
        email: customer.email,
        totalSpent: customer.totalSpent,
        orderCount: customer.orderCount,
        lastOrderDate: customer.lastOrderDate,
        firstOrderDate: customer.firstOrderDate,
        segment: customer.segment,
        agentId: customer.agentId,
        last_modified: admin.firestore.FieldValue.serverTimestamp()
      }));
      
      await this._batchWrite(db, 'customer_data', customerData, 'customer_id');
    }
    
    // Update metadata
    await this.updateSyncMetadata('low_frequency', {
      recordsProcessed: {
        products: productSyncResult.stats,
        orders: orders7Days.length,
        invoices: uniqueInvoices.length,
        purchaseOrders: purchaseOrders7Days.length,
        customers: customers.customers?.length || 0,
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
        customers: customers.customers?.length || 0
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