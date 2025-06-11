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
async function fetchPaginatedData(endpoint, params = {}, maxRecords = null) {
  let allData = [];
  let page = 1;
  let hasMore = true;
  let pageToken = null;
  const perPage = params.per_page || 200;
  
  while (hasMore) {
    try {
      // Build request parameters
      const requestParams = { ...params, per_page: perPage };
      
      // Use page_token if we have one (for pages beyond 2000 records)
      if (pageToken) {
        requestParams.page_token = pageToken;
        // Remove page parameter when using page_token
        delete requestParams.page;
      } else if (page <= 10) {
        // Only use page parameter for first 2000 records (10 pages * 200)
        requestParams.page = page;
      } else {
        // We've hit the limit and don't have a page_token, stop
        console.log('⚠️ Reached 2000 record limit without page_token');
        break;
      }
      
      const response = await makeZohoAPIRequest(endpoint, requestParams);
      
      if (response.data && response.data.length > 0) {
        allData = allData.concat(response.data);
        
        // Check if we have a next_page_token for pagination beyond 2000 records
        if (response.info && response.info.next_page_token) {
          pageToken = response.info.next_page_token;
          page++; // Still increment page for logging purposes
        } else if (response.info && response.info.more_records && !pageToken && page < 10) {
          // Only increment page if we're under the 2000 record limit
          page++;
        } else {
          hasMore = false;
        }
        
        // Check if we've reached the max records limit
        if (maxRecords && allData.length >= maxRecords) {
          allData = allData.slice(0, maxRecords);
          hasMore = false;
        }
        
        console.log(`📦 Fetched page ${page} (${allData.length} records so far)`);
      } else {
        hasMore = false;
      }
      
    } catch (error) {
      // Handle specific pagination error
      if (error.response && error.response.data && 
          error.response.data.code === 'DISCRETE_PAGINATION_LIMIT_EXCEEDED') {
        console.log('⚠️ Hit pagination limit. Need to use page_token for records beyond 2000.');
        // Try to get the first 2000 records if we haven't already
        if (page === 11 && !pageToken) {
          console.log('📋 Returning first 2000 records only');
          hasMore = false;
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
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
export async function fetchProductsFromInventory(options = {}) {
  console.log('🔄 Starting product sync from Inventory...');
  
  try {
    // Build parameters for the Inventory API
    const params = {
      // Zoho Inventory uses different field names
      sort_column: 'last_modified_time',
      sort_order: 'D', // D for descending in Inventory API
    };
    
    // Add modified time filter if provided
    if (options.modifiedAfter) {
      // Convert date to timestamp in milliseconds
      const timestamp = new Date(options.modifiedAfter).getTime();
      params.last_modified_time = timestamp;
    }
    
    // Fetch items from Inventory API
    const items = await fetchPaginatedData('/inventory/v1/items', params);
    
    // Transform Inventory items to match the expected product format
    const products = items.map(item => ({
      // Map Inventory fields to expected product fields
      id: item.item_id,
      Product_Name: item.name,
      Product_Code: item.sku,
      Unit_Price: item.rate,
      List_Price: item.rate, // Inventory doesn't have separate list price
      Product_Category: item.category_name || '',
      Product_Active: item.status === 'active',
      Qty_in_Stock: item.stock_on_hand || 0,
      Qty_Available: item.available_stock || 0,
      Description: item.description || '',
      Manufacturer: item.brand || '',
      Product_Image: item.image_url || '',
      Reorder_Level: item.reorder_level || 0,
      Modified_Time: item.last_modified_time,
      
      // Additional Inventory-specific fields
      inventory_account_name: item.inventory_account_name,
      purchase_rate: item.purchase_rate,
      initial_stock: item.initial_stock,
      warehouse_data: item.warehouses || []
    }));
    
    console.log(`✅ Fetched ${products.length} products from Inventory`);
    return products;
    
  } catch (error) {
    console.error('❌ Failed to fetch products from Inventory:', error);
    throw error;
  }
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

export async function getInventoryContactIdByEmail(email) {
  if (!email) {
    return null;
  }

  try {
    const token = await getAccessToken();
    const url = `${ZOHO_CONFIG.baseUrls.inventory}/contacts`;
    
    const response = await axios.get(url, {
      params: {
        organization_id: ZOHO_CONFIG.orgId,
        email: email
      },
      headers: { Authorization: `Zoho-oauthtoken ${token}` }
    });

    // The data is typically in a 'contacts' array in the response
    const contacts = response.data?.contacts;

    if (contacts && contacts.length > 0) {
      // Return the ID of the first matching contact
      return contacts[0].contact_id;
    }

    // Return null if no contact was found
    return null;

  } catch (error) {
    console.error(`❌ Failed to find Zoho Inventory contact by email ${email}:`, error.message);
    // Return null on error to prevent the sync process from halting
    return null;
  }
}