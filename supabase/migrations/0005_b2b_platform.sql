-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_b2b_platform.sql
-- B2B: manufacturers, manufacturer_products, manufacturer_product_images,
--      manufacturer_product_embeddings, stores,
--      b2b_orders, b2b_order_items, b2b_order_status_history
-- Apply AFTER 0004_customer_avatar.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Manufacturers ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manufacturers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,          -- bcrypt
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 2. Manufacturer product catalog ──────────────────────────────────────────
-- Global — NOT jeweller-scoped. Every active store can browse these.
-- Mirrors the fields in products table so fulfillment copy is 1:1.
CREATE TABLE IF NOT EXISTS manufacturer_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  sku             text NOT NULL,
  name            text NOT NULL,
  category        text,                 -- matches shared categories (ring, earring, necklace, etc.)
  description     text,
  weight_grams    numeric(8,3),
  base_price      numeric(12,2) NOT NULL,
  metal           text,                 -- Gold | Silver | Platinum | Rose Gold | White Gold | Mixed Metals
  purity          text,                 -- 14k | 18k | 22k | 24k | 925 | 950 | 999
  gemstones       text[] DEFAULT '{}',  -- e.g. Diamond, Ruby, Emerald
  occasion_tags   text[] DEFAULT '{}',  -- e.g. Bridal, Festival, Daily
  style_tags      text[] DEFAULT '{}',  -- e.g. Antique, Kundan, Temple, Minimal
  min_order_qty   integer DEFAULT 1 CHECK (min_order_qty >= 1),
  status          text DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (manufacturer_id, sku)
);

-- ── 3. Design images ──────────────────────────────────────────────────────────
-- Stored in Cloudinary under: luxematch/manufacturer/<manufacturerId>/catalog/
CREATE TABLE IF NOT EXISTS manufacturer_product_images (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid NOT NULL REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  cloudinary_public_id text NOT NULL,
  secure_url           text NOT NULL,
  is_primary           boolean DEFAULT true,
  is_tryon             boolean DEFAULT false,
  jewellery_type       text CHECK (jewellery_type IN (
    'necklace','earring_left','earring_right',
    'ring_index','ring_middle','bangle'
  )),
  sort_order           integer DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);

-- ── 4. Qdrant embedding tracking for manufacturer products ───────────────────
-- Mirrors product_embeddings table (migration 0001) but for manufacturer catalog.
-- Collection: luxematch_manufacturer_products (global, no jeweller_id filter)
CREATE TABLE IF NOT EXISTS manufacturer_product_embeddings (
  product_id       uuid PRIMARY KEY REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  qdrant_point_id  text NOT NULL,       -- = product_id (UUID string, same as Qdrant point id)
  embedding_model  text,
  dimensions       integer,
  indexed_at       timestamptz DEFAULT now(),
  image_url        text                 -- the image URL that was embedded
);

-- ── 5. Stores ─────────────────────────────────────────────────────────────────
-- One row per registered retail store. jeweller_id links tenancy.
CREATE TABLE IF NOT EXISTS stores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id     uuid UNIQUE REFERENCES jewellers(id) ON DELETE CASCADE,
  manufacturer_id uuid REFERENCES manufacturers(id),
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,        -- bcrypt
  city            text,
  phone           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 6. B2B orders (store → manufacturer) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id),
  jeweller_id      uuid NOT NULL REFERENCES jewellers(id),
  manufacturer_id  uuid NOT NULL REFERENCES manufacturers(id),
  order_number     text NOT NULL UNIQUE,  -- generated: B2B-YYYYMMDD-NNNN
  status           text DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  delivery_address text NOT NULL,
  notes            text,
  tracking_number  text,
  fulfilled_at     timestamptz,
  fulfilled_product_ids uuid[] DEFAULT '{}',
  total_items      integer DEFAULT 0,
  total_amount     numeric(12,2) DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── 7. B2B order line items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_order_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id            uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  manufacturer_product_id uuid NOT NULL REFERENCES manufacturer_products(id),
  quantity                integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot     numeric(12,2),   -- base_price at time of order
  product_name_snapshot   text,            -- name at time of order
  created_at              timestamptz DEFAULT now()
);

-- ── 8. B2B order status audit trail ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_order_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  status       text NOT NULL,
  note         text,
  created_at   timestamptz DEFAULT now()
);

-- ── 9. Link fulfilled products back to their manufacturer source ──────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_product_id uuid
    REFERENCES manufacturer_products(id) ON DELETE SET NULL;

ALTER TABLE b2b_orders
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_product_ids uuid[] DEFAULT '{}';

ALTER TABLE manufacturer_product_images
  ADD COLUMN IF NOT EXISTS is_tryon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS jewellery_type text CHECK (jewellery_type IN (
    'necklace','earring_left','earring_right',
    'ring_index','ring_middle','bangle'
  ));

-- ── 10. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mfr_products_status
  ON manufacturer_products(status);
CREATE INDEX IF NOT EXISTS idx_mfr_products_category
  ON manufacturer_products(category);
CREATE INDEX IF NOT EXISTS idx_mfr_products_manufacturer
  ON manufacturer_products(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_mfr_product_images_product
  ON manufacturer_product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_mfr_product_embeddings_product
  ON manufacturer_product_embeddings(product_id);
CREATE INDEX IF NOT EXISTS idx_stores_jeweller_id
  ON stores(jeweller_id);
CREATE INDEX IF NOT EXISTS idx_stores_manufacturer_id
  ON stores(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_store_id
  ON b2b_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_manufacturer_id
  ON b2b_orders(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_status
  ON b2b_orders(status);
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order_id
  ON b2b_order_items(b2b_order_id);
CREATE INDEX IF NOT EXISTS idx_b2b_order_status_history_order
  ON b2b_order_status_history(b2b_order_id);

-- ── 11. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE manufacturers                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_product_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_product_embeddings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                           ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_orders                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_status_history         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role all manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "service role all manufacturer_products" ON manufacturer_products;
DROP POLICY IF EXISTS "service role all manufacturer_product_images" ON manufacturer_product_images;
DROP POLICY IF EXISTS "service role all manufacturer_product_embeddings" ON manufacturer_product_embeddings;
DROP POLICY IF EXISTS "service role all stores" ON stores;
DROP POLICY IF EXISTS "service role all b2b_orders" ON b2b_orders;
DROP POLICY IF EXISTS "service role all b2b_order_items" ON b2b_order_items;
DROP POLICY IF EXISTS "service role all b2b_order_status_history" ON b2b_order_status_history;

CREATE POLICY "service role all manufacturers"
  ON manufacturers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all manufacturer_products"
  ON manufacturer_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all manufacturer_product_images"
  ON manufacturer_product_images FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all manufacturer_product_embeddings"
  ON manufacturer_product_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all stores"
  ON stores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_orders"
  ON b2b_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_order_items"
  ON b2b_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_order_status_history"
  ON b2b_order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
