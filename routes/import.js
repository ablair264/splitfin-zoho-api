// server/routes/import.js
// API routes for item import functionality

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const AIService = require('../aiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const aiService = new AIService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// ============================================================
// AI COLUMN ANALYSIS
// ============================================================

router.post('/ai/analyze-columns', authenticateToken, async (req, res) => {
  try {
    const { headers, sampleData, targetFields } = req.body;
    const userId = req.user.id;

    if (!headers || !Array.isArray(headers)) {
      return res.status(400).json({ error: 'Headers array is required' });
    }

    const analysis = await aiService.analyzeCSVColumns({
      headers,
      sampleData: sampleData || [],
      targetFields: targetFields || [],
      userId
    });

    res.json(analysis);
  } catch (error) {
    console.error('Column analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze columns' });
  }
});

// ============================================================
// CSV UPLOAD AND PROCESSING
// ============================================================

router.post('/csv/upload', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(filePath);

          if (results.length === 0) {
            return res.status(400).json({ error: 'CSV file is empty or invalid' });
          }

          // Get headers from first row
          const headers = Object.keys(results[0]);
          const sampleData = results.slice(0, 10);

          // Analyze columns using AI
          const analysis = await aiService.analyzeCSVColumns({
            headers,
            sampleData,
            targetFields: [
              'item_name', 'item_description', 'vendor_name', 'category_name',
              'sku', 'ean', 'part_no', 'purchase_price', 'retail_price',
              'stock_total', 'reorder_level', 'product_type', 'tax_rate'
            ],
            userId: req.user.id
          });

          res.json({
            success: true,
            data: results,
            headers,
            analysis,
            totalRows: results.length
          });
        } catch (error) {
          console.error('CSV processing error:', error);
          res.status(500).json({ error: 'Failed to process CSV file' });
        }
      })
      .on('error', (error) => {
        // Clean up uploaded file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Failed to upload CSV file' });
  }
});

// ============================================================
// SHOPIFY INTEGRATION
// ============================================================

router.post('/shopify/connect', authenticateToken, async (req, res) => {
  try {
    const { store, apiKey } = req.body;
    const userId = req.user.id;

    if (!store || !apiKey) {
      return res.status(400).json({ error: 'Store URL and API key are required' });
    }

    // Validate Shopify store URL
    const storeUrl = store.includes('myshopify.com') ? store : `${store}.myshopify.com`;
    
    // Test Shopify API connection
    const shopifyResponse = await fetch(`https://${storeUrl}/admin/api/2023-10/products.json`, {
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!shopifyResponse.ok) {
      return res.status(401).json({ error: 'Invalid Shopify credentials' });
    }

    const shopifyData = await shopifyResponse.json();
    const products = shopifyData.products || [];

    // Transform Shopify products to our format
    const transformedProducts = products.map(product => ({
      item_name: product.title,
      item_description: product.body_html,
      vendor_name: product.vendor,
      category_name: product.product_type,
      sku: product.variants?.[0]?.sku || '',
      retail_price: parseFloat(product.variants?.[0]?.price || '0'),
      stock_total: product.variants?.[0]?.inventory_quantity || 0,
      product_type: 'Goods',
      status: 'active',
      tags: product.tags,
      images: product.images?.map(img => img.src) || []
    }));

    // Store connection details (in production, encrypt sensitive data)
    // await saveShopifyConnection(userId, storeUrl, apiKey);

    res.json({
      success: true,
      products: transformedProducts,
      totalProducts: transformedProducts.length,
      store: storeUrl
    });

  } catch (error) {
    console.error('Shopify connection error:', error);
    res.status(500).json({ error: 'Failed to connect to Shopify' });
  }
});

router.get('/shopify/products', authenticateToken, async (req, res) => {
  try {
    const { store, apiKey, limit = 50, page = 1 } = req.query;
    const userId = req.user.id;

    if (!store || !apiKey) {
      return res.status(400).json({ error: 'Store URL and API key are required' });
    }

    const storeUrl = store.includes('myshopify.com') ? store : `${store}.myshopify.com`;
    const offset = (page - 1) * limit;

    const shopifyResponse = await fetch(
      `https://${storeUrl}/admin/api/2023-10/products.json?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'X-Shopify-Access-Token': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!shopifyResponse.ok) {
      return res.status(401).json({ error: 'Invalid Shopify credentials' });
    }

    const shopifyData = await shopifyResponse.json();
    const products = shopifyData.products || [];

    const transformedProducts = products.map(product => ({
      item_name: product.title,
      item_description: product.body_html,
      vendor_name: product.vendor,
      category_name: product.product_type,
      sku: product.variants?.[0]?.sku || '',
      retail_price: parseFloat(product.variants?.[0]?.price || '0'),
      stock_total: product.variants?.[0]?.inventory_quantity || 0,
      product_type: 'Goods',
      status: 'active',
      tags: product.tags,
      images: product.images?.map(img => img.src) || []
    }));

    res.json({
      success: true,
      products: transformedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: shopifyData.products?.length || 0
      }
    });

  } catch (error) {
    console.error('Shopify products fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Shopify products' });
  }
});

// ============================================================
// ZOHO INVENTORY INTEGRATION
// ============================================================

router.post('/zoho/connect', authenticateToken, async (req, res) => {
  try {
    const { orgId, authToken } = req.body;
    const userId = req.user.id;

    if (!orgId || !authToken) {
      return res.status(400).json({ error: 'Organization ID and Auth Token are required' });
    }

    // Test Zoho Inventory API connection
    const zohoResponse = await fetch(
      `https://inventory.zoho.com/api/v1/organizations/${orgId}/items`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!zohoResponse.ok) {
      return res.status(401).json({ error: 'Invalid Zoho credentials' });
    }

    const zohoData = await zohoResponse.json();
    const items = zohoData.items || [];

    // Transform Zoho items to our format
    const transformedItems = items.map(item => ({
      item_name: item.name,
      item_description: item.description,
      vendor_name: item.brand,
      category_name: item.category,
      sku: item.sku,
      retail_price: item.selling_price,
      purchase_price: item.purchase_price,
      stock_total: item.current_stock,
      reorder_level: item.reorder_level,
      product_type: 'Goods',
      tax_rate: item.tax_percentage,
      status: item.status === 'active' ? 'active' : 'inactive',
      unit: item.unit
    }));

    // Store connection details (in production, encrypt sensitive data)
    // await saveZohoConnection(userId, orgId, authToken);

    res.json({
      success: true,
      items: transformedItems,
      totalItems: transformedItems.length,
      orgId
    });

  } catch (error) {
    console.error('Zoho connection error:', error);
    res.status(500).json({ error: 'Failed to connect to Zoho Inventory' });
  }
});

router.get('/zoho/items', authenticateToken, async (req, res) => {
  try {
    const { orgId, authToken, page = 1, per_page = 50 } = req.query;
    const userId = req.user.id;

    if (!orgId || !authToken) {
      return res.status(400).json({ error: 'Organization ID and Auth Token are required' });
    }

    const zohoResponse = await fetch(
      `https://inventory.zoho.com/api/v1/organizations/${orgId}/items?page=${page}&per_page=${per_page}`,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!zohoResponse.ok) {
      return res.status(401).json({ error: 'Invalid Zoho credentials' });
    }

    const zohoData = await zohoResponse.json();
    const items = zohoData.items || [];

    const transformedItems = items.map(item => ({
      item_name: item.name,
      item_description: item.description,
      vendor_name: item.brand,
      category_name: item.category,
      sku: item.sku,
      retail_price: item.selling_price,
      purchase_price: item.purchase_price,
      stock_total: item.current_stock,
      reorder_level: item.reorder_level,
      product_type: 'Goods',
      tax_rate: item.tax_percentage,
      status: item.status === 'active' ? 'active' : 'inactive',
      unit: item.unit
    }));

    res.json({
      success: true,
      items: transformedItems,
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: zohoData.page_context?.total || 0
      }
    });

  } catch (error) {
    console.error('Zoho items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Zoho items' });
  }
});

