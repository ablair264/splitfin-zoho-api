import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class OptimizedDashboardAggregator {
    constructor() {
        this.db = db;
    }

    _getDateRange(rangeKey) {
        const endDate = new Date();
        let startDate = new Date();

        switch (rangeKey) {
            case 'today':
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                break;
            case '7_days':
                startDate.setDate(endDate.getDate() - 7);
                break;
            case '30_days':
                startDate.setMonth(endDate.getMonth() - 1);
                break;
            case 'quarter':
                const quarter = Math.floor(endDate.getMonth() / 3);
                startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                startDate = new Date(endDate.getFullYear(), 0, 1);
                break;
            default:
                startDate.setMonth(endDate.getMonth() - 1);
        }
        return { startDate, endDate };
    }

    /**
     * Optimized calculation for brand managers - only fetches data within date range
     */
    async calculateMetricsForPeriod(dateRangeKey) {
        const { startDate, endDate } = this._getDateRange(dateRangeKey);
        console.log(`📊 Calculating metrics for ${dateRangeKey}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Convert dates to Firestore Timestamps for queries
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        // Fetch only the data we need with date filters
        const [
            ordersSnapshot,
            invoicesSnapshot,
            agentsSnapshot,
            vendorsSnapshot
        ] = await Promise.all([
            // Orders within date range
            this.db.collection('sales_orders')
                .where('order_date', '>=', startTimestamp)
                .where('order_date', '<=', endTimestamp)
                .get(),
            
            // Invoices within date range (using string date comparison)
            this.db.collection('invoices')
                .where('date', '>=', startDate.toISOString().split('T')[0])
                .where('date', '<=', endDate.toISOString().split('T')[0])
                .get(),
            
            // All agents (small collection, needed for mapping)
            this.db.collection('sales_agents').get(),
            
            // All vendors (small collection, needed for mapping)
            this.db.collection('vendors').get()
        ]);

        console.log(`✅ Fetched ${ordersSnapshot.size} orders, ${invoicesSnapshot.size} invoices`);

        // Create lookup maps
        const vendorMap = new Map();
        vendorsSnapshot.docs.forEach(doc => {
            vendorMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        const agentMap = new Map();
        agentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            agentMap.set(data.zohospID || doc.id, { id: doc.id, ...data });
        });

        // Process orders with their line items
        const ordersWithItems = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = orderDoc.data();
                orderData.id = orderDoc.id;
                
                // Fetch line items for this order
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                
                return orderData;
            })
        );

        // Process invoices
        const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate metrics
        const totalRevenue = ordersWithItems.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = ordersWithItems.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const marketplaceOrders = ordersWithItems.filter(o => o.is_marketplace_order).length;

        // Invoice metrics
        const now = new Date();
        const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void');
        const overdueInvoices = outstandingInvoices.filter(i => {
            const dueDate = new Date(i.due_date);
            return dueDate < now;
        });
        const paidInvoices = invoices.filter(i => i.status === 'paid');

        // Customer performance
        const customerMap = new Map();
        ordersWithItems.forEach(order => {
            const customerId = order.customer_id;
            if (!customerId) return;
            
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer_id: customerId,
                    name: order.customer_name || 'Unknown',
                    total_spent: 0,
                    order_count: 0,
                    order_ids: []
                });
            }
            
            const customer = customerMap.get(customerId);
            customer.total_spent += (order.total || 0);
            customer.order_count += 1;
            customer.order_ids.push(order.salesorder_id);
        });

        // Top customers
        const topCustomers = Array.from(customerMap.values())
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 20);

        // Agent performance
        const agentPerformance = {};
        const COMMISSION_RATE = 0.05;
        
        ordersWithItems.forEach(order => {
            const agentId = order.salesperson_id;
            if (!agentId) return;
            
            const agentInfo = agentMap.get(agentId);
            if (!agentInfo) return;
            
            if (!agentPerformance[agentInfo.id]) {
                agentPerformance[agentInfo.id] = {
                    agentId: agentInfo.id,
                    agentName: agentInfo.name || 'Unknown Agent',
                    agentUid: agentInfo.id,
                    zohospID: agentInfo.zohospID,
                    totalRevenue: 0,
                    totalOrders: 0,
                    totalCommission: 0,
                    customerSet: new Set(),
                    brandSet: new Set()
                };
            }
            
            const agent = agentPerformance[agentInfo.id];
            agent.totalRevenue += order.total || 0;
            agent.totalOrders += 1;
            agent.totalCommission = agent.totalRevenue * COMMISSION_RATE;
            agent.customerSet.add(order.customer_id);
            
            // Add brands from line items
            (order.line_items || []).forEach(item => {
                if (item.vendor_id) agent.brandSet.add(item.vendor_id);
            });
        });

        // Finalize agent performance
        const finalAgentPerformance = Object.values(agentPerformance).map(agent => ({
            ...agent,
            customerCount: agent.customerSet.size,
            brandCount: agent.brandSet.size,
            avgOrderValue: agent.totalOrders > 0 ? agent.totalRevenue / agent.totalOrders : 0,
            customerSet: undefined,
            brandSet: undefined
        }));

        // Brand/Vendor performance
        const vendorPerformance = {};
        ordersWithItems.forEach(order => {
            (order.line_items || []).forEach(item => {
                const vendorId = item.vendor_id || item.brand_id;
                if (!vendorId) return;

                if (!vendorPerformance[vendorId]) {
                    const vendorInfo = vendorMap.get(vendorId);
                    vendorPerformance[vendorId] = {
                        id: vendorId,
                        name: vendorInfo?.vendor_name || item.brand || 'Unknown',
                        revenue: 0,
                        quantity: 0,
                        orders: new Set()
                    };
                }
                
                const vendor = vendorPerformance[vendorId];
                const itemTotal = item.item_total || (item.quantity * item.rate) || 0;
                vendor.revenue += itemTotal;
                vendor.quantity += (item.quantity || 0);
                vendor.orders.add(order.salesorder_id);
            });
        });

        const brands = Object.values(vendorPerformance).map(v => ({
            ...v,
            orderCount: v.orders.size,
            orders: undefined
        })).sort((a, b) => b.revenue - a.revenue);

        // Item performance
        const itemStats = {};
        ordersWithItems.forEach(order => {
            (order.line_items || []).forEach(item => {
                const itemId = item.item_id;
                if (!itemId) return;
                
                if (!itemStats[itemId]) {
                    itemStats[itemId] = {
                        id: itemId,
                        product_name: item.item_name || item.name,
                        sku: item.sku,
                        brand: item.brand || 'Unknown',
                        quantity: 0,
                        revenue: 0,
                        order_count: 0
                    };
                }
                
                const stats = itemStats[itemId];
                stats.quantity += (item.quantity || 0);
                stats.revenue += (item.item_total || (item.quantity * item.rate) || 0);
                stats.order_count += 1;
            });
        });

        const topItems = Object.values(itemStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20);

        // Return the report
        return {
            dateRange: dateRangeKey,
            generatedAt: Timestamp.now(),
            dateRangeDetails: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            metrics: {
                totalRevenue,
                totalOrders,
                averageOrderValue: avgOrderValue,
                marketplaceOrders,
                directOrders: totalOrders - marketplaceOrders,
                outstandingAmount: outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0),
                outstandingCount: outstandingInvoices.length,
                overdueAmount: overdueInvoices.reduce((sum, i) => sum + (i.balance || 0), 0),
                overdueCount: overdueInvoices.length,
                paidAmount: paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0),
                paidCount: paidInvoices.length,
                totalCustomers: customerMap.size,
                totalCommission: finalAgentPerformance.reduce((sum, a) => sum + a.totalCommission, 0),
                commissionRate: COMMISSION_RATE
            },
            performance: {
                top_customers: topCustomers,
                brands: brands,
                top_items: topItems,
                topItems: topItems // Keep for compatibility
            },
            agentPerformance: {
                agents: finalAgentPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue),
                summary: {
                    totalAgents: finalAgentPerformance.length,
                    activeAgents: finalAgentPerformance.filter(a => a.totalOrders > 0).length
                }
            },
            invoices: {
                outstanding: outstandingInvoices.slice(0, 100),
                overdue: overdueInvoices.slice(0, 100),
                paid: paidInvoices.slice(0, 100),
                summary: {
                    totalOutstanding: outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0),
                    totalOverdue: overdueInvoices.reduce((sum, i) => sum + (i.balance || 0), 0),
                    totalPaid: paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0)
                }
            },
            commission: {
                total: finalAgentPerformance.reduce((sum, a) => sum + a.totalCommission, 0),
                rate: COMMISSION_RATE,
                byAgent: finalAgentPerformance
                    .filter(a => a.totalCommission > 0)
                    .map(a => ({
                        agentId: a.agentId,
                        agentName: a.agentName,
                        commission: a.totalCommission,
                        revenue: a.totalRevenue
                    }))
            }
        };
    }

    /**
     * Optimized calculation for sales agents using subcollections
     */
    async calculateAgentMetricsForPeriod(agentId, dateRangeKey) {
        const { startDate, endDate } = this._getDateRange(dateRangeKey);
        console.log(`📊 Calculating agent ${agentId} metrics for ${dateRangeKey}`);

        // Get agent info
        const agentDoc = await this.db.collection('sales_agents').doc(agentId).get();
        if (!agentDoc.exists) throw new Error(`Agent ${agentId} not found`);
        
        const agent = { id: agentDoc.id, ...agentDoc.data() };

        // Query only from agent's subcollection
        const agentOrdersSnapshot = await this.db
            .collection('sales_agents')
            .doc(agentId)
            .collection('customers_orders')
            .where('order_date', '>=', startDate.toISOString())
            .where('order_date', '<=', endDate.toISOString())
            .get();

        console.log(`✅ Found ${agentOrdersSnapshot.size} orders for agent`);

        const agentOrders = agentOrdersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate metrics
        const totalRevenue = agentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = agentOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const COMMISSION_RATE = 0.05;
        const totalCommission = totalRevenue * COMMISSION_RATE;

        // Get unique customers
        const customerMap = new Map();
        agentOrders.forEach(order => {
            const customerId = order.customer_name;
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer_name: order.customer_name,
                    total_spent: 0,
                    order_count: 0,
                    last_order_date: order.order_date
                });
            }
            
            const customer = customerMap.get(customerId);
            customer.total_spent += order.total || 0;
            customer.order_count += 1;
            
            if (new Date(order.order_date) > new Date(customer.last_order_date)) {
                customer.last_order_date = order.order_date;
            }
        });

        const topCustomers = Array.from(customerMap.values())
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 20);

        // For detailed item/brand analysis, we need to fetch the full orders
        // But only for the specific order IDs we have
        const orderIds = agentOrders.map(o => o.sales_order_id).filter(id => id);
        
        let itemStats = {};
        let brandStats = {};
        
        if (orderIds.length > 0) {
            // Batch fetch full orders (Firestore has a limit of 10 for 'in' queries)
            const batchSize = 10;
            for (let i = 0; i < orderIds.length; i += batchSize) {
                const batch = orderIds.slice(i, i + batchSize);
                const ordersSnapshot = await this.db
                    .collection('sales_orders')
                    .where('salesorder_id', 'in', batch)
                    .get();
                
                // Fetch line items for each order
                await Promise.all(ordersSnapshot.docs.map(async (orderDoc) => {
                    const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                    
                    itemsSnapshot.docs.forEach(itemDoc => {
                        const item = itemDoc.data();
                        
                        // Item stats
                        const itemId = item.item_id;
                        if (itemId) {
                            if (!itemStats[itemId]) {
                                itemStats[itemId] = {
                                    id: itemId,
                                    product_name: item.item_name || item.name,
                                    sku: item.sku,
                                    brand: item.brand || 'Unknown',
                                    quantity: 0,
                                    revenue: 0
                                };
                            }
                            itemStats[itemId].quantity += item.quantity || 0;
                            itemStats[itemId].revenue += item.item_total || (item.quantity * item.rate) || 0;
                        }
                        
                        // Brand stats
                        const vendorId = item.vendor_id || item.brand_id;
                        if (vendorId) {
                            if (!brandStats[vendorId]) {
                                brandStats[vendorId] = {
                                    id: vendorId,
                                    name: item.brand || 'Unknown',
                                    revenue: 0,
                                    quantity: 0
                                };
                            }
                            brandStats[vendorId].revenue += item.item_total || 0;
                            brandStats[vendorId].quantity += item.quantity || 0;
                        }
                    });
                }));
            }
        }

        const topItems = Object.values(itemStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20);

        const brands = Object.values(brandStats)
            .sort((a, b) => b.revenue - a.revenue);

        return {
            dateRange: dateRangeKey,
            generatedAt: Timestamp.now(),
            agentId,
            agentName: agent.name,
            role: 'salesAgent',
            
            metrics: {
                totalRevenue,
                totalOrders,
                averageOrderValue: avgOrderValue,
                totalCommission,
                commissionRate: COMMISSION_RATE,
                totalCustomers: customerMap.size,
                activeCustomers: Array.from(customerMap.values()).filter(c => {
                    const daysSince = Math.floor((new Date() - new Date(c.last_order_date)) / (1000 * 60 * 60 * 24));
                    return daysSince <= 90;
                }).length
            },
            
            performance: {
                top_customers: topCustomers,
                top_items: topItems,
                brands: brands
            },
            
            commission: {
                total: totalCommission,
                rate: COMMISSION_RATE
            },
            
            recentOrders: agentOrders
                .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
                .slice(0, 10)
        };
    }

    /**
     * Generate reports for all date ranges
     */
    async runAllCalculations() {
        console.log("🚀 Starting optimized dashboard aggregation...");

        const dateRanges = ['today', '7_days', '30_days', 'quarter', 'year'];
        
        // Generate overall dashboard reports
        for (const range of dateRanges) {
            console.log(`\n--- Calculating metrics for: ${range} ---`);
            const reportData = await this.calculateMetricsForPeriod(range);
            
            // Save the report
            const reportRef = this.db.collection('dashboard_reports').doc(range);
            await reportRef.set(reportData);
            console.log(`✅ Report for '${range}' saved successfully.`);
        }

        // Generate agent-specific reports
        console.log("\n🎯 Generating agent-specific reports...");
        const agentsSnapshot = await this.db.collection('sales_agents').get();
        
        for (const agentDoc of agentsSnapshot.docs) {
            const agent = { id: agentDoc.id, ...agentDoc.data() };
            console.log(`\n📊 Generating reports for agent: ${agent.name} (${agent.id})`);
            
            for (const range of dateRanges) {
                const reportData = await this.calculateAgentMetricsForPeriod(agent.id, range);
                
                // Save to agent-specific sub-collection
                const reportRef = this.db
                    .collection('sales_agents')
                    .doc(agent.id)
                    .collection('dashboard_reports')
                    .doc(range);
                    
                await reportRef.set(reportData);
            }
        }

        console.log("\n🎉 All optimized dashboard reports have been generated!");
    }
}

export default OptimizedDashboardAggregator;
