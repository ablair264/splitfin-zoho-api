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

    // Fetch customers from today only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    params.last_modified_time = today.toISOString().split('T')[0]; // Use YYYY-MM-DD format
    logger.info(`Fetching customers from: ${params.last_modified_time}`);

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

  async getCreatedByUserId() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('role', 'Admin')
        .limit(1)
        .single();

      return data?.id || null;
    } catch (error) {
      logger.debug('Admin user not found for customer creation');
      return null;
    }
  }

  async transformRecord(zohoContact) {
    const createdBy = await this.getCreatedByUserId();
    
    if (!createdBy) {
      throw new Error('No admin user found to assign as creator');
    }

    const contactName = zohoContact.contact_name || 
                       `${zohoContact.first_name || ''} ${zohoContact.last_name || ''}`.trim() ||
                       'Unknown Contact';

    return {
      display_name: contactName,
      trading_name: zohoContact.company_name || contactName,
      email: zohoContact.email || null,
      phone: zohoContact.phone || zohoContact.mobile || null,
      billing_address_1: zohoContact.billing_address?.address || '',
      billing_address_2: zohoContact.billing_address?.address2 || null,
      billing_city_town: zohoContact.billing_address?.city || '',
      billing_county: zohoContact.billing_address?.state || null,
      billing_postcode: zohoContact.billing_address?.zip || '',
      shipping_address_1: zohoContact.shipping_address?.address || zohoContact.billing_address?.address || '',
      shipping_address_2: zohoContact.shipping_address?.address2 || zohoContact.billing_address?.address2 || null,
      shipping_city_town: zohoContact.shipping_address?.city || zohoContact.billing_address?.city || '',
      shipping_county: zohoContact.shipping_address?.state || zohoContact.billing_address?.state || null,
      shipping_postcode: zohoContact.shipping_address?.zip || zohoContact.billing_address?.zip || '',
      payment_terms: parseInt(zohoContact.payment_terms) || 30,
      currency_code: zohoContact.currency_code || 'GBP',
      is_active: zohoContact.status === 'active',
      created_by: createdBy,
      linked_company: COMPANY_ID,
      created_date: zohoContact.created_time || new Date().toISOString(),
      last_modified: zohoContact.last_modified_time || new Date().toISOString(),
      zoho_customer_id: zohoContact.contact_id,
      fb_customer_id: zohoContact.custom_fields?.find(f => f.label === 'FB Customer ID')?.value || null,
      migration_source: 'zoho',
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
            .eq('linked_company', COMPANY_ID)
            .eq('fb_customer_id', record.fb_customer_id)
            .single();
          
          existingCustomer = data;
        }

        if (!existingCustomer && record.zoho_customer_id) {
          const { data } = await supabase
            .from(this.supabaseTable)
            .select('id')
            .eq('linked_company', COMPANY_ID)
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
          record: record.display_name,
          error: error.message,
        });
      }
    }

    return results;
  }

  async syncSpecificIds(customerIds) {
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    logger.info(`Syncing ${customerIds.length} specific customers`);

    for (const customerId of customerIds) {
      try {
        const response = await zohoAuth.getInventoryData(`contacts/${customerId}`);
        const zohoContact = response.contact;
        
        if (zohoContact) {
          const transformed = await this.transformRecord(zohoContact);
          const result = await this.upsertRecords([transformed]);
          
          results.created += result.created;
          results.updated += result.updated;
          results.errors.push(...result.errors);
        }
        
        await this.delay(this.delayMs);
      } catch (error) {
        logger.error(`Failed to sync customer ${customerId}:`, error);
        results.errors.push({
          customer_id: customerId,
          error: error.message,
        });
      }
    }

    return results;
  }
}