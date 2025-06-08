// server/src/api/zoho.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Centralized configuration
const ZOHO_CONFIG = {
  clientId: process.env.ZOHO_CLIENT_ID,
  clientSecret: process.env.ZOHO_CLIENT_SECRET,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
  orgId: process.env.ZOHO_ORG_ID,
  
  // Base URLs - centralized for easy maintenance
  baseUrls: {
    auth: 'https://accounts.zoho.eu/oauth/v2',
    crm: 'https://www.zohoapis.eu/crm/v5',
    inventory: 'https://www.zohoapis.eu/inventory/v1' // Keep for legacy sales orders
  },
  
  // Standard pagination settings
  pagination: {
    defaultPerPage: 200,
    maxPerPage: 200
  }
};

// Token management
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
    try {
      const response = await axios.post(
        `${ZOHO_CONFIG.baseUrls.auth}/token`,
        null,
        {
          params: {
            grant_type: 'refresh_token',
            client_id: ZOHO_CONFIG.clientId,
            client_secret: ZOHO_CONFIG.clientSecret,
            refresh_token: ZOHO_CONFIG.refreshToken
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
    } catch (error) {
      refreshPromise = null;
      throw error;
    }
  })();

  return await refreshPromise;
}

/**
 * Generic function for paginated Zoho requests
 */
