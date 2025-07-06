# Firebase Collection Structure

Generated on: 2025-07-05T21:44:15.601Z

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

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| uid | string | `"E4yjW9IcjpMldf7qZI31bGFB9Hz2"` |
| email | string | `"alastair@dmbrands.co.uk"` |
| name | string | `"Alutions"` |
| role | string | `"customer"` |
| companyName | string | `"Alutions"` |
| isOnline | boolean | `true` |
| lastSeen | string | `"2025-07-01T01:01:04.754Z"` |
| createdAt | string | `"2025-07-01T01:01:04.754Z"` |

### brand_managers

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| bm_id | string | `""` |

### sales_agents

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| sa_id | string | `""` |

### customers

**Document Count:** 4444

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| customer_payment_terms | string | `"30 days"` |
| customer_type | string | `"business"` |
| customer_billing_address.country | string | `"United Kingdom"` |
| customer_billing_address.street_1 | string | `""` |
| customer_billing_address.city | string | `""` |
| customer_billing_address.street_2 | string | `""` |
| customer_billing_address.postcode | string | `""` |
| customer_billing_address.state | string | `""` |
| customer_discount_rate | number | `0` |
| customer_registration_number | string | `""` |
| customer_phone | string | `""` |
| _original_id | string | `"310656000000071001"` |
| created_by | string | `"migration_script"` |
| customer_vat_number | string | `""` |
| _migration_date | timestamp | `"2025-07-05T17:39:53.917Z"` |
| customer_credit_limit | number | `0` |
| customer_shipping_address.country | string | `"United Kingdom"` |
| customer_shipping_address.street_1 | string | `""` |
| customer_shipping_address.city | string | `""` |
| customer_shipping_address.street_2 | string | `""` |
| customer_shipping_address.postcode | string | `""` |
| customer_shipping_address.state | string | `""` |
| _migrated_from | string | `"customer_data"` |
| customer_email | string | `""` |
| customer_status | string | `"active"` |
| updated_by | string | `"migration_script"` |
| created_date | timestamp | `"2025-07-05T17:39:53.917Z"` |
| customer_name | string | `"Unknown Customer"` |
| customer_id | string | `"CUST_1751737193917_09wtkywhc"` |
| customer_company_name | string | `""` |
| last_modified | timestamp | `"2025-07-05T17:39:53.917Z"` |

### customer_data

**Document Count:** 1481

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| customer_name | string | `"Alastair Blair"` |
| email | string | `"blair@hotmail.co.uk"` |
| Primary_Email | string | `"blair@hotmail.co.uk"` |
| phone | string | `"+447718182168"` |
| company_name | string | `"Alutions"` |
| billing_address.address | string | `"25 Middle Street"` |
| billing_address.address1 | string | `"25 Middle Street"` |
| billing_address.street2 | string | `""` |
| billing_address.city | string | `"Worcester"` |
| billing_address.county | string | `"WORCESTERSHIRE"` |
| billing_address.state | string | `"WORCESTERSHIRE"` |
| billing_address.postcode | string | `"WR1 1NQ"` |
| billing_address.zip | string | `"WR1 1NQ"` |
| billing_address.country | string | `"GB"` |
| shipping_address.address | string | `"25 Middle Street"` |
| shipping_address.address1 | string | `"25 Middle Street"` |
| shipping_address.street2 | string | `""` |
| shipping_address.city | string | `"Worcester"` |
| shipping_address.county | string | `"WORCESTERSHIRE"` |
| shipping_address.state | string | `"WORCESTERSHIRE"` |
| shipping_address.postcode | string | `"WR1 1NQ"` |
| shipping_address.zip | string | `"WR1 1NQ"` |
| shipping_address.country | string | `"GB"` |
| industry | string | `"retail"` |
| notes | string | `""` |
| created_at | string | `"2025-06-26T14:24:13.466Z"` |
| updatedAt | string | `"2025-06-26T14:24:13.466Z"` |
| created_by | string | `"AXhQKHGiUOXPgeBIwUaYCyfZrV63"` |
| status | string | `"active"` |

### items

