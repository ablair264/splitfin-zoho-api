import admin from 'firebase-admin';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current file directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(join(__dirname, '../../../key.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Zoho API Configuration
const ZOHO_REGION = process.env.ZOHO_REGION || 'eu';
const ZOHO_CLIENT_ID = "1000.AV9M9OMELL7FB7UMDLDV4TXPPYM0CZ";
const ZOHO_CLIENT_SECRET = "bcb3b1358539f7343a05023ab71ea5704706faaa2a";
const ZOHO_REFRESH_TOKEN = "1000.ebc8fd1267ba4edca22abcfd25263212.c45dadbd00483ad07d0d395e824c8e39";
const ZOHO_ORG_ID = "20083870449";

// Set URLs based on region
let ZOHO_ACCOUNTS_BASE, ZOHO_API_BASE;
if (ZOHO_REGION === 'eu') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.eu';
  ZOHO_API_BASE = 'https://www.zohoapis.eu/inventory/v1';
} else if (ZOHO_REGION === 'in') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.in';
  ZOHO_API_BASE = 'https://www.zohoapis.in/inventory/v1';
} else if (ZOHO_REGION === 'com.au') {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.com.au';
  ZOHO_API_BASE = 'https://www.zohoapis.com.au/inventory/v1';
} else {
  ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.com';
  ZOHO_API_BASE = 'https://www.zohoapis.com/inventory/v1';
}

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1200; // 1.2 seconds between requests
const BATCH_DELAY = 5000; // 5 seconds between batches

class ZohoOAuth {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log(`🔑 Refreshing Zoho access token from ${ZOHO_REGION} region...`);

    const tokenUrl = `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`;

    const data = {
      refresh_token: ZOHO_REFRESH_TOKEN,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token'
    };

    try {
      const response = await axios.post(tokenUrl, data);
      
      if (response.status === 200) {
        const tokenData = response.data;
        this.accessToken = tokenData.access_token;
        this.tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
        console.log("✅ Access token refreshed successfully");
        return this.accessToken;
      } else {
        throw new Error(`Failed to refresh token: ${response.status} - ${response.data}`);
      }
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }
}

class ZohoInventoryClient {
  constructor(auth) {
    this.auth = auth;
    this.orgId = ZOHO_ORG_ID;
  }

  async getSalesOrder(salesOrderId) {
    const url = `${ZOHO_API_BASE}/salesorders/${salesOrderId}`;
    
    const accessToken = await this.auth.getAccessToken();
    
    const headers = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const params = {
      organization_id: this.orgId
    };

    try {
      const response = await axios.get(url, { headers, params });
      
      if (response.status === 200) {
        const data = response.data;
        if (data.code === 0) {
          return data.salesorder;
        } else {
          console.log(`  ❌ Error fetching sales order ${salesOrderId}: ${data.message}`);
          return null;
        }
      } else if (response.status === 429) {
        console.log(`  ⚠️ Rate limit hit for sales order ${salesOrderId}`);
        throw new Error("Rate limit");
      } else {
        console.log(`  ❌ Error fetching sales order ${salesOrderId}: ${response.status}`);
        return null;
      }
    } catch (error) {
      if (error.message.includes("Rate limit")) {
        throw error;
      }
      console.log(`  ❌ Exception fetching sales order ${salesOrderId}: ${error.message}`);
      return null;
    }
  }

  async getAllSalesOrders() {
    console.log("📋 Fetching sales orders list from Zoho Inventory...");
    
    const allSalesOrders = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const url = `${ZOHO_API_BASE}/salesorders`;
      
      const accessToken = await this.auth.getAccessToken();
      
      const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      };
      
      const params = {
        organization_id: this.orgId,
        page: page,
        per_page: 200
      };

      try {
        const response = await axios.get(url, { headers, params });
        
        if (response.status === 200) {
          const data = response.data;
          if (data.code === 0) {
            const salesOrders = data.salesorders || [];
            allSalesOrders.push(...salesOrders);
            
            console.log(`  📄 Page ${page}: ${salesOrders.length} sales orders`);
            
            // Check if there are more pages
            const pageContext = data.page_context || {};
            hasMore = pageContext.has_more_page || false;
            page++;
            
            // Small delay between pages
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            console.log(`❌ Zoho API error: ${data.message}`);
            break;
          }
        } else if (response.status === 429) {
          console.log("⚠️ Rate limit hit, waiting 60 seconds...");
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        } else {
          console.log(`❌ Error fetching sales orders: ${response.status}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Exception fetching sales orders: ${error.message}`);
        break;
      }
    }
    
    return allSalesOrders;
  }
}

// Helper function to safely convert to number
function safeNumber(value, defaultVal = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultVal;
  }
  const num = Number(value);
  return isNaN(num) ? defaultVal : num;
}

// Helper function to safely convert to string
function safeString(value, defaultVal = '') {
  if (value === null || value === undefined) {
    return defaultVal;
  }
  return String(value);
}

