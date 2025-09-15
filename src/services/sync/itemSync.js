import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { zohoAuth } from '../../config/zoho.js';
import { logger } from '../../utils/logger.js';

export class ItemSyncService extends BaseSyncService {
  constructor() {
    super('items', 'items', 'items'); // Changed from 'products' to 'items'
  }

  async fetchZohoData(params = {}) {
    const allRecords = [];
    let page = 1;
    let hasMore = true;
    const maxRecords = params.limit || 1000;

    // Remove the last_modified_time filter that's causing 400 errors
    const cleanParams = { ...params };
    delete cleanParams.last_modified_time;

    while (hasMore && allRecords.length < maxRecords) {
      try {
        const response = await zohoAuth.getInventoryData('items', {
          page,
          per_page: Math.min(200, maxRecords - allRecords.length),
          ...cleanParams,
        });

        const records = response.items || [];
        allRecords.push(...records);

        hasMore = response.page_context?.has_more_page || false;
        page++;

        if (hasMore && allRecords.length < maxRecords) {
          await this.delay(this.delayMs);
        }
      } catch (error) {
        logger.error('Failed to fetch items from Zoho:', error);
        throw error;
      }
    }

    if (allRecords.length >= maxRecords) {
      logger.warn(`Reached record limit of ${maxRecords} for items`);
    }

    return allRecords;
  }

  extractBrandFromName(name) {
    const brands = ['Pernod Ricard', 'PR', 'Moet Hennessy', 'MH', 'Brown Foreman', 'BF'];
    
    for (const brand of brands) {
      if (name && name.toUpperCase().includes(brand.toUpperCase())) {
        return brand;
      }
    }
    
    return null;
  }

  async getBrandId(brandName) {
    if (!brandName) return null;

    try {
      const { data } = await supabase
        .from('brands')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('brand_normalized', brandName.toUpperCase())
        .single();

      return data?.id || null;
    } catch (error) {
      return null;
    }
  }

  async transformRecord(zohoItem) {
    const brandName = this.extractBrandFromName(zohoItem.name) || 
                      this.extractBrandFromName(zohoItem.description);
    
    const brandId = await this.getBrandId(brandName);

    return {
      name: zohoItem.name,
      description: zohoItem.description || '',
      category: zohoItem.category_name || null,
      sku: zohoItem.sku || zohoItem.item_id,
      ean: zohoItem.ean || null,
      purchase_price: parseFloat(zohoItem.purchase_rate) || 0,
      retail_price: parseFloat(zohoItem.rate) || 0,
      brand_id: brandId,
      gross_stock_level: parseInt(zohoItem.stock_on_hand) || 0,
      committed_stock: parseInt(zohoItem.committed_stock) || 0,
      net_stock_level: (parseInt(zohoItem.stock_on_hand) || 0) - (parseInt(zohoItem.committed_stock) || 0),
      reorder_level: parseInt(zohoItem.reorder_level) || 0,
      status: zohoItem.status === 'active' ? 'active' : 'inactive',
      created_date: zohoItem.created_time || new Date().toISOString(),
      updated_at: zohoItem.last_modified_time || new Date().toISOString(),
      legacy_item_id: zohoItem.item_id,
      image_url: zohoItem.image_url || null,
      weight: parseFloat(zohoItem.weight) || null,
      dimensions: zohoItem.dimension ? `${zohoItem.dimension.length}x${zohoItem.dimension.width}x${zohoItem.dimension.height} ${zohoItem.dimension.unit}` : null,
    };
  }

  async upsertRecords(records) {
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const record of records) {
      try {
        const { data: existingItem } = await supabase
          .from(this.supabaseTable)
          .select('id')
          .eq('legacy_item_id', record.legacy_item_id) // Changed to legacy_item_id
          .single();

        if (existingItem) {
          const { error } = await supabase
            .from(this.supabaseTable)
            .update(record)
            .eq('id', existingItem.id);

          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from(this.supabaseTable)
            .insert(record);

          if (error) throw error;
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          sku: record.sku,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncSpecificIds(itemIds) {
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    logger.info(`Syncing ${itemIds.length} specific items`);

    for (const itemId of itemIds) {
      try {
        const response = await zohoAuth.getInventoryData(`items/${itemId}`);
        const zohoItem = response.item;
        
        if (zohoItem) {
          const transformed = await this.transformRecord(zohoItem);
          const result = await this.upsertRecords([transformed]);
          
          results.created += result.created;
          results.updated += result.updated;
          results.errors.push(...result.errors);
        }
        
        await this.delay(this.delayMs);
      } catch (error) {
        logger.error(`Failed to sync item ${itemId}:`, error);
        results.errors.push({
          item_id: itemId,
          error: error.message,
        });
      }
    }

    return results;
  }
}