// extractFirebaseCollectionStructure.js
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin
import './src/config/firebase.js'; // Adjust path as needed

const db = admin.firestore();

/**
 * Extract Firebase Collection Structure
 * This script will analyze your Firestore collections and extract their structure
 */
async function extractCollectionStructure() {
  console.log('🔍 Starting Firebase Collection Structure Extraction...\n');
  
  const collectionStructure = {};
  
  // List of known collections from your project
  const knownCollections = [
    // User collections
    'users',
    'brand_managers',
    'sales_agents',
    'customers',
    'customer_data',
    
    // Item/Product collections
    'items',
    'items_enhanced',
    'products',
    'vendors',
    'item_categories',
    
    // Order/Sales collections
    'salesorders',
    'sales_orders',
    'sales_transactions',
    'invoices',
    'invoices_enhanced',
    'purchase_orders',
    
    // Inventory collections
    'warehouses',
    'stock_transactions',
    'stock_alerts',
    'inventory_transactions',
    
    // Supporting collections
    'shipping_methods',
    'couriers',
    'vendor_contacts',
    'branches',
    'packing_stations',
    'packing_jobs',
    
    // System collections
    'sync_metadata',
    'sync_queue',
    'migration_logs',
    'data_adapters'
  ];
  
  // Process each collection
  for (const collectionName of knownCollections) {
    try {
      console.log(`📁 Analyzing collection: ${collectionName}`);
      
      let snapshot;
      let sampleDoc;
      
      // Special handling for users collection - use specific document
      if (collectionName === 'users') {
        const specificDoc = await db.collection(collectionName).doc('kePM8QtWXoO24zlMg3qSidGOen02').get();
        if (specificDoc.exists) {
          console.log(`   📌 Using specific document: kePM8QtWXoO24zlMg3qSidGOen02`);
          snapshot = {
            empty: false,
            docs: [specificDoc]
          };
        } else {
          console.log(`   ⚠️  Specific document not found, falling back to sample`);
          snapshot = await db.collection(collectionName).limit(10).get();
        }
      } else {
        // Get a sample of documents for other collections
        snapshot = await db.collection(collectionName).limit(10).get();
      }
      
      if (snapshot.empty) {
        console.log(`   ⚠️  Collection is empty or doesn't exist`);
        collectionStructure[collectionName] = {
          exists: false,
          documentCount: 0,
          fields: {},
          sampleData: null
        };
        continue;
      }
      
      // Analyze document structure
      const fieldStructure = {};
      sampleDoc = snapshot.docs[0].data();
      
      // Extract field types and structure with enhanced array/map analysis
      analyzeFields(sampleDoc, fieldStructure);
      
      // Count total documents (be careful with large collections)
      const countSnapshot = await db.collection(collectionName).count().get();
      const documentCount = countSnapshot.data().count;
      
      collectionStructure[collectionName] = {
        exists: true,
        documentCount: documentCount,
        fields: fieldStructure,
        sampleDocumentId: snapshot.docs[0].id,
        sampleData: sanitizeSampleData(sampleDoc),
        // Add specific note for users collection
        ...(collectionName === 'users' && snapshot.docs[0].id === 'kePM8QtWXoO24zlMg3qSidGOen02' 
          ? { note: 'Using specific document ID: kePM8QtWXoO24zlMg3qSidGOen02' } 
          : {})
      };
      
      console.log(`   ✅ Found ${documentCount} documents`);
      
    } catch (error) {
      console.error(`   ❌ Error analyzing ${collectionName}:`, error.message);
      collectionStructure[collectionName] = {
        exists: false,
        error: error.message
      };
    }
  }
  
  return collectionStructure;
}

/**
 * Analyze field types recursively with enhanced array and map analysis
 */
function analyzeFields(obj, structure, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    if (value === null) {
      structure[fieldPath] = { type: 'null' };
    } else if (value === undefined) {
      structure[fieldPath] = { type: 'undefined' };
    } else if (value instanceof admin.firestore.Timestamp) {
      structure[fieldPath] = { 
        type: 'timestamp',
        example: value.toDate().toISOString()
      };
    } else if (value instanceof admin.firestore.GeoPoint) {
      structure[fieldPath] = { 
        type: 'geopoint',
        example: { latitude: value.latitude, longitude: value.longitude }
      };
    } else if (Array.isArray(value)) {
      // Enhanced array analysis
      const arrayInfo = analyzeArray(value);
      structure[fieldPath] = arrayInfo;
      
      // If array contains objects, analyze their complete structure
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        // Collect all unique fields from all objects in the array
        const allFields = new Map();
        
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            for (const [objKey, objValue] of Object.entries(item)) {
              if (!allFields.has(objKey)) {
                allFields.set(objKey, objValue);
              }
            }
          }
        }
        
        // Analyze the combined structure
        const arrayObjectStructure = {};
        for (const [objKey, objValue] of allFields.entries()) {
          analyzeFields({ [objKey]: objValue }, arrayObjectStructure, `${fieldPath}[]`);
        }
        
        // Store the analyzed structure
        structure[fieldPath].objectFields = arrayObjectStructure;
      }
    } else if (typeof value === 'object') {
      // Mark as map/object
      structure[fieldPath] = { 
        type: 'map',
        fieldCount: Object.keys(value).length,
        mapFields: Object.keys(value) // Store the actual field names
      };
      // Analyze nested fields
      analyzeFields(value, structure, fieldPath);
    } else {
      structure[fieldPath] = { 
        type: typeof value,
        example: typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value
      };
    }
  }
}

