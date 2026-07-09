import { getSupabaseServer } from './client';
import type { TryOnAssetRow } from './media';

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
 * List manufacturer products that have a try-on asset uploaded via the B20 flow.
 * Assets are stored in product_tryon_assets with manufacturer_product_id set.
 * The primary catalog image is used as the picker thumbnail.
 */
export async function listManufacturerTryOnProducts(): Promise<TryOnProduct[]> {
  const sb = getSupabaseServer();

  // Fetch try-on assets from product_tryon_assets where manufacturer_product_id is set.
  // Join manufacturer_products for name/design_number and manufacturer_product_images for thumbnail.
  const { data, error } = await sb
    .from('product_tryon_assets')
    .select(`
      id, asset_url, cloudinary_public_id, jewellery_type,
      pivot_x, pivot_y, x_offset, y_offset, scale_multiplier,
      rotation_offset_deg, width_mm, height_mm, is_active, created_at, updated_at,
      manufacturer_product_id,
      manufacturer_products!inner (
        id, name, design_number, status,
        manufacturer_product_images ( secure_url, is_primary, sort_order )
      )
    `)
    .eq('is_active', true)
    .not('manufacturer_product_id', 'is', null)
    .eq('manufacturer_products.status', 'active');

  if (error) throw new Error(`listManufacturerTryOnProducts: ${error.message}`);

  type MpRow = {
    id: string;
    name: string;
    design_number: string | null;
    status: string;
    manufacturer_product_images: { secure_url: string; is_primary: boolean; sort_order: number }[];
  };
  type AssetRow = {
    id: string;
    asset_url: string;
    cloudinary_public_id: string | null;
    jewellery_type: string | null;
    pivot_x: number | null;
    pivot_y: number | null;
    x_offset: number | null;
    y_offset: number | null;
    scale_multiplier: number | null;
    rotation_offset_deg: number | null;
    width_mm: number | null;
    height_mm: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    manufacturer_product_id: string;
    // Supabase returns !inner join as object (not array) when FK is many-to-one
    manufacturer_products: MpRow | MpRow[] | null;
  };

  const rows = (data as unknown as AssetRow[] | null) ?? [];

  // Group by manufacturer product (one product can have at most one try-on asset in B20 flow)
  const byProduct = new Map<string, TryOnProduct>();

  for (const row of rows) {
    const mpRaw = row.manufacturer_products;
    const mp: MpRow | null = Array.isArray(mpRaw) ? (mpRaw[0] ?? null) : mpRaw;
    if (!mp || mp.status !== 'active') continue;

    const imgs = (mp.manufacturer_product_images ?? []).slice().sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
      return a.sort_order - b.sort_order;
    });
    const primaryUrl = imgs[0]?.secure_url ?? null;

    const asset: TryOnAssetRow = {
      id: row.id,
      product_id: mp.id,
      cloudinary_public_id: row.cloudinary_public_id,
      asset_url: row.asset_url,
      jewellery_type: (row.jewellery_type ?? 'necklace') as TryOnAssetRow['jewellery_type'],
      pivot_x: row.pivot_x ?? 0.5,
      pivot_y: row.pivot_y ?? 0.5,
      x_offset: row.x_offset ?? 0,
      y_offset: row.y_offset ?? 0,
      scale_multiplier: row.scale_multiplier ?? 1,
      rotation_offset_deg: row.rotation_offset_deg ?? 0,
      width_mm: row.width_mm,
      height_mm: row.height_mm,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const existing = byProduct.get(mp.id);
    if (existing) {
      existing.assets.push(asset);
    } else {
      byProduct.set(mp.id, {
        id: mp.id,
        slug: mp.design_number ?? mp.id,
        name: mp.name,
        primary_image_url: primaryUrl,
        assets: [asset],
      });
    }
  }

  return Array.from(byProduct.values());
}
