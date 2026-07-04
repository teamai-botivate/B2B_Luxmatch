# guest_order_items

Line items for guest kiosk orders. Snapshots product data at order time.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `guest_order_id` | uuid | NO | — | FK → guest_orders.id CASCADE |
| `product_id` | uuid | YES | — | FK → products.id SET NULL (nullable — product may be deleted) |
| `product_name_snapshot` | text | NO | — | Name at order time |
| `product_sku_snapshot` | text | YES | — | |
| `product_image_snapshot` | text | YES | — | Primary image URL at order time |
| `category_snapshot` | text | YES | — | |
| `metal_snapshot` | text | YES | — | |
| `quantity` | integer | NO | — | |
| `unit_price_snapshot` | numeric | NO | — | Price at order time |
| `created_at` | timestamptz | NO | now() | |
