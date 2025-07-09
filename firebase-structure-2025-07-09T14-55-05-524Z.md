# Firebase Collection Structure Report

Generated on: 2025-07-09T14:55:05.528Z

## Collections Analyzed

### auth_creation_requests

**Document Count:** 2
**Sample Document ID:** ImBbQKlgcPiM7tDqA9x7

**Complete Field Structure:**

- **email** (string) - Example: `"theblair2@gmail.com"`
- **password** (string) - Example: `"G$QqeMyzkfRS"`
- **pendingCustomerId** (string) - Example: `"wpqEVSjjLqswTGnImxuS"`
- **isExistingCustomer** (boolean) - Example: `false`
- **customerData** (map) - 7 fields: email, companyName, contactName, phone, address, vatNumber, website
  - **customerData.address** (string) - Example: `"25 Middle Street"`
  - **customerData.companyName** (string) - Example: `"ABCD Ltd"`
  - **customerData.contactName** (string) - Example: `"Alastair Blair"`
  - **customerData.email** (string) - Example: `"theblair2@gmail.com"`
  - **customerData.phone** (string) - Example: `"07718182168"`
  - **customerData.vatNumber** (string) - Example: `"012345678"`
  - **customerData.website** (string) - Example: `"https://www.alastairblair.co.uk"`
- **createdAt** (string) - Example: `"2025-06-21T17:39:08.218Z"`
- **createdBy** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **processed** (boolean) - Example: `false`

**Sample Data:**
```json
{
  "email": "the***@gmail.com",
  "password": "[REDACTED]",
  "pendingCustomerId": "wpqEVSjjLqswTGnImxuS",
  "isExistingCustomer": false,
  "customerData": {
    "email": "the***@gmail.com",
    "companyName": "ABCD Ltd",
    "contactName": "Alastair Blair",
    "phone": "0771818****",
    "address": "25 Middle Street",
    "vatNumber": "012345678",
    "website": "https://www.alastairblair.co.uk"
  },
  "createdAt": "2025-06-21T17:39:08.218Z",
  "createdBy": "AXhQKHGiUOXPgeBIwUaYCyfZrV63",
  "processed": false
}
```

---

### branches

**Document Count:** 2
**Sample Document ID:** BR_1751739923216_19udpex33

**Complete Field Structure:**

- **is_active** (boolean) - Example: `true`
- **address** (map) - 6 fields: country, street_1, city, street_2, postcode, state
  - **address.city** (string) - Example: `"London"`
  - **address.country** (string) - Example: `"United Kingdom"`
  - **address.postcode** (string) - Example: `"SW1A 1AA"`
  - **address.state** (string) - Example: `"England"`
  - **address.street_1** (string) - Example: `"123 Main Street"`
  - **address.street_2** (string) - Example: `""`
- **contact_phone** (string) - Example: `""`
- **is_primary** (boolean) - Example: `true`
- **contact_person** (string) - Example: `""`
- **description** (string) - Example: `"Primary business location"`
- **created_by** (string) - Example: `"migration_script"`
- **contact_email** (string) - Example: `""`
- **_migration_date** (timestamp) - Example: `"2025-07-05T18:25:23.216Z"`
- **branch_code** (string) - Example: `"MAIN"`
- **branch_id** (string) - Example: `"BR_1751739923216_19udpex33"`
- **branch_type** (string) - Example: `"headquarters"`
- **phone** (string) - Example: `""`
- **_migrated_from** (string) - Example: `"default_branch"`
- **branch_name** (string) - Example: `"Main Branch"`
- **updated_by** (string) - Example: `"migration_script"`
- **created_date** (timestamp) - Example: `"2025-07-05T18:25:23.216Z"`
- **fax** (string) - Example: `""`
- **last_modified** (timestamp) - Example: `"2025-07-05T18:25:23.216Z"`
- **email** (string) - Example: `""`

**Sample Data:**
```json
{
  "is_active": true,
  "address": {
    "country": "United Kingdom",
    "street_1": "123 Main Street",
    "city": "London",
    "street_2": "",
    "postcode": "SW1A 1AA",
    "state": "England"
  },
  "contact_phone": "",
  "is_primary": true,
  "contact_person": "",
  "description": "Primary business location",
  "created_by": "migration_script",
  "contact_email": "",
  "_migration_date": "2025-07-05T18:25:23.216Z",
  "branch_code": "MAIN",
  "branch_id": "BR_1751739923216_19udpex33",
  "branch_type": "headquarters",
  "phone": "",
  "_migrated_from": "default_branch",
  "branch_name": "Main Branch",
  "updated_by": "migration_script",
  "created_date": "2025-07-05T18:25:23.216Z",
  "fax": "",
  "last_modified": "2025-07-05T18:25:23.216Z",
  "email": ""
}
```

---

### brand_managers

**Document Count:** 1
**Sample Document ID:** QJ0IBpJDzxu7vtEJMbzP

**Complete Field Structure:**

- **email** (string) - Example: `"sammie@dmbrands.co.uk"`
- **company_id** (string) - Example: `"dmb_001"`
- **role** (string) - Example: `"brandManager"`
- **messenger_id** (number) - Example: `9019012`
- **is_online** (boolean) - Example: `false`
- **last_online** (timestamp) - Example: `"2025-07-06T23:00:00.367Z"`
- **active** (boolean) - Example: `true`
- **uid** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`

**Sample Data:**
```json
{
  "email": "sam***@dmbrands.co.uk",
  "company_id": "dmb_001",
  "role": "brandManager",
  "messenger_id": 9019012,
  "is_online": false,
  "last_online": "2025-07-06T23:00:00.367Z",
  "active": true,
  "uid": "AXhQKHGiUOXPgeBIwUaYCyfZrV63"
}
```

---

### brands

**Status:** Collection does not exist or is empty

### carts

**Document Count:** 3
**Sample Document ID:** 310656000031737739

**Complete Field Structure:**

- **items** (array) - 5 items - Types: object (5)
- **updatedAt** (string) - Example: `"2025-07-08T20:52:19.021Z"`
- **customerId** (string) - Example: `"310656000031737739"`
- **firebaseUid** (string) - Example: `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"`
- **userId** (string) - Example: `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"`

**Sample Data:**
```json
{
  "items": [
    {
      "product": {
        "product_type": "Goods",
        "item_description": "Remember Bag made out of cotton 'Marina'",
        "sku": "BM03",
        "manufacturer": {
          "manufacturer_name": "Remember",
          "manufacturer_contact": "",
          "manufacturer_part_number": "BM03",
          "manufacturer_website": ""
        },
        "id": "ITEM_1751750783180_6vpuq7h1k",
        "stock_committed": 0,
        "item_id": "ITEM_1751750783180_6vpuq7h1k",
        "brand_name": "Remember",
        "retail_price": 8.65,
        "created_date": {
          "nanoseconds": 0,
          "seconds": 1678886092
        },
        "category_name": "Uncategorized",
        "stock_available": 13,
        "stock_total": 13,
        "brand_normalized": "remember",
        "item_name": "Remember Bag made out of cotton 'Marina'",
        "purchase_price": 5.98
      },
      "quantity": 1
    },
    {
      "quantity": 1,
      "product": {
        "category_name": "Uncategorized",
        "purchase_price": 5.37,
        "retail_price": 8.65,
        "manufacturer": {
          "manufacturer_contact": "",
          "manufacturer_name": "Remember",
          "manufacturer_website": "",
          "manufacturer_part_number": "BM04"
        },
        "item_name": "Remember Bag made out of cotton 'Maui' **LIMITED S...",
        "stock_available": 4,
        "sku": "BM04",
        "created_date": {
          "seconds": 1678886092,
          "nanoseconds": 0
        },
        "stock_total": 4,
        "item_description": "Remember Bag made out of cotton 'Maui' **LIMITED S...",
        "id": "ITEM_1751750783180_6w1iraiu8",
        "stock_committed": 0,
        "product_type": "Goods",
        "brand_normalized": "remember",
        "brand_name": "Remember",
        "item_id": "ITEM_1751750783180_6w1iraiu8"
      }
    },
    {
      "product": {
        "id": "ITEM_1751750783180_uv7krd0yu",
        "sku": "AK02",
        "item_name": "Remember Basket 'Colombo', large",
        "manufacturer": {
          "manufacturer_name": "Remember",
          "manufacturer_part_number": "AK02",
          "manufacturer_website": "",
          "manufacturer_contact": ""
        },
        "brand_name": "Remember",
        "brand_normalized": "remember",
        "product_type": "Goods",
        "category_name": "Uncategorized",
        "purchase_price": 25.75,
        "retail_price": 37.46,
        "item_description": "Remember Basket 'Colombo', large",
        "stock_available": 12,
        "stock_committed": 0,
        "stock_total": 12,
        "item_id": "ITEM_1751750783180_uv7krd0yu",
        "created_date": {
          "seconds": 1678886087,
          "nanoseconds": 0
        }
      },
      "quantity": 1
    },
    "... and 2 more items"
  ],
  "updatedAt": "2025-07-08T20:52:19.021Z",
  "customerId": "31065600003173****",
  "firebaseUid": "E4yjW9IcjpMldf7qZI31bGFB9Hz2"
}
```

---

### conversations

**Document Count:** 8
**Sample Document ID:** 37QrF1LAmccIqM88bwhZkmsBRiD2_3WlbmVpN7nVVBRtXjx3X2e3XDID2

**Complete Field Structure:**

- **id** (string) - Example: `"37QrF1LAmccIqM88bwhZkmsBRiD2_3WlbmVpN7nVVBRtXjx3X2..."`
- **participantNames** (map) - 2 fields: 37QrF1LAmccIqM88bwhZkmsBRiD2, 3WlbmVpN7nVVBRtXjx3X2e3XDID2
  - **participantNames.37QrF1LAmccIqM88bwhZkmsBRiD2** (string) - Example: `"Georgia Middler"`
  - **participantNames.3AyXakBpiKM3H6ZxmFUOp0Q7G8s2** (string) - Example: `"Alastair Blair"`
  - **participantNames.3WlbmVpN7nVVBRtXjx3X2e3XDID2** (string) - Example: `"Gay Croker"`
  - **participantNames.6TfNMj2ZTypDrbJJ0mAF** (string) - Example: `"Alastair Blair"`
  - **participantNames.AXhQKHGiUOXPgeBIwUaYCyfZrV63** (string) - Example: `"Sammie Blair"`
  - **participantNames.E4yjW9IcjpMldf7qZI31bGFB9Hz2** (string) - Example: `"User"`
  - **participantNames.K7hsLNQopu7v7qqBlGdX** (string) - Example: `"DM Brands Ltd T/A Haus & Harmony"`
  - **participantNames.MQb7pLHLimTTljOpv6FX4v5QUPp1** (string) - Example: `"Matt Langford"`
  - **participantNames.nQ2mq4Dv1dI9LasV5V62** (string) - Example: `"sammielayton2"`
- **participantRoles** (map) - 2 fields: 37QrF1LAmccIqM88bwhZkmsBRiD2, 3WlbmVpN7nVVBRtXjx3X2e3XDID2
  - **participantRoles.37QrF1LAmccIqM88bwhZkmsBRiD2** (string) - Example: `"Sales Agent"`
  - **participantRoles.3AyXakBpiKM3H6ZxmFUOp0Q7G8s2** (string) - Example: `"salesAgent"`
  - **participantRoles.3WlbmVpN7nVVBRtXjx3X2e3XDID2** (string) - Example: `"salesAgent"`
  - **participantRoles.6TfNMj2ZTypDrbJJ0mAF** (string) - Example: `"customer"`
  - **participantRoles.AXhQKHGiUOXPgeBIwUaYCyfZrV63** (string) - Example: `"brandManager"`
  - **participantRoles.E4yjW9IcjpMldf7qZI31bGFB9Hz2** (string) - Example: `"salesAgent"`
  - **participantRoles.K7hsLNQopu7v7qqBlGdX** (string) - Example: `"customer"`
  - **participantRoles.MQb7pLHLimTTljOpv6FX4v5QUPp1** (string) - Example: `"brandManager"`
  - **participantRoles.nQ2mq4Dv1dI9LasV5V62** (string) - Example: `"customer"`
- **participants** (array) - 2 items - Types: string (2)
- **unreadCounts** (map) - 2 fields: 3WlbmVpN7nVVBRtXjx3X2e3XDID2, 37QrF1LAmccIqM88bwhZkmsBRiD2
  - **unreadCounts.37QrF1LAmccIqM88bwhZkmsBRiD2** (number) - Example: `2`
  - **unreadCounts.3WlbmVpN7nVVBRtXjx3X2e3XDID2** (number) - Example: `0`
  - **unreadCounts.MQb7pLHLimTTljOpv6FX4v5QUPp1** (number) - Example: `0`
- **lastMessage** (string) - Example: `"Test"`
- **lastMessageTime** (timestamp) - Example: `"2025-06-08T01:09:37.405Z"`
- **createdAt** (string) - Example: `"2025-06-21T18:55:54.428Z"`

**Sample Data:**
```json
{
  "id": "37QrF1LAmccIqM88bwhZkmsBRiD2_3WlbmVpN7nVVBRtXjx3X2...",
  "participantNames": {
    "37QrF1LAmccIqM88bwhZkmsBRiD2": "Georgia Middler",
    "3WlbmVpN7nVVBRtXjx3X2e3XDID2": "Gay Croker"
  },
  "participantRoles": {
    "37QrF1LAmccIqM88bwhZkmsBRiD2": "Sales Agent",
    "3WlbmVpN7nVVBRtXjx3X2e3XDID2": "salesAgent"
  },
  "participants": [
    "37QrF1LAmccIqM88bwhZkmsBRiD2",
    "3WlbmVpN7nVVBRtXjx3X2e3XDID2"
  ],
  "unreadCounts": {
    "3WlbmVpN7nVVBRtXjx3X2e3XDID2": 0,
    "37QrF1LAmccIqM88bwhZkmsBRiD2": 2
  },
  "lastMessage": "Test",
  "lastMessageTime": "2025-06-08T01:09:37.405Z"
}
```

---

### couriers

**Document Count:** 1
**Sample Document ID:** 7cgmQVelam0eeq3kioMs

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### customer_data

**Document Count:** 1480
**Sample Document ID:** 310656000000059331

**Complete Field Structure:**

- **zoho_region** (string) - Example: `"eu"`
- **sync_status** (string) - Example: `"success"`
- **last_synced** (timestamp) - Example: `"2025-06-17T13:25:07.738Z"`
- **original_firebase_data** (map) - 53 fields: customer_id, customer_sub_type, total_paid, last_modified, website, payment_terms_label, total_spent, location_region, total_orders_and_invoices, phone, credit_limit, outstanding_receivable_amount, first_order_date, _lastSynced, payment_terms, brand_preferences, contact_type, top_purchased_items, _syncSource, unused_credits_receivable_amount, customer_name, mobile, salesperson_names, salesperson_ids, total_outstanding, company_name, currency_code, segment, city, coordinates, postcode, average_order_value, _enriched_at, payment_performance, shipping_address, total_items, _rebuilt_at, invoice_count, _csv_enriched_at, overdue_amount, status, last_modified_time, terms, _source, billing_address, order_count, last_order_date, notes, order_ids, total_invoiced, country, created_time, email
  - **original_firebase_data._csv_enriched_at** (timestamp) - Example: `"2025-06-16T23:11:15.470Z"`
  - **original_firebase_data._enriched_at** (timestamp) - Example: `"2025-06-16T21:55:04.948Z"`
  - **original_firebase_data._lastSynced** (timestamp) - Example: `"2025-06-17T10:46:18.768Z"`
  - **original_firebase_data._rebuilt_at** (timestamp) - Example: `"2025-06-16T00:57:03.912Z"`
  - **original_firebase_data._source** (string) - Example: `"firestore_rebuild"`
  - **original_firebase_data._syncSource** (string) - Example: `"python_inventory_sync"`
  - **original_firebase_data.average_order_value** (number) - Example: `83.65714285714286`
  - **original_firebase_data.billing_address** (map) - 12 fields
    - **original_firebase_data.billing_address.address** (string) - Example: `""`
    - **original_firebase_data.billing_address.attention** (string) - Example: `""`
    - **original_firebase_data.billing_address.city** (string) - Example: `""`
    - **original_firebase_data.billing_address.country** (string) - Example: `""`
    - **original_firebase_data.billing_address.country_code** (string) - Example: `"GB"`
    - **original_firebase_data.billing_address.county** (string) - Example: `""`
    - **original_firebase_data.billing_address.fax** (string) - Example: `""`
    - **original_firebase_data.billing_address.phone** (string) - Example: `""`
    - **original_firebase_data.billing_address.state** (string) - Example: `""`
    - **original_firebase_data.billing_address.state_code** (string) - Example: `""`
    - **original_firebase_data.billing_address.street2** (string) - Example: `""`
    - **original_firebase_data.billing_address.zip** (string) - Example: `""`
  - **original_firebase_data.brand_preferences** (array) - 1 items
    - **original_firebase_data.brand_preferences[].brand** (string) - Example: `"Unknown"`
    - **original_firebase_data.brand_preferences[].percentage** (number) - Example: `156.4207650273224`
    - **original_firebase_data.brand_preferences[].quantity** (number) - Example: `17`
    - **original_firebase_data.brand_preferences[].revenue** (number) - Example: `916`
  - **original_firebase_data.city** (string) - Example: `"Wrightington"`
  - **original_firebase_data.company_name** (string) - Example: `"Silver Mushroom Ltd"`
  - **original_firebase_data.contact_type** (string) - Example: `"customer"`
  - **original_firebase_data.coordinates** (map) - 2 fields
    - **original_firebase_data.coordinates.latitude** (number) - Example: `53.6079516`
    - **original_firebase_data.coordinates.longitude** (number) - Example: `-2.7026693`
  - **original_firebase_data.country** (string) - Example: `"United Kingdom"`
  - **original_firebase_data.created_time** (string) - Example: `"2022-09-29T12:42:24+0100"`
  - **original_firebase_data.credit_limit** (number) - Example: `0`
  - **original_firebase_data.currency_code** (string) - Example: `"GBP"`
  - **original_firebase_data.customer_id** (string) - Example: `"310656000000059331"`
  - **original_firebase_data.customer_name** (string) - Example: `"Silver Mushroom Ltd"`
  - **original_firebase_data.customer_sub_type** (string) - Example: `"business"`
  - **original_firebase_data.email** (string) - Example: `"giddymarie1998@gmail.com"`
  - **original_firebase_data.first_order_date** (string) - Example: `"2022-09-29T00:00:00"`
  - **original_firebase_data.invoice_count** (number) - Example: `8`
  - **original_firebase_data.last_modified** (timestamp) - Example: `"2025-06-17T10:46:18.768Z"`
  - **original_firebase_data.last_modified_time** (string) - Example: `"2025-02-23T11:31:43+0000"`
  - **original_firebase_data.last_order_date** (string) - Example: `"2022-11-28T00:00:00"`
  - **original_firebase_data.location_region** (string) - Example: `"North West"`
  - **original_firebase_data.mobile** (string) - Example: `""`
  - **original_firebase_data.notes** (string) - Example: `""`
  - **original_firebase_data.order_count** (number) - Example: `7`
  - **original_firebase_data.order_ids** (array) - 7 items
  - **original_firebase_data.outstanding_receivable_amount** (number) - Example: `0`
  - **original_firebase_data.overdue_amount** (number) - Example: `0`
  - **original_firebase_data.payment_performance** (number) - Example: `100`
  - **original_firebase_data.payment_terms** (number) - Example: `30`
  - **original_firebase_data.payment_terms_label** (string) - Example: `"Net 30"`
  - **original_firebase_data.phone** (string) - Example: `"01772 737 170"`
  - **original_firebase_data.postcode** (string) - Example: `"WN6 9RS"`
  - **original_firebase_data.salesperson_ids** (array) - 1 items
  - **original_firebase_data.salesperson_names** (array) - 1 items
  - **original_firebase_data.segment** (string) - Example: `"Low"`
  - **original_firebase_data.shipping_address** (map) - 13 fields
    - **original_firebase_data.shipping_address.address** (string) - Example: `""`
    - **original_firebase_data.shipping_address.attention** (string) - Example: `""`
    - **original_firebase_data.shipping_address.city** (string) - Example: `""`
    - **original_firebase_data.shipping_address.company_name** (string) - Example: `""`
    - **original_firebase_data.shipping_address.country** (string) - Example: `""`
    - **original_firebase_data.shipping_address.country_code** (string) - Example: `"GB"`
    - **original_firebase_data.shipping_address.county** (string) - Example: `""`
    - **original_firebase_data.shipping_address.fax** (string) - Example: `""`
    - **original_firebase_data.shipping_address.phone** (string) - Example: `""`
    - **original_firebase_data.shipping_address.state** (string) - Example: `""`
    - **original_firebase_data.shipping_address.state_code** (string) - Example: `""`
    - **original_firebase_data.shipping_address.street2** (string) - Example: `""`
    - **original_firebase_data.shipping_address.zip** (string) - Example: `""`
  - **original_firebase_data.status** (string) - Example: `"active"`
  - **original_firebase_data.terms** (string) - Example: `"Proforma"`
  - **original_firebase_data.top_purchased_items** (array) - 9 items
    - **original_firebase_data.top_purchased_items[].item_id** (string) - Example: `"310656000000056247"`
    - **original_firebase_data.top_purchased_items[].name** (string) - Example: `"Stripes throw Camel"`
    - **original_firebase_data.top_purchased_items[].quantity** (number) - Example: `2`
    - **original_firebase_data.top_purchased_items[].revenue** (number) - Example: `120`
    - **original_firebase_data.top_purchased_items[].sku** (string) - Example: `"32"`
  - **original_firebase_data.total_invoiced** (number) - Example: `643.2`
  - **original_firebase_data.total_items** (number) - Example: `17`
  - **original_firebase_data.total_orders_and_invoices** (number) - Example: `15`
  - **original_firebase_data.total_outstanding** (number) - Example: `0`
  - **original_firebase_data.total_paid** (number) - Example: `643.2`
  - **original_firebase_data.total_spent** (number) - Example: `585.6`
  - **original_firebase_data.unused_credits_receivable_amount** (number) - Example: `0`
  - **original_firebase_data.website** (string) - Example: `"silvermushroom.co.uk"`
