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
  
  // Only the 5 collections you want to analyze
  const knownCollections = [
    'customers',
    'invoices',
    'items_data',
    'sales_agents',
    'sales_orders'
  ];
  
  // Process each collection
  for (const collectionName of knownCollections) {
    try {
      console.log(`📁 Analyzing collection: ${collectionName}`);
      
      // Get a sample of documents (increase limit for better structure understanding)
      const snapshot = await db.collection(collectionName).limit(10).get();
      
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
      
      // Analyze document structure from multiple documents to catch all fields
      const fieldStructure = {};
      const allFieldsMap = new Map();
      
      // Analyze all sample documents to get complete field structure
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        collectAllFields(docData, allFieldsMap);
      }
      
      // Convert collected fields to structure
      for (const [fieldPath, value] of allFieldsMap.entries()) {
        analyzeFieldValue(fieldPath, value, fieldStructure);
      }
      
      // Count total documents
      const countSnapshot = await db.collection(collectionName).count().get();
      const documentCount = countSnapshot.data().count;
      
      // Get the first document as sample
      const sampleDoc = snapshot.docs[0].data();
      
      collectionStructure[collectionName] = {
        exists: true,
        documentCount: documentCount,
        fields: fieldStructure,
        sampleDocumentId: snapshot.docs[0].id,
        sampleData: sanitizeSampleData(sampleDoc)
      };
      
      console.log(`   ✅ Found ${documentCount} documents`);
      console.log(`   📊 Analyzed ${Object.keys(fieldStructure).length} unique field paths`);
      
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
 * Collect all fields from multiple documents to ensure we capture the complete structure
 */
function collectAllFields(obj, fieldMap, prefix = '') {
  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    
    // Store the field value if we haven't seen it before or if it's not null/undefined
    if (!fieldMap.has(fieldPath) || (fieldMap.get(fieldPath) === null && value !== null)) {
      fieldMap.set(fieldPath, value);
    }
    
    // Recursively collect nested fields
    if (value !== null && value !== undefined) {
      if (Array.isArray(value) && value.length > 0) {
        // For arrays, collect fields from all objects in the array
        for (const item of value) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            collectAllFields(item, fieldMap, `${fieldPath}[]`);
          }
        }
      } else if (typeof value === 'object' && !(value instanceof admin.firestore.Timestamp) && !(value instanceof admin.firestore.GeoPoint)) {
        collectAllFields(value, fieldMap, fieldPath);
      }
    }
  }
}

/**
 * Analyze a field value and determine its type and structure
 */
function analyzeFieldValue(fieldPath, value, structure) {
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
    structure[fieldPath] = analyzeArray(value);
  } else if (typeof value === 'object') {
    structure[fieldPath] = { 
      type: 'map',
      fieldCount: Object.keys(value).length,
      mapFields: Object.keys(value)
    };
  } else {
    structure[fieldPath] = { 
      type: typeof value,
      example: typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value
    };
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
      sanitized[key] = value.slice(0, 3).map(item => {
        if (typeof item === 'object' && item !== null && !(item instanceof admin.firestore.Timestamp)) {
          return sanitizeSampleData(item);
        }
        return sanitizeValue(item);
      });
      if (value.length > 3) {
        sanitized[key].push(`... and ${value.length - 3} more items`);
      }
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
 * Generate a detailed structure report
 */
function generateDetailedReport(structure) {
  let report = '# Firebase Collection Structure Report\n\n';
  report += `Generated on: ${new Date().toISOString()}\n\n`;
  report += '## Collections Analyzed\n\n';
  
  for (const [collectionName, collectionData] of Object.entries(structure)) {
    report += `### ${collectionName}\n\n`;
    
    if (!collectionData.exists) {
      report += '**Status:** Collection does not exist or is empty\n\n';
      continue;
    }
    
    report += `**Document Count:** ${collectionData.documentCount}\n`;
    report += `**Sample Document ID:** ${collectionData.sampleDocumentId}\n\n`;
    report += '**Complete Field Structure:**\n\n';
    
    // Create a hierarchical view of fields
    const fields = collectionData.fields;
    const rootFields = {};
    
    // Group fields by root
    for (const [fieldPath, fieldInfo] of Object.entries(fields)) {
      const parts = fieldPath.split('.');
      const root = parts[0];
      
      if (!rootFields[root]) {
        rootFields[root] = [];
      }
      
      rootFields[root].push({ path: fieldPath, info: fieldInfo, parts });
    }
    
    // Display fields hierarchically
    for (const [root, fieldList] of Object.entries(rootFields)) {
      // Find the root field info
      const rootField = fieldList.find(f => f.parts.length === 1);
      
      if (rootField) {
        report += `- **${root}** (${rootField.info.type})`;
        
        if (rootField.info.type === 'map') {
          report += ` - ${rootField.info.fieldCount} fields: ${rootField.info.mapFields.join(', ')}`;
        } else if (rootField.info.type === 'array') {
          report += ` - ${rootField.info.length} items`;
          if (rootField.info.itemTypes && Array.isArray(rootField.info.itemTypes)) {
            const types = rootField.info.itemTypes.map(t => `${t.type} (${t.count})`).join(', ');
            report += ` - Types: ${types}`;
          }
        } else if (rootField.info.example !== undefined) {
          report += ` - Example: \`${JSON.stringify(rootField.info.example)}\``;
        }
        report += '\n';
        
        // Display nested fields
        const nestedFields = fieldList.filter(f => f.parts.length > 1).sort((a, b) => a.path.localeCompare(b.path));
        
        for (const nested of nestedFields) {
          const indent = '  '.repeat(nested.parts.length - 1);
          const fieldName = nested.path;
          
          report += `${indent}- **${fieldName}** (${nested.info.type})`;
          
          if (nested.info.type === 'map') {
            report += ` - ${nested.info.fieldCount} fields`;
          } else if (nested.info.type === 'array') {
            report += ` - ${nested.info.length} items`;
          } else if (nested.info.example !== undefined) {
            report += ` - Example: \`${JSON.stringify(nested.info.example)}\``;
          }
          report += '\n';
        }
      }
    }
    
    report += '\n**Sample Data:**\n```json\n';
    report += JSON.stringify(collectionData.sampleData, null, 2);
    report += '\n```\n\n---\n\n';
  }
  
  return report;
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
    
    // Save JSON structure
    const jsonPath = path.join(process.cwd(), `firebase-structure-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(structure, null, 2));
    console.log(`\n✅ JSON structure saved to: ${jsonPath}`);
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), `firebase-structure-${timestamp}.md`);
    fs.writeFileSync(reportPath, generateDetailedReport(structure));
    console.log(`✅ Detailed report saved to: ${reportPath}`);
    
    // Display summary
    console.log('\n📊 Collection Summary:');
    console.log('====================');
    
    Object.entries(structure).forEach(([collection, data]) => {
      if (data.exists) {
        console.log(`✅ ${collection}: ${data.documentCount} documents, ${Object.keys(data.fields).length} field paths`);
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