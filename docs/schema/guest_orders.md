# guest_orders

Walk-in customer kiosk orders. No login required. Created by `POST /api/kiosk/orders`.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `manufacturer_id` | uuid | NO | — | FK → manufacturers.id |
| `store_id` | uuid | NO | — | FK → stores.id |
| `jeweller_id` | uuid | NO | — | FK → jewellers.id (denormalized) |
| `store_name_snapshot` | text | NO | — | Store name at order time |
| `store_city_snapshot` | text | YES | — | |
| `store_phone_snapshot` | text | YES | — | |
| `store_email_snapshot` | text | YES | — | |
| `customer_name` | text | NO | — | Captured at checkout |
| `customer_phone` | text | NO | — | |
| `customer_email` | text | YES | — | Optional |
| `delivery_address` | text | YES | — | null when pickup_store=true |
| `pickup_store` | boolean | NO | false | True = pickup at store |
| `notes` | text | YES | — | |
| `order_number` | text | NO | — | Unique e.g. GK-20240601-0001 |
| `order_source` | text | NO | 'kiosk' | kiosk / web / whatsapp |
| `status` | text | NO | 'placed' | placed/confirmed/packed/shipped/delivered/cancelled |
| `total_items` | integer | NO | 0 | |
| `total_amount` | numeric | NO | 0 | |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

## Status Flow
```
placed → confirmed → packed → shipped → delivered
                                      ↘ cancelled
```
Manufacturer controls placed→shipped. Store controls arrived_at_store→delivered.
