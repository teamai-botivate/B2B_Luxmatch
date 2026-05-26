import { getSupabaseServer } from './client';

// ────────────────────────────────────────────────────────────────────────────
// Row + view types
// ────────────────────────────────────────────────────────────────────────────

export type ProductImageRow = {
  id: string;
  product_id: string;
  cloudinary_public_id: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type ProductRow = {
  id: string;
  jeweller_id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  metal: string | null;
  purity: string | null;
  gemstones: string[];
  style_tags: string[];
  occasion_tags: string[];
  price_min: number | null;
  price_max: number | null;
  currency: string;
  weight_grams: number | null;
  stock_count: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithImages = ProductRow & {
  primary_image_url: string | null;
  images: ProductImageRow[];
  has_tryon: boolean;
};

export type ProductListFilters = {
  categoryId?: string;
  metal?: string;
  occasionTags?: string[];
  priceMin?: number;
  priceMax?: number;
  hasTryOn?: boolean;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

const LIST_COLUMNS = `
  id, jeweller_id, slug, sku, name, description, category_id, brand_id,
  metal, purity, gemstones, style_tags, occasion_tags,
  price_min, price_max, currency, weight_grams, stock_count,
  is_active, is_featured, created_at, updated_at,
  product_images ( id, product_id, cloudinary_public_id, url, width, height, alt, sort_order, is_primary ),
  product_tryon_assets ( id )
`;

type RawProduct = ProductRow & {
  product_images: ProductImageRow[] | null;
  product_tryon_assets: { id: string }[] | null;
};

function shape(row: RawProduct): ProductWithImages {
  const images = (row.product_images ?? []).slice().sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const primary = images[0] ?? null;
  const { product_images: _i, product_tryon_assets: tas, ...base } = row;
  return {
    ...base,
    images,
    primary_image_url: primary?.url ?? null,
    has_tryon: (tas?.length ?? 0) > 0,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Queries — ALL require an explicit jewellerId. No accidental cross-tenant
// reads.
// ────────────────────────────────────────────────────────────────────────────

export async function listProducts(
  jewellerId: string,
  filters: ProductListFilters = {},
): Promise<{ products: ProductWithImages[]; total: number }> {
  const sb = getSupabaseServer();
  const limit = Math.min(filters.limit ?? 60, 200);
  const offset = filters.offset ?? 0;

  let q = sb
    .from('products')
    .select(LIST_COLUMNS, { count: 'exact' })
    .eq('jeweller_id', jewellerId)
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.metal) q = q.eq('metal', filters.metal);
  if (filters.featured !== undefined) q = q.eq('is_featured', filters.featured);
  if (filters.priceMin !== undefined) q = q.gte('price_min', filters.priceMin);
  if (filters.priceMax !== undefined) q = q.lte('price_max', filters.priceMax);
  if (filters.occasionTags && filters.occasionTags.length > 0) {
    q = q.overlaps('occasion_tags', filters.occasionTags);
  }

  const { data, count, error } = await q;
  if (error) throw error;
  const products = (data as RawProduct[] | null ?? []).map(shape);
  // hasTryOn is post-filter because Supabase does not easily filter on a
  // joined inner-array existence. We do it client-side and pay a small
  // pagination skew cost for now.
  const filtered = filters.hasTryOn
    ? products.filter((p) => p.has_tryon)
    : products;
  return { products: filtered, total: count ?? filtered.length };
}

export async function getProductBySlug(
  jewellerId: string,
  slug: string,
): Promise<ProductWithImages | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .select(LIST_COLUMNS)
    .eq('jeweller_id', jewellerId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? shape(data as RawProduct) : null;
}

export async function getProductById(
  jewellerId: string,
  id: string,
): Promise<ProductWithImages | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .select(LIST_COLUMNS)
    .eq('jeweller_id', jewellerId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? shape(data as RawProduct) : null;
}

/**
 * Lightweight bulk fetch by id list. Used by search routes to hydrate
 * scored Qdrant results in a single round-trip.
 */
export async function getProductsByIds(
  jewellerId: string,
  ids: string[],
): Promise<ProductWithImages[]> {
  if (!ids.length) return [];
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .select(LIST_COLUMNS)
    .eq('jeweller_id', jewellerId)
    .in('id', ids);
  if (error) throw error;
  return (data as RawProduct[] | null ?? []).map(shape);
}

export async function fullTextSearchProducts(
  jewellerId: string,
  query: string,
  limit = 20,
): Promise<ProductWithImages[]> {
  const sb = getSupabaseServer();
  const cleaned = query.trim();
  if (!cleaned) return [];
  const { data, error } = await sb
    .from('products')
    .select(LIST_COLUMNS)
    .eq('jeweller_id', jewellerId)
    .eq('is_active', true)
    .textSearch('search_vector', cleaned, { type: 'websearch' })
    .limit(limit);
  if (error) throw error;
  return (data as RawProduct[] | null ?? []).map(shape);
}
