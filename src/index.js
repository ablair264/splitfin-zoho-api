// server/src/index.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import cron from 'node-cron';
import { syncInventory } from './syncInventory.js';
import { getAccessToken, fetchPurchaseOrders } from './api/zoho.js';

// ── ESM __dirname hack ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Load Firebase Service Account from ENV var
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Express App Setup
const app = express();
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REDIRECT_URI,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  PORT = 3001
} = process.env;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── OAuth Consent Redirect ─────────────────────────────────────────────────
app.get('/oauth/url', (req, res) => {
  const AUTH_BASE = 'https://accounts.zoho.eu/oauth/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ZOHO_CLIENT_ID,
    redirect_uri:  ZOHO_REDIRECT_URI,
    scope:         'ZohoInventory.fullaccess.all',
    access_type:   'offline',
    prompt:        'consent'
  });
  res.redirect(`${AUTH_BASE}?${params}`);
});

// ── OAuth Callback to Store Refresh Token ──────────────────────────────────
app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code received');
  try {
    const { data } = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      { params: {
          grant_type:    'authorization_code',
          client_id:     ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri:  ZOHO_REDIRECT_URI,
          code
        }
      }
    );
    if (data.error) {
      return res.status(400).send(`Zoho OAuth error: ${data.error_description || data.error}`);
    }
    // Persist new refresh token
    const envPath = path.resolve(__dirname, '../.env');
    fs.writeFileSync(envPath,
`ZOHO_CLIENT_ID=${ZOHO_CLIENT_ID}
ZOHO_CLIENT_SECRET=${ZOHO_CLIENT_SECRET}
ZOHO_REDIRECT_URI=${ZOHO_REDIRECT_URI}
ZOHO_ORG_ID=${ZOHO_ORG_ID}
ZOHO_REFRESH_TOKEN=${data.refresh_token}
PORT=${PORT}
`, 'utf8');
    return res.send(`
      <h1>Connected to Zoho!</h1>
      <p>Token expires in ${data.expires_in}s</p>
    `);
  } catch (err) {
    console.error(err.response?.data || err);
    return res.status(500).send('Token exchange failed');
  }
});

// ── Firestore-backed Items Endpoint ───────────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    const snap = await db.collection('products').get();
    const products = snap.docs.map(d => d.data());
    return res.json({ items: products });
  } catch (err) {
    console.error('Firestore /api/items failed:', err);
    return res.status(500).send('Items fetch failed');
  }
});

// ── Zoho Purchase Orders Proxy ────────────────────────────────────────────
app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const purchaseorders = await fetchPurchaseOrders(status);
    return res.json({ purchaseorders });
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err);
    return res.status(500).send('Purchase Orders fetch failed');
  }
});

// ── Scheduled Hourly Sync ─────────────────────────────────────────────────
cron.schedule('0 * * * *', () => {
  console.log('⏰ Running hourly Zoho→Firestore sync…');
  syncInventory().catch(err => console.error('Scheduled sync failed:', err));
});

// ── Start HTTP Server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Auth & Proxy server listening on http://localhost:${PORT}`);
});