import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { logger } from './utils/logger.js';
import { syncRouter } from './routes/sync.js';
import { healthRouter } from './routes/health.js';
import { shopifyRouter } from './routes/shopify.js';
import { shopifyAppRouter } from './routes/shopify-app.js';
import { SyncOrchestrator } from './services/syncOrchestrator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/sync', syncRouter);
app.use('/api/shopify', shopifyRouter);
app.use('/shopify-app', shopifyAppRouter);

const syncOrchestrator = new SyncOrchestrator();

if (process.env.ENABLE_SCHEDULED_SYNC === 'true') {
  const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 30;
  
  cron.schedule(`*/${syncInterval} * * * *`, async () => {
    logger.info('Starting scheduled sync...');
    try {
      await syncOrchestrator.runFullSync();
      logger.info('Scheduled sync completed successfully');
    } catch (error) {
      logger.error('Scheduled sync failed:', error);
    }
  });
  
  logger.info(`Scheduled sync enabled - running every ${syncInterval} minutes`);
}

app.listen(PORT, () => {
  logger.info(`Zoho Sync Service running on port ${PORT}`);
  
  syncOrchestrator.runFullSync()
    .then(() => logger.info('Initial sync completed'))
    .catch(err => logger.error('Initial sync failed:', err));
});