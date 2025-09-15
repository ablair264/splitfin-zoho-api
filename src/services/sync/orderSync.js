import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class OrderSyncService extends BaseSyncService {
  constructor() {
    super('salesorders', 'salesorders', 'orders');
  }

  mapZohoStatus(zohoStatus) {
    const statusMap = {
      'draft': 'draft',
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
        .eq('company_id', COMPANY_ID)
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
      order_number: zohoOrder.salesorder_number,
      customer_id: customerId,
      status: this.mapZohoStatus(zohoOrder.status),
      order_date: zohoOrder.date || new Date().toISOString(),
      delivery_date: zohoOrder.delivery_date || null,
      subtotal: parseFloat(zohoOrder.sub_total) || 0,
      tax_amount: parseFloat(zohoOrder.tax_total) || 0,
      shipping_charge: parseFloat(zohoOrder.shipping_charge) || 0,
      discount_amount: parseFloat(zohoOrder.discount) || 0,
      total_amount: parseFloat(zohoOrder.total) || 0,
      currency_code: zohoOrder.currency_code || 'USD',
      notes: zohoOrder.notes || null,
      internal_notes: zohoOrder.internal_notes || null,
      payment_terms: zohoOrder.payment_terms || null,
      payment_method: zohoOrder.payment_method || null,
      billing_address: zohoOrder.billing_address || null,
      shipping_address: zohoOrder.shipping_address || null,
      salesperson_id: salespersonId,
      company_id: COMPANY_ID,
      created_by: salespersonId,
      created_at: zohoOrder.created_time || new Date().toISOString(),
      updated_at: zohoOrder.last_modified_time || new Date().toISOString(),
      legacy_order_id: zohoOrder.salesorder_id,
      legacy_order_number: zohoOrder.salesorder_number,
      line_items: zohoOrder.line_items || [],
      custom_fields: zohoOrder.custom_fields || [],
      zoho_data: zohoOrder,
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

        await this.syncOrderItems(record.legacy_order_id, record.line_items);
      } catch (error) {
        results.errors.push({
          order: record.order_number,
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
          .from('products')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('sku', item.sku || item.item_id)
          .single();

        return {
          order_id: order.id,
          product_id: product?.id || null,
          product_sku: item.sku || item.item_id,
          product_name: item.name || item.item_name,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.rate) || 0,
          discount_amount: parseFloat(item.discount_amount) || 0,
          tax_amount: parseFloat(item.item_tax) || 0,
          total_price: parseFloat(item.item_total) || 0,
          notes: item.description || null,
          company_id: COMPANY_ID,
        };
      }));

      const { error } = await supabase
        .from('order_items')
        .upsert(orderItems, {
          onConflict: 'order_id,product_sku,company_id',
        });

      if (error) throw error;
    } catch (error) {
      logger.error(`Failed to sync order items for order ${orderId}:`, error);
    }
  }
}