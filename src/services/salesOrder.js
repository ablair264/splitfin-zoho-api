// server/src/services/salesOrder.js
import { getAccessToken } from '../api/zoho.js';
import axios from 'axios';

export async function createZohoSalesOrder(req, res) {
  try {
    const orderData = req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Missing order data' });
    }

    const accessToken = await getAccessToken();
    
    const response = await axios.post(
      'https://www.zohoapis.eu/inventory/v1/salesorders',
      orderData,
      {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
          'X-com-zoho-inventory-organizationid': process.env.ZOHO_ORG_ID
        }
      }
    );
    
    if (response.data.code === 0) {
      // Return in the format your frontend expects
      res.json({ 
        success: true, 
        zohoSalesOrder: {
          salesorder_id: response.data.salesorder.salesorder_id,
          salesorder_number: response.data.salesorder.salesorder_number,
          ...response.data.salesorder
        }
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: response.data.message 
      });
    }
  } catch (error) {
    console.error('Error creating Zoho sales order:', error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }
}