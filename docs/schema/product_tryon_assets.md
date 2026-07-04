# product_tryon_assets

AR try-on transparent PNG assets. Can belong to either a store product (after B2B fulfillment) or a manufacturer product (source, before fulfillment).

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `product_id` | uuid | YES | — | FK → products.id (store product, nullable since B20) |
| `manufacturer_product_id` | uuid | YES | — | FK → manufacturer_products.id (B20) |
| `asset_url` | text | NO | — | Cloudinary URL of transparent PNG |
| `cloudinary_public_id` | text | YES | — | For deletion |
| `jewellery_type` | text | NO | — | necklace/earring_left/earring_right/ring_index/ring_middle/bangle |
| `pivot_x` | numeric | YES | 0.5 | AR calibration |
| `pivot_y` | numeric | YES | 0.5 | AR calibration |
| `x_offset` | numeric | YES | 0 | AR calibration |
| `y_offset` | numeric | YES | 0 | AR calibration |
| `scale_multiplier` | numeric | YES | 1 | AR calibration |
| `rotation_offset_deg` | numeric | YES | 0 | AR calibration |
| `is_active` | boolean | NO | true | |
| `created_at` | timestamptz | NO | now() | |

## Constraint
At least one of `product_id` or `manufacturer_product_id` must be non-null (`tryon_assets_has_owner` CHECK constraint).

## jewellery_type Values
| Value | Body Part |
|-------|-----------|
| `necklace` | Neck/chest |
| `earring_left` | Left ear |
| `earring_right` | Right ear |
| `ring_index` | Index finger |
| `ring_middle` | Middle finger |
| `bangle` | Wrist |
