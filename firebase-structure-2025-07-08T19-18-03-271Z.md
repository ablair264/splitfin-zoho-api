# Firebase Collection Structure Report

Generated on: 2025-07-08T19:18:03.273Z

## Collections Analyzed

### customers

**Document Count:** 1451
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

### invoices

**Document Count:** 3613
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

