# product_images

Photos for store inventory products. Stored on Cloudinary under `luxematch/<jewellerId>/products/`.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `product_id` | uuid | NO | — | FK → products.id CASCADE |
| `url` | text | NO | — | HTTPS image URL |
| `secure_url` | text | YES | — | Cloudinary secure URL |
| `cloudinary_public_id` | text | YES | — | For deletion |
| `alt` | text | YES | — | Alt text |
| `is_primary` | boolean | NO | false | Main display image |
| `sort_order` | integer | NO | 0 | |
| `created_at` | timestamptz | NO | now() | |
