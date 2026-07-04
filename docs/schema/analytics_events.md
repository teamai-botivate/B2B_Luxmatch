# analytics_events

Customer behaviour events fired from the storefront. Written by `POST /api/analytics/event`.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `jeweller_id` | uuid | NO | — | Tenant scope |
| `event_type` | text | NO | — | See allowed types below |
| `product_id` | uuid | YES | — | For product-scoped events |
| `session_id` | text | YES | — | Per-tab session (sessionStorage) |
| `metadata` | jsonb | YES | — | Event-specific data |
| `created_at` | timestamptz | NO | now() | |

## Allowed event_type Values
search_text, product_view, cart_add, save, unsave, compare_opened, style_quiz_completed, tryon_start, tryon_capture, order_placed

## Notes
- `product_view` fans to `product_views` table
- `tryon_start` fans to `tryon_events` table
