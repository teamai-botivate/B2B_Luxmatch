-- Repair for Supabase projects where an older draft of 0005_b2b_platform.sql
-- was already applied. Run this once in the SQL editor, then rerun the updated
-- 0005_b2b_platform.sql and the B2B seed block.

ALTER TABLE manufacturer_products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS weight_grams numeric(8,3),
  ADD COLUMN IF NOT EXISTS base_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS metal text,
  ADD COLUMN IF NOT EXISTS purity text,
  ADD COLUMN IF NOT EXISTS gemstones text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS occasion_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS style_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_order_qty integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE manufacturer_products
SET
  sku = COALESCE(sku, 'LEGACY-' || left(id::text, 8)),
  name = COALESCE(name, 'Legacy manufacturer product'),
  base_price = COALESCE(base_price, 0),
  gemstones = COALESCE(gemstones, '{}'),
  occasion_tags = COALESCE(occasion_tags, '{}'),
  style_tags = COALESCE(style_tags, '{}'),
  min_order_qty = COALESCE(min_order_qty, 1),
  status = COALESCE(status, 'draft');

ALTER TABLE manufacturer_products
  ALTER COLUMN sku SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN base_price SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manufacturer_products_manufacturer_id_sku_key'
  ) THEN
    ALTER TABLE manufacturer_products
      ADD CONSTRAINT manufacturer_products_manufacturer_id_sku_key
      UNIQUE (manufacturer_id, sku);
  END IF;
END $$;

ALTER TABLE manufacturer_product_images
  ADD COLUMN IF NOT EXISTS cloudinary_public_id text,
  ADD COLUMN IF NOT EXISTS secure_url text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_tryon boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS jewellery_type text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE manufacturer_product_images
SET
  cloudinary_public_id = COALESCE(cloudinary_public_id, 'legacy/' || id::text),
  secure_url = COALESCE(secure_url, ''),
  is_primary = COALESCE(is_primary, true),
  is_tryon = COALESCE(is_tryon, false),
  sort_order = COALESCE(sort_order, 0);

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE b2b_orders
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfilled_product_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_items integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) DEFAULT 0;

UPDATE b2b_orders
SET
  delivery_address = COALESCE(delivery_address, 'Demo store address'),
  total_items = COALESCE(total_items, 0),
  total_amount = COALESCE(total_amount, 0);

ALTER TABLE b2b_orders
  ALTER COLUMN delivery_address SET NOT NULL;

ALTER TABLE manufacturer_product_embeddings
  ADD COLUMN IF NOT EXISTS qdrant_point_id text,
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS dimensions integer,
  ADD COLUMN IF NOT EXISTS indexed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS image_url text;

UPDATE manufacturer_product_embeddings
SET qdrant_point_id = COALESCE(qdrant_point_id, product_id::text);

ALTER TABLE manufacturer_product_embeddings
  ALTER COLUMN qdrant_point_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'manufacturer_product_embeddings'
      AND column_name = 'qdrant_id'
  ) THEN
    ALTER TABLE manufacturer_product_embeddings ALTER COLUMN qdrant_id DROP NOT NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "service role all manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "service role all manufacturer_products" ON manufacturer_products;
DROP POLICY IF EXISTS "service role all manufacturer_product_images" ON manufacturer_product_images;
DROP POLICY IF EXISTS "service role all manufacturer_product_embeddings" ON manufacturer_product_embeddings;
DROP POLICY IF EXISTS "service role all stores" ON stores;
DROP POLICY IF EXISTS "service role all b2b_orders" ON b2b_orders;
DROP POLICY IF EXISTS "service role all b2b_order_items" ON b2b_order_items;
DROP POLICY IF EXISTS "service role all b2b_order_status_history" ON b2b_order_status_history;
