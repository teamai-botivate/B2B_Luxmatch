-- 0007_tryon_assets.sql
-- B20: AR Try-On asset management
-- Adds has_tryon flag to manufacturer_products and extends product_tryon_assets
-- to support manufacturer products directly (before B2B order fulfillment).
-- Apply AFTER 0006_guest_orders.sql

-- 1. has_tryon flag on manufacturer products
ALTER TABLE manufacturer_products
  ADD COLUMN IF NOT EXISTS has_tryon boolean NOT NULL DEFAULT false;

-- 2. Extend product_tryon_assets to accept manufacturer_product_id
--    product_id becomes nullable so the row can reference either
--    a jeweller product (fulfilled) OR a manufacturer product (source).
ALTER TABLE product_tryon_assets
  ADD COLUMN IF NOT EXISTS manufacturer_product_id uuid
    REFERENCES manufacturer_products(id) ON DELETE CASCADE;

-- Make product_id nullable (was NOT NULL before)
ALTER TABLE product_tryon_assets
  ALTER COLUMN product_id DROP NOT NULL;

-- Index for fast lookup by manufacturer product
CREATE INDEX IF NOT EXISTS idx_tryon_assets_mfr_product
  ON product_tryon_assets(manufacturer_product_id)
  WHERE manufacturer_product_id IS NOT NULL;

-- Constraint: at least one of product_id / manufacturer_product_id must be set
ALTER TABLE product_tryon_assets
  ADD CONSTRAINT tryon_assets_has_owner
  CHECK (product_id IS NOT NULL OR manufacturer_product_id IS NOT NULL);
