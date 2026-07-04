# product_embeddings

Tracks which store inventory products are indexed in Qdrant (`luxematch_products` collection, scoped by jeweller_id).

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `product_id` | uuid | NO | — | PK + FK → products.id |
| `qdrant_point_id` | text | NO | — | UUID string (= product_id) |
| `embedding_model` | text | YES | — | open_clip:ViT-B-32:laion2b_s34b_b79k |
| `dimensions` | integer | YES | — | 512 |
| `indexed_at` | timestamptz | YES | now() | Last indexed time |
