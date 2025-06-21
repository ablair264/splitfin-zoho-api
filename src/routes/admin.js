const admin = require('firebase-admin');
const { Router } = require('express');
const router = Router();

// Middleware to verify admin/brandManager role
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user role from Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();
    
    const userData = userDoc.data();
    if (userData?.role !== 'brandManager' && userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/create-customer-user', verifyAdmin, async (req, res) => {
  try {
    const { email, password, displayName, customerId, customerData } = req.body;
    
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false
    });
    
    // Update or create customer_data record
    if (customerId) {
      // Update existing customer
      await admin.firestore()
        .collection('customer_data')
        .doc(customerId)
        .update({
          loginid: userRecord.uid,
          ...customerData
        });
    } else {
      // Create new customer
      await admin.firestore()
        .collection('customer_data')
        .add({
          loginid: userRecord.uid,
          ...customerData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
    
    res.json({ 
      success: true, 
      uid: userRecord.uid,
      message: 'User created successfully'
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;