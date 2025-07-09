import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

class DashboardAggregator {
    constructor() {
        this.db = db;
        this.allTimeData = null;
    }

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
            customersSnapshot,
            itemsSnapshot
        ] = await Promise.all([
            this.db.collection('sales_orders').get(),
            this.db.collection('invoices').get(),
            this.db.collection('sales_agents').get(),
            this.db.collection('vendors').get(),
            this.db.collection('customers').get(),
            this.db.collection('items_data').get()
        ]);

        // Fetch all line items for all orders in parallel
        const ordersWithItems = await Promise.all(
            ordersSnapshot.docs.map(async (orderDoc) => {
                const orderData = orderDoc.data();
                orderData.id = orderDoc.id;
                const itemsSnapshot = await orderDoc.ref.collection('order_line_items').get();
                orderData.line_items = itemsSnapshot.docs.map(itemDoc => itemDoc.data());
                return orderData;
            })
        );
        
        // Fetch agent orders from sub-collections for better performance
        const agentOrdersMap = new Map();
        await Promise.all(
            agentsSnapshot.docs.map(async (agentDoc) => {
                const agentId = agentDoc.id;
                const customerOrdersSnapshot = await agentDoc.ref.collection('customers_orders').get();
                const agentOrders = customerOrdersSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    _agentId: agentId,
                    _agentDocId: agentDoc.id
                }));
                agentOrdersMap.set(agentId, agentOrders);
            })
        );
        
        // Create lookup maps for efficiency
        const vendorMap = new Map();
        vendorsSnapshot.docs.forEach(doc => {
            vendorMap.set(doc.id, { id: doc.id, ...doc.data() });
        });

        const agentMap = new Map();
        agentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            agentMap.set(data.zohospID || doc.id, { id: doc.id, ...data });
        });
        
        this.allTimeData = {
            orders: ordersWithItems,
            invoices: invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            agents: agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            vendors: vendorMap,
            customers: customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            items: itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            agentMap,
            agentOrdersMap
        };

        console.log(`✅ Pre-fetching complete. Found: ${this.allTimeData.orders.length} orders, ${this.allTimeData.invoices.length} invoices.`);
        return this.allTimeData;
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

        // 1. Overall Metrics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const marketplaceOrders = orders.filter(o => o.is_marketplace_order).length;

        // 2. Detailed Invoice Metrics
        const now = new Date();
        const outstandingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'void');
        const overdueInvoices = outstandingInvoices.filter(i => {
            const dueDate = new Date(i.due_date);
            return dueDate < now;
        });
        const paidInvoices = invoices.filter(i => i.status === 'paid');
        
        const outstandingAmount = outstandingInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);
        const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (i.balance || 0), 0);
        const paidAmount = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

        // Calculate days overdue for each invoice
        const invoicesWithOverdue = overdueInvoices.map(inv => ({
            ...inv,
            days_overdue: Math.floor((now - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
        }));

        // 3. Customer Performance
        const customerMap = new Map();
        
        orders.forEach(order => {
            const customerId = order.customer_id;
            if (!customerId) return;
            
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer_id: customerId,
                    name: order.customer_name || 'Unknown',
                    total_spent: 0,
                    order_count: 0,
                    first_order_date: order.order_date,
                    last_order_date: order.order_date,
                    order_ids: []
                });
            }
            
            const customer = customerMap.get(customerId);
            customer.total_spent += (order.total || 0);
            customer.order_count += 1;
            customer.order_ids.push(order.salesorder_id);
            
            // Update first and last order dates
            if (!customer.first_order_date || order.order_date < customer.first_order_date) {
                customer.first_order_date = order.order_date;
            }
            if (!customer.last_order_date || order.order_date > customer.last_order_date) {
                customer.last_order_date = order.order_date;
            }
        });

        const customersArray = Array.from(customerMap.values());
        const activeCustomers = customersArray.filter(c => {
            if (!c.last_order_date) return false;
            const daysSinceLastOrder = Math.floor((now - c.last_order_date.toDate()) / (1000 * 60 * 60 * 24));
            return daysSinceLastOrder <= 90;
        });

        // Top customers sorted by total spent
        const topCustomers = customersArray
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 50)
            .map(c => ({
                ...c,
                avg_order_value: c.order_count > 0 ? c.total_spent / c.order_count : 0,
                last_order_date: c.last_order_date?.toDate?.() || c.last_order_date
            }));

        // 4. Enhanced Agent Performance with commission using sub-collection data
        const agentPerformance = {};
        const COMMISSION_RATE = 0.05; // 5% default commission
        
        allData.agents.forEach(agent => {
            const agentId = agent.id;
            const agentOrders = allData.agentOrdersMap.get(agentId) || [];
            
            // Filter agent orders by date range
            const agentOrdersInPeriod = agentOrders.filter(order => {
                const orderDate = order.order_date ? new Date(order.order_date) : null;
                return orderDate && orderDate >= startDate && orderDate <= endDate;
            });
            
            // Calculate totals from sub-collection data
            const totalRevenue = agentOrdersInPeriod.reduce((sum, order) => sum + (order.total || 0), 0);
            const totalOrders = agentOrdersInPeriod.length;
            const totalCommission = totalRevenue * COMMISSION_RATE;
            
            // Get unique customers
            const uniqueCustomers = new Set(agentOrdersInPeriod.map(o => o.customer_name));
            
            // Get brands from the actual orders (need to look up full order data)
            const brandSet = new Set();
            agentOrdersInPeriod.forEach(agentOrder => {
                const fullOrder = orders.find(o => o.salesorder_id === agentOrder.sales_order_id);
                if (fullOrder && fullOrder.line_items) {
                    fullOrder.line_items.forEach(item => {
                        if (item.vendor_id) brandSet.add(item.vendor_id);
                    });
                }
            });
            
            agentPerformance[agentId] = {
                agentId: agent.id,
                agentName: agent.name || 'Unknown Agent',
                agentUid: agent.id,
                zohospID: agent.zohospID,
                totalRevenue,
                totalOrders,
                totalCommission,
                customerCount: uniqueCustomers.size,
                brandCount: brandSet.size,
                avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
                // Include the filtered orders for agent-specific views
                orders: agentOrdersInPeriod
            };
        });

        // Alternative calculation for agents not in the new structure (fallback)
        orders.forEach(order => {
            const agentId = order.salesperson_id;
            if (agentId && !agentPerformance[agentId]) {
                // This is a fallback for orders that might not be in the sub-collections yet
                const agentInfo = allData.agentMap.get(agentId);
                if (!agentInfo) return;
                
                agentPerformance[agentId] = {
                    agentId: agentInfo.id,
                    agentName: agentInfo.name || 'Unknown Agent',
                    agentUid: agentInfo.id,
                    zohospID: agentInfo.zohospID,
                    totalRevenue: order.total || 0,
                    totalOrders: 1,
                    totalCommission: (order.total || 0) * COMMISSION_RATE,
                    customerCount: 1,
                    brandCount: 0,
                    avgOrderValue: order.total || 0,
                    orders: []
                };
            }
        });

        // 5. Enhanced Vendor (Brand) Performance
        const vendorPerformance = {};
        const totalVendorRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                const vendorId = item.vendor_id || item.brand_id;
                if (!vendorId) return;

                if (!vendorPerformance[vendorId]) {
                    const vendorInfo = allData.vendors.get(vendorId);
                    vendorPerformance[vendorId] = {
                        id: vendorId,
                        name: vendorInfo?.vendor_name || item.brand || 'Unknown',
                        revenue: 0,
                        quantity: 0,
                        orders: new Set(),
                        items: new Set(),
                        marketplaceRevenue: 0,
                        directRevenue: 0
                    };
                }
                
                const vendor = vendorPerformance[vendorId];
                const itemTotal = item.item_total || (item.quantity * item.rate) || 0;
                vendor.revenue += itemTotal;
                vendor.quantity += (item.quantity || 0);
                vendor.orders.add(order.salesorder_id);
                vendor.items.add(item.item_id);
                
                if (order.is_marketplace_order) {
                    vendor.marketplaceRevenue += itemTotal;
                } else {
                    vendor.directRevenue += itemTotal;
                }
            });
        });
        
        const finalVendorPerformance = Object.values(vendorPerformance).map(v => ({
            ...v,
            orderCount: v.orders.size,
            uniqueItems: v.items.size,
            market_share: totalVendorRevenue > 0 ? (v.revenue / totalVendorRevenue) * 100 : 0,
            avg_order_value: v.orders.size > 0 ? v.revenue / v.orders.size : 0
        }));

        // 6. Comprehensive Item Performance
        const itemStats = {};
        orders.forEach(order => {
            (order.line_items || []).forEach(item => {
                const itemId = item.item_id;
                if (!itemId) return;
                
                if (!itemStats[itemId]) {
                    itemStats[itemId] = {
                        id: itemId,
                        product_name: item.item_name || item.name,
                        sku: item.sku,
                        brand: item.brand || 'Unknown',
                        vendor_id: item.vendor_id,
                        quantity: 0,
                        revenue: 0,
                        order_count: 0,
                        first_order_date: order.order_date,
                        last_order_date: order.order_date
                    };
                }
                
                const stats = itemStats[itemId];
                stats.quantity += (item.quantity || 0);
                stats.revenue += (item.item_total || (item.quantity * item.rate) || 0);
                stats.order_count += 1;
                
                if (order.order_date < stats.first_order_date) {
                    stats.first_order_date = order.order_date;
                }
                if (order.order_date > stats.last_order_date) {
                    stats.last_order_date = order.order_date;
                }
            });
        });
        
        const allItems = Object.values(itemStats);
        const topItems = allItems.sort((a, b) => b.revenue - a.revenue).slice(0, 50);

        // 7. Commission Summary
        const totalCommission = Object.values(agentPerformance)
            .reduce((sum, agent) => sum + agent.totalCommission, 0);

        // Final Report
        const report = {
            dateRange: dateRangeKey,
            generatedAt: Timestamp.now(),
            dateRangeDetails: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            metrics: {
                // Revenue metrics
                totalRevenue,
                totalOrders,
                averageOrderValue: avgOrderValue,
                marketplaceOrders,
                directOrders: totalOrders - marketplaceOrders,
                
                // Invoice metrics
                outstandingAmount,
                outstandingCount: outstandingInvoices.length,
                overdueAmount,
                overdueCount: overdueInvoices.length,
                paidAmount,
                paidCount: paidInvoices.length,
                
                // Customer metrics
                totalCustomers: customersArray.length,
                activeCustomers: activeCustomers.length,
                newCustomers: customersArray.filter(c => c.order_count === 1).length,
                
                // Commission
                totalCommission,
                commissionRate: COMMISSION_RATE
            },
            
            // Performance data
            performance: {
                top_customers: topCustomers,
                brands: finalVendorPerformance.sort((a, b) => b.revenue - a.revenue),
                top_items: topItems,
                topItems: topItems // Keep both for compatibility
            },
            
            // Agent performance
            agentPerformance: {
                agents: Object.values(agentPerformance)
                    .filter(a => a.totalOrders > 0)
                    .sort((a, b) => b.totalRevenue - a.totalRevenue),
                summary: {
                    totalAgents: Object.keys(agentPerformance).length,
                    activeAgents: Object.values(agentPerformance).filter(a => a.totalOrders > 0).length
                }
            },
            
            // Invoice details
            invoices: {
                outstanding: outstandingInvoices.slice(0, 100),
                overdue: invoicesWithOverdue.slice(0, 100),
                paid: paidInvoices.slice(0, 100),
                summary: {
                    totalOutstanding: outstandingAmount,
                    totalOverdue: overdueAmount,
                    totalPaid: paidAmount,
                    avgDaysOverdue: invoicesWithOverdue.length > 0 
                        ? invoicesWithOverdue.reduce((sum, inv) => sum + inv.days_overdue, 0) / invoicesWithOverdue.length 
                        : 0
                }
            },
            
            // Commission details
            commission: {
                total: totalCommission,
                rate: COMMISSION_RATE,
                byAgent: Object.values(agentPerformance)
                    .filter(a => a.totalCommission > 0)
                    .map(a => ({
                        agentId: a.agentId,
                        agentName: a.agentName,
                        commission: a.totalCommission,
                        revenue: a.totalRevenue
                    }))
            }
        };

        return report;
    }

    async runAllCalculations() {
        console.log("🚀 Starting dashboard aggregation process...");
        this.allTimeData = null; // Clear cache for a fresh run
        await this._getAllTimeData(); // Pre-fetch all data

        const dateRanges = ['today', '7_days', '30_days', 'quarter', 'year'];
        
        // Generate overall dashboard reports
        for (const range of dateRanges) {
            console.log(`\n--- Calculating metrics for: ${range} ---`);
            const reportData = await this.calculateMetricsForPeriod(range);
            
            // Save the report to Firestore
            const reportRef = this.db.collection('dashboard_reports').doc(range);
            await reportRef.set(reportData);
            console.log(`✅ Report for '${range}' saved successfully.`);
        }

        // Generate agent-specific reports
        console.log("\n🎯 Generating agent-specific reports...");
        await this.generateAgentReports(dateRanges);

        console.log("\n🎉 All dashboard reports have been generated and saved!");
    }

    /**
     * Generates individual reports for each agent using their sub-collection data
     */
    async generateAgentReports(dateRanges) {
        const allData = await this._getAllTimeData();
        
        for (const agent of allData.agents) {
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
    }

    /**
     * Calculates metrics specifically for an agent using their sub-collection
     */
    async calculateAgentMetricsForPeriod(agentId, dateRangeKey) {
        const { startDate, endDate } = this._getDateRange(dateRangeKey);
        const allData = await this._getAllTimeData();
        
        const agent = allData.agents.find(a => a.id === agentId);
        if (!agent) throw new Error(`Agent ${agentId} not found`);
        
        const agentOrders = allData.agentOrdersMap.get(agentId) || [];
        
        // Filter agent's orders by date range
        const ordersInPeriod = agentOrders.filter(order => {
            const orderDate = order.order_date ? new Date(order.order_date) : null;
            return orderDate && orderDate >= startDate && orderDate <= endDate;
        });
        
        // Calculate agent-specific metrics
        const totalRevenue = ordersInPeriod.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = ordersInPeriod.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const COMMISSION_RATE = 0.05;
        const totalCommission = totalRevenue * COMMISSION_RATE;
        
        // Get unique customers
        const customerMap = new Map();
        ordersInPeriod.forEach(order => {
            const customerId = order.customer_name; // Using name as ID since that's what's stored
            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    customer_name: order.customer_name,
                    total_spent: 0,
                    order_count: 0,
                    last_order_date: order.order_date,
                    order_ids: []
                });
            }
            
            const customer = customerMap.get(customerId);
            customer.total_spent += order.total || 0;
            customer.order_count += 1;
            customer.order_ids.push(order.sales_order_id);
            
            if (new Date(order.order_date) > new Date(customer.last_order_date)) {
                customer.last_order_date = order.order_date;
            }
        });
        
        const topCustomers = Array.from(customerMap.values())
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 20);
        
        // Get items data from full orders
        const itemStats = {};
        const brandStats = {};
        
        for (const agentOrder of ordersInPeriod) {
            const fullOrder = allData.orders.find(o => o.salesorder_id === agentOrder.sales_order_id);
            if (!fullOrder || !fullOrder.line_items) continue;
            
            fullOrder.line_items.forEach(item => {
                // Item stats
                const itemId = item.item_id;
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
                
                // Brand stats
                const vendorId = item.vendor_id || item.brand_id;
                if (vendorId) {
                    if (!brandStats[vendorId]) {
                        const vendorInfo = allData.vendors.get(vendorId);
                        brandStats[vendorId] = {
                            id: vendorId,
                            name: vendorInfo?.vendor_name || item.brand || 'Unknown',
                            revenue: 0,
                            quantity: 0
                        };
                    }
                    brandStats[vendorId].revenue += item.item_total || 0;
                    brandStats[vendorId].quantity += item.quantity || 0;
                }
            });
        }
        
        const topItems = Object.values(itemStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 20);
        
        // Get agent's invoices (would need invoice data to have agent association)
        // For now, returning empty invoice data
        
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
                brands: Object.values(brandStats).sort((a, b) => b.revenue - a.revenue)
            },
            
            commission: {
                total: totalCommission,
                rate: COMMISSION_RATE
            },
            
            // Include limited order data for recent orders display
            recentOrders: ordersInPeriod
                .sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
                .slice(0, 10)
        };
    }
}

export default DashboardAggregator;