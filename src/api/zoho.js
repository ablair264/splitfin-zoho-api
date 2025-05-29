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
    if (data.error) throw new Error(data.error_description || data.error);

    cachedToken = data.access_token;
    cachedExpiry = now + data.expires_in * 1000 - 60000;
    refreshPromise = null;
    return cachedToken;
  })();

  return await refreshPromise;
}

/**
 * Fetches all items from Zoho Inventory via pagination.
 */
export async function fetchItems() {
  const allItems = [];
  let page = 1;
  const per_page = 200;

  while (true) {
    const token = await getAccessToken();
    const resp = await axios.get(
      'https://www.zohoapis.eu/inventory/v1/items',
      {
        params: { organization_id: ZOHO_ORG_ID, per_page, page },
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      }
    );
    const data = resp.data;
    if (Array.isArray(data.items)) {
      allItems.push(...data.items);
    }
    if (!data.page_context?.has_more_page) break;
    page += 1;
  }

  return allItems;
}

/**
 * Proxies Zoho Inventory purchase orders.
 */
async function fetchAllPurchaseOrders(status = 'open') {
  const perPage = 200;
  let page = 1;
  let allOrders = [];

  while (true) {
    const url =
      `https://www.zohoapis.eu/inventory/v1/purchaseorders` +
      `?status=${status}` +
      `&organization_id=${ZOHO_ORG_ID}` +
      `&include_line_items=true` +
      `&per_page=${perPage}` +
      `&page=${page}`;

    const { data } = await axios.get(url, {
      headers: { Authorization: `Zoho-oauthtoken ${await getAccessToken()}` }
    });

    const orders = Array.isArray(data.purchaseorders)
      ? data.purchaseorders
      : [];

    // stop if empty
    if (orders.length === 0) break;

    allOrders.push(...orders);

    // last page?
    if (orders.length < perPage) break;

    page++;
  }

  return allOrders;
}
