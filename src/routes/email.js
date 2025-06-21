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

// ADD THIS LINE - This is what's missing!
export default router;