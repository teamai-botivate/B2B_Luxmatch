import { compare } from 'bcryptjs';
import { getSupabaseServer } from './client';

export type ManufacturerTryOnAssetInput = {
  manufacturerProductId: string;
  assetUrl: string;
  cloudinaryPublicId?: string | null;
  jewelleryType: string;
  pivotX?: number;
  pivotY?: number;
  xOffset?: number;
  yOffset?: number;
  scaleMultiplier?: number;
  rotationOffsetDeg?: number;
};

export type ManufacturerRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ManufacturerPublic = Omit<ManufacturerRow, 'password_hash'>;

export async function getManufacturerByEmail(email: string): Promise<ManufacturerRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturers')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerByEmail: ${error.message}`);
  return data as ManufacturerRow | null;
}

export async function getManufacturerById(id: string): Promise<ManufacturerPublic | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturers')
    .select('id, name, email, is_active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerById: ${error.message}`);
  return data as ManufacturerPublic | null;
}

export async function verifyManufacturerPassword(
  email: string,
  password: string,
): Promise<ManufacturerRow | null> {
  const row = await getManufacturerByEmail(email);
  if (!row) return null;
  const ok = await compare(password, row.password_hash);
  return ok ? row : null;
}

export async function addManufacturerTryOnAsset(
  input: ManufacturerTryOnAssetInput,
): Promise<void> {
  const sb = getSupabaseServer();
  // Remove any existing asset for this manufacturer product first
  await sb
    .from('product_tryon_assets')
    .delete()
    .eq('manufacturer_product_id', input.manufacturerProductId);

  const { error } = await sb.from('product_tryon_assets').insert({
    manufacturer_product_id: input.manufacturerProductId,
    product_id: null,
    cloudinary_public_id: input.cloudinaryPublicId ?? null,
    asset_url: input.assetUrl,
    jewellery_type: input.jewelleryType,
    pivot_x: input.pivotX ?? 0.5,
    pivot_y: input.pivotY ?? 0.5,
    x_offset: input.xOffset ?? 0,
    y_offset: input.yOffset ?? 0,
    scale_multiplier: input.scaleMultiplier ?? 1.0,
    rotation_offset_deg: input.rotationOffsetDeg ?? 0,
    is_active: true,
  });
  if (error) throw new Error(`addManufacturerTryOnAsset: ${error.message}`);

  // Set has_tryon = true on the product
  const { error: flagError } = await sb
    .from('manufacturer_products')
    .update({ has_tryon: true, updated_at: new Date().toISOString() })
    .eq('id', input.manufacturerProductId);
  if (flagError) throw new Error(`addManufacturerTryOnAsset flag: ${flagError.message}`);
}

export async function removeManufacturerTryOnAsset(productId: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('product_tryon_assets')
    .delete()
    .eq('manufacturer_product_id', productId);
  if (error) throw new Error(`removeManufacturerTryOnAsset: ${error.message}`);

  const { error: flagError } = await sb
    .from('manufacturer_products')
    .update({ has_tryon: false, updated_at: new Date().toISOString() })
    .eq('id', productId);
  if (flagError) throw new Error(`removeManufacturerTryOnAsset flag: ${flagError.message}`);
}

export async function getManufacturerTryOnAsset(
  manufacturerProductId: string,
): Promise<{ asset_url: string; jewellery_type: string; cloudinary_public_id: string | null } | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('product_tryon_assets')
    .select('asset_url, jewellery_type, cloudinary_public_id')
    .eq('manufacturer_product_id', manufacturerProductId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(`getManufacturerTryOnAsset: ${error.message}`);
  return data as { asset_url: string; jewellery_type: string; cloudinary_public_id: string | null } | null;
}
