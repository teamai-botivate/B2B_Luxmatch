# manufacturer_products

Global wholesale catalog managed by the manufacturer. Stores browse and order from this.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `manufacturer_id` | uuid | NO | — | FK → manufacturers.id |
| `sku` | text | NO | — | Unique product code |
| `name` | text | NO | — | Product name |
| `category` | text | YES | — | e.g. necklace, ring |
| `description` | text | YES | — | |
| `weight_grams` | numeric | YES | — | |
| `base_price` | numeric | NO | — | Wholesale price (INR) |
| `min_order_qty` | integer | YES | 1 | |
| `metal` | text | YES | — | e.g. Gold, Silver |
| `purity` | text | YES | — | e.g. 22K, 925 |
| `gemstones` | text[] | YES | '{}' | Array of gemstone names |
| `occasion_tags` | text[] | YES | '{}' | e.g. wedding, festive |
| `style_tags` | text[] | YES | '{}' | |
| `status` | text | YES | 'draft' | draft / active / archived |
| `has_tryon` | boolean | NO | false | True when transparent PNG uploaded |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

## Status Values
- `draft` — not visible to stores
- `active` — visible in store catalog
- `archived` — hidden, kept for history

## Relationships
- → `manufacturer_product_images.product_id`
- → `manufacturer_product_embeddings.product_id`
- → `b2b_order_items.manufacturer_product_id`
- → `product_tryon_assets.manufacturer_product_id` (B20)

## Notes
- Auto-embedded into Qdrant (`luxematch_manufacturer_products`) on create/update/image-add
- `has_tryon` set to true automatically when try-on PNG uploaded via API
