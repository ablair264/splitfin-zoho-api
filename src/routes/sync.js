import { Router } from 'express';
import { SyncOrchestrator } from '../services/syncOrchestrator.js';
import { logger } from '../utils/logger.js';

export const syncRouter = Router();

const syncOrchestrator = new SyncOrchestrator();

const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

syncRouter.use(authenticate);

syncRouter.post('/full', async (req, res) => {
  try {
    logger.info('Manual full sync triggered via API');
    
    const syncPromise = syncOrchestrator.runFullSync();
    
    if (req.query.async === 'true') {
      res.json({
        status: 'started',
        message: 'Full sync started in background',
        timestamp: new Date().toISOString(),
      });
    } else {
      const results = await syncPromise;
      res.json({
        status: 'completed',
        results,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Full sync failed:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

syncRouter.post('/:entity', async (req, res) => {
  const { entity } = req.params;
  const validEntities = ['items', 'customers', 'orders', 'invoices', 'packages'];
  
  if (!validEntities.includes(entity)) {
    return res.status(400).json({
      error: `Invalid entity. Valid entities are: ${validEntities.join(', ')}`,
    });
  }

  try {
    logger.info(`Manual ${entity} sync triggered via API`);
    
    const result = await syncOrchestrator.syncEntity(entity);
    
    res.json({
      status: 'completed',
      entity,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`${entity} sync failed:`, error);
    res.status(500).json({
      status: 'error',
      entity,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

syncRouter.get('/status', async (req, res) => {
  try {
    const status = await syncOrchestrator.getLastSyncStatus();
    
    res.json({
      status: 'ok',
      lastSyncs: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get sync status:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

syncRouter.get('/logs', async (req, res) => {
  try {
    const { limit = 50, entity, status } = req.query;
    
    const { supabase } = await import('../config/database.js');
    
    let query = supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (entity) {
      query = query.eq('entity_type', entity);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      status: 'ok',
      logs: data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get sync logs:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});