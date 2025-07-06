# Firebase Collection Structure

Generated on: 2025-07-05T22:31:38.024Z

## Table of Contents

- [users](#users)
- [brand_managers](#brand-managers)
- [sales_agents](#sales-agents)
- [customers](#customers)
- [customer_data](#customer-data)
- [items](#items)
- [items_enhanced](#items-enhanced)
- [products](#products)
- [vendors](#vendors)
- [item_categories](#item-categories)
- [salesorders](#salesorders)
- [sales_orders](#sales-orders)
- [sales_transactions](#sales-transactions)
- [invoices](#invoices)
- [purchase_orders](#purchase-orders)
- [warehouses](#warehouses)
- [stock_transactions](#stock-transactions)
- [stock_alerts](#stock-alerts)
- [inventory_transactions](#inventory-transactions)
- [shipping_methods](#shipping-methods)
- [couriers](#couriers)
- [vendor_contacts](#vendor-contacts)
- [branches](#branches)
- [packing_stations](#packing-stations)
- [packing_jobs](#packing-jobs)
- [sync_metadata](#sync-metadata)
- [sync_queue](#sync-queue)
- [migration_logs](#migration-logs)
- [data_adapters](#data-adapters)

## Collections

### users

**Document Count:** 48
**Note:** Using specific document ID: kePM8QtWXoO24zlMg3qSidGOen02

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| agentID | string | - | `"806490000000720328"` |
| **brandsAssigned** | **map** | **6 fields:** rader, remember, myflame, blomus, elvang, relaxound | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ blomus | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ elvang | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ myflame | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ rader | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ relaxound | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ remember | boolean | - | `false` |
| company | string | - | `"DM Brands"` |
| email | string | - | `"info@stephgillard.co.uk"` |
| lastLogin | timestamp | - | `"2025-05-30T21:56:58.094Z"` |
| name | string | - | `"Steph Gillard"` |
| phone | string | - | `"07739989826"` |
| **region** | **array** | **Length: 1<br>Types: string (100.0%)** | - |
| role | string | - | `"salesAgent"` |
| uid | string | - | `"kePM8QtWXoO24zlMg3qSidGOen02"` |
| zohospID | string | - | `"310656000002136698"` |

### brand_managers

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| bm_id | string | - | `""` |

### sales_agents

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| sa_id | string | - | `""` |

### customers

**Document Count:** 4444

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from | string | - | `"customer_data"` |
| _migration_date | timestamp | - | `"2025-07-05T17:39:53.917Z"` |
| _original_id | string | - | `"310656000000071001"` |
| created_by | string | - | `"migration_script"` |
| created_date | timestamp | - | `"2025-07-05T17:39:53.917Z"` |
| **customer_billing_address** | **map** | **6 fields:** country, street_1, city, street_2, postcode, state | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_1 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_2 | string | - | `""` |
| customer_company_name | string | - | `""` |
| customer_credit_limit | number | - | `0` |
| customer_discount_rate | number | - | `0` |
| customer_email | string | - | `""` |
| customer_id | string | - | `"CUST_1751737193917_09wtkywhc"` |
| customer_name | string | - | `"Unknown Customer"` |
| customer_payment_terms | string | - | `"30 days"` |
| customer_phone | string | - | `""` |
| customer_registration_number | string | - | `""` |
| **customer_shipping_address** | **map** | **6 fields:** country, street_1, city, street_2, postcode, state | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_1 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_2 | string | - | `""` |
| customer_status | string | - | `"active"` |
| customer_type | string | - | `"business"` |
| customer_vat_number | string | - | `""` |
| last_modified | timestamp | - | `"2025-07-05T17:39:53.917Z"` |
| updated_by | string | - | `"migration_script"` |

### customer_data

**Document Count:** 1479

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| firebase_uid | string | - | `"DFgJyTrpW3RTS2qxYJKup7jF4su2"` |
| isOnline | boolean | - | `false` |
| last_synced | timestamp | - | `"2025-06-17T13:25:07.738Z"` |
| lastLogin | string | - | `"2025-06-25T21:49:06.096Z"` |
| lastSeen | string | - | `"2025-06-25T22:25:39.200Z"` |
| **original_firebase_data** | **map** | **53 fields:** customer_id, customer_sub_type, total_paid, last_modified, website, payment_terms_label, total_spent, location_region, total_orders_and_invoices, phone, credit_limit, outstanding_receivable_amount, first_order_date, _lastSynced, payment_terms, brand_preferences, contact_type, top_purchased_items, _syncSource, unused_credits_receivable_amount, customer_name, mobile, salesperson_names, salesperson_ids, total_outstanding, company_name, currency_code, segment, city, coordinates, postcode, average_order_value, _enriched_at, payment_performance, shipping_address, total_items, _rebuilt_at, invoice_count, _csv_enriched_at, overdue_amount, status, last_modified_time, terms, _source, billing_address, order_count, last_order_date, notes, order_ids, total_invoiced, country, created_time, email | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _csv_enriched_at | timestamp | - | `"2025-06-16T23:11:15.470Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _enriched_at | timestamp | - | `"2025-06-16T21:55:04.948Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _lastSynced | timestamp | - | `"2025-06-17T10:46:18.768Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _rebuilt_at | timestamp | - | `"2025-06-16T00:57:03.912Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _source | string | - | `"firestore_rebuild"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ _syncSource | string | - | `"python_inventory_sync"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ average_order_value | number | - | `83.65714285714286` |
| **original_firebase_data.billing_address** | **map** | **12 fields:** country_code, fax, attention, address, state_code, city, state, county, phone, country, street2, zip | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `""` |
| **original_firebase_data.brand_preferences** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.brand | string | - | `"Unknown"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.percentage | number | - | `156.4207650273224` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity | number | - | `17` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.revenue | number | - | `916` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ company_name | string | - | `"Silver Mushroom Ltd"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_type | string | - | `"customer"` |
| **original_firebase_data.coordinates** | **map** | **2 fields:** latitude, longitude | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ latitude | number | - | `53.6079516` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ longitude | number | - | `-2.7026693` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ created_time | string | - | `"2022-09-29T12:42:24+0100"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ credit_limit | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ currency_code | string | - | `"GBP"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customer_id | string | - | `"310656000000059331"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customer_name | string | - | `"Silver Mushroom Ltd"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customer_sub_type | string | - | `"business"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ email | string | - | `"giddymarie1998@gmail.com"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ first_order_date | string | - | `"2022-09-29T00:00:00"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ invoice_count | number | - | `8` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_modified | timestamp | - | `"2025-06-17T10:46:18.768Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_modified_time | string | - | `"2025-02-23T11:31:43+0000"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_order_date | string | - | `"2022-11-28T00:00:00"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ location_region | string | - | `"North West"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ mobile | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ notes | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ order_count | number | - | `7` |
| **original_firebase_data.order_ids** | **array** | **Length: 7<br>Types: string (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ overdue_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_performance | number | - | `100` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_terms | number | - | `30` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_terms_label | string | - | `"Net 30"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `"WN6 9RS"` |
| **original_firebase_data.salesperson_ids** | **array** | **Length: 1<br>Types: string (100.0%)** | - |
| **original_firebase_data.salesperson_names** | **array** | **Length: 1<br>Types: string (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ segment | string | - | `"Low"` |
| **original_firebase_data.shipping_address** | **map** | **13 fields:** country_code, address, company_name, attention, state_code, city, street2, state, county, phone, country, fax, zip | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ company_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ status | string | - | `"active"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ terms | string | - | `"Proforma"` |
| **original_firebase_data.top_purchased_items** | **array** | **Length: 9<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_id | string | - | `"310656000000056247"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.name | string | - | `"Stripes throw Camel"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity | number | - | `2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.revenue | number | - | `120` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.sku | string | - | `"32"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_invoiced | number | - | `643.2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_items | number | - | `17` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_orders_and_invoices | number | - | `15` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_outstanding | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_paid | number | - | `643.2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_spent | number | - | `585.6` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_credits_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ website | string | - | `"silvermushroom.co.uk"` |
| Primary_Email | string | - | `"giddymarie1998@gmail.com"` |
| sync_status | string | - | `"success"` |
| **zoho_data** | **map** | **118 fields:** crm_owner_id, opening_balance_amount, approvers_list, is_credit_limit_migration_completed, associated_with_square, is_bcy_only_contact, contact_id, currency_id, phone, tax_reg_no, checks, is_consent_agreed, submitted_by_name, documents, payment_terms, unused_credits_receivable_amount, currency_symbol, opening_balance_amount_bcy, created_by_name, addresses, cf_phone_number_unformatted, tax_treatment, outstanding_ob_payable_amount, currency_code, submitter_id, is_crm_customer, custom_fields, billing_address, last_modified_time, pricebook_name, primary_contact_id, unused_credits_payable_amount_bcy, language_code_formatted, contact_tax_information, facebook, ach_supported, tags, can_show_vendor_ob, credit_limit, submitted_by_photo_url, customer_sub_type, designation, branch_name, payment_terms_label, unused_credits_receivable_amount_bcy, outstanding_receivable_amount, outstanding_payable_amount, outstanding_payable_amount_bcy, zcrm_account_id, submitted_by_email, portal_status, department, company_id, payment_terms_id, location_name, is_sms_enabled, contact_name, is_client_review_settings_enabled, zcrm_contact_id, submitted_date, shipping_address, location_id, created_date, status, is_client_review_asked, credit_limit_exceeded_amount, created_time, entity_address_id, website, sales_channel, bank_accounts, contact_salutation, contact_type, zohopeople_client_id, vpa_list, company_name, cf_phone_number, outstanding_ob_receivable_amount, last_name, approver_id, can_show_customer_ob, price_precision, first_name, has_transaction, notes, owner_id, outstanding_receivable_amount_bcy, twitter, contact_category, cards, unused_credits_payable_amount, portal_receipt_count, opening_balances, branch_id, vat_reg_no, source, customer_currency_summaries, tax_reg_label, is_linked_with_zohocrm, is_taxable, mobile, payment_reminder_enabled, unused_retainer_payments, integration_references, label_for_company_id, vat_treatment, submitted_by, custom_field_hash, owner_name, language_code, country_code, pricebook_id, consent_date, default_templates, exchange_rate, invited_by, contact_persons, email | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ ach_supported | boolean | - | `false` |
| **zoho_data.addresses** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ approver_id | string | - | `""` |
| **zoho_data.approvers_list** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ associated_with_square | boolean | - | `false` |
| **zoho_data.bank_accounts** | **array** | **Length: 0** | - |
| **zoho_data.billing_address** | **map** | **13 fields:** country_code, address_id, street2, fax, state_code, city, address, state, county, phone, country, attention, zip | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Unit 3a"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address_id | string | - | `"310656000000059334"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Preston"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Carnfield Place"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"PR58AN"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ branch_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ branch_name | string | - | `"DMB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ can_show_customer_ob | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ can_show_vendor_ob | boolean | - | `false` |
| **zoho_data.cards** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ cf_phone_number | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ cf_phone_number_unformatted | string | - | `"01772 737 170"` |
| **zoho_data.checks** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ company_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ company_name | string | - | `"Silver Mushroom Ltd"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ consent_date | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_category | string | - | `"uk"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_id | string | - | `"310656000000059331"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_name | string | - | `"Silver Mushroom Ltd"` |
| **zoho_data.contact_persons** | **array** | **Length: 4<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.can_invite | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.communication_preference | map | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.communication_preference.is_email_enabled | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.contact_person_id | string | - | `"310656000000059333"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.department | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.designation | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.email | string | - | `"\"giddymarie1998@gmail.com\""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.first_name | string | - | `"Rebecca"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_added_in_portal | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_portal_invitation_accepted | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_portal_mfa_enabled | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_primary_contact | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_sms_enabled_for_cp | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.last_name | string | - | `"Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mobile | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mobile_code_formatted | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mobile_country_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.phone | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.photo_url | string | - | `"https://secure.gravatar.com/avatar/56f3e907d7c9cf2..."` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.salutation | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.skype | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.zcrm_contact_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_salutation | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_tax_information | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ contact_type | string | - | `"customer"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ created_by_name | string | - | `"Matt Langford"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ created_date | string | - | `"29/09/22"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ created_time | string | - | `"2022-09-29T12:42:24+0100"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ credit_limit | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ credit_limit_exceeded_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ crm_owner_id | string | - | `"806490000000432001"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ currency_code | string | - | `"GBP"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ currency_id | string | - | `"310656000000000065"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ currency_symbol | string | - | `"£"` |
| **zoho_data.custom_field_hash** | **map** | **2 fields:** cf_phone_number, cf_phone_number_unformatted | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ cf_phone_number | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ cf_phone_number_unformatted | string | - | `"01772 737 170"` |
| **zoho_data.custom_fields** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.api_name | string | - | `"cf_phone_number"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.customfield_id | string | - | `"310656000000267316"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.data_type | string | - | `"phone"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.edit_on_portal | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.edit_on_store | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.field_id | string | - | `"310656000000267316"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.index | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_active | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_dependent_field | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.label | string | - | `"Phone Number"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.placeholder | string | - | `"cf_phone_number"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.search_entity | string | - | `"contact"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.show_in_all_pdf | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.show_in_portal | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.show_in_store | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.show_on_pdf | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.value | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.value_formatted | string | - | `"01772 737 170"` |
| **zoho_data.customer_currency_summaries** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.currency_code | string | - | `"GBP"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.currency_id | string | - | `"310656000000000065"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.currency_name_formatted | string | - | `"GBP- Pound Sterling"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.currency_symbol | string | - | `"£"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_base_currency | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.outstanding_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.price_precision | number | - | `2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.unused_credits_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customer_sub_type | string | - | `"business"` |
| **zoho_data.default_templates** | **map** | **30 fields:** purchaseorder_template_name, bill_template_name, statement_template_id, creditnote_template_id, salesorder_email_template_id, salesorder_template_id, invoice_email_template_name, paymentthankyou_email_template_id, payment_remittance_email_template_name, invoice_template_id, salesorder_template_name, purchaseorder_email_template_id, invoice_email_template_id, paymentthankyou_template_name, invoice_template_name, purchaseorder_template_id, statement_template_name, estimate_email_template_name, creditnote_email_template_name, paymentthankyou_email_template_name, creditnote_template_name, estimate_email_template_id, paymentthankyou_template_id, creditnote_email_template_id, bill_template_id, estimate_template_name, payment_remittance_email_template_id, purchaseorder_email_template_name, salesorder_email_template_name, estimate_template_id | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ bill_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ bill_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ creditnote_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ creditnote_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ creditnote_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ creditnote_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ estimate_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ estimate_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ estimate_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ estimate_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ invoice_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ invoice_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ invoice_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ invoice_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ payment_remittance_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ payment_remittance_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ paymentthankyou_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ paymentthankyou_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ paymentthankyou_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ paymentthankyou_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ purchaseorder_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ purchaseorder_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ purchaseorder_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ purchaseorder_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ salesorder_email_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ salesorder_email_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ salesorder_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ salesorder_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ statement_template_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ statement_template_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ department | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ designation | string | - | `""` |
| **zoho_data.documents** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ email | string | - | `"\"giddymarie1998@gmail.com\"\n"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ entity_address_id | string | - | `"310656000001702812"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ exchange_rate | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ facebook | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ first_name | string | - | `"Rebecca"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ has_transaction | boolean | - | `true` |
| **zoho_data.integration_references** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ invited_by | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_bcy_only_contact | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_client_review_asked | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_client_review_settings_enabled | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_consent_agreed | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_credit_limit_migration_completed | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_crm_customer | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_linked_with_zohocrm | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_sms_enabled | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_taxable | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ label_for_company_id | string | - | `"Company Registration Number"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ language_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ language_code_formatted | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_modified_time | string | - | `"2025-02-23T11:31:43+0000"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_name | string | - | `"Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ location_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ location_name | string | - | `"DMB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ mobile | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ notes | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ opening_balance_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ opening_balance_amount_bcy | string | - | `""` |
| **zoho_data.opening_balances** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_ob_payable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_ob_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_payable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_payable_amount_bcy | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ outstanding_receivable_amount_bcy | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ owner_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ owner_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_reminder_enabled | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_terms | number | - | `30` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_terms_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ payment_terms_label | string | - | `"Net 30"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `"01772 737 170"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ portal_receipt_count | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ portal_status | string | - | `"disabled"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ price_precision | number | - | `2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ pricebook_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ pricebook_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ primary_contact_id | string | - | `"310656000000059333"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ sales_channel | string | - | `"direct_sales"` |
| **zoho_data.shipping_address** | **map** | **15 fields:** fax, address_id, address, street2, state_code, city, latitude, state, county, phone, longitude, zip, country_code, attention, country | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Ground Floor Units A1 & 2,"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ address_id | string | - | `"310656000000059336"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ latitude | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ longitude | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Ainscough Trading Estate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"WN6 9RS"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ source | string | - | `"user"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ status | string | - | `"active"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitted_by | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitted_by_email | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitted_by_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitted_by_photo_url | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitted_date | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ submitter_id | string | - | `""` |
| **zoho_data.tags** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_reg_label | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_reg_no | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_treatment | string | - | `"uk"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ twitter | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_credits_payable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_credits_payable_amount_bcy | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_credits_receivable_amount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_credits_receivable_amount_bcy | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_retainer_payments | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ vat_reg_no | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ vat_treatment | string | - | `"uk"` |
| **zoho_data.vpa_list** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ website | string | - | `"silvermushroom.co.uk"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zcrm_account_id | string | - | `"806490000000569001"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zcrm_contact_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zohopeople_client_id | string | - | `""` |
| zoho_region | string | - | `"eu"` |

### items

**Document Count:** 6552

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _lastSynced | timestamp | - | `"2025-06-17T10:37:20.131Z"` |
| _migrated_from | string | - | `"zoho_inventory"` |
| _migration_date | timestamp | - | `"2025-07-05T18:22:47.610Z"` |
| _original_id | string | - | `"310656000000051244"` |
| _source | string | - | `"zoho_inventory"` |
| _sync_batch | number | - | `6` |
| _sync_timestamp | string | - | `"2025-06-16T01:01:39.523258"` |
| _synced_at | timestamp | - | `"2025-06-16T00:01:39.918Z"` |
| _syncSource | string | - | `"python_inventory_sync"` |
| account_id | string | - | `"310656000000000376"` |
| account_name | string | - | `"Sales"` |
| actual_available_stock | number | - | `4` |
| available_stock | number | - | `4` |
| brand | string | - | `"Elvang"` |
| **bulk_pricing** | **array** | **Length: 0** | - |
| can_be_purchased | boolean | - | `true` |
| can_be_sold | boolean | - | `true` |
| category_id | string | - | `"CAT_1751739767610_7v4t232ut"` |
| category_name | string | - | `"Uncategorized"` |
| cf_actual_available_in_stock | string | - | `"0"` |
| cf_actual_available_in_stock_unformatted | string | - | `"0"` |
| cf_committed_stock | string | - | `"0.00"` |
| cf_committed_stock_unformatted | string | - | `"0.00"` |
| cost_price | number | - | `18.2` |
| created_by | string | - | `"migration_script"` |
| created_date | string | - | `"2022-09-29T12:27:57+0100"` |
| created_time | string | - | `"2022-09-29T12:27:57+0100"` |
| description | string | - | `"Elvang Teddy bear Beige"` |
| dimension_unit | string | - | `"cm"` |
| **dimensions** | **map** | **8 fields:** volume, diameter, weight_unit, length, width, weight, dimension_unit, height | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ diameter | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ dimension_unit | string | - | `"cm"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ height | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ length | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ volume | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ weight | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ weight_unit | string | - | `"kg"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ width | number | - | `null` |
| ean | string | - | `"5701311910600"` |
| estimated_delivery | number | - | `7` |
| has_attachment | boolean | - | `true` |
| height | string | - | `""` |
| image_document_id | string | - | `"310656000003778337"` |
| image_name | string | - | `"1060.jpg"` |
| image_type | string | - | `"jpg"` |
| **inventory_valuation** | **map** | **4 fields:** total_value, method, average_cost, last_cost | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ average_cost | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ last_cost | number | - | `18.2` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ method | string | - | `"FIFO"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ total_value | number | - | `0` |
| is_combo_product | boolean | - | `false` |
| is_linked_with_zohocrm | boolean | - | `true` |
| is_returnable | boolean | - | `false` |
| is_storage_location_enabled | boolean | - | `false` |
| is_taxable | boolean | - | `true` |
| isbn | string | - | `""` |
| item_description | string | - | `"Elvang Teddy bear Beige"` |
| item_id | string | - | `"310656000000051244"` |
| **item_imgs** | **array** | **Length: 0** | - |
| item_name | string | - | `"Elvang Teddy bear Beige"` |
| item_type | string | - | `"inventory"` |
| last_modified | timestamp | - | `"2025-07-05T18:22:47.610Z"` |
| last_modified_time | string | - | `"2025-06-08T21:18:35+0100"` |
| length | string | - | `""` |
| **manufacturer** | **map** | **4 fields:** manufacturer_contact, manufacturer_part_number, manufacturer_name, manufacturer_website | - |
| Manufacturer | string | - | `"Elvang"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ manufacturer_contact | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ manufacturer_name | string | - | `"Elvang"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ manufacturer_part_number | string | - | `"1060"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ manufacturer_website | string | - | `""` |
| minimum_order_qty | number | - | `1` |
| name | string | - | `"Elvang Teddy bear Beige"` |
| **package_info** | **map** | **6 fields:** package_width, package_height, package_weight_unit, package_length, package_weight, package_unit | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_height | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_length | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_unit | string | - | `"cm"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_weight | number | - | `null` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_weight_unit | string | - | `"kg"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ package_width | number | - | `null` |
| part_no | string | - | `"1060"` |
| part_number | string | - | `""` |
| product_type | string | - | `"Goods"` |
| purchase_account_id | string | - | `"310656000000000509"` |
| purchase_account_name | string | - | `"Cost of Goods Sold"` |
| purchase_description | string | - | `"Elvang Teddy bear Beige"` |
| purchase_price | number | - | `18.2` |
| purchase_rate | number | - | `18.2` |
| rate | number | - | `29.36` |
| reorder_level | number | - | `10` |
| reorder_quantity | number | - | `1` |
| retail_price | number | - | `29.36` |
| **shipping** | **map** | **6 fields:** is_fragile, weight_unit, shipping_class, weight, is_hazardous, requires_special_handling | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_fragile | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_hazardous | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ requires_special_handling | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ shipping_class | string | - | `"standard"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ weight | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ weight_unit | string | - | `"kg"` |
| show_in_storefront | boolean | - | `false` |
| sku | string | - | `"1060"` |
| source | string | - | `"csv"` |
| status | string | - | `"active"` |
| stock_available | number | - | `0` |
| stock_committed | number | - | `4` |
| stock_on_hand | number | - | `4` |
| stock_total | number | - | `4` |
| **tags** | **array** | **Length: 0** | - |
| **tax** | **map** | **4 fields:** tax_exempt, tax_rate, tax_code, tax_name | - |
| tax_exemption_code | string | - | `""` |
| tax_exemption_id | string | - | `""` |
| tax_id | string | - | `"310656000000059451"` |
| tax_name | string | - | `"Standard Rate"` |
| tax_percentage | number | - | `20` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_code | string | - | `"VAT20"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_exempt | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_name | string | - | `"Standard Rate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ tax_rate | number | - | `20` |
| track_inventory | boolean | - | `true` |
| unit | string | - | `"pcs"` |
| upc | string | - | `""` |
| updated_by | string | - | `"migration_script"` |
| variable_pricing | boolean | - | `false` |
| vendor_name | string | - | `"Elvang"` |
| weight | string | - | `""` |
| weight_unit | string | - | `"kg"` |
| wholesale_price | number | - | `0` |
| width | string | - | `""` |
| zcrm_product_id | string | - | `"806490000000561001"` |

### items_enhanced

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### products

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### vendors

**Document Count:** 11

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from_zoho | boolean | - | `true` |
| _original_zoho_id | string | - | `"310656000000194675"` |
| brand | string | - | `"Remember"` |
| brand_name | string | - | `"Remember"` |
| brand_normalized | string | - | `"remember"` |
| created_by | string | - | `"migration_script"` |
| created_date | timestamp | - | `"2025-07-05T21:26:06.028Z"` |
| id | string | - | `"VEND_1751750766027_4061uax72"` |
| last_modified | timestamp | - | `"2025-07-05T21:26:06.028Z"` |
| updated_by | string | - | `"migration_script"` |
| **vendor_address** | **map** | **4 fields:** street_1, city, postcode, country | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_1 | string | - | `""` |
| vendor_bank_acc | string | - | `""` |
| vendor_bank_name | string | - | `""` |
| vendor_bank_sortcode | string | - | `""` |
| vendor_bank_vat | string | - | `""` |
| vendor_bank_verified | boolean | - | `false` |
| **vendor_contacts** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_created | timestamp | - | `"2025-07-05T21:26:06.028Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_email | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_id | string | - | `"VENC_1751750766028_2gvyk0tpk"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_name | string | - | `"Primary Contact"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.venc_primary | boolean | - | `true` |
| vendor_id | string | - | `"VEND_1751750766027_4061uax72"` |
| vendor_location | string | - | `"Unknown"` |
| vendor_name | string | - | `"Remember"` |
| vendor_status | string | - | `"active"` |

### item_categories

**Document Count:** 1596

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from_zoho | boolean | - | `true` |
| category_id | string | - | `"CAT_1751750771545_0enjdwsor"` |
| **category_name** | **array** | **Length: 5<br>Types: string (100.0%)** | - |
| created_by | string | - | `"migration_script"` |
| created_date | timestamp | - | `"2025-07-05T21:26:11.545Z"` |
| description | string | - | `""` |
| id | string | - | `"CAT_1751750771545_0enjdwsor"` |
| is_active | boolean | - | `true` |

### salesorders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _lastSynced | timestamp | - | `"2025-06-17T10:40:12.980Z"` |
| _source | string | - | `"zoho_inventory"` |
| _sync_batch | number | - | `8` |
| _sync_timestamp | string | - | `"2025-06-16T00:58:11.787147"` |
| _synced_at | timestamp | - | `"2025-06-15T23:58:12.589Z"` |
| _syncSource | string | - | `"python_inventory_sync"` |
| _uid_mapped_at | timestamp | - | `"2025-06-16T19:53:28.932Z"` |
| account_identifier | string | - | `""` |
| adjustment | number | - | `0` |
| adjustment_description | string | - | `"Adjustment"` |
| approver_id | string | - | `""` |
| **approvers_list** | **array** | **Length: 0** | - |
| attachment_name | string | - | `""` |
| balance | number | - | `0` |
| bcy_adjustment | number | - | `0` |
| bcy_discount_total | number | - | `428` |
| bcy_rounding_mode | string | - | `"round_half_up"` |
| bcy_shipping_charge | number | - | `0` |
| bcy_shipping_charge_tax | string | - | `""` |
| bcy_sub_total | number | - | `428` |
| bcy_tax_total | number | - | `0` |
| bcy_total | number | - | `0` |
| **billing_address** | **map** | **12 fields:** zip, country, country_code, address, city, phone, county, attention, state, street2, fax, state_code | - |
| billing_address_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Ground Floor Units A1 & 2,"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Ainscough Trading Estate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"WN6 9RS"` |
| branch_id | string | - | `"310656000000999035"` |
| branch_name | string | - | `"DMB"` |
| can_manually_fulfill | boolean | - | `false` |
| can_send_in_mail | boolean | - | `false` |
| can_show_kit_return | boolean | - | `false` |
| color_code | string | - | `""` |
| company_name | string | - | `"Silver Mushroom Ltd"` |
| computation_type | string | - | `"basic"` |
| **contact** | **map** | **4 fields:** is_credit_limit_migration_completed, unused_customer_credits, credit_limit, customer_balance | - |
| contact_category | string | - | `""` |
| **contact_person_details** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.contact_person_id | string | - | `"310656000000059333"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.email | string | - | `"rebecca@silvermushroom.com"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.first_name | string | - | `"Rebecca"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.last_name | string | - | `"Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mobile | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.phone | string | - | `"01772 737 170"` |
| **contact_persons** | **array** | **Length: 1<br>Types: string (100.0%)** | - |
| **contact_persons_associated** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.communication_preference | map | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.communication_preference.is_email_enabled | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.contact_person_email | string | - | `"rebecca@silvermushroom.com"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.contact_person_id | string | - | `"310656000000059333"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.first_name | string | - | `"Rebecca"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.last_name | string | - | `"Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mobile | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ credit_limit | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customer_balance | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_credit_limit_migration_completed | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ unused_customer_credits | number | - | `0` |
| created_by_email | string | - | `"matt@dmbrands.co.uk"` |
| created_by_id | string | - | `"310656000000039001"` |
| created_by_name | string | - | `"Matt Langford"` |
| created_date | string | - | `"2022-09-29"` |
| created_time | string | - | `"2022-09-29T12:54:27+0100"` |
| **creditnotes** | **array** | **Length: 0** | - |
| currency_code | string | - | `"GBP"` |
| currency_id | string | - | `"310656000000000065"` |
| currency_symbol | string | - | `"£"` |
| current_sub_status | string | - | `"closed"` |
| current_sub_status_id | string | - | `""` |
| **custom_field_hash** | **map** | **0 fields:**  | - |
| **custom_fields** | **array** | **Length: 0** | - |
| customer_id | string | - | `"310656000000059331"` |
| customer_name | string | - | `"Silver Mushroom Ltd"` |
| date | string | - | `"2022-09-29"` |
| delivery_date | string | - | `"2022-10-05"` |
| delivery_method | string | - | `"Courier"` |
| delivery_method_id | string | - | `"310656000000059381"` |
| discount | string | - | `"100.00%"` |
| discount_amount | number | - | `428` |
| discount_applied_on_amount | number | - | `428` |
| discount_percent | number | - | `100` |
| discount_total | number | - | `428` |
| discount_type | string | - | `"entity_level"` |
| **documents** | **array** | **Length: 0** | - |
| due_by_days | string | - | `"989"` |
| due_in_days | string | - | `""` |
| email | string | - | `"rebecca@silvermushroom.com"` |
| entity_tags | string | - | `""` |
| estimate_id | string | - | `""` |
| exchange_rate | number | - | `1` |
| has_attachment | boolean | - | `false` |
| has_discount | boolean | - | `true` |
| has_qty_cancelled | boolean | - | `false` |
| has_shipping_address | boolean | - | `true` |
| has_unconfirmed_line_item | boolean | - | `false` |
| integration_id | string | - | `""` |
| invoiced_status | string | - | `"invoiced"` |
| **invoices** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.balance | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.date | string | - | `"2022-09-29"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.due_date | string | - | `"2022-10-29"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.invoice_id | string | - | `"310656000000059554"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.invoice_number | string | - | `"INV-000001"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.reference_number | string | - | `"SO-00001"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.status | string | - | `"paid"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.total | number | - | `0` |
| is_adv_tracking_in_package | boolean | - | `false` |
| is_backorder | boolean | - | `false` |
| is_backordered | boolean | - | `false` |
| is_discount_before_tax | boolean | - | `true` |
| is_drop_shipment | boolean | - | `false` |
| is_dropshipped | boolean | - | `false` |
| is_emailed | boolean | - | `true` |
| is_inclusive_tax | boolean | - | `false` |
| is_kit_partial_return | boolean | - | `false` |
| is_manually_fulfilled | boolean | - | `false` |
| is_marketplace_order | boolean | - | `false` |
| is_scheduled_for_quick_shipment_create | boolean | - | `false` |
| is_taxable | boolean | - | `false` |
| is_test_order | boolean | - | `false` |
| is_viewed_in_mail | boolean | - | `false` |
| last_modified_by_id | string | - | `""` |
| last_modified_time | string | - | `"2025-02-18T11:49:21+0000"` |
| **line_items** | **array** | **Length: 5<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_name1 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_name2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_name3 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_data1 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_data2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_data3 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_name1 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_name2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.attribute_option_name3 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.bcy_rate | number | - | `96` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.combo_type | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.custom_field_hash | map | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.description | string | - | `"Luxury throw Off white"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.discount | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.discounts | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.document_id | string | - | `"310656000003775431"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.group_name | string | - | `"Elvang Luxury throw Camel"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.header_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.header_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.image_document_id | string | - | `"310656000003775431"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.image_name | string | - | `"6004.jpg"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.image_type | string | - | `"jpg"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_combo_product | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_fulfillable | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_invoiced | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_returnable | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_unconfirmed_product | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_custom_fields | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_id | string | - | `"310656000000057137"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_order | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_sub_total | number | - | `96` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_total | number | - | `96` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.item_type | string | - | `"inventory"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.line_item_id | string | - | `"310656000000059391"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.line_item_taxes | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.line_item_type | string | - | `"goods"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.mapped_items | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.name | string | - | `"Luxury throw Off white"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details | map | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.dimension_unit | string | - | `"cm"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.height | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.length | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.weight | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.weight_unit | string | - | `"kg"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_details.width | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.pricebook_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.product_id | string | - | `"310656000000057137"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.product_type | string | - | `"goods"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.project_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_backordered | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_cancelled | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_delivered | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_dropshipped | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_invoiced | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_invoiced_cancelled | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_manuallyfulfilled | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_packed | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_picked | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_returned | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity_shipped | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.rate | number | - | `96` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.sales_rate | number | - | `97.87` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.sku | string | - | `"6004"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tags | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tax_id | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tax_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tax_percentage | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tax_type | string | - | `"tax"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.unit | string | - | `"pcs"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.variant_id | string | - | `"310656000000057137"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.warehouse_id | string | - | `"310656000000142250"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.warehouse_name | string | - | `"Homearama STAY Warehouse"` |
| location_id | string | - | `"310656000000999035"` |
| location_name | string | - | `"DMB"` |
| mail_first_viewed_time | string | - | `""` |
| mail_last_viewed_time | string | - | `""` |
| marketplace_source | null | - | - |
| merchant_id | string | - | `""` |
| merchant_name | string | - | `""` |
| notes | string | - | `""` |
| offline_created_date_with_time | string | - | `""` |
| order_fulfillment_type | string | - | `""` |
| order_status | string | - | `"closed"` |
| orientation | string | - | `"portrait"` |
| **packages** | **array** | **Length: 1<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.carrier | string | - | `"Courier"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.date | string | - | `"2022-09-29"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.delivery_days | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.delivery_guarantee | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.delivery_method | string | - | `"Courier"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.detailed_status | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_tracking_enabled | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_id | string | - | `"310656000000059483"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.package_number | string | - | `"PKG-00001"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.quantity | number | - | `5` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.service | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_date | string | - | `"2022-10-02"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_id | string | - | `"310656000000059507"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_number | string | - | `"Samples"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order | map | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.associated_packages_count | number | - | `1` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.carrier | string | - | `"Courier"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.delivery_date | string | - | `"2022-10-05"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.delivery_date_with_time | string | - | `"2022-10-05 00:00"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.delivery_days | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.delivery_guarantee | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.expected_delivery_date | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.is_carrier_shipment | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.service | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_date | string | - | `"2022-10-02"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_date_with_time | string | - | `"2022-10-02 00:00"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_delivered_date | string | - | `"2022-10-05 00:00"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_id | string | - | `"310656000000059507"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_number | string | - | `"Samples"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.shipment_type | string | - | `"single_piece_shipment"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.tracking_number | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_order.tracking_url | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.shipment_status | string | - | `"delivered"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.status | string | - | `"delivered"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.status_message | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.tracking_number | string | - | `""` |
| page_height | string | - | `"11.69in"` |
| page_width | string | - | `"8.27in"` |
| paid_status | string | - | `"paid"` |
| payment_terms | number | - | `30` |
| payment_terms_label | string | - | `"Net 30"` |
| **payments** | **array** | **Length: 0** | - |
| **picklists** | **array** | **Length: 0** | - |
| pickup_location_id | string | - | `""` |
| price_precision | number | - | `2` |
| **purchaseorders** | **array** | **Length: 0** | - |
| quantity | number | - | `5` |
| quantity_invoiced | number | - | `5` |
| quantity_packed | number | - | `5` |
| quantity_shipped | number | - | `5` |
| reference_number | string | - | `"Sample Order"` |
| **refunds** | **array** | **Length: 0** | - |
| reverse_charge_tax_total | number | - | `0` |
| rounding_mode | string | - | `"round_half_up"` |
| roundoff_value | number | - | `0` |
| sales_channel | string | - | `"direct_sales"` |
| sales_channel_formatted | string | - | `"Direct Sales"` |
| salesorder_id | string | - | `"310656000000059383"` |
| salesorder_number | string | - | `"SO-00001"` |
| salesperson_id | string | - | `"310656000000059361"` |
| salesperson_name | string | - | `"matt"` |
| salesperson_uid | null | - | - |
| **salesreturns** | **array** | **Length: 0** | - |
| shipment_date | string | - | `"2022-10-02"` |
| shipment_days | string | - | `""` |
| shipped_status | string | - | `"fulfilled"` |
| **shipping_address** | **map** | **13 fields:** zip, country, address, city, county, country_code, phone, company_name, attention, state, street2, fax, state_code | - |
| shipping_address_id | string | - | `"310656000000059336"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Ground Floor Units A1 & 2,"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ company_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Ainscough Trading Estate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"WN6 9RS"` |
| shipping_charge | number | - | `0` |
| shipping_charge_exclusive_of_tax | number | - | `0` |
| shipping_charge_exclusive_of_tax_formatted | string | - | `"£0.00"` |
| shipping_charge_inclusive_of_tax | number | - | `0` |
| shipping_charge_inclusive_of_tax_formatted | string | - | `"£0.00"` |
| shipping_charge_tax | string | - | `""` |
| shipping_charge_tax_exemption_code | string | - | `""` |
| shipping_charge_tax_exemption_id | string | - | `""` |
| shipping_charge_tax_formatted | string | - | `""` |
| shipping_charge_tax_id | string | - | `""` |
| shipping_charge_tax_name | string | - | `""` |
| shipping_charge_tax_percentage | string | - | `""` |
| shipping_charge_tax_type | string | - | `""` |
| **shipping_charge_taxes** | **array** | **Length: 0** | - |
| **shipping_details** | **map** | **0 fields:**  | - |
| **so_cycle_preference** | **map** | **7 fields:** socycle_status, can_create_invoice, is_feature_enabled, invoice_preference, can_create_package, shipment_preference, can_create_shipment | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ can_create_invoice | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ can_create_package | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ can_create_shipment | boolean | - | `false` |
| **so_cycle_preference.invoice_preference** | **map** | **4 fields:** mark_as_sent, payment_account_id, record_payment, payment_mode_id | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ mark_as_sent | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ payment_account_id | string | - | `"310656000000000349"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ payment_mode_id | string | - | `"310656000000000199"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ record_payment | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ is_feature_enabled | boolean | - | `false` |
| **so_cycle_preference.shipment_preference** | **map** | **3 fields:** default_carrier, deliver_shipments, send_notification | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ default_carrier | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ deliver_shipments | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ send_notification | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ socycle_status | string | - | `"not_triggered"` |
| source | string | - | `"Client"` |
| status | string | - | `"fulfilled"` |
| **sub_statuses** | **array** | **Length: 0** | - |
| sub_total | number | - | `428` |
| sub_total_exclusive_of_discount | number | - | `428` |
| sub_total_inclusive_of_tax | number | - | `0` |
| submitted_by | string | - | `""` |
| submitted_by_email | string | - | `""` |
| submitted_by_name | string | - | `""` |
| submitted_by_photo_url | string | - | `""` |
| submitted_date | string | - | `""` |
| submitter_id | string | - | `""` |
| **tags** | **array** | **Length: 0** | - |
| tax_rounding | string | - | `"entity_level"` |
| tax_total | number | - | `0` |
| tax_treatment | string | - | `""` |
| **taxes** | **array** | **Length: 0** | - |
| tds_calculation_type | string | - | `"tds_item_level"` |
| template_id | string | - | `"310656000000000111"` |
| template_name | string | - | `"Standard Template"` |
| template_type | string | - | `"standard"` |
| terms | string | - | `""` |
| total | number | - | `0` |
| total_invoiced_amount | number | - | `0` |
| total_quantity | number | - | `5` |
| tracking_url | string | - | `""` |
| transaction_rounding_type | string | - | `"no_rounding"` |
| vat_treatment | string | - | `""` |
| **warehouses** | **array** | **Length: 3<br>Types: object (100.0%)** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.address | string | - | `"Homearama"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.city | string | - | `"Bampton Business Centre"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.email | string | - | `"matt@dmbrands.co.uk"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.is_primary | boolean | - | `false` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.phone | string | - | `"+441905616006"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.sales_channels | array | - | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.state | string | - | `"Bampton"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.status | string | - | `"active"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.warehouse_id | string | - | `"310656000000142250"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.warehouse_name | string | - | `"Homearama STAY Warehouse"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─.zip | string | - | `"OX182AN"` |
| zcrm_potential_id | string | - | `""` |
| zcrm_potential_name | string | - | `""` |

### sales_orders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from_zoho | boolean | - | `true` |
| _original_firebase_id | string | - | `"310656000000059383"` |
| _original_zoho_id | string | - | `"310656000000059383"` |
| **billing_address** | **map** | **12 fields:** zip, country, country_code, address, city, phone, county, attention, state, street2, fax, state_code | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Ground Floor Units A1 & 2,"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Ainscough Trading Estate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"WN6 9RS"` |
| created_at | timestamp | - | `"2025-07-05T21:27:43.761Z"` |
| created_by | string | - | `"migration_script"` |
| currency_code | string | - | `"GBP"` |
| customer_id | string | - | `"310656000000059331"` |
| customer_name | string | - | `"Silver Mushroom Ltd"` |
| delivery_date | timestamp | - | `"2022-10-05T00:00:00.000Z"` |
| discount_total | number | - | `100` |
| id | string | - | `"SO_1751750863761_z4kbro1fp"` |
| internal_notes | string | - | `""` |
| notes | string | - | `""` |
| order_date | timestamp | - | `"2022-09-29T00:00:00.000Z"` |
| payment_terms | number | - | `30` |
| sales_order_id | string | - | `"SO_1751750863761_z4kbro1fp"` |
| sales_order_number | string | - | `"SO-00001"` |
| salesperson_id | string | - | `"310656000000059361"` |
| salesperson_name | string | - | `"matt"` |
| **shipping_address** | **map** | **13 fields:** zip, country, address, city, county, country_code, phone, company_name, attention, state, street2, fax, state_code | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `"Ground Floor Units A1 & 2,"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `"Rebecca Kane"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"Wrightington"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ company_name | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ county | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state_code | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `"Ainscough Trading Estate"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `"WN6 9RS"` |
| shipping_charge | number | - | `0` |
| status | string | - | `"open"` |
| subtotal | number | - | `428` |
| tax_total | number | - | `0` |
| total | number | - | `0` |
| updated_at | timestamp | - | `"2025-07-05T21:27:43.761Z"` |

### sales_transactions

**Document Count:** 26539

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _lastSynced | timestamp | - | `"2025-06-17T02:00:25.612Z"` |
| _syncSource | string | - | `"python_inventory_sync"` |
| brand | string | - | `"Elvang"` |
| brand_normalized | string | - | `"elvang"` |
| created_at | string | - | `"2022-09-29"` |
| customer_id | string | - | `"310656000000059331"` |
| customer_name | string | - | `"Silver Mushroom Ltd"` |
| is_marketplace_order | boolean | - | `false` |
| item_id | string | - | `"310656000000057137"` |
| item_name | string | - | `"Luxury throw Off white"` |
| last_modified | timestamp | - | `"2025-06-17T02:00:25.612Z"` |
| manufacturer | string | - | `"Elvang"` |
| marketplace_source | null | - | - |
| order_date | string | - | `"2022-09-29"` |
| order_id | string | - | `"310656000000059383"` |
| order_number | string | - | `"SO-00001"` |
| price | number | - | `96` |
| quantity | number | - | `1` |
| salesperson_id | string | - | `"310656000000059361"` |
| salesperson_name | string | - | `"matt"` |
| sku | string | - | `"6004"` |
| total | number | - | `96` |
| transaction_id | string | - | `"310656000000059391"` |

### invoices

**Document Count:** 1280

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from_zoho | boolean | - | `true` |
| _original_zoho_id | string | - | `"310656000052192965"` |
| _synced_at | timestamp | - | `"2025-07-05T21:47:41.704Z"` |
| balance | number | - | `0` |
| **billing_address** | **map** | **11 fields:** address, attention, street2, state, fax, country, street, city, phone, country_code, zip | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `""` |
| created_at | timestamp | - | `"2025-07-05T21:47:41.704Z"` |
| created_by | string | - | `"zoho_import_script"` |
| currency_code | string | - | `"GBP"` |
| customer_id | string | - | `"310656000002341121"` |
| customer_name | string | - | `"Amazon UK - Customer"` |
| discount_total | number | - | `0` |
| due_date | timestamp | - | `"2025-07-05T00:00:00.000Z"` |
| id | string | - | `"INV_1751752061451_4adc33e6"` |
| invoice_date | timestamp | - | `"2025-07-05T00:00:00.000Z"` |
| invoice_id | string | - | `"INV_1751752061451_4adc33e6"` |
| invoice_number | string | - | `"INV-003970"` |
| notes | string | - | `"Bank Details:\nAccount name: DM BRANDS LIMITED\nSort..."` |
| payment_status | string | - | `"unpaid"` |
| payment_terms | string | - | `"Due On Receipt"` |
| sales_order_id | string | - | `"310656000052192914"` |
| salesperson_id | string | - | `""` |
| salesperson_name | string | - | `""` |
| **shipping_address** | **map** | **11 fields:** address, attention, street2, state, fax, country, street, city, phone, country_code, zip | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ address | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ attention | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country_code | string | - | `"GB"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ fax | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street2 | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ zip | string | - | `""` |
| shipping_charge | number | - | `0` |
| status | string | - | `"paid"` |
| subtotal | number | - | `16.66` |
| tax_total | number | - | `3.33` |
| total | number | - | `19.99` |
| updated_at | timestamp | - | `"2025-07-05T21:47:41.704Z"` |

### invoices_enhanced

**Status:** Collection does not exist or is empty

### purchase_orders

**Document Count:** 133

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from_zoho | boolean | - | `true` |
| _original_firebase_id | string | - | `"2e3OJ1Sjp2FNyMdSzku6"` |
| _original_zoho_id | string | - | `"2e3OJ1Sjp2FNyMdSzku6"` |
| created_at | timestamp | - | `"2025-07-05T21:30:27.604Z"` |
| created_by | string | - | `"migration_script"` |
| currency_code | string | - | `"GBP"` |
| **delivery_address** | **map** | **0 fields:**  | - |
| expected_delivery_date | null | - | - |
| id | string | - | `"PO-1751751027604-bco1ceopd"` |
| notes | string | - | `""` |
| order_date | timestamp | - | `"2025-07-05T21:30:27.604Z"` |
| purchase_order_id | string | - | `"PO-1751751027604-bco1ceopd"` |
| status | string | - | `"issued"` |
| subtotal | number | - | `0` |
| tax_total | number | - | `0` |
| total | number | - | `0` |
| updated_at | timestamp | - | `"2025-07-05T21:30:27.604Z"` |
| vendor_name | string | - | `"Unknown Vendor"` |

### warehouses

**Document Count:** 3

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from | string | - | `"default_warehouse"` |
| _migration_date | timestamp | - | `"2025-07-05T17:40:15.790Z"` |
| **address** | **map** | **6 fields:** country, street_1, city, street_2, postcode, state | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"London"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `"SW1A 1AA"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `"England"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_1 | string | - | `"123 Main Street"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_2 | string | - | `""` |
| contact_email | string | - | `""` |
| contact_person | string | - | `""` |
| contact_phone | string | - | `""` |
| created_by | string | - | `"migration_script"` |
| created_date | timestamp | - | `"2025-07-05T17:40:15.790Z"` |
| description | string | - | `"Primary warehouse location"` |
| email | string | - | `""` |
| is_active | boolean | - | `true` |
| is_primary | boolean | - | `true` |
| last_modified | timestamp | - | `"2025-07-05T17:40:15.790Z"` |
| phone | string | - | `""` |
| updated_by | string | - | `"migration_script"` |
| warehouse_id | string | - | `"WH_1751737215790_jgkzle0kh"` |
| warehouse_name | string | - | `"Main Warehouse"` |
| warehouse_type | string | - | `"primary"` |

### stock_transactions

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### stock_alerts

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### inventory_transactions

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### shipping_methods

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### couriers

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### vendor_contacts

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### branches

**Document Count:** 2

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| _migrated_from | string | - | `"default_branch"` |
| _migration_date | timestamp | - | `"2025-07-05T18:25:23.216Z"` |
| **address** | **map** | **6 fields:** country, street_1, city, street_2, postcode, state | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ city | string | - | `"London"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ postcode | string | - | `"SW1A 1AA"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ state | string | - | `"England"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_1 | string | - | `"123 Main Street"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ street_2 | string | - | `""` |
| branch_code | string | - | `"MAIN"` |
| branch_id | string | - | `"BR_1751739923216_19udpex33"` |
| branch_name | string | - | `"Main Branch"` |
| branch_type | string | - | `"headquarters"` |
| contact_email | string | - | `""` |
| contact_person | string | - | `""` |
| contact_phone | string | - | `""` |
| created_by | string | - | `"migration_script"` |
| created_date | timestamp | - | `"2025-07-05T18:25:23.216Z"` |
| description | string | - | `"Primary business location"` |
| email | string | - | `""` |
| fax | string | - | `""` |
| is_active | boolean | - | `true` |
| is_primary | boolean | - | `true` |
| last_modified | timestamp | - | `"2025-07-05T18:25:23.216Z"` |
| phone | string | - | `""` |
| updated_by | string | - | `"migration_script"` |

### packing_stations

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### packing_jobs

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

### sync_metadata

**Document Count:** 18

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| customer_count | number | - | `544` |
| **errors** | **array** | **Length: 0** | - |
| last_rebuild | string | - | `"2025-06-16T00:57:07.358428+00:00"` |
| **stats** | **map** | **4 fields:** errors, invoicesProcessed, customersCreated, ordersProcessed | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ customersCreated | number | - | `544` |
| **stats.errors** | **array** | **Length: 0** | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ invoicesProcessed | number | - | `3664` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ ordersProcessed | number | - | `502` |
| status | string | - | `"completed"` |

### sync_queue

**Document Count:** 18366

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| changeType | string | - | `"modified"` |
| collection | string | - | `"customers"` |
| **data** | **map** | **14 fields:** Primary_Email, Billing_Street, Phone, Primary_Last_Name, Billing_Country, Billing_Code, Primary_First_Name, Billing_City, Agent, Billing_State, id, Account_Name, createdTime, source | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Account_Name | string | - | `"Patsy Blunt Interiors Ltd"` |
| **data.Agent** | **map** | **2 fields:** name, id | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ id | string | - | `"806490000000515916"` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ name | string | - | `"Gay Croker"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Billing_City | string | - | `"Virginia Water"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Billing_Code | string | - | `"GU25 4DL"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Billing_Country | string | - | `"United Kingdom"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Billing_State | string | - | `"Surrey"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Billing_Street | string | - | `"7 Station Approach"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ createdTime | timestamp | - | `"2025-06-08T14:52:03.355Z"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ id | string | - | `"806490000000593010"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Phone | string | - | `""` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Primary_Email | string | - | `"patsy@patsybluntinteriors.com"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Primary_First_Name | string | - | `"Patsy"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ Primary_Last_Name | string | - | `"Blunt"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ source | string | - | `"ZohoCRM"` |
| documentId | string | - | `"806490000000593010"` |
| processed | boolean | - | `false` |
| timestamp | timestamp | - | `"2025-06-08T14:52:05.660Z"` |

### migration_logs

**Document Count:** 6

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| **collections_created** | **array** | **Length: 14<br>Types: string (100.0%)** | - |
| **config** | **map** | **5 fields:** dryRun, batchSize, createMissingCollections, preserveExistingData, logLevel | - |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ batchSize | number | - | `100` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ createMissingCollections | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ dryRun | boolean | - | `true` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ logLevel | string | - | `"info"` |
| &nbsp;&nbsp;&nbsp;&nbsp;└─ preserveExistingData | boolean | - | `true` |
| dry_run | boolean | - | `true` |
| migration_date | timestamp | - | `"2025-07-05T03:43:57.350Z"` |
| migration_version | string | - | `"1.0.0"` |
| **results** | **map** | **5 fields:** vendors, items, customers, categories, warehouse | - |
| **results.categories** | **map** | **2 fields:** created, errors | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ created | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ errors | number | - | `0` |
| **results.customers** | **map** | **3 fields:** migrated, skipped, errors | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ errors | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ migrated | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ skipped | number | - | `0` |
| **results.items** | **map** | **3 fields:** migrated, skipped, errors | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ errors | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ migrated | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ skipped | number | - | `0` |
| **results.vendors** | **map** | **2 fields:** created, errors | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ created | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ errors | number | - | `0` |
| **results.warehouse** | **map** | **2 fields:** created, errors | - |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ created | number | - | `0` |
| &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ errors | number | - | `0` |

### data_adapters

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

