// server/src/services/productSyncService.js
import axios from 'axios';
import admin from 'firebase-admin';
import { getAccessToken } from '../api/zoho.js';

class ProductSyncService {
  constructor() {
    this.db = admin.firestore();
    this.baseUrl = 'https://www.zohoapis.eu/inventory/v1';
    this.orgId = process.env.ZOHO_ORG_ID;
  }

  /**
   * Fetch all products from Zoho Inventory with proper fields
   */
  async fetchAllProducts() {
    console.log('🔄 Fetching all products from Zoho Inventory...');
    
    try {
      const token = await getAccessToken();
      const allProducts = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await axios.get(`${this.baseUrl}/items`, {
          params: {
            organization_id: this.orgId,
            page: page,
            per_page: 200 // Max allowed
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
          // For each item, we need to get full details
          for (const item of items) {
            const fullItem = await this.getItemDetails(item.item_id, token);
            if (fullItem) {
              allProducts.push(fullItem);
            }
          }
          
          console.log(`Fetched page ${page}, total products so far: ${allProducts.length}`);
          page++;
          
          // Add delay to respect rate limits
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
   * Get full item details including vendor info
   */
  async getItemDetails(itemId, token) {
    try {
      const response = await axios.get(`${this.baseUrl}/items/${itemId}`, {
        params: {
          organization_id: this.orgId
        },
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`
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
   * Sync products to Firebase with correct field mapping
   */
  async syncProductsToFirebase() {
    console.log('🚀 Starting product sync to Firebase...');
    
    try {
      // Fetch all products from Zoho
      const zohoProducts = await this.fetchAllProducts();
      
      if (zohoProducts.length === 0) {
        console.log('No products found in Zoho');
        return { success: true, count: 0 };
      }
      
      // Process and save to Firebase
      let batch = this.db.batch();
      let count = 0;
      const batchSize = 400;
      
      for (const zohoProduct of zohoProducts) {
        // Map Zoho fields to Firebase fields
        const firebaseProduct = {
          // Core identifiers
          item_id: zohoProduct.item_id,
          name: zohoProduct.name || '',
          sku: zohoProduct.sku || '',
          ean: zohoProduct.ean || zohoProduct.upc || '', // EAN might be stored as UPC
          
          // Pricing
          rate: parseFloat(zohoProduct.rate || 0),
          purchase_rate: parseFloat(zohoProduct.purchase_rate || 0),
          
          // Vendor/Brand info
          vendor_id: zohoProduct.vendor_id || '',
          vendor_name: zohoProduct.vendor_name || '',
          brand: zohoProduct.vendor_name || '', // Also store as brand for compatibility
          brand_normalized: this.normalizeBrandName(zohoProduct.vendor_name || ''),
          
          // Stock levels
          available_stock: parseInt(zohoProduct.available_for_sale_stock || 0),
          actual_available_stock: parseInt(zohoProduct.actual_available_for_sale_stock || 0),
          stock_on_hand: parseInt(zohoProduct.stock_on_hand || 0),
          
          // Additional useful fields
          description: zohoProduct.description || '',
          category: zohoProduct.category_name || '',
          status: zohoProduct.status || 'active',
          unit: zohoProduct.unit || '',
          
          // Images
          imageUrl: zohoProduct.image_url || '',
          image_document_id: zohoProduct.image_document_id || '',
          
          // Metadata
          created_time: zohoProduct.created_time,
          last_modified_time: zohoProduct.last_modified_time,
          _source: 'zoho_inventory',
          _synced_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Use item_id as document ID
        const docRef = this.db.collection('products').doc(zohoProduct.item_id);
        batch.set(docRef, firebaseProduct, { merge: true });
        count++;
        
        // Commit batch when limit reached
        if (count % batchSize === 0) {
          await batch.commit();
          console.log(`✅ Synced ${count} products...`);
          batch = this.db.batch();
        }
      }
      
      // Commit remaining
      if (count % batchSize !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Successfully synced ${count} products to Firebase`);
      
      // Update sync metadata
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
   * Normalize brand name for consistency
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
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const metadata = await this.db.collection('sync_metadata').doc('products_sync').get();
      const productCount = await this.db.collection('products').count().get();
      
      return {
        lastSync: metadata.exists ? metadata.data().lastSync : null,
        productCount: productCount.data().count,
        status: metadata.exists ? metadata.data().status : 'never_run'
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  }
}

export default new ProductSyncService();