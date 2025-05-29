// server/src/api/zoho.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const {
  ZOHO_CLIENT_ID,
  ZOHO_CLIENT_SECRET,
  ZOHO_REFRESH_TOKEN,
  ZOHO_ORG_ID
} = process.env;

// In-memory cache for OAuth token
let cachedToken = null;
let cachedExpiry = 0;
let refreshPromise = null;

/**
 * Retrieves a valid Zoho access token, refreshing if necessary.
 */
export async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) {
    return cachedToken;
  }
  if (refreshPromise) {
    return await refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await axios.post(
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
    const data = response.data;
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
    cachedToken = data.access_token;
    cachedExpiry = now + (data.expires_in * 1000) - 60000; // 1 minute buffer
    refreshPromise = null;
    return cachedToken;
  })();

  return await refreshPromise;
}

/**
 * Proxies Zoho Inventory Purchase Orders endpoint
 */
export async function fetchPurchaseOrders(status = 'open') {
  const token = await getAccessToken();
  const resp = await axios.get(
    `https://www.zohoapis.eu/inventory/v1/purchaseorders`,
    {
      params: { status, organization_id: ZOHO_ORG_ID },
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    }
  );
  return resp.data.purchaseorders;
}
