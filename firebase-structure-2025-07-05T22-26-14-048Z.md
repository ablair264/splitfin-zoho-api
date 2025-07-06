# Firebase Collection Structure

Generated on: 2025-07-05T22:26:14.052Z

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
| lastLogin | timestamp |  | `"2025-05-30T21:56:58.094Z"` |
| uid | string |  | `"kePM8QtWXoO24zlMg3qSidGOen02"` |
| agentID | string |  | `"806490000000720328"` |
| role | string |  | `"salesAgent"` |
| name | string |  | `"Steph Gillard"` |
| company | string |  | `"DM Brands"` |
| email | string |  | `"info@stephgillard.co.uk"` |
| zohospID | string |  | `"310656000002136698"` |
| phone | string |  | `"07739989826"` |
| brandsAssigned.rader | boolean |  | `true` |
| brandsAssigned.remember | boolean |  | `false` |
| brandsAssigned.myflame | boolean |  | `false` |
| brandsAssigned.blomus | boolean |  | `false` |
| brandsAssigned.elvang | boolean |  | `false` |
| brandsAssigned.relaxound | boolean |  | `false` |
| region | array | Length: 1<br>Types: string (100.0%) | `"South East"` |

### brand_managers

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| bm_id | string |  | `""` |

### sales_agents

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| sa_id | string |  | `""` |

### customers

**Document Count:** 4444

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| customer_payment_terms | string |  | `"30 days"` |
| customer_type | string |  | `"business"` |
| customer_billing_address.country | string |  | `"United Kingdom"` |
| customer_billing_address.street_1 | string |  | `""` |
| customer_billing_address.city | string |  | `""` |
| customer_billing_address.street_2 | string |  | `""` |
| customer_billing_address.postcode | string |  | `""` |
| customer_billing_address.state | string |  | `""` |
| customer_discount_rate | number |  | `0` |
| customer_registration_number | string |  | `""` |
| customer_phone | string |  | `""` |
| _original_id | string |  | `"310656000000071001"` |
| created_by | string |  | `"migration_script"` |
| customer_vat_number | string |  | `""` |
| _migration_date | timestamp |  | `"2025-07-05T17:39:53.917Z"` |
| customer_credit_limit | number |  | `0` |
| customer_shipping_address.country | string |  | `"United Kingdom"` |
| customer_shipping_address.street_1 | string |  | `""` |
| customer_shipping_address.city | string |  | `""` |
| customer_shipping_address.street_2 | string |  | `""` |
| customer_shipping_address.postcode | string |  | `""` |
| customer_shipping_address.state | string |  | `""` |
| _migrated_from | string |  | `"customer_data"` |
| customer_email | string |  | `""` |
| customer_status | string |  | `"active"` |
| updated_by | string |  | `"migration_script"` |
| created_date | timestamp |  | `"2025-07-05T17:39:53.917Z"` |
| customer_name | string |  | `"Unknown Customer"` |
| customer_id | string |  | `"CUST_1751737193917_09wtkywhc"` |
| customer_company_name | string |  | `""` |
| last_modified | timestamp |  | `"2025-07-05T17:39:53.917Z"` |

### customer_data