async function fetchPaginatedData(url, params = {}, dataKey = 'data') {
  const allData = [];
  let page = 1;
  const perPage = ZOHO_CONFIG.pagination.defaultPerPage;

  while (true) {
    const token = await getAccessToken();
    const response = await axios.get(url, {
      params: { ...params, page, per_page: perPage },
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    const data = response.data;
    const items = Array.isArray(data[dataKey]) ? data[dataKey] : data.data || [];
    
    if (items.length === 0) break;
    allData.push(...items);

    // Check for more pages based on response structure
    const hasMorePages = data.page_context?.has_more_page || 
                        data.info?.more_records || 
                        items.length === perPage;
    
    if (!hasMorePages) break;
    page++;
  }

  return allData;
}

// ========================================
// CRM FUNCTIONS (Primary data source)
// ========================================

/**
 * Fetches all customers from CRM - now the single source of truth
 */
export async function fetchCustomersFromCRM() {
  const fields = [
    'Account_Name',
    'Phone', 
    'Primary_Email',
    'Agent',
    'Billing_City',
    'Billing_Code',
    'Billing_Country',
    'Billing_State',
    'Billing_Street',
    'Primary_First_Name',
    'Primary_Last_Name',
    // Add any other fields you need
    'id' // Always include the CRM ID
  ];

  return await fetchPaginatedData(
    `${ZOHO_CONFIG.baseUrls.crm}/Accounts`,
    { fields: fields.join(',') }
  );
}

/**
 * Fetches products from CRM (synced from Inventory) - enhanced version
 */
export async function fetchProductsFromCRM(options = {}) {
  const fields = [
    'Product_Name',
    'Product_Code', 
    'Unit_Price',
    'List_Price',
    'Product_Category',
    'Product_Active',
    'Qty_in_Stock',
    'Qty_Available',
    'Description',
    'Manufacturer',
    'Product_Image',
    'Reorder_Level',
    'Modified_Time', // Important for incremental sync
    'id'
  ];

  const params = { 
    fields: fields.join(','),
    sort_by: 'Modified_Time',
    sort_order: 'desc'
  };

  // Add date filter for incremental syncing
  if (options.modifiedAfter) {
    // Format date for Zoho CRM API (ISO format)
    const isoDate = options.modifiedAfter.toISOString();
    params.criteria = `Modified_Time:greater_than:${isoDate}`;
  }

  // Add other optional filters
  if (options.category) {
    const categoryFilter = `Product_Category:equals:${options.category}`;
    params.criteria = params.criteria 
      ? `(${params.criteria}) and (${categoryFilter})`
      : categoryFilter;
  }

  if (options.active !== undefined) {
    const activeFilter = `Product_Active:equals:${options.active}`;
    params.criteria = params.criteria 
      ? `(${params.criteria}) and (${activeFilter})`
      : activeFilter;
  }

  if (options.manufacturer) {
    const manufacturerFilter = `Manufacturer:equals:${options.manufacturer}`;
    params.criteria = params.criteria 
      ? `(${params.criteria}) and (${manufacturerFilter})`
      : manufacturerFilter;
  }

  const products = await fetchPaginatedData(
    `${ZOHO_CONFIG.baseUrls.crm}/Products`,
    params
  );

  // Return in CRM format (no transformation)
  return products;
}

/**
 * Search for a specific account in CRM by email
 */
export async function findAccountByEmail(email) {
  const token = await getAccessToken();
  const url = `${ZOHO_CONFIG.baseUrls.crm}/Accounts/search`;
  
  try {
    const response = await axios.get(url, {
      params: {
        email: email,
        fields: 'Account_Name,Primary_Email,id'
      },
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    
    const accounts = response.data?.data || [];
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error(`Failed to find account by email ${email}:`, error.response?.data || error.message);
    return null;
  }
}

// ========================================
// LEGACY INVENTORY FUNCTIONS 
// (Keep only what's needed for existing functionality)
// ========================================

/**
 * Fetch products from CRM (replaces old Inventory fetchItems)
 * Products are automatically synced from Inventory to CRM by Zoho
 */
export async function fetchItems() {
  console.log('📦 Fetching products from CRM (synced from Inventory)...');
  
  const fields = [
    'Product_Name',
    'Product_Code', 
    'Unit_Price',
    'List_Price',
    'Product_Category',
    'Product_Active',
    'Qty_in_Stock',
    'Qty_Available',
    'Description',
    'Manufacturer',
    'Product_Image',
    'Reorder_Level',
    'id'
  ];

  const products = await fetchPaginatedData(
    `${ZOHO_CONFIG.baseUrls.crm}/Products`,
    { fields: fields.join(',') }
  );

  // Transform CRM product format to match expected Inventory format
  return products.map(product => ({
    item_id: product.id,
    name: product.Product_Name || '',
    sku: product.Product_Code || '',
    rate: parseFloat(product.Unit_Price) || 0,
    list_price: parseFloat(product.List_Price) || parseFloat(product.Unit_Price) || 0,
    stock_on_hand: parseInt(product.Qty_in_Stock) || 0,
    available_stock: parseInt(product.Qty_Available) || parseInt(product.Qty_in_Stock) || 0,
    status: product.Product_Active !== false ? 'active' : 'inactive',
    description: product.Description || '',
    product_type: 'inventory',
    category: product.Product_Category || '',
    manufacturer: product.Manufacturer || '',
    reorder_level: parseInt(product.Reorder_Level) || 0,
    // Keep original CRM data for reference
    _crmData: product,
    _dataSource: 'CRM'
  }));
}

/**
 * Fetch purchase orders - keeping this as it's Inventory-specific functionality
 */
export async function fetchPurchaseOrders(options = {}) {
  const params = {
    organization_id: ZOHO_CONFIG.orgId,
    include_line_items: true
  };

  // Only add status filter if specifically provided
  if (options.status) {
    params.status = options.status;
  }

  // Add date filter for incremental syncing
  if (options.modifiedAfter) {
    params.last_modified_time = options.modifiedAfter.toISOString();
  }

  // Add other optional filters
  if (options.vendor_id) {
    params.vendor_id = options.vendor_id;
  }

  if (options.date_start) {
    params.date_start = options.date_start;
  }

  if (options.date_end) {
    params.date_end = options.date_end;
  }

  return await fetchPaginatedData(
    `${ZOHO_CONFIG.baseUrls.inventory}/purchaseorders`,
    params,
    'purchaseorders'
  );
}

export async function createSalesOrder(order) {
  const token = await getAccessToken();

  const payload = {
    customer_id: order.zohoCustID, // This should be the Inventory customer ID
    reference_number: `WebOrder-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    line_items: order.items.map(item => ({
      item_id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      rate: item.item_total / item.quantity,
    })),
    cf_agent: order.agentZohoCRMId // Custom field linking to CRM agent
  };

  try {
    const response = await axios.post(
      `${ZOHO_CONFIG.baseUrls.inventory}/salesorders`,
      payload,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          'X-com-zoho-inventory-organizationid': ZOHO_CONFIG.orgId,
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Zoho Sales Order creation failed');
    }

    console.log('✅ Sales Order created:', response.data.salesorder.salesorder_number);
    return response.data;
  } catch (error) {
    console.error('❌ Sales Order creation failed:', error.response?.data || error.message);
    throw error;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Health check for Zoho API connectivity
 */
export async function checkZohoConnection() {
  try {
    const token = await getAccessToken();
    const response = await axios.get(`${ZOHO_CONFIG.baseUrls.crm}/org`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });
    return { connected: true, org: response.data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

/**
 * Get current token info (useful for debugging)
 */
export function getTokenInfo() {
  return {
    hasToken: !!cachedToken,
    expiresAt: new Date(cachedExpiry),
    timeUntilExpiry: cachedExpiry - Date.now()
  };
}