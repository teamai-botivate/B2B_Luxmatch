# customers

> **Deprecated for B2B kiosk flow.** Customer login/signup removed. Customers now order as guests via `guest_orders`. This table remains for legacy data.

Per-jeweller customer accounts. Same phone = different customer row per jeweller (never joined across tenants).

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `jeweller_id` | uuid | NO | — | Tenant scope |
| `phone` | text | NO | — | Unique per jeweller |
| `name` | text | YES | — | |
| `email` | text | YES | — | |
| `avatar_url` | text | YES | — | Cloudinary URL |
| `avatar_public_id` | text | YES | — | Cloudinary public ID |
| `created_at` | timestamptz | NO | now() | |
