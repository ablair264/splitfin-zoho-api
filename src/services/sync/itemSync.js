import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';

export class ItemSyncService extends BaseSyncService {
  constructor() {
    super('items', 'items', 'items'); // Changed from 'products' to 'items'
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

  getConflictColumns() {
    return 'sku';
  }
}