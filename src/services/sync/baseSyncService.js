import { supabase, COMPANY_ID } from '../../config/database.js';
import { zohoAuth } from '../../config/zoho.js';
import { logger } from '../../utils/logger.js';
import { rateLimiter, makeThrottledRequest } from '../../config/rateLimiting.js';

export class BaseSyncService {
  constructor(entityName, zohoEndpoint, supabaseTable) {
    this.entityName = entityName;
    this.zohoEndpoint = zohoEndpoint;
    this.supabaseTable = supabaseTable;
    this.batchSize = rateLimiter.config.batchSize;
    this.delayMs = rateLimiter.config.baseDelayMs;
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
    const maxRecords = params.limit || rateLimiter.config.maxRecordsPerSync;

    logger.info(`Starting to fetch ${this.entityName} with rate limiting enabled`);

    while (hasMore && allRecords.length < maxRecords) {
      try {
        const response = await makeThrottledRequest(
          () => zohoAuth.getInventoryData(this.zohoEndpoint, {
            page,
            per_page: Math.min(200, maxRecords - allRecords.length),
            ...params,
          }),
          `${this.entityName}-page-${page}`
        );

        const records = response[this.entityName] || [];
        allRecords.push(...records);

        hasMore = response.page_context?.has_more_page || false;
        page++;

        // Log progress periodically
        if (page % 10 === 0) {
          logger.info(`Fetched ${allRecords.length} ${this.entityName} records (page ${page})`);
          logger.debug('Rate limiter stats:', rateLimiter.getStats());
        }
      } catch (error) {
        logger.error(`Failed to fetch ${this.entityName} from Zoho (page ${page}):`, error);
        throw error;
      }
    }

    if (allRecords.length >= maxRecords) {
      logger.warn(`Reached record limit of ${maxRecords} for ${this.entityName}`);
    }

    logger.info(`Completed fetching ${allRecords.length} ${this.entityName} records`);
    logger.info('Final rate limiter stats:', rateLimiter.getStats());

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
      
      // Remove problematic date filtering - let individual services handle it
      const params = {};
      logger.info(`Fetching ${this.entityName} (no base date filtering)`);

      const zohoRecords = await this.fetchZohoData(params);
      logger.info(`Fetched ${zohoRecords.length} ${this.entityName} from Zoho`);

      const transformedRecords = [];
      for (const record of zohoRecords) {
        try {
          const transformed = await this.transformRecord(record);
          if (transformed) {
            transformedRecords.push(transformed);
          }
        } catch (error) {
          logger.error(`Failed to transform ${this.entityName} record:`, error, record);
        }
      }

      logger.info(`Transformed ${transformedRecords.length} ${this.entityName} records`);

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