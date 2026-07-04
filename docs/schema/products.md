# products

Store inventory. Products are created here when a B2B order is fulfilled (copied from manufacturer_products). Also can be created manually via the jeweller back-office.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `jeweller_id` | uuid | NO | — | FK → jewellers.id — tenant isolation key |
| `manufacturer_product_id` | uuid | YES | — | FK → manufacturer_products.id (null for manual entries) |
| `slug` | text | NO | — | URL-safe unique per jeweller |
| `name` | text | NO | — | |
| `category_id` | uuid | YES | — | FK → categories.id |
| `sku` | text | YES | — | |
| `description` | text | YES | — | |
| `metal` | text | YES | — | |
| `purity` | text | YES | — | |
| `weight_grams` | numeric | YES | — | |
| `price_min` | numeric | YES | — | |
| `price_max` | numeric | YES | — | |
| `stock_count` | integer | NO | 0 | |
| `is_featured` | boolean | NO | false | |
| `occasion_tags` | text[] | YES | '{}' | |
| `style_tags` | text[] | YES | '{}' | |
| `has_tryon` | boolean | NO | false | True when try-on asset exists |
| `primary_image_url` | text | YES | — | Denormalized for fast list queries |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

## Notes
- Every query MUST filter by `jeweller_id` — service role bypasses RLS
- `has_tryon` reflects whether `product_tryon_assets` has an active row