/**
 * Analyze array contents in detail
 */
function analyzeArray(arr) {
  const result = {
    type: 'array',
    length: arr.length,
    empty: arr.length === 0
  };
  
  if (arr.length === 0) {
    result.itemTypes = 'empty array';
    return result;
  }
  
  // Analyze all unique types in the array
  const typeMap = new Map();
  const examples = [];
  
  for (const item of arr) {
    let itemType;
    
    if (item === null) {
      itemType = 'null';
    } else if (item === undefined) {
      itemType = 'undefined';
    } else if (item instanceof admin.firestore.Timestamp) {
      itemType = 'timestamp';
    } else if (item instanceof admin.firestore.GeoPoint) {
      itemType = 'geopoint';
    } else if (Array.isArray(item)) {
      itemType = 'array';
    } else if (typeof item === 'object') {
      itemType = 'object';
    } else {
      itemType = typeof item;
    }
    
    if (!typeMap.has(itemType)) {
      typeMap.set(itemType, 0);
      // Store example for each type
      if (examples.length < 3) {
        examples.push({
          type: itemType,
          value: sanitizeValue(item)
        });
      }
    }
    typeMap.set(itemType, typeMap.get(itemType) + 1);
  }
  
  // Convert type map to array of type info
  const itemTypes = Array.from(typeMap.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: ((count / arr.length) * 100).toFixed(1) + '%'
  }));
  
  result.itemTypes = itemTypes;
  result.uniqueTypes = itemTypes.length;
  result.examples = examples;
  
  return result;
}

/**
 * Sanitize a single value for display
 */
function sanitizeValue(value) {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  
  if (value instanceof admin.firestore.GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  
  if (typeof value === 'string') {
    // Check for sensitive data
    if (value.includes('@') && value.includes('.')) {
      return value.replace(/^(.{3}).*@/, '$1***@');
    }
    if (value.match(/^\+?\d{10,}$/)) {
      return value.replace(/\d{4}$/, '****');
    }
    return value.length > 50 ? value.substring(0, 50) + '...' : value;
  }
  
  if (Array.isArray(value)) {
    return `[Array with ${value.length} items]`;
  }
  
  if (typeof value === 'object') {
    return `{Object with ${Object.keys(value).length} keys}`;
  }
  
  return value;
}

/**
 * Sanitize sample data to remove sensitive information
 */
function sanitizeSampleData(data) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip sensitive fields
    if (['password', 'token', 'secret', 'api_key', 'serviceAccountKey'].some(
      sensitive => key.toLowerCase().includes(sensitive)
    )) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Sanitize email addresses
    if (key.toLowerCase().includes('email') && typeof value === 'string') {
      sanitized[key] = value.replace(/^(.{3}).*@/, '$1***@');
      continue;
    }
    
    // Sanitize phone numbers
    if (key.toLowerCase().includes('phone') && typeof value === 'string') {
      sanitized[key] = value.replace(/\d{4}$/, '****');
      continue;
    }
    
    // Handle arrays with detailed sanitization
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'object' && item !== null && !(item instanceof admin.firestore.Timestamp)) {
          return sanitizeSampleData(item);
        }
        return sanitizeValue(item);
      });
      continue;
    }
    
    // Handle nested objects
    if (typeof value === 'object' && value !== null && !(value instanceof admin.firestore.Timestamp)) {
      sanitized[key] = sanitizeSampleData(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }
  
  return sanitized;
}

/**
 * Generate a markdown report of the collection structure
 */
