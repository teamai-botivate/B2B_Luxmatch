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
