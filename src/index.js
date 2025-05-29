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

// ── ESM __dirname hack ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Load Firebase Service Account from ENV ─────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// ── Initialize Firebase Admin ──────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ── Express Setup ──────────────────────────────────────────────────────────
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

// ── 1) OAuth consent redirect ─────────────────────────────────────────────
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

// ── 2) OAuth callback to store refresh_token ──────────────────────────────
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
      return res
        .status(400)
        .send(`Zoho OAuth error: ${data.error_description||data.error}`);
    }
    // Persist new refresh_token
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
    console.error(err.response?.data||err);
    return res.status(500).send('Token exchange failed');
  }
});

// ── In‐memory cache for access token ───────────────────────────────────────
let cachedToken     = null;
let cachedExpiry    = 0;
let refreshPromise = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) {
    return cachedToken;
  }
  if (refreshPromise) {
    // another request is already refreshing—wait for it
    return await refreshPromise;
  }

  // no valid token and no refresh in flight: start one
  refreshPromise = (async () => {
    const { data } = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      { params: {
          grant_type:    'refresh_token',
          client_id:     ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          refresh_token: ZOHO_REFRESH_TOKEN
        }
      }
    );
    if (data.error) throw new Error(data.error_description || data.error);

    cachedToken  = data.access_token;
    cachedExpiry = now + data.expires_in * 1000 - 60 * 1000; // 1min safety margin
    refreshPromise = null;       // clear the in-flight marker
    return cachedToken;
  })();

  return await refreshPromise;
}

// ── Firestore-backed Items Endpoint ────────────────────────────────────────
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

// ── Zoho Purchase Orders Proxy ─────────────────────────────────────────────
app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const token  = await getAccessToken(); // ensure getAccessToken is defined above
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/inventory/v1/purchaseorders?status=${status}&organization_id=${ZOHO_ORG_ID}`,
      { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } }
    );
    return res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err.response?.data || err);
    return res.status(500).send('Purchase Orders fetch failed');
  }
});

// ── Scheduled Sync ─────────────────────────────────────────────────────────
cron.schedule('0 * * * *', () => {
  console.log('⏰ Running hourly Zoho→Firestore sync…');
  syncInventory().catch(err => console.error('Scheduled sync failed:', err));
});

// ── Start Server ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Auth & Proxy server listening on http://localhost:${PORT}`);
});