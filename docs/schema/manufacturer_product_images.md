# manufacturer_product_images

Images for manufacturer catalog products. Stored on Cloudinary under `luxematch/manufacturer/<manufacturerId>/catalog/`.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `product_id` | uuid | NO | — | FK → manufacturer_products.id |
| `cloudinary_public_id` | text | NO | — | Cloudinary asset ID |
| `secure_url` | text | NO | — | HTTPS image URL |
| `is_primary` | boolean | YES | true | Main display image |
| `is_tryon` | boolean | YES | false | True for transparent PNG try-on images |
| `jewellery_type` | text | YES | — | necklace / earring_left / ring_index / bangle etc. |
| `sort_order` | integer | YES | 0 | Display order |
| `created_at` | timestamptz | YES | now() | |

## Notes
- `is_tryon=true` images are transparent PNGs used for AR overlay
- Adding first image triggers auto-embedding into Qdrant
