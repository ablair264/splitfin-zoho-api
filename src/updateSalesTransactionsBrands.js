// updateSalesTransactionsBrands.js
import admin from 'firebase-admin';
import zohoInventoryService from './services/zohoInventoryService.js';

class BrandUpdater {
  constructor() {
    this.db = admin.firestore();
    // Define custom brand mappings
    this.customBrandMappings = {
      'birdybox': 'Relaxound',
      'junglebox': 'Relaxound',
      'lakesidebox': 'Relaxound',
      'oceanbox': 'Relaxound',
      'zwitscherbox': 'Relaxound'
    };
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
   * Check custom brand mappings
   */
  checkCustomBrandMapping(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      return null;
    }

    const lowerItemName = itemName.toLowerCase().trim();
    
    // Check if item name starts with any custom mapping
    for (const [prefix, brand] of Object.entries(this.customBrandMappings)) {
      if (lowerItemName.startsWith(prefix)) {
        return brand;
      }
    }
    
    return null;
  }

  /**
   * Extract brand from item name (first word)
   */
  extractBrandFromItemName(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      return null;
    }

    // First check custom mappings
    const customBrand = this.checkCustomBrandMapping(itemName);
    if (customBrand) {
      return customBrand;
    }

    // Otherwise extract first word
    const firstWord = itemName.trim().split(/[\s\-_,]/)[0];
    const cleanedBrand = firstWord
      .replace(/[^\w\s]/g, '')
      .trim();

    if (cleanedBrand && isNaN(cleanedBrand)) {
      return cleanedBrand;
    }