**Document Count:** 6552

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| item_type | string | `"inventory"` |
| cf_committed_stock | string | `"0.00"` |
| is_linked_with_zohocrm | boolean | `true` |
| has_attachment | boolean | `true` |
| source | string | `"csv"` |
| purchase_description | string | `"Elvang Teddy bear Beige"` |
| image_name | string | `"1060.jpg"` |
| _synced_at | timestamp | `"2025-06-16T00:01:39.918Z"` |
| track_inventory | boolean | `true` |
| _sync_batch | number | `6` |
| is_returnable | boolean | `false` |
| sku | string | `"1060"` |
| brand | string | `"Elvang"` |
| height | string | `""` |
| image_type | string | `"jpg"` |
| tax_exemption_code | string | `""` |
| created_time | string | `"2022-09-29T12:27:57+0100"` |
| image_document_id | string | `"310656000003778337"` |
| upc | string | `""` |
| weight | string | `""` |
| tax_id | string | `"310656000000059451"` |
| tags | array | - |
| cf_actual_available_in_stock | string | `"0"` |
| unit | string | `"pcs"` |
| purchase_account_id | string | `"310656000000000509"` |
| weight_unit | string | `"kg"` |
| name | string | `"Elvang Teddy bear Beige"` |
| part_number | string | `""` |
| _source | string | `"zoho_inventory"` |
| can_be_purchased | boolean | `true` |
| is_storage_location_enabled | boolean | `false` |
| status | string | `"active"` |
| is_combo_product | boolean | `false` |
| isbn | string | `""` |
| can_be_sold | boolean | `true` |
| cf_actual_available_in_stock_unformatted | string | `"0"` |
| purchase_rate | number | `18.2` |
| description | string | `"Elvang Teddy bear Beige"` |
| zcrm_product_id | string | `"806490000000561001"` |
| ean | string | `"5701311910600"` |
| rate | number | `29.36` |
| account_name | string | `"Sales"` |
| show_in_storefront | boolean | `false` |
| _sync_timestamp | string | `"2025-06-16T01:01:39.523258"` |
| dimension_unit | string | `"cm"` |
| last_modified_time | string | `"2025-06-08T21:18:35+0100"` |
| item_id | string | `"310656000000051244"` |
| tax_name | string | `"Standard Rate"` |
| length | string | `""` |
| item_name | string | `"Elvang Teddy bear Beige"` |
| cf_committed_stock_unformatted | string | `"0.00"` |
| tax_exemption_id | string | `""` |
| account_id | string | `"310656000000000376"` |
| purchase_account_name | string | `"Cost of Goods Sold"` |
| tax_percentage | number | `20` |
| width | string | `""` |
| is_taxable | boolean | `true` |
| _syncSource | string | `"python_inventory_sync"` |
| Manufacturer | string | `"Elvang"` |
| actual_available_stock | number | `4` |
| available_stock | number | `4` |
| stock_on_hand | number | `4` |
| _lastSynced | timestamp | `"2025-06-17T10:37:20.131Z"` |
| category_name | string | `"Uncategorized"` |
| variable_pricing | boolean | `false` |
| stock_available | number | `0` |
| retail_price | number | `29.36` |
| _migrated_from | string | `"zoho_inventory"` |
| stock_committed | number | `4` |
| reorder_level | number | `10` |
| minimum_order_qty | number | `1` |
| item_imgs | array | - |
| stock_total | number | `4` |
| vendor_name | string | `"Elvang"` |
| _original_id | string | `"310656000000051244"` |
| created_by | string | `"migration_script"` |
| part_no | string | `"1060"` |
| product_type | string | `"Goods"` |
| purchase_price | number | `18.2` |
| updated_by | string | `"migration_script"` |
| created_date | string | `"2022-09-29T12:27:57+0100"` |
| estimated_delivery | number | `7` |
| item_description | string | `"Elvang Teddy bear Beige"` |
| reorder_quantity | number | `1` |
| tax.tax_exempt | boolean | `false` |
| tax.tax_rate | number | `20` |
| tax.tax_code | string | `"VAT20"` |
| tax.tax_name | string | `"Standard Rate"` |
| manufacturer.manufacturer_contact | string | `""` |
| manufacturer.manufacturer_part_number | string | `"1060"` |
| manufacturer.manufacturer_name | string | `"Elvang"` |
| manufacturer.manufacturer_website | string | `""` |
| shipping.is_fragile | boolean | `false` |
| shipping.weight_unit | string | `"kg"` |
| shipping.shipping_class | string | `"standard"` |
| shipping.weight | number | `0` |
| shipping.is_hazardous | boolean | `false` |
| shipping.requires_special_handling | boolean | `false` |
| inventory_valuation.total_value | number | `0` |
| inventory_valuation.method | string | `"FIFO"` |
| inventory_valuation.average_cost | number | `0` |
| inventory_valuation.last_cost | number | `18.2` |
| wholesale_price | number | `0` |
| bulk_pricing | array | - |
| package_info.package_width | number | `null` |
| package_info.package_height | number | `null` |
| package_info.package_weight_unit | string | `"kg"` |
| package_info.package_length | number | `null` |
| package_info.package_weight | number | `null` |
| package_info.package_unit | string | `"cm"` |
| cost_price | number | `18.2` |
| dimensions.volume | number | `null` |
| dimensions.diameter | number | `null` |
| dimensions.weight_unit | string | `"kg"` |
| dimensions.length | number | `null` |
| dimensions.width | number | `null` |
| dimensions.weight | number | `null` |
| dimensions.dimension_unit | string | `"cm"` |
| dimensions.height | number | `null` |
| _migration_date | timestamp | `"2025-07-05T18:22:47.610Z"` |
| category_id | string | `"CAT_1751739767610_7v4t232ut"` |
| last_modified | timestamp | `"2025-07-05T18:22:47.610Z"` |

