import { BaseSyncService } from './baseSyncService.js';
import { COMPANY_ID, supabase } from '../../config/database.js';
import { zohoAuth } from '../../config/zoho.js';
import { logger } from '../../utils/logger.js';

export class CustomerSyncService extends BaseSyncService {
  constructor() {
    super('contacts', 'contacts', 'customers');
  }

  async fetchZohoData(params = {}) {
    const allRecords = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await zohoAuth.getInventoryData('contacts', {
          page,
          per_page: 200,
          ...params,
        });

        const records = response.contacts || [];
        allRecords.push(...records);

        hasMore = response.page_context?.has_more_page || false;
        page++;

        if (hasMore) {
          await this.delay(this.delayMs);
        }
      } catch (error) {
        logger.error('Failed to fetch contacts from Zoho:', error);
        throw error;
      }
    }

    return allRecords;
  }

  transformRecord(zohoContact) {
    return {
      name: zohoContact.contact_name || `${zohoContact.first_name || ''} ${zohoContact.last_name || ''}`.trim(),
      email: zohoContact.email || null,
      phone: zohoContact.phone || zohoContact.mobile || null,
      company_name: zohoContact.company_name || null,
      billing_address: zohoContact.billing_address ? {
        street: zohoContact.billing_address.address,
        city: zohoContact.billing_address.city,
        state: zohoContact.billing_address.state,
        country: zohoContact.billing_address.country,
        zip: zohoContact.billing_address.zip,
      } : null,
      shipping_address: zohoContact.shipping_address ? {
        street: zohoContact.shipping_address.address,
        city: zohoContact.shipping_address.city,
        state: zohoContact.shipping_address.state,
        country: zohoContact.shipping_address.country,
        zip: zohoContact.shipping_address.zip,
      } : null,
      customer_type: zohoContact.contact_type || 'individual',
      status: zohoContact.status === 'active' ? 'active' : 'inactive',
      company_id: COMPANY_ID,
      created_at: zohoContact.created_time || new Date().toISOString(),
      updated_at: zohoContact.last_modified_time || new Date().toISOString(),
      zoho_customer_id: zohoContact.contact_id,
      fb_customer_id: zohoContact.custom_fields?.find(f => f.label === 'FB Customer ID')?.value || null,
      zoho_data: zohoContact,
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
        let existingCustomer = null;

        if (record.fb_customer_id) {
          const { data } = await supabase
            .from(this.supabaseTable)
            .select('id')
            .eq('company_id', COMPANY_ID)
            .eq('fb_customer_id', record.fb_customer_id)
            .single();
          
          existingCustomer = data;
        }

        if (!existingCustomer && record.zoho_customer_id) {
          const { data } = await supabase
            .from(this.supabaseTable)
            .select('id')
            .eq('company_id', COMPANY_ID)
            .eq('zoho_customer_id', record.zoho_customer_id)
            .single();
          
          existingCustomer = data;
        }

        if (existingCustomer) {
          const { error } = await supabase
            .from(this.supabaseTable)
            .update(record)
            .eq('id', existingCustomer.id);

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
          record: record.name,
          error: error.message,
        });
      }
    }

    return results;
  }
}