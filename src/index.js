// server/src/index.js
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env at project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REDIRECT_URI,
  ZOHO_ORG_ID,
  ZOHO_REFRESH_TOKEN,
  PORT = 3001
} = process.env;

app.use(cors());
app.use(express.json());

// 1) Redirect to Zoho consent page
app.get('/oauth/url', (req, res) => {
  const AUTH_BASE = 'https://accounts.zoho.eu/oauth/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOHO_CLIENT_ID,
    redirect_uri: ZOHO_REDIRECT_URI,
    scope: 'ZohoInventory.fullaccess.all,ZohoCRM.modules.ALL',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`${AUTH_BASE}?${params}`);
});

// 2) Callback to exchange code for tokens
app.get('/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code received');
  try {
    const response = await axios.post(
      'https://accounts.zoho.eu/oauth/v2/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: ZOHO_CLIENT_ID,
          client_secret: ZOHO_CLIENT_SECRET,
          redirect_uri: ZOHO_REDIRECT_URI,
          code
        }
      }
    );
    const data = response.data;
    if (data.error) {
      return res.status(400).send(`Zoho OAuth error: ${data.error_description || data.error}`);
    }
    // Display refresh token for manual copy
    res.send(`
      <h1>Zoho Connected!</h1>
      <p>Access token valid for ${data.expires_in}s</p>
      <p><strong>Refresh Token:</strong> ${data.refresh_token}</p>
      <p>Copy this into your ZOHO_REFRESH_TOKEN env var.</p>
    `);
  } catch (err) {
    console.error('Token exchange failed:', err.response?.data || err);
    res.status(500).send('Token exchange failed');
  }
});

// In-memory cache for access token
let cachedToken = null;
let cachedExpiry = 0;
let refreshing = null;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) {
    return cachedToken;
  }
  if (!refreshing) {
    refreshing = (async () => {
      const resp = await axios.post(
        'https://accounts.zoho.eu/oauth/v2/token',
        null,
        {
          params: {
            grant_type: 'refresh_token',
            client_id: ZOHO_CLIENT_ID,
            client_secret: ZOHO_CLIENT_SECRET,
            refresh_token: ZOHO_REFRESH_TOKEN
          }
        }
      );
      const d = resp.data;
      if (d.error) throw new Error(d.error_description || d.error);
      cachedToken = d.access_token;
      cachedExpiry = now + d.expires_in * 1000 - 60000; // 1 min buffer
      refreshing = null;
      return cachedToken;
    })();
  }
  return await refreshing;
}

// Proxy endpoints
app.get('/api/items', async (req, res) => {
  try {
    const token = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/inventory/v1/items?organization_id=${ZOHO_ORG_ID}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/items failed:', err.response?.data || err);
    res.status(500).send('Items fetch failed');
  }
});

app.get('/api/purchaseorders', async (req, res) => {
  try {
    const status = req.query.status || 'open';
    const token = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/inventory/v1/purchaseorders?status=${status}&organization_id=${ZOHO_ORG_ID}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/purchaseorders failed:', err.response?.data || err);
    res.status(500).send('Purchase Orders fetch failed');
  }
});

// CRM: Agents and Customers
app.get('/api/agents', async (req, res) => {
  try {
    const token = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/crm/v2/CustomModule3/actions/custom-view?custom_view_id=806490000000514372`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/agents failed:', err.response?.data || err);
    res.status(500).send('Agents fetch failed');
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const token = await getAccessToken();
    const zohoRes = await axios.get(
      `https://www.zohoapis.eu/crm/v2/Accounts/actions/custom-view?custom_view_id=806490000000030957`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    );
    res.json(zohoRes.data);
  } catch (err) {
    console.error('Proxy /api/customers failed:', err.response?.data || err);
    res.status(500).send('Customers fetch failed');
  }
});

app.listen(PORT, () => console.log(`Auth & Proxy server listening on http://localhost:${PORT}`));