### items_enhanced

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### products

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### vendors

**Document Count:** 11

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| id | string | `"VEND_1751750766027_4061uax72"` |
| vendor_id | string | `"VEND_1751750766027_4061uax72"` |
| vendor_name | string | `"Remember"` |
| brand | string | `"Remember"` |
| brand_name | string | `"Remember"` |
| brand_normalized | string | `"remember"` |
| vendor_status | string | `"active"` |
| vendor_location | string | `"Unknown"` |
| vendor_address.street_1 | string | `""` |
| vendor_address.city | string | `""` |
| vendor_address.postcode | string | `""` |
| vendor_address.country | string | `"GB"` |
| vendor_contacts | array | - |
| vendor_bank_name | string | `""` |
| vendor_bank_sortcode | string | `""` |
| vendor_bank_acc | string | `""` |
| vendor_bank_vat | string | `""` |
| vendor_bank_verified | boolean | `false` |
| created_date | timestamp | `"2025-07-05T21:26:06.028Z"` |
| created_by | string | `"migration_script"` |
| updated_by | string | `"migration_script"` |
| last_modified | timestamp | `"2025-07-05T21:26:06.028Z"` |
| _migrated_from_zoho | boolean | `true` |
| _original_zoho_id | string | `"310656000000194675"` |

### item_categories

**Document Count:** 1596

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| id | string | `"CAT_1751750771545_0enjdwsor"` |
| category_id | string | `"CAT_1751750771545_0enjdwsor"` |
| category_name | array | - |
| description | string | `""` |
| is_active | boolean | `true` |
| created_date | timestamp | `"2025-07-05T21:26:11.545Z"` |
| created_by | string | `"migration_script"` |
| _migrated_from_zoho | boolean | `true` |

