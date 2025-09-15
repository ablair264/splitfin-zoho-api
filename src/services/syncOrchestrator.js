import { logger } from '../utils/logger.js';
import { ItemSyncService } from './sync/itemSync.js';
import { OrderSyncService } from './sync/orderSync.js';
import { InvoiceSyncService } from './sync/invoiceSync.js';
import { PackageSyncService } from './sync/packageSync.js';
import { CustomerSyncService } from './sync/customerSync.js';

export class SyncOrchestrator {
  constructor() {
    this.services = {
      items: new ItemSyncService(),
      customers: new CustomerSyncService(),
      orders: new OrderSyncService(),
      invoices: new InvoiceSyncService(),
      packages: new PackageSyncService(),
    };
    
    this.syncOrder = ['items', 'customers', 'orders', 'invoices', 'packages'];
  }

  async runFullSync() {
    const results = {
      success: [],
      failed: [],
      timestamp: new Date().toISOString(),
    };

    logger.info('Starting full sync process...');

    for (const serviceName of this.syncOrder) {
      try {
        logger.info(`Syncing ${serviceName}...`);
        const result = await this.services[serviceName].sync();
        
        results.success.push({
          entity: serviceName,
          ...result,
        });
        
        logger.info(`${serviceName} sync completed:`, result);
      } catch (error) {
        logger.error(`${serviceName} sync failed:`, error);
        results.failed.push({
          entity: serviceName,
          error: error.message,
        });
      }
    }

    logger.info('Full sync completed:', {
      successful: results.success.length,
      failed: results.failed.length,
    });

    return results;
  }

  async syncEntity(entityName) {
    if (!this.services[entityName]) {
      throw new Error(`Unknown entity: ${entityName}`);
    }

    logger.info(`Running single entity sync for: ${entityName}`);
    return await this.services[entityName].sync();
  }

  async getLastSyncStatus() {
    const status = {};
    
    for (const [name, service] of Object.entries(this.services)) {
      try {
        status[name] = await service.getLastSyncInfo();
      } catch (error) {
        status[name] = { error: error.message };
      }
    }
    
    return status;
  }
}