- **firebase_uid** (string) - Example: `"DFgJyTrpW3RTS2qxYJKup7jF4su2"`
- **zoho_data** (map) - 118 fields: crm_owner_id, opening_balance_amount, approvers_list, is_credit_limit_migration_completed, associated_with_square, is_bcy_only_contact, contact_id, currency_id, phone, tax_reg_no, checks, is_consent_agreed, submitted_by_name, documents, payment_terms, unused_credits_receivable_amount, currency_symbol, opening_balance_amount_bcy, created_by_name, addresses, cf_phone_number_unformatted, tax_treatment, outstanding_ob_payable_amount, currency_code, submitter_id, is_crm_customer, custom_fields, billing_address, last_modified_time, pricebook_name, primary_contact_id, unused_credits_payable_amount_bcy, language_code_formatted, contact_tax_information, facebook, ach_supported, tags, can_show_vendor_ob, credit_limit, submitted_by_photo_url, customer_sub_type, designation, branch_name, payment_terms_label, unused_credits_receivable_amount_bcy, outstanding_receivable_amount, outstanding_payable_amount, outstanding_payable_amount_bcy, zcrm_account_id, submitted_by_email, portal_status, department, company_id, payment_terms_id, location_name, is_sms_enabled, contact_name, is_client_review_settings_enabled, zcrm_contact_id, submitted_date, shipping_address, location_id, created_date, status, is_client_review_asked, credit_limit_exceeded_amount, created_time, entity_address_id, website, sales_channel, bank_accounts, contact_salutation, contact_type, zohopeople_client_id, vpa_list, company_name, cf_phone_number, outstanding_ob_receivable_amount, last_name, approver_id, can_show_customer_ob, price_precision, first_name, has_transaction, notes, owner_id, outstanding_receivable_amount_bcy, twitter, contact_category, cards, unused_credits_payable_amount, portal_receipt_count, opening_balances, branch_id, vat_reg_no, source, customer_currency_summaries, tax_reg_label, is_linked_with_zohocrm, is_taxable, mobile, payment_reminder_enabled, unused_retainer_payments, integration_references, label_for_company_id, vat_treatment, submitted_by, custom_field_hash, owner_name, language_code, country_code, pricebook_id, consent_date, default_templates, exchange_rate, invited_by, contact_persons, email
  - **zoho_data.ach_supported** (boolean) - Example: `false`
  - **zoho_data.addresses** (array) - 0 items
    - **zoho_data.addresses[].address** (string) - Example: `"Flat 3, 154 Church Road"`
    - **zoho_data.addresses[].address_id** (string) - Example: `"310656000000083464"`
    - **zoho_data.addresses[].attention** (string) - Example: `""`
    - **zoho_data.addresses[].city** (string) - Example: `"London"`
    - **zoho_data.addresses[].country** (string) - Example: `"United Kingdom"`
    - **zoho_data.addresses[].country_code** (string) - Example: `"GB"`
    - **zoho_data.addresses[].fax** (string) - Example: `""`
    - **zoho_data.addresses[].phone** (string) - Example: `""`
    - **zoho_data.addresses[].state** (string) - Example: `""`
    - **zoho_data.addresses[].state_code** (string) - Example: `""`
    - **zoho_data.addresses[].street2** (string) - Example: `""`
    - **zoho_data.addresses[].zip** (string) - Example: `"SE19 2NT"`
  - **zoho_data.approver_id** (string) - Example: `""`
  - **zoho_data.approvers_list** (array) - 0 items
  - **zoho_data.associated_with_square** (boolean) - Example: `false`
  - **zoho_data.bank_accounts** (array) - 0 items
  - **zoho_data.billing_address** (map) - 13 fields
    - **zoho_data.billing_address.address** (string) - Example: `"Unit 3a"`
    - **zoho_data.billing_address.address_id** (string) - Example: `"310656000000059334"`
    - **zoho_data.billing_address.attention** (string) - Example: `"Rebecca Kane"`
    - **zoho_data.billing_address.city** (string) - Example: `"Preston"`
    - **zoho_data.billing_address.country** (string) - Example: `"United Kingdom"`
    - **zoho_data.billing_address.country_code** (string) - Example: `"GB"`
    - **zoho_data.billing_address.county** (string) - Example: `""`
    - **zoho_data.billing_address.fax** (string) - Example: `""`
    - **zoho_data.billing_address.phone** (string) - Example: `""`
    - **zoho_data.billing_address.state** (string) - Example: `""`
    - **zoho_data.billing_address.state_code** (string) - Example: `""`
    - **zoho_data.billing_address.street2** (string) - Example: `"Carnfield Place"`
    - **zoho_data.billing_address.zip** (string) - Example: `"PR58AN"`
  - **zoho_data.branch_id** (string) - Example: `""`
  - **zoho_data.branch_name** (string) - Example: `"DMB"`
  - **zoho_data.can_show_customer_ob** (boolean) - Example: `false`
  - **zoho_data.can_show_vendor_ob** (boolean) - Example: `false`
  - **zoho_data.cards** (array) - 0 items
  - **zoho_data.cf_phone_number** (string) - Example: `"01772 737 170"`
  - **zoho_data.cf_phone_number_unformatted** (string) - Example: `"01772 737 170"`
  - **zoho_data.checks** (array) - 0 items
  - **zoho_data.company_id** (string) - Example: `""`
  - **zoho_data.company_name** (string) - Example: `"Silver Mushroom Ltd"`
  - **zoho_data.consent_date** (string) - Example: `""`
  - **zoho_data.contact_category** (string) - Example: `"uk"`
  - **zoho_data.contact_id** (string) - Example: `"310656000000059331"`
  - **zoho_data.contact_name** (string) - Example: `"Silver Mushroom Ltd"`
  - **zoho_data.contact_persons** (array) - 4 items
    - **zoho_data.contact_persons[].can_invite** (boolean) - Example: `true`
    - **zoho_data.contact_persons[].communication_preference** (map) - 1 fields
      - **zoho_data.contact_persons[].communication_preference.is_email_enabled** (boolean) - Example: `true`
    - **zoho_data.contact_persons[].contact_person_id** (string) - Example: `"310656000000059333"`
    - **zoho_data.contact_persons[].department** (string) - Example: `""`
    - **zoho_data.contact_persons[].designation** (string) - Example: `""`
    - **zoho_data.contact_persons[].email** (string) - Example: `"\"giddymarie1998@gmail.com\""`
    - **zoho_data.contact_persons[].fax** (string) - Example: `""`
    - **zoho_data.contact_persons[].first_name** (string) - Example: `"Rebecca"`
    - **zoho_data.contact_persons[].is_added_in_portal** (boolean) - Example: `false`
    - **zoho_data.contact_persons[].is_portal_invitation_accepted** (boolean) - Example: `false`
    - **zoho_data.contact_persons[].is_portal_mfa_enabled** (boolean) - Example: `false`
    - **zoho_data.contact_persons[].is_primary_contact** (boolean) - Example: `true`
    - **zoho_data.contact_persons[].is_sms_enabled_for_cp** (boolean) - Example: `true`
    - **zoho_data.contact_persons[].last_name** (string) - Example: `"Kane"`
    - **zoho_data.contact_persons[].mobile** (string) - Example: `""`
    - **zoho_data.contact_persons[].mobile_code_formatted** (string) - Example: `""`
    - **zoho_data.contact_persons[].mobile_country_code** (string) - Example: `""`
    - **zoho_data.contact_persons[].phone** (string) - Example: `"01772 737 170"`
    - **zoho_data.contact_persons[].photo_url** (string) - Example: `"https://secure.gravatar.com/avatar/56f3e907d7c9cf2..."`
    - **zoho_data.contact_persons[].salutation** (string) - Example: `""`
    - **zoho_data.contact_persons[].skype** (string) - Example: `""`
    - **zoho_data.contact_persons[].zcrm_contact_id** (string) - Example: `""`
  - **zoho_data.contact_salutation** (string) - Example: `""`
  - **zoho_data.contact_tax_information** (string) - Example: `""`
  - **zoho_data.contact_type** (string) - Example: `"customer"`
  - **zoho_data.country_code** (string) - Example: `""`
  - **zoho_data.created_by_name** (string) - Example: `"Matt Langford"`
  - **zoho_data.created_date** (string) - Example: `"29/09/22"`
  - **zoho_data.created_time** (string) - Example: `"2022-09-29T12:42:24+0100"`
  - **zoho_data.credit_limit** (number) - Example: `0`
  - **zoho_data.credit_limit_exceeded_amount** (number) - Example: `0`
  - **zoho_data.crm_owner_id** (string) - Example: `"806490000000432001"`
  - **zoho_data.currency_code** (string) - Example: `"GBP"`
  - **zoho_data.currency_id** (string) - Example: `"310656000000000065"`
  - **zoho_data.currency_symbol** (string) - Example: `"£"`
  - **zoho_data.custom_field_hash** (map) - 2 fields
    - **zoho_data.custom_field_hash.cf_phone_number** (string) - Example: `"01772 737 170"`
    - **zoho_data.custom_field_hash.cf_phone_number_unformatted** (string) - Example: `"01772 737 170"`
  - **zoho_data.custom_fields** (array) - 1 items
    - **zoho_data.custom_fields[].api_name** (string) - Example: `"cf_phone_number"`
    - **zoho_data.custom_fields[].customfield_id** (string) - Example: `"310656000000267316"`
    - **zoho_data.custom_fields[].data_type** (string) - Example: `"phone"`
    - **zoho_data.custom_fields[].edit_on_portal** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].edit_on_store** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].field_id** (string) - Example: `"310656000000267316"`
    - **zoho_data.custom_fields[].index** (number) - Example: `1`
    - **zoho_data.custom_fields[].is_active** (boolean) - Example: `true`
    - **zoho_data.custom_fields[].is_dependent_field** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].label** (string) - Example: `"Phone Number"`
    - **zoho_data.custom_fields[].placeholder** (string) - Example: `"cf_phone_number"`
    - **zoho_data.custom_fields[].search_entity** (string) - Example: `"contact"`
    - **zoho_data.custom_fields[].show_in_all_pdf** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].show_in_portal** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].show_in_store** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].show_on_pdf** (boolean) - Example: `false`
    - **zoho_data.custom_fields[].value** (string) - Example: `"01772 737 170"`
    - **zoho_data.custom_fields[].value_formatted** (string) - Example: `"01772 737 170"`
  - **zoho_data.customer_currency_summaries** (array) - 1 items
    - **zoho_data.customer_currency_summaries[].currency_code** (string) - Example: `"GBP"`
    - **zoho_data.customer_currency_summaries[].currency_id** (string) - Example: `"310656000000000065"`
    - **zoho_data.customer_currency_summaries[].currency_name_formatted** (string) - Example: `"GBP- Pound Sterling"`
    - **zoho_data.customer_currency_summaries[].currency_symbol** (string) - Example: `"£"`
    - **zoho_data.customer_currency_summaries[].is_base_currency** (boolean) - Example: `true`
    - **zoho_data.customer_currency_summaries[].outstanding_receivable_amount** (number) - Example: `0`
    - **zoho_data.customer_currency_summaries[].price_precision** (number) - Example: `2`
    - **zoho_data.customer_currency_summaries[].unused_credits_receivable_amount** (number) - Example: `0`
  - **zoho_data.customer_sub_type** (string) - Example: `"business"`
  - **zoho_data.default_templates** (map) - 30 fields
    - **zoho_data.default_templates.bill_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.bill_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.creditnote_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.creditnote_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.creditnote_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.creditnote_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.estimate_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.estimate_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.estimate_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.estimate_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.invoice_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.invoice_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.invoice_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.invoice_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.payment_remittance_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.payment_remittance_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.paymentthankyou_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.paymentthankyou_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.paymentthankyou_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.paymentthankyou_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.purchaseorder_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.purchaseorder_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.purchaseorder_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.purchaseorder_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.salesorder_email_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.salesorder_email_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.salesorder_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.salesorder_template_name** (string) - Example: `""`
    - **zoho_data.default_templates.statement_template_id** (string) - Example: `""`
    - **zoho_data.default_templates.statement_template_name** (string) - Example: `""`
  - **zoho_data.department** (string) - Example: `""`
  - **zoho_data.designation** (string) - Example: `""`
  - **zoho_data.documents** (array) - 0 items
  - **zoho_data.email** (string) - Example: `"\"giddymarie1998@gmail.com\"\n"`
  - **zoho_data.entity_address_id** (string) - Example: `"310656000001702812"`
  - **zoho_data.exchange_rate** (string) - Example: `""`
  - **zoho_data.facebook** (string) - Example: `""`
  - **zoho_data.first_name** (string) - Example: `"Rebecca"`
  - **zoho_data.has_transaction** (boolean) - Example: `true`
  - **zoho_data.integration_references** (array) - 0 items
  - **zoho_data.invited_by** (string) - Example: `""`
  - **zoho_data.is_bcy_only_contact** (boolean) - Example: `true`
  - **zoho_data.is_client_review_asked** (boolean) - Example: `false`
  - **zoho_data.is_client_review_settings_enabled** (boolean) - Example: `false`
  - **zoho_data.is_consent_agreed** (boolean) - Example: `false`
  - **zoho_data.is_credit_limit_migration_completed** (boolean) - Example: `true`
  - **zoho_data.is_crm_customer** (boolean) - Example: `true`
  - **zoho_data.is_linked_with_zohocrm** (boolean) - Example: `true`
  - **zoho_data.is_sms_enabled** (boolean) - Example: `true`
  - **zoho_data.is_taxable** (boolean) - Example: `true`
  - **zoho_data.label_for_company_id** (string) - Example: `"Company Registration Number"`
  - **zoho_data.language_code** (string) - Example: `""`
  - **zoho_data.language_code_formatted** (string) - Example: `""`
  - **zoho_data.last_modified_time** (string) - Example: `"2025-02-23T11:31:43+0000"`
  - **zoho_data.last_name** (string) - Example: `"Kane"`
  - **zoho_data.location_id** (string) - Example: `""`
  - **zoho_data.location_name** (string) - Example: `"DMB"`
  - **zoho_data.mobile** (string) - Example: `""`
  - **zoho_data.notes** (string) - Example: `""`
  - **zoho_data.opening_balance_amount** (number) - Example: `0`
  - **zoho_data.opening_balance_amount_bcy** (string) - Example: `""`
  - **zoho_data.opening_balances** (array) - 0 items
  - **zoho_data.outstanding_ob_payable_amount** (number) - Example: `0`
  - **zoho_data.outstanding_ob_receivable_amount** (number) - Example: `0`
  - **zoho_data.outstanding_payable_amount** (number) - Example: `0`
  - **zoho_data.outstanding_payable_amount_bcy** (number) - Example: `0`
  - **zoho_data.outstanding_receivable_amount** (number) - Example: `0`
  - **zoho_data.outstanding_receivable_amount_bcy** (number) - Example: `0`
  - **zoho_data.owner_id** (string) - Example: `""`
  - **zoho_data.owner_name** (string) - Example: `""`
  - **zoho_data.payment_reminder_enabled** (boolean) - Example: `true`
  - **zoho_data.payment_terms** (number) - Example: `30`
  - **zoho_data.payment_terms_id** (string) - Example: `""`
  - **zoho_data.payment_terms_label** (string) - Example: `"Net 30"`
  - **zoho_data.phone** (string) - Example: `"01772 737 170"`
  - **zoho_data.portal_receipt_count** (number) - Example: `0`
  - **zoho_data.portal_status** (string) - Example: `"disabled"`
  - **zoho_data.price_precision** (number) - Example: `2`
  - **zoho_data.pricebook_id** (string) - Example: `""`
  - **zoho_data.pricebook_name** (string) - Example: `""`
  - **zoho_data.primary_contact_id** (string) - Example: `"310656000000059333"`
  - **zoho_data.sales_channel** (string) - Example: `"direct_sales"`
  - **zoho_data.shipping_address** (map) - 15 fields
    - **zoho_data.shipping_address.address** (string) - Example: `"Ground Floor Units A1 & 2,"`
    - **zoho_data.shipping_address.address_id** (string) - Example: `"310656000000059336"`
    - **zoho_data.shipping_address.attention** (string) - Example: `"Rebecca Kane"`
    - **zoho_data.shipping_address.city** (string) - Example: `"Wrightington"`
    - **zoho_data.shipping_address.country** (string) - Example: `"United Kingdom"`
    - **zoho_data.shipping_address.country_code** (string) - Example: `"GB"`
    - **zoho_data.shipping_address.county** (string) - Example: `""`
    - **zoho_data.shipping_address.fax** (string) - Example: `""`
    - **zoho_data.shipping_address.latitude** (string) - Example: `""`
    - **zoho_data.shipping_address.longitude** (string) - Example: `""`
    - **zoho_data.shipping_address.phone** (string) - Example: `""`
    - **zoho_data.shipping_address.state** (string) - Example: `""`
    - **zoho_data.shipping_address.state_code** (string) - Example: `""`
    - **zoho_data.shipping_address.street2** (string) - Example: `"Ainscough Trading Estate"`
    - **zoho_data.shipping_address.zip** (string) - Example: `"WN6 9RS"`
  - **zoho_data.source** (string) - Example: `"user"`
  - **zoho_data.status** (string) - Example: `"active"`
  - **zoho_data.submitted_by** (string) - Example: `""`
  - **zoho_data.submitted_by_email** (string) - Example: `""`
  - **zoho_data.submitted_by_name** (string) - Example: `""`
  - **zoho_data.submitted_by_photo_url** (string) - Example: `""`
  - **zoho_data.submitted_date** (string) - Example: `""`
  - **zoho_data.submitter_id** (string) - Example: `""`
  - **zoho_data.tags** (array) - 0 items
  - **zoho_data.tax_reg_label** (string) - Example: `""`
  - **zoho_data.tax_reg_no** (string) - Example: `""`
  - **zoho_data.tax_treatment** (string) - Example: `"uk"`
  - **zoho_data.twitter** (string) - Example: `""`
  - **zoho_data.unused_credits_payable_amount** (number) - Example: `0`
  - **zoho_data.unused_credits_payable_amount_bcy** (number) - Example: `0`
  - **zoho_data.unused_credits_receivable_amount** (number) - Example: `0`
  - **zoho_data.unused_credits_receivable_amount_bcy** (number) - Example: `0`
  - **zoho_data.unused_retainer_payments** (number) - Example: `0`
  - **zoho_data.vat_reg_no** (string) - Example: `""`
  - **zoho_data.vat_treatment** (string) - Example: `"uk"`
  - **zoho_data.vendor_currency_summaries** (array) - 1 items
    - **zoho_data.vendor_currency_summaries[].currency_code** (string) - Example: `"EUR"`
    - **zoho_data.vendor_currency_summaries[].currency_id** (string) - Example: `"310656000000000071"`
    - **zoho_data.vendor_currency_summaries[].currency_name_formatted** (string) - Example: `"EUR- Euro"`
    - **zoho_data.vendor_currency_summaries[].currency_symbol** (string) - Example: `"€"`
    - **zoho_data.vendor_currency_summaries[].is_base_currency** (boolean) - Example: `false`
    - **zoho_data.vendor_currency_summaries[].outstanding_payable_amount** (number) - Example: `1002.4`
    - **zoho_data.vendor_currency_summaries[].price_precision** (number) - Example: `2`
    - **zoho_data.vendor_currency_summaries[].unused_credits_payable_amount** (number) - Example: `0`
  - **zoho_data.vpa_list** (array) - 0 items
  - **zoho_data.website** (string) - Example: `"silvermushroom.co.uk"`
  - **zoho_data.zcrm_account_id** (string) - Example: `"806490000000569001"`
  - **zoho_data.zcrm_contact_id** (string) - Example: `""`
  - **zoho_data.zcrm_vendor_id** (string) - Example: `"806490000000570001"`
  - **zoho_data.zohopeople_client_id** (string) - Example: `""`
- **Primary_Email** (string) - Example: `"giddymarie1998@gmail.com"`
- **lastLogin** (string) - Example: `"2025-06-25T21:49:06.096Z"`
- **lastSeen** (string) - Example: `"2025-06-25T22:25:39.200Z"`
- **isOnline** (boolean) - Example: `false`
- **total_spent** (number) - Example: `363.6`
- **created_time** (string) - Example: `"2022-10-27T08:50:29+0100"`
- **outstanding_receivable_amount** (number) - Example: `0`
- **last_modified_time** (string) - Example: `"2025-02-23T11:31:44+0000"`
- **order_count** (number) - Example: `1`
- **first_order_date** (string) - Example: `"2022-10-27T00:00:00.000Z"`
- **last_order_date** (string) - Example: `"2022-10-27T00:00:00.000Z"`
- **billing_address** (map) - 0 fields: 
- **unused_credits_receivable_amount** (number) - Example: `0`
- **payment_terms** (number) - Example: `0`
- **currency_code** (string) - Example: `"GBP"`
- **phone** (string) - Example: `""`
- **company_name** (string) - Example: `"Ankorstore"`
- **segment** (string) - Example: `"Low"`
- **_source** (string) - Example: `"zoho_inventory"`
- **customer_name** (string) - Example: `"Ankorstore"`
- **shipping_address** (map) - 0 fields: 
- **customer_id** (string) - Example: `"310656000000077001"`
- **average_order_value** (number) - Example: `363.6`
- **email** (string) - Example: `""`
- **status** (string) - Example: `"active"`
- **_lastSynced** (timestamp) - Example: `"2025-07-09T03:02:42.284Z"`

**Sample Data:**
```json
{
  "zoho_region": "eu",
  "sync_status": "success",
  "last_synced": "2025-06-17T13:25:07.738Z",
  "original_firebase_data": {
    "customer_id": "31065600000005****",
    "customer_sub_type": "business",
    "total_paid": 643.2,
    "last_modified": "2025-06-17T10:46:18.768Z",
    "website": "silvermushroom.co.uk",
    "payment_terms_label": "Net 30",
    "total_spent": 585.6,
    "location_region": "North West",
    "total_orders_and_invoices": 15,
    "phone": "01772 737 170",
    "credit_limit": 0,
    "outstanding_receivable_amount": 0,
    "first_order_date": "2022-09-29T00:00:00",
    "_lastSynced": "2025-06-17T10:46:18.768Z",
    "payment_terms": 30,
    "brand_preferences": [
      {
        "quantity": 17,
        "percentage": 156.4207650273224,
        "revenue": 916,
        "brand": "Unknown"
      }
    ],
    "contact_type": "customer",
    "top_purchased_items": [
      {
        "quantity": 2,
        "sku": "32",
        "revenue": 120,
        "name": "Stripes throw Camel",
        "item_id": "31065600000005****"
      },
      {
        "quantity": 1,
        "sku": "6177",
        "revenue": 120,
        "name": "Blocks throw Camel/grey",
        "item_id": "31065600000005****"
      },
      {
        "quantity": 2,
        "sku": "7001",
        "revenue": 120,
        "name": "Classic throw Beige",
        "item_id": "31065600000005****"
      },
      "... and 6 more items"
    ],
    "_syncSource": "python_inventory_sync",
    "unused_credits_receivable_amount": 0,
    "customer_name": "Silver Mushroom Ltd",
    "mobile": "",
    "salesperson_names": [
      "matt"
    ],
    "salesperson_ids": [
      "31065600000005****"
    ],
    "total_outstanding": 0,
    "company_name": "Silver Mushroom Ltd",
    "currency_code": "GBP",
    "segment": "Low",
    "city": "Wrightington",
    "coordinates": {
      "latitude": 53.6079516,
      "longitude": -2.7026693
    },
    "postcode": "WN6 9RS",
    "average_order_value": 83.65714285714286,
    "_enriched_at": "2025-06-16T21:55:04.948Z",
    "payment_performance": 100,
    "shipping_address": {
      "country_code": "GB",
      "address": "",
      "company_name": "",
      "attention": "",
      "state_code": "",
      "city": "",
      "street2": "",
      "state": "",
      "county": "",
      "phone": "",
      "country": "",
      "fax": "",
      "zip": ""
    },
    "total_items": 17,
    "_rebuilt_at": "2025-06-16T00:57:03.912Z",
    "invoice_count": 8,
    "_csv_enriched_at": "2025-06-16T23:11:15.470Z",
    "overdue_amount": 0,
    "status": "active",
    "last_modified_time": "2025-02-23T11:31:43+0000",
    "terms": "Proforma",
    "_source": "firestore_rebuild",
    "billing_address": {
      "country_code": "GB",
      "fax": "",
      "attention": "",
      "address": "",
      "state_code": "",
      "city": "",
      "state": "",
      "county": "",
      "phone": "",
      "country": "",
      "street2": "",
      "zip": ""
    },
    "order_count": 7,
    "last_order_date": "2022-11-28T00:00:00",
    "notes": "",
    "order_ids": [
      "31065600000007****",
      "31065600000009****",
      "31065600000009****",
      "... and 4 more items"
    ],
    "total_invoiced": 643.2,
    "country": "United Kingdom",
    "created_time": "2022-09-29T12:42:24+0100",
    "email": "gid***@gmail.com"
  },
  "firebase_uid": "DFgJyTrpW3RTS2qxYJKup7jF4su2",
  "zoho_data": {
    "crm_owner_id": "80649000000043****",
    "opening_balance_amount": 0,
    "approvers_list": [],
    "is_credit_limit_migration_completed": true,
    "associated_with_square": false,
    "is_bcy_only_contact": true,
    "contact_id": "31065600000005****",
    "currency_id": "31065600000000****",
    "phone": "01772 737 170",
    "tax_reg_no": "",
    "checks": [],
    "is_consent_agreed": false,
    "submitted_by_name": "",
    "documents": [],
    "payment_terms": 30,
    "unused_credits_receivable_amount": 0,
    "currency_symbol": "£",
    "opening_balance_amount_bcy": "",
    "created_by_name": "Matt Langford",
    "addresses": [],
    "cf_phone_number_unformatted": "01772 737 170",
    "tax_treatment": "uk",
    "outstanding_ob_payable_amount": 0,
    "currency_code": "GBP",
    "submitter_id": "",
    "is_crm_customer": true,
    "custom_fields": [
      {
        "is_active": true,
        "show_on_pdf": false,
        "show_in_store": false,
        "show_in_portal": false,
        "value": "01772 737 170",
        "api_name": "cf_phone_number",
        "edit_on_store": false,
        "search_entity": "contact",
        "show_in_all_pdf": false,
        "label": "Phone Number",
        "placeholder": "cf_phone_number",
        "data_type": "phone",
        "value_formatted": "01772 737 170",
        "edit_on_portal": false,
        "customfield_id": "31065600000026****",
        "is_dependent_field": false,
        "field_id": "31065600000026****",
        "index": 1
      }
    ],
    "billing_address": {
      "country_code": "GB",
      "address_id": "31065600000005****",
      "street2": "Carnfield Place",
      "fax": "",
      "state_code": "",
      "city": "Preston",
      "address": "Unit 3a",
      "state": "",
      "county": "",
      "phone": "",
      "country": "United Kingdom",
      "attention": "Rebecca Kane",
      "zip": "PR58AN"
    },
    "last_modified_time": "2025-02-23T11:31:43+0000",
    "pricebook_name": "",
    "primary_contact_id": "31065600000005****",
    "unused_credits_payable_amount_bcy": 0,
    "language_code_formatted": "",
    "contact_tax_information": "",
    "facebook": "",
    "ach_supported": false,
    "tags": [],
    "can_show_vendor_ob": false,
    "credit_limit": 0,
    "submitted_by_photo_url": "",
    "customer_sub_type": "business",
    "designation": "",
    "branch_name": "DMB",
    "payment_terms_label": "Net 30",
    "unused_credits_receivable_amount_bcy": 0,
    "outstanding_receivable_amount": 0,
    "outstanding_payable_amount": 0,
    "outstanding_payable_amount_bcy": 0,
    "zcrm_account_id": "80649000000056****",
    "submitted_by_email": "",
    "portal_status": "disabled",
    "department": "",
    "company_id": "",
    "payment_terms_id": "",
    "location_name": "DMB",
    "is_sms_enabled": true,
    "contact_name": "Silver Mushroom Ltd",
    "is_client_review_settings_enabled": false,
    "zcrm_contact_id": "",
    "submitted_date": "",
    "shipping_address": {
      "fax": "",
      "address_id": "31065600000005****",
      "address": "Ground Floor Units A1 & 2,",
      "street2": "Ainscough Trading Estate",
      "state_code": "",
      "city": "Wrightington",
      "latitude": "",
      "state": "",
      "county": "",
      "phone": "",
      "longitude": "",
      "zip": "WN6 9RS",
      "country_code": "GB",
      "attention": "Rebecca Kane",
      "country": "United Kingdom"
    },
    "location_id": "",
    "created_date": "29/09/22",
    "status": "active",
    "is_client_review_asked": false,
    "credit_limit_exceeded_amount": 0,
    "created_time": "2022-09-29T12:42:24+0100",
    "entity_address_id": "31065600000170****",
    "website": "silvermushroom.co.uk",
    "sales_channel": "direct_sales",
    "bank_accounts": [],
    "contact_salutation": "",
    "contact_type": "customer",
    "zohopeople_client_id": "",
    "vpa_list": [],
    "company_name": "Silver Mushroom Ltd",
    "cf_phone_number": "01772 737 170",
    "outstanding_ob_receivable_amount": 0,
    "last_name": "Kane",
    "approver_id": "",
    "can_show_customer_ob": false,
    "price_precision": 2,
    "first_name": "Rebecca",
    "has_transaction": true,
    "notes": "",
    "owner_id": "",
    "outstanding_receivable_amount_bcy": 0,
    "twitter": "",
    "contact_category": "uk",
    "cards": [],
    "unused_credits_payable_amount": 0,
    "portal_receipt_count": 0,
    "opening_balances": [],
    "branch_id": "",
    "vat_reg_no": "",
    "source": "user",
    "customer_currency_summaries": [
      {
        "outstanding_receivable_amount": 0,
        "price_precision": 2,
        "currency_code": "GBP",
        "unused_credits_receivable_amount": 0,
        "currency_id": "31065600000000****",
        "currency_name_formatted": "GBP- Pound Sterling",
        "currency_symbol": "£",
        "is_base_currency": true
      }
    ],
    "tax_reg_label": "",
    "is_linked_with_zohocrm": true,
    "is_taxable": true,
    "mobile": "",
    "payment_reminder_enabled": true,
    "unused_retainer_payments": 0,
    "integration_references": [],
    "label_for_company_id": "Company Registration Number",
    "vat_treatment": "uk",
    "submitted_by": "",
    "custom_field_hash": {
      "cf_phone_number": "01772 737 170",
      "cf_phone_number_unformatted": "01772 737 170"
    },
    "owner_name": "",
    "language_code": "",
    "country_code": "",
    "pricebook_id": "",
    "consent_date": "",
    "default_templates": {
      "purchaseorder_template_name": "",
      "bill_template_name": "",
      "statement_template_id": "",
      "creditnote_template_id": "",
      "salesorder_email_template_id": "",
      "salesorder_template_id": "",
      "invoice_email_template_name": "",
      "paymentthankyou_email_template_id": "",
      "payment_remittance_email_template_name": "",
      "invoice_template_id": "",
      "salesorder_template_name": "",
      "purchaseorder_email_template_id": "",
      "invoice_email_template_id": "",
      "paymentthankyou_template_name": "",
      "invoice_template_name": "",
      "purchaseorder_template_id": "",
      "statement_template_name": "",
      "estimate_email_template_name": "",
      "creditnote_email_template_name": "",
      "paymentthankyou_email_template_name": "",
      "creditnote_template_name": "",
      "estimate_email_template_id": "",
      "paymentthankyou_template_id": "",
      "creditnote_email_template_id": "",
      "bill_template_id": "",
      "estimate_template_name": "",
      "payment_remittance_email_template_id": "",
      "purchaseorder_email_template_name": "",
      "salesorder_email_template_name": "",
      "estimate_template_id": ""
    },
    "exchange_rate": "",
    "invited_by": "",
    "contact_persons": [
      {
        "can_invite": true,
        "first_name": "Rebecca",
        "mobile": "",
        "is_primary_contact": true,
        "contact_person_id": "31065600000005****",
        "photo_url": "https://secure.gravatar.com/avatar/56f3e907d7c9cf2...",
        "is_added_in_portal": false,
        "phone": "01772 737 170",
        "is_sms_enabled_for_cp": true,
        "department": "",
        "is_portal_invitation_accepted": false,
        "mobile_country_code": "",
        "communication_preference": {
          "is_email_enabled": true
        },
        "zcrm_contact_id": "",
        "fax": "",
        "mobile_code_formatted": "",
        "is_portal_mfa_enabled": false,
        "designation": "",
        "skype": "",
        "last_name": "Kane",
        "salutation": "",
        "email": "\"gi***@gmail.com\""
      },
      {
        "is_portal_mfa_enabled": false,
        "email": "\"gi***@gmail.com\"\n",
        "photo_url": "https://secure.gravatar.com/avatar/22b35a9c8d768a5...",
        "mobile_code_formatted": "",
        "is_primary_contact": false,
        "skype": "",
        "is_added_in_portal": false,
        "can_invite": true,
        "phone": "01772 73****",
        "zcrm_contact_id": "",
        "communication_preference": {
          "is_email_enabled": true
        },
        "fax": "",
        "mobile_country_code": "",
        "last_name": "Brookman",
        "first_name": "Emmie",
        "contact_person_id": "31065600000005****",
        "is_portal_invitation_accepted": false,
        "is_sms_enabled_for_cp": false,
        "department": "",
        "salutation": "Ms.",
        "designation": "",
        "mobile": ""
      },
      {
        "salutation": "Mrs.",
        "is_portal_mfa_enabled": false,
        "mobile_code_formatted": "",
        "can_invite": true,
        "email": "enq***@lewislighthaulage.co.uk",
        "mobile": "",
        "contact_person_id": "31065600000005****",
        "is_portal_invitation_accepted": false,
        "last_name": "Lewis",
        "mobile_country_code": "",
        "first_name": "Laura",
        "phone": "",
        "is_sms_enabled_for_cp": false,
        "fax": "",
        "zcrm_contact_id": "",
        "communication_preference": {
          "is_email_enabled": true
        },
        "designation": "",
        "is_primary_contact": false,
        "photo_url": "https://secure.gravatar.com/avatar/c1c42912ae91de2...",
        "skype": "",
        "department": "",
        "is_added_in_portal": false
      },
      "... and 1 more items"
    ],
    "email": "\"gi***@gmail.com\"\n"
  },
  "Primary_Email": "gid***@gmail.com",
  "lastLogin": "2025-06-25T21:49:06.096Z",
  "lastSeen": "2025-06-25T22:25:39.200Z",
  "isOnline": false
}
```

