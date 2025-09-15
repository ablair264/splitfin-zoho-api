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

    // Fetch packages from the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    
    // Use date format that Zoho expects (YYYY-MM-DD)
    params.date_start = oneMonthAgo.toISOString().split('T')[0];
    logger.info(`Fetching packages from: ${params.date_start}`);

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
        .eq('legacy_order_id', zohoOrderId) // This is correct
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug(`Order not found for Zoho order ID: ${zohoOrderId}`);
      return null;
    }
  }

  async getCustomerId(zohoCustomerId) {
    if (!zohoCustomerId) {
      logger.warn('No Zoho customer ID provided');
      return null;
    }

    try {
      logger.info(`Looking for customer with zoho_customer_id: ${zohoCustomerId}`);
      
      const { data } = await supabase
        .from('customers')
        .select('id, zoho_customer_id, display_name')
        .eq('linked_company', COMPANY_ID)
        .eq('zoho_customer_id', zohoCustomerId) // Changed to zoho_customer_id
        .single();

      if (data) {
        logger.info(`Found customer: ${data.display_name} (ID: ${data.id})`);
        return data.id;
      } else {
        logger.warn(`No customer found for Zoho customer ID: ${zohoCustomerId}`);
        
        // Let's see what customers exist
        const { data: allCustomers } = await supabase
          .from('customers')
          .select('id, zoho_customer_id, display_name')
          .eq('linked_company', COMPANY_ID)
          .limit(5);
        
        logger.info('Sample customers in database:', allCustomers);
        return null;
      }
    } catch (error) {
      logger.error(`Error looking up customer ${zohoCustomerId}:`, error);
      return null;
    }
  }

  getWarehouseId() {
    // Always return the fixed warehouse ID
    return '81d9b5d1-9565-4e39-8d0e-4c5896bfba4b';
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
    // Log the package data to see what fields are available
    logger.info('Zoho package data:', {
      package_id: zohoPackage.package_id,
      package_number: zohoPackage.package_number,
      customer_id: zohoPackage.customer_id,
      contact_id: zohoPackage.contact_id,
      salesorder_id: zohoPackage.salesorder_id,
      customer_name: zohoPackage.customer_name,
      status: zohoPackage.status,
    });

    const customerIdToUse = zohoPackage.contact_id || zohoPackage.customer_id;
    logger.info(`Using customer ID for lookup: ${customerIdToUse}`);

    const [orderId, customerId, warehouseId, courierId] = await Promise.all([
      this.getOrderId(zohoPackage.salesorder_id),
      this.getCustomerId(customerIdToUse),
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
        const packageNumber = record.external_package_number || record.external_package_id || 'Unknown';

        if (!record.customer_id) {
          logger.warn(`Skipping package ${packageNumber} - no matching customer found`);
          continue;
        }

        if (!record.order_id) {
          logger.warn(`Skipping package ${packageNumber} - no matching order found`);
          continue;
        }

        // If no warehouse, try to get/create one
        if (!record.warehouse_id) {
          record.warehouse_id = await this.getWarehouseId();
          if (!record.warehouse_id) {
            logger.warn(`Skipping package ${packageNumber} - could not find or create warehouse`);
            continue;
          }
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