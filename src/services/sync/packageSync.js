import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class PackageSyncService extends BaseSyncService {
  constructor() {
    super('packages', 'packages', 'shipments');
  }

  mapShipmentStatus(zohoStatus) {
    const statusMap = {
      'not_shipped': 'pending',
      'shipped': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
    };
    
    return statusMap[zohoStatus?.toLowerCase()] || 'pending';
  }

  async getOrderId(zohoOrderId) {
    if (!zohoOrderId) return null;

    try {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('legacy_order_id', zohoOrderId)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug(`Order not found for Zoho order ID: ${zohoOrderId}`);
      return null;
    }
  }

  async transformRecord(zohoPackage) {
    const orderId = await this.getOrderId(zohoPackage.salesorder_id);

    return {
      order_id: orderId,
      tracking_number: zohoPackage.tracking_number || null,
      carrier: zohoPackage.delivery_method || zohoPackage.shipment_carrier || 'Unknown',
      status: this.mapShipmentStatus(zohoPackage.status),
      shipped_date: zohoPackage.shipment_date || null,
      delivered_date: zohoPackage.delivered_date || null,
      estimated_delivery_date: zohoPackage.delivery_days ? 
        new Date(new Date(zohoPackage.shipment_date).getTime() + 
        (parseInt(zohoPackage.delivery_days) * 24 * 60 * 60 * 1000)).toISOString() : null,
      shipping_cost: parseFloat(zohoPackage.shipping_charge) || 0,
      weight: parseFloat(zohoPackage.weight) || null,
      weight_unit: zohoPackage.weight_unit || 'kg',
      dimensions: zohoPackage.dimension ? {
        length: parseFloat(zohoPackage.dimension.length) || null,
        width: parseFloat(zohoPackage.dimension.width) || null,
        height: parseFloat(zohoPackage.dimension.height) || null,
        unit: zohoPackage.dimension.unit || 'cm',
      } : null,
      shipping_address: zohoPackage.customer_address || null,
      notes: zohoPackage.notes || null,
      company_id: COMPANY_ID,
      created_at: zohoPackage.created_time || new Date().toISOString(),
      updated_at: zohoPackage.last_modified_time || new Date().toISOString(),
      external_package_id: zohoPackage.package_id,
      package_number: zohoPackage.package_number,
      shipment_items: zohoPackage.line_items || [],
      zoho_data: zohoPackage,
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
        if (!record.order_id) {
          logger.warn(`Skipping package ${record.package_number} - no matching order found`);
          continue;
        }

        const { data: existingShipment } = await supabase
          .from(this.supabaseTable)
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('external_package_id', record.external_package_id)
          .single();

        if (existingShipment) {
          const { error } = await supabase
            .from(this.supabaseTable)
            .update(record)
            .eq('id', existingShipment.id);

          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from(this.supabaseTable)
            .insert(record);

          if (error) throw error;
          results.created++;
        }

        await this.syncShipmentItems(record.external_package_id, record.shipment_items);
      } catch (error) {
        results.errors.push({
          package: record.package_number,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncShipmentItems(packageId, items) {
    if (!items || items.length === 0) return;

    try {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('external_package_id', packageId)
        .single();

      if (!shipment) return;

      const shipmentItems = await Promise.all(items.map(async (item) => {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('sku', item.sku || item.item_id)
          .single();

        return {
          shipment_id: shipment.id,
          product_id: product?.id || null,
          product_sku: item.sku || item.item_id,
          product_name: item.name || item.item_name,
          quantity_shipped: parseFloat(item.quantity) || 0,
          company_id: COMPANY_ID,
        };
      }));

      const { error } = await supabase
        .from('shipment_items')
        .upsert(shipmentItems, {
          onConflict: 'shipment_id,product_sku,company_id',
        });

      if (error) throw error;
    } catch (error) {
      logger.error(`Failed to sync shipment items for package ${packageId}:`, error);
    }
  }
}