---

### customers

**Document Count:** 1452
**Sample Document ID:** 310656000000061001

**Complete Field Structure:**

- **customer_id** (string) - Example: `"310656000000061001"`
- **zoho_customer_id** (string) - Example: `"310656000000061001"`
- **firebase_uid** (string) - Example: `"310656000000061001"`
- **customer_name** (string) - Example: `"Corinthia Hotel London"`
- **company_name** (string) - Example: `"CORINTHIA HOTELS"`
- **email** (string) - Example: `"adam.gill@corinthia.com"`
- **phone** (string) - Example: `"02073213135 "`
- **mobile** (string) - Example: `""`
- **website** (string) - Example: `""`
- **billing_address** (map) - 8 fields: attention, street_1, street_2, city, state, postcode, country, country_code
  - **billing_address.attention** (string) - Example: `""`
  - **billing_address.city** (string) - Example: `"London"`
  - **billing_address.country** (string) - Example: `"United Kingdom"`
  - **billing_address.country_code** (string) - Example: `"GB"`
  - **billing_address.postcode** (string) - Example: `"SW1A 2BD"`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.street_1** (string) - Example: `"Whitehall Place"`
  - **billing_address.street_2** (string) - Example: `""`
- **shipping_address** (map) - 8 fields: attention, street_1, street_2, city, state, postcode, country, country_code
  - **shipping_address.attention** (string) - Example: `""`
  - **shipping_address.city** (string) - Example: `"London"`
  - **shipping_address.country** (string) - Example: `"United Kingdom"`
  - **shipping_address.country_code** (string) - Example: `"GB"`
  - **shipping_address.postcode** (string) - Example: `"SW1A 2BD"`
  - **shipping_address.state** (string) - Example: `""`
  - **shipping_address.street_1** (string) - Example: `"Loading Bay- Great Scotland Yard"`
  - **shipping_address.street_2** (string) - Example: `"Whitehall Place"`
- **financial** (map) - 11 fields: credit_limit, credit_used, payment_terms, payment_terms_label, currency_code, vat_number, tax_reg_number, tax_treatment, outstanding_amount, overdue_amount, unused_credits
  - **financial.credit_limit** (number) - Example: `0`
  - **financial.credit_used** (number) - Example: `0`
  - **financial.currency_code** (string) - Example: `"GBP"`
  - **financial.outstanding_amount** (number) - Example: `0`
  - **financial.overdue_amount** (number) - Example: `0`
  - **financial.payment_terms** (number) - Example: `30`
  - **financial.payment_terms_label** (string) - Example: `"Net 30"`
  - **financial.tax_reg_number** (string) - Example: `""`
  - **financial.tax_treatment** (string) - Example: `"uk"`
  - **financial.unused_credits** (number) - Example: `0`
  - **financial.vat_number** (string) - Example: `""`
- **metrics** (map) - 11 fields: total_spent, total_invoiced, total_paid, payment_performance, average_order_value, order_count, invoice_count, first_order_date, last_order_date, days_since_last_order, customer_lifetime_days
  - **metrics.average_order_value** (number) - Example: `1296`
  - **metrics.customer_lifetime_days** (number) - Example: `1009`
  - **metrics.days_since_last_order** (number) - Example: `1009`
  - **metrics.first_order_date** (string) - Example: `"2022-10-01T00:00:00"`
  - **metrics.invoice_count** (number) - Example: `1`
  - **metrics.last_order_date** (string) - Example: `"2022-10-01T00:00:00"`
  - **metrics.order_count** (number) - Example: `1`
  - **metrics.payment_performance** (number) - Example: `100`
  - **metrics.total_invoiced** (number) - Example: `1296`
  - **metrics.total_paid** (number) - Example: `1296`
  - **metrics.total_spent** (number) - Example: `1296`
- **enrichment** (map) - 5 fields: coordinates, location_region, segment, brand_preferences, top_purchased_items
  - **enrichment.brand_preferences** (array) - 1 items
    - **enrichment.brand_preferences[].brand** (string) - Example: `"Unknown"`
    - **enrichment.brand_preferences[].percentage** (number) - Example: `83.33333333333334`
    - **enrichment.brand_preferences[].quantity** (number) - Example: `18`
    - **enrichment.brand_preferences[].revenue** (number) - Example: `1080`
  - **enrichment.coordinates** (map) - 2 fields
    - **enrichment.coordinates.latitude** (number) - Example: `51.5062546`
    - **enrichment.coordinates.longitude** (number) - Example: `-0.125282`
  - **enrichment.location_region** (string) - Example: `"London"`
  - **enrichment.segment** (string) - Example: `"Medium"`
  - **enrichment.top_purchased_items** (array) - 2 items
    - **enrichment.top_purchased_items[].item_id** (string) - Example: `"310656000000058250"`
    - **enrichment.top_purchased_items[].name** (string) - Example: `"Classic throw Plum"`
    - **enrichment.top_purchased_items[].quantity** (number) - Example: `10`
    - **enrichment.top_purchased_items[].revenue** (number) - Example: `600`
    - **enrichment.top_purchased_items[].sku** (string) - Example: `"7032"`
- **contacts** (array) - 3 items - Types: object (3)
- **status** (string) - Example: `"dormant"`
- **customer_type** (string) - Example: `"business"`
- **customer_sub_type** (string) - Example: `"business"`
- **created_date** (timestamp) - Example: `"2022-09-30T23:07:36.000Z"`
- **created_by** (string) - Example: `"migration_script"`
- **updated_by** (string) - Example: `"migration_script"`
- **sync** (map) - 5 fields: last_synced, sync_status, sync_source, zoho_last_modified, last_enriched
  - **sync.last_enriched** (null)
  - **sync.last_synced** (timestamp) - Example: `"2025-06-17T13:25:07.738Z"`
  - **sync.sync_source** (string) - Example: `"zoho_inventory"`
  - **sync.sync_status** (string) - Example: `"success"`
  - **sync.zoho_last_modified** (string) - Example: `"2025-02-23T11:31:43+0000"`
- **notes** (string) - Example: `""`
- **tags** (array) - 0 items
- **custom_fields** (array) - 1 items - Types: object (1)
- **_migration** (map) - 6 fields: migrated_from, migration_date, original_doc_id, migration_version, last_updated, update_count
  - **_migration.last_updated** (timestamp) - Example: `"2025-07-06T00:33:57.488Z"`
  - **_migration.migrated_from** (string) - Example: `"customer_data"`
  - **_migration.migration_date** (timestamp) - Example: `"2025-07-06T00:03:01.615Z"`
  - **_migration.migration_version** (string) - Example: `"1.0"`
  - **_migration.original_doc_id** (string) - Example: `"310656000000061001"`
  - **_migration.update_count** (number) - Example: `4`
- **last_modified** (timestamp) - Example: `"2025-07-06T00:33:57.488Z"`
- **assigned_agent_name** (string) - Example: `""`
- **salesperson_names** (array) - 1 items - Types: string (1)
- **salesperson_zoho_id** (string) - Example: `"310656000000059361"`
- **sales_channel** (string) - Example: `"direct_sales"`
- **assigned_agent_id** (string) - Example: `"310656000000059361"`

**Sample Data:**
```json
{
  "customer_id": "31065600000006****",
  "zoho_customer_id": "31065600000006****",
  "firebase_uid": "31065600000006****",
  "customer_name": "Corinthia Hotel London",
  "company_name": "CORINTHIA HOTELS",
  "email": "ada***@corinthia.com",
  "phone": "02073213135 ",
  "mobile": "",
  "website": "",
  "billing_address": {
    "attention": "",
    "street_1": "Whitehall Place",
    "street_2": "",
    "city": "London",
    "state": "",
    "postcode": "SW1A 2BD",
    "country": "United Kingdom",
    "country_code": "GB"
  },
  "shipping_address": {
    "attention": "",
    "street_1": "Loading Bay- Great Scotland Yard",
    "street_2": "Whitehall Place",
    "city": "London",
    "state": "",
    "postcode": "SW1A 2BD",
    "country": "United Kingdom",
    "country_code": "GB"
  },
  "financial": {
    "credit_limit": 0,
    "credit_used": 0,
    "payment_terms": 30,
    "payment_terms_label": "Net 30",
    "currency_code": "GBP",
    "vat_number": "",
    "tax_reg_number": "",
    "tax_treatment": "uk",
    "outstanding_amount": 0,
    "overdue_amount": 0,
    "unused_credits": 0
  },
  "metrics": {
    "total_spent": 1296,
    "total_invoiced": 1296,
    "total_paid": 1296,
    "payment_performance": 100,
    "average_order_value": 1296,
    "order_count": 1,
    "invoice_count": 1,
    "first_order_date": "2022-10-01T00:00:00",
    "last_order_date": "2022-10-01T00:00:00",
    "days_since_last_order": 1009,
    "customer_lifetime_days": 1009
  },
  "enrichment": {
    "coordinates": {
      "latitude": 51.5062546,
      "longitude": -0.125282
    },
    "location_region": "London",
    "segment": "Medium",
    "brand_preferences": [
      {
        "quantity": 18,
        "percentage": 83.33333333333334,
        "revenue": 1080,
        "brand": "Unknown"
      }
    ],
    "top_purchased_items": [
      {
        "quantity": 10,
        "sku": "7032",
        "revenue": 600,
        "name": "Classic throw Plum",
        "item_id": "31065600000005****"
      },
      {
        "quantity": 8,
        "sku": "7005",
        "revenue": 480,
        "name": "Classic throw Grey",
        "item_id": "31065600000005****"
      }
    ]
  },
  "contacts": [
    {
      "contact_id": "31065600000006****",
      "first_name": "Adam",
      "last_name": "Gill",
      "email": "ada***@corinthia.com",
      "phone": "02073213135 ",
      "mobile": "",
      "designation": "",
      "department": "",
      "is_primary": true,
      "salutation": "Mr."
    },
    {
      "contact_id": "31065600000006****",
      "first_name": "Eloy",
      "last_name": "Conde",
      "email": "elo***@corinthia.com",
      "phone": "",
      "mobile": "",
      "designation": "",
      "department": "",
      "is_primary": false,
      "salutation": ""
    },
    {
      "contact_id": "31065600000008****",
      "first_name": "Accounts",
      "last_name": "Payable",
      "email": "acc***@corinthia.com",
      "phone": "",
      "mobile": "",
      "designation": "",
      "department": "",
      "is_primary": false,
      "salutation": ""
    }
  ],
  "status": "dormant",
  "customer_type": "business",
  "customer_sub_type": "business",
  "created_date": "2022-09-30T23:07:36.000Z",
  "created_by": "migration_script",
  "updated_by": "migration_script",
  "sync": {
    "last_synced": "2025-06-17T13:25:07.738Z",
    "sync_status": "success",
    "sync_source": "zoho_inventory",
    "zoho_last_modified": "2025-02-23T11:31:43+0000",
    "last_enriched": null
  },
  "notes": "",
  "tags": [],
  "custom_fields": [
    {
      "is_active": true,
      "show_on_pdf": false,
      "show_in_store": false,
      "show_in_portal": false,
      "value": "0207321****",
      "api_name": "cf_phone_number",
      "edit_on_store": false,
      "search_entity": "contact",
      "show_in_all_pdf": false,
      "label": "Phone Number",
      "placeholder": "cf_phone_number",
      "data_type": "phone",
      "value_formatted": "0207321****",
      "edit_on_portal": false,
      "customfield_id": "31065600000026****",
      "is_dependent_field": false,
      "field_id": "31065600000026****",
      "index": 1
    }
  ],
  "_migration": {
    "migrated_from": "customer_data",
    "migration_date": "2025-07-06T00:03:01.615Z",
    "original_doc_id": "31065600000006****",
    "migration_version": "1.0",
    "last_updated": "2025-07-06T00:33:57.488Z",
    "update_count": 4
  },
  "last_modified": "2025-07-06T00:33:57.488Z",
  "assigned_agent_name": "",
  "salesperson_names": [
    "matt"
  ],
  "salesperson_zoho_id": "31065600000005****",
  "sales_channel": "direct_sales",
  "assigned_agent_id": "31065600000005****"
}
```

---

### dashboard_cache

**Document Count:** 4
**Sample Document ID:** agent_performance

**Complete Field Structure:**

- **data** (map) - 3 fields: agents, summary, period
  - **data.agents** (array) - 0 items
  - **data.brands** (array) - 6 items
    - **data.brands[].averageOrderValue** (number) - Example: `0`
    - **data.brands[].brand** (string) - Example: `"relaxound"`
    - **data.brands[].marketShare** (number) - Example: `0`
    - **data.brands[].orderCount** (number) - Example: `111`
    - **data.brands[].productCount** (number) - Example: `11`
    - **data.brands[].quantity** (number) - Example: `142`
    - **data.brands[].revenue** (number) - Example: `0`
  - **data.customers** (array) - 34 items
    - **data.customers[].agentId** (string) - Example: `"310656000026622107"`
    - **data.customers[].firstOrderDate** (timestamp) - Example: `"2025-06-05T00:00:00.000Z"`
    - **data.customers[].id** (string) - Example: `"310656000014235711"`
    - **data.customers[].lastOrderDate** (timestamp) - Example: `"2025-06-05T00:00:00.000Z"`
    - **data.customers[].name** (string) - Example: `"A Touch of Simplicity"`
    - **data.customers[].orderCount** (number) - Example: `3`
    - **data.customers[].segment** (string) - Example: `"High"`
    - **data.customers[].totalSpent** (number) - Example: `5926.780000000001`
  - **data.grossRevenue** (number) - Example: `0`
  - **data.netRevenue** (number) - Example: `0`
  - **data.outstandingRevenue** (number) - Example: `0`
  - **data.paidRevenue** (number) - Example: `0`
  - **data.period** (string) - Example: `"30_days"`
  - **data.profitMargin** (number) - Example: `0`
  - **data.segments** (map) - 12 fields
    - **data.segments.high** (number) - Example: `1`
    - **data.segments.highPercentage** (number) - Example: `16.558646381688323`
    - **data.segments.highRevenue** (number) - Example: `5926.780000000001`
    - **data.segments.low** (number) - Example: `22`
    - **data.segments.lowPercentage** (number) - Example: `25.889218627506327`
    - **data.segments.lowRevenue** (number) - Example: `9266.44`
    - **data.segments.medium** (number) - Example: `11`
    - **data.segments.mediumPercentage** (number) - Example: `57.55213499080539`
    - **data.segments.mediumRevenue** (number) - Example: `20599.439999999995`
    - **data.segments.vip** (number) - Example: `0`
    - **data.segments.vipPercentage** (number) - Example: `0`
    - **data.segments.vipRevenue** (number) - Example: `0`
  - **data.summary** (map) - 4 fields
    - **data.summary.activeCustomers** (number) - Example: `34`
    - **data.summary.averageCustomerValue** (number) - Example: `1052.7252941176466`
    - **data.summary.averageRevenue** (number) - Example: `0`
    - **data.summary.averageRevenuePerBrand** (number) - Example: `0`
    - **data.summary.topBrand** (map) - 7 fields
      - **data.summary.topBrand.averageOrderValue** (number) - Example: `0`
      - **data.summary.topBrand.brand** (string) - Example: `"relaxound"`
      - **data.summary.topBrand.marketShare** (number) - Example: `0`
      - **data.summary.topBrand.orderCount** (number) - Example: `111`
      - **data.summary.topBrand.productCount** (number) - Example: `11`
      - **data.summary.topBrand.quantity** (number) - Example: `142`
      - **data.summary.topBrand.revenue** (number) - Example: `0`
    - **data.summary.topPerformer** (null)
    - **data.summary.totalAgents** (number) - Example: `0`
    - **data.summary.totalBrands** (number) - Example: `6`
    - **data.summary.totalCustomers** (number) - Example: `34`
    - **data.summary.totalRevenue** (number) - Example: `0`
  - **data.taxAmount** (number) - Example: `0`
- **timestamp** (string) - Example: `"2025-06-12T02:01:43.678Z"`
- **expires** (string) - Example: `"2025-06-12T04:01:43.678Z"`
- **ttl** (string) - Example: `"2hr"`
- **size** (number) - Example: `116`

**Sample Data:**
```json
{
  "data": {
    "agents": [],
    "summary": {
      "totalAgents": 0,
      "totalRevenue": 0,
      "averageRevenue": 0,
      "topPerformer": null
    },
    "period": "30_days"
  },
  "timestamp": "2025-06-12T02:01:43.678Z",
  "expires": "2025-06-12T04:01:43.678Z",
  "ttl": "2hr",
  "size": 116
}
```

---

### data_adapters

**Document Count:** 1
**Sample Document ID:** tCFGZuPBXI2XgpJIt2VP

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### inventory_transactions

**Document Count:** 1
**Sample Document ID:** Z14Tt5cR7uot0Uwdwy45

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### invoices

**Document Count:** 3618
**Sample Document ID:** 310656000051361857

**Complete Field Structure:**

- **date** (string) - Example: `"2025-06-29"`
- **country** (string) - Example: `""`
- **updated_time** (string) - Example: `"2025-06-29T11:01:46+0100"`
- **zcrm_potential_id** (string) - Example: `""`
- **client_viewed_time** (string) - Example: `""`
- **documents** (string) - Example: `""`
- **has_attachment** (boolean) - Example: `false`
- **billing_address** (map) - 9 fields: zipcode, country, address, city, phone, attention, state, street2, fax
  - **billing_address.address** (string) - Example: `""`
  - **billing_address.attention** (string) - Example: `""`
  - **billing_address.city** (string) - Example: `""`
  - **billing_address.country** (string) - Example: `""`
  - **billing_address.fax** (string) - Example: `""`
  - **billing_address.phone** (string) - Example: `""`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.street2** (string) - Example: `""`
  - **billing_address.zipcode** (string) - Example: `""`
- **location_id** (string) - Example: `"310656000000999035"`
- **_lastSynced** (timestamp) - Example: `"2025-07-06T03:02:27.653Z"`
- **cf_vat_number** (string) - Example: `"GB 851815128"`
- **balance** (number) - Example: `0`
- **invoice_id** (string) - Example: `"310656000051361857"`
- **template_type** (string) - Example: `"standard"`
- **invoice_number** (string) - Example: `"INV-003914"`
- **color_code** (string) - Example: `""`
- **created_time** (string) - Example: `"2025-06-29T11:01:45+0100"`
- **exchange_rate** (number) - Example: `1`
- **custom_fields** (array) - 1 items - Types: object (1)
- **last_payment_date** (string) - Example: `"2025-06-29"`
- **transaction_type** (string) - Example: `"renewal"`
- **created_by** (string) - Example: `"Zoho Inventory"`
- **reference_number** (string) - Example: `"206-3772146-7428337"`
- **tags** (array) - 0 items
- **due_days** (string) - Example: `""`
- **phone** (string) - Example: `""`
- **company_name** (string) - Example: `""`
- **unprocessed_payment_amount** (number) - Example: `0`
- **adjustment** (number) - Example: `0`
- **zcrm_potential_name** (string) - Example: `""`
- **status** (string) - Example: `"paid"`
- **current_sub_status** (string) - Example: `"paid"`
- **_syncSource** (string) - Example: `"zoho_api"`
- **is_viewed_by_client** (boolean) - Example: `false`
- **write_off_amount** (number) - Example: `0`
- **ach_payment_initiated** (boolean) - Example: `false`
- **last_reminder_sent_date** (string) - Example: `""`
- **currency_code** (string) - Example: `"GBP"`
- **total** (number) - Example: `52.49`
- **branch_id** (string) - Example: `"310656000000999035"`
- **current_sub_status_id** (string) - Example: `""`
- **branch_name** (string) - Example: `"DMB"`
- **custom_field_hash** (map) - 2 fields: cf_vat_number, cf_vat_number_unformatted
  - **custom_field_hash.cf_agent** (string) - Example: `"Dave Roberts"`
  - **custom_field_hash.cf_agent_unformatted** (string) - Example: `"806490000000720279"`
  - **custom_field_hash.cf_vat_number** (string) - Example: `"GB 851815128"`
  - **custom_field_hash.cf_vat_number_unformatted** (string) - Example: `"GB 851815128"`
- **shipping_address** (map) - 9 fields: zipcode, country, address, city, phone, attention, state, street2, fax
  - **shipping_address.address** (string) - Example: `""`
  - **shipping_address.attention** (string) - Example: `""`
  - **shipping_address.city** (string) - Example: `""`
  - **shipping_address.country** (string) - Example: `""`
  - **shipping_address.fax** (string) - Example: `""`
  - **shipping_address.phone** (string) - Example: `""`
  - **shipping_address.state** (string) - Example: `""`
  - **shipping_address.street2** (string) - Example: `""`
  - **shipping_address.zipcode** (string) - Example: `""`
- **email** (string) - Example: `""`
- **cf_vat_number_unformatted** (string) - Example: `"GB 851815128"`
- **last_modified_time** (string) - Example: `"2025-06-29T11:01:46+0100"`
- **currency_symbol** (string) - Example: `"£"`
- **due_date** (string) - Example: `"2025-06-29"`
- **is_emailed** (boolean) - Example: `false`
- **payment_expected_date** (string) - Example: `""`
- **reminders_sent** (number) - Example: `0`
- **tax_source** (string) - Example: `"avalara_automation"`
- **salesperson_name** (string) - Example: `""`
- **salesperson_id** (string) - Example: `""`
- **shipping_charge** (number) - Example: `0`
- **schedule_time** (string) - Example: `""`
- **template_id** (string) - Example: `"310656000027270338"`
- **customer_name** (string) - Example: `"Amazon UK - Customer"`
- **customer_id** (string) - Example: `"310656000045626842"`
- **currency_id** (string) - Example: `"310656000000000065"`
- **invoice_url** (string) - Example: `"https://zohosecurepay.eu/inventory/dmbrandsltd/sec..."`
- **mail_first_viewed_time** (string) - Example: `""`
- **mail_last_viewed_time** (string) - Example: `""`
- **is_viewed_in_mail** (boolean) - Example: `false`
- **cf_agent_unformatted** (string) - Example: `"806490000000720279"`
- **cf_agent** (string) - Example: `"Dave Roberts"`

**Sample Data:**
```json
{
  "date": "2025-06-29",
  "country": "",
  "updated_time": "2025-06-29T11:01:46+0100",
  "zcrm_potential_id": "",
  "client_viewed_time": "",
  "documents": "",
  "has_attachment": false,
  "billing_address": {
    "zipcode": "",
    "country": "",
    "address": "",
    "city": "",
    "phone": "",
    "attention": "",
    "state": "",
    "street2": "",
    "fax": ""
  },
  "location_id": "31065600000099****",
  "_lastSynced": "2025-07-06T03:02:27.653Z",
  "cf_vat_number": "GB 851815128",
  "balance": 0,
  "invoice_id": "31065600005136****",
  "template_type": "standard",
  "invoice_number": "INV-003914",
  "color_code": "",
  "created_time": "2025-06-29T11:01:45+0100",
  "exchange_rate": 1,
  "custom_fields": [
    {
      "field_id": "31065600000042****",
      "customfield_id": "31065600000042****",
      "show_in_store": false,
      "show_in_portal": false,
      "is_active": true,
      "index": 1,
      "label": "VAT Number",
      "show_on_pdf": true,
      "edit_on_portal": false,
      "edit_on_store": false,
      "api_name": "cf_vat_number",
      "show_in_all_pdf": true,
      "value_formatted": "GB 851815128",
      "search_entity": "invoice",
      "data_type": "string",
      "placeholder": "cf_vat_number",
      "value": "GB 851815128",
      "is_dependent_field": false
    }
  ],
  "last_payment_date": "2025-06-29",
  "transaction_type": "renewal",
  "created_by": "Zoho Inventory",
  "reference_number": "206-3772146-7428337",
  "tags": [],
  "due_days": "",
  "phone": "",
  "company_name": "",
  "unprocessed_payment_amount": 0,
  "adjustment": 0,
  "zcrm_potential_name": "",
  "status": "paid",
  "current_sub_status": "paid",
  "_syncSource": "zoho_api",
  "is_viewed_by_client": false,
  "write_off_amount": 0,
  "ach_payment_initiated": false,
  "last_reminder_sent_date": "",
  "currency_code": "GBP",
  "total": 52.49,
  "branch_id": "31065600000099****",
  "current_sub_status_id": "",
  "branch_name": "DMB",
  "custom_field_hash": {
    "cf_vat_number": "GB 851815128",
    "cf_vat_number_unformatted": "GB 851815128"
  },
  "shipping_address": {
    "zipcode": "",
    "country": "",
    "address": "",
    "city": "",
    "phone": "",
    "attention": "",
    "state": "",
    "street2": "",
    "fax": ""
  },
  "email": "",
  "cf_vat_number_unformatted": "GB 851815128",
  "last_modified_time": "2025-06-29T11:01:46+0100",
  "currency_symbol": "£",
  "due_date": "2025-06-29",
  "is_emailed": false,
  "payment_expected_date": "",
  "reminders_sent": 0,
  "tax_source": "avalara_automation",
  "salesperson_name": "",
  "salesperson_id": "",
  "shipping_charge": 0,
  "schedule_time": "",
  "template_id": "31065600002727****",
  "customer_name": "Amazon UK - Customer",
  "customer_id": "31065600004562****",
  "currency_id": "31065600000000****",
  "invoice_url": "https://zohosecurepay.eu/inventory/dmbrandsltd/sec..."
}
```

