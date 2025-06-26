import { createInventoryContact } from '../api/zoho.js';

export async function createZohoContact(req, res) {
  try {
    const contactData = req.body;
    
    // Validate required fields
    if (!contactData.contact_name || !contactData.email) {
      return res.status(400).json({
        success: false,
        message: 'Contact name and email are required'
      });
    }

    console.log('Creating Zoho contact:', contactData.email);
    const result = await createInventoryContact(contactData);
    
    res.json({
      success: true,
      contact: result.contact,
      message: 'Contact created successfully in Zoho Inventory'
    });
  } catch (error) {
    console.error('Error creating Zoho contact:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create contact in Zoho',
      error: error.response?.data || error.message
    });
  }
}