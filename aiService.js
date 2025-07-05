// server/aiService.js
// AI-powered services for intelligent data processing

const natural = require('natural');
const stringSimilarity = require('string-similarity');

class AIService {
  constructor() {
    // Initialize natural language processing
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
  }

  // ============================================================
  // COLUMN ANALYSIS FOR CSV IMPORTS
  // ============================================================

  async analyzeCSVColumns(request) {
    const startTime = Date.now();
    const { headers, sampleData, targetFields, userId } = request;

    try {
      // Perform intelligent column analysis
      const analysis = this.performColumnAnalysis(headers, sampleData, targetFields);
      
      // Log analysis for improvement
      await this.logColumnAnalysis({
        headers,
        mappings: analysis.mappings,
        confidence: analysis.confidence,
        userId,
        timestamp: new Date()
      });

      return {
        ...analysis,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Column analysis failed:', error);
      throw new Error('Failed to analyze CSV columns');
    }
  }

  performColumnAnalysis(headers, sampleData, targetFields) {
    const mappings = {};
    let totalConfidence = 0;
    const suggestions = [];

    // Enhanced pattern matching with semantic analysis
    headers.forEach(header => {
      const analysis = this.analyzeColumnHeader(header, sampleData, targetFields);
      mappings[header] = analysis.mappedField;
      totalConfidence += analysis.confidence;

      if (analysis.suggestions.length > 0) {
        suggestions.push(...analysis.suggestions);
      }
    });

    const averageConfidence = totalConfidence / headers.length;

    return {
      mappings,
      confidence: averageConfidence,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }

  analyzeColumnHeader(header, sampleData, targetFields) {
    const lowerHeader = header.toLowerCase().trim();
    const headerWords = this.tokenizer.tokenize(lowerHeader) || [];
    const suggestions = [];

    // Analyze sample data patterns
    const dataPatterns = this.analyzeDataPatterns(header, sampleData);
    
    // Enhanced field mapping with semantic analysis
    const fieldMapping = this.getFieldMapping(lowerHeader, headerWords, dataPatterns);
    
    // Confidence calculation based on multiple factors
    const confidence = this.calculateConfidence(lowerHeader, fieldMapping, dataPatterns);

    // Generate suggestions for improvement
    if (confidence < 0.7) {
      suggestions.push(`Consider renaming "${header}" to a more standard field name`);
    }

    if (dataPatterns.hasSpecialChars) {
      suggestions.push(`Column "${header}" contains special characters that might need cleaning`);
    }

    if (dataPatterns.isEmptyValues > 0.3) {
      suggestions.push(`Column "${header}" has many empty values (${Math.round(dataPatterns.isEmptyValues * 100)}%)`);
    }

    return {
      mappedField: fieldMapping,
      confidence,
      suggestions
    };
  }

  getFieldMapping(header, words, patterns) {
    // Priority-based field mapping with semantic similarity
    const mappings = [
      // Product information
      { patterns: ['name', 'title', 'product', 'item'], field: 'item_name' },
      { patterns: ['description', 'desc', 'details', 'summary'], field: 'item_description' },
      { patterns: ['vendor', 'brand', 'manufacturer', 'supplier', 'company'], field: 'vendor_name' },
      { patterns: ['category', 'type', 'group', 'class'], field: 'category_name' },
      
      // Identifiers
      { patterns: ['sku', 'product_code', 'code', 'item_code'], field: 'sku' },
      { patterns: ['ean', 'barcode', 'upc', 'gtin'], field: 'ean' },
      { patterns: ['part', 'model', 'part_number', 'model_number'], field: 'part_no' },
      
      // Pricing
      { patterns: ['cost', 'purchase', 'buy', 'wholesale'], field: 'purchase_price' },
      { patterns: ['price', 'retail', 'selling', 'sale'], field: 'retail_price' },
      { patterns: ['tax', 'vat', 'tax_rate', 'tax_percentage'], field: 'tax_rate' },
      
      // Inventory
      { patterns: ['stock', 'quantity', 'inventory', 'qty', 'available'], field: 'stock_total' },
      { patterns: ['reorder', 'min', 'minimum', 'reorder_level'], field: 'reorder_level' },
      { patterns: ['committed', 'reserved', 'allocated'], field: 'stock_committed' },
      
      // Product details
      { patterns: ['weight', 'mass'], field: 'weight' },
      { patterns: ['dimensions', 'size', 'length', 'width', 'height'], field: 'dimensions' },
      { patterns: ['unit', 'uom', 'measure'], field: 'unit' },
      
      // Status and flags
      { patterns: ['status', 'active', 'enabled'], field: 'status' },
      { patterns: ['type', 'product_type', 'item_type'], field: 'product_type' }
    ];

    // Find the best match using semantic similarity
    let bestMatch = '';
    let bestScore = 0;

    for (const mapping of mappings) {
      for (const pattern of mapping.patterns) {
        // Calculate similarity between header and pattern
        const similarity = stringSimilarity.compareTwoStrings(header, pattern);
        
        if (similarity > bestScore && similarity > 0.3) {
          bestScore = similarity;
          bestMatch = mapping.field;
        }

        // Also check word-level similarity
        for (const word of words) {
          const wordSimilarity = stringSimilarity.compareTwoStrings(word, pattern);
          if (wordSimilarity > bestScore && wordSimilarity > 0.6) {
            bestScore = wordSimilarity;
            bestMatch = mapping.field;
          }
        }
      }
    }

    // Check for exact matches in target fields
    if (targetFields.includes(header)) {
      return header;
    }

    return bestMatch;
  }

  analyzeDataPatterns(header, sampleData) {
    const values = sampleData.map(row => row[header]).filter(val => val !== undefined && val !== null);
    
    if (values.length === 0) {
      return {
        dataType: 'empty',
        hasSpecialChars: false,
        isEmptyValues: 1,
        isNumeric: false,
        isDate: false,
        uniqueValues: 0
      };
    }

    const nonEmptyValues = values.filter(val => val !== '' && val !== ' ');
    const isEmptyValues = (values.length - nonEmptyValues.length) / values.length;
    
    // Check for numeric patterns
    const numericValues = nonEmptyValues.filter(val => !isNaN(Number(val)) && val !== '');
    const isNumeric = numericValues.length / nonEmptyValues.length > 0.8;
    
    // Check for date patterns
    const dateValues = nonEmptyValues.filter(val => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.length > 8;
    });
    const isDate = dateValues.length / nonEmptyValues.length > 0.5;
    
    // Check for special characters
    const hasSpecialChars = nonEmptyValues.some(val => 
      /[^a-zA-Z0-9\s\-_\.]/.test(String(val))
    );
    
    // Count unique values
    const uniqueValues = new Set(nonEmptyValues).size;

    return {
      dataType: isNumeric ? 'numeric' : isDate ? 'date' : 'text',
      hasSpecialChars,
      isEmptyValues,
      isNumeric,
      isDate,
      uniqueValues,
      totalValues: values.length
    };
  }

  calculateConfidence(header, mappedField, patterns) {
    let confidence = 0;

    // Base confidence from mapping success
    if (mappedField) {
      confidence += 0.6;
    }

    // Data quality confidence
    if (patterns.isEmptyValues < 0.2) {
      confidence += 0.2;
    }

    // Header clarity confidence
    if (header.length >= 3 && header.length <= 50) {
      confidence += 0.1;
    }

    // No special characters confidence
    if (!patterns.hasSpecialChars) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  // ============================================================
  // DATA QUALITY ANALYSIS
  // ============================================================

  async analyzeDataQuality(data, fields) {
    const insights = [];

    // Analyze each field
    for (const field of fields) {
      const fieldInsights = this.analyzeFieldQuality(data, field);
      insights.push(...fieldInsights);
    }

    // Analyze overall data patterns
    const overallInsights = this.analyzeOverallDataQuality(data, fields);
    insights.push(...overallInsights);

    return insights;
  }

  analyzeFieldQuality(data, field) {
    const insights = [];
    const values = data.map(row => row[field]).filter(val => val !== undefined && val !== null);
    
    if (values.length === 0) {
      insights.push({
        id: `empty_field_${field}`,
        type: 'data_quality',
        title: `Empty Field: ${field}`,
        description: `The field "${field}" contains no data. Consider removing or populating this field.`,
        severity: 'high',
        data: { field, emptyCount: values.length, totalCount: data.length },
        createdAt: new Date()
      });
      return insights;
    }

    const nonEmptyValues = values.filter(val => val !== '' && val !== ' ');
    const emptyPercentage = (values.length - nonEmptyValues.length) / values.length;

    // Check for high empty percentage
    if (emptyPercentage > 0.3) {
      insights.push({
        id: `high_empty_${field}`,
        type: 'data_quality',
        title: `High Empty Values: ${field}`,
        description: `${Math.round(emptyPercentage * 100)}% of values in "${field}" are empty.`,
        severity: emptyPercentage > 0.7 ? 'high' : 'medium',
        data: { field, emptyPercentage, emptyCount: values.length - nonEmptyValues.length },
        createdAt: new Date()
      });
    }

    // Check for duplicate values
    const uniqueValues = new Set(nonEmptyValues);
    const duplicatePercentage = (nonEmptyValues.length - uniqueValues.size) / nonEmptyValues.length;
    
    if (duplicatePercentage > 0.8) {
      insights.push({
        id: `high_duplicates_${field}`,
        type: 'data_quality',
        title: `High Duplicate Values: ${field}`,
        description: `${Math.round(duplicatePercentage * 100)}% of values in "${field}" are duplicates.`,
        severity: 'medium',
        data: { field, duplicatePercentage, uniqueCount: uniqueValues.size },
        createdAt: new Date()
      });
    }

    return insights;
  }

  analyzeOverallDataQuality(data, fields) {
    const insights = [];

    // Check data size
    if (data.length < 10) {
      insights.push({
        id: 'small_dataset',
        type: 'data_quality',
        title: 'Small Dataset',
        description: `Only ${data.length} records found. Consider importing more data for better analysis.`,
        severity: 'low',
        data: { recordCount: data.length },
        createdAt: new Date()
      });
    }

    // Check for required fields
    const requiredFields = ['item_name', 'sku', 'retail_price'];
    const missingRequired = requiredFields.filter(field => 
      !fields.includes(field) || data.every(row => !row[field])
    );

    if (missingRequired.length > 0) {
      insights.push({
        id: 'missing_required_fields',
        type: 'data_quality',
        title: 'Missing Required Fields',
        description: `Missing required fields: ${missingRequired.join(', ')}`,
        severity: 'high',
        data: { missingFields: missingRequired },
        createdAt: new Date()
      });
    }

    return insights;
  }

  // ============================================================
  // TREND ANALYSIS
  // ============================================================

  async analyzeTrends(data, timeField, valueField) {
    const insights = [];

    // Sort data by time
    const sortedData = data
      .filter(row => row[timeField] && row[valueField])
      .sort((a, b) => new Date(a[timeField]).getTime() - new Date(b[timeField]).getTime());

    if (sortedData.length < 3) {
      return insights;
    }

    // Calculate trends
    const values = sortedData.map(row => Number(row[valueField]));
    const trend = this.calculateTrend(values);

    if (Math.abs(trend) > 0.1) {
      insights.push({
        id: 'trend_detected',
        type: 'trend_analysis',
        title: trend > 0 ? 'Upward Trend Detected' : 'Downward Trend Detected',
        description: `A ${trend > 0 ? 'positive' : 'negative'} trend of ${Math.abs(trend * 100).toFixed(1)}% per period was detected in ${valueField}.`,
        severity: Math.abs(trend) > 0.3 ? 'high' : 'medium',
        data: { trend, valueField, timeField, dataPoints: sortedData.length },
        createdAt: new Date()
      });
    }

    return insights;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const average = sumY / n;

    return average !== 0 ? slope / average : 0;
  }

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  async logColumnAnalysis(analysis) {
    try {
      // This would typically save to a database
      console.log('Column analysis logged:', analysis);
    } catch (error) {
      console.error('Failed to log column analysis:', error);
    }
  }

  // ============================================================
  // PUBLIC API METHODS
  // ============================================================

  async getInsights(userId, limit = 10) {
    // This would typically fetch from database
    return [];
  }

  async clearInsights(userId) {
    // This would typically clear insights from database
    console.log('Clearing insights for user:', userId);
  }
}

module.exports = AIService; 