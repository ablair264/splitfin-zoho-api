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

        // 1. Calculate overall daily aggregate
        await this.calculateOverallDailyAggregate(startOfDay, endOfDay);
        
        // 2. Calculate agent-specific aggregates
        await this.calculateAgentDailyAggregates(startOfDay, endOfDay);
    }
    
    /**
     * Calculate overall daily aggregate for brand managers
     */
    async calculateOverallDailyAggregate(startOfDay, endOfDay) {
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
     * Calculate agent-specific daily aggregates
     */
    async calculateAgentDailyAggregates(startOfDay, endOfDay) {
        console.log('📊 Calculating agent-specific aggregates...');
        
        const dateStr = startOfDay.toISOString().split('T')[0];
        const agentsSnapshot = await this.db.collection('sales_agents').get();

        // Process each agent in parallel (with concurrency limit)
        const batchSize = 5; // Process 5 agents at a time
        const agents = agentsSnapshot.docs;
        
        for (let i = 0; i < agents.length; i += batchSize) {
            const batch = agents.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (agentDoc) => {
                const agentId = agentDoc.id;
                const agentData = agentDoc.data();
                
                try {
                    // Query agent's orders from subcollection
                    const ordersSnapshot = await this.db
                        .collection('sales_agents')
                        .doc(agentId)
                        .collection('customers_orders')
                        .where('order_date', '>=', dateStr)
                        .where('order_date', '<=', dateStr + 'T23:59:59')
                        .get();

                    if (ordersSnapshot.empty) {
                        // No orders for this day - still save empty aggregate
                        await this.saveAgentDailyAggregate(agentId, dateStr, {
                            date: dateStr,
                            timestamp: Timestamp.fromDate(startOfDay),
                            agentId: agentId,
                            agentName: agentData.name || 'Unknown',
                            totalOrders: 0,
                            totalRevenue: 0,
                            commission: 0,
                            uniqueCustomers: 0,
                            customers: {},
                            topItems: [],
                            orderIds: []
                        });
                        return;
                    }

                    // Process agent's orders
                    const orders = ordersSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Calculate agent metrics
                    const agentMetrics = {
                        date: dateStr,
                        timestamp: Timestamp.fromDate(startOfDay),
                        agentId: agentId,
                        agentName: agentData.name || 'Unknown',
                        
                        // Order metrics
                        totalOrders: orders.length,
                        totalRevenue: orders.reduce((sum, o) => sum + (o.total || 0), 0),
                        
                        // Customer breakdown
                        customers: {},
                        
                        // Item breakdown (will need to fetch from main orders)
                        topItems: [],
                        
                        // Commission
                        commission: 0,
                        
                        // Order IDs for reference
                        orderIds: orders.map(o => o.sales_order_id || o.id)
                    };

                    // Calculate commission (5% default)
                    agentMetrics.commission = agentMetrics.totalRevenue * 0.05;

                    // Process customers
                    const customerMap = new Map();
                    orders.forEach(order => {
                        const customerId = order.customer_name || 'Unknown';
                        if (!customerMap.has(customerId)) {
                            customerMap.set(customerId, {
                                name: customerId,
                                orders: 0,
                                revenue: 0
                            });
                        }
                        const customer = customerMap.get(customerId);
                        customer.orders += 1;
                        customer.revenue += order.total || 0;
                    });

                    agentMetrics.customers = Object.fromEntries(customerMap);
                    agentMetrics.uniqueCustomers = customerMap.size;

                    // Save agent's daily aggregate
                    await this.saveAgentDailyAggregate(agentId, dateStr, agentMetrics);
                    
                    console.log(`✅ Agent ${agentData.name}: ${orders.length} orders, £${agentMetrics.totalRevenue}`);
                    
                } catch (error) {
                    console.error(`❌ Error processing agent ${agentId}:`, error);
                }
            }));
        }
    }
    
    /**
     * Save agent's daily aggregate
     */
    async saveAgentDailyAggregate(agentId, dateStr, metrics) {
        await this.db
            .collection('sales_agents')
            .doc(agentId)
            .collection('daily_aggregates')
            .doc(dateStr)
            .set(metrics);
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
    
    /**
     * Get agent dashboard by combining their daily aggregates
     */
    async getAgentDashboard(agentId, dateRange) {
        const { startDate, endDate } = this.getDateRangeFromKey(dateRange);
        
        // Get agent info
        const agentDoc = await this.db.collection('sales_agents').doc(agentId).get();
        if (!agentDoc.exists) throw new Error('Agent not found');
        
        const agentData = agentDoc.data();
        
        // Get date range for query
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        // Check for missing dates and calculate if needed
        const missingDates = await this.findMissingAgentDates(agentId, startDate, endDate);
        if (missingDates.length > 0) {
            console.log(`⚠️ Missing ${missingDates.length} days of agent aggregates, calculating...`);
            for (const date of missingDates) {
                await this.calculateAgentDailyAggregates(new Date(date), new Date(date));
            }
        }
        
        // Fetch agent's daily aggregates
        const aggregatesSnapshot = await this.db
            .collection('sales_agents')
            .doc(agentId)
            .collection('daily_aggregates')
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .orderBy('date', 'asc')
            .get();
        
        // Combine daily data
        const combined = {
            agentId,
            agentName: agentData.name,
            dateRange: { start: startStr, end: endStr },
            role: 'salesAgent',
            metrics: {
                totalRevenue: 0,
                totalOrders: 0,
                totalCommission: 0,
                uniqueCustomers: new Set(),
                activeDays: 0,
                averageOrderValue: 0,
                totalCustomers: 0
            },
            dailyBreakdown: [],
            topCustomers: {},
            topItems: {},
            commission: {
                total: 0,
                rate: 0.05
            }
        };
        
        // Process each day's data
        aggregatesSnapshot.docs.forEach(doc => {
            const daily = doc.data();
            
            combined.metrics.totalRevenue += daily.totalRevenue || 0;
            combined.metrics.totalOrders += daily.totalOrders || 0;
            combined.metrics.totalCommission += daily.commission || 0;
            
            if (daily.totalOrders > 0) {
                combined.metrics.activeDays += 1;
            }
            
            // Combine customers
            Object.entries(daily.customers || {}).forEach(([name, data]) => {
                if (!combined.topCustomers[name]) {
                    combined.topCustomers[name] = { name, orders: 0, revenue: 0 };
                }
                combined.topCustomers[name].orders += data.orders;
                combined.topCustomers[name].revenue += data.revenue;
                combined.metrics.uniqueCustomers.add(name);
            });
            
            // Add to daily breakdown
            combined.dailyBreakdown.push({
                date: daily.date,
                revenue: daily.totalRevenue,
                orders: daily.totalOrders,
                customers: daily.uniqueCustomers || 0,
                commission: daily.commission
            });
        });
        
        // Finalize metrics
        combined.metrics.uniqueCustomers = combined.metrics.uniqueCustomers.size;
        combined.metrics.totalCustomers = combined.metrics.uniqueCustomers;
        combined.metrics.averageOrderValue = combined.metrics.totalOrders > 0
            ? combined.metrics.totalRevenue / combined.metrics.totalOrders
            : 0;
        
        combined.commission.total = combined.metrics.totalCommission;
        
        // Convert to arrays and sort
        combined.topCustomers = Object.values(combined.topCustomers)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20)
            .map(c => ({
                id: c.name,
                name: c.name,
                total_spent: c.revenue,
                order_count: c.orders
            }));
        
        // Format performance data
        combined.performance = {
            top_customers: combined.topCustomers,
            top_items: [], // Items would need to be fetched separately
            brands: []
        };
        
        return combined;
    }
    
    /**
     * Find missing dates in agent's daily aggregates
     */
    async findMissingAgentDates(agentId, startDate, endDate) {
        const dates = [];
        const current = new Date(startDate);
        
        while (current <= endDate) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        // Check which dates we have for this agent
        const existingSnapshot = await this.db
            .collection('sales_agents')
            .doc(agentId)
            .collection('daily_aggregates')
            .where('date', '>=', dates[0])
            .where('date', '<=', dates[dates.length - 1])
            .select('date')
            .get();

        const existingDates = new Set(existingSnapshot.docs.map(doc => doc.data().date));
        
        return dates.filter(date => !existingDates.has(date));
    }
}

export default DailyDashboardAggregator;