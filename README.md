# Zoho Sync Service

Backend service that syncs data from Zoho Inventory to Supabase database.

## Features

- Automated sync of Products, Customers, Orders, Invoices, and Shipments
- Scheduled sync jobs (configurable interval)
- REST API for manual sync triggers
- Health check endpoints
- Comprehensive error handling and logging
- Rate limiting protection
- Incremental sync support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your credentials

3. Run the service:
```bash
npm start
```

For development:
```bash
npm run dev
```

## API Endpoints

All sync endpoints require `X-API-Key` header.

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health status (requires API key)

### Sync Operations
- `POST /api/sync/full` - Trigger full sync of all entities
- `POST /api/sync/full?async=true` - Trigger async full sync
- `POST /api/sync/:entity` - Sync specific entity (items, customers, orders, invoices, packages)
- `GET /api/sync/status` - Get last sync status for all entities
- `GET /api/sync/logs` - Get sync logs (supports filters: limit, entity, status)

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the provided `render.yaml` configuration
4. Set environment variables in Render dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`
   - `ZOHO_ORG_ID`
   - `API_KEY` (generate a secure key)

## Environment Variables

See `.env.example` for all required environment variables.

## Sync Schedule

By default, the service runs a full sync:
- On startup
- Every 30 minutes (configurable via `SYNC_INTERVAL_MINUTES`)

## Logging

Logs are written to:
- Console output
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Data Mapping

The service maps Zoho entities to Supabase tables:
- Zoho Items → products
- Zoho Contacts → customers
- Zoho Sales Orders → orders + order_items
- Zoho Invoices → invoices + invoice_items
- Zoho Packages → shipments + shipment_items