// server/src/routes/email.js
import express from 'express';
import postmark from 'postmark';

const router = express.Router();

// Lazy initialization of Postmark client
let client = null;

function getPostmarkClient() {
  if (!client) {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    if (!token) {
      throw new Error('POSTMARK_SERVER_TOKEN environment variable is not set');
    }
    client = new postmark.ServerClient(token);
  }
  return client;
}

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
    
    const result = await getPostmarkClient().sendEmail(emailData);
    
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
    
    const result = await getPostmarkClient().sendEmail(emailData);
    
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

export default router;