### salesorders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| can_send_in_mail | boolean | `false` |
| zcrm_potential_id | string | `""` |
| discount | string | `"100.00%"` |
| taxes | array | - |
| shipment_date | string | `"2022-10-02"` |
| billing_address.zip | string | `"WN6 9RS"` |
| billing_address.country | string | `"United Kingdom"` |
| billing_address.country_code | string | `"GB"` |
| billing_address.address | string | `"Ground Floor Units A1 & 2,"` |
| billing_address.city | string | `"Wrightington"` |
| billing_address.phone | string | `""` |
| billing_address.county | string | `""` |
| billing_address.attention | string | `"Rebecca Kane"` |
| billing_address.state | string | `""` |
| billing_address.street2 | string | `"Ainscough Trading Estate"` |
| billing_address.fax | string | `""` |
| billing_address.state_code | string | `""` |
| line_items | array | - |
| can_show_kit_return | boolean | `false` |
| is_test_order | boolean | `false` |
| location_id | string | `"310656000000999035"` |
| submitted_by_email | string | `""` |
| order_status | string | `"closed"` |
| balance | number | `0` |
| invoices | array | - |
| bcy_shipping_charge_tax | string | `""` |
| terms | string | `""` |
| total_quantity | number | `5` |
| picklists | array | - |
| mail_first_viewed_time | string | `""` |
| has_qty_cancelled | boolean | `false` |
| sub_total_inclusive_of_tax | number | `0` |
| exchange_rate | number | `1` |
| mail_last_viewed_time | string | `""` |
| approver_id | string | `""` |
| estimate_id | string | `""` |
| contact_person_details | array | - |
| merchant_name | string | `""` |
| sales_channel | string | `"direct_sales"` |
| packages | array | - |
| reference_number | string | `"Sample Order"` |
| shipping_charge_tax_id | string | `""` |
| sub_total_exclusive_of_discount | number | `428` |
| purchaseorders | array | - |
| location_name | string | `"DMB"` |
| vat_treatment | string | `""` |
| is_dropshipped | boolean | `false` |
| has_discount | boolean | `true` |
| _source | string | `"zoho_inventory"` |
| discount_percent | number | `100` |
| page_height | string | `"11.69in"` |
| shipping_charge_tax_name | string | `""` |
| status | string | `"fulfilled"` |
| discount_total | number | `428` |
| integration_id | string | `""` |
| tax_total | number | `0` |
| invoiced_status | string | `"invoiced"` |
| shipped_status | string | `"fulfilled"` |
| payments | array | - |
| salesorder_id | string | `"310656000000059383"` |
| shipping_charge_taxes | array | - |
| currency_code | string | `"GBP"` |
| page_width | string | `"8.27in"` |
| refunds | array | - |
| sub_statuses | array | - |
| bcy_total | number | `0` |
| is_adv_tracking_in_package | boolean | `false` |
| delivery_method_id | string | `"310656000000059381"` |
| delivery_method | string | `"Courier"` |
| tracking_url | string | `""` |
| tax_rounding | string | `"entity_level"` |
| adjustment_description | string | `"Adjustment"` |
| last_modified_time | string | `"2025-02-18T11:49:21+0000"` |
| currency_symbol | string | `"£"` |
| is_kit_partial_return | boolean | `false` |
| discount_type | string | `"entity_level"` |
| transaction_rounding_type | string | `"no_rounding"` |
| roundoff_value | number | `0` |
| template_name | string | `"Standard Template"` |
| sales_channel_formatted | string | `"Direct Sales"` |
| has_unconfirmed_line_item | boolean | `false` |
| salesorder_number | string | `"SO-00001"` |
| template_id | string | `"310656000000000111"` |
| customer_name | string | `"Silver Mushroom Ltd"` |
| customer_id | string | `"310656000000059331"` |
| is_taxable | boolean | `false` |
| payment_terms_label | string | `"Net 30"` |
| date | string | `"2022-09-29"` |
| submitted_date | string | `""` |
| notes | string | `""` |
| documents | array | - |
| discount_amount | number | `428` |
| pickup_location_id | string | `""` |
| source | string | `"Client"` |
| created_by_name | string | `"Matt Langford"` |
| entity_tags | string | `""` |
| _synced_at | timestamp | `"2025-06-15T23:58:12.589Z"` |
| shipping_charge_inclusive_of_tax | number | `0` |
| last_modified_by_id | string | `""` |
| contact.is_credit_limit_migration_completed | boolean | `true` |
| contact.unused_customer_credits | number | `0` |
| contact.credit_limit | number | `0` |
| contact.customer_balance | number | `0` |
| contact_category | string | `""` |
| template_type | string | `"standard"` |
| _sync_batch | number | `8` |
| shipping_charge_tax_exemption_code | string | `""` |
| color_code | string | `""` |
| contact_persons | array | - |
| billing_address_id | string | `""` |
| shipping_charge_tax | string | `""` |
| bcy_tax_total | number | `0` |
| created_time | string | `"2022-09-29T12:54:27+0100"` |
| shipping_address_id | string | `"310656000000059336"` |
| is_inclusive_tax | boolean | `false` |
| custom_fields | array | - |
| salesreturns | array | - |
| shipping_charge_tax_exemption_id | string | `""` |
| price_precision | number | `2` |
| submitted_by_photo_url | string | `""` |
| approvers_list | array | - |
| tax_treatment | string | `""` |
| so_cycle_preference.socycle_status | string | `"not_triggered"` |
| so_cycle_preference.can_create_invoice | boolean | `false` |
| so_cycle_preference.is_feature_enabled | boolean | `false` |
| so_cycle_preference.invoice_preference.mark_as_sent | boolean | `false` |
| so_cycle_preference.invoice_preference.payment_account_id | string | `"310656000000000349"` |
| so_cycle_preference.invoice_preference.record_payment | boolean | `false` |
| so_cycle_preference.invoice_preference.payment_mode_id | string | `"310656000000000199"` |
| so_cycle_preference.can_create_package | boolean | `false` |
| so_cycle_preference.shipment_preference.default_carrier | string | `""` |
| so_cycle_preference.shipment_preference.deliver_shipments | boolean | `false` |
| so_cycle_preference.shipment_preference.send_notification | boolean | `false` |
| so_cycle_preference.can_create_shipment | boolean | `false` |
| shipping_charge_tax_percentage | string | `""` |
| tds_calculation_type | string | `"tds_item_level"` |
| adjustment | number | `0` |
| zcrm_potential_name | string | `""` |
| created_by_id | string | `"310656000000039001"` |
| submitted_by_name | string | `""` |
| current_sub_status | string | `"closed"` |
| is_discount_before_tax | boolean | `true` |
| attachment_name | string | `""` |
| rounding_mode | string | `"round_half_up"` |
| shipping_charge_inclusive_of_tax_formatted | string | `"£0.00"` |
| merchant_id | string | `""` |
| payment_terms | number | `30` |
| is_backordered | boolean | `false` |
| shipping_charge_exclusive_of_tax | number | `0` |
| total | number | `0` |
| contact_persons_associated | array | - |
| shipping_charge_exclusive_of_tax_formatted | string | `"£0.00"` |
| branch_id | string | `"310656000000999035"` |
| creditnotes | array | - |
| current_sub_status_id | string | `""` |
| branch_name | string | `"DMB"` |
| is_viewed_in_mail | boolean | `false` |
| bcy_rounding_mode | string | `"round_half_up"` |
| bcy_shipping_charge | number | `0` |
| shipping_address.zip | string | `"WN6 9RS"` |
| shipping_address.country | string | `"United Kingdom"` |
| shipping_address.address | string | `"Ground Floor Units A1 & 2,"` |
| shipping_address.city | string | `"Wrightington"` |
| shipping_address.county | string | `""` |
| shipping_address.country_code | string | `"GB"` |
| shipping_address.phone | string | `""` |
| shipping_address.company_name | string | `""` |
| shipping_address.attention | string | `"Rebecca Kane"` |
| shipping_address.state | string | `""` |
| shipping_address.street2 | string | `"Ainscough Trading Estate"` |
| shipping_address.fax | string | `""` |
| shipping_address.state_code | string | `""` |
| _sync_timestamp | string | `"2025-06-16T00:58:11.787147"` |
| can_manually_fulfill | boolean | `false` |
| created_by_email | string | `"matt@dmbrands.co.uk"` |
| bcy_discount_total | number | `428` |
| shipping_charge_tax_formatted | string | `""` |
| orientation | string | `"portrait"` |
| shipping_charge_tax_type | string | `""` |
| discount_applied_on_amount | number | `428` |
| is_scheduled_for_quick_shipment_create | boolean | `false` |
| paid_status | string | `"paid"` |
| is_manually_fulfilled | boolean | `false` |
| account_identifier | string | `""` |
| warehouses | array | - |
| submitted_by | string | `""` |
| submitter_id | string | `""` |
| reverse_charge_tax_total | number | `0` |
| bcy_sub_total | number | `428` |
| is_emailed | boolean | `true` |
| offline_created_date_with_time | string | `""` |
| has_shipping_address | boolean | `true` |
| salesperson_name | string | `"matt"` |
| salesperson_id | string | `"310656000000059361"` |
| shipping_charge | number | `0` |
| bcy_adjustment | number | `0` |
| computation_type | string | `"basic"` |
| sub_total | number | `428` |
| created_date | string | `"2022-09-29"` |
| currency_id | string | `"310656000000000065"` |
| marketplace_source | null | - |
| is_marketplace_order | boolean | `false` |
| salesperson_uid | null | - |
| _uid_mapped_at | timestamp | `"2025-06-16T19:53:28.932Z"` |
| _syncSource | string | `"python_inventory_sync"` |
| quantity_shipped | number | `5` |
| quantity | number | `5` |
| due_in_days | string | `""` |
| shipment_days | string | `""` |
| due_by_days | string | `"989"` |
| has_attachment | boolean | `false` |
| total_invoiced_amount | number | `0` |
| tags | array | - |
| delivery_date | string | `"2022-10-05"` |
| is_drop_shipment | boolean | `false` |
| quantity_invoiced | number | `5` |
| company_name | string | `"Silver Mushroom Ltd"` |
| order_fulfillment_type | string | `""` |
| quantity_packed | number | `5` |
| is_backorder | boolean | `false` |
| email | string | `"rebecca@silvermushroom.com"` |
| _lastSynced | timestamp | `"2025-06-17T10:40:12.980Z"` |