**Document Count:** 1479

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| zoho_region | string |  | `"eu"` |
| sync_status | string |  | `"success"` |
| last_synced | timestamp |  | `"2025-06-17T13:25:07.738Z"` |
| original_firebase_data.customer_id | string |  | `"310656000000059331"` |
| original_firebase_data.customer_sub_type | string |  | `"business"` |
| original_firebase_data.total_paid | number |  | `643.2` |
| original_firebase_data.last_modified | timestamp |  | `"2025-06-17T10:46:18.768Z"` |
| original_firebase_data.website | string |  | `"silvermushroom.co.uk"` |
| original_firebase_data.payment_terms_label | string |  | `"Net 30"` |
| original_firebase_data.total_spent | number |  | `585.6` |
| original_firebase_data.location_region | string |  | `"North West"` |
| original_firebase_data.total_orders_and_invoices | number |  | `15` |
| original_firebase_data.phone | string |  | `"01772 737 170"` |
| original_firebase_data.credit_limit | number |  | `0` |
| original_firebase_data.outstanding_receivable_amount | number |  | `0` |
| original_firebase_data.first_order_date | string |  | `"2022-09-29T00:00:00"` |
| original_firebase_data._lastSynced | timestamp |  | `"2025-06-17T10:46:18.768Z"` |
| original_firebase_data.payment_terms | number |  | `30` |
| original_firebase_data.brand_preferences | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 4 | `"{Object with 4 keys}"` |
| original_firebase_data.contact_type | string |  | `"customer"` |
| original_firebase_data.top_purchased_items | array | Length: 9<br>Types: object (100.0%)<br>Object keys: 5 | `"{Object with 5 keys}"` |
| original_firebase_data._syncSource | string |  | `"python_inventory_sync"` |
| original_firebase_data.unused_credits_receivable_amount | number |  | `0` |
| original_firebase_data.customer_name | string |  | `"Silver Mushroom Ltd"` |
| original_firebase_data.mobile | string |  | `""` |
| original_firebase_data.salesperson_names | array | Length: 1<br>Types: string (100.0%) | `"matt"` |
| original_firebase_data.salesperson_ids | array | Length: 1<br>Types: string (100.0%) | `"31065600000005****"` |
| original_firebase_data.total_outstanding | number |  | `0` |
| original_firebase_data.company_name | string |  | `"Silver Mushroom Ltd"` |
| original_firebase_data.currency_code | string |  | `"GBP"` |
| original_firebase_data.segment | string |  | `"Low"` |
| original_firebase_data.city | string |  | `"Wrightington"` |
| original_firebase_data.coordinates.latitude | number |  | `53.6079516` |
| original_firebase_data.coordinates.longitude | number |  | `-2.7026693` |
| original_firebase_data.postcode | string |  | `"WN6 9RS"` |
| original_firebase_data.average_order_value | number |  | `83.65714285714286` |
| original_firebase_data._enriched_at | timestamp |  | `"2025-06-16T21:55:04.948Z"` |
| original_firebase_data.payment_performance | number |  | `100` |
| original_firebase_data.shipping_address.country_code | string |  | `"GB"` |
| original_firebase_data.shipping_address.address | string |  | `""` |
| original_firebase_data.shipping_address.company_name | string |  | `""` |
| original_firebase_data.shipping_address.attention | string |  | `""` |
| original_firebase_data.shipping_address.state_code | string |  | `""` |
| original_firebase_data.shipping_address.city | string |  | `""` |
| original_firebase_data.shipping_address.street2 | string |  | `""` |
| original_firebase_data.shipping_address.state | string |  | `""` |
| original_firebase_data.shipping_address.county | string |  | `""` |
| original_firebase_data.shipping_address.phone | string |  | `""` |
| original_firebase_data.shipping_address.country | string |  | `""` |
| original_firebase_data.shipping_address.fax | string |  | `""` |
| original_firebase_data.shipping_address.zip | string |  | `""` |
| original_firebase_data.total_items | number |  | `17` |
| original_firebase_data._rebuilt_at | timestamp |  | `"2025-06-16T00:57:03.912Z"` |
| original_firebase_data.invoice_count | number |  | `8` |
| original_firebase_data._csv_enriched_at | timestamp |  | `"2025-06-16T23:11:15.470Z"` |
| original_firebase_data.overdue_amount | number |  | `0` |
| original_firebase_data.status | string |  | `"active"` |
| original_firebase_data.last_modified_time | string |  | `"2025-02-23T11:31:43+0000"` |
| original_firebase_data.terms | string |  | `"Proforma"` |
| original_firebase_data._source | string |  | `"firestore_rebuild"` |
| original_firebase_data.billing_address.country_code | string |  | `"GB"` |
| original_firebase_data.billing_address.fax | string |  | `""` |
| original_firebase_data.billing_address.attention | string |  | `""` |
| original_firebase_data.billing_address.address | string |  | `""` |
| original_firebase_data.billing_address.state_code | string |  | `""` |
| original_firebase_data.billing_address.city | string |  | `""` |
| original_firebase_data.billing_address.state | string |  | `""` |
| original_firebase_data.billing_address.county | string |  | `""` |
| original_firebase_data.billing_address.phone | string |  | `""` |
| original_firebase_data.billing_address.country | string |  | `""` |
| original_firebase_data.billing_address.street2 | string |  | `""` |
| original_firebase_data.billing_address.zip | string |  | `""` |
| original_firebase_data.order_count | number |  | `7` |
| original_firebase_data.last_order_date | string |  | `"2022-11-28T00:00:00"` |
| original_firebase_data.notes | string |  | `""` |
| original_firebase_data.order_ids | array | Length: 7<br>Types: string (100.0%) | `"31065600000007****"` |
| original_firebase_data.total_invoiced | number |  | `643.2` |
| original_firebase_data.country | string |  | `"United Kingdom"` |
| original_firebase_data.created_time | string |  | `"2022-09-29T12:42:24+0100"` |
| original_firebase_data.email | string |  | `"giddymarie1998@gmail.com"` |
| firebase_uid | string |  | `"DFgJyTrpW3RTS2qxYJKup7jF4su2"` |
| zoho_data.crm_owner_id | string |  | `"806490000000432001"` |
| zoho_data.opening_balance_amount | number |  | `0` |
| zoho_data.approvers_list | array | Length: 0 | - |
| zoho_data.is_credit_limit_migration_completed | boolean |  | `true` |
| zoho_data.associated_with_square | boolean |  | `false` |
| zoho_data.is_bcy_only_contact | boolean |  | `true` |
| zoho_data.contact_id | string |  | `"310656000000059331"` |
| zoho_data.currency_id | string |  | `"310656000000000065"` |
| zoho_data.phone | string |  | `"01772 737 170"` |
| zoho_data.tax_reg_no | string |  | `""` |
| zoho_data.checks | array | Length: 0 | - |
| zoho_data.is_consent_agreed | boolean |  | `false` |
| zoho_data.submitted_by_name | string |  | `""` |
| zoho_data.documents | array | Length: 0 | - |
| zoho_data.payment_terms | number |  | `30` |
| zoho_data.unused_credits_receivable_amount | number |  | `0` |
| zoho_data.currency_symbol | string |  | `"£"` |
| zoho_data.opening_balance_amount_bcy | string |  | `""` |
| zoho_data.created_by_name | string |  | `"Matt Langford"` |
| zoho_data.addresses | array | Length: 0 | - |
| zoho_data.cf_phone_number_unformatted | string |  | `"01772 737 170"` |
| zoho_data.tax_treatment | string |  | `"uk"` |
| zoho_data.outstanding_ob_payable_amount | number |  | `0` |
| zoho_data.currency_code | string |  | `"GBP"` |
| zoho_data.submitter_id | string |  | `""` |
| zoho_data.is_crm_customer | boolean |  | `true` |
| zoho_data.custom_fields | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 18 | `"{Object with 18 keys}"` |
| zoho_data.billing_address.country_code | string |  | `"GB"` |
| zoho_data.billing_address.address_id | string |  | `"310656000000059334"` |
| zoho_data.billing_address.street2 | string |  | `"Carnfield Place"` |
| zoho_data.billing_address.fax | string |  | `""` |
| zoho_data.billing_address.state_code | string |  | `""` |
| zoho_data.billing_address.city | string |  | `"Preston"` |
| zoho_data.billing_address.address | string |  | `"Unit 3a"` |
| zoho_data.billing_address.state | string |  | `""` |
| zoho_data.billing_address.county | string |  | `""` |
| zoho_data.billing_address.phone | string |  | `""` |
| zoho_data.billing_address.country | string |  | `"United Kingdom"` |
| zoho_data.billing_address.attention | string |  | `"Rebecca Kane"` |
| zoho_data.billing_address.zip | string |  | `"PR58AN"` |
| zoho_data.last_modified_time | string |  | `"2025-02-23T11:31:43+0000"` |
| zoho_data.pricebook_name | string |  | `""` |
| zoho_data.primary_contact_id | string |  | `"310656000000059333"` |
| zoho_data.unused_credits_payable_amount_bcy | number |  | `0` |
| zoho_data.language_code_formatted | string |  | `""` |
| zoho_data.contact_tax_information | string |  | `""` |
| zoho_data.facebook | string |  | `""` |
| zoho_data.ach_supported | boolean |  | `false` |
| zoho_data.tags | array | Length: 0 | - |
| zoho_data.can_show_vendor_ob | boolean |  | `false` |
| zoho_data.credit_limit | number |  | `0` |
| zoho_data.submitted_by_photo_url | string |  | `""` |
| zoho_data.customer_sub_type | string |  | `"business"` |
| zoho_data.designation | string |  | `""` |
| zoho_data.branch_name | string |  | `"DMB"` |
| zoho_data.payment_terms_label | string |  | `"Net 30"` |
| zoho_data.unused_credits_receivable_amount_bcy | number |  | `0` |
| zoho_data.outstanding_receivable_amount | number |  | `0` |
| zoho_data.outstanding_payable_amount | number |  | `0` |
| zoho_data.outstanding_payable_amount_bcy | number |  | `0` |
| zoho_data.zcrm_account_id | string |  | `"806490000000569001"` |
| zoho_data.submitted_by_email | string |  | `""` |
| zoho_data.portal_status | string |  | `"disabled"` |
| zoho_data.department | string |  | `""` |
| zoho_data.company_id | string |  | `""` |
| zoho_data.payment_terms_id | string |  | `""` |
| zoho_data.location_name | string |  | `"DMB"` |
| zoho_data.is_sms_enabled | boolean |  | `true` |
| zoho_data.contact_name | string |  | `"Silver Mushroom Ltd"` |
| zoho_data.is_client_review_settings_enabled | boolean |  | `false` |
| zoho_data.zcrm_contact_id | string |  | `""` |
| zoho_data.submitted_date | string |  | `""` |
| zoho_data.shipping_address.fax | string |  | `""` |
| zoho_data.shipping_address.address_id | string |  | `"310656000000059336"` |
| zoho_data.shipping_address.address | string |  | `"Ground Floor Units A1 & 2,"` |
| zoho_data.shipping_address.street2 | string |  | `"Ainscough Trading Estate"` |
| zoho_data.shipping_address.state_code | string |  | `""` |
| zoho_data.shipping_address.city | string |  | `"Wrightington"` |
| zoho_data.shipping_address.latitude | string |  | `""` |
| zoho_data.shipping_address.state | string |  | `""` |
| zoho_data.shipping_address.county | string |  | `""` |
| zoho_data.shipping_address.phone | string |  | `""` |
| zoho_data.shipping_address.longitude | string |  | `""` |
| zoho_data.shipping_address.zip | string |  | `"WN6 9RS"` |
| zoho_data.shipping_address.country_code | string |  | `"GB"` |
| zoho_data.shipping_address.attention | string |  | `"Rebecca Kane"` |
| zoho_data.shipping_address.country | string |  | `"United Kingdom"` |
| zoho_data.location_id | string |  | `""` |
| zoho_data.created_date | string |  | `"29/09/22"` |
| zoho_data.status | string |  | `"active"` |
| zoho_data.is_client_review_asked | boolean |  | `false` |
| zoho_data.credit_limit_exceeded_amount | number |  | `0` |
| zoho_data.created_time | string |  | `"2022-09-29T12:42:24+0100"` |
| zoho_data.entity_address_id | string |  | `"310656000001702812"` |
| zoho_data.website | string |  | `"silvermushroom.co.uk"` |
| zoho_data.sales_channel | string |  | `"direct_sales"` |
| zoho_data.bank_accounts | array | Length: 0 | - |
| zoho_data.contact_salutation | string |  | `""` |
| zoho_data.contact_type | string |  | `"customer"` |
| zoho_data.zohopeople_client_id | string |  | `""` |
| zoho_data.vpa_list | array | Length: 0 | - |
| zoho_data.company_name | string |  | `"Silver Mushroom Ltd"` |
| zoho_data.cf_phone_number | string |  | `"01772 737 170"` |
| zoho_data.outstanding_ob_receivable_amount | number |  | `0` |
| zoho_data.last_name | string |  | `"Kane"` |
| zoho_data.approver_id | string |  | `""` |
| zoho_data.can_show_customer_ob | boolean |  | `false` |
| zoho_data.price_precision | number |  | `2` |
| zoho_data.first_name | string |  | `"Rebecca"` |
| zoho_data.has_transaction | boolean |  | `true` |
| zoho_data.notes | string |  | `""` |
| zoho_data.owner_id | string |  | `""` |
| zoho_data.outstanding_receivable_amount_bcy | number |  | `0` |
| zoho_data.twitter | string |  | `""` |
| zoho_data.contact_category | string |  | `"uk"` |
| zoho_data.cards | array | Length: 0 | - |
| zoho_data.unused_credits_payable_amount | number |  | `0` |
| zoho_data.portal_receipt_count | number |  | `0` |
| zoho_data.opening_balances | array | Length: 0 | - |
| zoho_data.branch_id | string |  | `""` |
| zoho_data.vat_reg_no | string |  | `""` |
| zoho_data.source | string |  | `"user"` |
| zoho_data.customer_currency_summaries | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 8 | `"{Object with 8 keys}"` |
| zoho_data.tax_reg_label | string |  | `""` |
| zoho_data.is_linked_with_zohocrm | boolean |  | `true` |
| zoho_data.is_taxable | boolean |  | `true` |
| zoho_data.mobile | string |  | `""` |
| zoho_data.payment_reminder_enabled | boolean |  | `true` |
| zoho_data.unused_retainer_payments | number |  | `0` |
| zoho_data.integration_references | array | Length: 0 | - |
| zoho_data.label_for_company_id | string |  | `"Company Registration Number"` |
| zoho_data.vat_treatment | string |  | `"uk"` |
| zoho_data.submitted_by | string |  | `""` |
| zoho_data.custom_field_hash.cf_phone_number | string |  | `"01772 737 170"` |
| zoho_data.custom_field_hash.cf_phone_number_unformatted | string |  | `"01772 737 170"` |
| zoho_data.owner_name | string |  | `""` |
| zoho_data.language_code | string |  | `""` |
| zoho_data.country_code | string |  | `""` |
| zoho_data.pricebook_id | string |  | `""` |
| zoho_data.consent_date | string |  | `""` |
| zoho_data.default_templates.purchaseorder_template_name | string |  | `""` |
| zoho_data.default_templates.bill_template_name | string |  | `""` |
| zoho_data.default_templates.statement_template_id | string |  | `""` |
| zoho_data.default_templates.creditnote_template_id | string |  | `""` |
| zoho_data.default_templates.salesorder_email_template_id | string |  | `""` |
| zoho_data.default_templates.salesorder_template_id | string |  | `""` |
| zoho_data.default_templates.invoice_email_template_name | string |  | `""` |
| zoho_data.default_templates.paymentthankyou_email_template_id | string |  | `""` |
| zoho_data.default_templates.payment_remittance_email_template_name | string |  | `""` |
| zoho_data.default_templates.invoice_template_id | string |  | `""` |
| zoho_data.default_templates.salesorder_template_name | string |  | `""` |
| zoho_data.default_templates.purchaseorder_email_template_id | string |  | `""` |
| zoho_data.default_templates.invoice_email_template_id | string |  | `""` |
| zoho_data.default_templates.paymentthankyou_template_name | string |  | `""` |
| zoho_data.default_templates.invoice_template_name | string |  | `""` |
| zoho_data.default_templates.purchaseorder_template_id | string |  | `""` |
| zoho_data.default_templates.statement_template_name | string |  | `""` |
| zoho_data.default_templates.estimate_email_template_name | string |  | `""` |
| zoho_data.default_templates.creditnote_email_template_name | string |  | `""` |
| zoho_data.default_templates.paymentthankyou_email_template_name | string |  | `""` |
| zoho_data.default_templates.creditnote_template_name | string |  | `""` |
| zoho_data.default_templates.estimate_email_template_id | string |  | `""` |
| zoho_data.default_templates.paymentthankyou_template_id | string |  | `""` |
| zoho_data.default_templates.creditnote_email_template_id | string |  | `""` |
| zoho_data.default_templates.bill_template_id | string |  | `""` |
| zoho_data.default_templates.estimate_template_name | string |  | `""` |
| zoho_data.default_templates.payment_remittance_email_template_id | string |  | `""` |
| zoho_data.default_templates.purchaseorder_email_template_name | string |  | `""` |
| zoho_data.default_templates.salesorder_email_template_name | string |  | `""` |
| zoho_data.default_templates.estimate_template_id | string |  | `""` |
| zoho_data.exchange_rate | string |  | `""` |
| zoho_data.invited_by | string |  | `""` |
| zoho_data.contact_persons | array | Length: 4<br>Types: object (100.0%)<br>Object keys: 22 | `"{Object with 22 keys}"` |
| zoho_data.email | string |  | `"\"giddymarie1998@gmail.com\"\n"` |
| Primary_Email | string |  | `"giddymarie1998@gmail.com"` |
| lastLogin | string |  | `"2025-06-25T21:49:06.096Z"` |
| lastSeen | string |  | `"2025-06-25T22:25:39.200Z"` |
| isOnline | boolean |  | `false` |

