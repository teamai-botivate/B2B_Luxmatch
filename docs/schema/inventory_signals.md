# inventory_signals

Rolled-up demand signals in 7-day windows. Used by the intelligence engine for restock/pricing recommendations.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `jeweller_id` | uuid | NO | — | Tenant scope |
| `category_id` | uuid | YES | — | FK → categories.id |
| `metal` | text | YES | — | |
| `occasion` | text | YES | — | |
| `window_start` | date | NO | — | 7-day window start |
| `window_end` | date | NO | — | 7-day window end |
| `views` | integer | NO | 0 | Product views in window |
| `tryons` | integer | NO | 0 | Try-on sessions in window |
| `sales` | integer | NO | 0 | Sales in window |
| `revenue` | numeric | NO | 0 | Revenue in window |
| `computed_at` | timestamptz | NO | now() | |

## Notes
- Populated by `pnpm rollup:intelligence`
- Powers `/jeweller/intelligence` recommendations
