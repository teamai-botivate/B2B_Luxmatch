# jewellers

Store tenant identity. Auto-created when a store is created via the manufacturer portal. All store inventory, orders, and analytics are scoped by `jeweller_id`.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key — this is `jeweller_id` used everywhere |
| `slug` | text | NO | — | URL-safe unique identifier |
| `store_name` | text | NO | — | Display name (synced from stores.name) |
| `city` | text | YES | — | |
| `gstin` | text | YES | — | GST number |
| `owner_name` | text | YES | — | |
| `phone` | text | YES | — | |
| `logo_url` | text | YES | — | |
| `pin_hash` | text | NO | — | scrypt hash of 6-digit PIN |
| `pin_salt` | text | NO | '' | PIN salt |
| `idle_reset_enabled` | boolean | NO | true | Auto-lock after idle |
| `idle_reset_seconds` | integer | NO | 90 | Idle timeout |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

## Notes
- Every product, order, customer, analytics event carries `jeweller_id` for tenant isolation
- `pin_hash` uses scrypt (Node-only) — never import in Edge/middleware
- Auto-deleted when the linked store is deleted
