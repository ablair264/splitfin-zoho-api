import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class DashboardAggregator {
    constructor() {
        this.db = db;
        this.allTimeData = null; // Cache data for a single run
    }

    /**
     * Fetches all necessary base data from Firestore once per run.
     * This pre-fetching strategy is a major performance optimization.
     */
    async _getAllTimeData() {
        if (this.allTimeData) {
            return this.allTimeData;
        }

        console.log("⏳ Pre-fetching all required data from Firestore for aggregation...");

        const [
            ordersSnapshot,
            invoicesSnapshot,
            agentsSnapshot,
            vendorsSnapshot,
            customersSnapshot
        ] = await Promise.all([
            this.db.collection('sales_orders').get(),
            this.db.collection('invoices').get(),
            this.db.collection('sales_agents').get(),
            this.db.collection('vendors').get(),
            this.db.collection('customers').get()
        ]);

        // Fetch all line items for all orders in parallel
        const ordersWithItems = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = orderDoc.data();
                orderData.id = orderDoc.id;
                // Assuming line items are in the 'order_line_items' sub-collection
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                return orderData;
            })
        );
        
        this.allTimeData = {
            orders: ordersWithItems,
            invoices: invoicesSnapshot.docs.map(doc => doc.data()),
            agents: agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            vendors: vendorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            customers: customersSnapshot.docs.map(doc => doc.data())
        };

        console.log(`✅ Pre-fetching complete. Found: ${this.allTimeData.orders.length} orders, ${this.allTimeData.invoices.length} invoices.`);
        return this.allTimeData;
    }

    /**
     * Calculates start and end dates for a given range key.
     */
    _getDateRange(rangeKey) {
        const endDate = new Date();
        let startDate = new Date();

        switch (rangeKey) {
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
                startDate.setMonth(endDate.getMonth() - 1); // Default to 30 days
        }
        return { startDate, endDate };
    }

    /**
     * Main calculation function. Aggregates all metrics for a given period.
     */
    async calculateMetricsForPeriod(dateRangeKey) {
        const { startDate, endDate } = this._getDateRange(dateRangeKey);
        const allData = await this._getAllTimeData();

        // Filter data for the specified period
        const orders = allData.orders.filter(o => {
            if (!o.order_date || !o.order_date.toDate) return false;
            const orderDate = o.order_date.toDate();
            return orderDate >= startDate && orderDate <= endDate;
        });

        const invoices = allData.invoices.filter(i => {
            if (!i.date) return false;
            const invoiceDate = new Date(i.date);
            return invoiceDate >= startDate && invoiceDate <= endDate;
        });

        // --- Perform Calculations ---

        // 1. Overall Metrics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const marketplaceOrders = orders.filter(o => o.is_marketplace_order).length;

        // 2. Invoice Metrics
        const outstandingInvoices = invoices.filter(i => i.status !== 'paid');
        const overdueInvoices = outstandingInvoices.filter(i => new Date(i.due_date) < new Date());
        const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);
        const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);

        // 3. Agent Performance
        const agentPerformance = {};
        allData.agents.forEach(agent => {
            const agentId = agent.zohospID || agent.id;
            agentPerformance[agentId] = {
                agentName: agent.name,
                agentUid: agent.id,
                totalRevenue: 0,
                totalOrders: 0,
            };
        });

        orders.forEach(order => {
            const agentId = order.salesperson_id;
            if (agentId && agentPerformance[agentId]) {
                agentPerformance[agentId].totalRevenue += (order.total || 0);
                agentPerformance[agentId].totalOrders += 1;
            }
        });

        // 4. Vendor (Brand) Performance
        const vendorPerformance = {};
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                const vendorId = item.vendor_id;
                if (!vendorId) return;

                if (!vendorPerformance[vendorId]) {
                    const vendorInfo = allData.vendors.find(v => v.id === vendorId);
                    vendorPerformance[vendorId] = {
                        name: vendorInfo?.vendor_name || 'Unknown Vendor',
                        revenue: 0,
                        quantity: 0,
                        orders: new Set()
                    };
                }
                vendorPerformance[vendorId].revenue += (item.item_total || 0);
                vendorPerformance[vendorId].quantity += (item.quantity || 0);
                vendorPerformance[vendorId].orders.add(order.id);
            });
        });
        
        const finalVendorPerformance = Object.values(vendorPerformance).map(v => ({
            ...v,
            orderCount: v.orders.size,
        }));

        // 5. Top Items
        const itemStats = {};
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                if (!itemStats[item.item_id]) {
                    itemStats[item.item_id] = {
                        id: item.item_id,
                        name: item.item_name,
                        sku: item.sku,
                        quantity: 0,
                        revenue: 0,
                    };
                }
                itemStats[item.item_id].quantity += (item.quantity || 0);
                itemStats[item.item_id].revenue += (item.item_total || 0);
            });
        });
        const topItems = Object.values(itemStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // --- Assemble Final Report ---
        const report = {
            dateRange: dateRangeKey,
            generatedAt: Timestamp.now(),
            metrics: {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                marketplaceOrders,
                outstandingAmount,
                overdueAmount,
                totalCustomers: allData.customers.length,
            },
            agentPerformance: Object.values(agentPerformance).sort((a, b) => b.totalRevenue - a.totalRevenue),
            vendorPerformance: finalVendorPerformance.sort((a, b) => b.revenue - a.revenue),
            topItems,
        };

        return report;
    }

    /**
     * Runs all calculations and saves them to Firestore.
     */
    async runAllCalculations() {
        console.log("🚀 Starting dashboard aggregation process...");
        this.allTimeData = null; // Clear cache for a fresh run
        await this._getAllTimeData(); // Pre-fetch all data

        const dateRanges = ['7_days', '30_days', 'quarter', 'year'];
        
        for (const range of dateRanges) {
            console.log(`\n--- Calculating metrics for: ${range} ---`);
            const reportData = await this.calculateMetricsForPeriod(range);
            
            // Save the report to Firestore
            const reportRef = this.db.collection('dashboard_reports').doc(range);
            await reportRef.set(reportData);
            console.log(`✅ Report for '${range}' saved successfully.`);
        }

        console.log("\n🎉 All dashboard reports have been generated and saved!");
    }
}

export default DashboardAggregator;