### sales_orders

**Document Count:** 3095

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| id | string | `"SO_1751750863761_z4kbro1fp"` |
| sales_order_id | string | `"SO_1751750863761_z4kbro1fp"` |
| sales_order_number | string | `"SO-00001"` |
| customer_id | string | `"310656000000059331"` |
| customer_name | string | `"Silver Mushroom Ltd"` |
| order_date | timestamp | `"2022-09-29T00:00:00.000Z"` |
| delivery_date | timestamp | `"2022-10-05T00:00:00.000Z"` |
| status | string | `"open"` |
| payment_terms | number | `30` |
| currency_code | string | `"GBP"` |
| subtotal | number | `428` |
| tax_total | number | `0` |
| shipping_charge | number | `0` |
| discount_total | number | `100` |
| total | number | `0` |
| notes | string | `""` |
| internal_notes | string | `""` |
| shipping_address.zip | string | `"WN6 9RS"` |
| shipping_address.country | string | `"United Kingdom"` |
| shipping_address.address | string | `"Ground Floor Units A1 & 2,"` |
| shipping_address.city | string | `"Wrightington"` |
| shipping_address.county | string | `""` |
| shipping_address.country_code | string | `"GB"` |
| shipping_address.phone | string | `""` |
| shipping_address.company_name | string | `""` |
| shipping_address.attention | string | `"Rebecca Kane"` |
| shipping_address.state | string | `""` |
| shipping_address.street2 | string | `"Ainscough Trading Estate"` |
| shipping_address.fax | string | `""` |
| shipping_address.state_code | string | `""` |
| billing_address.zip | string | `"WN6 9RS"` |
| billing_address.country | string | `"United Kingdom"` |
| billing_address.country_code | string | `"GB"` |
| billing_address.address | string | `"Ground Floor Units A1 & 2,"` |
| billing_address.city | string | `"Wrightington"` |
| billing_address.phone | string | `""` |
| billing_address.county | string | `""` |
| billing_address.attention | string | `"Rebecca Kane"` |
| billing_address.state | string | `""` |
| billing_address.street2 | string | `"Ainscough Trading Estate"` |
| billing_address.fax | string | `""` |
| billing_address.state_code | string | `""` |
| salesperson_id | string | `"310656000000059361"` |
| salesperson_name | string | `"matt"` |
| created_by | string | `"migration_script"` |
| created_at | timestamp | `"2025-07-05T21:27:43.761Z"` |
| updated_at | timestamp | `"2025-07-05T21:27:43.761Z"` |
| _migrated_from_zoho | boolean | `true` |
| _original_zoho_id | string | `"310656000000059383"` |
| _original_firebase_id | string | `"310656000000059383"` |

