// server/src/routes/webhooks.js
import express from 'express';
import { createSalesOrder } from '../api/zoho.js';

const router = express.Router();

// Validation middleware
function validateOrderData(req, res, next) {
    const { firebaseUID, customer_id, line_items } = req.body;
    
    if (!firebaseUID) {
        return res.status(400).json({ 
            success: false,
            error: 'firebaseUID is required' 
        });
    }
    
    if (!customer_id) {
        return res.status(400).json({ 
            success: false,
            error: 'customer_id is required' 
        });
    }
    
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'line_items array is required and must not be empty' 
        });
    }
    
    // Validate each line item
    for (let i = 0; i < line_items.length; i++) {
        const item = line_items[i];
        if (!item.item_id || !item.name || !item.quantity || !item.item_total) {
            return res.status(400).json({ 
                success: false,
                error: `Invalid line item at index ${i}. Required fields: item_id, name, quantity, item_total` 
            });
        }
        
        // Ensure numeric values
        if (typeof item.quantity !== 'number' || typeof item.item_total !== 'number') {
            return res.status(400).json({ 
                success: false,
                error: `Line item at index ${i}: quantity and item_total must be numbers` 
            });
        }
    }
    
    next();
}

// Main webhook endpoint to create sales order
router.post('/create-order', validateOrderData, async (req, res) => {
    try {
        console.log('📥 Received order creation request:', JSON.stringify(req.body, null, 2));
        
        const { firebaseUID, customer_id, line_items, agent_id } = req.body;
        
        // Transform the incoming data to match your existing createSalesOrder function
        const orderData = {
            zohoCustID: customer_id,
            agentZohoCRMId: agent_id || null, // Optional agent ID
            items: line_items.map(item => ({
                item_id: item.item_id,
                name: item.name,
                quantity: item.quantity,
                item_total: item.item_total
            }))
        };
        
        console.log('🔄 Transformed order data for Zoho:', JSON.stringify(orderData, null, 2));
        
        // Create sales order using your existing function
        const result = await createSalesOrder(orderData);
        
        console.log('✅ Sales order created successfully:', result.salesorder?.salesorder_number);
        
        res.status(200).json({
            success: true,
            message: 'Sales order created successfully',
            data: {
                salesorder_id: result.salesorder?.salesorder_id,
                salesorder_number: result.salesorder?.salesorder_number,
                total: result.salesorder?.total,
                status: result.salesorder?.status,
                firebaseUID: firebaseUID
            }
        });
        
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
        console.error('Full error:', error);
        
        // Handle specific Zoho API errors
        if (error.response?.data) {
            const zohoError = error.response.data;
            return res.status(400).json({
                success: false,
                message: 'Zoho API error',
                error: zohoError.message || 'Unknown Zoho error',
                code: zohoError.code
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create sales order',
            error: error.message
        });
    }
});

// Endpoint to get order status (optional)
router.get('/order-status/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // You can implement this using your Zoho API if needed
        // For now, just return a placeholder
        res.status(200).json({
            success: true,
            message: 'Order status retrieved',
            data: {
                order_id: orderId,
                status: 'pending' // This would come from Zoho
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching order status:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order status',
            error: error.message
        });
    }
});

// Test endpoint
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Webhook endpoint is working',
        timestamp: new Date().toISOString()
    });
});

export default router;