---

### item_categories

**Document Count:** 4378
**Sample Document ID:** CAT_1751750771545_0enjdwsor

**Complete Field Structure:**

- **id** (string) - Example: `"CAT_1751750771545_0enjdwsor"`
- **category_id** (string) - Example: `"CAT_1751750771545_0enjdwsor"`
- **category_name** (array) - 5 items - Types: string (5)
- **description** (string) - Example: `""`
- **is_active** (boolean) - Example: `true`
- **created_date** (timestamp) - Example: `"2025-07-05T21:26:11.545Z"`
- **created_by** (string) - Example: `"migration_script"`
- **_migrated_from_zoho** (boolean) - Example: `true`

**Sample Data:**
```json
{
  "id": "CAT_1751750771545_0enjdwsor",
  "category_id": "CAT_1751750771545_0enjdwsor",
  "category_name": [
    "cushion",
    "dark-grey",
    "grey",
    "... and 2 more items"
  ],
  "description": "",
  "is_active": true,
  "created_date": "2025-07-05T21:26:11.545Z",
  "created_by": "migration_script",
  "_migrated_from_zoho": true
}
```

---

### items

**Document Count:** 6552
**Sample Document ID:** 310656000000051244

**Complete Field Structure:**

- **item_type** (string) - Example: `"inventory"`
- **cf_committed_stock** (string) - Example: `"0.00"`
- **is_linked_with_zohocrm** (boolean) - Example: `true`
- **has_attachment** (boolean) - Example: `true`
- **source** (string) - Example: `"csv"`
- **purchase_description** (string) - Example: `"Elvang Teddy bear Beige"`
- **image_name** (string) - Example: `"1060.jpg"`
- **_synced_at** (timestamp) - Example: `"2025-06-16T00:01:39.918Z"`
- **track_inventory** (boolean) - Example: `true`
- **_sync_batch** (number) - Example: `6`
- **is_returnable** (boolean) - Example: `false`
- **sku** (string) - Example: `"1060"`
- **brand** (string) - Example: `"Elvang"`
- **height** (string) - Example: `""`
- **image_type** (string) - Example: `"jpg"`
- **tax_exemption_code** (string) - Example: `""`
- **created_time** (string) - Example: `"2022-09-29T12:27:57+0100"`
- **image_document_id** (string) - Example: `"310656000003778337"`
- **upc** (string) - Example: `""`
- **weight** (string) - Example: `""`
- **tax_id** (string) - Example: `"310656000000059451"`
- **tags** (array) - 0 items
- **cf_actual_available_in_stock** (string) - Example: `"0"`
- **unit** (string) - Example: `"pcs"`
- **purchase_account_id** (string) - Example: `"310656000000000509"`
- **weight_unit** (string) - Example: `"kg"`
- **name** (string) - Example: `"Elvang Teddy bear Beige"`
- **part_number** (string) - Example: `""`
- **_source** (string) - Example: `"zoho_inventory"`
- **can_be_purchased** (boolean) - Example: `true`
- **is_storage_location_enabled** (boolean) - Example: `false`
- **status** (string) - Example: `"active"`
- **is_combo_product** (boolean) - Example: `false`
- **isbn** (string) - Example: `""`
- **can_be_sold** (boolean) - Example: `true`
- **cf_actual_available_in_stock_unformatted** (string) - Example: `"0"`
- **purchase_rate** (number) - Example: `18.2`
- **description** (string) - Example: `"Elvang Teddy bear Beige"`
- **zcrm_product_id** (string) - Example: `"806490000000561001"`
- **ean** (string) - Example: `"5701311910600"`
- **rate** (number) - Example: `29.36`
- **account_name** (string) - Example: `"Sales"`
- **show_in_storefront** (boolean) - Example: `false`
- **_sync_timestamp** (string) - Example: `"2025-06-16T01:01:39.523258"`
- **dimension_unit** (string) - Example: `"cm"`
- **last_modified_time** (string) - Example: `"2025-06-08T21:18:35+0100"`
- **item_id** (string) - Example: `"310656000000051244"`
- **tax_name** (string) - Example: `"Standard Rate"`
- **length** (string) - Example: `""`
- **item_name** (string) - Example: `"Elvang Teddy bear Beige"`
- **cf_committed_stock_unformatted** (string) - Example: `"0.00"`
- **tax_exemption_id** (string) - Example: `""`
- **account_id** (string) - Example: `"310656000000000376"`
- **purchase_account_name** (string) - Example: `"Cost of Goods Sold"`
- **tax_percentage** (number) - Example: `20`
- **width** (string) - Example: `""`
- **is_taxable** (boolean) - Example: `true`
- **_syncSource** (string) - Example: `"python_inventory_sync"`
- **Manufacturer** (string) - Example: `"Elvang"`
- **actual_available_stock** (number) - Example: `4`
- **available_stock** (number) - Example: `4`
- **stock_on_hand** (number) - Example: `4`
- **_lastSynced** (timestamp) - Example: `"2025-06-17T10:37:20.131Z"`
- **category_name** (string) - Example: `"Uncategorized"`
- **variable_pricing** (boolean) - Example: `false`
- **retail_price** (number) - Example: `29.36`
- **_migrated_from** (string) - Example: `"zoho_inventory"`
- **reorder_level** (number) - Example: `10`
- **minimum_order_qty** (number) - Example: `1`
- **item_imgs** (array) - 0 items
- **stock_total** (number) - Example: `4`
- **vendor_name** (string) - Example: `"Elvang"`
- **_original_id** (string) - Example: `"310656000000051244"`
- **created_by** (string) - Example: `"migration_script"`
- **part_no** (string) - Example: `"1060"`
- **product_type** (string) - Example: `"Goods"`
- **purchase_price** (number) - Example: `18.2`
- **updated_by** (string) - Example: `"migration_script"`
- **created_date** (string) - Example: `"2022-09-29T12:27:57+0100"`
- **estimated_delivery** (number) - Example: `7`
- **item_description** (string) - Example: `"Elvang Teddy bear Beige"`
- **reorder_quantity** (number) - Example: `1`
- **tax** (map) - 4 fields: tax_exempt, tax_rate, tax_code, tax_name
  - **tax.tax_code** (string) - Example: `"VAT20"`
  - **tax.tax_exempt** (boolean) - Example: `false`
  - **tax.tax_name** (string) - Example: `"Standard Rate"`
  - **tax.tax_rate** (number) - Example: `20`
- **manufacturer** (map) - 4 fields: manufacturer_contact, manufacturer_part_number, manufacturer_name, manufacturer_website
  - **manufacturer.manufacturer_contact** (string) - Example: `""`
  - **manufacturer.manufacturer_name** (string) - Example: `"Elvang"`
  - **manufacturer.manufacturer_part_number** (string) - Example: `"1060"`
  - **manufacturer.manufacturer_website** (string) - Example: `""`
- **shipping** (map) - 6 fields: is_fragile, weight_unit, shipping_class, weight, is_hazardous, requires_special_handling
  - **shipping.is_fragile** (boolean) - Example: `false`
  - **shipping.is_hazardous** (boolean) - Example: `false`
  - **shipping.requires_special_handling** (boolean) - Example: `false`
  - **shipping.shipping_class** (string) - Example: `"standard"`
  - **shipping.weight** (number) - Example: `0`
  - **shipping.weight_unit** (string) - Example: `"kg"`
- **inventory_valuation** (map) - 4 fields: total_value, method, average_cost, last_cost
  - **inventory_valuation.average_cost** (number) - Example: `0`
  - **inventory_valuation.last_cost** (number) - Example: `18.2`
  - **inventory_valuation.method** (string) - Example: `"FIFO"`
  - **inventory_valuation.total_value** (number) - Example: `0`
- **wholesale_price** (number) - Example: `0`
- **bulk_pricing** (array) - 0 items
- **package_info** (map) - 6 fields: package_width, package_height, package_weight_unit, package_length, package_weight, package_unit
  - **package_info.package_height** (number) - Example: `null`
  - **package_info.package_length** (number) - Example: `null`
  - **package_info.package_unit** (string) - Example: `"cm"`
  - **package_info.package_weight** (number) - Example: `null`
  - **package_info.package_weight_unit** (string) - Example: `"kg"`
  - **package_info.package_width** (number) - Example: `null`
- **cost_price** (number) - Example: `18.2`
- **dimensions** (map) - 8 fields: volume, diameter, weight_unit, length, width, weight, dimension_unit, height
  - **dimensions.diameter** (number) - Example: `null`
  - **dimensions.dimension_unit** (string) - Example: `"cm"`
  - **dimensions.height** (number) - Example: `null`
  - **dimensions.length** (number) - Example: `null`
  - **dimensions.volume** (number) - Example: `null`
  - **dimensions.weight** (number) - Example: `null`
  - **dimensions.weight_unit** (string) - Example: `"kg"`
  - **dimensions.width** (number) - Example: `null`
- **_migration_date** (timestamp) - Example: `"2025-07-05T18:22:47.610Z"`
- **vendor_id** (string) - Example: `"ve-002"`
- **stock_committed** (number) - Example: `0`
- **stock_available** (number) - Example: `4`
- **category_id** (string) - Example: `"CAT_1751762107155_e9b4bvb73"`
- **_migration** (map) - 2 fields: last_updated, update_count
  - **_migration.last_updated** (timestamp) - Example: `"2025-07-06T00:35:17.315Z"`
  - **_migration.update_count** (number) - Example: `3`
- **last_modified** (timestamp) - Example: `"2025-07-06T00:35:17.315Z"`
- **vendor_updated_by** (string) - Example: `"mapping_script"`
- **vendor_updated_at** (timestamp) - Example: `"2025-07-06T18:46:44.589Z"`

**Sample Data:**
```json
{
  "item_type": "inventory",
  "cf_committed_stock": "0.00",
  "is_linked_with_zohocrm": true,
  "has_attachment": true,
  "source": "csv",
  "purchase_description": "Elvang Teddy bear Beige",
  "image_name": "1060.jpg",
  "_synced_at": "2025-06-16T00:01:39.918Z",
  "track_inventory": true,
  "_sync_batch": 6,
  "is_returnable": false,
  "sku": "1060",
  "brand": "Elvang",
  "height": "",
  "image_type": "jpg",
  "tax_exemption_code": "",
  "created_time": "2022-09-29T12:27:57+0100",
  "image_document_id": "31065600000377****",
  "upc": "",
  "weight": "",
  "tax_id": "31065600000005****",
  "tags": [],
  "cf_actual_available_in_stock": "0",
  "unit": "pcs",
  "purchase_account_id": "31065600000000****",
  "weight_unit": "kg",
  "name": "Elvang Teddy bear Beige",
  "part_number": "",
  "_source": "zoho_inventory",
  "can_be_purchased": true,
  "is_storage_location_enabled": false,
  "status": "active",
  "is_combo_product": false,
  "isbn": "",
  "can_be_sold": true,
  "cf_actual_available_in_stock_unformatted": "0",
  "purchase_rate": 18.2,
  "description": "Elvang Teddy bear Beige",
  "zcrm_product_id": "80649000000056****",
  "ean": "570131191****",
  "rate": 29.36,
  "account_name": "Sales",
  "show_in_storefront": false,
  "_sync_timestamp": "2025-06-16T01:01:39.523258",
  "dimension_unit": "cm",
  "last_modified_time": "2025-06-08T21:18:35+0100",
  "item_id": "31065600000005****",
  "tax_name": "Standard Rate",
  "length": "",
  "item_name": "Elvang Teddy bear Beige",
  "cf_committed_stock_unformatted": "0.00",
  "tax_exemption_id": "",
  "account_id": "31065600000000****",
  "purchase_account_name": "Cost of Goods Sold",
  "tax_percentage": 20,
  "width": "",
  "is_taxable": true,
  "_syncSource": "python_inventory_sync",
  "Manufacturer": "Elvang",
  "actual_available_stock": 4,
  "available_stock": 4,
  "stock_on_hand": 4,
  "_lastSynced": "2025-06-17T10:37:20.131Z",
  "category_name": "Uncategorized",
  "variable_pricing": false,
  "retail_price": 29.36,
  "_migrated_from": "zoho_inventory",
  "reorder_level": 10,
  "minimum_order_qty": 1,
  "item_imgs": [],
  "stock_total": 4,
  "vendor_name": "Elvang",
  "_original_id": "31065600000005****",
  "created_by": "migration_script",
  "part_no": "1060",
  "product_type": "Goods",
  "purchase_price": 18.2,
  "updated_by": "migration_script",
  "created_date": "2022-09-29T12:27:57+0100",
  "estimated_delivery": 7,
  "item_description": "Elvang Teddy bear Beige",
  "reorder_quantity": 1,
  "tax": {
    "tax_exempt": false,
    "tax_rate": 20,
    "tax_code": "VAT20",
    "tax_name": "Standard Rate"
  },
  "manufacturer": {
    "manufacturer_contact": "",
    "manufacturer_part_number": "1060",
    "manufacturer_name": "Elvang",
    "manufacturer_website": ""
  },
  "shipping": {
    "is_fragile": false,
    "weight_unit": "kg",
    "shipping_class": "standard",
    "weight": 0,
    "is_hazardous": false,
    "requires_special_handling": false
  },
  "inventory_valuation": {
    "total_value": 0,
    "method": "FIFO",
    "average_cost": 0,
    "last_cost": 18.2
  },
  "wholesale_price": 0,
  "bulk_pricing": [],
  "package_info": {
    "package_width": null,
    "package_height": null,
    "package_weight_unit": "kg",
    "package_length": null,
    "package_weight": null,
    "package_unit": "cm"
  },
  "cost_price": 18.2,
  "dimensions": {
    "volume": null,
    "diameter": null,
    "weight_unit": "kg",
    "length": null,
    "width": null,
    "weight": null,
    "dimension_unit": "cm",
    "height": null
  },
  "_migration_date": "2025-07-05T18:22:47.610Z",
  "vendor_id": "ve-002",
  "stock_committed": 0,
  "stock_available": 4,
  "category_id": "CAT_1751762107155_e9b4bvb73",
  "_migration": {
    "last_updated": "2025-07-06T00:35:17.315Z",
    "update_count": 3
  },
  "last_modified": "2025-07-06T00:35:17.315Z",
  "vendor_updated_by": "mapping_script",
  "vendor_updated_at": "2025-07-06T18:46:44.589Z"
}
```

---

### items_data

**Document Count:** 6553
**Sample Document ID:** CcvZiYzHDa72mLVvC1KN

**Complete Field Structure:**

- **id** (string) - Example: `"ITEM_1751750778881_0brg4qm4n"`
- **item_id** (string) - Example: `"ITEM_1751750778881_0brg4qm4n"`
- **vendor_name** (string) - Example: `"Elvang"`
- **vendor_id** (string) - Example: `"VEND_1751750766027_jmunqw7ve"`
- **brand** (string) - Example: `"Elvang"`
- **brand_name** (string) - Example: `"Elvang"`
- **brand_normalized** (string) - Example: `"elvang"`
- **item_name** (string) - Example: `"Elvang Teddy bear Beige"`
- **item_description** (string) - Example: `"Elvang Teddy bear Beige"`
- **sku** (string) - Example: `"1060"`
- **ean** (string) - Example: `"5701311910600"`
- **part_no** (string) - Example: `""`
- **stock_total** (number) - Example: `4`
- **stock_committed** (number) - Example: `0`
- **stock_available** (number) - Example: `4`
- **reorder_level** (number) - Example: `10`
- **purchase_price** (number) - Example: `18.2`
- **retail_price** (number) - Example: `29.36`
- **category_id** (string) - Example: `"CAT_1751750771545_zc2sciqjg"`
- **category_name** (string) - Example: `"Uncategorized"`
- **status** (string) - Example: `"active"`
- **tax** (map) - 4 fields: tax_rate, tax_exempt, tax_name, tax_type
  - **tax.tax_exempt** (boolean) - Example: `false`
  - **tax.tax_name** (string) - Example: `"Standard Rate"`
  - **tax.tax_rate** (number) - Example: `20`
  - **tax.tax_type** (string) - Example: `"ItemAmount"`
- **product_type** (string) - Example: `"Goods"`
- **minimum_order_qty** (number) - Example: `1`
- **estimated_delivery** (number) - Example: `7`
- **dimensions** (map) - 6 fields: length, height, width, weight, dimension_unit, weight_unit
  - **dimensions.dimension_unit** (string) - Example: `"cm"`
  - **dimensions.height** (number) - Example: `0`
  - **dimensions.length** (number) - Example: `0`
  - **dimensions.weight** (number) - Example: `0`
  - **dimensions.weight_unit** (string) - Example: `"kg"`
  - **dimensions.width** (number) - Example: `0`
- **item_imgs** (array) - 0 items
- **variable_pricing** (boolean) - Example: `false`
- **is_returnable** (boolean) - Example: `false`
- **created_date** (timestamp) - Example: `"2022-09-29T11:27:57.000Z"`
- **last_modified** (timestamp) - Example: `"2025-07-05T21:26:18.881Z"`
- **created_by** (string) - Example: `"migration_script"`
- **updated_by** (string) - Example: `"migration_script"`
- **manufacturer** (map) - 4 fields: manufacturer_contact, manufacturer_part_number, manufacturer_name, manufacturer_website
  - **manufacturer.manufacturer_contact** (string) - Example: `""`
  - **manufacturer.manufacturer_name** (string) - Example: `"Elvang"`
  - **manufacturer.manufacturer_part_number** (string) - Example: `"1060"`
  - **manufacturer.manufacturer_website** (string) - Example: `""`
- **_migrated_from_zoho** (boolean) - Example: `true`
- **_original_zoho_id** (string) - Example: `"310656000000051244"`
- **_original_firebase_id** (string) - Example: `"310656000000051244"`
- **_migration_date** (timestamp) - Example: `"2025-07-05T21:26:18.881Z"`

**Sample Data:**
```json
{}
```

---

### items_enhanced

**Document Count:** 1
**Sample Document ID:** YXQAi6x5Ji5YQ4H3PwGP

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### messages

**Document Count:** 19
**Sample Document ID:** 016w2U0Qnsk5WdTFNoJB

**Complete Field Structure:**

- **conversationId** (string) - Example: `"w3AYu9GLTXpJsQ6dNahz"`
- **senderId** (string) - Example: `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"`
- **senderName** (string) - Example: `"User"`
- **recipientId** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **recipientName** (string) - Example: `"Sammie Blair"`
- **content** (string) - Example: `"Hello"`
- **timestamp** (timestamp) - Example: `"2025-06-24T19:30:10.919Z"`
- **read** (boolean) - Example: `true`
- **senderRole** (string) - Example: `"brandManager"`
- **recipientRole** (string) - Example: `"salesAgent"`

**Sample Data:**
```json
{
  "conversationId": "w3AYu9GLTXpJsQ6dNahz",
  "senderId": "E4yjW9IcjpMldf7qZI31bGFB9Hz2",
  "senderName": "User",
  "recipientId": "AXhQKHGiUOXPgeBIwUaYCyfZrV63",
  "recipientName": "Sammie Blair",
  "content": "Hello",
  "timestamp": "2025-06-24T19:30:10.919Z",
  "read": true
}
```

---

### migration_logs

**Document Count:** 6
**Sample Document ID:** inventory_migration_1751687037350

**Complete Field Structure:**

- **migration_date** (timestamp) - Example: `"2025-07-05T03:43:57.350Z"`
- **migration_version** (string) - Example: `"1.0.0"`
- **dry_run** (boolean) - Example: `true`
- **results** (map) - 5 fields: vendors, items, customers, categories, warehouse
  - **results.branch** (map) - 2 fields
    - **results.branch.created** (number) - Example: `1`
    - **results.branch.errors** (number) - Example: `0`
  - **results.categories** (map) - 2 fields
    - **results.categories.created** (number) - Example: `0`
    - **results.categories.errors** (number) - Example: `0`
  - **results.customerData** (map) - 3 fields
    - **results.customerData.errors** (number) - Example: `0`
    - **results.customerData.migrated** (number) - Example: `0`
    - **results.customerData.skipped** (number) - Example: `0`
  - **results.customers** (map) - 3 fields
    - **results.customers.errors** (number) - Example: `0`
    - **results.customers.migrated** (number) - Example: `0`
    - **results.customers.skipped** (number) - Example: `0`
  - **results.invoices** (map) - 3 fields
    - **results.invoices.errors** (number) - Example: `0`
    - **results.invoices.migrated** (number) - Example: `3904`
    - **results.invoices.skipped** (number) - Example: `0`
  - **results.items** (map) - 3 fields
    - **results.items.errors** (number) - Example: `0`
    - **results.items.migrated** (number) - Example: `0`
    - **results.items.skipped** (number) - Example: `0`
  - **results.orders** (map) - 3 fields
    - **results.orders.errors** (number) - Example: `0`
    - **results.orders.migrated** (number) - Example: `190`
    - **results.orders.skipped** (number) - Example: `0`
  - **results.users** (map) - 3 fields
    - **results.users.errors** (number) - Example: `0`
    - **results.users.migrated** (number) - Example: `0`
    - **results.users.skipped** (number) - Example: `0`
  - **results.vendors** (map) - 2 fields
    - **results.vendors.created** (number) - Example: `0`
    - **results.vendors.errors** (number) - Example: `0`
  - **results.warehouse** (map) - 2 fields
    - **results.warehouse.created** (number) - Example: `0`
    - **results.warehouse.errors** (number) - Example: `0`
- **collections_created** (array) - 14 items - Types: string (14)
- **config** (map) - 5 fields: dryRun, batchSize, createMissingCollections, preserveExistingData, logLevel
  - **config.batchSize** (number) - Example: `100`
  - **config.createMissingCollections** (boolean) - Example: `true`
  - **config.dryRun** (boolean) - Example: `true`
  - **config.logLevel** (string) - Example: `"info"`
  - **config.preserveExistingData** (boolean) - Example: `true`
- **enhanced_fields** (array) - 8 items - Types: string (8)
- **migration_type** (string) - Example: `"user_structure_separation"`

**Sample Data:**
```json
{
  "migration_date": "2025-07-05T03:43:57.350Z",
  "migration_version": "1.0.0",
  "dry_run": true,
  "results": {
    "vendors": {
      "created": 0,
      "errors": 0
    },
    "items": {
      "migrated": 0,
      "skipped": 0,
      "errors": 0
    },
    "customers": {
      "migrated": 0,
      "skipped": 0,
      "errors": 0
    },
    "categories": {
      "created": 0,
      "errors": 0
    },
    "warehouse": {
      "created": 0,
      "errors": 0
    }
  },
  "collections_created": [
    "items",
    "customer_data",
    "sync_metadata",
    "... and 11 more items"
  ],
  "config": {
    "dryRun": true,
    "batchSize": 100,
    "createMissingCollections": true,
    "preserveExistingData": true,
    "logLevel": "info"
  }
}
```

---

### normalized_invoices

**Document Count:** 88
**Sample Document ID:** 310656000051361857

**Complete Field Structure:**

- **date** (string) - Example: `"2025-06-29"`
- **_syncSource** (string) - Example: `"zoho_api"`
- **due_date** (string) - Example: `"2025-06-29"`
- **salesAgent_uid** (string) - Example: `"CxX522VYW7SbbOUm5gLlTv8gpZs2"`
- **_lastSynced** (timestamp) - Example: `"2025-07-06T03:02:27.353Z"`
- **salesperson_id** (string) - Example: `"310656000000059361"`
- **total** (number) - Example: `52.49`
- **balance** (number) - Example: `0`
- **customer_email** (string) - Example: `""`
- **invoice_id** (string) - Example: `"310656000051361857"`
- **_source** (string) - Example: `"zoho_api"`
- **_normalized_at** (timestamp) - Example: `"2025-07-06T03:02:27.353Z"`
- **customer_name** (string) - Example: `"Amazon UK - Customer"`
- **customer_id** (string) - Example: `"310656000045626842"`
- **days_overdue** (number) - Example: `0`
- **invoice_number** (string) - Example: `"INV-003914"`
- **status** (string) - Example: `"paid"`

**Sample Data:**
```json
{
  "date": "2025-06-29",
  "_syncSource": "zoho_api",
  "due_date": "2025-06-29",
  "salesAgent_uid": null,
  "_lastSynced": "2025-07-06T03:02:27.353Z",
  "salesperson_id": null,
  "total": 52.49,
  "balance": 0,
  "customer_email": "",
  "invoice_id": "31065600005136****",
  "_source": "zoho_api",
  "_normalized_at": "2025-07-06T03:02:27.353Z",
  "customer_name": "Amazon UK - Customer",
  "customer_id": "31065600004562****",
  "days_overdue": 0,
  "invoice_number": "INV-003914",
  "status": "paid"
}
```

---

### notifications

**Document Count:** 74
**Sample Document ID:** 09IXfexA6u6k5mNl29X4

**Complete Field Structure:**

- **type** (string) - Example: `"customer_signup_processed"`
- **recipientId** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **title** (string) - Example: `"Customer Approved"`
- **message** (string) - Example: `"sammielayton2 has been approved."`
- **createdAt** (string) - Example: `"2025-06-21T20:52:48.503Z"`
- **read** (boolean) - Example: `true`
- **readAt** (string) - Example: `"2025-06-21T20:57:42.676Z"`
- **recipientEmail** (string) - Example: `"sammie@dmbrands.co.uk"`
- **data** (map) - 5 fields: pendingOrderId, orderNumber, customerName, total, itemCount
  - **data.companyName** (string) - Example: `"ABCD Ltd"`
  - **data.contactName** (string) - Example: `"sammie layton"`
  - **data.customerName** (string) - Example: `"romanfahls@gmail.com"`
  - **data.email** (string) - Example: `"theblair2@gmail.com"`
  - **data.isExistingCustomer** (boolean) - Example: `false`
  - **data.itemCount** (number) - Example: `2`
  - **data.orderId** (string) - Example: `"plbrQwzusgvDL61QHXOO"`
  - **data.orderNumber** (string) - Example: `"SO-1750598482903"`
  - **data.pendingCustomerId** (string) - Example: `"wpqEVSjjLqswTGnImxuS"`
  - **data.pendingOrderId** (string) - Example: `"U0rTniXnQJhjXewt5gsp"`
  - **data.total** (number) - Example: `106.2`
  - **data.zohoOrderId** (string) - Example: `"310656000050751558"`
- **recipientRole** (string) - Example: `"brandManager"`

**Sample Data:**
```json
{
  "type": "customer_signup_processed",
  "recipientId": "AXhQKHGiUOXPgeBIwUaYCyfZrV63",
  "title": "Customer Approved",
  "message": "sammielayton2 has been approved.",
  "createdAt": "2025-06-21T20:52:48.503Z",
  "read": true,
  "readAt": "2025-06-21T20:57:42.676Z"
}
```

---

### orders

**Document Count:** 190
**Sample Document ID:** 310656000045121114

**Complete Field Structure:**

- **can_send_in_mail** (boolean) - Example: `false`
- **zcrm_potential_id** (string) - Example: `""`
- **discount** (number) - Example: `0`
- **taxes** (array) - 1 items - Types: object (1)
- **shipment_date** (string) - Example: `"2025-05-19"`
- **billing_address** (map) - 12 fields: zip, country, country_code, address, city, phone, county, attention, state, street2, fax, state_code
  - **billing_address.address** (string) - Example: `""`
  - **billing_address.attention** (string) - Example: `""`
  - **billing_address.city** (string) - Example: `""`
  - **billing_address.country** (string) - Example: `""`
  - **billing_address.country_code** (string) - Example: `""`
  - **billing_address.county** (string) - Example: `""`
  - **billing_address.fax** (string) - Example: `""`
  - **billing_address.phone** (string) - Example: `""`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.state_code** (string) - Example: `""`
  - **billing_address.street2** (string) - Example: `""`
  - **billing_address.zip** (string) - Example: `""`
