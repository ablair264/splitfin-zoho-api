import os
from datetime import datetime, timezone, timedelta
import firebase_admin
from firebase_admin import credentials, firestore
import requests
import time
from typing import Dict, List, Optional

# --- Zoho Configuration ---
# Your credentials and settings have been integrated here.
ZOHO_REGION = os.getenv('ZOHO_REGION', 'eu')
ZOHO_CLIENT_ID = "1000.AV9M9OMELL7FB7UMDLDV4TXPPYM0CZ"
ZOHO_CLIENT_SECRET = "bcb3b1358539f7343a05023ab71ea5704706faaa2a"
ZOHO_REFRESH_TOKEN = "1000.ebc8fd1267ba4edca22abcfd25263212.c45dadbd00483ad07d0d395e824c8e39"
ZOHO_ORG_ID = "20083870449"

# Set URLs based on region
if ZOHO_REGION == 'eu':
    ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.eu'
    ZOHO_API_BASE = 'https://www.zohoapis.eu/inventory/v1'
else: # Add other regions if needed
    ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.com'
    ZOHO_API_BASE = 'https://www.zohoapis.com/inventory/v1'

# --- Firebase Initialization ---
# This script now uses a local key file for authentication.
# Ensure "Key.json" is in the same directory as this script.
try:
    cred = credentials.Certificate("Key.json")
    firebase_admin.initialize_app(cred)
    print("✅ Firebase App initialized successfully using Key.json.")
except Exception as e:
    print(f"🔥 Firebase App already initialized or failed to initialize: {e}")

db = firestore.client()
print("🔥 Firestore client created.")


class ZohoOAuth:
    """Handles Zoho API authentication and token refreshing."""
    def __init__(self):
        self.access_token = None
        self.token_expiry = None

    def get_access_token(self):
        """Get a fresh access token using the refresh token."""
        if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
            return self.access_token
        
        print(f"🔑 Refreshing Zoho access token from {ZOHO_REGION} region...")
        token_url = f"{ZOHO_ACCOUNTS_BASE}/oauth/v2/token"
        data = {
            'refresh_token': ZOHO_REFRESH_TOKEN,
            'client_id': ZOHO_CLIENT_ID,
            'client_secret': ZOHO_CLIENT_SECRET,
            'grant_type': 'refresh_token'
        }
        response = requests.post(token_url, data=data)
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.token_expiry = datetime.now() + timedelta(minutes=55)
            print("✅ Access token refreshed successfully.")
            return self.access_token
        else:
            raise Exception(f"Failed to refresh token: {response.status_code} - {response.text}")

class ZohoClient:
    """Client for interacting with the Zoho Inventory API."""
    def __init__(self, auth: ZohoOAuth):
        self.auth = auth
        self.org_id = ZOHO_ORG_ID
        self.rate_limit_delay = 1.2 # Seconds between requests

    def get_sales_order_details(self, sales_order_id: str) -> Optional[Dict]:
        """Fetch detailed information for a specific sales order."""
        url = f"{ZOHO_API_BASE}/salesorders/{sales_order_id}"
        access_token = self.auth.get_access_token()
        headers = {'Authorization': f'Zoho-oauthtoken {access_token}'}
        params = {'organization_id': self.org_id}
        
        try:
            time.sleep(self.rate_limit_delay) # Respect rate limits
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == 0:
                    return data.get('salesorder')
                else:
                    print(f"❌ Zoho API error for SO ID {sales_order_id}: {data.get('message')}")
            elif response.status_code == 429:
                print("⚠️ Rate limit hit, waiting 60 seconds...")
                time.sleep(60)
                return self.get_sales_order_details(sales_order_id) # Retry
            else:
                print(f"❌ HTTP Error fetching SO ID {sales_order_id}: {response.status_code}")
        except Exception as e:
            print(f"❌ Exception fetching SO ID {sales_order_id}: {e}")
        return None


