# guest_order_status_history

Audit trail for guest kiosk order status changes.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `guest_order_id` | uuid | NO | — | FK → guest_orders.id CASCADE |
| `status` | text | NO | — | New status value |
| `note` | text | YES | — | |
| `changed_by` | text | YES | — | 'store' / 'manufacturer' / 'system' |
| `created_at` | timestamptz | NO | now() | |
