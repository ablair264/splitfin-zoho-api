// server/src/services/customerAuthService.js
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const db = admin.firestore();
const auth = getAuth();

/**
 * Generate a secure random password
 */
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Create Firebase Auth user and users collection document for a customer
 */
export async function createCustomerAuth(customerId) {
  try {
    console.log(`🔐 Creating auth for customer: ${customerId}`);
    
    // Get customer data from customer_data collection
    const customerDoc = await db.collection('customer_data').doc(customerId).get();
    
    if (!customerDoc.exists) {
      throw new Error('Customer not found in customer_data collection');
    }
    
    const customerData = customerDoc.data();
    
    // Check if customer already has a Firebase UID
    if (customerData.firebase_uid) {
      console.log('Customer already has Firebase auth:', customerData.firebase_uid);
      return {
        success: true,
        uid: customerData.firebase_uid,
        message: 'Customer already has authentication'
      };
    }
    
    // Prepare user data
    const email = customerData.email || customerData.Primary_Email;
    if (!email) {
      throw new Error('Customer has no email address');
    }
    
    const displayName = customerData.customer_name || customerData.company_name || 'Customer';
    const tempPassword = generateSecurePassword();
    
    // Create Firebase Auth user
    let authUser;
    try {
      authUser = await auth.createUser({
        email: email,
        password: tempPassword,
        displayName: displayName,
        emailVerified: false
      });
      console.log('✅ Created Firebase Auth user:', authUser.uid);
    } catch (authError) {
      // If user already exists, get their UID
      if (authError.code === 'auth/email-already-exists') {
        const existingUser = await auth.getUserByEmail(email);
        authUser = existingUser;
        console.log('User already exists:', authUser.uid);
      } else {
        throw authError;
      }
    }
    
    // Create/Update users collection document
    const userDocData = {
      uid: authUser.uid,
      email: email,
      name: customerData.customer_name || customerData.company_name || 'Customer',
      companyName: customerData.company_name || customerData.customer_name || '',
      role: 'customer',
      customer_id: customerData.customer_id || '', // Zoho customer ID
      firebase_customer_doc_id: customerId, // Reference to customer_data doc
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      isOnline: false,
      
      // Additional customer fields
      phone: customerData.phone || '',
      billing_address: customerData.billing_address || {},
      shipping_address: customerData.shipping_address || {},
      
      // Metadata
      authCreatedAt: new Date().toISOString(),
      authCreatedBy: 'system',
      tempPasswordSet: true
    };
    
    // Save to users collection using UID as document ID
    await db.collection('users').doc(authUser.uid).set(userDocData, { merge: true });
    console.log('✅ Created users collection document');
    
    // Update customer_data with Firebase UID
    await db.collection('customer_data').doc(customerId).update({
      firebase_uid: authUser.uid,
      has_login: true,
      login_created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Updated customer_data with Firebase UID');
    
    // Send password reset email so customer can set their own password
    try {
      const resetLink = await auth.generatePasswordResetLink(email);
      console.log('✅ Generated password reset link');
      
      // You can send this via your email service
      // For now, return it in the response
      return {
        success: true,
        uid: authUser.uid,
        email: email,
        resetLink: resetLink,
        tempPassword: tempPassword, // Only for initial setup
        message: 'Customer authentication created successfully'
      };
    } catch (emailError) {
      console.warn('Could not generate reset link:', emailError);
      // Still return success even if email fails
      return {
        success: true,
        uid: authUser.uid,
        email: email,
        tempPassword: tempPassword,
        message: 'Customer authentication created (email pending)'
      };
    }
    
  } catch (error) {
    console.error('❌ Error creating customer auth:', error);
    throw error;
  }
}

/**
 * Bulk create authentication for multiple customers
 */
export async function bulkCreateCustomerAuth(customerIds) {
  const results = {
    success: [],
    failed: [],
    total: customerIds.length
  };
  
  for (const customerId of customerIds) {
    try {
      const result = await createCustomerAuth(customerId);
      results.success.push({
        customerId,
        uid: result.uid,
        email: result.email
      });
    } catch (error) {
      results.failed.push({
        customerId,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Create auth for all customers without Firebase auth
 */
export async function createAuthForAllCustomers() {
  try {
    console.log('🔄 Starting bulk auth creation...');
    
    // Get all customers without firebase_uid
    const customersSnapshot = await db.collection('customer_data')
      .where('firebase_uid', '==', null)
      .limit(50) // Process in batches
      .get();
    
    const customerIds = customersSnapshot.docs.map(doc => doc.id);
    
    if (customerIds.length === 0) {
      return {
        message: 'No customers need authentication',
        total: 0
      };
    }
    
    const results = await bulkCreateCustomerAuth(customerIds);
    
    console.log('✅ Bulk auth creation complete:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Bulk auth error:', error);
    throw error;
  }
customerAuthService.js