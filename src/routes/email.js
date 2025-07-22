// server/src/routes/email.js
import express from 'express';
import postmark from 'postmark';

const router = express.Router();

// Initialize Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN || 'be720a82-b526-482d-a9dd-c9a8357999ac');

router.post('/send-login-details', async (req, res) => {
  try {
    const { email, password, customerName } = req.body;
    
    const emailData = {
      From: process.env.POSTMARK_FROM_EMAIL || 'noreply@splitfin.com',
      To: email,
      Subject: 'Your Splitfin Account Has Been Created',
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1f2a;">Welcome to Splitfin!</h1>
          <p>Dear ${customerName},</p>
          <p>Your account has been created successfully. You can now log in to track your orders and manage your account.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1f2a; margin-top: 0;">Your Login Details</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
          </div>
          
          <p>For security reasons, please change your password after your first login.</p>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.APP_URL}/customer/login" 
               style="background: #79d5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Login to Your Account
            </a>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The Splitfin Team</p>
        </div>
      `,
      TextBody: `
        Welcome to Splitfin!
        
        Dear ${customerName},
        
        Your account has been created successfully. You can now log in to track your orders and manage your account.
        
        Your Login Details:
        Email: ${email}
        Temporary Password: ${password}
        
        For security reasons, please change your password after your first login.
        
        Login to your account: ${process.env.APP_URL}/customer/login
        
        If you have any questions, please don't hesitate to contact our support team.
        
        Best regards,
        The Splitfin Team
      `,
      MessageStream: 'outbound'
    };
    
    const result = await client.sendEmail(emailData);
    
    res.json({ 
      success: true, 
      message: 'Login details sent successfully',
      messageId: result.MessageID 
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Optional: Send order confirmation email
router.post('/send-order-confirmation', async (req, res) => {
  try {
    const { email, customerName, orderNumber, orderTotal, items } = req.body;
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
    
    const emailData = {
      From: process.env.POSTMARK_FROM_EMAIL || 'orders@splitfin.com',
      To: email,
      Subject: `Order Confirmation - ${orderNumber}`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1f2a;">Order Confirmation</h1>
          <p>Dear ${customerName},</p>
          <p>Thank you for your order! We've received your order and it's being processed.</p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1f2a; margin-top: 0;">Order Details</h2>
            <p><strong>Order Number:</strong> ${orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <h3>Items Ordered:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Quantity</th>
                <th style="padding: 8px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">£${orderTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <p style="margin-top: 30px;">You can track your order status by logging into your account.</p>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.APP_URL}/customer/orders" 
               style="background: #79d5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Track Your Order
            </a>
          </div>
          
          <p>Best regards,<br>The Splitfin Team</p>
        </div>
      `,
      MessageStream: 'outbound'
    };
    
    const result = await client.sendEmail(emailData);
    
    res.json({ 
      success: true, 
      message: 'Order confirmation sent successfully',
      messageId: result.MessageID 
    });
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Catalog Request Email
router.post('/catalogue-request', async (req, res) => {
  try {
    const { name, company, email, phone, address, city, postcode, country, catalogues, message, submittedAt } = req.body;
    
    // Format catalogues list
    const cataloguesList = catalogues.map(cat => `<li style="padding: 4px 0;">${cat}</li>`).join('');
    
    const emailData = {
      From: process.env.POSTMARK_FROM_EMAIL || 'noreply@dmbrands.co.uk',
      To: 'sales@dmbrands.co.uk',
      Subject: `Catalogue Request from ${name} - ${company}`,
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #faf8f9; padding: 20px;">
          <div style="background: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(45, 27, 32, 0.08); overflow: hidden;">
            <!-- Header with gradient -->
            <div style="background: linear-gradient(135deg, #c58390 0%, #965251 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">New Catalogue Request</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Received ${new Date(submittedAt).toLocaleString('en-GB')}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <!-- Customer Details -->
              <div style="background: #f9f7f8; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #2d1b20; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #f5f3f4;">Customer Information</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #5c4a4f; width: 120px; font-weight: 500;">Name:</td>
                    <td style="padding: 8px 0; color: #2d1b20;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #5c4a4f; font-weight: 500;">Company:</td>
                    <td style="padding: 8px 0; color: #2d1b20;">${company}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #5c4a4f; font-weight: 500;">Email:</td>
                    <td style="padding: 8px 0; color: #2d1b20;"><a href="mailto:${email}" style="color: #c58390; text-decoration: none;">${email}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #5c4a4f; font-weight: 500;">Phone:</td>
                    <td style="padding: 8px 0; color: #2d1b20;">${phone}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Shipping Address -->
              <div style="background: #f9f7f8; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #2d1b20; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #f5f3f4;">Shipping Address</h2>
                <p style="color: #2d1b20; margin: 5px 0; line-height: 1.6;">
                  ${address}<br>
                  ${city}<br>
                  ${postcode}<br>
                  ${country}
                </p>
              </div>
              
              <!-- Requested Catalogues -->
              <div style="background: #f9f7f8; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #2d1b20; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #f5f3f4;">Requested Catalogues</h2>
                <ul style="margin: 0; padding-left: 20px; color: #2d1b20;">
                  ${cataloguesList}
                </ul>
              </div>
              
              <!-- Additional Message -->
              ${message ? `
              <div style="background: #f9f7f8; border-radius: 12px; padding: 20px;">
                <h2 style="color: #2d1b20; font-size: 20px; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #f5f3f4;">Additional Information</h2>
                <p style="color: #2d1b20; margin: 0; line-height: 1.6;">${message}</p>
              </div>
              ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="background: #f5f3f4; padding: 20px; text-align: center;">
              <p style="color: #8a7a7f; margin: 0; font-size: 14px;">This email was sent from the DM Brands customer portal</p>
            </div>
          </div>
        </div>
      `,
      TextBody: `
        New Catalogue Request
        Received: ${new Date(submittedAt).toLocaleString('en-GB')}
        
        CUSTOMER INFORMATION
        Name: ${name}
        Company: ${company}
        Email: ${email}
        Phone: ${phone}
        
        SHIPPING ADDRESS
        ${address}
        ${city}
        ${postcode}
        ${country}
        
        REQUESTED CATALOGUES
        ${catalogues.join('\n')}
        
        ${message ? `ADDITIONAL INFORMATION\n${message}` : ''}
      `,
      MessageStream: 'outbound'
    };
    
    const result = await client.sendEmail(emailData);
    
    res.json({ 
      success: true, 
      message: 'Catalogue request sent successfully',
      messageId: result.MessageID 
    });
  } catch (error) {
    console.error('Error sending catalogue request:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;