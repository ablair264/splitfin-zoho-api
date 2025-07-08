#!/usr/bin/env python3
"""
Script to migrate customer sales data from nested 'sales' map to individual fields
in Firebase Firestore customers collection.

This script:
1. Reads all documents from customers collection
2. Extracts fields from the 'sales' map
3. Creates new fields at the root level
4. Deletes the 'sales' map
5. Handles batch operations for efficiency
"""

import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Any
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CustomerSalesDataMigration:
    def __init__(self, credentials_path: str):
        """Initialize Firebase connection"""
        try:
            # Initialize Firebase Admin SDK
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}")
            raise

    def backup_collection(self, collection_name: str, backup_file: str):
        """Create a backup of the collection before migration"""
        try:
            logger.info(f"Creating backup of {collection_name} collection...")
            docs = self.db.collection(collection_name).stream()
            backup_data = []
            
            for doc in docs:
                backup_data.append({
                    'id': doc.id,
                    'data': doc.to_dict()
                })
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2, default=str)
            
            logger.info(f"Backup saved to {backup_file}")
            return len(backup_data)
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            raise

    def migrate_customer_sales_data(self, dry_run: bool = True):
        """
        Migrate sales data from nested map to individual fields
        
        Args:
            dry_run: If True, only simulate the migration without making changes
        """
        collection_ref = self.db.collection('customers')
        
        # Statistics
        stats = {
            'total_documents': 0,
            'migrated': 0,
            'skipped': 0,
            'errors': 0,
            'fields_extracted': {
                'assigned_agent_id': 0,
                'assigned_agent_name': 0,
                'sales_channel': 0,
                'salesperson_names': 0,
                'salesperson_zoho_id': 0
            }
        }
        
        try:
            # Get all customer documents
            docs = collection_ref.stream()
            batch = self.db.batch()
            batch_count = 0
            
            for doc in docs:
                stats['total_documents'] += 1
                doc_ref = collection_ref.document(doc.id)
                data = doc.to_dict()
                
                # Check if sales map exists
                if 'sales' not in data:
                    logger.debug(f"Document {doc.id} has no sales map, skipping")
                    stats['skipped'] += 1
                    continue
                
                sales_data = data.get('sales', {})
                
                # Prepare update data
                update_data = {}
                fields_to_delete = []
                
                # Extract fields from sales map
                if 'assigned_agent_id' in sales_data:
                    update_data['assigned_agent_id'] = sales_data['assigned_agent_id']
                    stats['fields_extracted']['assigned_agent_id'] += 1
                
                if 'assigned_agent_name' in sales_data:
                    update_data['assigned_agent_name'] = sales_data['assigned_agent_name']
                    stats['fields_extracted']['assigned_agent_name'] += 1
                
                if 'sales_channel' in sales_data:
                    update_data['sales_channel'] = sales_data['sales_channel']
                    stats['fields_extracted']['sales_channel'] += 1
                
                if 'salesperson_names' in sales_data:
                    update_data['salesperson_names'] = sales_data['salesperson_names']
                    stats['fields_extracted']['salesperson_names'] += 1
                
                if 'salesperson_zoho_id' in sales_data:
                    update_data['salesperson_zoho_id'] = sales_data['salesperson_zoho_id']
                    stats['fields_extracted']['salesperson_zoho_id'] += 1
                
                # Add deletion of sales map
                update_data['sales'] = firestore.DELETE_FIELD
                
                # Log the changes
                logger.info(f"Document {doc.id}: Extracting {len(update_data)-1} fields")
                
                if not dry_run:
                    # Add to batch
                    batch.update(doc_ref, update_data)
                    batch_count += 1
                    
                    # Commit batch every 500 documents
                    if batch_count >= 500:
                        batch.commit()
                        logger.info(f"Committed batch of {batch_count} documents")
                        batch = self.db.batch()
                        batch_count = 0
                
                stats['migrated'] += 1
                
            # Commit any remaining documents
            if batch_count > 0 and not dry_run:
                batch.commit()
                logger.info(f"Committed final batch of {batch_count} documents")
            
            # Print statistics
            self.print_statistics(stats, dry_run)
            
        except Exception as e:
            logger.error(f"Migration error: {e}")
            stats['errors'] += 1
            raise

    def print_statistics(self, stats: Dict[str, Any], dry_run: bool):
        """Print migration statistics"""
        logger.info("\n" + "="*50)
        logger.info(f"MIGRATION {'SIMULATION' if dry_run else 'COMPLETE'}")
        logger.info("="*50)
        logger.info(f"Total documents processed: {stats['total_documents']}")
        logger.info(f"Documents migrated: {stats['migrated']}")
        logger.info(f"Documents skipped: {stats['skipped']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("\nFields extracted:")
        for field, count in stats['fields_extracted'].items():
            logger.info(f"  - {field}: {count}")
        logger.info("="*50)

    def verify_migration(self, sample_size: int = 10):
        """Verify migration by checking a sample of documents"""
        logger.info(f"\nVerifying migration with sample size: {sample_size}")
        
        collection_ref = self.db.collection('customers')
        docs = collection_ref.limit(sample_size).stream()
        
        for doc in docs:
            data = doc.to_dict()
            has_sales_map = 'sales' in data
            has_root_fields = any([
                'assigned_agent_id' in data,
                'assigned_agent_name' in data,
                'sales_channel' in data,
                'salesperson_names' in data,
                'salesperson_zoho_id' in data
            ])
            
            logger.info(f"Document {doc.id}:")
            logger.info(f"  - Has sales map: {has_sales_map}")
            logger.info(f"  - Has root fields: {has_root_fields}")
            
            if has_root_fields:
                logger.info("  - Root fields found:")
                for field in ['assigned_agent_id', 'assigned_agent_name', 'sales_channel', 
                             'salesperson_names', 'salesperson_zoho_id']:
                    if field in data:
                        logger.info(f"    - {field}: {data[field]}")

def main():
    """Main execution function"""
    # Configuration
    CREDENTIALS_PATH = 'key.json'  # Update this path
    BACKUP_FILE = f'customers_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    
    try:
        # Initialize migration
        migration = CustomerSalesDataMigration(CREDENTIALS_PATH)
        
        # Create backup
        logger.info("Creating backup before migration...")
        doc_count = migration.backup_collection('customers', BACKUP_FILE)
        logger.info(f"Backup complete: {doc_count} documents backed up")
        
        # Run migration in dry-run mode first
        logger.info("\nRunning migration in DRY RUN mode...")
        migration.migrate_customer_sales_data(dry_run=True)
        
        # Ask for confirmation
        response = input("\nDo you want to proceed with the actual migration? (yes/no): ")
        
        if response.lower() == 'yes':
            logger.info("\nRunning actual migration...")
            migration.migrate_customer_sales_data(dry_run=False)
            
            # Verify migration
            migration.verify_migration()
        else:
            logger.info("Migration cancelled.")
    
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    main()