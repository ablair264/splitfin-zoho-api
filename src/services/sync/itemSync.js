import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID } from '../../config/database.js';

export class ItemSyncService extends BaseSyncService {
  constructor() {
    super('items', 'items', 'products');
  }

  extractBrandFromName(name) {
    const brands = ['Pernod Ricard', 'PR', 'Moet Hennessy', 'MH', 'Brown Foreman', 'BF'];
    
    for (const brand of brands) {
      if (name && name.toUpperCase().includes(brand.toUpperCase())) {
        return brand;
      }
    }
    
    return 'Unknown';
  }

  transformRecord(zohoItem) {
    const brand = this.extractBrandFromName(zohoItem.name) || 
                  this.extractBrandFromName(zohoItem.description) || 
                  'Unknown';

    return {
      sku: zohoItem.sku || zohoItem.item_id,
      name: zohoItem.name,
      description: zohoItem.description || '',
      unit: zohoItem.unit || 'EA',
      ean: zohoItem.ean || null,
      upc: zohoItem.upc || null,
      isbn: zohoItem.isbn || null,
      part_number: zohoItem.part_number || null,
      purchase_price: parseFloat(zohoItem.purchase_rate) || 0,
      retail_price: parseFloat(zohoItem.rate) || 0,
      sales_price: parseFloat(zohoItem.rate) || 0,
      brand: brand,
      image_url: zohoItem.image_url || null,
      thumbnail_url: zohoItem.thumbnail_url || null,
      stock_on_hand: parseFloat(zohoItem.stock_on_hand) || 0,
      available_stock: parseFloat(zohoItem.available_stock) || 0,
      reorder_level: parseFloat(zohoItem.reorder_level) || 0,
      company_id: COMPANY_ID,
      active: zohoItem.status === 'active',
      created_at: zohoItem.created_time || new Date().toISOString(),
      updated_at: zohoItem.last_modified_time || new Date().toISOString(),
      zoho_item_id: zohoItem.item_id,
      zoho_data: zohoItem,
    };
  }

  getConflictColumns() {
    return 'sku,company_id';
  }
}