### sales_transactions

**Document Count:** 26539

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| transaction_id | string | `"310656000000059391"` |
| _syncSource | string | `"python_inventory_sync"` |
| quantity | number | `1` |
| item_id | string | `"310656000000057137"` |
| order_number | string | `"SO-00001"` |
| created_at | string | `"2022-09-29"` |
| is_marketplace_order | boolean | `false` |
| item_name | string | `"Luxury throw Off white"` |
| manufacturer | string | `"Elvang"` |
| _lastSynced | timestamp | `"2025-06-17T02:00:25.612Z"` |
| salesperson_name | string | `"matt"` |
| order_date | string | `"2022-09-29"` |
| salesperson_id | string | `"310656000000059361"` |
| total | number | `96` |
| marketplace_source | null | - |
| price | number | `96` |
| brand_normalized | string | `"elvang"` |
| customer_name | string | `"Silver Mushroom Ltd"` |
| customer_id | string | `"310656000000059331"` |
| sku | string | `"6004"` |
| brand | string | `"Elvang"` |
| order_id | string | `"310656000000059383"` |
| last_modified | timestamp | `"2025-06-17T02:00:25.612Z"` |

### invoices

**Status:** Collection does not exist or is empty

### invoices_enhanced

**Status:** Collection does not exist or is empty