- **line_items** (array) - 1 items - Types: object (1)
- **can_show_kit_return** (boolean) - Example: `false`
- **is_test_order** (boolean) - Example: `false`
- **location_id** (string) - Example: `"310656000000999035"`
- **submitted_by_email** (string) - Example: `""`
- **order_status** (string) - Example: `"closed"`
- **balance** (number) - Example: `0`
- **invoices** (array) - 1 items - Types: object (1)
- **bcy_shipping_charge_tax** (string) - Example: `""`
- **terms** (string) - Example: `""`
- **total_quantity** (number) - Example: `1`
- **picklists** (array) - 0 items
- **mail_first_viewed_time** (string) - Example: `""`
- **has_qty_cancelled** (boolean) - Example: `false`
- **sub_total_inclusive_of_tax** (number) - Example: `0`
- **exchange_rate** (number) - Example: `1`
- **mail_last_viewed_time** (string) - Example: `""`
- **approver_id** (string) - Example: `""`
- **estimate_id** (string) - Example: `""`
- **contact_person_details** (array) - 0 items
- **merchant_name** (string) - Example: `""`
- **sales_channel** (string) - Example: `"amazon_uk"`
- **packages** (array) - 1 items - Types: object (1)
- **reference_number** (string) - Example: `"026-1829506-0249102"`
- **shipping_charge_tax_id** (string) - Example: `""`
- **sub_total_exclusive_of_discount** (number) - Example: `8.25`
- **purchaseorders** (array) - 0 items
- **location_name** (string) - Example: `"DMB"`
- **vat_treatment** (string) - Example: `"uk"`
- **is_dropshipped** (boolean) - Example: `false`
- **has_discount** (boolean) - Example: `false`
- **discount_percent** (number) - Example: `0`
- **page_height** (string) - Example: `"11.69in"`
- **shipping_charge_tax_name** (string) - Example: `""`
- **status** (string) - Example: `"fulfilled"`
- **discount_total** (number) - Example: `0`
- **integration_id** (string) - Example: `"310656000005661829"`
- **tax_total** (number) - Example: `1.65`
- **invoiced_status** (string) - Example: `"invoiced"`
- **shipped_status** (string) - Example: `"fulfilled"`
- **payments** (array) - 1 items - Types: object (1)
- **salesorder_id** (string) - Example: `"310656000045121114"`
- **shipping_details** (map) - 0 fields: 
- **shipping_charge_taxes** (array) - 0 items
- **currency_code** (string) - Example: `"GBP"`
- **page_width** (string) - Example: `"8.27in"`
- **refunds** (array) - 0 items
- **sub_statuses** (array) - 0 items
- **bcy_total** (number) - Example: `9.9`
- **marketplace_so_id** (string) - Example: `"026-1829506-0249102"`
- **is_adv_tracking_in_package** (boolean) - Example: `false`
- **delivery_method_id** (string) - Example: `""`
- **delivery_method** (string) - Example: `""`
- **tracking_url** (string) - Example: `""`
- **tax_rounding** (string) - Example: `"item_level"`
- **adjustment_description** (string) - Example: `"Adjustment"`
- **last_modified_time** (string) - Example: `"2025-05-20T14:07:17+0100"`
- **currency_symbol** (string) - Example: `"£"`
- **is_kit_partial_return** (boolean) - Example: `false`
- **discount_type** (string) - Example: `"item_level"`
- **transaction_rounding_type** (string) - Example: `"no_rounding"`
- **roundoff_value** (number) - Example: `0`
- **template_name** (string) - Example: `"Standard Template"`
- **sales_channel_formatted** (string) - Example: `"Amazon UK"`
- **has_unconfirmed_line_item** (boolean) - Example: `false`
- **salesorder_number** (string) - Example: `"SO-02790"`
- **template_id** (string) - Example: `"310656000000000111"`
- **customer_name** (string) - Example: `"Amazon UK - Customer"`
- **customer_id** (string) - Example: `"310656000002341121"`
- **is_taxable** (boolean) - Example: `false`
- **is_reverse_charge_applied** (boolean) - Example: `false`
- **payment_terms_label** (string) - Example: `"Due On Receipt"`
- **date** (string) - Example: `"2025-05-17"`
- **submitted_date** (string) - Example: `""`
- **notes** (string) - Example: `""`
- **documents** (array) - 0 items
- **pickup_location_id** (string) - Example: `""`
- **source** (string) - Example: `"Api"`
- **created_by_name** (string) - Example: `""`
- **entity_tags** (string) - Example: `""`
- **shipping_charge_inclusive_of_tax** (number) - Example: `0`
- **last_modified_by_id** (string) - Example: `""`
- **contact** (map) - 4 fields: is_credit_limit_migration_completed, unused_customer_credits, credit_limit, customer_balance
  - **contact.credit_limit** (number) - Example: `0`
  - **contact.customer_balance** (number) - Example: `0`
  - **contact.is_credit_limit_migration_completed** (boolean) - Example: `true`
  - **contact.unused_customer_credits** (number) - Example: `0`
- **contact_category** (string) - Example: `"uk"`
- **template_type** (string) - Example: `"standard"`
- **shipping_charge_tax_exemption_code** (string) - Example: `""`
- **color_code** (string) - Example: `""`
- **contact_persons** (array) - 0 items
- **billing_address_id** (string) - Example: `""`
- **shipping_charge_tax** (string) - Example: `""`
- **bcy_tax_total** (number) - Example: `1.65`
- **created_time** (string) - Example: `"2025-05-17T19:34:37+0100"`
- **shipping_address_id** (string) - Example: `""`
- **is_inclusive_tax** (boolean) - Example: `true`
- **custom_fields** (array) - 0 items
- **salesreturns** (array) - 0 items
- **shipping_charge_tax_exemption_id** (string) - Example: `""`
- **price_precision** (number) - Example: `2`
- **submitted_by_photo_url** (string) - Example: `""`
- **approvers_list** (array) - 0 items
- **tax_treatment** (string) - Example: `"uk"`
- **so_cycle_preference** (map) - 7 fields: socycle_status, can_create_invoice, is_feature_enabled, invoice_preference, can_create_package, shipment_preference, can_create_shipment
  - **so_cycle_preference.can_create_invoice** (boolean) - Example: `false`
  - **so_cycle_preference.can_create_package** (boolean) - Example: `false`
  - **so_cycle_preference.can_create_shipment** (boolean) - Example: `false`
  - **so_cycle_preference.invoice_preference** (map) - 4 fields
    - **so_cycle_preference.invoice_preference.mark_as_sent** (boolean) - Example: `false`
    - **so_cycle_preference.invoice_preference.payment_account_id** (string) - Example: `"310656000000000349"`
    - **so_cycle_preference.invoice_preference.payment_mode_id** (string) - Example: `"310656000000000199"`
    - **so_cycle_preference.invoice_preference.record_payment** (boolean) - Example: `false`
  - **so_cycle_preference.is_feature_enabled** (boolean) - Example: `false`
  - **so_cycle_preference.shipment_preference** (map) - 3 fields
    - **so_cycle_preference.shipment_preference.default_carrier** (string) - Example: `""`
    - **so_cycle_preference.shipment_preference.deliver_shipments** (boolean) - Example: `false`
    - **so_cycle_preference.shipment_preference.send_notification** (boolean) - Example: `false`
  - **so_cycle_preference.socycle_status** (string) - Example: `"completed"`
- **shipping_charge_tax_percentage** (string) - Example: `""`
- **tds_calculation_type** (string) - Example: `"tds_item_level"`
- **adjustment** (number) - Example: `0`
- **zcrm_potential_name** (string) - Example: `""`
- **created_by_id** (string) - Example: `""`
- **submitted_by_name** (string) - Example: `""`
- **current_sub_status** (string) - Example: `"closed"`
- **_syncSource** (string) - Example: `"zoho_api"`
- **is_discount_before_tax** (boolean) - Example: `true`
- **attachment_name** (string) - Example: `""`
- **rounding_mode** (string) - Example: `"round_half_up"`
- **shipping_charge_inclusive_of_tax_formatted** (string) - Example: `"£0.00"`
- **merchant_id** (string) - Example: `""`
- **payment_terms** (number) - Example: `0`
- **is_backordered** (boolean) - Example: `false`
- **shipping_charge_exclusive_of_tax** (number) - Example: `0`
- **total** (number) - Example: `9.9`
- **contact_persons_associated** (array) - 0 items
- **shipping_charge_exclusive_of_tax_formatted** (string) - Example: `"£0.00"`
- **branch_id** (string) - Example: `"310656000000999035"`
- **creditnotes** (array) - 0 items
- **current_sub_status_id** (string) - Example: `""`
- **branch_name** (string) - Example: `"DMB"`
- **custom_field_hash** (map) - 0 fields: 
  - **custom_field_hash.cf_agent** (string) - Example: `"Gay Croker"`
  - **custom_field_hash.cf_agent_unformatted** (string) - Example: `"806490000000515916"`
- **is_viewed_in_mail** (boolean) - Example: `false`
- **bcy_rounding_mode** (string) - Example: `"round_half_up"`
- **bcy_shipping_charge** (number) - Example: `0`
- **shipping_address** (map) - 13 fields: zip, country, address, city, county, country_code, phone, company_name, attention, state, street2, fax, state_code
  - **shipping_address.address** (string) - Example: `"Flat 35, Jubilee Heights"`
  - **shipping_address.attention** (string) - Example: `"Izabela Nonas"`
  - **shipping_address.city** (string) - Example: `"LONDON"`
  - **shipping_address.company_name** (string) - Example: `""`
  - **shipping_address.country** (string) - Example: `"United Kingdom"`
  - **shipping_address.country_code** (string) - Example: `"GB"`
  - **shipping_address.county** (string) - Example: `""`
  - **shipping_address.fax** (string) - Example: `""`
  - **shipping_address.phone** (string) - Example: `"07769925281"`
  - **shipping_address.state** (string) - Example: `""`
  - **shipping_address.state_code** (string) - Example: `""`
  - **shipping_address.street2** (string) - Example: `"Parkside Avenue"`
  - **shipping_address.zip** (string) - Example: `"SE10 8FN"`
- **can_manually_fulfill** (boolean) - Example: `false`
- **created_by_email** (string) - Example: `""`
- **bcy_discount_total** (number) - Example: `0`
- **shipping_charge_tax_formatted** (string) - Example: `""`
- **orientation** (string) - Example: `"portrait"`
- **shipping_charge_tax_type** (string) - Example: `""`
- **discount_applied_on_amount** (number) - Example: `0`
- **is_scheduled_for_quick_shipment_create** (boolean) - Example: `false`
- **paid_status** (string) - Example: `"paid"`
- **is_manually_fulfilled** (boolean) - Example: `false`
- **account_identifier** (string) - Example: `"A1F83G8C2ARO7P"`
- **warehouses** (array) - 3 items - Types: object (3)
- **submitted_by** (string) - Example: `""`
- **submitter_id** (string) - Example: `""`
- **reverse_charge_tax_total** (number) - Example: `0`
- **bcy_sub_total** (number) - Example: `8.25`
- **is_emailed** (boolean) - Example: `false`
- **offline_created_date_with_time** (string) - Example: `""`
- **tax_source** (string) - Example: `"avalara_automation"`
- **has_shipping_address** (boolean) - Example: `true`
- **salesperson_name** (string) - Example: `""`
- **salesperson_id** (string) - Example: `""`
- **shipping_charge** (number) - Example: `0`
- **bcy_adjustment** (number) - Example: `0`
- **computation_type** (string) - Example: `"avalara_automation"`
- **sub_total** (number) - Example: `8.25`
- **created_date** (string) - Example: `"2025-05-17"`
- **currency_id** (string) - Example: `"310656000000000065"`
- **_lastSynced** (timestamp) - Example: `"2025-06-16T20:01:44.302Z"`
- **discount_amount** (number) - Example: `23.41`

**Sample Data:**
```json
{
  "can_send_in_mail": false,
  "zcrm_potential_id": "",
  "discount": 0,
  "taxes": [
    {
      "tax_amount": 1.65,
      "tax_name": "Amazon UK Sales Tax",
      "tax_amount_formatted": "£1.65"
    }
  ],
  "shipment_date": "2025-05-19",
  "billing_address": {
    "zip": "",
    "country": "",
    "country_code": "",
    "address": "",
    "city": "",
    "phone": "",
    "county": "",
    "attention": "",
    "state": "",
    "street2": "",
    "fax": "",
    "state_code": ""
  },
  "line_items": [
    {
      "line_item_id": "31065600004512****",
      "variant_id": "31065600000178****",
      "item_id": "31065600000178****",
      "is_returnable": true,
      "product_id": "31065600000178****",
      "attribute_name1": "",
      "attribute_name2": "",
      "attribute_name3": "",
      "attribute_option_name1": "",
      "attribute_option_name2": "",
      "attribute_option_name3": "",
      "attribute_option_data1": "",
      "attribute_option_data2": "",
      "attribute_option_data3": "",
      "is_combo_product": false,
      "combo_type": "",
      "warehouse_id": "31065600000017****",
      "warehouse_name": "Homearama Warehouse",
      "sku": "SO45",
      "name": "Remember Men's Socks Model SO45 Size 41-46",
      "group_name": "Remember Socks model 45, size 41-46",
      "description": "",
      "item_order": 1,
      "bcy_rate": 9.9,
      "rate": 9.9,
      "sales_rate": 4.13,
      "quantity": 1,
      "quantity_manuallyfulfilled": 0,
      "unit": "pcs",
      "pricebook_id": "",
      "header_id": "",
      "header_name": "",
      "discount_amount": 0,
      "discount": 0,
      "discounts": [],
      "tax_id": "31065600000234****",
      "tax_name": "Amazon UK Sales Tax",
      "tax_type": "tax",
      "tax_percentage": 0,
      "line_item_taxes": [
        {
          "tax_id": "31065600000234****",
          "tax_name": "Amazon UK Sales Tax (0%)",
          "tax_amount": 1.65,
          "tax_percentage": 0,
          "tax_specific_type": "tax"
        }
      ],
      "item_total": 8.25,
      "item_sub_total": 8.25,
      "product_type": "goods",
      "line_item_type": "goods",
      "item_type": "inventory",
      "is_invoiced": true,
      "is_unconfirmed_product": false,
      "tags": [],
      "image_name": "SO45.jpg",
      "image_type": "jpg",
      "image_document_id": "31065600000226****",
      "document_id": "31065600000226****",
      "item_custom_fields": [],
      "custom_field_hash": {},
      "quantity_invoiced": 1,
      "quantity_packed": 1,
      "quantity_shipped": 1,
      "quantity_picked": 0,
      "quantity_backordered": 0,
      "quantity_dropshipped": 0,
      "quantity_cancelled": 0,
      "quantity_delivered": 1,
      "package_details": {
        "length": "",
        "width": "",
        "height": "",
        "weight": "",
        "weight_unit": "kg",
        "dimension_unit": "cm"
      },
      "quantity_invoiced_cancelled": 0,
      "quantity_returned": 0,
      "is_fulfillable": 0,
      "project_id": "",
      "mapped_items": [],
      "item_name": "Remember Men's Socks Model SO45 Size 41-46",
      "total": 8.25
    }
  ],
  "can_show_kit_return": false,
  "is_test_order": false,
  "location_id": "31065600000099****",
  "submitted_by_email": "",
  "order_status": "closed",
  "balance": 0,
  "invoices": [
    {
      "invoice_id": "31065600004512****",
      "invoice_number": "INV-003512",
      "reference_number": "026-1829506-0249102",
      "status": "paid",
      "date": "2025-05-17",
      "due_date": "2025-05-17",
      "total": 9.9,
      "balance": 0
    }
  ],
  "bcy_shipping_charge_tax": "",
  "terms": "",
  "total_quantity": 1,
  "picklists": [],
  "mail_first_viewed_time": "",
  "has_qty_cancelled": false,
  "sub_total_inclusive_of_tax": 0,
  "exchange_rate": 1,
  "mail_last_viewed_time": "",
  "approver_id": "",
  "estimate_id": "",
  "contact_person_details": [],
  "merchant_name": "",
  "sales_channel": "amazon_uk",
  "packages": [
    {
      "package_id": "31065600004512****",
      "package_number": "PKG-02994",
      "date": "2025-05-17",
      "status": "delivered",
      "detailed_status": "Delivered",
      "status_message": "DELIVERED ",
      "shipment_id": "31065600004525****",
      "shipment_number": "SHP-02771",
      "shipment_status": "delivered",
      "carrier": "UPS",
      "service": "UPS Standard®",
      "tracking_number": "1Z145F3V6893560554",
      "shipment_date": "2025-05-19",
      "delivery_days": "",
      "delivery_guarantee": false,
      "delivery_method": "UPS",
      "quantity": 1,
      "is_tracking_enabled": false,
      "shipment_order": {
        "shipment_id": "31065600004525****",
        "shipment_number": "SHP-02771",
        "shipment_date": "2025-05-19",
        "shipment_date_with_time": "2025-05-19 00:00",
        "tracking_number": "1Z145F3V6893560554",
        "delivery_date": "",
        "delivery_date_with_time": "",
        "expected_delivery_date": "",
        "shipment_delivered_date": "",
        "shipment_type": "single_piece_shipment",
        "associated_packages_count": 1,
        "carrier": "UPS",
        "service": "UPS Standard®",
        "delivery_days": "",
        "delivery_guarantee": false,
        "tracking_url": "DELIVERED ",
        "is_carrier_shipment": true
      }
    }
  ],
  "reference_number": "026-1829506-0249102",
  "shipping_charge_tax_id": "",
  "sub_total_exclusive_of_discount": 8.25,
  "purchaseorders": [],
  "location_name": "DMB",
  "vat_treatment": "uk",
  "is_dropshipped": false,
  "has_discount": false,
  "discount_percent": 0,
  "page_height": "11.69in",
  "shipping_charge_tax_name": "",
  "status": "fulfilled",
  "discount_total": 0,
  "integration_id": "31065600000566****",
  "tax_total": 1.65,
  "invoiced_status": "invoiced",
  "shipped_status": "fulfilled",
  "payments": [
    {
      "payment_id": "31065600004512****",
      "payment_mode": "Bank Remittance",
      "payment_mode_id": "31065600000000****",
      "amount": 9.9,
      "date": "2025-05-17",
      "offline_created_date_with_time": "",
      "description": "",
      "reference_number": "",
      "account_id": "31065600000000****",
      "account_name": "Petty Cash",
      "payment_type": "Invoice Payments"
    }
  ],
  "salesorder_id": "31065600004512****",
  "shipping_details": {},
  "shipping_charge_taxes": [],
  "currency_code": "GBP",
  "page_width": "8.27in",
  "refunds": [],
  "sub_statuses": [],
  "bcy_total": 9.9,
  "marketplace_so_id": "026-1829506-0249102",
  "is_adv_tracking_in_package": false,
  "delivery_method_id": "",
  "delivery_method": "",
  "tracking_url": "",
  "tax_rounding": "item_level",
  "adjustment_description": "Adjustment",
  "last_modified_time": "2025-05-20T14:07:17+0100",
  "currency_symbol": "£",
  "is_kit_partial_return": false,
  "discount_type": "item_level",
  "transaction_rounding_type": "no_rounding",
  "roundoff_value": 0,
  "template_name": "Standard Template",
  "sales_channel_formatted": "Amazon UK",
  "has_unconfirmed_line_item": false,
  "salesorder_number": "SO-02790",
  "template_id": "31065600000000****",
  "customer_name": "Amazon UK - Customer",
  "customer_id": "31065600000234****",
  "is_taxable": false,
  "is_reverse_charge_applied": false,
  "payment_terms_label": "Due On Receipt",
  "date": "2025-05-17",
  "submitted_date": "",
  "notes": "",
  "documents": [],
  "pickup_location_id": "",
  "source": "Api",
  "created_by_name": "",
  "entity_tags": "",
  "shipping_charge_inclusive_of_tax": 0,
  "last_modified_by_id": "",
  "contact": {
    "is_credit_limit_migration_completed": true,
    "unused_customer_credits": 0,
    "credit_limit": 0,
    "customer_balance": 0
  },
  "contact_category": "uk",
  "template_type": "standard",
  "shipping_charge_tax_exemption_code": "",
  "color_code": "",
  "contact_persons": [],
  "billing_address_id": "",
  "shipping_charge_tax": "",
  "bcy_tax_total": 1.65,
  "created_time": "2025-05-17T19:34:37+0100",
  "shipping_address_id": "",
  "is_inclusive_tax": true,
  "custom_fields": [],
  "salesreturns": [],
  "shipping_charge_tax_exemption_id": "",
  "price_precision": 2,
  "submitted_by_photo_url": "",
  "approvers_list": [],
  "tax_treatment": "uk",
  "so_cycle_preference": {
    "socycle_status": "completed",
    "can_create_invoice": false,
    "is_feature_enabled": false,
    "invoice_preference": {
      "mark_as_sent": false,
      "payment_account_id": "31065600000000****",
      "record_payment": false,
      "payment_mode_id": "31065600000000****"
    },
    "can_create_package": false,
    "shipment_preference": {
      "default_carrier": "",
      "deliver_shipments": false,
      "send_notification": false
    },
    "can_create_shipment": false
  },
  "shipping_charge_tax_percentage": "",
  "tds_calculation_type": "tds_item_level",
  "adjustment": 0,
  "zcrm_potential_name": "",
  "created_by_id": "",
  "submitted_by_name": "",
  "current_sub_status": "closed",
  "_syncSource": "zoho_api",
  "is_discount_before_tax": true,
  "attachment_name": "",
  "rounding_mode": "round_half_up",
  "shipping_charge_inclusive_of_tax_formatted": "£0.00",
  "merchant_id": "",
  "payment_terms": 0,
  "is_backordered": false,
  "shipping_charge_exclusive_of_tax": 0,
  "total": 9.9,
  "contact_persons_associated": [],
  "shipping_charge_exclusive_of_tax_formatted": "£0.00",
  "branch_id": "31065600000099****",
  "creditnotes": [],
  "current_sub_status_id": "",
  "branch_name": "DMB",
  "custom_field_hash": {},
  "is_viewed_in_mail": false,
  "bcy_rounding_mode": "round_half_up",
  "bcy_shipping_charge": 0,
  "shipping_address": {
    "zip": "SE10 8FN",
    "country": "United Kingdom",
    "address": "Flat 35, Jubilee Heights",
    "city": "LONDON",
    "county": "",
    "country_code": "GB",
    "phone": "0776992****",
    "company_name": "",
    "attention": "Izabela Nonas",
    "state": "",
    "street2": "Parkside Avenue",
    "fax": "",
    "state_code": ""
  },
  "can_manually_fulfill": false,
  "created_by_email": "",
  "bcy_discount_total": 0,
  "shipping_charge_tax_formatted": "",
  "orientation": "portrait",
  "shipping_charge_tax_type": "",
  "discount_applied_on_amount": 0,
  "is_scheduled_for_quick_shipment_create": false,
  "paid_status": "paid",
  "is_manually_fulfilled": false,
  "account_identifier": "A1F83G8C2ARO7P",
  "warehouses": [
    {
      "warehouse_id": "31065600000014****",
      "warehouse_name": "Homearama STAY Warehouse",
      "address": "Homearama",
      "city": "Bampton Business Centre",
      "state": "Bampton",
      "country": "United Kingdom",
      "zip": "OX182AN",
      "phone": "+44190561****",
      "email": "mat***@dmbrands.co.uk",
      "is_primary": false,
      "status": "active",
      "sales_channels": []
    },
    {
      "warehouse_id": "31065600000017****",
      "warehouse_name": "Homearama Warehouse",
      "address": "Homarama",
      "city": "Weald, Bampton",
      "state": "Oxfordshire",
      "country": "United Kingdom",
      "zip": "OX18 2AN",
      "phone": "0199386****",
      "email": "",
      "is_primary": true,
      "status": "active",
      "sales_channels": []
    },
    {
      "warehouse_id": "31065600000099****",
      "warehouse_name": "Amazon FBA Warehouse",
      "address": "",
      "city": "",
      "state": "",
      "country": "United Kingdom",
      "zip": "",
      "phone": "",
      "email": "",
      "is_primary": false,
      "status": "active",
      "sales_channels": []
    }
  ],
  "submitted_by": "",
  "submitter_id": "",
  "reverse_charge_tax_total": 0,
  "bcy_sub_total": 8.25,
  "is_emailed": false,
  "offline_created_date_with_time": "",
  "tax_source": "avalara_automation",
  "has_shipping_address": true,
  "salesperson_name": "",
  "salesperson_id": "",
  "shipping_charge": 0,
  "bcy_adjustment": 0,
  "computation_type": "avalara_automation",
  "sub_total": 8.25,
  "created_date": "2025-05-17",
  "currency_id": "31065600000000****",
  "_lastSynced": "2025-06-16T20:01:44.302Z"
}
```

---

### packing_jobs

**Document Count:** 1
**Sample Document ID:** yMzKhCPat3D2SGLsQJLK

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### packing_stations

**Document Count:** 1
**Sample Document ID:** TE7rb24CGCx28bgUaLR0

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### pending_customers

**Document Count:** 9
**Sample Document ID:** 39TuuM5Nj5WNUfQ7BR8r

**Complete Field Structure:**

- **email** (string) - Example: `"sales@dmbrands.co.uk"`
- **companyName** (string) - Example: `"DMB01"`
- **contactName** (string) - Example: `"Sammie Blair"`
- **phone** (string) - Example: `"07817293765"`
- **address** (string) - Example: `"79 Waterworks Road"`
- **vatNumber** (string) - Example: `"01234567"`
- **website** (string) - Example: `"https://dmbrands.co.uk"`
- **message** (string) - Example: `""`
- **createdAt** (string) - Example: `"2025-06-21T20:56:31.968Z"`
- **existingCustomerId** (string) - Example: `"310656000050105794"`
- **isExistingCustomer** (boolean) - Example: `false`
- **reviewMessage** (string) - Example: `""`
- **reviewedAt** (string) - Example: `"2025-06-21T20:57:22.067Z"`
- **reviewedBy** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **status** (string) - Example: `"approved"`

**Sample Data:**
```json
{
  "email": "sal***@dmbrands.co.uk",
  "companyName": "DMB01",
  "contactName": "Sammie Blair",
  "phone": "0781729****",
  "address": "79 Waterworks Road",
  "vatNumber": "01234567",
  "website": "https://dmbrands.co.uk",
  "message": "",
  "createdAt": "2025-06-21T20:56:31.968Z",
  "existingCustomerId": null,
  "isExistingCustomer": false,
  "reviewMessage": "",
  "reviewedAt": "2025-06-21T20:57:22.067Z",
  "reviewedBy": "AXhQKHGiUOXPgeBIwUaYCyfZrV63",
  "status": "approved"
}
```

---

### pending_orders

**Document Count:** 10
**Sample Document ID:** KDd6NVfrkn95lRWoqohV

**Complete Field Structure:**

