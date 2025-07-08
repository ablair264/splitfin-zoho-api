import admin from 'firebase-admin';
import serviceAccount from '../key.json' with { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateSalesAgents() {
  try {
    console.log('Starting sales agents migration...');
    
    // Get all users with role 'salesAgent'
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'salesAgent')
      .get();
    
    console.log(`Found ${usersSnapshot.size} sales agents to migrate`);
    
    const migrationResults = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check if user has required fields
        if (!userData.zohospID) {
          console.warn(`User ${userId} missing zohospID, skipping...`);
          migrationResults.failed++;
          continue;
        }
        
        // Create new sales agent document using zohospID as the document ID
        const salesAgentData = {
          sa_id: userData.zohospID, // Use zohospID as the primary identifier
          agentID: userData.agentID || '',
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          company: userData.company || '',
          role: 'salesAgent',
          uid: userId, // Keep reference to original Firebase UID
          zohospID: userData.zohospID,
          brandsAssigned: userData.brandsAssigned || {},
          region: userData.region || [],
          lastLogin: userData.lastLogin || admin.firestore.FieldValue.serverTimestamp(),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          migrated_from: 'users',
          migration_date: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to sales_agents collection
        await db.collection('sales_agents').doc(userData.zohospID).set(salesAgentData);
        
        // Update the original user document to mark it as migrated
        await userDoc.ref.update({
          migrated_to_sales_agents: true,
          sales_agent_id: userData.zohospID,
          migration_date: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✓ Migrated sales agent: ${userData.name} (${userData.zohospID})`);
        migrationResults.successful++;
        
      } catch (error) {
        console.error(`✗ Failed to migrate user ${userDoc.id}:`, error.message);
        migrationResults.failed++;
        migrationResults.errors.push({
          userId: userDoc.id,
          error: error.message
        });
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Successful: ${migrationResults.successful}`);
    console.log(`Failed: ${migrationResults.failed}`);
    
    if (migrationResults.errors.length > 0) {
      console.log('\nErrors:');
      migrationResults.errors.forEach(error => {
        console.log(`- User ${error.userId}: ${error.error}`);
      });
    }
    
    console.log('\nMigration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateSalesAgents(); 