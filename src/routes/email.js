// server/src/routes/email.js - with Postmark-specific error handling
router.post('/customer-signup-notification', async (req, res) => {
  try {
    const { to, pendingCustomer, pendingCustomerId } = req.body;
    
    // Validate required fields
    if (!to || !pendingCustomer) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, pendingCustomer' 
      });
    }
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1f2a;">New Customer Signup Request</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Company:</strong> ${pendingCustomer.companyName}</p>
          <p><strong>Contact:</strong> ${pendingCustomer.contactName}</p>
          <p><strong>Email:</strong> ${pendingCustomer.email}</p>
          <p><strong>Phone:</strong> ${pendingCustomer.phone}</p>
          <p><strong>Address:</strong> ${pendingCustomer.address}</p>
          ${pendingCustomer.vatNumber ? `<p><strong>VAT Number:</strong> ${pendingCustomer.vatNumber}</p>` : ''}
          ${pendingCustomer.website ? `<p><strong>Website:</strong> ${pendingCustomer.website}</p>` : ''}
          ${pendingCustomer.message ? `<p><strong>Message:</strong> ${pendingCustomer.message}</p>` : ''}
        </div>
        <a href="${process.env.APP_URL}/customers/approvals" 
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Review Request
        </a>
      </div>
    `;
    
    const result = await sendEmail({
      to,
      subject: 'New Customer Signup Request - Action Required',
      html: emailHtml
    });
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId 
    });
    
  } catch (error) {
    console.error('Email error:', error);
    
    // Postmark specific error codes
    if (error.ErrorCode) {
      switch (error.ErrorCode) {
        case 401:
          return res.status(401).json({ 
            error: 'Invalid Postmark API token' 
          });
        case 422:
          return res.status(422).json({ 
            error: 'Invalid email data',
            details: error.Message 
          });
        case 400:
          return res.status(400).json({ 
            error: 'Bad request',
            details: error.Message 
          });
        case 500:
          return res.status(500).json({ 
            error: 'Postmark server error',
            details: error.Message 
          });
        default:
          return res.status(500).json({ 
            error: 'Email service error',
            code: error.ErrorCode,
            details: error.Message 
          });
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to send email', 
      message: error.message 
    });
  }
});