### purchase_orders

**Document Count:** 133

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| id | string | `"PO-1751751027604-bco1ceopd"` |
| purchase_order_id | string | `"PO-1751751027604-bco1ceopd"` |
| vendor_name | string | `"Unknown Vendor"` |
| order_date | timestamp | `"2025-07-05T21:30:27.604Z"` |
| expected_delivery_date | null | - |
| status | string | `"issued"` |
| currency_code | string | `"GBP"` |
| subtotal | number | `0` |
| tax_total | number | `0` |
| total | number | `0` |
| notes | string | `""` |
| created_by | string | `"migration_script"` |
| created_at | timestamp | `"2025-07-05T21:30:27.604Z"` |
| updated_at | timestamp | `"2025-07-05T21:30:27.604Z"` |
| _migrated_from_zoho | boolean | `true` |
| _original_zoho_id | string | `"2e3OJ1Sjp2FNyMdSzku6"` |
| _original_firebase_id | string | `"2e3OJ1Sjp2FNyMdSzku6"` |

### warehouses

**Document Count:** 3

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| warehouse_type | string | `"primary"` |
| is_active | boolean | `true` |
| address.country | string | `"United Kingdom"` |
| address.street_1 | string | `"123 Main Street"` |
| address.city | string | `"London"` |
| address.street_2 | string | `""` |
| address.postcode | string | `"SW1A 1AA"` |
| address.state | string | `"England"` |
| contact_phone | string | `""` |
| is_primary | boolean | `true` |
| contact_person | string | `""` |
| description | string | `"Primary warehouse location"` |
| created_by | string | `"migration_script"` |
| contact_email | string | `""` |
| _migration_date | timestamp | `"2025-07-05T17:40:15.790Z"` |
| warehouse_name | string | `"Main Warehouse"` |
| phone | string | `""` |
| _migrated_from | string | `"default_warehouse"` |
| updated_by | string | `"migration_script"` |
| created_date | timestamp | `"2025-07-05T17:40:15.790Z"` |
| last_modified | timestamp | `"2025-07-05T17:40:15.790Z"` |
| email | string | `""` |
| warehouse_id | string | `"WH_1751737215790_jgkzle0kh"` |

