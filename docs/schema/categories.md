# categories

Global product categories. Shared across all jewellers.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `slug` | text | NO | — | URL-safe e.g. necklace |
| `name` | text | NO | — | Display name |
| `sort_order` | integer | NO | 0 | Display order |
