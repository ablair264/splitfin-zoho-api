// server/src/index.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ── ESM __dirname hack ─────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Load server/.env ───────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Firebase Admin + Cron ─────────────────────────────────────────────────
import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json';
import cron from 'node-cron';
import { syncInventory } from '../syncInventory.js';

// Initialize Firebase Admin
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

// CORS for React dev
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── OAuth Endpoints ────────────────────────────────────────────────────────
// ... your existing /oauth/url, /oauth/callback, /oauth/refresh routes here ...

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
    const token  = await getAccessToken(); // assume this function exists above
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