function generateMarkdownReport(structure) {
  let markdown = '# Firebase Collection Structure\n\n';
  markdown += `Generated on: ${new Date().toISOString()}\n\n`;
  markdown += '## Table of Contents\n\n';
  
  // Generate TOC
  Object.keys(structure).forEach(collection => {
    if (structure[collection].exists) {
      markdown += `- [${collection}](#${collection.replace(/_/g, '-')})\n`;
    }
  });
  
  markdown += '\n## Collections\n\n';
  
  // Generate detailed structure for each collection
  for (const [collectionName, collectionData] of Object.entries(structure)) {
    markdown += `### ${collectionName}\n\n`;
    
    if (!collectionData.exists) {
      markdown += '**Status:** Collection does not exist or is empty\n\n';
      continue;
    }
    
    markdown += `**Document Count:** ${collectionData.documentCount}\n`;
    if (collectionData.note) {
      markdown += `**Note:** ${collectionData.note}\n`;
    }
    markdown += '\n**Field Structure:**\n\n';
    markdown += '| Field Path | Type | Details | Example |\n';
    markdown += '|------------|------|---------|----------|\n';
    
    // Sort fields to ensure nested fields appear after their parents
    const sortedFields = Object.entries(collectionData.fields).sort(([a], [b]) => a.localeCompare(b));
    
    for (const [fieldPath, fieldInfo] of sortedFields) {
      // Skip nested fields that will be shown under their parent
      if (fieldInfo.type === 'map' && !fieldPath.includes('[]')) {
        // For maps, show the map field with its field count and field names
        const fieldNames = fieldInfo.mapFields ? fieldInfo.mapFields.join(', ') : '';
        markdown += `| **${fieldPath}** | **map** | **${fieldInfo.fieldCount} fields:** ${fieldNames} | - |\n`;
        continue;
      }
      
      if (fieldInfo.type === 'array') {
        // For arrays, show array info and then its nested structure
        let details = `Length: ${fieldInfo.length}`;
        if (fieldInfo.itemTypes && Array.isArray(fieldInfo.itemTypes)) {
          const types = fieldInfo.itemTypes.map(t => `${t.type} (${t.percentage})`).join(', ');
          details += `<br>Types: ${types}`;
        }
        
        markdown += `| **${fieldPath}** | **array** | **${details}** | - |\n`;
        
        // If array contains objects, show their fields
        if (fieldInfo.objectFields) {
          const objectFields = Object.entries(fieldInfo.objectFields).sort(([a], [b]) => a.localeCompare(b));
          for (const [objFieldPath, objFieldInfo] of objectFields) {
            const indent = '&nbsp;&nbsp;&nbsp;&nbsp;';
            const displayPath = objFieldPath.replace(`${fieldPath}[]`, `${indent}└─`);
            const example = objFieldInfo.example !== undefined 
              ? `\`${JSON.stringify(objFieldInfo.example)}\`` 
              : '-';
            markdown += `| ${displayPath} | ${objFieldInfo.type} | - | ${example} |\n`;
          }
        }
        continue;
      }
      
      // For regular fields and nested map fields
      const indent = fieldPath.split('.').length > 1 ? '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(fieldPath.split('.').length - 1) + '└─ ' : '';
      const displayField = fieldPath.includes('.') ? indent + fieldPath.split('.').pop() : fieldPath;
      
      const example = fieldInfo.example !== undefined 
        ? `\`${JSON.stringify(fieldInfo.example)}\`` 
        : '-';
      
      markdown += `| ${displayField} | ${fieldInfo.type} | - | ${example} |\n`;
    }
    
    markdown += '\n';
  }
  
  return markdown;
}

/**
 * Build a hierarchical field tree from flat field paths
 */
function buildFieldTree(fields) {
  const tree = {};
  
  // Sort fields to process parents before children
  const sortedPaths = Object.keys(fields).sort((a, b) => {
    const aDepth = a.split('.').length;
    const bDepth = b.split('.').length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.localeCompare(b);
  });
  
  for (const fieldPath of sortedPaths) {
    const fieldInfo = fields[fieldPath];
    const parts = fieldPath.split('.');
    let current = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        // This is the leaf node
        current[part] = {
          ...fieldInfo,
          // Include nested array object fields if present
          ...(fieldInfo.objectFields ? { fields: buildFieldTree(fieldInfo.objectFields) } : {})
        };
      } else {
        // This is an intermediate node
        if (!current[part]) {
          current[part] = { type: 'object', fields: {} };
        } else if (!current[part].fields) {
          // If this was previously a leaf node, convert it to an object with fields
          current[part] = { ...current[part], fields: {} };
        }
        current = current[part].fields || {};
      }
    }
  }
  
  return tree;
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Extract collection structure
    const structure = await extractCollectionStructure();
    
    // Generate outputs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON structure - simplified without the problematic buildFieldTree
    const jsonPath = path.join(process.cwd(), `firebase-structure-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(structure, null, 2));
    console.log(`\n✅ JSON structure saved to: ${jsonPath}`);
    
    // Save Markdown report
    const markdownPath = path.join(process.cwd(), `firebase-structure-${timestamp}.md`);
    fs.writeFileSync(markdownPath, generateMarkdownReport(structure));
    console.log(`✅ Markdown report saved to: ${markdownPath}`);
    
    // Generate a simple visual representation
    console.log('\n📊 Collection Summary:');
    console.log('====================');
    
    Object.entries(structure).forEach(([collection, data]) => {
      if (data.exists) {
        console.log(`✅ ${collection}: ${data.documentCount} documents`);
        if (data.note) {
          console.log(`   📌 ${data.note}`);
        }
      } else {
        console.log(`❌ ${collection}: Empty or doesn't exist`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error extracting Firebase structure:', error);
    process.exit(1);
  }
}

// Run the extraction
main().then(() => {
  console.log('\n✨ Firebase structure extraction complete!');
  process.exit(0);
});