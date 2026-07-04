# branches

Store pickup branch locations for click-and-collect orders.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `jeweller_id` | uuid | NO | — | Tenant scope |
| `name` | text | NO | — | Branch name |
| `city` | text | NO | — | |
| `address` | text | NO | — | Full address |
| `pin_code` | text | YES | — | |
| `phone` | text | YES | — | |
| `email` | text | YES | — | |
| `lat` | numeric | YES | — | GPS latitude |
| `lng` | numeric | YES | — | GPS longitude |
| `is_active` | boolean | NO | true | |
| `created_at` | timestamptz | NO | now() | |
