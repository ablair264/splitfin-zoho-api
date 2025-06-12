// server/src/services/dataNormalizerService.js
// This service normalizes data from all sources into a consistent format

class DataNormalizerService {
  /**
   * Normalize order data from any source
   */
  normalizeOrder(order, source = 'unknown') {
    // Handle different date formats
    const normalizeDate = (dateValue) => {
      if (!dateValue) return new Date().toISOString();
      
      // Firestore Timestamp
      if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate().toISOString();
      }
      
      // Already an ISO string
      if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue;
      }
      
      // Date object
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      
      // Try to parse
      try {
        return new Date(dateValue).toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    // Extract customer name with all possible variations
    const customerName = 
      order.customer_name || 
      order.customerName || 
      order.customer || 
      order.Customer ||
      order.line_items?.[0]?.customer_name ||
      'Unknown Customer';

    // Extract salesperson info
    const salespersonId = 
      order.salesperson_id || 
      order.agent_id || 
      order.agentInventoryId ||
      order.cf_agent ||
      null;

    const salespersonName = 
      order.salesperson_name || 
      order.agent_name || 
      order.agentName ||
      order.agent ||
      'Unknown';

    // Calculate total with multiple fallbacks
    const calculateTotal = () => {
      // Direct total fields
      if (order.total !== undefined && order.total !== null) {
        return parseFloat(order.total);
      }
      if (order.orderTotal !== undefined && order.orderTotal !== null) {
        return parseFloat(order.orderTotal);
      }
      if (order.amount !== undefined && order.amount !== null) {
        return parseFloat(order.amount);
      }
      
      // Calculate from line items
      if (order.line_items && Array.isArray(order.line_items)) {
        return order.line_items.reduce((sum, item) => {
          const itemTotal = 
            item.item_total || 
            item.total || 
            (item.price * (item.quantity || item.qty || 1)) || 
            0;
          return sum + parseFloat(itemTotal);
        }, 0);
      }
      
      return 0;
    };

    // Normalize line items
    const normalizeLineItems = () => {
      if (!order.line_items || !Array.isArray(order.line_items)) {
        return [];
      }
      
      return order.line_items.map(item => ({
        item_id: item.item_id || item.id || item.product_id,
        name: item.name || item.item_name || item.product_name || 'Unknown Item',
        sku: item.sku || item.SKU || '',
        brand: item.brand || item.Brand || 'Unknown Brand',
        quantity: parseInt(item.quantity || item.qty || 1),
        price: parseFloat(item.price || item.rate || 0),
        total: parseFloat(
          item.item_total || 
          item.total || 
          (item.price * (item.quantity || item.qty || 1)) || 
          0
        )
      }));
    };

    // Extract brand - try from order level first, then from items
    const extractBrand = () => {
      // Order level brand
      if (order.brand || order.Brand) {
        return order.brand || order.Brand;
      }
      
      // Get from first line item
      const lineItems = normalizeLineItems();
      if (lineItems.length > 0 && lineItems[0].brand !== 'Unknown Brand') {
        return lineItems[0].brand;
      }
      
      return 'Unknown Brand';
    };

    // Normalize status
    const normalizeStatus = () => {
      const status = (order.status || order.Status || 'pending').toLowerCase();
      
      // Map various statuses to standard ones
      const statusMap = {
        'confirmed': 'confirmed',
        'completed': 'confirmed',
        'closed': 'confirmed',
        'draft': 'draft',
        'pending': 'draft',
        'open': 'draft',
        'cancelled': 'cancelled',
        'canceled': 'cancelled'
      };
      
      return statusMap[status] || status;
    };

    return {
      // IDs
      id: order.id || order.salesorder_id || order.orderID || order.order_id,
      order_number: order.salesorder_number || order.order_number || order.orderNumber || order.id,
      
      // Customer info
      customer_id: order.customer_id || order.customerID || order.customer,
      customer_name: customerName,
      
      // Agent/Salesperson info
      salesperson_id: salespersonId,
      salesperson_name: salespersonName,
      
      // Order details
      date: normalizeDate(order.date || order.createdAt || order.created_at || order.order_date),
      total: calculateTotal(),
      status: normalizeStatus(),
      
      // Brand (extracted from order or items)
      brand: extractBrand(),
      
      // Line items
      line_items: normalizeLineItems(),
      
      // Source tracking
      _source: source,
      _originalId: order.id || order.salesorder_id,
      
      // Additional fields that might be needed
      currency: order.currency_code || 'GBP',
      notes: order.notes || order.customer_notes || ''
    };
  }

