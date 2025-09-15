import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class OrderSyncService extends BaseSyncService {
  constructor() {
    super('salesorders', 'salesorders', 'orders');
  }

  mapZohoStatus(zohoStatus) {
    const statusMap = {
      'draft': 'pending',
      'open': 'confirmed',
      'confirmed': 'confirmed',
      'closed': 'delivered',
      'void': 'cancelled',
      'cancelled': 'cancelled',
    };
    
    return statusMap[zohoStatus?.toLowerCase()] || 'pending';
  }

  async getSalespersonId(zohoSpId) {
    if (!zohoSpId) return null;

    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('zoho_sp_id', zohoSpId)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug(`Salesperson not found for Zoho SP ID: ${zohoSpId}`);
      return null;
    }
  }

  async getCustomerId(zohoCustomerId) {
    if (!zohoCustomerId) return null;

    try {
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('linked_company', COMPANY_ID)
        .eq('zoho_customer_id', zohoCustomerId)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug(`Customer not found for Zoho customer ID: ${zohoCustomerId}`);
      return null;
    }
  }

  async transformRecord(zohoOrder) {
    const [customerId, salespersonId] = await Promise.all([
      this.getCustomerId(zohoOrder.customer_id),
      this.getSalespersonId(zohoOrder.salesperson_id),
    ]);

    return {
      company_id: COMPANY_ID,
      legacy_order_number: zohoOrder.salesorder_number,
      order_date: zohoOrder.date ? new Date(zohoOrder.date).toISOString() : new Date().toISOString(),
      order_status: this.mapZohoStatus(zohoOrder.status),
      sub_total: parseFloat(zohoOrder.sub_total) || 0,
      discount_applied: zohoOrder.discount > 0,
      discount_percentage: zohoOrder.discount_percent || null,
      total: parseFloat(zohoOrder.total) || 0,
      customer_id: customerId,
      sales_id: salespersonId,
      notes: zohoOrder.notes || null,
      legacy_order_id: zohoOrder.salesorder_id,
      created_at: zohoOrder.created_time || new Date().toISOString(),
      updated_at: zohoOrder.last_modified_time || new Date().toISOString(),
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
        if (!record.customer_id) {
          logger.warn(`Skipping order ${record.legacy_order_number} - no matching customer found`);
          continue;
        }

        const { data: existingOrder } = await supabase
          .from(this.supabaseTable)
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('legacy_order_id', record.legacy_order_id)
          .single();

        if (existingOrder) {
          const { error } = await supabase
            .from(this.supabaseTable)
            .update(record)
            .eq('id', existingOrder.id);

          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from(this.supabaseTable)
            .insert(record);

          if (error) throw error;
          results.created++;
        }

        await this.syncOrderItems(record.legacy_order_id, zohoOrder.line_items);
      } catch (error) {
        results.errors.push({
          order: record.legacy_order_number,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncOrderItems(orderId, lineItems) {
    if (!lineItems || lineItems.length === 0) return;

    try {
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('legacy_order_id', orderId)
        .single();

      if (!order) return;

      const orderItems = await Promise.all(lineItems.map(async (item) => {
        const { data: product } = await supabase
          .from('items')
          .select('id')
          .eq('sku', item.sku || item.item_id)
          .single();

        return {
          order_id: order.id,
          item_id: product?.id || null,
          item_name: item.name || item.item_name,
          item_sku: item.sku || item.item_id,
          legacy_item_id: item.item_id,
          quantity: parseInt(item.quantity) || 0,
          unit_price: parseFloat(item.rate) || 0,
          total_price: parseFloat(item.item_total) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }));

      const { error } = await supabase
        .from('order_line_items')
        .upsert(orderItems, {
          onConflict: 'order_id,item_sku',
        });

      if (error) throw error;
    } catch (error) {
      logger.error(`Failed to sync order items for order ${orderId}:`, error);
    }
  }
}