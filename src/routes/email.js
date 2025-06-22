// server/src/routes/email.js
import express from 'express';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();

// Send notification when customer signs up
router.post('/customer-signup-notification', async (req, res) => {
  try {
    const { to, pendingCustomer, pendingCustomerId } = req.body;
    
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
    
    await sendEmail({
      to,
      subject: 'New Customer Signup Request - Action Required',
      html: emailHtml
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send approval/rejection email to customer
router.post('/customer-approval', async (req, res) => {
  try {
    const { to, status, tempPassword, loginUrl, message } = req.body;
    
    let subject, emailHtml;
    
    if (status === 'approved') {
      subject = 'Welcome to Splitfin - Your Account is Approved!';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Your Splitfin Account Has Been Approved!</h2>
          <p>Welcome to Splitfin! We're excited to have you as our customer.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Login Details:</h3>
            <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            <p><strong>Email:</strong> ${to}</p>
            <p><strong>Temporary Password:</strong> <code style="background: #e5e5e5; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <p style="color: #ef4444;"><strong>Important:</strong> Please login and change your password immediately for security.</p>
          <a href="${loginUrl}" 
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Login to Your Account
          </a>
        </div>
      `;
    } else if (status === 'declined') {
      subject = 'Splitfin Account Application Update';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Account Application Update</h2>
          <p>Thank you for your interest in Splitfin.</p>
          <p>Unfortunately, we are unable to approve your account at this time.</p>
          ${message ? `
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message from our team:</strong></p>
              <p>${message}</p>
            </div>
          ` : ''}
          <p>If you have any questions, please contact our sales team.</p>
        </div>
      `;
    } else if (status === 'pending') {
      subject = 'Splitfin Account Application - Pending Review';
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #fbbf24;">Account Application Update</h2>
          <p>Thank you for your patience. Your application is still under review.</p>
          ${message ? `
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Message from our team:</strong></p>
              <p>${message}</p>
            </div>
          ` : ''}
          <p>We'll contact you as soon as a decision has been made.</p>
        </div>
      `;
    }
    
    await sendEmail({
      to,
      subject,
      html: emailHtml
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/order-confirmation', async (req, res) => {
  try {
    const { to, orderNumber, customerName, items, total, deliveryAddress } = req.body;
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">£${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');
    
    const addressHtml = deliveryAddress.map(line => `${line}<br>`).join('');
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Order Confirmed!</h2>
        <p>Dear ${customerName},</p>
        <p>Your order #${orderNumber} has been confirmed and is being processed.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px; border-bottom: 2px solid #ddd;">Item</th>
                <th style="text-align: center; padding: 8px; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="text-align: right; padding: 8px; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 8px; text-align: right; font-weight: bold;">Total (inc. VAT):</td>
                <td style="padding: 8px; text-align: right; font-weight: bold;">£${total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Delivery Address</h3>
          <p>${addressHtml}</p>
        </div>
        
        <p>We'll send you another email when your order has been dispatched.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      </div>
    `;
    
    await sendEmail({
      to,
      subject: `Order Confirmation - #${orderNumber}`,
      html: emailHtml
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/password-reset', async (req, res) => {
  try {
    const { to, customerName, newPassword, loginUrl } = req.body;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Password Reset</h2>
        <p>Dear ${customerName},</p>
        <p>Your password has been reset by an administrator.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>New Login Details:</h3>
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>New Password:</strong> <code style="background: #e5e5e5; padding: 4px 8px; border-radius: 4px;">${newPassword}</code></p>
        </div>
        
        <p style="color: #ef4444;"><strong>Important:</strong> Please login and change your password immediately for security.</p>
        
        <a href="${loginUrl}" 
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Login to Your Account
        </a>
      </div>
    `;
    
    await sendEmail({
      to,
      subject: 'Your Splitfin Password Has Been Reset',
      html: emailHtml
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/password-reset-link', async (req, res) => {
  try {
    const { to, customerName, resetUrl } = req.body;
    
    // In a real implementation, you'd generate a secure token
    const resetToken = Math.random().toString(36).substring(2, 15);
    const fullResetUrl = `${resetUrl}?token=${resetToken}&email=${encodeURIComponent(to)}`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Reset Your Password</h2>
        <p>Dear ${customerName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <a href="${fullResetUrl}" 
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reset Password
        </a>
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request a password reset, please ignore this email. 
          This link will expire in 24 hours.
        </p>
        
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${fullResetUrl}">${fullResetUrl}</a>
        </p>
      </div>
    `;
    
    await sendEmail({
      to,
      subject: 'Reset Your Splitfin Password',
      html: emailHtml
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADD THIS LINE - This is what's missing!
export default router;