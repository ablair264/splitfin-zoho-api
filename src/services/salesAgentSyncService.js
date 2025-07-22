// src/services/salesAgentSyncService.js
// Service to sync and calculate sales agent metrics

import admin from 'firebase-admin';

class SalesAgentSyncService {
  constructor() {
    this.dateRanges = [
      'this_week',
      'last_week',
      'this_month',
      'last_month',
      'this_quarter',
      'last_quarter',
      'this_year',
      'last_year'
    ];
  }

  /**
   * Get date range for a specific period
   */
  getDateRange(rangeName) {
    const now = new Date();
    let startDate, endDate;

    switch (rangeName) {
      case 'this_week': {
        const dayOfWeek = now.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_week': {
        const dayOfWeek = now.getDay();
        const daysToLastMonday = dayOfWeek === 0 ? 13 : dayOfWeek + 6;
        startDate = new Date(now);
        startDate.setDate(now.getDate() - daysToLastMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_month': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_quarter': {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter - 1;
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3;
        startDate = new Date(lastQuarterYear, lastQuarterMonth, 1);
        endDate = new Date(lastQuarterYear, lastQuarterMonth + 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'this_year': {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      case 'last_year': {
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      }
      default:
        throw new Error(`Unknown date range: ${rangeName}`);
    }

    return { startDate, endDate };
  }

  /**
   * Calculate metrics for a sales agent for a specific date range
   */
  async calculateMetricsForAgent(salesAgentId, dateRange) {
    const db = admin.firestore();
    const { startDate, endDate } = this.getDateRange(dateRange);
    
    try {
      // Get all orders for this agent in the date range
      const ordersSnapshot = await db
        .collection('sales_agents')
        .doc(salesAgentId)
        .collection('customers_orders')
        .get();

      // Filter orders by date range
      const ordersInRange = [];
      let totalOrdersCount = 0;
      let totalOrdersValue = 0;
      let ordersShippedCount = 0;
      
      ordersSnapshot.forEach(doc => {
        const order = doc.data();
        const orderDate = order.order_date || order.date || order.created_time;
        
        if (orderDate) {
          const orderDateObj = new Date(orderDate);
          if (orderDateObj >= startDate && orderDateObj <= endDate) {
            ordersInRange.push({
              ...order,
              id: doc.id
            });
            
            totalOrdersCount++;
            totalOrdersValue += parseFloat(order.total || 0);
            
            if (order.shipped_status === 'shipped') {
              ordersShippedCount++;
            }
          }
        }
      });

      // Get new customers for this period
      const customersSnapshot = await db
        .collection('sales_agents')
        .doc(salesAgentId)
        .collection('assigned_customers')
        .get();
      
      let newCustomersCount = 0;
      customersSnapshot.forEach(doc => {
        const customer = doc.data();
        const createdDate = customer.created_date || customer.created_time;
        
        if (createdDate) {
          const createdDateObj = new Date(createdDate);
          if (createdDateObj >= startDate && createdDateObj <= endDate) {
            newCustomersCount++;
          }
        }
      });

      // Calculate top 5 items
      const itemCounts = new Map();
      
      // For each order, get the line items from sales_orders collection
      for (const order of ordersInRange) {
        if (order.salesorder_id) {
          const salesOrderDoc = await db
            .collection('sales_orders')
            .doc(order.salesorder_id)
            .get();
          
          if (salesOrderDoc.exists) {
            const lineItemsSnapshot = await salesOrderDoc.ref
              .collection('order_line_items')
              .get();
            
            lineItemsSnapshot.forEach(lineItemDoc => {
              const item = lineItemDoc.data();
              const itemId = item.item_id;
              const quantity = parseInt(item.quantity || 0);
              
              if (itemId) {
                const existing = itemCounts.get(itemId) || {
                  item_id: itemId,
                  item_name: item.name || item.item_name || 'Unknown',
                  sku: item.sku || '',
                  quantity: 0,
                  revenue: 0
                };
                
                existing.quantity += quantity;
                existing.revenue += parseFloat(item.item_total || item.total || 0);
                itemCounts.set(itemId, existing);
              }
            });
          }
        }
      }

      // Get top 5 items by quantity
      const top5Items = Array.from(itemCounts.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Calculate top 5 customers
      const customerOrderCounts = new Map();
      
      ordersInRange.forEach(order => {
        const customerId = order.customer_id;
        if (customerId) {
          const existing = customerOrderCounts.get(customerId) || {
            customer_id: customerId,
            customer_name: order.customer_name || order.company_name || 'Unknown',
            order_count: 0,
            total_spent: 0
          };
          
          existing.order_count++;
          existing.total_spent += parseFloat(order.total || 0);
          customerOrderCounts.set(customerId, existing);
        }
      });

      // Get top 5 customers by order count
      const top5Customers = Array.from(customerOrderCounts.values())
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 5);

      return {
        total_orders_count: totalOrdersCount,
        total_orders_value: totalOrdersValue,
        orders_shipped_count: ordersShippedCount,
        new_customers_count: newCustomersCount,
        top_5_items: top5Items,
        top_5_customers: top5Customers,
        date_range: dateRange,
        calculated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
    } catch (error) {
      console.error(`Error calculating metrics for agent ${salesAgentId}:`, error);
      throw error;
    }
  }

  /**
   * Update counters for all sales agents
   */
  async updateAllAgentCounters() {
    const db = admin.firestore();
    
    try {
      console.log('🚀 Starting sales agent counters update...');
      
      // Get all sales agents
      const usersSnapshot = await db
        .collection('users')
        .where('role', '==', 'salesAgent')
        .get();
      
      console.log(`Found ${usersSnapshot.size} sales agents to process`);
      
      let processedCount = 0;
      let errorCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const salesAgentId = userData.zohospID;
        
        if (!salesAgentId) {
          console.warn(`User ${userDoc.id} has no zohospID, skipping...`);
          errorCount++;
          continue;
        }
        
        try {
          // Check if sales_agents document exists
          const agentDoc = await db.collection('sales_agents').doc(salesAgentId).get();
          if (!agentDoc.exists) {
            console.warn(`No sales_agents document for ${salesAgentId}, skipping...`);
            errorCount++;
            continue;
          }
          
          // Calculate metrics for each date range
          const batch = db.batch();
          
          for (const dateRange of this.dateRanges) {
            console.log(`  Calculating ${dateRange} for agent ${salesAgentId}...`);
            
            const metrics = await this.calculateMetricsForAgent(salesAgentId, dateRange);
            
            // Update counter document
            const counterRef = db
              .collection('sales_agents')
              .doc(salesAgentId)
              .collection('counters')
              .doc(dateRange);
            
            batch.set(counterRef, metrics, { merge: true });
          }
          
          // Commit batch for this agent
          await batch.commit();
          processedCount++;
          
          console.log(`✅ Updated counters for agent ${salesAgentId} (${processedCount}/${usersSnapshot.size})`);
          
          // Add a small delay to avoid overwhelming Firestore
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (agentError) {
          console.error(`Error processing agent ${salesAgentId}:`, agentError);
          errorCount++;
        }
      }
      
      console.log(`✅ Sales agent counters update completed:`);
      console.log(`   - Processed: ${processedCount}`);
      console.log(`   - Errors: ${errorCount}`);
      
      return {
        success: true,
        processed: processedCount,
        errors: errorCount,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error updating sales agent counters:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current metrics for a sales agent
   */
  async getCurrentMetrics(salesAgentId, dateRange = 'this_month') {
    const db = admin.firestore();
    
    try {
      const counterDoc = await db
        .collection('sales_agents')
        .doc(salesAgentId)
        .collection('counters')
        .doc(dateRange)
        .get();
      
      if (counterDoc.exists) {
        return counterDoc.data();
      }
      
      // If no cached data, calculate on the fly
      console.log(`No cached data for ${salesAgentId}/${dateRange}, calculating...`);
      return await this.calculateMetricsForAgent(salesAgentId, dateRange);
      
    } catch (error) {
      console.error(`Error getting metrics for agent ${salesAgentId}:`, error);
      return null;
    }
  }
}

export default new SalesAgentSyncService();
