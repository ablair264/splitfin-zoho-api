// server/src/index.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import cron from 'node-cron';
import { syncInventory } from './syncInventory.js';
import { fetchPurchaseOrders } from './api/zoho.js';

// __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Firebase init
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const app = express();
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REDIRECT_URI,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  PORT = 3001
} = process.env;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://splitfin.co.uk',
  'https://splitfin-zoho-api.onrender.com'
];

app.use(cors({
  origin: (incomingOrigin, callback) => {
    // allow requests with no origin (e.g. Postman, curl)
    if (!incomingOrigin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(incomingOrigin)) {
      return callback(null, true);
    }

    // disallowed origin
    return callback(new Error(`CORS blocked for origin: ${incomingOrigin}`));
  }
}));

app.use(express.json());

// OAuth - consent URL
app.get('/oauth/url', (req, res) => {
  const AUTH_BASE = 'https://accounts.zoho.eu/oauth/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOHO_CLIENT_ID,
    redirect_uri: ZOHO_REDIRECT_URI,
    scope: 'ZohoInventory.fullaccess.all',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`${AUTH_BASE}?${params}`);
});

// OAuth - callback
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code received');
  try {
    const axiosMod = await import('axios');
    const { data } = await axiosMod.default.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      { params: {
          grant_type: 'authorization_code',
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri: ZOHO_REDIRECT_URI,
          code
        }}
    );
    if (data.error) return res.status(400).send(`Zoho OAuth error: ${data.error_description}`);
    const envPath = path.resolve(__dirname, '../.env');
    fs.writeFileSync(envPath,
`ZOHO_CLIENT_ID=${ZOHO_CLIENT_ID}
ZOHO_CLIENT_SECRET=${ZOHO_CLIENT_SECRET}
ZOHO_REDIRECT_URI=${ZOHO_REDIRECT_URI}
ZOHO_ORG_ID=${ZOHO_ORG_ID}
ZOHO_REFRESH_TOKEN=${data.refresh_token}
PORT=${PORT}
`,'utf8');
    res.send(`<h1>Connected!</h1><p>Expires in ${data.expires_in}s</p>`);
  } catch (e) {
    console.error(e.response?.data || e);
    res.status(500).send('Token exchange failed');
  }
});

// Firestore items endpoint
app.get('/api/items', async (req, res) => {
  try {
    const snap = await db.collection('products').get();
    res.json({ items: snap.docs.map(d => d.data()) });
  } catch (e) {
    console.error('Firestore /api/items failed:', e);
    res.status(500).send('Items fetch failed');
  }
});

app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const purchaseorders = await fetchAllPurchaseOrders(status);
    res.json({ purchaseorders });
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err.response?.data || err);
    res.status(500).send('Purchase Orders fetch failed');
  }
});

// POST /api/sync — triggers the Zoho→Firestore syncInventory()
app.post('/api/sync', async (req, res) => {
  console.log('🚀 Manual sync triggered via HTTP');
  try {
    await syncInventory();
    return res.json({ ok: true, message: 'Sync complete.' });
  } catch (err) {
    console.error('❌ Manual sync failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
