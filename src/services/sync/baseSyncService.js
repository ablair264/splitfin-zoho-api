import { supabase, COMPANY_ID } from '../../config/database.js';
import { zohoAuth } from '../../config/zoho.js';
import { logger } from '../../utils/logger.js';

export class BaseSyncService {
  constructor(entityName, zohoEndpoint, supabaseTable) {
    this.entityName = entityName;
    this.zohoEndpoint = zohoEndpoint;
    this.supabaseTable = supabaseTable;
    this.batchSize = 50;
    this.delayMs = 200;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getLastSyncInfo() {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('company_id', COMPANY_ID)
        .eq('entity_type', this.entityName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (error) {
      logger.error(`Failed to get last sync info for ${this.entityName}:`, error);
      return null;
    }
  }

  async saveSyncLog(status, details) {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .insert({
          company_id: COMPANY_ID,
          entity_type: this.entityName,
          status,
          details,
          synced_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to save sync log:', error);
    }
  }

  async fetchZohoData(params = {}) {
    const allRecords = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await zohoAuth.getInventoryData(this.zohoEndpoint, {
          page,
          per_page: 200,
          ...params,
        });

        const records = response[this.entityName] || [];
        allRecords.push(...records);

        hasMore = response.page_context?.has_more_page || false;
        page++;

        if (hasMore) {
          await this.delay(this.delayMs);
        }
      } catch (error) {
        logger.error(`Failed to fetch ${this.entityName} from Zoho:`, error);
        throw error;
      }
    }

    return allRecords;
  }

  transformRecord(zohoRecord) {
    throw new Error('transformRecord must be implemented by subclass');
  }

  async upsertRecords(records) {
    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (let i = 0; i < records.length; i += this.batchSize) {
      const batch = records.slice(i, i + this.batchSize);
      
      try {
        const { data, error } = await supabase
          .from(this.supabaseTable)
          .upsert(batch, {
            onConflict: this.getConflictColumns(),
            ignoreDuplicates: false,
          })
          .select();

        if (error) throw error;

        results.created += data.filter(r => r.created_at === r.updated_at).length;
        results.updated += data.filter(r => r.created_at !== r.updated_at).length;
      } catch (error) {
        logger.error(`Batch upsert failed for ${this.entityName}:`, error);
        results.errors.push({
          batch: `${i}-${i + batch.length}`,
          error: error.message,
        });
      }
    }

    return results;
  }

  getConflictColumns() {
    return 'id';
  }

  async sync() {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting ${this.entityName} sync...`);
      
      // Always fetch records from today only
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const params = {
        last_modified_time: today.toISOString()
      };

      const zohoRecords = await this.fetchZohoData(params);
      logger.info(`Fetched ${zohoRecords.length} ${this.entityName} from Zoho (today only)`);

      const transformedRecords = zohoRecords.map(record => {
        try {
          return this.transformRecord(record);
        } catch (error) {
          logger.error(`Failed to transform ${this.entityName} record:`, error, record);
          return null;
        }
      }).filter(Boolean);

      const results = await this.upsertRecords(transformedRecords);
      
      const syncDetails = {
        duration_ms: Date.now() - startTime,
        records_fetched: zohoRecords.length,
        records_transformed: transformedRecords.length,
        ...results,
      };

      await this.saveSyncLog('success', syncDetails);
      
      return syncDetails;
    } catch (error) {
      const errorDetails = {
        duration_ms: Date.now() - startTime,
        error: error.message,
      };
      
      await this.saveSyncLog('error', errorDetails);
      throw error;
    }
  }
}