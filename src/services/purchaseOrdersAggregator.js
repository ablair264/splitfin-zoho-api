import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class PurchaseOrdersAggregator {
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
     * Calculate and store daily purchase order aggregates
     */
    async calculateDailyPurchaseOrderAggregate(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`📋 Calculating purchase order aggregates for ${startOfDay.toDateString()}`);

        // Fetch purchase orders for this day
        const purchaseOrdersSnapshot = await this.db.collection('purchase_orders')
            .where('date', '>=', startOfDay.toISOString())
            .where('date', '<=', endOfDay.toISOString())
            .get();

        const purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate daily metrics
        const dailyMetrics = {
            date: startOfDay.toISOString().split('T')[0],
            timestamp: Timestamp.fromDate(startOfDay),
            
            // Purchase order metrics
            totalOrders: purchaseOrders.length,
            totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0),
            totalOrderedQuantity: 0,
            totalReceivedQuantity: 0,
            totalBilledQuantity: 0,
            
            // Status breakdown
            statusBreakdown: {},
            billedStatusBreakdown: {},
            receivedStatusBreakdown: {},
            
            // Vendor breakdown
            vendors: new Set(),
            uniqueVendors: 0,
            
            // Item breakdown
            items: {},
            topItems: [],
            
            // Delivery metrics
            deliveriesScheduled: 0,
            deliveriesCompleted: 0,
            
            // Surplus items
            itemsInSurplus: 0,
            
            // Raw data references
            orderIds: purchaseOrders.map(po => po.purchaseorder_id)
        };

        // Calculate metrics
        purchaseOrders.forEach(po => {
            const status = po.status || 'unknown';
            const billedStatus = po.billed_status || 'unknown';
            const receivedStatus = po.received_status || 'unknown';
            
            dailyMetrics.statusBreakdown[status] = (dailyMetrics.statusBreakdown[status] || 0) + 1;
            dailyMetrics.billedStatusBreakdown[billedStatus] = (dailyMetrics.billedStatusBreakdown[billedStatus] || 0) + 1;
            dailyMetrics.receivedStatusBreakdown[receivedStatus] = (dailyMetrics.receivedStatusBreakdown[receivedStatus] || 0) + 1;
            
            // Track vendors
            if (po.vendor_id) {
                dailyMetrics.vendors.add(po.vendor_id);
            }
            
            // Track deliveries
            if (po.delivery_date) {
                dailyMetrics.deliveriesScheduled++;
                const deliveryDate = new Date(po.delivery_date);
                if (deliveryDate >= startOfDay && deliveryDate <= endOfDay) {
                    dailyMetrics.deliveriesCompleted++;
                }
            }
            
            // Calculate line item metrics
            (po.line_items || []).forEach(item => {
                const itemId = item.item_id || item.sku;
                if (!itemId) return;
                
                dailyMetrics.totalOrderedQuantity += item.quantity || 0;
                dailyMetrics.totalReceivedQuantity += item.quantity_received || 0;
                dailyMetrics.totalBilledQuantity += item.quantity_billed || 0;
                
                if (item.surplus) {
                    dailyMetrics.itemsInSurplus++;
                }
                
                // Track items
                if (!dailyMetrics.items[itemId]) {
                    dailyMetrics.items[itemId] = {
                        name: item.name,
                        sku: item.sku,
                        orderedQuantity: 0,
                        receivedQuantity: 0,
                        billedQuantity: 0,
                        surplusCount: 0,
                        orders: new Set()
                    };
                }
                
                const itemData = dailyMetrics.items[itemId];
                itemData.orderedQuantity += item.quantity || 0;
                itemData.receivedQuantity += item.quantity_received || 0;
                itemData.billedQuantity += item.quantity_billed || 0;
                if (item.surplus) {
                    itemData.surplusCount++;
                }
                itemData.orders.add(po.purchaseorder_id);
            });
        });

        // Convert item data
        Object.keys(dailyMetrics.items).forEach(itemId => {
            const itemData = dailyMetrics.items[itemId];
            delete itemData.orders; // Remove Set before saving
        });

        // Get top items
        dailyMetrics.topItems = Object.entries(dailyMetrics.items)
            .map(([id, data]) => ({
                id,
                name: data.name,
                sku: data.sku,
                orderedQuantity: data.orderedQuantity,
                receivedQuantity: data.receivedQuantity,
                billedQuantity: data.billedQuantity,
                surplusCount: data.surplusCount
            }))
            .sort((a, b) => b.orderedQuantity - a.orderedQuantity)
            .slice(0, 10);

        dailyMetrics.uniqueVendors = dailyMetrics.vendors.size;
        delete dailyMetrics.vendors; // Remove Set before saving

        // Store the daily aggregate
        const aggregateRef = this.db.collection('purchase_order_aggregates').doc(dailyMetrics.date);
        await aggregateRef.set(dailyMetrics);

        console.log(`✅ Stored purchase order aggregates for ${dailyMetrics.date}: ${dailyMetrics.totalOrders} orders`);
        return dailyMetrics;
    }

    /**
     * Combine aggregates for a date range
     */
    async combineAggregatesForRange(startDate, endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`🔄 Combining purchase order aggregates from ${startDateStr} to ${endDateStr}`);

        // Fetch all aggregates in the range
        const aggregatesSnapshot = await this.db.collection('purchase_order_aggregates')
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
            totalValue: 0,
            totalOrderedQuantity: 0,
            totalReceivedQuantity: 0,
            totalBilledQuantity: 0,
            uniqueVendors: new Set(),
            deliveriesScheduled: 0,
            deliveriesCompleted: 0,
            itemsInSurplus: 0,
            statusBreakdown: {},
            billedStatusBreakdown: {},
            receivedStatusBreakdown: {},
            items: {},
            topItems: new Map(),
            orderIds: []
        };

        aggregates.forEach(agg => {
            combined.totalOrders += agg.totalOrders || 0;
            combined.totalValue += agg.totalValue || 0;
            combined.totalOrderedQuantity += agg.totalOrderedQuantity || 0;
            combined.totalReceivedQuantity += agg.totalReceivedQuantity || 0;
            combined.totalBilledQuantity += agg.totalBilledQuantity || 0;
            combined.deliveriesScheduled += agg.deliveriesScheduled || 0;
            combined.deliveriesCompleted += agg.deliveriesCompleted || 0;
            combined.itemsInSurplus += agg.itemsInSurplus || 0;
            
            // Combine status breakdowns
            Object.entries(agg.statusBreakdown || {}).forEach(([status, count]) => {
                combined.statusBreakdown[status] = (combined.statusBreakdown[status] || 0) + count;
            });
            
            Object.entries(agg.billedStatusBreakdown || {}).forEach(([status, count]) => {
                combined.billedStatusBreakdown[status] = (combined.billedStatusBreakdown[status] || 0) + count;
            });
            
            Object.entries(agg.receivedStatusBreakdown || {}).forEach(([status, count]) => {
                combined.receivedStatusBreakdown[status] = (combined.receivedStatusBreakdown[status] || 0) + count;
            });

            // Combine items
            Object.entries(agg.items || {}).forEach(([itemId, itemData]) => {
                if (!combined.items[itemId]) {
                    combined.items[itemId] = { ...itemData };
                }
                combined.items[itemId].orderedQuantity += itemData.orderedQuantity || 0;
                combined.items[itemId].receivedQuantity += itemData.receivedQuantity || 0;
                combined.items[itemId].billedQuantity += itemData.billedQuantity || 0;
                combined.items[itemId].surplusCount += itemData.surplusCount || 0;
            });

            // Combine top items
            (agg.topItems || []).forEach(item => {
                if (!combined.topItems.has(item.id)) {
                    combined.topItems.set(item.id, { ...item });
                }
                const existing = combined.topItems.get(item.id);
                existing.orderedQuantity += item.orderedQuantity || 0;
                existing.receivedQuantity += item.receivedQuantity || 0;
                existing.billedQuantity += item.billedQuantity || 0;
                existing.surplusCount += item.surplusCount || 0;
            });

            // Combine order IDs
            combined.orderIds.push(...(agg.orderIds || []));
        });

        // Convert Sets to counts/arrays
        combined.uniqueVendors = combined.uniqueVendors.size;
        combined.topItems = Array.from(combined.topItems.values())
            .sort((a, b) => b.orderedQuantity - a.orderedQuantity)
            .slice(0, 10);

        return combined;
    }

    /**
     * Calculate metrics from raw data when aggregates don't exist
     */
    async calculateFromRawData(startDate, endDate) {
        console.log('📊 Calculating from raw purchase order data...');

        const purchaseOrdersSnapshot = await this.db.collection('purchase_orders')
            .where('date', '>=', startDate.toISOString())
            .where('date', '<=', endDate.toISOString())
            .get();

        const purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const vendors = new Set();
        const statusBreakdown = {};
        const billedStatusBreakdown = {};
        const receivedStatusBreakdown = {};
        const itemMap = new Map();
        let deliveriesScheduled = 0;
        let deliveriesCompleted = 0;
        let itemsInSurplus = 0;
        let totalOrderedQuantity = 0;
        let totalReceivedQuantity = 0;
        let totalBilledQuantity = 0;

        purchaseOrders.forEach(po => {
            const status = po.status || 'unknown';
            const billedStatus = po.billed_status || 'unknown';
            const receivedStatus = po.received_status || 'unknown';
            
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            billedStatusBreakdown[billedStatus] = (billedStatusBreakdown[billedStatus] || 0) + 1;
            receivedStatusBreakdown[receivedStatus] = (receivedStatusBreakdown[receivedStatus] || 0) + 1;
            
            if (po.vendor_id) {
                vendors.add(po.vendor_id);
            }

            if (po.delivery_date) {
                deliveriesScheduled++;
                const deliveryDate = new Date(po.delivery_date);
                if (deliveryDate >= startDate && deliveryDate <= endDate) {
                    deliveriesCompleted++;
                }
            }

            (po.line_items || []).forEach(item => {
                const itemId = item.item_id || item.sku;
                if (!itemId) return;
                
                totalOrderedQuantity += item.quantity || 0;
                totalReceivedQuantity += item.quantity_received || 0;
                totalBilledQuantity += item.quantity_billed || 0;
                
                if (item.surplus) {
                    itemsInSurplus++;
                }
                
                if (!itemMap.has(itemId)) {
                    itemMap.set(itemId, {
                        id: itemId,
                        name: item.name,
                        sku: item.sku,
                        orderedQuantity: 0,
                        receivedQuantity: 0,
                        billedQuantity: 0,
                        surplusCount: 0
                    });
                }
                
                const itemData = itemMap.get(itemId);
                itemData.orderedQuantity += item.quantity || 0;
                itemData.receivedQuantity += item.quantity_received || 0;
                itemData.billedQuantity += item.quantity_billed || 0;
                if (item.surplus) {
                    itemData.surplusCount++;
                }
            });
        });

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalOrders: purchaseOrders.length,
            totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0),
            totalOrderedQuantity,
            totalReceivedQuantity,
            totalBilledQuantity,
            uniqueVendors: vendors.size,
            deliveriesScheduled,
            deliveriesCompleted,
            itemsInSurplus,
            statusBreakdown,
            billedStatusBreakdown,
            receivedStatusBreakdown,
            items: Object.fromEntries(itemMap),
            topItems: Array.from(itemMap.values())
                .sort((a, b) => b.orderedQuantity - a.orderedQuantity)
                .slice(0, 10),
            orderIds: purchaseOrders.map(po => po.purchaseorder_id)
        };
    }

    /**
     * Get purchase orders data for frontend consumption
     */
    async getPurchaseOrdersData(rangeKey = 'this_week') {
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
        console.log('🚀 Starting daily purchase order aggregation...');
        
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 7); // Backfill last 7 days
        
        const missingDates = await this.findMissingDates(startDate, today);
        
        console.log(`📅 Found ${missingDates.length} missing dates to aggregate`);
        
        for (const date of missingDates) {
            try {
                await this.calculateDailyPurchaseOrderAggregate(date);
            } catch (error) {
                console.error(`❌ Error aggregating purchase orders for ${date.toDateString()}:`, error);
            }
        }
        
        console.log('✅ Daily purchase order aggregation complete');
    }

    /**
     * Find missing aggregate dates
     */
    async findMissingDates(startDate, endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const aggregatesSnapshot = await this.db.collection('purchase_order_aggregates')
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

export default PurchaseOrdersAggregator; 