- **customer_id** (string) - Example: `"310656000031737739"`
- **customerId** (string) - Example: `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"`
- **customerName** (string) - Example: `"Alastair Blair"`
- **customerEmail** (string) - Example: `"alastair@dmbrands.co.uk"`
- **orderNumber** (string) - Example: `"SO-1751934329899"`
- **items** (array) - 3 items - Types: object (3)
- **subtotal** (number) - Example: `null`
- **vat** (number) - Example: `null`
- **total** (number) - Example: `null`
- **shippingAddress** (map) - 5 fields: address1, street2, city, county, postcode
  - **shippingAddress.address1** (string) - Example: `"25 Middle Street"`
  - **shippingAddress.city** (string) - Example: `"Worcester"`
  - **shippingAddress.county** (string) - Example: `"WORCESTERSHIRE"`
  - **shippingAddress.postcode** (string) - Example: `"WR1 1NQ"`
  - **shippingAddress.street2** (string) - Example: `""`
- **billingAddress** (map) - 5 fields: address1, street2, city, county, postcode
  - **billingAddress.address1** (string) - Example: `"25 Middle Street"`
  - **billingAddress.city** (string) - Example: `"Worcester"`
  - **billingAddress.county** (string) - Example: `"WORCESTERSHIRE"`
  - **billingAddress.postcode** (string) - Example: `"WR1 1NQ"`
  - **billingAddress.street2** (string) - Example: `""`
- **status** (string) - Example: `"pending_approval"`
- **createdAt** (string) - Example: `"2025-07-08T00:25:29.899Z"`
- **updatedAt** (string) - Example: `"2025-07-08T00:25:29.899Z"`
- **customerPhone** (string) - Example: `"07718182168"`
- **customerCompany** (string) - Example: `"Alutions"`
- **zohoContactId** (string) - Example: `"310656000031737739"`
- **zohoPayload** (map) - 15 fields: customer_id, date, line_items, billing_address, shipping_address, billing_street, billing_city, billing_state, billing_zip, billing_country, shipping_street, shipping_city, shipping_state, shipping_zip, shipping_country
  - **zohoPayload.billing_address** (string) - Example: `"25 Middle Street, Worcester WR1 1NQ"`
    - **zohoPayload.billing_address.address** (string) - Example: `"25 Middle Street"`
    - **zohoPayload.billing_address.city** (string) - Example: `"Worcester"`
    - **zohoPayload.billing_address.country** (string) - Example: `"GB"`
    - **zohoPayload.billing_address.phone** (string) - Example: `"07718182168"`
    - **zohoPayload.billing_address.state** (string) - Example: `"worcrestershire"`
    - **zohoPayload.billing_address.street2** (string) - Example: `""`
    - **zohoPayload.billing_address.zip** (string) - Example: `"wr1 1nq"`
  - **zohoPayload.billing_city** (string) - Example: `"Worcester"`
  - **zohoPayload.billing_country** (string) - Example: `"GB"`
  - **zohoPayload.billing_state** (string) - Example: `"WORCESTERSHIRE"`
  - **zohoPayload.billing_street** (string) - Example: `"25 Middle Street"`
  - **zohoPayload.billing_zip** (string) - Example: `"WR1 1NQ"`
  - **zohoPayload.customer_id** (string) - Example: `"310656000031737739"`
  - **zohoPayload.date** (string) - Example: `"2025-07-08"`
  - **zohoPayload.line_items** (array) - 3 items
    - **zohoPayload.line_items[].item_id** (string) - Example: `"ITEM_1751750783180_clz4gj5ly"`
    - **zohoPayload.line_items[].quantity** (number) - Example: `1`
    - **zohoPayload.line_items[].rate** (number) - Example: `0`
  - **zohoPayload.shipping_address** (string) - Example: `"25 Middle Street, Worcester WR1 1NQ"`
    - **zohoPayload.shipping_address.address** (string) - Example: `"25 Middle Street"`
    - **zohoPayload.shipping_address.city** (string) - Example: `"Worcester"`
    - **zohoPayload.shipping_address.country** (string) - Example: `"GB"`
    - **zohoPayload.shipping_address.phone** (string) - Example: `"07718182168"`
    - **zohoPayload.shipping_address.state** (string) - Example: `"worcrestershire"`
    - **zohoPayload.shipping_address.street2** (string) - Example: `""`
    - **zohoPayload.shipping_address.zip** (string) - Example: `"wr1 1nq"`
  - **zohoPayload.shipping_city** (string) - Example: `"Worcester"`
  - **zohoPayload.shipping_country** (string) - Example: `"GB"`
  - **zohoPayload.shipping_state** (string) - Example: `"WORCESTERSHIRE"`
  - **zohoPayload.shipping_street** (string) - Example: `"25 Middle Street"`
  - **zohoPayload.shipping_zip** (string) - Example: `"WR1 1NQ"`
- **rejectedBy** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **rejectedAt** (string) - Example: `"2025-06-27T13:40:18.586Z"`
- **rejectionReason** (string) - Example: `"NOO"`
- **zohoOrderNumber** (string) - Example: `"SO-03096"`
- **zohoOrderId** (string) - Example: `"310656000050816783"`
- **approvedBy** (string) - Example: `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"`
- **approvedAt** (string) - Example: `"2025-06-25T19:09:22.934Z"`

**Sample Data:**
```json
{
  "customer_id": "31065600003173****",
  "customerId": "E4yjW9IcjpMldf7qZI31bGFB9Hz2",
  "customerName": "Alastair Blair",
  "customerEmail": "ala***@dmbrands.co.uk",
  "orderNumber": "SO-1751934329899",
  "items": [
    {
      "id": "ITEM_1751750783180_clz4gj5ly",
      "item_id": "ITEM_1751750783180_clz4gj5ly",
      "name": "",
      "sku": "BM05",
      "price": 0,
      "quantity": 1,
      "unit": "pcs",
      "total": 0
    },
    {
      "id": "ITEM_1751750783180_bov5moo15",
      "item_id": "ITEM_1751750783180_bov5moo15",
      "name": "",
      "sku": "AS01",
      "price": 0,
      "quantity": 1,
      "unit": "pcs",
      "total": 0
    },
    {
      "id": "ITEM_1751750783180_6vpuq7h1k",
      "item_id": "ITEM_1751750783180_6vpuq7h1k",
      "name": "",
      "sku": "BM03",
      "price": 0,
      "quantity": 1,
      "unit": "pcs",
      "total": 0
    }
  ],
  "subtotal": null,
  "vat": null,
  "total": null,
  "shippingAddress": {
    "address1": "25 Middle Street",
    "street2": "",
    "city": "Worcester",
    "county": "WORCESTERSHIRE",
    "postcode": "WR1 1NQ"
  },
  "billingAddress": {
    "address1": "25 Middle Street",
    "street2": "",
    "city": "Worcester",
    "county": "WORCESTERSHIRE",
    "postcode": "WR1 1NQ"
  },
  "status": "pending_approval",
  "createdAt": "2025-07-08T00:25:29.899Z",
  "updatedAt": "2025-07-08T00:25:29.899Z",
  "customerPhone": "0771818****",
  "customerCompany": "Alutions",
  "zohoContactId": "31065600003173****",
  "zohoPayload": {
    "customer_id": "31065600003173****",
    "date": "2025-07-08",
    "line_items": [
      {
        "item_id": "ITEM_1751750783180_clz4gj5ly",
        "quantity": 1,
        "rate": 0
      },
      {
        "item_id": "ITEM_1751750783180_bov5moo15",
        "quantity": 1,
        "rate": 0
      },
      {
        "item_id": "ITEM_1751750783180_6vpuq7h1k",
        "quantity": 1,
        "rate": 0
      }
    ],
    "billing_address": "25 Middle Street, Worcester WR1 1NQ",
    "shipping_address": "25 Middle Street, Worcester WR1 1NQ",
    "billing_street": "25 Middle Street",
    "billing_city": "Worcester",
    "billing_state": "WORCESTERSHIRE",
    "billing_zip": "WR1 1NQ",
    "billing_country": "GB",
    "shipping_street": "25 Middle Street",
    "shipping_city": "Worcester",
    "shipping_state": "WORCESTERSHIRE",
    "shipping_zip": "WR1 1NQ",
    "shipping_country": "GB"
  }
}
```

---

### processing_metadata

**Document Count:** 1
**Sample Document ID:** customer_sales_agent_processing

**Complete Field Structure:**

- **processing_type** (string) - Example: `"customer_sales_agent_assignment"`
- **status** (string) - Example: `"completed"`
- **stats** (map) - 8 fields: with_salesperson, sales_agent_found, skipped_blank_salesperson, sales_agent_added, errors, with_sales_orders, already_has_salesagent, total_customers
  - **stats.already_has_salesagent** (number) - Example: `0`
  - **stats.errors** (number) - Example: `0`
  - **stats.sales_agent_added** (number) - Example: `0`
  - **stats.sales_agent_found** (number) - Example: `0`
  - **stats.skipped_blank_salesperson** (number) - Example: `0`
  - **stats.total_customers** (number) - Example: `1479`
  - **stats.with_sales_orders** (number) - Example: `0`
  - **stats.with_salesperson** (number) - Example: `0`
- **last_processing** (timestamp) - Example: `"2025-07-02T13:05:15.467Z"`

**Sample Data:**
```json
{
  "processing_type": "customer_sales_agent_assignment",
  "status": "completed",
  "stats": {
    "with_salesperson": 0,
    "sales_agent_found": 0,
    "skipped_blank_salesperson": 0,
    "sales_agent_added": 0,
    "errors": 0,
    "with_sales_orders": 0,
    "already_has_salesagent": 0,
    "total_customers": 1479
  },
  "last_processing": "2025-07-02T13:05:15.467Z"
}
```

---

### products

**Document Count:** 1
**Sample Document ID:** U2vaIwQY3yTkAyIKaAXO

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### purchase_analyses

**Document Count:** 8
**Sample Document ID:** blomus_1749934444012

**Complete Field Structure:**

- **brandId** (string) - Example: `"blomus"`
- **userId** (string) - Example: `"MQb7pLHLimTTljOpv6FX4v5QUPp1"`
- **predictions** (array) - 100 items - Types: object (100)
- **searchData** (array) - 0 items
- **competitorDataSummary** (number) - Example: `0`
- **productsAnalyzed** (number) - Example: `100`
- **timestamp** (timestamp) - Example: `"2025-06-14T20:54:04.058Z"`
- **brandName** (string) - Example: `"Blomus"`

**Sample Data:**
```json
{
  "brandId": "blomus",
  "userId": "MQb7pLHLimTTljOpv6FX4v5QUPp1",
  "predictions": [
    {
      "sku": "66397",
      "product_name": "Blomus Hand Towel  | B 50 cm, T 100 cm",
      "recommendedQuantity": 1,
      "confidence": 0.3,
      "reasoning": "Based on current market conditions",
      "metrics": {
        "avgMonthlySales": 0,
        "searchVolume": 0,
        "competitorStatus": "unknown",
        "daysUntilPeak": 180
      }
    },
    {
      "sku": "63968",
      "product_name": "Blomus Snack Bowl  | H 5 cm, � 8,5 cm",
      "recommendedQuantity": 1,
      "confidence": 0.3,
      "reasoning": "Based on current market conditions",
      "metrics": {
        "avgMonthlySales": 0,
        "searchVolume": 0,
        "competitorStatus": "unknown",
        "daysUntilPeak": 180
      }
    },
    {
      "sku": "63993",
      "product_name": "Blomus Creamer  | H 9,5 cm, T 8,5 cm, � 7,5 cm, V ...",
      "recommendedQuantity": 1,
      "confidence": 0.3,
      "reasoning": "Based on current market conditions",
      "metrics": {
        "avgMonthlySales": 0,
        "searchVolume": 0,
        "competitorStatus": "unknown",
        "daysUntilPeak": 180
      }
    },
    "... and 97 more items"
  ],
  "searchData": [],
  "competitorDataSummary": 0,
  "productsAnalyzed": 100,
  "timestamp": "2025-06-14T20:54:04.058Z"
}
```

---

### purchase_orders

**Document Count:** 133
**Sample Document ID:** PO-1751751027604-bco1ceopd

**Complete Field Structure:**

- **id** (string) - Example: `"PO-1751751027604-bco1ceopd"`
- **purchase_order_id** (string) - Example: `"PO-1751751027604-bco1ceopd"`
- **vendor_name** (string) - Example: `"Unknown Vendor"`
- **order_date** (timestamp) - Example: `"2025-07-05T21:30:27.604Z"`
- **expected_delivery_date** (null)
- **status** (string) - Example: `"issued"`
- **currency_code** (string) - Example: `"GBP"`
- **subtotal** (number) - Example: `0`
- **tax_total** (number) - Example: `0`
- **total** (number) - Example: `0`
- **notes** (string) - Example: `""`
- **delivery_address** (map) - 0 fields: 
  - **delivery_address.address** (string) - Example: `"DM Brands,79 Waterworks Road"`
  - **delivery_address.address1** (string) - Example: `"DM Brands"`
  - **delivery_address.address2** (string) - Example: `"79 Waterworks Road"`
  - **delivery_address.city** (string) - Example: `"Worcester"`
  - **delivery_address.country** (string) - Example: `"United Kingdom"`
  - **delivery_address.email** (string) - Example: `"sales@dmbrands.co.uk"`
  - **delivery_address.is_primary** (boolean) - Example: `true`
  - **delivery_address.is_valid** (boolean) - Example: `false`
  - **delivery_address.is_verifiable** (boolean) - Example: `true`
  - **delivery_address.is_verified** (boolean) - Example: `false`
  - **delivery_address.is_warehouse** (boolean) - Example: `false`
  - **delivery_address.organization_address_id** (string) - Example: `"310656000000059403"`
  - **delivery_address.phone** (string) - Example: `"+441905616006"`
  - **delivery_address.state** (string) - Example: `"Worcestershire"`
  - **delivery_address.zip** (string) - Example: `"WR13EZ"`
- **created_by** (string) - Example: `"migration_script"`
- **created_at** (timestamp) - Example: `"2025-07-05T21:30:27.604Z"`
- **_migrated_from_zoho** (boolean) - Example: `true`
- **_original_zoho_id** (string) - Example: `"2e3OJ1Sjp2FNyMdSzku6"`
- **_original_firebase_id** (string) - Example: `"2e3OJ1Sjp2FNyMdSzku6"`
- **updated_at** (timestamp) - Example: `"2025-07-06T00:45:52.798Z"`
- **_migration** (map) - 2 fields: last_updated, update_count
  - **_migration.last_updated** (timestamp) - Example: `"2025-07-06T00:45:52.798Z"`
  - **_migration.update_count** (number) - Example: `1`
- **purchase_order_number** (string) - Example: `"PO-00002"`
- **vendor_id** (string) - Example: `"310656000000061064"`

**Sample Data:**
```json
{
  "id": "PO-1751751027604-bco1ceopd",
  "purchase_order_id": "PO-1751751027604-bco1ceopd",
  "vendor_name": "Unknown Vendor",
  "order_date": "2025-07-05T21:30:27.604Z",
  "expected_delivery_date": null,
  "status": "issued",
  "currency_code": "GBP",
  "subtotal": 0,
  "tax_total": 0,
  "total": 0,
  "notes": "",
  "delivery_address": {},
  "created_by": "migration_script",
  "created_at": "2025-07-05T21:30:27.604Z",
  "_migrated_from_zoho": true,
  "_original_zoho_id": "2e3OJ1Sjp2FNyMdSzku6",
  "_original_firebase_id": "2e3OJ1Sjp2FNyMdSzku6",
  "updated_at": "2025-07-06T00:45:52.798Z",
  "_migration": {
    "last_updated": "2025-07-06T00:45:52.798Z",
    "update_count": 1
  }
}
```

---

### purchaseorders

**Document Count:** 133
**Sample Document ID:** 2e3OJ1Sjp2FNyMdSzku6

**Complete Field Structure:**

- **can_send_in_mail** (boolean) - Example: `false`
- **delivery_customer_address_id** (string) - Example: `""`
- **discount** (number) - Example: `0`
- **taxes** (array) - 0 items
- **billing_address** (map) - 9 fields: zip, country, address, city, phone, attention, state, street2, fax
  - **billing_address.address** (string) - Example: `""`
  - **billing_address.attention** (string) - Example: `""`
  - **billing_address.city** (string) - Example: `""`
  - **billing_address.country** (string) - Example: `""`
  - **billing_address.fax** (string) - Example: `""`
  - **billing_address.phone** (string) - Example: `""`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.street2** (string) - Example: `""`
  - **billing_address.zip** (string) - Example: `""`
- **line_items** (array) - 3 items - Types: object (3)
- **location_id** (string) - Example: `"310656000000999035"`
- **submitted_by_email** (string) - Example: `""`
- **order_status** (string) - Example: `"closed"`
- **can_mark_as_bill** (boolean) - Example: `false`
- **terms** (string) - Example: `""`
- **advances** (array) - 0 items
- **total_quantity** (number) - Example: `65`
- **has_qty_cancelled** (boolean) - Example: `false`
- **sub_total_inclusive_of_tax** (number) - Example: `0`
- **delivery_customer_id** (string) - Example: `""`
- **exchange_rate** (number) - Example: `1.14`
- **approver_id** (string) - Example: `""`
- **reference_number** (string) - Example: `"1003686"`
- **location_name** (string) - Example: `"DMB"`
- **vat_treatment** (string) - Example: `"non_eu"`
- **vendor_id** (string) - Example: `"310656000000061064"`
- **_source** (string) - Example: `"zoho_inventory"`
- **discount_percent** (number) - Example: `0`
- **page_height** (string) - Example: `"11.69in"`
- **status** (string) - Example: `"received"`
- **discount_total** (number) - Example: `0`
- **discount_account_name** (string) - Example: `""`
- **tax_total** (number) - Example: `0`
- **is_viewed_by_client** (boolean) - Example: `false`
- **purchaseorder_id** (string) - Example: `"310656000000061131"`
- **discount_account_id** (string) - Example: `""`
- **salesorder_id** (string) - Example: `""`
- **currency_code** (string) - Example: `"EUR"`
- **page_width** (string) - Example: `"8.27in"`
- **sub_statuses** (array) - 0 items
- **tax_override_preference** (string) - Example: `"no_override"`
- **tax_rounding** (string) - Example: `"entity_level"`
- **salesorders** (array) - 0 items
- **adjustment_description** (string) - Example: `"Adjustment"`
- **last_modified_time** (string) - Example: `"2025-02-04T15:18:02+0000"`
- **currency_symbol** (string) - Example: `"€"`
- **discount_type** (string) - Example: `"entity_level"`
- **is_adv_tracking_in_receive** (boolean) - Example: `false`
- **purchaseorder_number** (string) - Example: `"PO-00002"`
- **template_name** (string) - Example: `"Standard Template"`
- **is_drop_shipment** (boolean) - Example: `false`
- **template_id** (string) - Example: `"310656000000000109"`
- **can_mark_as_unbill** (boolean) - Example: `false`
- **payment_terms_label** (string) - Example: `"Net 60"`
- **date** (string) - Example: `"2022-09-19"`
- **submitted_date** (string) - Example: `""`
- **delivery_address** (map) - 15 fields: zip, country, address, is_verifiable, is_primary, address2, city, address1, is_warehouse, is_verified, organization_address_id, phone, is_valid, state, email
  - **delivery_address.address** (string) - Example: `"DM Brands,79 Waterworks Road"`
  - **delivery_address.address1** (string) - Example: `"DM Brands"`
  - **delivery_address.address2** (string) - Example: `"79 Waterworks Road"`
  - **delivery_address.city** (string) - Example: `"Worcester"`
  - **delivery_address.country** (string) - Example: `"United Kingdom"`
  - **delivery_address.email** (string) - Example: `"sales@dmbrands.co.uk"`
  - **delivery_address.is_primary** (boolean) - Example: `true`
  - **delivery_address.is_valid** (boolean) - Example: `false`
  - **delivery_address.is_verifiable** (boolean) - Example: `true`
  - **delivery_address.is_verified** (boolean) - Example: `false`
  - **delivery_address.is_warehouse** (boolean) - Example: `false`
  - **delivery_address.organization_address_id** (string) - Example: `"310656000000059403"`
  - **delivery_address.phone** (string) - Example: `"+441905616006"`
  - **delivery_address.state** (string) - Example: `"Worcestershire"`
  - **delivery_address.zip** (string) - Example: `"WR13EZ"`
- **notes** (string) - Example: `""`
- **client_viewed_time** (string) - Example: `""`
- **documents** (array) - 0 items
- **discount_amount** (number) - Example: `0`
- **_synced_at** (timestamp) - Example: `"2025-06-15T23:59:21.277Z"`
- **contact_category** (string) - Example: `"non_eu"`
- **template_type** (string) - Example: `"standard"`
- **_sync_batch** (number) - Example: `1`
- **color_code** (string) - Example: `""`
- **contact_persons** (array) - 1 items - Types: string (1)
- **billing_address_id** (string) - Example: `"310656000000061067"`
- **created_time** (string) - Example: `"2022-10-01T00:29:58+0100"`
- **is_inclusive_tax** (boolean) - Example: `false`
- **custom_fields** (array) - 0 items
- **ship_via_id** (string) - Example: `""`
- **vendor_name** (string) - Example: `"Elvang Denmark"`
- **is_received** (boolean) - Example: `true`
- **delivery_date** (string) - Example: `"2022-10-01"`
- **submitted_by_photo_url** (string) - Example: `""`
- **approvers_list** (array) - 0 items
- **ship_via** (string) - Example: `""`
- **tax_treatment** (string) - Example: `"non_eu"`
- **tds_calculation_type** (string) - Example: `"tds_item_level"`
- **adjustment** (number) - Example: `0`
- **created_by_id** (string) - Example: `"310656000000039001"`
- **submitted_by_name** (string) - Example: `""`
- **is_backorder** (boolean) - Example: `false`
- **current_sub_status** (string) - Example: `"closed"`
- **received_status** (string) - Example: `"received"`
- **delivery_org_address_id** (string) - Example: `"310656000000059403"`
- **billed_status** (string) - Example: `"billed"`
- **is_discount_before_tax** (boolean) - Example: `true`
- **attachment_name** (string) - Example: `""`
- **expected_delivery_date** (string) - Example: `""`
- **payment_terms** (number) - Example: `60`
- **is_po_marked_as_received** (boolean) - Example: `false`
- **total** (number) - Example: `638.3`
- **contact_persons_associated** (array) - 1 items - Types: object (1)
- **branch_id** (string) - Example: `"310656000000999035"`
- **purchasereceives** (array) - 1 items - Types: object (1)
- **current_sub_status_id** (string) - Example: `""`
- **branch_name** (string) - Example: `"DMB"`
- **custom_field_hash** (map) - 0 fields: 
- **bills** (array) - 1 items - Types: object (1)
- **_sync_timestamp** (string) - Example: `"2025-06-16T00:59:19.696526"`
- **orientation** (string) - Example: `"portrait"`
- **discount_applied_on_amount** (number) - Example: `0`
- **submitted_by** (string) - Example: `""`
- **submitter_id** (string) - Example: `""`
- **is_emailed** (boolean) - Example: `true`
- **computation_type** (string) - Example: `"basic"`
- **sub_total** (number) - Example: `638.3`
- **attention** (string) - Example: `"matt"`
- **currency_id** (string) - Example: `"310656000000000071"`
- **_syncSource** (string) - Example: `"python_inventory_sync"`
- **quantity_yet_to_receive** (number) - Example: `0`
- **due_in_days** (string) - Example: `""`
- **due_by_days** (string) - Example: `"990"`
- **delivery_days** (string) - Example: `"Overdue by 990 days"`
- **has_attachment** (boolean) - Example: `false`
- **quantity_marked_as_received** (number) - Example: `0`
- **price_precision** (string) - Example: `""`
- **tags** (array) - 0 items
- **_lastSynced** (timestamp) - Example: `"2025-06-17T10:44:20.161Z"`
- **company_name** (string) - Example: `"Elvang Denmark"`
- **total_ordered_quantity** (number) - Example: `65`
- **receives** (array) - 0 items

**Sample Data:**
```json
{}
```

---

### sales_agents

**Document Count:** 10
**Sample Document ID:** 310656000000642003

**Complete Field Structure:**

- **sa_id** (string) - Example: `"310656000000642003"`
- **agentID** (string) - Example: `"806490000000720348"`
- **name** (string) - Example: `"Hannah Neale"`
- **email** (string) - Example: `"hannahkeysuk@gmail.com"`
- **phone** (string) - Example: `"07894651532"`
- **company** (string) - Example: `"DM Brands"`
- **role** (string) - Example: `"salesAgent"`
- **uid** (string) - Example: `"q7WHaH0vNpU8kXyxLUemZ0ULzhv2"`
- **zohospID** (string) - Example: `"310656000000642003"`
- **brandsAssigned** (map) - 6 fields: rader, blomus, elvang, myflame, remember, relaxound
  - **brandsAssigned.blomus** (boolean) - Example: `false`
  - **brandsAssigned.elvang** (boolean) - Example: `false`
  - **brandsAssigned.gefu** (boolean) - Example: `false`
  - **brandsAssigned.myflame** (boolean) - Example: `false`
  - **brandsAssigned.rader** (boolean) - Example: `false`
  - **brandsAssigned.relaxound** (boolean) - Example: `false`
  - **brandsAssigned.remember** (boolean) - Example: `true`
- **region** (string) - Example: `"London"`
- **lastLogin** (timestamp) - Example: `"2025-05-30T21:56:58.094Z"`
- **migrated_from** (string) - Example: `"users"`
- **created_at** (timestamp) - Example: `"2025-07-06T15:44:15.989Z"`
- **migration_date** (timestamp) - Example: `"2025-07-06T15:44:15.989Z"`

**Sample Data:**
```json
{
  "sa_id": "31065600000064****",
  "agentID": "80649000000072****",
  "name": "Hannah Neale",
  "email": "han***@gmail.com",
  "phone": "0789465****",
  "company": "DM Brands",
  "role": "salesAgent",
  "uid": "q7WHaH0vNpU8kXyxLUemZ0ULzhv2",
  "zohospID": "31065600000064****",
  "brandsAssigned": {
    "rader": false,
    "blomus": false,
    "elvang": false,
    "myflame": false,
    "remember": true,
    "relaxound": false
  },
  "region": "London",
  "lastLogin": "2025-05-30T21:56:58.094Z",
  "migrated_from": "users",
  "created_at": "2025-07-06T15:44:15.989Z",
  "migration_date": "2025-07-06T15:44:15.989Z"
}
```

---

### sales_orders

**Document Count:** 3096
**Sample Document ID:** SO_1751750863761_z4kbro1fp

**Complete Field Structure:**