### items

**Document Count:** 6552

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| item_type | string |  | `"inventory"` |
| cf_committed_stock | string |  | `"0.00"` |
| is_linked_with_zohocrm | boolean |  | `true` |
| has_attachment | boolean |  | `true` |
| source | string |  | `"csv"` |
| purchase_description | string |  | `"Elvang Teddy bear Beige"` |
| image_name | string |  | `"1060.jpg"` |
| _synced_at | timestamp |  | `"2025-06-16T00:01:39.918Z"` |
| track_inventory | boolean |  | `true` |
| _sync_batch | number |  | `6` |
| is_returnable | boolean |  | `false` |
| sku | string |  | `"1060"` |
| brand | string |  | `"Elvang"` |
| height | string |  | `""` |
| image_type | string |  | `"jpg"` |
| tax_exemption_code | string |  | `""` |
| created_time | string |  | `"2022-09-29T12:27:57+0100"` |
| image_document_id | string |  | `"310656000003778337"` |
| upc | string |  | `""` |
| weight | string |  | `""` |
| tax_id | string |  | `"310656000000059451"` |
| tags | array | Length: 0 | - |
| cf_actual_available_in_stock | string |  | `"0"` |
| unit | string |  | `"pcs"` |
| purchase_account_id | string |  | `"310656000000000509"` |
| weight_unit | string |  | `"kg"` |
| name | string |  | `"Elvang Teddy bear Beige"` |
| part_number | string |  | `""` |
| _source | string |  | `"zoho_inventory"` |
| can_be_purchased | boolean |  | `true` |
| is_storage_location_enabled | boolean |  | `false` |
| status | string |  | `"active"` |
| is_combo_product | boolean |  | `false` |
| isbn | string |  | `""` |
| can_be_sold | boolean |  | `true` |
| cf_actual_available_in_stock_unformatted | string |  | `"0"` |
| purchase_rate | number |  | `18.2` |
| description | string |  | `"Elvang Teddy bear Beige"` |
| zcrm_product_id | string |  | `"806490000000561001"` |
| ean | string |  | `"5701311910600"` |
| rate | number |  | `29.36` |
| account_name | string |  | `"Sales"` |
| show_in_storefront | boolean |  | `false` |
| _sync_timestamp | string |  | `"2025-06-16T01:01:39.523258"` |
| dimension_unit | string |  | `"cm"` |
| last_modified_time | string |  | `"2025-06-08T21:18:35+0100"` |
| item_id | string |  | `"310656000000051244"` |
| tax_name | string |  | `"Standard Rate"` |
| length | string |  | `""` |
| item_name | string |  | `"Elvang Teddy bear Beige"` |
| cf_committed_stock_unformatted | string |  | `"0.00"` |
| tax_exemption_id | string |  | `""` |
| account_id | string |  | `"310656000000000376"` |
| purchase_account_name | string |  | `"Cost of Goods Sold"` |
| tax_percentage | number |  | `20` |
| width | string |  | `""` |
| is_taxable | boolean |  | `true` |
| _syncSource | string |  | `"python_inventory_sync"` |
| Manufacturer | string |  | `"Elvang"` |
| actual_available_stock | number |  | `4` |
| available_stock | number |  | `4` |
| stock_on_hand | number |  | `4` |
| _lastSynced | timestamp |  | `"2025-06-17T10:37:20.131Z"` |
| category_name | string |  | `"Uncategorized"` |
| variable_pricing | boolean |  | `false` |
| stock_available | number |  | `0` |
| retail_price | number |  | `29.36` |
| _migrated_from | string |  | `"zoho_inventory"` |
| stock_committed | number |  | `4` |
| reorder_level | number |  | `10` |
| minimum_order_qty | number |  | `1` |
| item_imgs | array | Length: 0 | - |
| stock_total | number |  | `4` |
| vendor_name | string |  | `"Elvang"` |
| _original_id | string |  | `"310656000000051244"` |
| created_by | string |  | `"migration_script"` |
| part_no | string |  | `"1060"` |
| product_type | string |  | `"Goods"` |
| purchase_price | number |  | `18.2` |
| updated_by | string |  | `"migration_script"` |
| created_date | string |  | `"2022-09-29T12:27:57+0100"` |
| estimated_delivery | number |  | `7` |
| item_description | string |  | `"Elvang Teddy bear Beige"` |
| reorder_quantity | number |  | `1` |
| tax.tax_exempt | boolean |  | `false` |
| tax.tax_rate | number |  | `20` |
| tax.tax_code | string |  | `"VAT20"` |
| tax.tax_name | string |  | `"Standard Rate"` |
| manufacturer.manufacturer_contact | string |  | `""` |
| manufacturer.manufacturer_part_number | string |  | `"1060"` |
| manufacturer.manufacturer_name | string |  | `"Elvang"` |
| manufacturer.manufacturer_website | string |  | `""` |
| shipping.is_fragile | boolean |  | `false` |
| shipping.weight_unit | string |  | `"kg"` |
| shipping.shipping_class | string |  | `"standard"` |
| shipping.weight | number |  | `0` |
| shipping.is_hazardous | boolean |  | `false` |
| shipping.requires_special_handling | boolean |  | `false` |
| inventory_valuation.total_value | number |  | `0` |
| inventory_valuation.method | string |  | `"FIFO"` |
| inventory_valuation.average_cost | number |  | `0` |
| inventory_valuation.last_cost | number |  | `18.2` |
| wholesale_price | number |  | `0` |
| bulk_pricing | array | Length: 0 | - |
| package_info.package_width | number |  | `null` |
| package_info.package_height | number |  | `null` |
| package_info.package_weight_unit | string |  | `"kg"` |
| package_info.package_length | number |  | `null` |
| package_info.package_weight | number |  | `null` |
| package_info.package_unit | string |  | `"cm"` |
| cost_price | number |  | `18.2` |
| dimensions.volume | number |  | `null` |
| dimensions.diameter | number |  | `null` |
| dimensions.weight_unit | string |  | `"kg"` |
| dimensions.length | number |  | `null` |
| dimensions.width | number |  | `null` |
| dimensions.weight | number |  | `null` |
| dimensions.dimension_unit | string |  | `"cm"` |
| dimensions.height | number |  | `null` |
| _migration_date | timestamp |  | `"2025-07-05T18:22:47.610Z"` |
| category_id | string |  | `"CAT_1751739767610_7v4t232ut"` |
| last_modified | timestamp |  | `"2025-07-05T18:22:47.610Z"` |

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
| id | string |  | `"VEND_1751750766027_4061uax72"` |
| vendor_id | string |  | `"VEND_1751750766027_4061uax72"` |
| vendor_name | string |  | `"Remember"` |
| brand | string |  | `"Remember"` |
| brand_name | string |  | `"Remember"` |
| brand_normalized | string |  | `"remember"` |
| vendor_status | string |  | `"active"` |
| vendor_location | string |  | `"Unknown"` |
| vendor_address.street_1 | string |  | `""` |
| vendor_address.city | string |  | `""` |
| vendor_address.postcode | string |  | `""` |
| vendor_address.country | string |  | `"GB"` |
| vendor_contacts | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 6 | `"{Object with 6 keys}"` |
| vendor_bank_name | string |  | `""` |
| vendor_bank_sortcode | string |  | `""` |
| vendor_bank_acc | string |  | `""` |
| vendor_bank_vat | string |  | `""` |
| vendor_bank_verified | boolean |  | `false` |
| created_date | timestamp |  | `"2025-07-05T21:26:06.028Z"` |
| created_by | string |  | `"migration_script"` |
| updated_by | string |  | `"migration_script"` |
| last_modified | timestamp |  | `"2025-07-05T21:26:06.028Z"` |
| _migrated_from_zoho | boolean |  | `true` |
| _original_zoho_id | string |  | `"310656000000194675"` |

