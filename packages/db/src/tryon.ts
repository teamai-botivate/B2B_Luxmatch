import { getSupabaseServer } from './client';
import type { TryOnAssetRow } from './media';
import type { ManufacturerProductImageRow } from './b2b';

export type TryOnProduct = {
  id: string;
  slug: string;
  name: string;
  primary_image_url: string | null;
  assets: TryOnAssetRow[];
};

/**
 * List every product in this shop that has at least one active try-on asset.
 * Joins products → product_images (for the picker thumbnail) and
 * product_tryon_assets (the actual PNG + calibration the engine consumes).
 */
export async function listTryOnProducts(jewellerId: string): Promise<TryOnProduct[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .select(`
      id, slug, name,
      product_images ( url, is_primary, sort_order ),
      product_tryon_assets!inner (
        id, product_id, cloudinary_public_id, asset_url, jewellery_type,
        pivot_x, pivot_y, x_offset, y_offset, scale_multiplier,
        rotation_offset_deg, width_mm, height_mm, is_active,
        created_at, updated_at
      )
    `)
    .eq('jeweller_id', jewellerId)
    .eq('is_active', true)
    .eq('product_tryon_assets.is_active', true);

  if (error) throw error;

  const rows = (data as Array<{
    id: string;
    slug: string;
    name: string;
    product_images: { url: string; is_primary: boolean; sort_order: number }[];
    product_tryon_assets: TryOnAssetRow[];
  }> | null) ?? [];

  return rows.map((r) => {
    const images = (r.product_images ?? []).slice().sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      primary_image_url: images[0]?.url ?? null,
      assets: r.product_tryon_assets ?? [],
    };
  });
}

/**
 * List manufacturer products that have at least one try-on image (is_tryon=true).
 * Returns TryOnProduct shape so the try-on page can work with either source.
 * Each image row is mapped into a TryOnAssetRow — calibration defaults to neutral.
 */
export async function listManufacturerTryOnProducts(): Promise<TryOnProduct[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('manufacturer_products')
    .select(`
      id, name, design_number, category,
      manufacturer_product_images!inner (
        id, product_id, cloudinary_public_id, secure_url, is_primary, is_tryon, jewellery_type, sort_order
      )
    `)
    .eq('status', 'active')
    .eq('manufacturer_product_images.is_tryon', true);

  if (error) throw error;

  const rows = (data as Array<{
    id: string;
    name: string;
    design_number: string | null;
    category: string | null;
    manufacturer_product_images: ManufacturerProductImageRow[];
  }> | null) ?? [];

  return rows.map((r) => {
    const imgs = (r.manufacturer_product_images ?? []);
    const primary = imgs.find((i) => i.is_primary) ?? imgs[0] ?? null;
    const assets: TryOnAssetRow[] = imgs.map((img) => ({
      id: img.id,
      product_id: r.id,
      cloudinary_public_id: img.cloudinary_public_id,
      asset_url: img.secure_url,
      jewellery_type: (img.jewellery_type ?? 'necklace') as TryOnAssetRow['jewellery_type'],
      pivot_x: 0.5,
      pivot_y: 0.5,
      x_offset: 0,
      y_offset: 0,
      scale_multiplier: 1,
      rotation_offset_deg: 0,
      width_mm: null,
      height_mm: null,
      is_active: true,
      created_at: '',
      updated_at: '',
    }));
    return {
      id: r.id,
      slug: r.design_number ?? r.id,
      name: r.name,
      primary_image_url: primary?.secure_url ?? null,
      assets,
    };
  });
}