- **id** (string) - Example: `"SO_1751750863761_z4kbro1fp"`
- **sales_order_id** (string) - Example: `"SO_1751750863761_z4kbro1fp"`
- **sales_order_number** (string) - Example: `"SO-00001"`
- **customer_id** (string) - Example: `"310656000000059331"`
- **customer_name** (string) - Example: `"Silver Mushroom Ltd"`
- **order_date** (timestamp) - Example: `"2022-09-29T00:00:00.000Z"`
- **delivery_date** (timestamp) - Example: `"2022-10-05T00:00:00.000Z"`
- **status** (string) - Example: `"open"`
- **payment_terms** (number) - Example: `30`
- **currency_code** (string) - Example: `"GBP"`
- **subtotal** (number) - Example: `428`
- **tax_total** (number) - Example: `0`
- **shipping_charge** (number) - Example: `0`
- **discount_total** (number) - Example: `100`
- **total** (number) - Example: `0`
- **notes** (string) - Example: `""`
- **internal_notes** (string) - Example: `""`
- **shipping_address** (map) - 13 fields: zip, country, address, city, county, country_code, phone, company_name, attention, state, street2, fax, state_code
  - **shipping_address.address** (string) - Example: `"Ground Floor Units A1 & 2,"`
  - **shipping_address.attention** (string) - Example: `"Rebecca Kane"`
  - **shipping_address.city** (string) - Example: `"Wrightington"`
  - **shipping_address.company_name** (string) - Example: `""`
  - **shipping_address.country** (string) - Example: `"United Kingdom"`
  - **shipping_address.country_code** (string) - Example: `"GB"`
  - **shipping_address.county** (string) - Example: `""`
  - **shipping_address.fax** (string) - Example: `""`
  - **shipping_address.phone** (string) - Example: `""`
  - **shipping_address.state** (string) - Example: `""`
  - **shipping_address.state_code** (string) - Example: `""`
  - **shipping_address.street2** (string) - Example: `"Ainscough Trading Estate"`
  - **shipping_address.zip** (string) - Example: `"WN6 9RS"`
- **billing_address** (map) - 12 fields: zip, country, country_code, address, city, phone, county, attention, state, street2, fax, state_code
  - **billing_address.address** (string) - Example: `"Ground Floor Units A1 & 2,"`
  - **billing_address.attention** (string) - Example: `"Rebecca Kane"`
  - **billing_address.city** (string) - Example: `"Wrightington"`
  - **billing_address.country** (string) - Example: `"United Kingdom"`
  - **billing_address.country_code** (string) - Example: `"GB"`
  - **billing_address.county** (string) - Example: `""`
  - **billing_address.fax** (string) - Example: `""`
  - **billing_address.phone** (string) - Example: `""`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.state_code** (string) - Example: `""`
  - **billing_address.street2** (string) - Example: `"Ainscough Trading Estate"`
  - **billing_address.zip** (string) - Example: `"WN6 9RS"`
- **salesperson_id** (string) - Example: `"310656000000059361"`
- **salesperson_name** (string) - Example: `"matt"`
- **created_by** (string) - Example: `"migration_script"`
- **created_at** (timestamp) - Example: `"2025-07-05T21:27:43.761Z"`
- **_migrated_from_zoho** (boolean) - Example: `true`
- **_original_zoho_id** (string) - Example: `"310656000000059383"`
- **_original_firebase_id** (string) - Example: `"310656000000059383"`
- **updated_at** (timestamp) - Example: `"2025-07-06T00:39:16.345Z"`
- **_migration** (map) - 2 fields: last_updated, update_count
  - **_migration.last_updated** (timestamp) - Example: `"2025-07-06T00:39:16.345Z"`
  - **_migration.update_count** (number) - Example: `1`
- **marketplace_source** (null)
- **is_marketplace_order** (boolean) - Example: `false`
- **sales_agent_id** (string) - Example: `"310656000000059361"`

**Sample Data:**
```json
{
  "id": "SO_1751750863761_z4kbro1fp",
  "sales_order_id": "SO_1751750863761_z4kbro1fp",
  "sales_order_number": "SO-00001",
  "customer_id": "31065600000005****",
  "customer_name": "Silver Mushroom Ltd",
  "order_date": "2022-09-29T00:00:00.000Z",
  "delivery_date": "2022-10-05T00:00:00.000Z",
  "status": "open",
  "payment_terms": 30,
  "currency_code": "GBP",
  "subtotal": 428,
  "tax_total": 0,
  "shipping_charge": 0,
  "discount_total": 100,
  "total": 0,
  "notes": "",
  "internal_notes": "",
  "shipping_address": {
    "zip": "WN6 9RS",
    "country": "United Kingdom",
    "address": "Ground Floor Units A1 & 2,",
    "city": "Wrightington",
    "county": "",
    "country_code": "GB",
    "phone": "",
    "company_name": "",
    "attention": "Rebecca Kane",
    "state": "",
    "street2": "Ainscough Trading Estate",
    "fax": "",
    "state_code": ""
  },
  "billing_address": {
    "zip": "WN6 9RS",
    "country": "United Kingdom",
    "country_code": "GB",
    "address": "Ground Floor Units A1 & 2,",
    "city": "Wrightington",
    "phone": "",
    "county": "",
    "attention": "Rebecca Kane",
    "state": "",
    "street2": "Ainscough Trading Estate",
    "fax": "",
    "state_code": ""
  },
  "salesperson_id": "31065600000005****",
  "salesperson_name": "matt",
  "created_by": "migration_script",
  "created_at": "2025-07-05T21:27:43.761Z",
  "_migrated_from_zoho": true,
  "_original_zoho_id": "31065600000005****",
  "_original_firebase_id": "31065600000005****",
  "updated_at": "2025-07-06T00:39:16.345Z",
  "_migration": {
    "last_updated": "2025-07-06T00:39:16.345Z",
    "update_count": 1
  },
  "marketplace_source": null,
  "is_marketplace_order": false,
  "sales_agent_id": "31065600000005****"
}
```

---

### sales_transactions

**Document Count:** 26666
**Sample Document ID:** 310656000000059391

**Complete Field Structure:**

- **transaction_id** (string) - Example: `"310656000000059391"`
- **_syncSource** (string) - Example: `"python_inventory_sync"`
- **quantity** (number) - Example: `1`
- **item_id** (string) - Example: `"310656000000057137"`
- **order_number** (string) - Example: `"SO-00001"`
- **created_at** (string) - Example: `"2022-09-29"`
- **is_marketplace_order** (boolean) - Example: `false`
- **item_name** (string) - Example: `"Luxury throw Off white"`
- **manufacturer** (string) - Example: `"Elvang"`
- **_lastSynced** (timestamp) - Example: `"2025-06-17T02:00:25.612Z"`
- **salesperson_name** (string) - Example: `"matt"`
- **order_date** (string) - Example: `"2022-09-29"`
- **salesperson_id** (string) - Example: `"310656000000059361"`
- **total** (number) - Example: `96`
- **marketplace_source** (null)
- **price** (number) - Example: `96`
- **brand_normalized** (string) - Example: `"elvang"`
- **customer_name** (string) - Example: `"Silver Mushroom Ltd"`
- **customer_id** (string) - Example: `"310656000000059331"`
- **sku** (string) - Example: `"6004"`
- **brand** (string) - Example: `"Elvang"`
- **order_id** (string) - Example: `"310656000000059383"`
- **last_modified** (timestamp) - Example: `"2025-06-17T02:00:25.612Z"`

**Sample Data:**
```json
{
  "transaction_id": "31065600000005****",
  "_syncSource": "python_inventory_sync",
  "quantity": 1,
  "item_id": "31065600000005****",
  "order_number": "SO-00001",
  "created_at": "2022-09-29",
  "is_marketplace_order": false,
  "item_name": "Luxury throw Off white",
  "manufacturer": "Elvang",
  "_lastSynced": "2025-06-17T02:00:25.612Z",
  "salesperson_name": "matt",
  "order_date": "2022-09-29",
  "salesperson_id": "31065600000005****",
  "total": 96,
  "marketplace_source": null,
  "price": 96,
  "brand_normalized": "elvang",
  "customer_name": "Silver Mushroom Ltd",
  "customer_id": "31065600000005****",
  "sku": "6004",
  "brand": "Elvang",
  "order_id": "31065600000005****",
  "last_modified": "2025-06-17T02:00:25.612Z"
}
```

---

### salesorders

**Document Count:** 3128
**Sample Document ID:** 310656000000059383

**Complete Field Structure:**

- **can_send_in_mail** (boolean) - Example: `false`
- **zcrm_potential_id** (string) - Example: `""`
- **discount** (string) - Example: `"100.00%"`
- **taxes** (array) - 0 items
- **shipment_date** (string) - Example: `"2022-10-02"`
- **billing_address** (map) - 12 fields: zip, country, country_code, address, city, phone, county, attention, state, street2, fax, state_code
  - **billing_address.address** (string) - Example: `"Ground Floor Units A1 & 2,"`
  - **billing_address.attention** (string) - Example: `"Rebecca Kane"`
  - **billing_address.city** (string) - Example: `"Wrightington"`
  - **billing_address.country** (string) - Example: `"United Kingdom"`
  - **billing_address.country_code** (string) - Example: `"GB"`
  - **billing_address.county** (string) - Example: `""`
  - **billing_address.fax** (string) - Example: `""`
  - **billing_address.phone** (string) - Example: `""`
  - **billing_address.state** (string) - Example: `""`
  - **billing_address.state_code** (string) - Example: `""`
  - **billing_address.street2** (string) - Example: `"Ainscough Trading Estate"`
  - **billing_address.zip** (string) - Example: `"WN6 9RS"`
- **line_items** (array) - 5 items - Types: object (5)
- **can_show_kit_return** (boolean) - Example: `false`
- **is_test_order** (boolean) - Example: `false`
- **location_id** (string) - Example: `"310656000000999035"`
- **submitted_by_email** (string) - Example: `""`
- **order_status** (string) - Example: `"closed"`
- **balance** (number) - Example: `0`
- **invoices** (array) - 1 items - Types: object (1)
- **bcy_shipping_charge_tax** (string) - Example: `""`
- **terms** (string) - Example: `""`
- **total_quantity** (number) - Example: `5`
- **picklists** (array) - 0 items
- **mail_first_viewed_time** (string) - Example: `""`
- **has_qty_cancelled** (boolean) - Example: `false`
- **sub_total_inclusive_of_tax** (number) - Example: `0`
- **exchange_rate** (number) - Example: `1`
- **mail_last_viewed_time** (string) - Example: `""`
- **approver_id** (string) - Example: `""`
- **estimate_id** (string) - Example: `""`
- **contact_person_details** (array) - 1 items - Types: object (1)
- **merchant_name** (string) - Example: `""`
- **sales_channel** (string) - Example: `"direct_sales"`
- **packages** (array) - 1 items - Types: object (1)
- **reference_number** (string) - Example: `"Sample Order"`
- **shipping_charge_tax_id** (string) - Example: `""`
- **sub_total_exclusive_of_discount** (number) - Example: `428`
- **purchaseorders** (array) - 0 items
- **location_name** (string) - Example: `"DMB"`
- **vat_treatment** (string) - Example: `""`
- **is_dropshipped** (boolean) - Example: `false`
- **has_discount** (boolean) - Example: `true`
- **_source** (string) - Example: `"zoho_inventory"`
- **discount_percent** (number) - Example: `100`
- **page_height** (string) - Example: `"11.69in"`
- **shipping_charge_tax_name** (string) - Example: `""`
- **status** (string) - Example: `"fulfilled"`
- **discount_total** (number) - Example: `428`
- **integration_id** (string) - Example: `""`
- **tax_total** (number) - Example: `0`
- **invoiced_status** (string) - Example: `"invoiced"`
- **shipped_status** (string) - Example: `"fulfilled"`
- **payments** (array) - 0 items
- **salesorder_id** (string) - Example: `"310656000000059383"`
- **shipping_details** (map) - 0 fields: 
- **shipping_charge_taxes** (array) - 0 items
- **currency_code** (string) - Example: `"GBP"`
- **page_width** (string) - Example: `"8.27in"`
- **refunds** (array) - 0 items
- **sub_statuses** (array) - 0 items
- **bcy_total** (number) - Example: `0`
- **is_adv_tracking_in_package** (boolean) - Example: `false`
- **delivery_method_id** (string) - Example: `"310656000000059381"`
- **delivery_method** (string) - Example: `"Courier"`
- **tracking_url** (string) - Example: `""`
- **tax_rounding** (string) - Example: `"entity_level"`
- **adjustment_description** (string) - Example: `"Adjustment"`
- **last_modified_time** (string) - Example: `"2025-02-18T11:49:21+0000"`
- **currency_symbol** (string) - Example: `"£"`
- **is_kit_partial_return** (boolean) - Example: `false`
- **discount_type** (string) - Example: `"entity_level"`
- **transaction_rounding_type** (string) - Example: `"no_rounding"`
- **roundoff_value** (number) - Example: `0`
- **template_name** (string) - Example: `"Standard Template"`
- **sales_channel_formatted** (string) - Example: `"Direct Sales"`
- **has_unconfirmed_line_item** (boolean) - Example: `false`
- **salesorder_number** (string) - Example: `"SO-00001"`
- **template_id** (string) - Example: `"310656000000000111"`
- **customer_name** (string) - Example: `"Silver Mushroom Ltd"`
- **customer_id** (string) - Example: `"310656000000059331"`
- **is_taxable** (boolean) - Example: `false`
- **payment_terms_label** (string) - Example: `"Net 30"`
- **date** (string) - Example: `"2022-09-29"`
- **submitted_date** (string) - Example: `""`
- **notes** (string) - Example: `""`
- **documents** (array) - 0 items
- **discount_amount** (number) - Example: `428`
- **pickup_location_id** (string) - Example: `""`
- **source** (string) - Example: `"Client"`
- **created_by_name** (string) - Example: `"Matt Langford"`
- **entity_tags** (string) - Example: `""`
- **_synced_at** (timestamp) - Example: `"2025-06-15T23:58:12.589Z"`
- **shipping_charge_inclusive_of_tax** (number) - Example: `0`
- **last_modified_by_id** (string) - Example: `""`
- **contact** (map) - 4 fields: is_credit_limit_migration_completed, unused_customer_credits, credit_limit, customer_balance
  - **contact.credit_limit** (number) - Example: `0`
  - **contact.customer_balance** (number) - Example: `0`
  - **contact.is_credit_limit_migration_completed** (boolean) - Example: `true`
  - **contact.unused_customer_credits** (number) - Example: `0`
- **contact_category** (string) - Example: `""`
- **template_type** (string) - Example: `"standard"`
- **_sync_batch** (number) - Example: `8`
- **shipping_charge_tax_exemption_code** (string) - Example: `""`
- **color_code** (string) - Example: `""`
- **contact_persons** (array) - 1 items - Types: string (1)
- **billing_address_id** (string) - Example: `""`
- **shipping_charge_tax** (string) - Example: `""`
- **bcy_tax_total** (number) - Example: `0`
- **created_time** (string) - Example: `"2022-09-29T12:54:27+0100"`
- **shipping_address_id** (string) - Example: `"310656000000059336"`
- **is_inclusive_tax** (boolean) - Example: `false`
- **custom_fields** (array) - 0 items
- **salesreturns** (array) - 0 items
- **shipping_charge_tax_exemption_id** (string) - Example: `""`
- **price_precision** (number) - Example: `2`
- **submitted_by_photo_url** (string) - Example: `""`
- **approvers_list** (array) - 0 items
- **tax_treatment** (string) - Example: `""`
- **so_cycle_preference** (map) - 7 fields: socycle_status, can_create_invoice, is_feature_enabled, invoice_preference, can_create_package, shipment_preference, can_create_shipment
  - **so_cycle_preference.can_create_invoice** (boolean) - Example: `false`
  - **so_cycle_preference.can_create_package** (boolean) - Example: `false`
  - **so_cycle_preference.can_create_shipment** (boolean) - Example: `false`
  - **so_cycle_preference.invoice_preference** (map) - 4 fields
    - **so_cycle_preference.invoice_preference.mark_as_sent** (boolean) - Example: `false`
    - **so_cycle_preference.invoice_preference.payment_account_id** (string) - Example: `"310656000000000349"`
    - **so_cycle_preference.invoice_preference.payment_mode_id** (string) - Example: `"310656000000000199"`
    - **so_cycle_preference.invoice_preference.record_payment** (boolean) - Example: `false`
  - **so_cycle_preference.is_feature_enabled** (boolean) - Example: `false`
  - **so_cycle_preference.shipment_preference** (map) - 3 fields
    - **so_cycle_preference.shipment_preference.default_carrier** (string) - Example: `""`
    - **so_cycle_preference.shipment_preference.deliver_shipments** (boolean) - Example: `false`
    - **so_cycle_preference.shipment_preference.send_notification** (boolean) - Example: `false`
  - **so_cycle_preference.socycle_status** (string) - Example: `"not_triggered"`
- **shipping_charge_tax_percentage** (string) - Example: `""`
- **tds_calculation_type** (string) - Example: `"tds_item_level"`
- **adjustment** (number) - Example: `0`
- **zcrm_potential_name** (string) - Example: `""`
- **created_by_id** (string) - Example: `"310656000000039001"`
- **submitted_by_name** (string) - Example: `""`
- **current_sub_status** (string) - Example: `"closed"`
- **is_discount_before_tax** (boolean) - Example: `true`
- **attachment_name** (string) - Example: `""`
- **rounding_mode** (string) - Example: `"round_half_up"`
- **shipping_charge_inclusive_of_tax_formatted** (string) - Example: `"£0.00"`
- **merchant_id** (string) - Example: `""`
- **payment_terms** (number) - Example: `30`
- **is_backordered** (boolean) - Example: `false`
- **shipping_charge_exclusive_of_tax** (number) - Example: `0`
- **total** (number) - Example: `0`
- **contact_persons_associated** (array) - 1 items - Types: object (1)
- **shipping_charge_exclusive_of_tax_formatted** (string) - Example: `"£0.00"`
- **branch_id** (string) - Example: `"310656000000999035"`
- **creditnotes** (array) - 0 items
- **current_sub_status_id** (string) - Example: `""`
- **branch_name** (string) - Example: `"DMB"`
- **custom_field_hash** (map) - 0 fields: 
- **is_viewed_in_mail** (boolean) - Example: `false`
- **bcy_rounding_mode** (string) - Example: `"round_half_up"`
- **bcy_shipping_charge** (number) - Example: `0`
- **shipping_address** (map) - 13 fields: zip, country, address, city, county, country_code, phone, company_name, attention, state, street2, fax, state_code
  - **shipping_address.address** (string) - Example: `"Ground Floor Units A1 & 2,"`
  - **shipping_address.attention** (string) - Example: `"Rebecca Kane"`
  - **shipping_address.city** (string) - Example: `"Wrightington"`
  - **shipping_address.company_name** (string) - Example: `""`
  - **shipping_address.country** (string) - Example: `"United Kingdom"`
  - **shipping_address.country_code** (string) - Example: `"GB"`
  - **shipping_address.county** (string) - Example: `""`
  - **shipping_address.fax** (string) - Example: `""`
  - **shipping_address.phone** (string) - Example: `""`
  - **shipping_address.state** (string) - Example: `""`
  - **shipping_address.state_code** (string) - Example: `""`
  - **shipping_address.street2** (string) - Example: `"Ainscough Trading Estate"`
  - **shipping_address.zip** (string) - Example: `"WN6 9RS"`
- **_sync_timestamp** (string) - Example: `"2025-06-16T00:58:11.787147"`
- **can_manually_fulfill** (boolean) - Example: `false`
- **created_by_email** (string) - Example: `"matt@dmbrands.co.uk"`
- **bcy_discount_total** (number) - Example: `428`
- **shipping_charge_tax_formatted** (string) - Example: `""`
- **orientation** (string) - Example: `"portrait"`
- **shipping_charge_tax_type** (string) - Example: `""`
- **discount_applied_on_amount** (number) - Example: `428`
- **is_scheduled_for_quick_shipment_create** (boolean) - Example: `false`
- **paid_status** (string) - Example: `"paid"`
- **is_manually_fulfilled** (boolean) - Example: `false`
- **account_identifier** (string) - Example: `""`
- **warehouses** (array) - 3 items - Types: object (3)
- **submitted_by** (string) - Example: `""`
- **submitter_id** (string) - Example: `""`
- **reverse_charge_tax_total** (number) - Example: `0`
- **bcy_sub_total** (number) - Example: `428`
- **is_emailed** (boolean) - Example: `true`
- **offline_created_date_with_time** (string) - Example: `""`
- **has_shipping_address** (boolean) - Example: `true`
- **salesperson_name** (string) - Example: `"matt"`
- **salesperson_id** (string) - Example: `"310656000000059361"`
- **shipping_charge** (number) - Example: `0`
- **bcy_adjustment** (number) - Example: `0`
- **computation_type** (string) - Example: `"basic"`
- **sub_total** (number) - Example: `428`
- **created_date** (string) - Example: `"2022-09-29"`
- **currency_id** (string) - Example: `"310656000000000065"`
- **marketplace_source** (null)
- **is_marketplace_order** (boolean) - Example: `false`
- **salesperson_uid** (null)
- **_uid_mapped_at** (timestamp) - Example: `"2025-06-16T19:53:28.932Z"`
- **_syncSource** (string) - Example: `"python_inventory_sync"`
- **quantity_shipped** (number) - Example: `5`
- **quantity** (number) - Example: `5`
- **due_in_days** (string) - Example: `""`
- **shipment_days** (string) - Example: `""`
- **due_by_days** (string) - Example: `"989"`
- **has_attachment** (boolean) - Example: `false`
- **total_invoiced_amount** (number) - Example: `0`
- **tags** (array) - 0 items
- **delivery_date** (string) - Example: `"2022-10-05"`
- **is_drop_shipment** (boolean) - Example: `false`
- **quantity_invoiced** (number) - Example: `5`
- **company_name** (string) - Example: `"Silver Mushroom Ltd"`
- **order_fulfillment_type** (string) - Example: `""`
- **quantity_packed** (number) - Example: `5`
- **is_backorder** (boolean) - Example: `false`
- **email** (string) - Example: `"rebecca@silvermushroom.com"`
- **_lastSynced** (timestamp) - Example: `"2025-06-17T10:40:12.980Z"`
- **is_reverse_charge_applied** (boolean) - Example: `false`