### item_categories

**Document Count:** 1596

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| id | string |  | `"CAT_1751750771545_0enjdwsor"` |
| category_id | string |  | `"CAT_1751750771545_0enjdwsor"` |
| category_name | array | Length: 5<br>Types: string (100.0%) | `"cushion"` |
| description | string |  | `""` |
| is_active | boolean |  | `true` |
| created_date | timestamp |  | `"2025-07-05T21:26:11.545Z"` |
| created_by | string |  | `"migration_script"` |
| _migrated_from_zoho | boolean |  | `true` |

### salesorders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| can_send_in_mail | boolean |  | `false` |
| zcrm_potential_id | string |  | `""` |
| discount | string |  | `"100.00%"` |
| taxes | array | Length: 0 | - |
| shipment_date | string |  | `"2022-10-02"` |
| billing_address.zip | string |  | `"WN6 9RS"` |
| billing_address.country | string |  | `"United Kingdom"` |
| billing_address.country_code | string |  | `"GB"` |
| billing_address.address | string |  | `"Ground Floor Units A1 & 2,"` |
| billing_address.city | string |  | `"Wrightington"` |
| billing_address.phone | string |  | `""` |
| billing_address.county | string |  | `""` |
| billing_address.attention | string |  | `"Rebecca Kane"` |
| billing_address.state | string |  | `""` |
| billing_address.street2 | string |  | `"Ainscough Trading Estate"` |
| billing_address.fax | string |  | `""` |
| billing_address.state_code | string |  | `""` |
| line_items | array | Length: 5<br>Types: object (100.0%)<br>Object keys: 67 | `"{Object with 67 keys}"` |
| can_show_kit_return | boolean |  | `false` |
| is_test_order | boolean |  | `false` |
| location_id | string |  | `"310656000000999035"` |
| submitted_by_email | string |  | `""` |
| order_status | string |  | `"closed"` |
| balance | number |  | `0` |
| invoices | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 8 | `"{Object with 8 keys}"` |
| bcy_shipping_charge_tax | string |  | `""` |
| terms | string |  | `""` |
| total_quantity | number |  | `5` |
| picklists | array | Length: 0 | - |
| mail_first_viewed_time | string |  | `""` |
| has_qty_cancelled | boolean |  | `false` |
| sub_total_inclusive_of_tax | number |  | `0` |
| exchange_rate | number |  | `1` |
| mail_last_viewed_time | string |  | `""` |
| approver_id | string |  | `""` |
| estimate_id | string |  | `""` |
| contact_person_details | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 6 | `"{Object with 6 keys}"` |
| merchant_name | string |  | `""` |
| sales_channel | string |  | `"direct_sales"` |
| packages | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 19 | `"{Object with 19 keys}"` |
| reference_number | string |  | `"Sample Order"` |
| shipping_charge_tax_id | string |  | `""` |
| sub_total_exclusive_of_discount | number |  | `428` |
| purchaseorders | array | Length: 0 | - |
| location_name | string |  | `"DMB"` |
| vat_treatment | string |  | `""` |
| is_dropshipped | boolean |  | `false` |
| has_discount | boolean |  | `true` |
| _source | string |  | `"zoho_inventory"` |
| discount_percent | number |  | `100` |
| page_height | string |  | `"11.69in"` |
| shipping_charge_tax_name | string |  | `""` |
| status | string |  | `"fulfilled"` |
| discount_total | number |  | `428` |
| integration_id | string |  | `""` |
| tax_total | number |  | `0` |
| invoiced_status | string |  | `"invoiced"` |
| shipped_status | string |  | `"fulfilled"` |
| payments | array | Length: 0 | - |
| salesorder_id | string |  | `"310656000000059383"` |
| shipping_charge_taxes | array | Length: 0 | - |
| currency_code | string |  | `"GBP"` |
| page_width | string |  | `"8.27in"` |
| refunds | array | Length: 0 | - |
| sub_statuses | array | Length: 0 | - |
| bcy_total | number |  | `0` |
| is_adv_tracking_in_package | boolean |  | `false` |
| delivery_method_id | string |  | `"310656000000059381"` |
| delivery_method | string |  | `"Courier"` |
| tracking_url | string |  | `""` |
| tax_rounding | string |  | `"entity_level"` |
| adjustment_description | string |  | `"Adjustment"` |
| last_modified_time | string |  | `"2025-02-18T11:49:21+0000"` |
| currency_symbol | string |  | `"£"` |
| is_kit_partial_return | boolean |  | `false` |
| discount_type | string |  | `"entity_level"` |
| transaction_rounding_type | string |  | `"no_rounding"` |
| roundoff_value | number |  | `0` |
| template_name | string |  | `"Standard Template"` |
| sales_channel_formatted | string |  | `"Direct Sales"` |
| has_unconfirmed_line_item | boolean |  | `false` |
| salesorder_number | string |  | `"SO-00001"` |
| template_id | string |  | `"310656000000000111"` |
| customer_name | string |  | `"Silver Mushroom Ltd"` |
| customer_id | string |  | `"310656000000059331"` |
| is_taxable | boolean |  | `false` |
| payment_terms_label | string |  | `"Net 30"` |
| date | string |  | `"2022-09-29"` |
| submitted_date | string |  | `""` |
| notes | string |  | `""` |
| documents | array | Length: 0 | - |
| discount_amount | number |  | `428` |
| pickup_location_id | string |  | `""` |
| source | string |  | `"Client"` |
| created_by_name | string |  | `"Matt Langford"` |
| entity_tags | string |  | `""` |
| _synced_at | timestamp |  | `"2025-06-15T23:58:12.589Z"` |
| shipping_charge_inclusive_of_tax | number |  | `0` |
| last_modified_by_id | string |  | `""` |
| contact.is_credit_limit_migration_completed | boolean |  | `true` |
| contact.unused_customer_credits | number |  | `0` |
| contact.credit_limit | number |  | `0` |
| contact.customer_balance | number |  | `0` |
| contact_category | string |  | `""` |
| template_type | string |  | `"standard"` |
| _sync_batch | number |  | `8` |
| shipping_charge_tax_exemption_code | string |  | `""` |
| color_code | string |  | `""` |
| contact_persons | array | Length: 1<br>Types: string (100.0%) | `"31065600000005****"` |
| billing_address_id | string |  | `""` |
| shipping_charge_tax | string |  | `""` |
| bcy_tax_total | number |  | `0` |
| created_time | string |  | `"2022-09-29T12:54:27+0100"` |
| shipping_address_id | string |  | `"310656000000059336"` |
| is_inclusive_tax | boolean |  | `false` |
| custom_fields | array | Length: 0 | - |
| salesreturns | array | Length: 0 | - |
| shipping_charge_tax_exemption_id | string |  | `""` |
| price_precision | number |  | `2` |
| submitted_by_photo_url | string |  | `""` |
| approvers_list | array | Length: 0 | - |
| tax_treatment | string |  | `""` |
| so_cycle_preference.socycle_status | string |  | `"not_triggered"` |
| so_cycle_preference.can_create_invoice | boolean |  | `false` |
| so_cycle_preference.is_feature_enabled | boolean |  | `false` |
| so_cycle_preference.invoice_preference.mark_as_sent | boolean |  | `false` |
| so_cycle_preference.invoice_preference.payment_account_id | string |  | `"310656000000000349"` |
| so_cycle_preference.invoice_preference.record_payment | boolean |  | `false` |
| so_cycle_preference.invoice_preference.payment_mode_id | string |  | `"310656000000000199"` |
| so_cycle_preference.can_create_package | boolean |  | `false` |
| so_cycle_preference.shipment_preference.default_carrier | string |  | `""` |
| so_cycle_preference.shipment_preference.deliver_shipments | boolean |  | `false` |
| so_cycle_preference.shipment_preference.send_notification | boolean |  | `false` |
| so_cycle_preference.can_create_shipment | boolean |  | `false` |
| shipping_charge_tax_percentage | string |  | `""` |
| tds_calculation_type | string |  | `"tds_item_level"` |
| adjustment | number |  | `0` |
| zcrm_potential_name | string |  | `""` |
| created_by_id | string |  | `"310656000000039001"` |
| submitted_by_name | string |  | `""` |
| current_sub_status | string |  | `"closed"` |
| is_discount_before_tax | boolean |  | `true` |
| attachment_name | string |  | `""` |
| rounding_mode | string |  | `"round_half_up"` |
| shipping_charge_inclusive_of_tax_formatted | string |  | `"£0.00"` |
| merchant_id | string |  | `""` |
| payment_terms | number |  | `30` |
| is_backordered | boolean |  | `false` |
| shipping_charge_exclusive_of_tax | number |  | `0` |
| total | number |  | `0` |
| contact_persons_associated | array | Length: 1<br>Types: object (100.0%)<br>Object keys: 6 | `"{Object with 6 keys}"` |
| shipping_charge_exclusive_of_tax_formatted | string |  | `"£0.00"` |
| branch_id | string |  | `"310656000000999035"` |
| creditnotes | array | Length: 0 | - |
| current_sub_status_id | string |  | `""` |
| branch_name | string |  | `"DMB"` |
| is_viewed_in_mail | boolean |  | `false` |
| bcy_rounding_mode | string |  | `"round_half_up"` |
| bcy_shipping_charge | number |  | `0` |
| shipping_address.zip | string |  | `"WN6 9RS"` |
| shipping_address.country | string |  | `"United Kingdom"` |
| shipping_address.address | string |  | `"Ground Floor Units A1 & 2,"` |
| shipping_address.city | string |  | `"Wrightington"` |
| shipping_address.county | string |  | `""` |
| shipping_address.country_code | string |  | `"GB"` |
| shipping_address.phone | string |  | `""` |
| shipping_address.company_name | string |  | `""` |
| shipping_address.attention | string |  | `"Rebecca Kane"` |
| shipping_address.state | string |  | `""` |
| shipping_address.street2 | string |  | `"Ainscough Trading Estate"` |
| shipping_address.fax | string |  | `""` |
| shipping_address.state_code | string |  | `""` |
| _sync_timestamp | string |  | `"2025-06-16T00:58:11.787147"` |
| can_manually_fulfill | boolean |  | `false` |
| created_by_email | string |  | `"matt@dmbrands.co.uk"` |
| bcy_discount_total | number |  | `428` |
| shipping_charge_tax_formatted | string |  | `""` |
| orientation | string |  | `"portrait"` |
| shipping_charge_tax_type | string |  | `""` |
| discount_applied_on_amount | number |  | `428` |
| is_scheduled_for_quick_shipment_create | boolean |  | `false` |
| paid_status | string |  | `"paid"` |
| is_manually_fulfilled | boolean |  | `false` |
| account_identifier | string |  | `""` |
| warehouses | array | Length: 3<br>Types: object (100.0%)<br>Object keys: 12 | `"{Object with 12 keys}"` |
| submitted_by | string |  | `""` |
| submitter_id | string |  | `""` |
| reverse_charge_tax_total | number |  | `0` |
| bcy_sub_total | number |  | `428` |
| is_emailed | boolean |  | `true` |
| offline_created_date_with_time | string |  | `""` |
| has_shipping_address | boolean |  | `true` |
| salesperson_name | string |  | `"matt"` |
| salesperson_id | string |  | `"310656000000059361"` |
| shipping_charge | number |  | `0` |
| bcy_adjustment | number |  | `0` |
| computation_type | string |  | `"basic"` |
| sub_total | number |  | `428` |
| created_date | string |  | `"2022-09-29"` |
| currency_id | string |  | `"310656000000000065"` |
| marketplace_source | null |  | - |
| is_marketplace_order | boolean |  | `false` |
| salesperson_uid | null |  | - |
| _uid_mapped_at | timestamp |  | `"2025-06-16T19:53:28.932Z"` |
| _syncSource | string |  | `"python_inventory_sync"` |
| quantity_shipped | number |  | `5` |
| quantity | number |  | `5` |
| due_in_days | string |  | `""` |
| shipment_days | string |  | `""` |
| due_by_days | string |  | `"989"` |
| has_attachment | boolean |  | `false` |
| total_invoiced_amount | number |  | `0` |
| tags | array | Length: 0 | - |
| delivery_date | string |  | `"2022-10-05"` |
| is_drop_shipment | boolean |  | `false` |
| quantity_invoiced | number |  | `5` |
| company_name | string |  | `"Silver Mushroom Ltd"` |
| order_fulfillment_type | string |  | `""` |
| quantity_packed | number |  | `5` |
| is_backorder | boolean |  | `false` |
| email | string |  | `"rebecca@silvermushroom.com"` |
| _lastSynced | timestamp |  | `"2025-06-17T10:40:12.980Z"` |

