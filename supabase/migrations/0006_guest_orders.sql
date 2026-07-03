-- ─────────────────────────────────────────────────────────────────────────────
-- 0006_guest_orders.sql
-- Guest kiosk orders: no customer login required.
-- Every order carries manufacturer_id, store_id, store snapshot, customer
-- details captured at checkout, order_source, and a full status history.
-- Apply after 0005_b2b_platform.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Guest orders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core routing: which manufacturer fulfills, which store placed it
  manufacturer_id       uuid NOT NULL REFERENCES manufacturers(id),
  store_id              uuid NOT NULL REFERENCES stores(id),
  jeweller_id           uuid NOT NULL REFERENCES jewellers(id),  -- denormalized for fast tenant queries

  -- Store identity snapshot (captured at order time so renames don't break history)
  store_name_snapshot   text NOT NULL,
  store_city_snapshot   text,
  store_phone_snapshot  text,
  store_email_snapshot  text,

  -- Guest customer details (no account required)
  customer_name         text NOT NULL,
  customer_phone        text NOT NULL,
  customer_email        text,
  delivery_address      text,        -- null when pickup_store = true
  pickup_store          boolean NOT NULL DEFAULT false,
  notes                 text,

  -- Order metadata
  order_number          text NOT NULL UNIQUE,  -- e.g. GK-20240601-0001
  order_source          text NOT NULL DEFAULT 'kiosk'
    CHECK (order_source IN ('kiosk', 'web', 'whatsapp')),
  status                text NOT NULL DEFAULT 'placed'
    CHECK (status IN ('placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),

  -- Totals (denormalized for fast list views)
  total_items           integer NOT NULL DEFAULT 0,
  total_amount          numeric(12,2) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Guest order line items ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_order_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_order_id          uuid NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,

  -- Link to the store's product (jeweller-scoped) — may become null if product deleted
  product_id              uuid REFERENCES products(id) ON DELETE SET NULL,

  -- Snapshot at order time (always preserved even if product changes)
  product_name_snapshot   text NOT NULL,
  product_sku_snapshot    text,
  product_image_snapshot  text,       -- primary image URL at order time
  category_snapshot       text,
  metal_snapshot          text,

  quantity                integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot     numeric(12,2) NOT NULL,

  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Guest order status history (audit trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_order_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_order_id  uuid NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,
  status          text NOT NULL,
  note            text,
  changed_by      text,   -- 'store' | 'manufacturer' | 'system'
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Store branding columns (B12) ───────────────────────────────────────────
-- Added here to keep migrations linear; referenced in B13 customer-facing UI.
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS logo_url    text,
  ADD COLUMN IF NOT EXISTS tagline     text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_orders_store_id
  ON guest_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_guest_orders_manufacturer_id
  ON guest_orders(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_guest_orders_jeweller_id
  ON guest_orders(jeweller_id);
CREATE INDEX IF NOT EXISTS idx_guest_orders_status
  ON guest_orders(status);
CREATE INDEX IF NOT EXISTS idx_guest_orders_created_at
  ON guest_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_order_items_order_id
  ON guest_order_items(guest_order_id);
CREATE INDEX IF NOT EXISTS idx_guest_order_items_product_id
  ON guest_order_items(product_id);

-- ── 6. RLS (service role bypasses; app-level filtering is isolation) ──────────
ALTER TABLE guest_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role all guest_orders"
  ON guest_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all guest_order_items"
  ON guest_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all guest_order_status_history"
  ON guest_order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