// ============================================================
// ITEM IMPORT EXECUTION
// ============================================================

router.post('/inventory/import-items', authenticateToken, async (req, res) => {
  try {
    const { items, source, sourceName } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Validate required fields
    const requiredFields = ['item_name', 'sku'];
    const missingFields = items.filter(item => 
      !item.item_name || !item.sku
    );

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Some items are missing required fields (item_name, sku)',
        missingFields: missingFields.length
      });
    }

    // Process items in batches
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results = {
      total: items.length,
      imported: 0,
      failed: 0,
      errors: []
    };

    // Import each batch
    for (const batch of batches) {
      try {
        // Here you would typically save to your database
        // For now, we'll simulate the import
        const batchResults = await processItemBatch(batch, userId, source);
        
        results.imported += batchResults.imported;
        results.failed += batchResults.failed;
        results.errors.push(...batchResults.errors);

      } catch (error) {
        console.error('Batch import error:', error);
        results.failed += batch.length;
        results.errors.push(`Batch failed: ${error.message}`);
      }
    }

    // Log import activity
    await logImportActivity({
      userId,
      source,
      sourceName,
      totalItems: results.total,
      importedItems: results.imported,
      failedItems: results.failed,
      timestamp: new Date()
    });

    res.json({
      success: true,
      results,
      message: `Successfully imported ${results.imported} out of ${results.total} items`
    });

  } catch (error) {
    console.error('Item import error:', error);
    res.status(500).json({ error: 'Failed to import items' });
  }
});

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

async function processItemBatch(items, userId, source) {
  const results = {
    imported: 0,
    failed: 0,
    errors: []
  };

  for (const item of items) {
    try {
      // Add default values for required fields
      const processedItem = {
        ...item,
        status: item.status || 'active',
        product_type: item.product_type || 'Goods',
        tax_rate: item.tax_rate || 20,
        stock_committed: item.stock_committed || 0,
        stock_available: item.stock_available || (item.stock_total || 0),
        minimum_order_qty: item.minimum_order_qty || 1,
        variable_pricing: item.variable_pricing || false,
        tax_exempt: item.tax_exempt || false,
        created_by: userId,
        created_at: new Date(),
        import_source: source
      };

      // Here you would save to your database
      // await saveItem(processedItem);
      
      results.imported++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import ${item.item_name}: ${error.message}`);
    }
  }

  return results;
}

async function logImportActivity(activity) {
  try {
    // Here you would save to your database
    console.log('Import activity logged:', activity);
  } catch (error) {
    console.error('Failed to log import activity:', error);
  }
}

// ============================================================
// TEMPLATE DOWNLOAD
// ============================================================

router.get('/templates/csv', (req, res) => {
  try {
    const csvTemplate = `item_name,item_description,vendor_name,category_name,sku,ean,part_no,purchase_price,retail_price,stock_total,reorder_level,product_type,tax_rate,status
"Sample Product","This is a sample product description","Sample Vendor","Electronics","SKU001","1234567890123","PART001",10.50,25.99,100,10,"Goods",20,"active"
"Another Product","Another product description","Another Vendor","Clothing","SKU002","1234567890124","PART002",15.00,35.00,50,5,"Goods",20,"active"`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

module.exports = router; 