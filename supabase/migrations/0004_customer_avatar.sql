-- ─────────────────────────────────────────────────────────────────────────────
-- 0004_customer_avatar.sql
--
-- Adds a profile picture ("DP") to customer accounts.
--
-- The image FILE is stored in Cloudinary under luxematch/<jeweller_id>/avatars/
-- (consistent with products/tryon/logo buckets). Postgres only holds the
-- resulting secure URL + public_id so we can render it and clean up the old
-- asset on replacement. No bytes are stored in the database.
--
-- Apply in the Supabase SQL editor (run-migration.mjs only seeds demo data).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS avatar_url       text,
  ADD COLUMN IF NOT EXISTS avatar_public_id text;

COMMENT ON COLUMN customers.avatar_url       IS 'Cloudinary secure_url of the customer profile picture (file lives in Cloudinary, not Postgres).';
COMMENT ON COLUMN customers.avatar_public_id IS 'Cloudinary public_id for the avatar, used to delete/replace the asset.';
