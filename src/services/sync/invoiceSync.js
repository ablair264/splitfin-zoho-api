import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export class InvoiceSyncService extends BaseSyncService {
  constructor() {
    super('invoices', 'invoices', 'invoices');
  }

  mapZohoInvoiceStatus(zohoStatus, balance) {
    if (zohoStatus === 'void') return 'cancelled';
    if (parseFloat(balance) === 0) return 'paid';
    if (zohoStatus === 'overdue') return 'overdue';
    if (zohoStatus === 'sent') return 'sent';
    return 'draft';
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

  async transformRecord(zohoInvoice) {
    const [customerId, orderId] = await Promise.all([
      this.getCustomerId(zohoInvoice.customer_id),
      this.getOrderId(zohoInvoice.reference_number),
    ]);

    return {
      invoice_number: zohoInvoice.invoice_number,
      customer_id: customerId,
      order_id: orderId,
      status: this.mapZohoInvoiceStatus(zohoInvoice.status, zohoInvoice.balance),
      invoice_date: zohoInvoice.date || new Date().toISOString(),
      due_date: zohoInvoice.due_date || null,
      subtotal: parseFloat(zohoInvoice.sub_total) || 0,
      tax_amount: parseFloat(zohoInvoice.tax_total) || 0,
      shipping_charge: parseFloat(zohoInvoice.shipping_charge) || 0,
      discount_amount: parseFloat(zohoInvoice.discount_total) || 0,
      total_amount: parseFloat(zohoInvoice.total) || 0,
      paid_amount: parseFloat(zohoInvoice.payment_made) || 0,
      balance_due: parseFloat(zohoInvoice.balance) || 0,
      currency_code: zohoInvoice.currency_code || 'USD',
      payment_terms: zohoInvoice.payment_terms || null,
      notes: zohoInvoice.notes || null,
      terms_conditions: zohoInvoice.terms || null,
      billing_address: zohoInvoice.billing_address || null,
      shipping_address: zohoInvoice.shipping_address || null,
      company_id: COMPANY_ID,
      created_at: zohoInvoice.created_time || new Date().toISOString(),
      updated_at: zohoInvoice.last_modified_time || new Date().toISOString(),
      legacy_invoice_id: zohoInvoice.invoice_id,
      legacy_invoice_number: zohoInvoice.invoice_number,
      line_items: zohoInvoice.line_items || [],
      custom_fields: zohoInvoice.custom_fields || [],
      zoho_data: zohoInvoice,
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
        const { data: existingInvoice } = await supabase
          .from(this.supabaseTable)
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('legacy_invoice_id', record.legacy_invoice_id)
          .single();

        if (existingInvoice) {
          const { error } = await supabase
            .from(this.supabaseTable)
            .update(record)
            .eq('id', existingInvoice.id);

          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from(this.supabaseTable)
            .insert(record);

          if (error) throw error;
          results.created++;
        }

        await this.syncInvoiceItems(record.legacy_invoice_id, record.line_items);
      } catch (error) {
        results.errors.push({
          invoice: record.invoice_number,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncInvoiceItems(invoiceId, lineItems) {
    if (!lineItems || lineItems.length === 0) return;

    try {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('legacy_invoice_id', invoiceId)
        .single();

      if (!invoice) return;

      const invoiceItems = await Promise.all(lineItems.map(async (item) => {
        const { data: product } = await supabase
          .from('products')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .eq('sku', item.sku || item.item_id)
          .single();

        return {
          invoice_id: invoice.id,
          product_id: product?.id || null,
          product_sku: item.sku || item.item_id,
          product_name: item.name || item.item_name,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.rate) || 0,
          discount_amount: parseFloat(item.discount_amount) || 0,
          tax_amount: parseFloat(item.tax_total) || 0,
          total_price: parseFloat(item.item_total) || 0,
          description: item.description || null,
          company_id: COMPANY_ID,
        };
      }));

      const { error } = await supabase
        .from('invoice_items')
        .upsert(invoiceItems, {
          onConflict: 'invoice_id,product_sku,company_id',
        });

      if (error) throw error;
    } catch (error) {
      logger.error(`Failed to sync invoice items for invoice ${invoiceId}:`, error);
    }
  }
}