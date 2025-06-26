export async function createZohoContact(req, res) {
  try {
    const contactData = req.body;
    
    // Validate required fields (only contact_name is required)
    if (!contactData.contact_name) {
      return res.status(400).json({
        success: false,
        message: 'Contact name is required'
      });
    }
    
    // Ensure contact_type is set
    const zohoPayload = {
      contact_type: 'customer', // Always set this!
      ...contactData
    };
    
    console.log('Creating Zoho contact with payload:', zohoPayload);
    const result = await createInventoryContact(zohoPayload);
    
    res.json({
      success: true,
      contact: result.contact,
      contactId: result.contact?.contact_id,
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