### stock_transactions

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### stock_alerts

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### inventory_transactions

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### shipping_methods

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### couriers

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### vendor_contacts

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### branches

**Document Count:** 2

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| is_active | boolean | `true` |
| address.country | string | `"United Kingdom"` |
| address.street_1 | string | `"123 Main Street"` |
| address.city | string | `"London"` |
| address.street_2 | string | `""` |
| address.postcode | string | `"SW1A 1AA"` |
| address.state | string | `"England"` |
| contact_phone | string | `""` |
| is_primary | boolean | `true` |
| contact_person | string | `""` |
| description | string | `"Primary business location"` |
| created_by | string | `"migration_script"` |
| contact_email | string | `""` |
| _migration_date | timestamp | `"2025-07-05T18:25:23.216Z"` |
| branch_code | string | `"MAIN"` |
| branch_id | string | `"BR_1751739923216_19udpex33"` |
| branch_type | string | `"headquarters"` |
| phone | string | `""` |
| _migrated_from | string | `"default_branch"` |
| branch_name | string | `"Main Branch"` |
| updated_by | string | `"migration_script"` |
| created_date | timestamp | `"2025-07-05T18:25:23.216Z"` |
| fax | string | `""` |
| last_modified | timestamp | `"2025-07-05T18:25:23.216Z"` |
| email | string | `""` |

### packing_stations

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### packing_jobs

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

### sync_metadata

**Document Count:** 18

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| last_rebuild | string | `"2025-06-16T00:57:07.358428+00:00"` |
| status | string | `"completed"` |
| stats.errors | array | - |
| stats.invoicesProcessed | number | `3664` |
| stats.customersCreated | number | `544` |
| stats.ordersProcessed | number | `502` |
| customer_count | number | `544` |
| errors | array | - |

### sync_queue

**Document Count:** 18366

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| collection | string | `"customers"` |
| changeType | string | `"modified"` |
| documentId | string | `"806490000000593010"` |
| data.Primary_Email | string | `"patsy@patsybluntinteriors.com"` |
| data.Billing_Street | string | `"7 Station Approach"` |
| data.Phone | string | `""` |
| data.Primary_Last_Name | string | `"Blunt"` |
| data.Billing_Country | string | `"United Kingdom"` |
| data.Billing_Code | string | `"GU25 4DL"` |
| data.Primary_First_Name | string | `"Patsy"` |
| data.Billing_City | string | `"Virginia Water"` |
| data.Agent.name | string | `"Gay Croker"` |
| data.Agent.id | string | `"806490000000515916"` |
| data.Billing_State | string | `"Surrey"` |
| data.id | string | `"806490000000593010"` |
| data.Account_Name | string | `"Patsy Blunt Interiors Ltd"` |
| data.createdTime | timestamp | `"2025-06-08T14:52:03.355Z"` |
| data.source | string | `"ZohoCRM"` |
| processed | boolean | `false` |
| timestamp | timestamp | `"2025-06-08T14:52:05.660Z"` |

### migration_logs

**Document Count:** 6

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|
| migration_date | timestamp | `"2025-07-05T03:43:57.350Z"` |
| migration_version | string | `"1.0.0"` |
| dry_run | boolean | `true` |
| results.vendors.created | number | `0` |
| results.vendors.errors | number | `0` |
| results.items.migrated | number | `0` |
| results.items.skipped | number | `0` |
| results.items.errors | number | `0` |
| results.customers.migrated | number | `0` |
| results.customers.skipped | number | `0` |
| results.customers.errors | number | `0` |
| results.categories.created | number | `0` |
| results.categories.errors | number | `0` |
| results.warehouse.created | number | `0` |
| results.warehouse.errors | number | `0` |
| collections_created | array | - |
| config.dryRun | boolean | `true` |
| config.batchSize | number | `100` |
| config.createMissingCollections | boolean | `true` |
| config.preserveExistingData | boolean | `true` |
| config.logLevel | string | `"info"` |

### data_adapters

**Document Count:** 1

**Field Structure:**

| Field Path | Type | Example |
|------------|------|----------|

