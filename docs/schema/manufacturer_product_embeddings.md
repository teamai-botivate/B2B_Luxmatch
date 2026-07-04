# manufacturer_product_embeddings

Tracks which manufacturer products are indexed in Qdrant (`luxematch_manufacturer_products` collection).

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `product_id` | uuid | NO | — | PK + FK → manufacturer_products.id |
| `qdrant_point_id` | text | NO | — | UUID string used as Qdrant point ID |
| `qdrant_id` | text | YES | — | Legacy field |
| `embedding_model` | text | YES | — | e.g. open_clip:ViT-B-32:laion2b_s34b_b79k |
| `dimensions` | integer | YES | — | 512 |
| `image_url` | text | YES | — | Image URL that was embedded |
| `indexed_at` | timestamptz | YES | now() | |
