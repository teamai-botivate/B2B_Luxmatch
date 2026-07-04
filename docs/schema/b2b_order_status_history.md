# b2b_order_status_history

Audit trail for B2B order status changes.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `b2b_order_id` | uuid | NO | — | FK → b2b_orders.id CASCADE |
| `status` | text | NO | — | New status value |
| `note` | text | YES | — | Optional comment |
| `created_at` | timestamptz | YES | now() | |