  /**
   * Normalize invoice data
   */
  normalizeInvoice(invoice, source = 'unknown') {
    const normalizeDate = (dateValue) => {
      if (!dateValue) return new Date().toISOString();
      if (typeof dateValue === 'string') return dateValue;
      if (dateValue instanceof Date) return dateValue.toISOString();
      if (dateValue?.toDate) return dateValue.toDate().toISOString();
      return new Date().toISOString();
    };

    const calculateDaysOverdue = (dueDate) => {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      
      if (due >= today) return 0;
      
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    return {
      // IDs
      id: invoice.id || invoice.invoice_id || invoice.invoiceID,
      invoice_number: invoice.invoice_number || invoice.number || invoice.id,
      
      // Customer info
      customer_id: invoice.customer_id || invoice.customerID || invoice.contact_id,
      customer_name: invoice.customer_name || invoice.customerName || invoice.customer || 'Unknown',
      
      // Invoice details
      date: normalizeDate(invoice.date || invoice.invoice_date || invoice.created_at),
      due_date: normalizeDate(invoice.due_date || invoice.dueDate),
      
      // Amounts
      total: parseFloat(invoice.total || invoice.amount || 0),
      balance: parseFloat(invoice.balance || invoice.balance_due || invoice.outstanding || 0),
      paid: parseFloat(invoice.paid || invoice.amount_paid || 0),
      
      // Status
      status: (invoice.status || 'unpaid').toLowerCase(),
      days_overdue: invoice.daysOverdue || calculateDaysOverdue(invoice.due_date || invoice.dueDate),
      
      // Source tracking
      _source: source,
      _originalId: invoice.id || invoice.invoice_id
    };
  }

  /**
   * Normalize customer data
   */
  normalizeCustomer(customer, source = 'unknown') {
    return {
      id: customer.id || customer.customer_id || customer.customerId || customer.contact_id,
      name: customer.name || customer.customer_name || customer.Account_Name || customer.company_name || 'Unknown',
      email: customer.email || customer.Email || customer.contact_email || '',
      phone: customer.phone || customer.Phone || customer.mobile || '',
      
      // Metrics
      total_spent: parseFloat(customer.totalSpent || customer.total_spent || customer.revenue || 0),
      order_count: parseInt(customer.orderCount || customer.order_count || customer.orders || 0),
      
      // Dates
      first_order_date: customer.firstOrderDate || customer.first_order_date || null,
      last_order_date: customer.lastOrderDate || customer.last_order_date || null,
      
      // Segmentation
      segment: customer.segment || customer.Segment || 'Low',
      status: customer.status || 'active',
      
      // Agent assignment
      assigned_agent_id: customer.agentID || customer.agent_id || customer.salesperson_id || null,
      
      // Source tracking
      _source: source,
      _originalId: customer.id || customer.customer_id
    };
  }

  /**
   * Normalize agent/salesperson data
   */
  normalizeAgent(agent, source = 'unknown') {
    return {
      id: agent.agentId || agent.id || agent.salesperson_id,
      inventory_id: agent.zohospID || agent.inventoryId || agent.salesperson_id,
      crm_id: agent.agentID || agent.crmId || agent.agentId,
      
      name: agent.agentName || agent.name || agent.salesperson_name || 'Unknown',
      email: agent.agentEmail || agent.email || agent.Email || '',
      
      // Metrics
      total_revenue: parseFloat(agent.totalRevenue || agent.revenue || agent.total_revenue || 0),
      total_orders: parseInt(agent.totalOrders || agent.orders || agent.total_orders || 0),
      customer_count: parseInt(agent.customers || agent.customer_count || 0),
      average_order_value: parseFloat(agent.averageOrderValue || agent.aov || 0),
      
      // Source tracking
      _source: source,
      _originalId: agent.id || agent.agentId
    };
  }

  /**
   * Normalize dashboard data structure
   */
  normalizeDashboardData(data, userId) {
    if (!data) return null;

    // Normalize orders
    const normalizeOrders = (orders) => {
      if (!orders) return [];
      
      if (Array.isArray(orders)) {
        return orders.map(order => this.normalizeOrder(order, 'dashboard'));
      }
      
      if (orders.salesOrders?.latest) {
        return orders.salesOrders.latest.map(order => this.normalizeOrder(order, 'dashboard'));
      }
      
      return [];
    };

    // Normalize invoices
    const normalizeInvoices = (invoices) => {
      if (!invoices) return { all: [], outstanding: [], overdue: [], paid: [] };
      
      const normalized = {
        all: [],
        outstanding: [],
        overdue: [],
        paid: []
      };
      
      ['all', 'outstanding', 'overdue', 'paid'].forEach(type => {
        if (invoices[type] && Array.isArray(invoices[type])) {
          normalized[type] = invoices[type].map(inv => this.normalizeInvoice(inv, 'dashboard'));
        }
      });
      
      return normalized;
    };

    // Build normalized structure
    return {
      userId,
      role: data.role || 'unknown',
      dateRange: data.dateRange || '30_days',
      
      // Overview metrics
      metrics: {
        totalRevenue: 
          data.revenue?.grossRevenue || 
          data.overview?.sales?.totalRevenue || 
          0,
        totalOrders: 
          data.orders?.salesOrders?.total || 
          data.overview?.sales?.totalOrders || 
          0,
        averageOrderValue: 
          data.orders?.salesOrders?.averageValue || 
          data.overview?.sales?.averageOrderValue || 
          0,
        totalCustomers: 
          data.overview?.customers?.totalCustomers || 
          0,
        outstandingInvoices: 
          data.invoices?.summary?.totalOutstanding || 
          0
      },
      
      // Orders
      orders: normalizeOrders(data.orders?.salesOrders?.latest || data.orders),
      
      // Invoices
      invoices: normalizeInvoices(data.invoices),
      
      // Performance data
      performance: {
        brands: (data.performance?.brands || []).map(brand => ({
          name: brand.brand || 'Unknown',
          revenue: brand.revenue || 0,
          quantity: brand.quantity || 0,
          market_share: brand.marketShare || 0
        })),
        
        top_customers: (data.overview?.customers?.topCustomers || []).map(customer => 
          this.normalizeCustomer(customer, 'dashboard')
        ),
        
        top_items: (data.overview?.topItems || data.performance?.topItems || []).map(item => ({
          id: item.itemId || item.item_id,
          name: item.name || 'Unknown',
          brand: item.brand || 'Unknown',
          quantity: item.quantity || 0,
          revenue: item.revenue || 0
        }))
      },
      
      // Agent specific data
      commission: data.commission || null,
      
      // Manager specific data
      agentPerformance: data.agentPerformance ? {
        agents: (data.agentPerformance.agents || []).map(agent => 
          this.normalizeAgent(agent, 'dashboard')
        ),
        summary: data.agentPerformance.summary || {}
      } : null,
      
      // Metadata
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      dataSource: data.dataSource || 'unknown',
      loadTime: data.loadTime || 0
    };
  }
}

export default new DataNormalizerService();