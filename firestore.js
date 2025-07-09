import os
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore

# --- Firebase Initialization ---
# This script now uses a local key file for authentication.
# Ensure "Key.json" is in the same directory as this script.
cred = credentials.Certificate("Key.json")

try:
    # Initialize the app with a service account, granting admin privileges
    firebase_admin.initialize_app(cred)
    print("✅ Firebase App initialized successfully using Key.json.")
except Exception as e:
    print(f"🔥 Firebase App already initialized or failed to initialize: {e}")

db = firestore.client()
print("🔥 Firestore client created.")

class FirebaseDataService:
    """
    A service class to handle data migration, restructuring, and synchronization
    tasks within the Firebase Firestore database.
    """

    def __init__(self, client):
        """
        Initializes the service with a Firestore client.
        Args:
            client: An authenticated Firestore client instance.
        """
        self.db = client
        print("🚀 FirebaseDataService is ready.")

    def _batch_commit(self, batch, action_name="Batch"):
        """Helper to commit a batch and handle potential errors."""
        try:
            batch.commit()
            print(f"✅ {action_name} committed successfully.")
        except Exception as e:
            print(f"❌ Error committing {action_name}: {e}")

    def update_vendor_ids_in_items(self):
        """
        Matches items in 'items_data' to vendors in 'vendors' using the
        'brand_normalized' field and updates the 'vendor_id' in the item.

        This is a critical data migration task.
        """
        print("\n--- Starting Vendor ID Update in items_data ---")
        try:
            # 1. Create a mapping of brand_normalized -> vendor_doc_id
            vendors_ref = self.db.collection('vendors')
            vendor_map = {}
            for vendor_doc in vendors_ref.stream():
                vendor_data = vendor_doc.to_dict()
                if 'brand_normalized' in vendor_data:
                    vendor_map[vendor_data['brand_normalized']] = vendor_doc.id
            
            if not vendor_map:
                print("⚠️ No vendors found or vendors lack 'brand_normalized' field. Aborting.")
                return

            print(f"🗺️ Created map for {len(vendor_map)} vendors.")

            # 2. Iterate through items_data and update vendor_id
            items_ref = self.db.collection('items_data')
            all_items = items_ref.stream()
            
            batch = self.db.batch()
            item_count = 0
            updated_count = 0
            batch_limit = 400 # Firestore batch limit is 500

            for item_doc in all_items:
                item_data = item_doc.to_dict()
                item_count += 1
                
                brand_normalized = item_data.get('brand_normalized')
                current_vendor_id = item_data.get('vendor_id')

                if brand_normalized in vendor_map:
                    correct_vendor_id = vendor_map[brand_normalized]
                    
                    # Only update if the vendor_id is missing or incorrect
                    if current_vendor_id != correct_vendor_id:
                        item_ref = items_ref.doc(item_doc.id)
                        batch.update(item_ref, {
                            'vendor_id': correct_vendor_id,
                            '_migration_log.vendor_id_updated_at': firestore.SERVER_TIMESTAMP
                        })
                        updated_count += 1
                        print(f"✏️ Queued update for item {item_doc.id}: Set vendor_id to {correct_vendor_id}")

                        if updated_count % batch_limit == 0:
                            self._batch_commit(batch, f"Vendor ID Update Batch #{updated_count // batch_limit}")
                            batch = self.db.batch() # Start a new batch
                
                if item_count % 1000 == 0:
                    print(f"🔎 Scanned {item_count} items...")

            # Commit any remaining items in the last batch
            if updated_count % batch_limit != 0:
                self._batch_commit(batch, "Final Vendor ID Update Batch")

            print("\n--- ✅ Vendor ID Update Complete ---")
            print(f"📊 Total items scanned: {item_count}")
            print(f"📊 Total items updated: {updated_count}")

        except Exception as e:
            print(f"🔥 An error occurred during vendor ID update: {e}")

    def restructure_sales_order_items(self):
        """
        Moves line items from the main 'sales_orders' documents into a
        'sales_order_items' sub-collection for each order.
        """
        print("\n--- Starting Sales Order Item Restructuring ---")
        try:
            orders_ref = self.db.collection('sales_orders')
            all_orders = orders_ref.stream()

            order_count = 0
            items_moved = 0
            
            for order_doc in all_orders:
                order_count += 1
                order_data = order_doc.to_dict()
                order_id = order_doc.id
                
                if 'line_items' in order_data and isinstance(order_data['line_items'], list):
                    line_items = order_data['line_items']
                    if not line_items:
                        continue

                    print(f"Processing order {order_id} with {len(line_items)} line items.")
                    
                    batch = self.db.batch()
                    
                    # Add each line item to the sub-collection
                    for item in line_items:
                        item_id = item.get('line_item_id') or f"item_{items_moved}"
                        item_ref = orders_ref.doc(order_id).collection('sales_order_items').doc(item_id)
                        batch.set(item_ref, item)
                        items_moved += 1

                    # Remove the line_items array from the parent document
                    batch.update(orders_ref.doc(order_id), {
                        'line_items': firestore.DELETE_FIELD,
                        '_migration_log.items_restructured_at': firestore.SERVER_TIMESTAMP
                    })

                    self._batch_commit(batch, f"Order {order_id} Items")
            
            print("\n--- ✅ Sales Order Item Restructuring Complete ---")
            print(f"📊 Total orders processed: {order_count}")
            print(f"📊 Total line items moved: {items_moved}")

        except Exception as e:
            print(f"🔥 An error occurred during sales order restructuring: {e}")

    def link_orders_to_customers(self):
        """
        Iterates through sales orders and adds a reference to them in a
        sub-collection 'orders_placed' under the corresponding customer.
        """
        print("\n--- Starting Linking of Sales Orders to Customers ---")
        try:
            orders_ref = self.db.collection('sales_orders')
            customers_ref = self.db.collection('customers')
            all_orders = orders_ref.stream()

            batch = self.db.batch()
            linked_count = 0
            batch_limit = 400

            for order_doc in all_orders:
                order_data = order_doc.to_dict()
                customer_id = order_data.get('customer_id')
                order_id = order_doc.id

                if not customer_id:
                    continue

                # Find customer document(s) by customer_id field
                # Note: This assumes customer_id is unique. If not, this needs adjustment.
                customer_query = customers_ref.where('customer_id', '==', customer_id).limit(1).stream()
                customer_docs = list(customer_query)

                if customer_docs:
                    customer_doc_id = customer_docs[0].id
                    customer_order_ref = customers_ref.doc(customer_doc_id).collection('orders_placed').doc(order_id)
                    
                    # Create a slimmed-down version of the order for the sub-collection
                    order_summary = {
                        'sales_order_id': order_id,
                        'sales_order_number': order_data.get('sales_order_number'),
                        'order_date': order_data.get('order_date'),
                        'total': order_data.get('total'),
                        'status': order_data.get('status'),
                        '_linked_at': firestore.SERVER_TIMESTAMP
                    }
                    
                    batch.set(customer_order_ref, order_summary, merge=True)
                    linked_count += 1
                    print(f"🔗 Queued link for Order {order_id} to Customer {customer_doc_id}")

                    if linked_count % batch_limit == 0:
                        self._batch_commit(batch, f"Customer-Order Link Batch #{linked_count // batch_limit}")
                        batch = self.db.batch()
            
            # Commit the final batch
            if linked_count % batch_limit != 0:
                self._batch_commit(batch, "Final Customer-Order Link Batch")

            print("\n--- ✅ Linking Orders to Customers Complete ---")
            print(f"📊 Total orders linked: {linked_count}")

        except Exception as e:
            print(f"🔥 An error occurred during order linking: {e}")
            
    def update_vendor_backorders(self):
        """
        Calculates backorder information from 'purchase_orders' and updates
        the corresponding 'vendors' documents.
        """
        print("\n--- Starting Vendor Backorder Calculation ---")
        try:
            po_ref = self.db.collection('purchase_orders')
            items_ref = self.db.collection('items_data')
            vendors_ref = self.db.collection('vendors')
            
            backorders_by_vendor = {}

            # 1. Fetch all item data to map item_id to vendor_id
            item_to_vendor_map = {}
            for item_doc in items_ref.stream():
                item_data = item_doc.to_dict()
                if 'vendor_id' in item_data:
                    item_to_vendor_map[item_doc.id] = item_data['vendor_id']

            print(f"🗺️ Created item-to-vendor map for {len(item_to_vendor_map)} items.")

            # 2. Iterate through purchase orders to calculate backorders
            for po_doc in po_ref.stream():
                po_data = po_doc.to_dict()
                if 'line_items' in po_data and isinstance(po_data['line_items'], list):
                    for item in po_data['line_items']:
                        quantity = int(item.get('quantity', 0))
                        received = int(item.get('quantity_received', 0))
                        cancelled = int(item.get('quantity_cancelled', 0))
                        
                        backorder_qty = quantity - received - cancelled
                        if backorder_qty > 0:
                            item_id = item.get('item_id')
                            vendor_id = item_to_vendor_map.get(item_id)

                            if not vendor_id:
                                # Fallback to vendor_id on the PO itself if not on the item
                                vendor_id = po_data.get('vendor_id')

                            if vendor_id:
                                if vendor_id not in backorders_by_vendor:
                                    backorders_by_vendor[vendor_id] = {'items_on_backorder': 0, 'backorder_value': 0}
                                
                                backorders_by_vendor[vendor_id]['items_on_backorder'] += backorder_qty
                                backorders_by_vendor[vendor_id]['backorder_value'] += backorder_qty * float(item.get('rate', 0.0))

            print(f"📦 Calculated backorders for {len(backorders_by_vendor)} vendors.")

            # 3. Batch update the vendors collection
            batch = self.db.batch()
            updated_count = 0
            
            # First, reset backorder info for all vendors (optional, but good for cleanup)
            for vendor_doc in vendors_ref.stream():
                batch.update(vendor_doc.reference, {'backorder_info': {
                    'items_on_backorder': 0,
                    'backorder_value': 0,
                    'last_updated': firestore.SERVER_TIMESTAMP
                }})

            # Now, update with new values
            for vendor_id, info in backorders_by_vendor.items():
                vendor_ref = vendors_ref.doc(vendor_id)
                batch.set(vendor_ref, {'backorder_info': {
                    'items_on_backorder': info['items_on_backorder'],
                    'backorder_value': info['backorder_value'],
                    'last_updated': firestore.SERVER_TIMESTAMP
                }}, merge=True)
                updated_count += 1
            
            self._batch_commit(batch, "Vendor Backorder Update")
            
            print("\n--- ✅ Vendor Backorder Update Complete ---")
            print(f"📊 Total vendors with updated backorder info: {updated_count}")
            
        except Exception as e:
            print(f"🔥 An error occurred during backorder update: {e}")


def main():
    """Main function to run the data service tasks."""
    service = FirebaseDataService(db)

    print("\nStarting Firestore data migration and restructuring script.")
    print("Please select an operation to perform:")
    print("1. Update Vendor IDs in items_data (Migration)")
    print("2. Restructure Sales Order Line Items (Migration)")
    print("3. Link Sales Orders to Customers (Migration)")
    print("4. Update Vendor Backorder Information (Recurring Task)")
    print("5. Run ALL migration tasks (1, 2, 3)")
    print("0. Exit")

    choice = input("Enter your choice: ")

    if choice == '1':
        service.update_vendor_ids_in_items()
    elif choice == '2':
        service.restructure_sales_order_items()
    elif choice == '3':
        service.link_orders_to_customers()
    elif choice == '4':
        service.update_vendor_backorders()
    elif choice == '5':
        print("\n--- Running all migration tasks sequentially ---")
        service.update_vendor_ids_in_items()
        service.restructure_sales_order_items()
        service.link_orders_to_customers()
        print("\n--- All migration tasks complete! ---")
    elif choice == '0':
        print("Exiting script.")
    else:
        print("Invalid choice. Please run the script again.")

if __name__ == '__main__':
    main()
