# manufacturers

Manufacturer accounts. One row per manufacturer (global admin). Password is bcrypt-hashed.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `name` | text | NO | — | Display name |
| `email` | text | NO | — | Login email (unique) |
| `password_hash` | text | NO | — | bcrypt hash (10 rounds) |
| `is_active` | boolean | YES | true | Soft disable |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

## Relationships
- → `manufacturer_products.manufacturer_id`
- → `stores.manufacturer_id`
- → `b2b_orders.manufacturer_id`
- → `guest_orders.manufacturer_id`

## Notes
- `MANUFACTURER_COOKIE_SECRET` env var required for login cookie signing
- Password reset: bcrypt hash new password and UPDATE password_hash directly
