import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class OrdersAggregator {
    constructor() {
        this.db = db;
        this.cache = new Map();
    }

    /**
     * Get date range based on predefined key
     */
    getDateRangeFromKey(rangeKey) {
        const endDate = new Date();
        let startDate = new Date();

        switch (rangeKey) {
            case 'today':
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                break;
            case 'this_week':
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - endDate.getDay());
                startDate.setHours(0, 0, 0, 0);
                break;
            case '7_days':
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30_days':
                startDate = new Date(endDate);
                startDate.setDate(endDate.getDate() - 30);
                break;
            case 'quarter':
                const quarter = Math.floor(endDate.getMonth() / 3);
                startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
                break;
            case 'this_year':
                startDate = new Date(endDate.getFullYear(), 0, 1);
                break;
            case 'all_time':
                startDate = new Date(2020, 0, 1);
                break;
            default:
                startDate.setDate(endDate.getDate() - 30);
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    }

    /**
     * Calculate and store daily order aggregates
     */
    async calculateDailyOrderAggregate(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`📦 Calculating order aggregates for ${startOfDay.toDateString()}`);

        // Fetch orders for this day
        const ordersSnapshot = await this.db.collection('sales_orders')
            .where('order_date', '>=', Timestamp.fromDate(startOfDay))
            .where('order_date', '<=', Timestamp.fromDate(endOfDay))
            .get();

        // Fetch line items for orders
        const orders = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                return orderData;
            })
        );

        // Calculate daily metrics
        const dailyMetrics = {
            date: startOfDay.toISOString().split('T')[0],
            timestamp: Timestamp.fromDate(startOfDay),
            
            // Order metrics
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
            marketplaceOrders: orders.filter(o => o.is_marketplace_order).length,
            directOrders: orders.filter(o => !o.is_marketplace_order).length,
            
            // Status breakdown
            statusBreakdown: {},
            
            // Customer breakdown
            customers: new Set(),
            uniqueCustomers: 0,
            
            // Item breakdown
            items: {},
            topItems: [],
            
            // Delivery metrics
            deliveriesScheduled: 0,
            deliveriesCompleted: 0,
            
            // Raw data references
            orderIds: orders.map(o => o.salesorder_id)
        };

        // Calculate status breakdown
        orders.forEach(order => {
            const status = order.status || order.order_status || 'unknown';
            dailyMetrics.statusBreakdown[status] = (dailyMetrics.statusBreakdown[status] || 0) + 1;
            
            // Track customers
            if (order.customer_id) {
                dailyMetrics.customers.add(order.customer_id);
            }
            
            // Track deliveries
            if (order.delivery_date) {
                dailyMetrics.deliveriesScheduled++;
                const deliveryDate = new Date(order.delivery_date);
                if (deliveryDate >= startOfDay && deliveryDate <= endOfDay) {
                    dailyMetrics.deliveriesCompleted++;
                }
            }
        });

        // Calculate item breakdown
        const itemMap = new Map();
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                const itemId = item.item_id || item.sku;
                if (!itemId) return;
                
                if (!itemMap.has(itemId)) {
                    itemMap.set(itemId, {
                        name: item.item_name || item.name,
                        sku: item.sku,
                        quantity: 0,
                        revenue: 0,
                        orders: new Set()
                    });
                }
                
                const itemData = itemMap.get(itemId);
                itemData.quantity += item.quantity || 0;
                itemData.revenue += item.item_total || (item.quantity * item.rate) || 0;
                itemData.orders.add(order.salesorder_id);
            });
        });

        // Convert item data
        itemMap.forEach((data, itemId) => {
            dailyMetrics.items[itemId] = {
                name: data.name,
                sku: data.sku,
                quantity: data.quantity,
                revenue: data.revenue,
                orderCount: data.orders.size
            };
        });

        // Get top items
        dailyMetrics.topItems = Array.from(itemMap.entries())
            .map(([id, data]) => ({
                id,
                name: data.name,
                sku: data.sku,
                quantity: data.quantity,
                revenue: data.revenue,
                orderCount: data.orders.size
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        dailyMetrics.uniqueCustomers = dailyMetrics.customers.size;
        delete dailyMetrics.customers; // Remove Set before saving

        // Store the daily aggregate
        const aggregateRef = this.db.collection('order_aggregates').doc(dailyMetrics.date);
        await aggregateRef.set(dailyMetrics);

        console.log(`✅ Stored order aggregates for ${dailyMetrics.date}: ${dailyMetrics.totalOrders} orders`);
        return dailyMetrics;
    }

    /**
     * Combine aggregates for a date range
     */
    async combineAggregatesForRange(startDate, endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`🔄 Combining order aggregates from ${startDateStr} to ${endDateStr}`);

        // Fetch all aggregates in the range
        const aggregatesSnapshot = await this.db.collection('order_aggregates')
            .where('date', '>=', startDateStr)
            .where('date', '<=', endDateStr)
            .get();

        const aggregates = aggregatesSnapshot.docs.map(doc => doc.data());

        if (aggregates.length === 0) {
            console.log('⚠️ No aggregates found for date range, calculating from raw data...');
            return await this.calculateFromRawData(startDate, endDate);
        }

        // Combine metrics
        const combined = {
            startDate: startDateStr,
            endDate: endDateStr,
            totalOrders: 0,
            totalRevenue: 0,
            marketplaceOrders: 0,
            directOrders: 0,
            uniqueCustomers: new Set(),
            deliveriesScheduled: 0,
            deliveriesCompleted: 0,
            statusBreakdown: {},
            items: {},
            topItems: new Map(),
            orderIds: []
        };

        aggregates.forEach(agg => {
            combined.totalOrders += agg.totalOrders || 0;
            combined.totalRevenue += agg.totalRevenue || 0;
            combined.marketplaceOrders += agg.marketplaceOrders || 0;
            combined.directOrders += agg.directOrders || 0;
            combined.deliveriesScheduled += agg.deliveriesScheduled || 0;
            combined.deliveriesCompleted += agg.deliveriesCompleted || 0;
            
            // Combine status breakdown
            Object.entries(agg.statusBreakdown || {}).forEach(([status, count]) => {
                combined.statusBreakdown[status] = (combined.statusBreakdown[status] || 0) + count;
            });

            // Combine items
            Object.entries(agg.items || {}).forEach(([itemId, itemData]) => {
                if (!combined.items[itemId]) {
                    combined.items[itemId] = { ...itemData, quantity: 0, revenue: 0, orderCount: 0 };
                }
                combined.items[itemId].quantity += itemData.quantity || 0;
                combined.items[itemId].revenue += itemData.revenue || 0;
                combined.items[itemId].orderCount += itemData.orderCount || 0;
            });

            // Combine top items
            (agg.topItems || []).forEach(item => {
                if (!combined.topItems.has(item.id)) {
                    combined.topItems.set(item.id, { ...item, quantity: 0, revenue: 0, orderCount: 0 });
                }
                const existing = combined.topItems.get(item.id);
                existing.quantity += item.quantity || 0;
                existing.revenue += item.revenue || 0;
                existing.orderCount += item.orderCount || 0;
            });

            // Combine order IDs
            combined.orderIds.push(...(agg.orderIds || []));
        });

        // Convert Sets to counts/arrays
        combined.uniqueCustomers = combined.uniqueCustomers.size;
        combined.topItems = Array.from(combined.topItems.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        return combined;
    }

    /**
     * Calculate metrics from raw data when aggregates don't exist
     */
    async calculateFromRawData(startDate, endDate) {
        console.log('📊 Calculating from raw order data...');

        const ordersSnapshot = await this.db.collection('sales_orders')
            .where('order_date', '>=', Timestamp.fromDate(startDate))
            .where('order_date', '<=', Timestamp.fromDate(endDate))
            .get();

        const orders = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                return orderData;
            })
        );

        const customers = new Set();
        const statusBreakdown = {};
        const itemMap = new Map();
        let deliveriesScheduled = 0;
        let deliveriesCompleted = 0;

        orders.forEach(order => {
            const status = order.status || order.order_status || 'unknown';
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            
            if (order.customer_id) {
                customers.add(order.customer_id);
            }

            if (order.delivery_date) {
                deliveriesScheduled++;
                const deliveryDate = new Date(order.delivery_date);
                if (deliveryDate >= startDate && deliveryDate <= endDate) {
                    deliveriesCompleted++;
                }
            }

            (order.line_items || []).forEach(item => {
                const itemId = item.item_id || item.sku;
                if (!itemId) return;
                
                if (!itemMap.has(itemId)) {
                    itemMap.set(itemId, {
                        id: itemId,
                        name: item.item_name || item.name,
                        sku: item.sku,
                        quantity: 0,
                        revenue: 0,
                        orderCount: 0
                    });
                }
                
                const itemData = itemMap.get(itemId);
                itemData.quantity += item.quantity || 0;
                itemData.revenue += item.item_total || (item.quantity * item.rate) || 0;
                itemData.orderCount++;
            });
        });

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
            marketplaceOrders: orders.filter(o => o.is_marketplace_order).length,
            directOrders: orders.filter(o => !o.is_marketplace_order).length,
            uniqueCustomers: customers.size,
            deliveriesScheduled,
            deliveriesCompleted,
            statusBreakdown,
            items: Object.fromEntries(itemMap),
            topItems: Array.from(itemMap.values())
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10),
            orderIds: orders.map(o => o.salesorder_id)
        };
    }

    /**
     * Get orders data for frontend consumption
     */
    async getOrdersData(rangeKey = 'this_week') {
        const { startDate, endDate } = this.getDateRangeFromKey(rangeKey);
        
        // Check cache first
        const cacheKey = `${rangeKey}_${startDate.toISOString()}_${endDate.toISOString()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const data = await this.combineAggregatesForRange(startDate, endDate);
        
        // Cache the result
        this.cache.set(cacheKey, data);
        
        return data;
    }

    /**
     * Run daily aggregation for all missing dates
     */
    async runDailyAggregation() {
        console.log('🚀 Starting daily order aggregation...');
        
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 7); // Backfill last 7 days
        
        const missingDates = await this.findMissingDates(startDate, today);
        
        console.log(`📅 Found ${missingDates.length} missing dates to aggregate`);
        
        for (const date of missingDates) {
            try {
                await this.calculateDailyOrderAggregate(date);
            } catch (error) {
                console.error(`❌ Error aggregating orders for ${date.toDateString()}:`, error);
            }
        }
        
        console.log('✅ Daily order aggregation complete');
    }

    /**
     * Find missing aggregate dates
     */
    async findMissingDates(startDate, endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const aggregatesSnapshot = await this.db.collection('order_aggregates')
            .where('date', '>=', startDateStr)
            .where('date', '<=', endDateStr)
            .get();
        
        const existingDates = new Set(
            aggregatesSnapshot.docs.map(doc => doc.id)
        );
        
        const missingDates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            if (!existingDates.has(dateStr)) {
                missingDates.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return missingDates;
    }
}

export default OrdersAggregator; 