**Sample Data:**
```json
{
  "can_send_in_mail": false,
  "zcrm_potential_id": "",
  "discount": "100.00%",
  "taxes": [],
  "shipment_date": "2022-10-02",
  "billing_address": {
    "zip": "WN6 9RS",
    "country": "United Kingdom",
    "country_code": "GB",
    "address": "Ground Floor Units A1 & 2,",
    "city": "Wrightington",
    "phone": "",
    "county": "",
    "attention": "Rebecca Kane",
    "state": "",
    "street2": "Ainscough Trading Estate",
    "fax": "",
    "state_code": ""
  },
  "line_items": [
    {
      "variant_id": "31065600000005****",
      "attribute_option_data2": "",
      "product_type": "goods",
      "item_order": 0,
      "line_item_taxes": [],
      "item_custom_fields": [],
      "description": "Luxury throw Off white",
      "is_returnable": true,
      "discounts": [],
      "quantity_manuallyfulfilled": 0,
      "attribute_name3": "",
      "quantity_delivered": 1,
      "line_item_id": "31065600000005****",
      "image_name": "6004.jpg",
      "quantity_invoiced_cancelled": 0,
      "project_id": "",
      "image_type": "jpg",
      "attribute_option_data1": "",
      "attribute_option_name1": "",
      "attribute_name1": "",
      "attribute_name2": "",
      "is_combo_product": false,
      "tax_name": "",
      "attribute_option_name2": "",
      "tax_type": "tax",
      "is_unconfirmed_product": false,
      "document_id": "31065600000377****",
      "pricebook_id": "",
      "attribute_option_name3": "",
      "product_id": "31065600000005****",
      "is_invoiced": true,
      "discount": 0,
      "attribute_option_data3": "",
      "custom_field_hash": {},
      "tax_percentage": 0,
      "header_id": "",
      "sku": "6004",
      "quantity_backordered": 0,
      "quantity_dropshipped": 0,
      "name": "Luxury throw Off white",
      "mapped_items": [],
      "tags": [],
      "combo_type": "",
      "item_total": 96,
      "bcy_rate": 96,
      "line_item_type": "goods",
      "quantity_shipped": 1,
      "quantity_invoiced": 1,
      "warehouse_name": "Homearama STAY Warehouse",
      "quantity_picked": 0,
      "item_type": "inventory",
      "item_id": "31065600000005****",
      "image_document_id": "31065600000377****",
      "rate": 96,
      "tax_id": "",
      "item_sub_total": 96,
      "quantity_returned": 0,
      "quantity": 1,
      "warehouse_id": "31065600000014****",
      "sales_rate": 97.87,
      "group_name": "Elvang Luxury throw Camel",
      "is_fulfillable": 0,
      "unit": "pcs",
      "package_details": {
        "weight_unit": "kg",
        "height": "",
        "width": "",
        "dimension_unit": "cm",
        "length": "",
        "weight": ""
      },
      "header_name": "",
      "quantity_packed": 1,
      "quantity_cancelled": 0
    },
    {
      "variant_id": "31065600000005****",
      "attribute_option_data2": "",
      "product_type": "goods",
      "item_order": 1,
      "line_item_taxes": [],
      "item_custom_fields": [],
      "description": "Stripes throw Camel",
      "is_returnable": false,
      "discounts": [],
      "quantity_manuallyfulfilled": 0,
      "attribute_name3": "",
      "quantity_delivered": 1,
      "line_item_id": "31065600000005****",
      "image_name": "32.jpg",
      "quantity_invoiced_cancelled": 0,
      "project_id": "",
      "image_type": "jpg",
      "attribute_option_data1": "",
      "attribute_option_name1": "",
      "attribute_name1": "",
      "attribute_name2": "",
      "is_combo_product": false,
      "tax_name": "",
      "attribute_option_name2": "",
      "tax_type": "tax",
      "is_unconfirmed_product": false,
      "document_id": "31065600000377****",
      "pricebook_id": "",
      "attribute_option_name3": "",
      "product_id": "31065600000005****",
      "is_invoiced": true,
      "discount": 0,
      "attribute_option_data3": "",
      "custom_field_hash": {},
      "tax_percentage": 0,
      "header_id": "",
      "sku": "32",
      "quantity_backordered": 0,
      "quantity_dropshipped": 0,
      "name": "Stripes throw Camel",
      "mapped_items": [],
      "tags": [],
      "combo_type": "",
      "item_total": 60,
      "bcy_rate": 60,
      "line_item_type": "goods",
      "quantity_shipped": 1,
      "quantity_invoiced": 1,
      "warehouse_name": "Homearama STAY Warehouse",
      "quantity_picked": 0,
      "item_type": "inventory",
      "item_id": "31065600000005****",
      "image_document_id": "31065600000377****",
      "rate": 60,
      "tax_id": "",
      "item_sub_total": 60,
      "quantity_returned": 0,
      "quantity": 1,
      "warehouse_id": "31065600000014****",
      "sales_rate": 51.06,
      "group_name": "Elvang Stripes throw Camel",
      "is_fulfillable": 0,
      "unit": "pcs",
      "package_details": {
        "weight_unit": "kg",
        "height": "",
        "width": "",
        "dimension_unit": "cm",
        "length": "",
        "weight": ""
      },
      "header_name": "",
      "quantity_packed": 1,
      "quantity_cancelled": 0
    },
    {
      "variant_id": "31065600000005****",
      "attribute_option_data2": "",
      "product_type": "goods",
      "item_order": 2,
      "line_item_taxes": [],
      "item_custom_fields": [],
      "description": "Tweed throw Light yellow",
      "is_returnable": false,
      "discounts": [],
      "quantity_manuallyfulfilled": 0,
      "attribute_name3": "",
      "quantity_delivered": 1,
      "line_item_id": "31065600000005****",
      "image_name": "38.jpg",
      "quantity_invoiced_cancelled": 0,
      "project_id": "",
      "image_type": "jpg",
      "attribute_option_data1": "",
      "attribute_option_name1": "",
      "attribute_name1": "",
      "attribute_name2": "",
      "is_combo_product": false,
      "tax_name": "",
      "attribute_option_name2": "",
      "tax_type": "tax",
      "is_unconfirmed_product": false,
      "document_id": "31065600000377****",
      "pricebook_id": "",
      "attribute_option_name3": "",
      "product_id": "31065600000005****",
      "is_invoiced": true,
      "discount": 0,
      "attribute_option_data3": "",
      "custom_field_hash": {},
      "tax_percentage": 0,
      "header_id": "",
      "sku": "38",
      "quantity_backordered": 0,
      "quantity_dropshipped": 0,
      "name": "Tweed throw Light yellow",
      "mapped_items": [],
      "tags": [],
      "combo_type": "",
      "item_total": 60,
      "bcy_rate": 60,
      "line_item_type": "goods",
      "quantity_shipped": 1,
      "quantity_invoiced": 1,
      "warehouse_name": "Homearama STAY Warehouse",
      "quantity_picked": 0,
      "item_type": "inventory",
      "item_id": "31065600000005****",
      "image_document_id": "31065600000377****",
      "rate": 60,
      "tax_id": "",
      "item_sub_total": 60,
      "quantity_returned": 0,
      "quantity": 1,
      "warehouse_id": "31065600000014****",
      "sales_rate": 51.06,
      "group_name": "Elvang Tweed throw Light yellow",
      "is_fulfillable": 0,
      "unit": "pcs",
      "package_details": {
        "weight_unit": "kg",
        "height": "",
        "width": "",
        "dimension_unit": "cm",
        "length": "",
        "weight": ""
      },
      "header_name": "",
      "quantity_packed": 1,
      "quantity_cancelled": 0
    },
    "... and 2 more items"
  ],
  "can_show_kit_return": false,
  "is_test_order": false,
  "location_id": "31065600000099****",
  "submitted_by_email": "",
  "order_status": "closed",
  "balance": 0,
  "invoices": [
    {
      "invoice_id": "31065600000005****",
      "reference_number": "SO-00001",
      "status": "paid",
      "date": "2022-09-29",
      "invoice_number": "INV-000001",
      "due_date": "2022-10-29",
      "balance": 0,
      "total": 0
    }
  ],
  "bcy_shipping_charge_tax": "",
  "terms": "",
  "total_quantity": 5,
  "picklists": [],
  "mail_first_viewed_time": "",
  "has_qty_cancelled": false,
  "sub_total_inclusive_of_tax": 0,
  "exchange_rate": 1,
  "mail_last_viewed_time": "",
  "approver_id": "",
  "estimate_id": "",
  "contact_person_details": [
    {
      "phone": "01772 737 170",
      "mobile": "",
      "first_name": "Rebecca",
      "email": "reb***@silvermushroom.com",
      "last_name": "Kane",
      "contact_person_id": "31065600000005****"
    }
  ],
  "merchant_name": "",
  "sales_channel": "direct_sales",
  "packages": [
    {
      "package_id": "31065600000005****",
      "carrier": "Courier",
      "delivery_method": "Courier",
      "shipment_number": "Samples",
      "shipment_order": {
        "is_carrier_shipment": false,
        "expected_delivery_date": "",
        "carrier": "Courier",
        "shipment_number": "Samples",
        "delivery_guarantee": false,
        "service": "",
        "shipment_delivered_date": "2022-10-05 00:00",
        "delivery_date_with_time": "2022-10-05 00:00",
        "shipment_id": "31065600000005****",
        "tracking_number": "",
        "tracking_url": "",
        "delivery_days": "",
        "associated_packages_count": 1,
        "delivery_date": "2022-10-05",
        "shipment_date": "2022-10-02",
        "shipment_date_with_time": "2022-10-02 00:00",
        "shipment_type": "single_piece_shipment"
      },
      "delivery_guarantee": false,
      "detailed_status": "",
      "service": "",
      "status_message": "",
      "package_number": "PKG-00001",
      "quantity": 5,
      "shipment_status": "delivered",
      "status": "delivered",
      "shipment_id": "31065600000005****",
      "tracking_number": "",
      "date": "2022-09-29",
      "is_tracking_enabled": false,
      "delivery_days": "",
      "shipment_date": "2022-10-02"
    }
  ],
  "reference_number": "Sample Order",
  "shipping_charge_tax_id": "",
  "sub_total_exclusive_of_discount": 428,
  "purchaseorders": [],
  "location_name": "DMB",
  "vat_treatment": "",
  "is_dropshipped": false,
  "has_discount": true,
  "_source": "zoho_inventory",
  "discount_percent": 100,
  "page_height": "11.69in",
  "shipping_charge_tax_name": "",
  "status": "fulfilled",
  "discount_total": 428,
  "integration_id": "",
  "tax_total": 0,
  "invoiced_status": "invoiced",
  "shipped_status": "fulfilled",
  "payments": [],
  "salesorder_id": "31065600000005****",
  "shipping_details": {},
  "shipping_charge_taxes": [],
  "currency_code": "GBP",
  "page_width": "8.27in",
  "refunds": [],
  "sub_statuses": [],
  "bcy_total": 0,
  "is_adv_tracking_in_package": false,
  "delivery_method_id": "31065600000005****",
  "delivery_method": "Courier",
  "tracking_url": "",
  "tax_rounding": "entity_level",
  "adjustment_description": "Adjustment",
  "last_modified_time": "2025-02-18T11:49:21+0000",
  "currency_symbol": "£",
  "is_kit_partial_return": false,
  "discount_type": "entity_level",
  "transaction_rounding_type": "no_rounding",
  "roundoff_value": 0,
  "template_name": "Standard Template",
  "sales_channel_formatted": "Direct Sales",
  "has_unconfirmed_line_item": false,
  "salesorder_number": "SO-00001",
  "template_id": "31065600000000****",
  "customer_name": "Silver Mushroom Ltd",
  "customer_id": "31065600000005****",
  "is_taxable": false,
  "payment_terms_label": "Net 30",
  "date": "2022-09-29",
  "submitted_date": "",
  "notes": "",
  "documents": [],
  "discount_amount": 428,
  "pickup_location_id": "",
  "source": "Client",
  "created_by_name": "Matt Langford",
  "entity_tags": "",
  "_synced_at": "2025-06-15T23:58:12.589Z",
  "shipping_charge_inclusive_of_tax": 0,
  "last_modified_by_id": "",
  "contact": {
    "is_credit_limit_migration_completed": true,
    "unused_customer_credits": 0,
    "credit_limit": 0,
    "customer_balance": 0
  },
  "contact_category": "",
  "template_type": "standard",
  "_sync_batch": 8,
  "shipping_charge_tax_exemption_code": "",
  "color_code": "",
  "contact_persons": [
    "31065600000005****"
  ],
  "billing_address_id": "",
  "shipping_charge_tax": "",
  "bcy_tax_total": 0,
  "created_time": "2022-09-29T12:54:27+0100",
  "shipping_address_id": "31065600000005****",
  "is_inclusive_tax": false,
  "custom_fields": [],
  "salesreturns": [],
  "shipping_charge_tax_exemption_id": "",
  "price_precision": 2,
  "submitted_by_photo_url": "",
  "approvers_list": [],
  "tax_treatment": "",
  "so_cycle_preference": {
    "socycle_status": "not_triggered",
    "can_create_invoice": false,
    "is_feature_enabled": false,
    "invoice_preference": {
      "mark_as_sent": false,
      "payment_account_id": "31065600000000****",
      "record_payment": false,
      "payment_mode_id": "31065600000000****"
    },
    "can_create_package": false,
    "shipment_preference": {
      "default_carrier": "",
      "deliver_shipments": false,
      "send_notification": false
    },
    "can_create_shipment": false
  },
  "shipping_charge_tax_percentage": "",
  "tds_calculation_type": "tds_item_level",
  "adjustment": 0,
  "zcrm_potential_name": "",
  "created_by_id": "31065600000003****",
  "submitted_by_name": "",
  "current_sub_status": "closed",
  "is_discount_before_tax": true,
  "attachment_name": "",
  "rounding_mode": "round_half_up",
  "shipping_charge_inclusive_of_tax_formatted": "£0.00",
  "merchant_id": "",
  "payment_terms": 30,
  "is_backordered": false,
  "shipping_charge_exclusive_of_tax": 0,
  "total": 0,
  "contact_persons_associated": [
    {
      "communication_preference": {
        "is_email_enabled": true
      },
      "first_name": "Rebecca",
      "mobile": "",
      "contact_person_id": "31065600000005****",
      "last_name": "Kane",
      "contact_person_email": "reb***@silvermushroom.com"
    }
  ],
  "shipping_charge_exclusive_of_tax_formatted": "£0.00",
  "branch_id": "31065600000099****",
  "creditnotes": [],
  "current_sub_status_id": "",
  "branch_name": "DMB",
  "custom_field_hash": {},
  "is_viewed_in_mail": false,
  "bcy_rounding_mode": "round_half_up",
  "bcy_shipping_charge": 0,
  "shipping_address": {
    "zip": "WN6 9RS",
    "country": "United Kingdom",
    "address": "Ground Floor Units A1 & 2,",
    "city": "Wrightington",
    "county": "",
    "country_code": "GB",
    "phone": "",
    "company_name": "",
    "attention": "Rebecca Kane",
    "state": "",
    "street2": "Ainscough Trading Estate",
    "fax": "",
    "state_code": ""
  },
  "_sync_timestamp": "2025-06-16T00:58:11.787147",
  "can_manually_fulfill": false,
  "created_by_email": "mat***@dmbrands.co.uk",
  "bcy_discount_total": 428,
  "shipping_charge_tax_formatted": "",
  "orientation": "portrait",
  "shipping_charge_tax_type": "",
  "discount_applied_on_amount": 428,
  "is_scheduled_for_quick_shipment_create": false,
  "paid_status": "paid",
  "is_manually_fulfilled": false,
  "account_identifier": "",
  "warehouses": [
    {
      "city": "Bampton Business Centre",
      "warehouse_id": "31065600000014****",
      "status": "active",
      "sales_channels": [],
      "phone": "+44190561****",
      "warehouse_name": "Homearama STAY Warehouse",
      "address": "Homearama",
      "is_primary": false,
      "state": "Bampton",
      "country": "United Kingdom",
      "email": "mat***@dmbrands.co.uk",
      "zip": "OX182AN"
    },
    {
      "city": "Weald, Bampton",
      "warehouse_id": "31065600000017****",
      "status": "active",
      "sales_channels": [],
      "phone": "0199386****",
      "warehouse_name": "Homearama Warehouse",
      "address": "Homarama",
      "is_primary": true,
      "state": "Oxfordshire",
      "country": "United Kingdom",
      "email": "",
      "zip": "OX18 2AN"
    },
    {
      "city": "",
      "warehouse_id": "31065600000099****",
      "status": "active",
      "sales_channels": [],
      "phone": "",
      "warehouse_name": "Amazon FBA Warehouse",
      "address": "",
      "is_primary": false,
      "state": "",
      "country": "United Kingdom",
      "email": "",
      "zip": ""
    }
  ],
  "submitted_by": "",
  "submitter_id": "",
  "reverse_charge_tax_total": 0,
  "bcy_sub_total": 428,
  "is_emailed": true,
  "offline_created_date_with_time": "",
  "has_shipping_address": true,
  "salesperson_name": "matt",
  "salesperson_id": "31065600000005****",
  "shipping_charge": 0,
  "bcy_adjustment": 0,
  "computation_type": "basic",
  "sub_total": 428,
  "created_date": "2022-09-29",
  "currency_id": "31065600000000****",
  "marketplace_source": null,
  "is_marketplace_order": false,
  "salesperson_uid": null,
  "_uid_mapped_at": "2025-06-16T19:53:28.932Z",
  "_syncSource": "python_inventory_sync",
  "quantity_shipped": 5,
  "quantity": 5,
  "due_in_days": "",
  "shipment_days": "",
  "due_by_days": "989",
  "has_attachment": false,
  "total_invoiced_amount": 0,
  "tags": [],
  "delivery_date": "2022-10-05",
  "is_drop_shipment": false,
  "quantity_invoiced": 5,
  "company_name": "Silver Mushroom Ltd",
  "order_fulfillment_type": "",
  "quantity_packed": 5,
  "is_backorder": false,
  "email": "reb***@silvermushroom.com",
  "_lastSynced": "2025-06-17T10:40:12.980Z"
}
```

---

### shipping_methods

**Document Count:** 1
**Sample Document ID:** BQoFvecNdoClFAe7nAh5

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### stock_alerts

**Document Count:** 1
**Sample Document ID:** opeBrhQn8xGdOR8wrzXV

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### stock_transactions

**Document Count:** 1
**Sample Document ID:** SVjcf1niRUitclq8VKaS

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### sync_metadata

**Document Count:** 18
**Sample Document ID:** customer_rebuild

**Complete Field Structure:**

- **last_rebuild** (string) - Example: `"2025-06-16T00:57:07.358428+00:00"`
- **status** (string) - Example: `"completed"`
- **stats** (map) - 4 fields: errors, invoicesProcessed, customersCreated, ordersProcessed
  - **stats.customersCreated** (number) - Example: `544`
  - **stats.errors** (array) - 0 items
  - **stats.invoicesProcessed** (number) - Example: `3664`
  - **stats.ordersProcessed** (number) - Example: `502`
- **customer_count** (number) - Example: `544`
- **errors** (array) - 0 items
- **customersProcessed** (number) - Example: `1603`
- **added** (number) - Example: `0`
- **initialSyncCompleted** (boolean) - Example: `true`
- **unchanged** (number) - Example: `1603`
- **updated** (number) - Example: `0`
- **lastSync** (timestamp) - Example: `"2025-06-10T17:11:29.331Z"`
- **duration** (number) - Example: `6654`
- **recordsProcessed** (map) - 3 fields: invoices, orders, transactions
  - **recordsProcessed.backorderResult** (map) - 4 fields
    - **recordsProcessed.backorderResult.brandsWithBackorders** (number) - Example: `0`
    - **recordsProcessed.backorderResult.success** (boolean) - Example: `true`
    - **recordsProcessed.backorderResult.totalBackorderItems** (number) - Example: `0`
    - **recordsProcessed.backorderResult.totalBackorderValue** (number) - Example: `0`
  - **recordsProcessed.customers** (number) - Example: `200`
  - **recordsProcessed.invoices** (number) - Example: `1`
  - **recordsProcessed.orders** (number) - Example: `1`
  - **recordsProcessed.purchaseOrders** (number) - Example: `0`
  - **recordsProcessed.transactions** (number) - Example: `1`
- **updatedAt** (timestamp) - Example: `"2025-07-09T14:45:38.153Z"`
- **itemsProcessed** (number) - Example: `200`
- **dataSource** (string) - Example: `"Inventory"`
- **orders** (number) - Example: `0`
- **invoices** (number) - Example: `0`
- **purchaseOrders** (number) - Example: `0`
- **transactions** (number) - Example: `0`
- **normalized** (boolean) - Example: `true`
- **timestamp** (timestamp) - Example: `"2025-06-15T02:03:15.434Z"`
- **lastUpdated** (timestamp) - Example: `"2025-06-15T01:13:29.390Z"`

**Sample Data:**
```json
{
  "last_rebuild": "2025-06-16T00:57:07.358428+00:00",
  "status": "completed",
  "stats": {
    "errors": [],
    "invoicesProcessed": 3664,
    "customersCreated": 544,
    "ordersProcessed": 502
  },
  "customer_count": 544,
  "errors": []
}
```

---

### sync_queue

**Document Count:** 18366
**Sample Document ID:** 00afEWxxLNmDornIEoBN

**Complete Field Structure:**

- **collection** (string) - Example: `"customers"`
- **changeType** (string) - Example: `"modified"`
- **documentId** (string) - Example: `"806490000000593010"`
- **data** (map) - 14 fields: Primary_Email, Billing_Street, Phone, Primary_Last_Name, Billing_Country, Billing_Code, Primary_First_Name, Billing_City, Agent, Billing_State, id, Account_Name, createdTime, source
  - **data.Account_Name** (string) - Example: `"Patsy Blunt Interiors Ltd"`
  - **data.Agent** (map) - 2 fields
    - **data.Agent.id** (string) - Example: `"806490000000515916"`
    - **data.Agent.name** (string) - Example: `"Gay Croker"`
  - **data.Billing_City** (string) - Example: `"Virginia Water"`
  - **data.Billing_Code** (string) - Example: `"GU25 4DL"`
  - **data.Billing_Country** (string) - Example: `"United Kingdom"`
  - **data.Billing_State** (string) - Example: `"Surrey"`
  - **data.Billing_Street** (string) - Example: `"7 Station Approach"`
  - **data.createdTime** (timestamp) - Example: `"2025-06-08T14:52:03.355Z"`
  - **data.id** (string) - Example: `"806490000000593010"`
  - **data.Phone** (string) - Example: `""`
  - **data.Primary_Email** (string) - Example: `"patsy@patsybluntinteriors.com"`
  - **data.Primary_First_Name** (string) - Example: `"Patsy"`
  - **data.Primary_Last_Name** (string) - Example: `"Blunt"`
  - **data.source** (string) - Example: `"ZohoCRM"`
  - **data.zohoInventoryId** (string) - Example: `"310656000000121416"`
- **processed** (boolean) - Example: `false`
- **timestamp** (timestamp) - Example: `"2025-06-08T14:52:05.660Z"`
- **essentialData** (map) - 2 fields: name, sku
  - **essentialData.name** (string) - Example: `"Rader Olive wood hearts Assorted 48 pcs"`
  - **essentialData.sku** (string) - Example: `"10413"`

**Sample Data:**
```json
{
  "collection": "customers",
  "changeType": "modified",
  "documentId": "80649000000059****",
  "data": {
    "Primary_Email": "pat***@patsybluntinteriors.com",
    "Billing_Street": "7 Station Approach",
    "Phone": "",
    "Primary_Last_Name": "Blunt",
    "Billing_Country": "United Kingdom",
    "Billing_Code": "GU25 4DL",
    "Primary_First_Name": "Patsy",
    "Billing_City": "Virginia Water",
    "Agent": {
      "name": "Gay Croker",
      "id": "80649000000051****"
    },
    "Billing_State": "Surrey",
    "id": "80649000000059****",
    "Account_Name": "Patsy Blunt Interiors Ltd",
    "createdTime": "2025-06-08T14:52:03.355Z",
    "source": "ZohoCRM"
  },
  "processed": false,
  "timestamp": "2025-06-08T14:52:05.660Z"
}
```

---

### users

**Document Count:** 59
**Sample Document ID:** 00AiRlNEvkxMawd65wc3

**Complete Field Structure:**

- **uid** (string) - Example: `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"`
- **email** (string) - Example: `"alastair@dmbrands.co.uk"`
- **name** (string) - Example: `"ABS Testing"`
- **role** (string) - Example: `"customer"`
- **companyName** (string) - Example: `"ABS Testing"`
- **isOnline** (boolean) - Example: `true`
- **lastSeen** (string) - Example: `"2025-07-08T20:48:49.696Z"`
- **createdAt** (string) - Example: `"2025-07-08T20:48:49.696Z"`
- **agentID** (string) - Example: `"806490000000720385"`
- **company** (string) - Example: `"DM Brands"`
- **zohospID** (string) - Example: `"310656000026622107"`
- **lastLogin** (timestamp) - Example: `"2025-06-08T00:39:11.899Z"`
- **brandsAssigned** (map) - 1 fields: gefu
  - **brandsAssigned.blomus** (boolean) - Example: `false`
  - **brandsAssigned.elvang** (boolean) - Example: `false`
  - **brandsAssigned.gefu** (boolean) - Example: `false`
  - **brandsAssigned.myflame** (boolean) - Example: `true`
  - **brandsAssigned.rader** (boolean) - Example: `true`
  - **brandsAssigned.relaxound** (boolean) - Example: `true`
  - **brandsAssigned.remember** (boolean) - Example: `true`
- **migrated_to_sales_agents** (boolean) - Example: `true`
- **migration_date** (timestamp) - Example: `"2025-07-06T15:44:14.978Z"`
- **sales_agent_id** (string) - Example: `"310656000026622107"`
- **id** (string) - Example: `"3WlbmVpN7nVVBRtXjx3X2e3XDID2"`
- **phone** (string) - Example: `"07860356497"`
- **region** (array) - 1 items - Types: string (1)

**Sample Data:**
```json
{
  "uid": "E4yjW9IcjpMldf7qZI31bGFB9Hz2",
  "email": "ala***@dmbrands.co.uk",
  "name": "ABS Testing",
  "role": "customer",
  "companyName": "ABS Testing",
  "isOnline": true,
  "lastSeen": "2025-07-08T20:48:49.696Z",
  "createdAt": "2025-07-08T20:48:49.696Z"
}
```

---

### vendor_contacts

**Document Count:** 1
**Sample Document ID:** tzQf4VI5rD723h7gFbAA

**Complete Field Structure:**


**Sample Data:**
```json
{}
```

---

### vendors

**Document Count:** 7
**Sample Document ID:** ve-001

**Complete Field Structure:**

- **id** (string) - Example: `"ve-001"`
- **vendor_id** (string) - Example: `"ve-001"`
- **vendor_name** (string) - Example: `"Blomus"`
- **brand_normalized** (string) - Example: `"blomus"`
- **vendor_location** (string) - Example: `"Germany"`
- **vendor_address** (map) - 4 fields: street_1, city, postcode, country
  - **vendor_address.city** (string) - Example: `"Bochum"`
  - **vendor_address.country** (string) - Example: `"Germany"`
  - **vendor_address.postcode** (string) - Example: `"44791"`
  - **vendor_address.street_1** (string) - Example: `"Kornharpener Straße 126"`
- **vendor_contacts** (array) - 1 items - Types: object (1)
- **vendor_status** (string) - Example: `"active"`
- **vendor_bank_name** (string) - Example: `""`
- **vendor_bank_sortcode** (string) - Example: `""`
- **vendor_bank_acc** (string) - Example: `""`
- **vendor_bank_vat** (string) - Example: `""`
- **vendor_bank_verified** (boolean) - Example: `false`
- **vendor_stats** (map) - 7 fields: total_items, active_items, inactive_items, total_skus, categories, total_stock_value, average_item_value
  - **vendor_stats.active_items** (number) - Example: `0`
  - **vendor_stats.average_item_value** (number) - Example: `0`
  - **vendor_stats.categories** (array) - 0 items
  - **vendor_stats.inactive_items** (number) - Example: `0`
  - **vendor_stats.total_items** (number) - Example: `0`
  - **vendor_stats.total_skus** (number) - Example: `0`
  - **vendor_stats.total_stock_value** (number) - Example: `0`
- **vendor_performance** (map) - 5 fields: total_ordered, total_received, on_time_delivery_rate, quality_rating, last_order_date
  - **vendor_performance.last_order_date** (null)
  - **vendor_performance.on_time_delivery_rate** (number) - Example: `0`
  - **vendor_performance.quality_rating** (number) - Example: `0`
  - **vendor_performance.total_ordered** (number) - Example: `0`
  - **vendor_performance.total_received** (number) - Example: `0`
- **created_date** (timestamp) - Example: `"2025-07-06T00:34:51.366Z"`
- **created_by** (string) - Example: `"migration_script"`
- **updated_by** (string) - Example: `"migration_script"`
- **last_modified** (timestamp) - Example: `"2025-07-06T00:34:51.366Z"`
- **_predefined** (boolean) - Example: `true`

**Sample Data:**
```json
{
  "id": "ve-001",
  "vendor_id": "ve-001",
  "vendor_name": "Blomus",
  "brand_normalized": "blomus",
  "vendor_location": "Germany",
  "vendor_address": {
    "street_1": "Kornharpener Straße 126",
    "city": "Bochum",
    "postcode": "44791",
    "country": "Germany"
  },
  "vendor_contacts": [
    {
      "venc_id": "VENC_ve-001_001",
      "venc_name": "Primary Contact",
      "venc_phone": "+49 (0) 234 95987-0",
      "venc_email": "",
      "venc_primary": true,
      "venc_created": "2025-07-06T00:34:51.366Z"
    }
  ],
  "vendor_status": "active",
  "vendor_bank_name": "",
  "vendor_bank_sortcode": "",
  "vendor_bank_acc": "",
  "vendor_bank_vat": "",
  "vendor_bank_verified": false,
  "vendor_stats": {
    "total_items": 0,
    "active_items": 0,
    "inactive_items": 0,
    "total_skus": 0,
    "categories": [],
    "total_stock_value": 0,
    "average_item_value": 0
  },
  "vendor_performance": {
    "total_ordered": 0,
    "total_received": 0,
    "on_time_delivery_rate": 0,
    "quality_rating": 0,
    "last_order_date": null
  },
  "created_date": "2025-07-06T00:34:51.366Z",
  "created_by": "migration_script",
  "updated_by": "migration_script",
  "last_modified": "2025-07-06T00:34:51.366Z",
  "_predefined": true
}
```

---

### warehouses

**Document Count:** 3
**Sample Document ID:** WH_1751737215790_jgkzle0kh

**Complete Field Structure:**

- **warehouse_type** (string) - Example: `"primary"`
- **is_active** (boolean) - Example: `true`
- **address** (map) - 6 fields: country, street_1, city, street_2, postcode, state
  - **address.city** (string) - Example: `"London"`
  - **address.country** (string) - Example: `"United Kingdom"`
  - **address.postcode** (string) - Example: `"SW1A 1AA"`
  - **address.state** (string) - Example: `"England"`
  - **address.street_1** (string) - Example: `"123 Main Street"`
  - **address.street_2** (string) - Example: `""`
- **contact_phone** (string) - Example: `""`
- **is_primary** (boolean) - Example: `true`
- **contact_person** (string) - Example: `""`
- **description** (string) - Example: `"Primary warehouse location"`
- **created_by** (string) - Example: `"migration_script"`
- **contact_email** (string) - Example: `""`
- **_migration_date** (timestamp) - Example: `"2025-07-05T17:40:15.790Z"`
- **warehouse_name** (string) - Example: `"Main Warehouse"`
- **phone** (string) - Example: `""`
- **_migrated_from** (string) - Example: `"default_warehouse"`
- **updated_by** (string) - Example: `"migration_script"`
- **created_date** (timestamp) - Example: `"2025-07-05T17:40:15.790Z"`
- **last_modified** (timestamp) - Example: `"2025-07-05T17:40:15.790Z"`
- **email** (string) - Example: `""`
- **warehouse_id** (string) - Example: `"WH_1751737215790_jgkzle0kh"`

**Sample Data:**
```json
{
  "warehouse_type": "primary",
  "is_active": true,
  "address": {
    "country": "United Kingdom",
    "street_1": "123 Main Street",
    "city": "London",
    "street_2": "",
    "postcode": "SW1A 1AA",
    "state": "England"
  },
  "contact_phone": "",
  "is_primary": true,
  "contact_person": "",
  "description": "Primary warehouse location",
  "created_by": "migration_script",
  "contact_email": "",
  "_migration_date": "2025-07-05T17:40:15.790Z",
  "warehouse_name": "Main Warehouse",
  "phone": "",
  "_migrated_from": "default_warehouse",
  "updated_by": "migration_script",
  "created_date": "2025-07-05T17:40:15.790Z",
  "last_modified": "2025-07-05T17:40:15.790Z",
  "email": "",
  "warehouse_id": "WH_1751737215790_jgkzle0kh"
}
```

---