async function fetchAndFixSalesOrderLineItems() {
  console.log("🚀 Starting sales order line items fetch from Zoho...");
  console.log(`📍 API Base: ${ZOHO_API_BASE}`);
  console.log(`🏢 Organization ID: ${ZOHO_ORG_ID}`);
  console.log("-".repeat(50));

  try {
    // Initialize Zoho client
    const auth = new ZohoOAuth();
    const zohoClient = new ZohoInventoryClient(auth);

    // Get all sales orders from Firebase
    console.log("📊 Fetching sales orders from Firebase...");
    const salesOrdersSnapshot = await db.collection('sales_orders').get();
    const firebaseSalesOrders = {};
    
    salesOrdersSnapshot.forEach(doc => {
      firebaseSalesOrders[doc.id] = doc.data();
    });
    
    console.log(`✅ Found ${Object.keys(firebaseSalesOrders).length} sales orders in Firebase`);

    // Get all sales orders from Zoho
    const zohoSalesOrders = await zohoClient.getAllSalesOrders();
    console.log(`✅ Found ${zohoSalesOrders.length} sales orders in Zoho`);
    console.log("-".repeat(50));

    // Track statistics
    const stats = {
      total: 0,
      processed: 0,
      added: 0,
      errors: 0,
      skipped: 0
    };

    // Process each sales order
    for (const zohoSalesOrder of zohoSalesOrders) {
      const salesOrderId = zohoSalesOrder.salesorder_id;
      const salesOrderNumber = zohoSalesOrder.salesorder_number;
      
      stats.total++;
      
      try {
        // Check if this sales order exists in Firebase
        if (!firebaseSalesOrders[salesOrderId]) {
          console.log(`  ⏭️ Skipping ${salesOrderNumber} - not in Firebase`);
          stats.skipped++;
          continue;
        }

        // Check if line items already exist
        const lineItemsSnapshot = await db
          .collection('sales_orders')
          .doc(salesOrderId)
          .collection('sales_order_items')
          .get();

        if (!lineItemsSnapshot.empty) {
          console.log(`  ✅ ${salesOrderNumber} already has ${lineItemsSnapshot.size} line items`);
          stats.skipped++;
          continue;
        }

        // Get full sales order details from Zoho
        console.log(`  📋 Fetching details for ${salesOrderNumber}...`);
        const fullSalesOrder = await zohoClient.getSalesOrder(salesOrderId);
        
        if (!fullSalesOrder) {
          console.log(`  ❌ Could not fetch details for ${salesOrderNumber}`);
          stats.errors++;
          continue;
        }

        // Extract line items
        const lineItems = fullSalesOrder.line_items || [];
        
        if (lineItems.length === 0) {
          console.log(`  ⚠️ ${salesOrderNumber} has no line items in Zoho`);
          stats.skipped++;
          continue;
        }

        console.log(`  📦 Processing ${lineItems.length} line items for ${salesOrderNumber}`);

        // Create batch for line items
        const batch = db.batch();
        let batchCount = 0;

        for (const lineItem of lineItems) {
          // Create line item document
          const lineItemData = {
            item_id: safeString(lineItem.item_id),
            item_name: safeString(lineItem.name),
            sku: safeString(lineItem.sku),
            description: safeString(lineItem.description),
            quantity: safeNumber(lineItem.quantity),
            rate: safeNumber(lineItem.rate),
            discount: safeNumber(lineItem.discount),
            tax_id: safeString(lineItem.tax_id),
            tax_name: safeString(lineItem.tax_name),
            tax_percentage: safeNumber(lineItem.tax_percentage),
            line_total: safeNumber(lineItem.line_total),
            unit: safeString(lineItem.unit),
            discount_amount: safeNumber(lineItem.discount_amount),
            tax_amount: safeNumber(lineItem.tax_amount),
            item_total: safeNumber(lineItem.item_total),
            _source: 'zoho_inventory',
            _synced_at: admin.firestore.FieldValue.serverTimestamp()
          };

          // Add to batch
          const lineItemRef = db
            .collection('sales_orders')
            .doc(salesOrderId)
            .collection('sales_order_items')
            .doc();

          batch.set(lineItemRef, lineItemData);
          batchCount++;

          // Commit batch if it gets too large
          if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // Commit remaining items
        if (batchCount > 0) {
          await batch.commit();
        }

        stats.added++;
        stats.processed++;
        console.log(`  ✅ Added ${lineItems.length} line items to ${salesOrderNumber}`);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

      } catch (error) {
        if (error.message.includes("Rate limit")) {
          console.log("⚠️ Rate limit hit, waiting 60 seconds...");
          await new Promise(resolve => setTimeout(resolve, 60000));
          // Retry this sales order
          stats.total--; // Don't count this as processed yet
          continue;
        } else {
          console.log(`  ❌ Error processing ${salesOrderNumber}: ${error.message}`);
          stats.errors++;
        }
      }

      // Progress update every 10 items
      if (stats.processed % 10 === 0) {
        console.log(`📊 Progress: ${stats.processed}/${stats.total} processed`);
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 FETCH SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total sales orders: ${stats.total}`);
    console.log(`✨ Line items added: ${stats.added}`);
    console.log(`⏭️ Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.log(`\n❌ Error during fetch: ${error.message}`);
    console.error(error);
  }
}

async function verifySetup() {
  console.log("🔍 Verifying Zoho setup...");
  
  try {
    const auth = new ZohoOAuth();
    const token = await auth.getAccessToken();
    
    if (token) {
      console.log("✅ Successfully obtained access token");
      console.log(`📍 Using Zoho ${ZOHO_REGION} region`);
      console.log(`🔗 API Base: ${ZOHO_API_BASE}`);
      return true;
    } else {
      console.log("❌ Failed to obtain access token");
      return false;
    }
  } catch (error) {
    console.log(`❌ Setup verification failed: ${error.message}`);
    return false;
  }
}

// Main execution
async function main() {
  // First verify the setup
  if (await verifySetup()) {
    console.log("\n" + "=".repeat(50));
    // Fetch sales order line items
    await fetchAndFixSalesOrderLineItems();
  } else {
    console.log("\n❌ Please check your Zoho credentials and try again.");
  }
}

// Run the script
main().catch(console.error); 