### sales_orders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| id | string |  | `"SO_1751750863761_z4kbro1fp"` |
| sales_order_id | string |  | `"SO_1751750863761_z4kbro1fp"` |
| sales_order_number | string |  | `"SO-00001"` |
| customer_id | string |  | `"310656000000059331"` |
| customer_name | string |  | `"Silver Mushroom Ltd"` |
| order_date | timestamp |  | `"2022-09-29T00:00:00.000Z"` |
| delivery_date | timestamp |  | `"2022-10-05T00:00:00.000Z"` |
| status | string |  | `"open"` |
| payment_terms | number |  | `30` |
| currency_code | string |  | `"GBP"` |
| subtotal | number |  | `428` |
| tax_total | number |  | `0` |
| shipping_charge | number |  | `0` |
| discount_total | number |  | `100` |
| total | number |  | `0` |
| notes | string |  | `""` |
| internal_notes | string |  | `""` |
| shipping_address.zip | string |  | `"WN6 9RS"` |
| shipping_address.country | string |  | `"United Kingdom"` |
| shipping_address.address | string |  | `"Ground Floor Units A1 & 2,"` |
| shipping_address.city | string |  | `"Wrightington"` |
| shipping_address.county | string |  | `""` |
| shipping_address.country_code | string |  | `"GB"` |
| shipping_address.phone | string |  | `""` |
| shipping_address.company_name | string |  | `""` |
| shipping_address.attention | string |  | `"Rebecca Kane"` |
| shipping_address.state | string |  | `""` |
| shipping_address.street2 | string |  | `"Ainscough Trading Estate"` |
| shipping_address.fax | string |  | `""` |
| shipping_address.state_code | string |  | `""` |
| billing_address.zip | string |  | `"WN6 9RS"` |
| billing_address.country | string |  | `"United Kingdom"` |
| billing_address.country_code | string |  | `"GB"` |
| billing_address.address | string |  | `"Ground Floor Units A1 & 2,"` |
| billing_address.city | string |  | `"Wrightington"` |
| billing_address.phone | string |  | `""` |
| billing_address.county | string |  | `""` |
| billing_address.attention | string |  | `"Rebecca Kane"` |
| billing_address.state | string |  | `""` |
| billing_address.street2 | string |  | `"Ainscough Trading Estate"` |
| billing_address.fax | string |  | `""` |
| billing_address.state_code | string |  | `""` |
| salesperson_id | string |  | `"310656000000059361"` |
| salesperson_name | string |  | `"matt"` |
| created_by | string |  | `"migration_script"` |
| created_at | timestamp |  | `"2025-07-05T21:27:43.761Z"` |
| updated_at | timestamp |  | `"2025-07-05T21:27:43.761Z"` |
| _migrated_from_zoho | boolean |  | `true` |
| _original_zoho_id | string |  | `"310656000000059383"` |
| _original_firebase_id | string |  | `"310656000000059383"` |

