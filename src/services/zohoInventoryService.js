// server/src/services/zohoInventoryService.js
import axios from 'axios';
import admin from 'firebase-admin';
import { getAccessToken } from '../api/zoho.js';

const ZOHO_CONFIG = {
  baseUrls: {
    crm: 'https://www.zohoapis.eu/crm/v5',
    inventory: 'https://www.zohoapis.eu/inventory/v1',
    analytics: 'https://analyticsapi.zoho.eu/restapi/v2'
  },
  orgId: process.env.ZOHO_ORG_ID,
  pagination: {
    defaultPerPage: 200,
    maxPerPage: 200
  }
};

class ZohoInventoryService {
  constructor() {
    this.db = admin.firestore();
    this.baseUrl = ZOHO_CONFIG.baseUrls.inventory;
    this.organizationId = ZOHO_CONFIG.orgId;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get a valid access token
   */
  async getAccessToken() {
    return await getAccessToken();
  }

  /**
   * Generic paginated fetch with caching (from zohoReportsService)
   */
  async fetchPaginatedData(url, params = {}, dataKey = 'data', useCache = true) {
    const cacheKey = `${url}_${JSON.stringify(params)}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📄 Using cached data for ${url}`);
        return cached.data;
      }
    }

    const allData = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const token = await this.getAccessToken();
        
        const response = await axios.get(url, {
          params: {
            ...params,
            organization_id: this.organizationId,
            page,
            per_page: ZOHO_CONFIG.pagination.defaultPerPage
          },
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
          timeout: 30000
        });

        const items = response.data[dataKey] || [];
        
        if (items.length === 0) {
          hasMore = false;
        } else {
          allData.push(...items);
          page++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }

      } catch (error) {
        console.warn(`⚠️ Error on page ${page}:`, error.message);
        break;
      }
    }

    if (useCache && allData.length > 0) {
      this.cache.set(cacheKey, {
        data: allData,
        timestamp: Date.now()
      });
    }

    return allData;
  }

  /**
   * Get specific sales order with line items
   */
  async getSalesOrder(orderId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/salesorders/${orderId}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            organization_id: this.organizationId
          }
        }
      );
      
      const order = response.data?.salesorder;
      
      if (order) {
        // Ensure customer name is included
        if (!order.customer_name && order.customer_id) {
          order.customer_name = `Customer ${order.customer_id}`;
        }
        
        // Process line items
        if (order.line_items && Array.isArray(order.line_items)) {
          order.line_items = order.line_items.map(item => ({
            ...item,
            item_id: item.item_id,
            item_name: item.name || item.item_name,
            quantity: item.quantity || 0,
            rate: item.rate || 0,
            total: item.item_total || (item.quantity * item.rate) || 0
          }));
        }
      }
      
      return order;
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`Order ${orderId} not found in Zoho`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch all products with full details (from productSyncService)
   */
  async fetchAllProducts() {
    console.log('🔄 Fetching all products from Zoho Inventory...');
    
    try {
      const token = await this.getAccessToken();
      const allProducts = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await axios.get(`${this.baseUrl}/items`, {
          params: {
            organization_id: this.organizationId,
            page: page,
            per_page: 200
          },
          headers: {
            Authorization: `Zoho-oauthtoken ${token}`
          },
          timeout: 30000
        });
        
        const items = response.data.items || [];
        
        if (items.length === 0) {
          hasMore = false;
        } else {
          // Get full details for each item
          for (const item of items) {
            const fullItem = await this.getItemDetails(item.item_id, token);
            if (fullItem) {
              allProducts.push(fullItem);
            }
          }
          
          console.log(`Fetched page ${page}, total products so far: ${allProducts.length}`);
          page++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Fetched ${allProducts.length} products from Zoho`);
      return allProducts;
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get full item details
   */
  async getItemDetails(itemId, token) {
    try {
      const response = await axios.get(`${this.baseUrl}/items/${itemId}`, {
        params: {
          organization_id: this.organizationId
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${token || await this.getAccessToken()}`
        },
        timeout: 30000
      });
      
      return response.data.item;
      
    } catch (error) {
      console.error(`Error fetching details for item ${itemId}:`, error.message);
      return null;
    }
  }

  /**
   * Sync products to Firebase
   */
  async syncProductsToFirebase() {
    console.log('🚀 Starting product sync to Firebase...');
    
    try {
      const zohoProducts = await this.fetchAllProducts();
      
      if (zohoProducts.length === 0) {
        console.log('No products found in Zoho');
        return { success: true, count: 0 };
      }
      
      let batch = this.db.batch();
      let count = 0;
      const batchSize = 400;
      
      for (const zohoProduct of zohoProducts) {
        const firebaseProduct = {
          item_id: zohoProduct.item_id,
          name: zohoProduct.name || '',
          sku: zohoProduct.sku || '',
          ean: zohoProduct.ean || zohoProduct.upc || '',
          
          rate: parseFloat(zohoProduct.rate || 0),
          purchase_rate: parseFloat(zohoProduct.purchase_rate || 0),
          
          vendor_id: zohoProduct.vendor_id || '',
          vendor_name: zohoProduct.vendor_name || '',
          brand: zohoProduct.vendor_name || '',
          brand_normalized: this.normalizeBrandName(zohoProduct.vendor_name || ''),
          
          available_stock: parseInt(zohoProduct.available_for_sale_stock || 0),
          actual_available_stock: parseInt(zohoProduct.actual_available_for_sale_stock || 0),
          stock_on_hand: parseInt(zohoProduct.stock_on_hand || 0),
          
          description: zohoProduct.description || '',
          category: zohoProduct.category_name || '',
          status: zohoProduct.status || 'active',
          unit: zohoProduct.unit || '',
          
          imageUrl: zohoProduct.image_url || '',
          image_document_id: zohoProduct.image_document_id || '',
          
          created_time: zohoProduct.created_time,
          last_modified_time: zohoProduct.last_modified_time,
          _source: 'zoho_inventory',
          _synced_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = this.db.collection('items').doc(zohoProduct.item_id);
        batch.set(docRef, firebaseProduct, { merge: true });
        count++;
        
        if (count % batchSize === 0) {
          await batch.commit();
          console.log(`✅ Synced ${count} products...`);
          batch = this.db.batch();
        }
      }
      
      if (count % batchSize !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Successfully synced ${count} products to Firebase`);
      
      await this.db.collection('sync_metadata').doc('products_sync').set({
        lastSync: admin.firestore.FieldValue.serverTimestamp(),
        productCount: count,
        status: 'completed'
      });
      
      return { success: true, count };
      
    } catch (error) {
      console.error('❌ Product sync failed:', error);
      throw error;
    }
  }

  /**
   * Get sales orders for a date range
   */
  async getSalesOrders(dateRange = '30_days', customDateRange = null, agentId = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      const params = {
        date_start: startDate.toISOString().split('T')[0],
        date_end: endDate.toISOString().split('T')[0]
      };

      if (agentId) {
        params.salesperson_id = agentId;
      }

      const salesOrderList = await this.fetchPaginatedData(
        `${this.baseUrl}/salesorders`,
        params,
        'salesorders'
      );
      
      console.log(`Found ${salesOrderList.length} orders. Fetching details...`);

      const detailedOrders = [];
      for (const orderHeader of salesOrderList) {
        const orderDetail = await this.getSalesOrder(orderHeader.salesorder_id);
        if (orderDetail) {
          detailedOrders.push(orderDetail);
        }
        await new Promise(resolve => setTimeout(resolve, 50)); 
      }

      console.log(`✅ Successfully fetched details for ${detailedOrders.length} orders.`);
      return detailedOrders;

    } catch (error) {
      console.error('❌ Error fetching sales orders:', error);
      throw error;
    }
  }

  /**
   * Get purchase orders
   */
  async getPurchaseOrders(dateRange = '30_days', customDateRange = null) {
    try {
      const { startDate, endDate } = this.getDateRange(dateRange, customDateRange);
      
      const params = {
        date_start: startDate.toISOString().split('T')[0],
        date_end: endDate.toISOString().split('T')[0]
      };

      const purchaseOrderList = await this.fetchPaginatedData(
        `${this.baseUrl}/purchaseorders`,
        params,
        'purchaseorders'
      );

      console.log(`Found ${purchaseOrderList.length} purchase orders. Fetching details...`);

      const detailedPurchaseOrders = [];
      for (const poHeader of purchaseOrderList) {
        const poDetail = await this.getPurchaseOrderDetail(poHeader.purchaseorder_id);
        if (poDetail) {
          detailedPurchaseOrders.push(poDetail);
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return detailedPurchaseOrders;

    } catch (error) {
      console.error('❌ Error fetching purchase orders:', error);
      throw error;
    }
  }

  /**
   * Get purchase order detail
   */
  async getPurchaseOrderDetail(purchaseorder_id) {
    try {
      const url = `${this.baseUrl}/purchaseorders/${purchaseorder_id}`;
      const token = await this.getAccessToken();
      
      const response = await axios.get(url, {
        params: { organization_id: this.organizationId },
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });

      return response.data?.purchaseorder;

    } catch (error) {
      console.error(`❌ Error fetching purchase order ${purchaseorder_id}:`, error.message);
      return null;
    }
  }

  /**
   * Normalize brand name
   */
  normalizeBrandName(brandName) {
    if (!brandName) return 'unknown';
    
    return brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get date range utility
   */
  getDateRange(dateRange, customDateRange = null) {
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
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }

    return { startDate, endDate };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('📄 Cache cleared');
  }
}

export default new ZohoInventoryService();