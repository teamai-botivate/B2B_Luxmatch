-- ─────────────────────────────────────────────────────────────────────────────
-- 0008_jewel_factory.sql
-- Jewel Factory evolution: store self-registration, store managers,
-- custom design requests, password reset, auto design numbers,
-- remove price/metal, order routing through store manager approval
-- Apply after 0007_tryon_assets.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Store self-registration fields ────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS registration_status text NOT NULL DEFAULT 'approved'
    CHECK (registration_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS registration_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS registration_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fixed_address_street text,
  ADD COLUMN IF NOT EXISTS fixed_address_city text,
  ADD COLUMN IF NOT EXISTS fixed_address_state text,
  ADD COLUMN IF NOT EXISTS fixed_address_pincode text,
  ADD COLUMN IF NOT EXISTS fixed_address_landmark text,
  ADD COLUMN IF NOT EXISTS owner_naam text,
  ADD COLUMN IF NOT EXISTS owner_phone text;

-- ── 2. Store managers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_managers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  naam          text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,   -- bcrypt
  phone         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid,            -- store owner / another manager who added them
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);

CREATE INDEX IF NOT EXISTS idx_store_managers_store_id ON store_managers(store_id);
CREATE INDEX IF NOT EXISTS idx_store_managers_email ON store_managers(email);

-- ── 3. Password reset tokens (store owner + manager) ─────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  role       text NOT NULL CHECK (role IN ('store_owner', 'store_manager')),
  store_id   uuid REFERENCES stores(id) ON DELETE CASCADE,
  token_hash text NOT NULL,   -- SHA-256 of the random token sent in email
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- ── 4. Custom design requests (customer → store manager) ─────────────────────
CREATE TABLE IF NOT EXISTS custom_design_requests (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  jeweller_id          uuid NOT NULL REFERENCES jewellers(id),  -- denormalized

  -- Customer details (store-only, NEVER forwarded to manufacturer)
  customer_naam        text NOT NULL,
  customer_phone       text NOT NULL,
  customer_notes       text,

  -- Design specs
  reference_image_url       text,
  reference_image_public_id text,
  category             text NOT NULL,
  weight_grams         numeric(8,3),
  purity               text,
  design_notes         text,

  -- Manager workflow
  status               text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'forwarded')),
  reviewed_by          uuid REFERENCES store_managers(id),  -- null = owner reviewed
  reviewed_at          timestamptz,
  rejection_reason     text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_store_id
  ON custom_design_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_status
  ON custom_design_requests(status);

-- ── 5. Custom design orders (sanitized → manufacturer, no customer data) ──────
CREATE TABLE IF NOT EXISTS custom_design_orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_design_request_id  uuid NOT NULL REFERENCES custom_design_requests(id),
  manufacturer_id           uuid NOT NULL REFERENCES manufacturers(id),

  -- Store identity (what manufacturer sees)
  store_id                  uuid NOT NULL REFERENCES stores(id),
  store_naam_snapshot       text NOT NULL,
  store_address_snapshot    text NOT NULL,   -- full fixed address at time of order

  -- Design specs only (no customer info)
  category                  text NOT NULL,
  weight_grams              numeric(8,3),
  purity                    text,
  reference_image_url       text,
  design_notes              text,

  -- Order lifecycle
  status                    text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'in_production', 'packed', 'shipped', 'delivered', 'cancelled')),
  order_number              text NOT NULL UNIQUE,
  tracking_number           text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_design_orders_manufacturer_id
  ON custom_design_orders(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_custom_design_orders_store_id
  ON custom_design_orders(store_id);

-- ── 6. Auto design number on manufacturer_products ───────────────────────────
-- Design number sequence: JF-0001, JF-0002, ...
CREATE SEQUENCE IF NOT EXISTS design_number_seq START 1;

ALTER TABLE manufacturer_products
  ADD COLUMN IF NOT EXISTS design_number text UNIQUE;

-- Backfill existing products with design numbers
DO $$
DECLARE
  rec RECORD;
  seq_val bigint;
BEGIN
  FOR rec IN SELECT id FROM manufacturer_products WHERE design_number IS NULL ORDER BY created_at
  LOOP
    seq_val := nextval('design_number_seq');
    UPDATE manufacturer_products
    SET design_number = 'JF-' || LPAD(seq_val::text, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ── 7. Remove price from manufacturer_products ────────────────────────────────
-- Rename base_price to _base_price_archived so data is not lost
-- (do not hard DROP in case rollback needed; set to null going forward)
ALTER TABLE manufacturer_products
  ALTER COLUMN base_price DROP NOT NULL;

-- ── 8. Remove metal from manufacturer_products ────────────────────────────────
-- metal column: keep in DB but make optional and stop using in UI/API
-- (hard drop only after full C-series is stable)
ALTER TABLE manufacturer_products
  ALTER COLUMN metal DROP NOT NULL;

-- ── 9. Manager approval fields on b2b_orders ─────────────────────────────────
ALTER TABLE b2b_orders
  ADD COLUMN IF NOT EXISTS manager_approved_by  uuid REFERENCES store_managers(id),
  ADD COLUMN IF NOT EXISTS manager_approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS pending_manager_approval boolean NOT NULL DEFAULT true;

-- Backfill: existing orders were directly approved (no manager gate existed)
UPDATE b2b_orders SET pending_manager_approval = false WHERE status != 'pending';

-- ── 10. Manager approval fields on guest_orders (customer kiosk orders) ───────
ALTER TABLE guest_orders
  ADD COLUMN IF NOT EXISTS store_approved_by    uuid REFERENCES store_managers(id),
  ADD COLUMN IF NOT EXISTS store_approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_to_manufacturer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_store_approval boolean NOT NULL DEFAULT true;

-- Backfill: existing orders were direct
UPDATE guest_orders SET pending_store_approval = false, forwarded_to_manufacturer = true;

-- ── 11. Remove price snapshot from b2b_order_items ───────────────────────────
ALTER TABLE b2b_order_items
  ALTER COLUMN unit_price_snapshot DROP NOT NULL;

ALTER TABLE b2b_orders
  ALTER COLUMN total_amount DROP NOT NULL;

-- ── 12. RLS on new tables ─────────────────────────────────────────────────────
ALTER TABLE store_managers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_design_orders    ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service role all store_managers"
  ON store_managers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role all password_reset_tokens"
  ON password_reset_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role all custom_design_requests"
  ON custom_design_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service role all custom_design_orders"
  ON custom_design_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