class FirebaseDataService:
    """
    A service class to handle data migration, restructuring, and synchronization
    tasks within the Firebase Firestore database.
    """
    def __init__(self, client, zoho_client):
        self.db = client
        self.zoho = zoho_client
        print("🚀 FirebaseDataService is ready.")

    def _batch_commit(self, batch, action_name="Batch"):
        """Helper to commit a batch and handle potential errors."""
        try:
            batch.commit()
            print(f"✅ {action_name} committed successfully.")
        except Exception as e:
            print(f"❌ Error committing {action_name}: {e}")

    def refresh_and_restructure_sales_orders(self):
        """
        Fetches the latest sales order data from Zoho, overwrites the Firestore
        record, and restructures its line items into a sub-collection.
        """
        print("\n--- Starting Sales Order Refresh & Restructuring from Zoho ---")
        orders_ref = self.db.collection('sales_orders')
        agents_ref = self.db.collection('sales_agents')
        all_orders = list(orders_ref.stream())
        total_orders = len(all_orders)
        print(f"Found {total_orders} sales orders in Firestore to process.")

        processed_count = 0
        updated_count = 0
        errors_count = 0

        for order_doc in all_orders:
            processed_count += 1
            print(f"\n🔄 Processing order {processed_count}/{total_orders} (ID: {order_doc.id})")
            order_data = order_doc.to_dict()
            zoho_id = order_data.get('_original_zoho_id') or order_data.get('_original_firebase_id')

            if not zoho_id:
                print("   - ⚠️ Skipping: Missing original Zoho/Firebase ID.")
                continue

            # 1. Fetch latest data from Zoho
            print(f"   - 📞 Fetching latest data for Zoho ID: {zoho_id}")
            fresh_so_data = self.zoho.get_sales_order_details(zoho_id)

            if not fresh_so_data:
                print(f"   - ❌ Skipping: Could not fetch data from Zoho for ID {zoho_id}.")
                errors_count += 1
                continue
            
            updated_count += 1
            batch = self.db.batch()
            order_ref = order_doc.reference

            # 2. Prepare and rebuild the main order document
            customer_name = fresh_so_data.get('customer_name', '')
            fresh_so_data['is_marketplace_order'] = 'amazon' in customer_name.lower()
            fresh_so_data['_last_refreshed_from_zoho'] = firestore.SERVER_TIMESTAMP
            
            line_items_from_zoho = fresh_so_data.pop('line_items', [])
            
            # Overwrite the document with fresh data
            batch.set(order_ref, fresh_so_data)
            print(f"   - 📝 Queued overwrite for order {order_doc.id}.")

            # 3. Add line items to the 'order_line_items' sub-collection
            if line_items_from_zoho:
                items_subcollection_ref = order_ref.collection('order_line_items')
                for item in line_items_from_zoho:
                    line_item_id = item.get('line_item_id', items_subcollection_ref.document().id)
                    item_doc_ref = items_subcollection_ref.document(line_item_id)
                    batch.set(item_doc_ref, item)
                print(f"   - 🛍️ Queued {len(line_items_from_zoho)} items for sub-collection 'order_line_items'.")

            # 4. Link the order to the sales agent
            salesperson_id = fresh_so_data.get('salesperson_id')
            if salesperson_id:
                agent_query = agents_ref.where('zohospID', '==', salesperson_id).limit(1).stream()
                agent_docs = list(agent_query)
                if agent_docs:
                    agent_ref = agent_docs[0].reference
                    agent_order_ref = agent_ref.collection('customers_orders').document(order_doc.id)
                    order_summary = {
                        'sales_order_id': order_doc.id,
                        'sales_order_number': fresh_so_data.get('salesorder_number'),
                        'order_date': fresh_so_data.get('date'),
                        'total': fresh_so_data.get('total'),
                        'customer_name': customer_name,
                        '_linked_at': firestore.SERVER_TIMESTAMP
                    }
                    batch.set(agent_order_ref, order_summary, merge=True)
                    print(f"   - 🔗 Queued link to Sales Agent: {agent_docs[0].get('name')}")

            # Commit all operations for this order
            self._batch_commit(batch, f"Commit for Order ID {order_doc.id}")

        print("\n--- ✅ Sales Order Refresh & Restructuring Complete ---")
        print(f"📊 Total orders processed: {processed_count}")
        print(f"📊 Orders successfully updated from Zoho: {updated_count}")
        print(f"📊 Orders with errors/not found: {errors_count}")

def main():
    """Main function to run the data service tasks."""
    try:
        zoho_auth = ZohoOAuth()
        zoho_client = ZohoClient(zoho_auth)
        service = FirebaseDataService(db, zoho_client)

        print("\nStarting Firestore data migration and restructuring script.")
        print("Please select an operation to perform:")
        print("1. Refresh & Restructure Sales Orders from Zoho")
        print("0. Exit")

        choice = input("Enter your choice: ")

        if choice == '1':
            service.refresh_and_restructure_sales_orders()
        elif choice == '0':
            print("Exiting script.")
        else:
            print("Invalid choice. Please run the script again.")
            
    except Exception as e:
        print(f"\n\nA critical error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