    return null;
  }

  /**
   * Get brand from Zoho Inventory by SKU
   */
  async getBrandFromZoho(sku) {
    try {
      // Search for the item in Zoho by SKU
      const token = await zohoInventoryService.getAccessToken();
      const searchResponse = await axios.get(
        `${zohoInventoryService.baseUrl}/items`,
        {
          params: {
            organization_id: zohoInventoryService.organizationId,
            sku: sku
          },
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`
          }
        }
      );

      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        const item = searchResponse.data.items[0];
        
        // Get full item details to access manufacturer/vendor fields
        const itemDetails = await zohoInventoryService.getItemDetails(item.item_id, token);
        
        if (itemDetails) {
          // Try different possible brand fields
          const brand = itemDetails.vendor_name || 
                       itemDetails.manufacturer || 
                       itemDetails.brand ||
                       itemDetails.cf_brand; // Custom field
          
          if (brand && brand !== 'Unknown' && brand !== '') {
            console.log(`✓ Found brand "${brand}" for SKU ${sku} in Zoho`);
            return brand;
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Could not fetch from Zoho for SKU ${sku}:`, error.message);
    }
    
    return null;
  }

  /**
   * Fix r-der brand_normalized entries
   */
  async fixRaderBrands() {
    console.log('🔧 Fixing r-der brand entries...');
    
    const raderQuery = this.db.collection('sales_transactions')
      .where('brand_normalized', '==', 'r-der');
    
    const raderSnapshot = await raderQuery.get();
    
    if (raderSnapshot.empty) {
      console.log('No r-der entries found');
      return 0;
    }
    
    let fixedCount = 0;
    const batchSize = 500;
    
    for (let i = 0; i < raderSnapshot.docs.length; i += batchSize) {
      const batch = this.db.batch();
      const batchDocs = raderSnapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach(doc => {
        batch.update(doc.ref, {
          brand: 'Rader',  // Proper display name
          brand_normalized: 'rader',
          _brand_fixed_from_r_der: true,
          _brand_updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        fixedCount++;
      });
      
      await batch.commit();
      console.log(`✅ Fixed ${fixedCount} r-der entries so far...`);
    }
    
    console.log(`✅ Fixed ${fixedCount} total r-der entries`);
    return fixedCount;
  }

  /**
   * Update brands with multi-step approach
   */
  async updateAllBrands() {
    console.log('🔄 Starting brand update for sales_transactions...');
    
    // First, fix r-der entries
    const fixedRaderCount = await this.fixRaderBrands();
    
    let totalProcessed = 0;
    let updatedFromProducts = 0;
    let updatedFromZoho = 0;
    let updatedFromItemName = 0;
    let skipped = 0;
    let lastDoc = null;
    const batchSize = 100; // Smaller batch size due to Zoho API calls

    try {
      // First create SKU to brand map from products collection
      const productsSnapshot = await this.db.collection('products').get();
      const skuToBrandMap = new Map();

      productsSnapshot.forEach(doc => {
        const product = doc.data();
        if (product.sku && product.brand && product.brand !== 'Unknown') {
          skuToBrandMap.set(product.sku, {
            brand: product.brand,
            brand_normalized: product.brand_normalized || this.normalizeBrandName(product.brand)
          });
        }
      });

      console.log(`📦 Created brand map with ${skuToBrandMap.size} products`);

      let hasMore = true;

      while (hasMore) {
        // Query for ALL documents to check for missing brand field
        let query = this.db.collection('sales_transactions')
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        // Process in batches
        const batch = this.db.batch();
        let batchUpdateCount = 0;

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const sku = data.sku;
          const itemName = data.item_name || data.name;
          
          // Check if brand field is missing, empty, or "Unknown Brand"
          if (!data.brand || data.brand === '' || data.brand === 'Unknown Brand') {
            let brand = null;
            let updateSource = null;

            // Step 1: Try to get brand from products collection
            if (sku && skuToBrandMap.has(sku)) {
              const brandInfo = skuToBrandMap.get(sku);
              brand = brandInfo.brand;
              updateSource = 'products_collection';
              updatedFromProducts++;
            }
            
            // Step 2: Try to get brand from Zoho Inventory
            if (!brand && sku) {
              const zohoBrand = await this.getBrandFromZoho(sku);
              if (zohoBrand) {
                brand = zohoBrand;
                updateSource = 'zoho_inventory';
                updatedFromZoho++;
              }
            }
            
            // Step 3: Extract from item name
            if (!brand && itemName) {
              const extractedBrand = this.extractBrandFromItemName(itemName);
              if (extractedBrand) {
                brand = extractedBrand;
                updateSource = 'item_name_extraction';
                updatedFromItemName++;
              }
            }

            if (brand) {
              const updates = {
                brand: brand,
                brand_normalized: this.normalizeBrandName(brand),
                _brand_update_source: updateSource,
                _brand_updated_at: admin.firestore.FieldValue.serverTimestamp()
              };

              batch.update(doc.ref, updates);
              batchUpdateCount++;
            } else {
              skipped++;
            }
          }
          
          totalProcessed++;
        }

        // Commit the batch if there are updates
        if (batchUpdateCount > 0) {
          await batch.commit();
          console.log(`✅ Updated ${batchUpdateCount} documents in this batch`);
        }
        
        console.log(`✅ Processed batch: ${totalProcessed} total processed`);
        console.log(`   - From products: ${updatedFromProducts}`);
        console.log(`   - From Zoho: ${updatedFromZoho}`);
        console.log(`   - From item name: ${updatedFromItemName}`);
        console.log(`   - Skipped: ${skipped}`);

        // Update last document for pagination
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        // Delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const totalUpdated = updatedFromProducts + updatedFromZoho + updatedFromItemName + fixedRaderCount;

      console.log(`\n✅ Brand update completed!`);
      console.log(`📊 Total processed: ${totalProcessed}`);
      console.log(`📊 Total updated: ${totalUpdated}`);
      console.log(`   - Fixed r-der entries: ${fixedRaderCount}`);
      console.log(`   - From products collection: ${updatedFromProducts}`);
      console.log(`   - From Zoho Inventory: ${updatedFromZoho}`);
      console.log(`   - From item name: ${updatedFromItemName}`);
      console.log(`📊 Skipped (no brand found): ${skipped}`);

      return {
        success: true,
        totalProcessed,
        totalUpdated,
        fixedRaderCount,
        updatedFromProducts,
        updatedFromZoho,
        updatedFromItemName,
        skipped
      };

    } catch (error) {
      console.error('❌ Error updating brands:', error);
      throw error;
    }
  }

  /**
   * Preview what brands would be extracted
   */
  async previewBrandExtraction(limit = 20) {
    console.log('👀 Previewing brand extraction...\n');

    // Check for r-der entries
    const raderCount = await this.db.collection('sales_transactions')
      .where('brand_normalized', '==', 'r-der')
      .count()
      .get();
    
    console.log(`Found ${raderCount.data().count} r-der entries to fix`);

    const snapshot = await this.db.collection('sales_transactions')
      .where('brand', 'in', ['Unknown Brand', '', null])
      .limit(limit)
      .get();

    const preview = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const itemName = data.item_name || data.name;
      const sku = data.sku;
      
      let suggestedBrand = null;
      let source = null;

      // Check products collection
      const productDoc = sku ? await this.db.collection('products')
        .where('sku', '==', sku)
        .limit(1)
        .get() : null;
      
      if (productDoc && !productDoc.empty) {
        const product = productDoc.docs[0].data();
        if (product.brand && product.brand !== 'Unknown') {
          suggestedBrand = product.brand;
          source = 'products_collection';
        }
      }

      // If not found, would check Zoho (skipping in preview for speed)
      if (!suggestedBrand && sku) {
        source = 'would_check_zoho';
      }

      // If still not found, extract from item name
      if (!suggestedBrand && itemName) {
        suggestedBrand = this.extractBrandFromItemName(itemName);
        source = suggestedBrand ? 'item_name_extraction' : 'no_brand_found';
      }
      
      preview.push({
        docId: doc.id.substring(0, 8) + '...',
        sku: sku || 'N/A',
        itemName: itemName ? itemName.substring(0, 50) + '...' : 'N/A',
        currentBrand: data.brand || 'null',
        suggestedBrand: suggestedBrand || 'N/A',
        source: source
      });
    }

    console.table(preview);
    return preview;
  }
}

// The rest remains the same...