### sales_transactions

**Document Count:** 26539

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| transaction_id | string |  | `"310656000000059391"` |
| _syncSource | string |  | `"python_inventory_sync"` |
| quantity | number |  | `1` |
| item_id | string |  | `"310656000000057137"` |
| order_number | string |  | `"SO-00001"` |
| created_at | string |  | `"2022-09-29"` |
| is_marketplace_order | boolean |  | `false` |
| item_name | string |  | `"Luxury throw Off white"` |
| manufacturer | string |  | `"Elvang"` |
| _lastSynced | timestamp |  | `"2025-06-17T02:00:25.612Z"` |
| salesperson_name | string |  | `"matt"` |
| order_date | string |  | `"2022-09-29"` |
| salesperson_id | string |  | `"310656000000059361"` |
| total | number |  | `96` |
| marketplace_source | null |  | - |
| price | number |  | `96` |
| brand_normalized | string |  | `"elvang"` |
| customer_name | string |  | `"Silver Mushroom Ltd"` |
| customer_id | string |  | `"310656000000059331"` |
| sku | string |  | `"6004"` |
| brand | string |  | `"Elvang"` |
| order_id | string |  | `"310656000000059383"` |
| last_modified | timestamp |  | `"2025-06-17T02:00:25.612Z"` |

