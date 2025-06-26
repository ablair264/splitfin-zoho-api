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
export async function fetchPaginatedData(url, params = {}, dataKey = 'data') {
  const allData = [];
  let page = 1;
  let pageToken = null; // Variable to hold the page token
  const perPage = ZOHO_CONFIG.pagination.defaultPerPage;
  const maxLoops = 100; // Safety break to prevent infinite loops
  let currentLoop = 0;

  console.log(`🔄 Fetching paginated data from ${url}`);

  while (currentLoop < maxLoops) {
    currentLoop++;
    try {
      // Build the parameters for the current request
      const requestParams = { ...params };
      if (pageToken) {
        // If we have a token, use it instead of the page number
        requestParams.page_token = pageToken;
        delete requestParams.page; // Remove page number when using a token
      } else {
        // Otherwise, use the page number for the initial requests
        requestParams.page = page;
        requestParams.per_page = perPage;
      }
      
      const token = await getAccessToken();
      const response = await axios.get(url, {
        params: requestParams,
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        timeout: 30000
      });

      const responseData = response.data;
      const items = Array.isArray(responseData[dataKey]) ? responseData[dataKey] : (responseData.data || []);
      
      if (items.length === 0) {
        console.log(`✅ No more data found on page ${page}, stopping pagination.`);
        break;
      }
      
      allData.push(...items);
      
      const nextPageToken = responseData.info?.next_page_token;

      if (nextPageToken) {
        pageToken = nextPageToken;
        console.log(`   - Got page_token for next page.`);
      } else {
        const hasMoreRecords = responseData.info?.more_records;
        if (hasMoreRecords && page < 10) { // Limit page-based pagination
            page++;
        } else {
            console.log(`✅ No more pages or token indicated by API, stopping pagination.`);
            break;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.warn(`⚠️ Error on page ${page}:`, error.message);
      break;
    }
  }

  console.log(`✅ Completed pagination: ${allData.length} total items fetched`);
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
/**
 * Fetches products from ZOHO INVENTORY - CORRECTED VERSION
 */
export async function fetchProductsFromInventory(options = {}) {
  console.log('🔄 Starting product sync from Inventory...');
  
  try {
    const params = {
      sort_column: 'last_modified_time',
      sort_order: 'D',
    };
    
    if (options.modifiedAfter) {
      const isoDate = new Date(options.modifiedAfter).toISOString();
      params.last_modified_since = isoDate;
    }
    
    // --- THIS IS THE CORRECTED LINE ---
    // We now construct the full URL and specify the 'items' dataKey.
    const items = await fetchPaginatedData(
      `${ZOHO_CONFIG.baseUrls.inventory}/items`, 
      params,
      'items' // The array of items is under the 'items' key in the response
    );
    
    // The rest of your transformation logic remains the same
    const products = items.map(item => ({
      id: item.item_id,
      Product_Name: item.name,
      Product_Code: item.sku,
      Unit_Price: item.rate,
      List_Price: item.rate,
      Product_Category: item.category_name || '',
      Product_Active: item.status === 'active',
      Qty_in_Stock: item.stock_on_hand || 0,
      Qty_Available: item.available_stock || 0,
      Description: item.description || '',
      Manufacturer: item.brand || '',
      Product_Image: item.image_url || '',
      Reorder_Level: item.reorder_level || 0,
      Modified_Time: item.last_modified_time,
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

export async function createInventoryContact(contactData) {
  const token = await getAccessToken();
  
  // Prepare the payload according to Zoho Inventory's contact structure
  const payload = {
    contact_name: contactData.contact_name,
    company_name: contactData.company_name || '',
    contact_type: 'customer',
    customer_sub_type: contactData.customer_sub_type || 'business',
    email: contactData.email,
    phone: contactData.phone || '',
    currency_code: contactData.currency_code || 'GBP',
    payment_terms: contactData.payment_terms || 30,
    credit_limit: contactData.credit_limit || 5000,
    billing_address: contactData.billing_address,
    shipping_address: contactData.shipping_address || contactData.billing_address,
    // Add custom fields if needed
    custom_fields: contactData.custom_fields || []
  };

  // Remove empty fields that might cause issues
  Object.keys(payload).forEach(key => {
    if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
      delete payload[key];
    }
  });

  try {
    console.log('Creating contact in Zoho Inventory:', payload.email);
    
    const response = await axios.post(
      `${ZOHO_CONFIG.baseUrls.inventory}/contacts`,
      JSON.stringify(payload),
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
          'X-com-zoho-inventory-organizationid': ZOHO_CONFIG.orgId
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(response.data.message || 'Failed to create contact in Zoho Inventory');
    }

    console.log('✅ Contact created in Zoho Inventory:', response.data.contact.contact_id);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create Inventory contact:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Zoho error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
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