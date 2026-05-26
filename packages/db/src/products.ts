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
  has_embedding: boolean;
};

export type ProductListFilters = {
  categoryId?: string;
  metal?: string;
  occasionTags?: string[];
  priceMin?: number;
  priceMax?: number;
  hasTryOn?: boolean;
  featured?: boolean;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
};

const LIST_COLUMNS = `
  id, jeweller_id, slug, sku, name, description, category_id, brand_id,
  metal, purity, gemstones, style_tags, occasion_tags,
  price_min, price_max, currency, weight_grams, stock_count,
  is_active, is_featured, created_at, updated_at,
  product_images ( id, product_id, cloudinary_public_id, url, width, height, alt, sort_order, is_primary ),
  product_tryon_assets ( id ),
  product_embeddings ( product_id )
`;

type RawProduct = ProductRow & {
  product_images: ProductImageRow[] | null;
  product_tryon_assets: { id: string }[] | null;
  product_embeddings: { product_id: string }[] | null;
};

function shape(row: RawProduct): ProductWithImages {
  const images = (row.product_images ?? []).slice().sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const primary = images[0] ?? null;
  const { product_images: _i, product_tryon_assets: tas, product_embeddings: embeddings, ...base } = row;
  return {
    ...base,
    images,
    primary_image_url: primary?.url ?? null,
    has_tryon: (tas?.length ?? 0) > 0,
    has_embedding: (embeddings?.length ?? 0) > 0,
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
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!filters.includeInactive) q = q.eq('is_active', true);
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

// ────────────────────────────────────────────────────────────────────────────
// Product CRUD (Phase 8) — every mutation enforces tenancy by hardcoding
// jeweller_id into the row on insert and into the where-clause on update/
// delete. The Hono routes additionally PIN-gate the calls.
// ────────────────────────────────────────────────────────────────────────────

export type CreateProductInput = {
  slug: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  metal?: string | null;
  purity?: string | null;
  gemstones?: string[];
  styleTags?: string[];
  occasionTags?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  weightGrams?: number | null;
  stockCount?: number;
  isActive?: boolean;
  isFeatured?: boolean;
};

export type UpdateProductInput = Partial<CreateProductInput>;

function toRowInsert(jewellerId: string, input: CreateProductInput) {
  return {
    jeweller_id: jewellerId,
    slug: input.slug,
    sku: input.sku ?? null,
    name: input.name,
    description: input.description ?? null,
    category_id: input.categoryId ?? null,
    brand_id: input.brandId ?? null,
    metal: input.metal ?? null,
    purity: input.purity ?? null,
    gemstones: input.gemstones ?? [],
    style_tags: input.styleTags ?? [],
    occasion_tags: input.occasionTags ?? [],
    price_min: input.priceMin ?? null,
    price_max: input.priceMax ?? null,
    weight_grams: input.weightGrams ?? null,
    stock_count: input.stockCount ?? 0,
    is_active: input.isActive ?? true,
    is_featured: input.isFeatured ?? false,
  };
}

function toRowPatch(input: UpdateProductInput) {
  const patch: Record<string, unknown> = {};
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.sku !== undefined) patch.sku = input.sku;
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId;
  if (input.brandId !== undefined) patch.brand_id = input.brandId;
  if (input.metal !== undefined) patch.metal = input.metal;
  if (input.purity !== undefined) patch.purity = input.purity;
  if (input.gemstones !== undefined) patch.gemstones = input.gemstones;
  if (input.styleTags !== undefined) patch.style_tags = input.styleTags;
  if (input.occasionTags !== undefined) patch.occasion_tags = input.occasionTags;
  if (input.priceMin !== undefined) patch.price_min = input.priceMin;
  if (input.priceMax !== undefined) patch.price_max = input.priceMax;
  if (input.weightGrams !== undefined) patch.weight_grams = input.weightGrams;
  if (input.stockCount !== undefined) patch.stock_count = input.stockCount;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.isFeatured !== undefined) patch.is_featured = input.isFeatured;
  return patch;
}

export async function createProduct(
  jewellerId: string,
  input: CreateProductInput,
): Promise<ProductRow> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .insert(toRowInsert(jewellerId, input))
    .select('*')
    .single();
  if (error) throw error;
  return data as ProductRow;
}

export async function updateProduct(
  jewellerId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductRow | null> {
  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from('products')
    .update(toRowPatch(input))
    .eq('id', productId)
    .eq('jeweller_id', jewellerId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as ProductRow | null) ?? null;
}

export async function deleteProduct(jewellerId: string, productId: string): Promise<boolean> {
  const sb = getSupabaseServer();
  const { error, count } = await sb
    .from('products')
    .delete({ count: 'exact' })
    .eq('id', productId)
    .eq('jeweller_id', jewellerId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Sales logging — one-tap "mark sold" from the product list. Feeds Phase 9.5
// inventory intelligence as the primary signal.
// ────────────────────────────────────────────────────────────────────────────

export type RecordSaleInput = {
  productId: string;
  quantity?: number;
  soldPrice?: number | null;
  customerAgeBand?: string | null;
  customerGender?: string | null;
  occasion?: string | null;
  notes?: string | null;
};

export async function recordProductSale(jewellerId: string, input: RecordSaleInput): Promise<void> {
  const sb = getSupabaseServer();

  // Ownership check — refuse if the product isn't ours.
  const { data: owner } = await sb
    .from('products')
    .select('id, stock_count')
    .eq('id', input.productId)
    .eq('jeweller_id', jewellerId)
    .maybeSingle();
  if (!owner) {
    throw new Error('Product not found for this shop');
  }

  const qty = input.quantity ?? 1;
  const { error: insertErr } = await sb.from('product_sales').insert({
    jeweller_id: jewellerId,
    product_id: input.productId,
    quantity: qty,
    sold_price: input.soldPrice ?? null,
    customer_age_band: input.customerAgeBand ?? null,
    customer_gender: input.customerGender ?? null,
    occasion: input.occasion ?? null,
    notes: input.notes ?? null,
  });
  if (insertErr) throw insertErr;

  // Best-effort stock decrement. We do this outside a transaction because
  // supabase-js doesn't expose pg transactions client-side — over-decrement
  // protection lives at the UI layer ("can't mark sold when stock is 0").
  const newStock = Math.max(0, ((owner as { stock_count: number }).stock_count ?? 0) - qty);
  await sb
    .from('products')
    .update({ stock_count: newStock })
    .eq('id', input.productId)
    .eq('jeweller_id', jewellerId);
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