### invoices

**Document Count:** 1135

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| salesperson_name | string |  | `""` |
| currency_code | string |  | `"GBP"` |
| total | number |  | `19.99` |
| shipping_charge | number |  | `0` |
| invoice_date | timestamp |  | `"2025-07-05T00:00:00.000Z"` |
| payment_status | string |  | `"unpaid"` |
| _original_zoho_id | string |  | `"310656000052192965"` |
| balance | number |  | `0` |
| invoice_id | string |  | `"INV_1751752061451_4adc33e6"` |
| salesperson_id | string |  | `""` |
| created_by | string |  | `"zoho_import_script"` |
| tax_total | number |  | `3.33` |
| subtotal | number |  | `16.66` |
| customer_name | string |  | `"Amazon UK - Customer"` |
| _migrated_from_zoho | boolean |  | `true` |
| sales_order_id | string |  | `"310656000052192914"` |
| notes | string |  | `"Bank Details:\nAccount name: DM BRANDS LIMITED\nSort..."` |
| billing_address.address | string |  | `""` |
| billing_address.attention | string |  | `""` |
| billing_address.street2 | string |  | `""` |
| billing_address.state | string |  | `""` |
| billing_address.fax | string |  | `""` |
| billing_address.country | string |  | `"United Kingdom"` |
| billing_address.street | string |  | `""` |
| billing_address.city | string |  | `""` |
| billing_address.phone | string |  | `""` |
| billing_address.country_code | string |  | `"GB"` |
| billing_address.zip | string |  | `""` |
| invoice_number | string |  | `"INV-003970"` |
| discount_total | number |  | `0` |
| payment_terms | string |  | `"Due On Receipt"` |
| id | string |  | `"INV_1751752061451_4adc33e6"` |
| shipping_address.address | string |  | `""` |
| shipping_address.attention | string |  | `""` |
| shipping_address.street2 | string |  | `""` |
| shipping_address.state | string |  | `""` |
| shipping_address.fax | string |  | `""` |
| shipping_address.country | string |  | `"United Kingdom"` |
| shipping_address.street | string |  | `""` |
| shipping_address.city | string |  | `""` |
| shipping_address.phone | string |  | `""` |
| shipping_address.country_code | string |  | `"GB"` |
| shipping_address.zip | string |  | `""` |
| due_date | timestamp |  | `"2025-07-05T00:00:00.000Z"` |
| status | string |  | `"paid"` |
| customer_id | string |  | `"310656000002341121"` |
| _synced_at | timestamp |  | `"2025-07-05T21:47:41.704Z"` |
| updated_at | timestamp |  | `"2025-07-05T21:47:41.704Z"` |
| created_at | timestamp |  | `"2025-07-05T21:47:41.704Z"` |

