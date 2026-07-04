# b2b_order_items

Line items for B2B restock orders.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `b2b_order_id` | uuid | NO | — | FK → b2b_orders.id CASCADE |
| `manufacturer_product_id` | uuid | NO | — | FK → manufacturer_products.id |
| `quantity` | integer | NO | — | |
| `unit_price_snapshot` | numeric | YES | — | Price at order time |
| `product_name_snapshot` | text | YES | — | Name at order time |
| `created_at` | timestamptz | YES | now() | |
