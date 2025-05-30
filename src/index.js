// server/src/index.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { syncInventory, syncCustomersFromCRM } from './syncInventory.js';

// ── ESM __dirname hack ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Load .env ───────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Firebase init (only once) ───────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// ── Express setup ───────────────────────────────────────────────────
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
    if (!incomingOrigin || ALLOWED_ORIGINS.includes(incomingOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${incomingOrigin}`));
    }
  }
}));
app.use(express.json());

// ── OAuth endpoints ──────────────────────────────────────────────────
// 1) Redirect to Zoho consent
app.get('/oauth/url', (req, res) => {
  const AUTH_BASE = 'https://accounts.zoho.eu/oauth/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ZOHO_CLIENT_ID,
    redirect_uri:  ZOHO_REDIRECT_URI,
    scope:         'ZohoInventory.fullaccess.all,ZohoCRM.modules.ALL',
    access_type:   'offline',
    prompt:        'consent'
  });
  res.redirect(`${AUTH_BASE}?${params}`);
});

// 2) Callback persists refresh_token
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

// ── Zoho token management ─────────────────────────────────────────────
let cachedToken  = null;
let cachedExpiry = 0;
let refreshInFly = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) {
    return cachedToken;
  }
  if (refreshInFly) {
    return await refreshInFly;
  }
  refreshInFly = (async () => {
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
    cachedExpiry = now + data.expires_in * 1000 - 60*1000;
    refreshInFly = null;
    return cachedToken;
  })();
  return await refreshInFly;
}

// ── Firestore‐backed items endpoint ─────────────────────────────────
app.get('/api/items', async (req, res) => {
  try {
    const snap     = await db.collection('products').get();
    const products = snap.docs.map(d => d.data());
    res.json({ items: products });
  } catch (err) {
    console.error('Firestore /api/items failed:', err);
    res.status(500).send('Items fetch failed');
  }
});

// ── Zoho Purchase Orders proxy ──────────────────────────────────────
app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status  = req.query.status || 'open';
    const token   = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/inventory/v1/purchaseorders?status=${status}&organization_id=${ZOHO_ORG_ID}`,
      { headers: { 'Authorization': `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err.response?.data || err);
    res.status(500).send('Purchase Orders fetch failed');
  }
});

// ── Manual sync endpoint ────────────────────────────────────────────
app.post('/api/sync', async (req, res) => {
  console.log('👤 Manual sync requested');
  try {
    await syncInventory();
    return res.json({ ok: true });
  } catch (err) {
    console.error('❌ Manual sync failed:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});
 
app.post('/api/sync-customers', async (req, res) => {
  try {
	await syncCustomersFromCRM();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});