### invoices_enhanced

**Status:** Collection does not exist or is empty

### purchase_orders

**Document Count:** 133

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| id | string |  | `"PO-1751751027604-bco1ceopd"` |
| purchase_order_id | string |  | `"PO-1751751027604-bco1ceopd"` |
| vendor_name | string |  | `"Unknown Vendor"` |
| order_date | timestamp |  | `"2025-07-05T21:30:27.604Z"` |
| expected_delivery_date | null |  | - |
| status | string |  | `"issued"` |
| currency_code | string |  | `"GBP"` |
| subtotal | number |  | `0` |
| tax_total | number |  | `0` |
| total | number |  | `0` |
| notes | string |  | `""` |
| created_by | string |  | `"migration_script"` |
| created_at | timestamp |  | `"2025-07-05T21:30:27.604Z"` |
| updated_at | timestamp |  | `"2025-07-05T21:30:27.604Z"` |
| _migrated_from_zoho | boolean |  | `true` |
| _original_zoho_id | string |  | `"2e3OJ1Sjp2FNyMdSzku6"` |
| _original_firebase_id | string |  | `"2e3OJ1Sjp2FNyMdSzku6"` |

### warehouses

**Document Count:** 3

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| warehouse_type | string |  | `"primary"` |
| is_active | boolean |  | `true` |
| address.country | string |  | `"United Kingdom"` |
| address.street_1 | string |  | `"123 Main Street"` |
| address.city | string |  | `"London"` |
| address.street_2 | string |  | `""` |
| address.postcode | string |  | `"SW1A 1AA"` |
| address.state | string |  | `"England"` |
| contact_phone | string |  | `""` |
| is_primary | boolean |  | `true` |
| contact_person | string |  | `""` |
| description | string |  | `"Primary warehouse location"` |
| created_by | string |  | `"migration_script"` |
| contact_email | string |  | `""` |
| _migration_date | timestamp |  | `"2025-07-05T17:40:15.790Z"` |
| warehouse_name | string |  | `"Main Warehouse"` |
| phone | string |  | `""` |
| _migrated_from | string |  | `"default_warehouse"` |
| updated_by | string |  | `"migration_script"` |
| created_date | timestamp |  | `"2025-07-05T17:40:15.790Z"` |
| last_modified | timestamp |  | `"2025-07-05T17:40:15.790Z"` |
| email | string |  | `""` |
| warehouse_id | string |  | `"WH_1751737215790_jgkzle0kh"` |

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
| is_active | boolean |  | `true` |
| address.country | string |  | `"United Kingdom"` |
| address.street_1 | string |  | `"123 Main Street"` |
| address.city | string |  | `"London"` |
| address.street_2 | string |  | `""` |
| address.postcode | string |  | `"SW1A 1AA"` |
| address.state | string |  | `"England"` |
| contact_phone | string |  | `""` |
| is_primary | boolean |  | `true` |
| contact_person | string |  | `""` |
| description | string |  | `"Primary business location"` |
| created_by | string |  | `"migration_script"` |
| contact_email | string |  | `""` |
| _migration_date | timestamp |  | `"2025-07-05T18:25:23.216Z"` |
| branch_code | string |  | `"MAIN"` |
| branch_id | string |  | `"BR_1751739923216_19udpex33"` |
| branch_type | string |  | `"headquarters"` |
| phone | string |  | `""` |
| _migrated_from | string |  | `"default_branch"` |
| branch_name | string |  | `"Main Branch"` |
| updated_by | string |  | `"migration_script"` |
| created_date | timestamp |  | `"2025-07-05T18:25:23.216Z"` |
| fax | string |  | `""` |
| last_modified | timestamp |  | `"2025-07-05T18:25:23.216Z"` |
| email | string |  | `""` |

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
| last_rebuild | string |  | `"2025-06-16T00:57:07.358428+00:00"` |
| status | string |  | `"completed"` |
| stats.errors | array | Length: 0 | - |
| stats.invoicesProcessed | number |  | `3664` |
| stats.customersCreated | number |  | `544` |
| stats.ordersProcessed | number |  | `502` |
| customer_count | number |  | `544` |
| errors | array | Length: 0 | - |

### sync_queue

**Document Count:** 18366

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| collection | string |  | `"customers"` |
| changeType | string |  | `"modified"` |
| documentId | string |  | `"806490000000593010"` |
| data.Primary_Email | string |  | `"patsy@patsybluntinteriors.com"` |
| data.Billing_Street | string |  | `"7 Station Approach"` |
| data.Phone | string |  | `""` |
| data.Primary_Last_Name | string |  | `"Blunt"` |
| data.Billing_Country | string |  | `"United Kingdom"` |
| data.Billing_Code | string |  | `"GU25 4DL"` |
| data.Primary_First_Name | string |  | `"Patsy"` |
| data.Billing_City | string |  | `"Virginia Water"` |
| data.Agent.name | string |  | `"Gay Croker"` |
| data.Agent.id | string |  | `"806490000000515916"` |
| data.Billing_State | string |  | `"Surrey"` |
| data.id | string |  | `"806490000000593010"` |
| data.Account_Name | string |  | `"Patsy Blunt Interiors Ltd"` |
| data.createdTime | timestamp |  | `"2025-06-08T14:52:03.355Z"` |
| data.source | string |  | `"ZohoCRM"` |
| processed | boolean |  | `false` |
| timestamp | timestamp |  | `"2025-06-08T14:52:05.660Z"` |

### migration_logs

**Document Count:** 6

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|
| migration_date | timestamp |  | `"2025-07-05T03:43:57.350Z"` |
| migration_version | string |  | `"1.0.0"` |
| dry_run | boolean |  | `true` |
| results.vendors.created | number |  | `0` |
| results.vendors.errors | number |  | `0` |
| results.items.migrated | number |  | `0` |
| results.items.skipped | number |  | `0` |
| results.items.errors | number |  | `0` |
| results.customers.migrated | number |  | `0` |
| results.customers.skipped | number |  | `0` |
| results.customers.errors | number |  | `0` |
| results.categories.created | number |  | `0` |
| results.categories.errors | number |  | `0` |
| results.warehouse.created | number |  | `0` |
| results.warehouse.errors | number |  | `0` |
| collections_created | array | Length: 14<br>Types: string (100.0%) | `"items"` |
| config.dryRun | boolean |  | `true` |
| config.batchSize | number |  | `100` |
| config.createMissingCollections | boolean |  | `true` |
| config.preserveExistingData | boolean |  | `true` |
| config.logLevel | string |  | `"info"` |

### data_adapters

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Details | Example |
|------------|------|---------|----------|

