import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class DailyDashboardAggregator {
    constructor() {
        this.db = db;
        this.cache = new Map(); // Cache for current run
    }

    /**
     * Get date range based on predefined key or custom dates
     */
    getDateRangeFromKey(rangeKey, customStart = null, customEnd = null) {
        const endDate = customEnd || new Date();
        let startDate = customStart || new Date();

        if (!customStart && !customEnd) {
            switch (rangeKey) {
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
                case '12_months':
                    startDate = new Date(endDate);
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
                case 'last_year':
                    startDate = new Date(endDate.getFullYear() - 1, 0, 1);
                    endDate.setFullYear(endDate.getFullYear() - 1, 11, 31);
                    break;
                case 'all_time':
                    startDate = new Date(2020, 0, 1); // Or your business start date
                    break;
            }
        }

        // Normalize dates to start of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        return { startDate, endDate };
    }

    /**
     * Calculate and store daily aggregates for a specific date
     */
    async calculateDailyAggregate(date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        console.log(`📊 Calculating aggregates for ${startOfDay.toDateString()}`);

        // Fetch all data for this day
        const [ordersSnapshot, invoicesSnapshot] = await Promise.all([
            this.db.collection('sales_orders')
                .where('order_date', '>=', Timestamp.fromDate(startOfDay))
                .where('order_date', '<=', Timestamp.fromDate(endOfDay))
                .get(),
            this.db.collection('invoices')
                .where('date', '>=', startOfDay.toISOString())
                .where('date', '<=', endOfDay.toISOString())
                .get()
        ]);

        // Fetch line items for orders
        const orders = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                return orderData;
            })
        );

        const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate daily metrics
        const dailyMetrics = {
            date: startOfDay.toISOString().split('T')[0], // YYYY-MM-DD format
            timestamp: Timestamp.fromDate(startOfDay),
            
            // Order metrics
            totalOrders: orders.length,
            totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
            marketplaceOrders: orders.filter(o => o.is_marketplace_order).length,
            directOrders: orders.filter(o => !o.is_marketplace_order).length,
            
            // Invoice metrics
            invoicesCreated: invoices.length,
            invoiceValue: invoices.reduce((sum, i) => sum + (i.total || 0), 0),
            
            // By Agent breakdown
            byAgent: {},
            
            // By Brand breakdown
            byBrand: {},
            
            // By Customer
            customers: new Set(),
            
            // Item details
            items: {},
            
            // Raw data references (for detailed queries)
            orderIds: orders.map(o => o.salesorder_id),
            invoiceIds: invoices.map(i => i.invoice_id)
        };

        // Calculate agent breakdown
        const agentMap = new Map();
        orders.forEach(order => {
            const agentId = order.salesperson_id;
            if (!agentId) return;
            
            if (!agentMap.has(agentId)) {
                agentMap.set(agentId, {
                    orders: 0,
                    revenue: 0,
                    customers: new Set()
                });
            }
            
            const agent = agentMap.get(agentId);
            agent.orders += 1;
            agent.revenue += order.total || 0;
            agent.customers.add(order.customer_id);
            
            dailyMetrics.customers.add(order.customer_id);
        });

        // Convert agent data
        agentMap.forEach((data, agentId) => {
            dailyMetrics.byAgent[agentId] = {
                orders: data.orders,
                revenue: data.revenue,
                customerCount: data.customers.size
            };
        });

        // Calculate brand breakdown
        const brandMap = new Map();
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                const brandId = item.vendor_id || item.brand_id || 'unknown';
                
                if (!brandMap.has(brandId)) {
                    brandMap.set(brandId, {
                        revenue: 0,
                        quantity: 0,
                        orders: new Set()
                    });
                }
                
                const brand = brandMap.get(brandId);
                brand.revenue += item.item_total || (item.quantity * item.rate) || 0;
                brand.quantity += item.quantity || 0;
                brand.orders.add(order.salesorder_id);
                
                // Track items
                const itemId = item.item_id;
                if (!dailyMetrics.items[itemId]) {
                    dailyMetrics.items[itemId] = {
                        name: item.item_name,
                        sku: item.sku,
                        quantity: 0,
                        revenue: 0
                    };
                }
                dailyMetrics.items[itemId].quantity += item.quantity || 0;
                dailyMetrics.items[itemId].revenue += item.item_total || 0;
            });
        });

        // Convert brand data
        brandMap.forEach((data, brandId) => {
            dailyMetrics.byBrand[brandId] = {
                revenue: data.revenue,
                quantity: data.quantity,
                orderCount: data.orders.size
            };
        });

        dailyMetrics.uniqueCustomers = dailyMetrics.customers.size;
        delete dailyMetrics.customers; // Remove Set before saving

        // Save to Firestore
        const docId = dailyMetrics.date; // Use date as document ID
        await this.db.collection('daily_aggregates').doc(docId).set(dailyMetrics);

        return dailyMetrics;
    }

    /**
     * Combine daily aggregates for a date range
     */
    async combineAggregatesForRange(startDate, endDate) {
        // Generate list of dates in range
        const dates = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        console.log(`📊 Combining ${dates.length} days of data`);

        // Fetch all daily aggregates in range
        const aggregatesSnapshot = await this.db.collection('daily_aggregates')
            .where('date', '>=', dates[0])
            .where('date', '<=', dates[dates.length - 1])
            .get();

        const dailyAggregates = aggregatesSnapshot.docs.map(doc => doc.data());

        // Initialize combined metrics
        const combined = {
            dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                days: dates.length
            },
            metrics: {
                totalRevenue: 0,
                totalOrders: 0,
                marketplaceOrders: 0,
                directOrders: 0,
                averageOrderValue: 0,
                uniqueCustomers: new Set(),
                totalInvoices: 0,
                totalInvoiceValue: 0
            },
            byAgent: {},
            byBrand: {},
            topItems: {},
            dailyBreakdown: []
        };

        // Combine all daily data
        dailyAggregates.forEach(daily => {
            // Add to totals
            combined.metrics.totalRevenue += daily.totalRevenue || 0;
            combined.metrics.totalOrders += daily.totalOrders || 0;
            combined.metrics.marketplaceOrders += daily.marketplaceOrders || 0;
            combined.metrics.directOrders += daily.directOrders || 0;
            combined.metrics.totalInvoices += daily.invoicesCreated || 0;
            combined.metrics.totalInvoiceValue += daily.invoiceValue || 0;

            // Track unique customers (would need to be stored differently for true uniqueness)
            // For now, we'll sum the daily unique counts (which may overcount)
            combined.metrics.uniqueCustomers = combined.metrics.uniqueCustomers.size + (daily.uniqueCustomers || 0);

            // Combine agent data
            Object.entries(daily.byAgent || {}).forEach(([agentId, data]) => {
                if (!combined.byAgent[agentId]) {
                    combined.byAgent[agentId] = {
                        orders: 0,
                        revenue: 0,
                        days: 0
                    };
                }
                combined.byAgent[agentId].orders += data.orders;
                combined.byAgent[agentId].revenue += data.revenue;
                combined.byAgent[agentId].days += 1;
            });

            // Combine brand data
            Object.entries(daily.byBrand || {}).forEach(([brandId, data]) => {
                if (!combined.byBrand[brandId]) {
                    combined.byBrand[brandId] = {
                        revenue: 0,
                        quantity: 0,
                        orderCount: 0
                    };
                }
                combined.byBrand[brandId].revenue += data.revenue;
                combined.byBrand[brandId].quantity += data.quantity;
                combined.byBrand[brandId].orderCount += data.orderCount;
            });

            // Combine items
            Object.entries(daily.items || {}).forEach(([itemId, data]) => {
                if (!combined.topItems[itemId]) {
                    combined.topItems[itemId] = {
                        name: data.name,
                        sku: data.sku,
                        quantity: 0,
                        revenue: 0
                    };
                }
                combined.topItems[itemId].quantity += data.quantity;
                combined.topItems[itemId].revenue += data.revenue;
            });

            // Add to daily breakdown for charts
            combined.dailyBreakdown.push({
                date: daily.date,
                revenue: daily.totalRevenue,
                orders: daily.totalOrders,
                invoicesCreated: daily.invoicesCreated || 0, // **FIX**: Added invoicesCreated
                uniqueCustomers: daily.uniqueCustomers || 0
            });
        });

        // Calculate averages
        combined.metrics.averageOrderValue = combined.metrics.totalOrders > 0 
            ? combined.metrics.totalRevenue / combined.metrics.totalOrders 
            : 0;

        // Sort and limit top items
        combined.topItems = Object.entries(combined.topItems)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 50);

        // Sort agents and brands
        combined.topAgents = Object.entries(combined.byAgent)
            .map(([id, data]) => ({ agentId: id, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        combined.topBrands = Object.entries(combined.byBrand)
            .map(([id, data]) => ({ brandId: id, ...data }))
            .sort((a, b) => b.revenue - a.revenue);

        return combined;
    }

    /**
     * Get dashboard data for any date range
     */
    async getDashboardData(rangeKey, customStart = null, customEnd = null) {
        const { startDate, endDate } = this.getDateRangeFromKey(rangeKey, customStart, customEnd);
        
        // Check if we have all daily aggregates for this range
        const missingDates = await this.findMissingDates(startDate, endDate);
        
        if (missingDates.length > 0) {
            console.log(`⚠️ Missing aggregates for ${missingDates.length} days, calculating...`);
            
            // Calculate missing daily aggregates
            for (const date of missingDates) {
                await this.calculateDailyAggregate(new Date(date));
            }
        }

        // Combine aggregates for the range
        const dashboardData = await this.combineAggregatesForRange(startDate, endDate);
        
        // Add metadata
        dashboardData.generatedAt = Timestamp.now();
        dashboardData.rangeKey = rangeKey;
        dashboardData.isCustomRange = !!(customStart || customEnd);

        return dashboardData;
    }

    /**
     * Find missing dates in the daily aggregates
     */
    async findMissingDates(startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        // Check which dates we have
        const existingSnapshot = await this.db.collection('daily_aggregates')
            .where('date', '>=', dates[0])
            .where('date', '<=', dates[dates.length - 1])
            .select('date')
            .get();

        const existingDates = new Set(existingSnapshot.docs.map(doc => doc.data().date));
        
        return dates.filter(date => !existingDates.has(date));
    }

    /**
     * Backfill historical daily aggregates
     */
    async backfillDailyAggregates(startDate, endDate) {
        console.log(`🔄 Backfilling daily aggregates from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        
        const current = new Date(startDate);
        let processed = 0;
        
        while (current <= endDate) {
            await this.calculateDailyAggregate(new Date(current));
            processed++;
            
            if (processed % 10 === 0) {
                console.log(`✅ Processed ${processed} days...`);
            }
            
            current.setDate(current.getDate() + 1);
        }
        
        console.log(`✅ Backfill complete! Processed ${processed} days.`);
    }

    /**
     * Run daily aggregation for yesterday (for cron job)
     */
    async runDailyAggregation() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        console.log(`🚀 Running daily aggregation for ${yesterday.toDateString()}`);
        await this.calculateDailyAggregate(yesterday);
        
        // Also update today's partial data
        const today = new Date();
        console.log(`🚀 Updating today's partial data for ${today.toDateString()}`);
        await this.calculateDailyAggregate(today);
    }
}

export default DailyDashboardAggregator;