import { getSupabaseServer } from './client';
import type { ProductImageRow } from './products';

/**
 * Supabase types a single-row inner join as an array when the relation
 * cardinality is one-to-many in the schema. At runtime we only ever get a
 * single related row, but the typing is conservative. This helper handles
 * both shapes safely.
 */
function extractJewellerId(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const products = (row as { products?: unknown }).products;
  if (Array.isArray(products)) {
    const first = products[0];
    return first && typeof first === 'object' && 'jeweller_id' in first
      ? (first as { jeweller_id: string }).jeweller_id
      : null;
  }
  if (products && typeof products === 'object' && 'jeweller_id' in products) {
    return (products as { jeweller_id: string }).jeweller_id;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Product images
//
// All helpers verify the parent product belongs to the given jewellerId, so
// the Hono routes can stay terse: pass jewellerId in, get tenant safety out.
// ────────────────────────────────────────────────────────────────────────────

async function assertProductBelongsToJeweller(
  productId: string,
  jewellerId: string,
): Promise<boolean> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('jeweller_id', jewellerId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export type AddProductImageInput = {
  productId: string;
  cloudinaryPublicId: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
};

export async function addProductImage(
  jewellerId: string,
  input: AddProductImageInput,
): Promise<ProductImageRow> {
  if (!(await assertProductBelongsToJeweller(input.productId, jewellerId))) {
    throw new Error('Product does not belong to this shop');
  }
  const sb = getSupabaseServer();

  // If this image is marked primary, demote any existing primary first.
  if (input.isPrimary) {
    const { error: demoteError } = await sb
      .from('product_images')
      .update({ is_primary: false })
      .eq('product_id', input.productId)
      .eq('is_primary', true);
    if (demoteError) throw demoteError;
  }

  const { data, error } = await sb
    .from('product_images')
    .insert({
      product_id: input.productId,
      cloudinary_public_id: input.cloudinaryPublicId,
      url: input.url,
      width: input.width ?? null,
      height: input.height ?? null,
      alt: input.alt ?? null,
      sort_order: input.sortOrder ?? 0,
      is_primary: input.isPrimary ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProductImageRow;
}

export async function removeProductImageByPublicId(
  jewellerId: string,
  cloudinaryPublicId: string,
): Promise<boolean> {
  const sb = getSupabaseServer();
  // The join keeps the delete tenant-safe: we only delete rows whose
  // product's jeweller_id matches.
  const { data: img, error: fetchErr } = await sb
    .from('product_images')
    .select('id, product_id, products!inner(jeweller_id)')
    .eq('cloudinary_public_id', cloudinaryPublicId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!img) return false;
  const ownerJewellerId = extractJewellerId(img);
  if (ownerJewellerId !== jewellerId) return false;
  const { error: delErr } = await sb
    .from('product_images')
    .delete()
    .eq('id', (img as { id: string }).id);
  if (delErr) throw delErr;
  return true;
}

export async function setPrimaryProductImage(
  jewellerId: string,
  imageId: string,
): Promise<void> {
  const sb = getSupabaseServer();
  // Verify ownership via the join.
  const { data: img, error: fetchErr } = await sb
    .from('product_images')
    .select('id, product_id, products!inner(jeweller_id)')
    .eq('id', imageId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!img) throw new Error('Image not found');
  const ownerJewellerId = extractJewellerId(img);
  if (ownerJewellerId !== jewellerId) throw new Error('Image not found');
  const productId = (img as { product_id: string }).product_id;

  const { error: demoteErr } = await sb
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', productId);
  if (demoteErr) throw demoteErr;

  const { error: promoteErr } = await sb
    .from('product_images')
    .update({ is_primary: true })
    .eq('id', imageId);
  if (promoteErr) throw promoteErr;
}

// ────────────────────────────────────────────────────────────────────────────
// Try-on assets
// ────────────────────────────────────────────────────────────────────────────

export type AddTryOnAssetInput = {
  productId: string;
  cloudinaryPublicId: string;
  assetUrl: string;
  jewelleryType:
    | 'necklace'
    | 'earring_left'
    | 'earring_right'
    | 'ring_index'
    | 'ring_middle'
    | 'bangle';
  pivotX?: number;
  pivotY?: number;
  xOffset?: number;
  yOffset?: number;
  scaleMultiplier?: number;
  rotationOffsetDeg?: number;
  widthMm?: number;
  heightMm?: number;
  isActive?: boolean;
};

export type TryOnAssetRow = {
  id: string;
  product_id: string;
  cloudinary_public_id: string | null;
  asset_url: string;
  jewellery_type: AddTryOnAssetInput['jewelleryType'];
  pivot_x: number;
  pivot_y: number;
  x_offset: number;
  y_offset: number;
  scale_multiplier: number;
  rotation_offset_deg: number;
  width_mm: number | null;
  height_mm: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function addTryOnAsset(
  jewellerId: string,
  input: AddTryOnAssetInput,
): Promise<TryOnAssetRow> {
  if (!(await assertProductBelongsToJeweller(input.productId, jewellerId))) {
    throw new Error('Product does not belong to this shop');
  }
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('product_tryon_assets')
    .insert({
      product_id: input.productId,
      cloudinary_public_id: input.cloudinaryPublicId,
      asset_url: input.assetUrl,
      jewellery_type: input.jewelleryType,
      pivot_x: input.pivotX ?? 0.5,
      pivot_y: input.pivotY ?? 0.5,
      x_offset: input.xOffset ?? 0,
      y_offset: input.yOffset ?? 0,
      scale_multiplier: input.scaleMultiplier ?? 1.0,
      rotation_offset_deg: input.rotationOffsetDeg ?? 0,
      width_mm: input.widthMm ?? null,
      height_mm: input.heightMm ?? null,
      is_active: input.isActive ?? true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as TryOnAssetRow;
}

/**
 * Patch calibration / activation on an existing asset. The join clause is
 * what enforces tenancy — we never let a different jeweller's row update,
 * even if the id is leaked.
 */
export async function updateTryOnAsset(
  jewellerId: string,
  assetId: string,
  patch: Partial<{
    pivotX: number;
    pivotY: number;
    xOffset: number;
    yOffset: number;
    scaleMultiplier: number;
    rotationOffsetDeg: number;
    widthMm: number | null;
    heightMm: number | null;
    isActive: boolean;
    jewelleryType: AddTryOnAssetInput['jewelleryType'];
  }>,
): Promise<TryOnAssetRow | null> {
  const sb = getSupabaseServer();

  // Verify ownership via the join, then apply the update by primary key.
  const { data: row, error: fetchErr } = await sb
    .from('product_tryon_assets')
    .select('id, products!inner(jeweller_id)')
    .eq('id', assetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row || extractJewellerId(row) !== jewellerId) return null;

  const dbPatch: Record<string, unknown> = {};
  if (patch.pivotX !== undefined) dbPatch.pivot_x = patch.pivotX;
  if (patch.pivotY !== undefined) dbPatch.pivot_y = patch.pivotY;
  if (patch.xOffset !== undefined) dbPatch.x_offset = patch.xOffset;
  if (patch.yOffset !== undefined) dbPatch.y_offset = patch.yOffset;
  if (patch.scaleMultiplier !== undefined) dbPatch.scale_multiplier = patch.scaleMultiplier;
  if (patch.rotationOffsetDeg !== undefined)
    dbPatch.rotation_offset_deg = patch.rotationOffsetDeg;
  if (patch.widthMm !== undefined) dbPatch.width_mm = patch.widthMm;
  if (patch.heightMm !== undefined) dbPatch.height_mm = patch.heightMm;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;
  if (patch.jewelleryType !== undefined) dbPatch.jewellery_type = patch.jewelleryType;

  const { data, error } = await sb
    .from('product_tryon_assets')
    .update(dbPatch)
    .eq('id', assetId)
    .select('*')
    .single();
  if (error) throw error;
  return data as TryOnAssetRow;
}

/**
 * Delete by row id (used by the jeweller dashboard). Returns the
 * cloudinary_public_id so the caller can also clean up the Cloudinary asset.
 */
export async function removeTryOnAssetById(
  jewellerId: string,
  assetId: string,
): Promise<{ cloudinaryPublicId: string | null } | null> {
  const sb = getSupabaseServer();
  const { data: row, error: fetchErr } = await sb
    .from('product_tryon_assets')
    .select('id, cloudinary_public_id, products!inner(jeweller_id)')
    .eq('id', assetId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row || extractJewellerId(row) !== jewellerId) return null;

  const { error: delErr } = await sb
    .from('product_tryon_assets')
    .delete()
    .eq('id', assetId);
  if (delErr) throw delErr;

  return {
    cloudinaryPublicId:
      (row as { cloudinary_public_id: string | null }).cloudinary_public_id ?? null,
  };
}

export async function removeTryOnAssetByPublicId(
  jewellerId: string,
  cloudinaryPublicId: string,
): Promise<boolean> {
  const sb = getSupabaseServer();
  const { data: row, error: fetchErr } = await sb
    .from('product_tryon_assets')
    .select('id, product_id, products!inner(jeweller_id)')
    .eq('cloudinary_public_id', cloudinaryPublicId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) return false;
  const ownerJewellerId = extractJewellerId(row);
  if (ownerJewellerId !== jewellerId) return false;
  const { error: delErr } = await sb
    .from('product_tryon_assets')
    .delete()
    .eq('id', (row as { id: string }).id);
  if (delErr) throw delErr;
  return true;
}
