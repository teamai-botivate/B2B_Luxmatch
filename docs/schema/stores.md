# stores

Store login accounts. Each store is linked to a `jewellers` row (auto-created on store creation).

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `manufacturer_id` | uuid | YES | — | FK → manufacturers.id |
| `jeweller_id` | uuid | YES | — | FK → jewellers.id (auto-created) |
| `name` | text | NO | — | Store display name |
| `email` | text | NO | — | Login email |
| `password_hash` | text | NO | — | bcrypt hash (10 rounds) |
| `city` | text | YES | — | |
| `phone` | text | YES | — | |
| `logo_url` | text | YES | — | Branding logo |
| `tagline` | text | YES | — | Branding tagline |
| `website_url` | text | YES | — | Branding website |
| `is_active` | boolean | NO | true | Login enabled |
| `created_at` | timestamptz | NO | now() | |
| `updated_at` | timestamptz | NO | now() | |

## Relationships
- → `jewellers.id` (jeweller_id) — auto-created on createStore(), auto-deleted on deleteStore()
- → `b2b_orders.store_id`
- → `guest_orders.store_id`

## Notes
- `lm_store` cookie carries both `storeId` and `jewellerId` — zero DB lookups for tenancy
- Store login uses `LM_PIN_COOKIE_SECRET` + `:store` namespace
- `logo_url`, `tagline`, `website_url` added in migration 0006
