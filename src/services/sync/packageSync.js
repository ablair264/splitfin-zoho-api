import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { zohoAuth } from '../../config/zoho.js';

export class PackageSyncService extends BaseSyncService {
  constructor() {
    super('packages', 'packages', 'shipments');
  }

  async fetchZohoData(params = {}) {
    const allRecords = [];
    let page = 1;
    let hasMore = true;

    // Add date filter for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    params.last_modified_time = today.toISOString();

    while (hasMore) {
      try {
        const response = await zohoAuth.getInventoryData('packages', {
          page,
          per_page: 200,
          ...params,
        });

        const records = response.packages || [];
        allRecords.push(...records);

        hasMore = response.page_context?.has_more_page || false;
        page++;

        if (hasMore) {
          await this.delay(this.delayMs);
        }
      } catch (error) {
        logger.error('Failed to fetch packages from Zoho:', error);
        throw error;
      }
    }

    return allRecords;
  }

  mapShipmentStatus(zohoStatus) {
    const statusMap = {
      'not_shipped': 'pending',
      'packed': 'packed',
      'shipped': 'shipped',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'returned': 'returned',
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

  async getWarehouseId() {
    try {
      const { data } = await supabase
        .from('warehouses')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('is_active', true)
        .limit(1)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug('No active warehouse found, will create shipment without warehouse');
      return null;
    }
  }

  async getCourierId(courierName) {
    if (!courierName) return null;

    try {
      const { data } = await supabase
        .from('couriers')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .ilike('courier_name', `%${courierName}%`)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug(`Courier not found for name: ${courierName}`);
      return null;
    }
  }

  async transformRecord(zohoPackage) {
    const [orderId, customerId, warehouseId, courierId] = await Promise.all([
      this.getOrderId(zohoPackage.salesorder_id),
      this.getCustomerId(zohoPackage.customer_id),
      this.getWarehouseId(),
      this.getCourierId(zohoPackage.delivery_method),
    ]);

    return {
      warehouse_id: warehouseId,
      shipment_status: this.mapShipmentStatus(zohoPackage.status),
      courier_id: courierId,
      customer_id: customerId,
      order_id: orderId,
      date_shipped: zohoPackage.shipment_date ? new Date(zohoPackage.shipment_date).toISOString() : null,
      order_tracking_number: zohoPackage.tracking_number || null,
      order_tracking_url: zohoPackage.tracking_url || null,
      number_of_boxes: parseInt(zohoPackage.total_boxes) || 1,
      date_delivered: zohoPackage.delivered_date ? new Date(zohoPackage.delivered_date).toISOString() : null,
      items_packed: zohoPackage.line_items?.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) || 0,
      items_shipped: zohoPackage.line_items?.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) || 0,
      items_delivered: zohoPackage.status === 'delivered' ? zohoPackage.line_items?.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) || 0 : 0,
      created_at: zohoPackage.created_time ? new Date(zohoPackage.created_time).toISOString() : new Date().toISOString(),
      updated_at: zohoPackage.last_modified_time ? new Date(zohoPackage.last_modified_time).toISOString() : new Date().toISOString(),
      company_id: COMPANY_ID,
      shipping_address_1: zohoPackage.customer_address?.address || null,
      shipping_address_2: zohoPackage.customer_address?.address2 || null,
      shipping_city_town: zohoPackage.customer_address?.city || null,
      shipping_county: zohoPackage.customer_address?.state || null,
      shipping_postcode: zohoPackage.customer_address?.zip || null,
      shipping_country: zohoPackage.customer_address?.country || null,
      total_items: zohoPackage.line_items?.length || 0,
      estimated_delivery_date: zohoPackage.delivery_date ? new Date(zohoPackage.delivery_date).toISOString() : null,
      courier_service: zohoPackage.delivery_method || 'Standard Delivery',
      reference_number: zohoPackage.reference_number || null,
      external_package_id: zohoPackage.package_id,
      external_shipment_id: zohoPackage.shipment_id || null,
      external_package_number: zohoPackage.package_number,
      contact_phone: zohoPackage.customer_address?.phone || null,
      contact_email: zohoPackage.customer_address?.email || null,
      contact_mobile: zohoPackage.customer_address?.mobile || null,
      billing_address_1: zohoPackage.billing_address?.address || null,
      billing_city_town: zohoPackage.billing_address?.city || null,
      billing_county: zohoPackage.billing_address?.state || null,
      billing_postcode: zohoPackage.billing_address?.zip || null,
      billing_country: zohoPackage.billing_address?.country || null,
      is_emailed: zohoPackage.is_emailed || false,
      custom_data: zohoPackage.custom_fields || null,
      line_items: zohoPackage.line_items || [],
      template_id: zohoPackage.template_id || null,
      template_name: zohoPackage.template_name || null,
      exchange_rate: parseFloat(zohoPackage.exchange_rate) || null,
      total_quantity: zohoPackage.line_items?.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0) || 0,
      package_status: zohoPackage.status,
      zoho_created_time: zohoPackage.created_time ? new Date(zohoPackage.created_time).toISOString() : null,
      zoho_modified_time: zohoPackage.last_modified_time ? new Date(zohoPackage.last_modified_time).toISOString() : null,
      notes: zohoPackage.notes || null,
      contact_persons: zohoPackage.contact_persons || null,
      shipping_cost: parseFloat(zohoPackage.shipping_charge) || null,
      package_items: zohoPackage.line_items || null,
      delivery_method_id: zohoPackage.delivery_method_id || null,
      is_tracking_enabled: !!zohoPackage.tracking_number,
      carrier_name: zohoPackage.delivery_method || null,
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
        if (!record.warehouse_id) {
          logger.warn(`Skipping package ${record.external_package_number} - no warehouse found`);
          continue;
        }

        if (!record.customer_id) {
          logger.warn(`Skipping package ${record.external_package_number} - no matching customer found`);
          continue;
        }

        if (!record.order_id) {
          logger.warn(`Skipping package ${record.external_package_number} - no matching order found`);
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
      } catch (error) {
        results.errors.push({
          package: record.external_package_number,
          error: error.message,
        });
      }
    }

    return results;
  }

}