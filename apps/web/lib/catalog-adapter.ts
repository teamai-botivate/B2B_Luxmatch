/**
 * Adapts the API's ProductWithImages shape to the frontend's Product type so
 * all existing components (ProductCard, ProductDetailPanel, ProductGrid) keep
 * working without changes.  The real UUID id is preserved so the cart works.
 */
import type { Category, Occasion, Product, ProductImage } from '@/lib/mock-data';

/**
 * Inline SVG placeholder shown when a product has no image yet (e.g. a real
 * product created before its Cloudinary photo is uploaded). Keeps the grid from
 * rendering a broken <img>. Real product_images.url always takes precedence.
 */
export const PLACEHOLDER_IMAGE_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>` +
      `<rect width='100%' height='100%' fill='#F5F0EB'/>` +
      `<text x='50%' y='50%' fill='#B8A98C' font-family='sans-serif' font-size='28'` +
      ` text-anchor='middle' dominant-baseline='middle'>No image</text></svg>`,
  );

/** Primary image URL for a product, with a safe placeholder fallback. */
export function productImageUrl(images: Pick<ProductImage, 'url'>[] | undefined): string {
  return images?.[0]?.url ?? PLACEHOLDER_IMAGE_URL;
}

export type ApiCategory = { id: string; name: string; slug: string | null };

export type ApiImage = {
  id: string;
  url: string;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
};

export type ApiProduct = {
  id: string;
  jeweller_id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  metal: string | null;
  purity: string | null;
  weight_grams: number | null;
  gemstones: string[];
  style_tags: string[];
  occasion_tags: string[];
  price_min: number | null;
  price_max: number | null;
  stock_count: number;
  is_featured: boolean;
  is_active: boolean;
  has_tryon: boolean;
  has_embedding: boolean;
  primary_image_url: string | null;
  images: ApiImage[];
  created_at: string;
};

export function adaptProduct(p: ApiProduct, categories: ApiCategory[]): Product {
  const cat = categories.find(c => c.id === p.category_id);
  const catName = cat?.name ?? 'Jewellery';

  const sortedImages = [...(p.images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: catName as Category,
    description: p.description ?? '',
    price: p.price_min ?? 0,
    originalPrice:
      p.price_max && p.price_max > (p.price_min ?? 0) ? p.price_max : undefined,
    metal: p.metal ?? 'Gold',
    purity: p.purity ?? '',
    weight: p.weight_grams ? `${p.weight_grams}g` : '',
    gemstones: p.gemstones?.length ? p.gemstones.join(', ') : undefined,
    styleTags: p.style_tags ?? [],
    isFeatured: p.is_featured,
    hasTryOn: p.has_tryon,
    jewellerId: p.jeweller_id,
    occasions: (p.occasion_tags ?? []) as Occasion[],
    images: sortedImages.map(img => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? p.name,
    })),
  };
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: ApiCategory[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchProducts(params?: {
  limit?: number;
  offset?: number;
  featured?: boolean;
  hasTryOn?: boolean;
}): Promise<{ products: ApiProduct[]; total: number }> {
  try {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.featured !== undefined) qs.set('featured', String(params.featured));
    if (params?.hasTryOn !== undefined) qs.set('has_tryon', String(params.hasTryOn));

    const url = `/api/products${qs.size ? `?${qs}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { products: [], total: 0 };
    const json = (await res.json()) as { data?: { products: ApiProduct[]; total: number } };
    return json.data ?? { products: [], total: 0 };
  } catch {
    return { products: [], total: 0 };
  }
}

export type ApiCollection = {
  id: string;
  jeweller_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export async function fetchCollections(): Promise<ApiCollection[]> {
  try {
    const res = await fetch('/api/collections', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: ApiCollection[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchProductsByIds(ids: string[]): Promise<ApiProduct[]> {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return [];
  try {
    const res = await fetch(`/api/products/by-ids?ids=${encodeURIComponent(clean.join(','))}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { products: ApiProduct[] } };
    return json.data?.products ?? [];
  } catch {
    return [];
  }
}

export async function fetchProductBySlug(slug: string): Promise<ApiProduct | null> {
  try {
    const res = await fetch(`/api/products/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: ApiProduct };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// ── Manufacturer catalog adapter (C12) ──────────────────────────────────────

export type ManufacturerProductImage = {
  id: string;
  secure_url: string;
  is_primary: boolean;
  is_tryon: boolean;
  sort_order: number;
};

export type ManufacturerProduct = {
  id: string;
  manufacturer_id: string;
  sku: string;
  design_number: string | null;
  name: string;
  category: string | null;
  description: string | null;
  weight_grams: number | null;
  purity: string | null;
  gemstones: string[];
  occasion_tags: string[];
  style_tags: string[];
  status: string;
  has_tryon: boolean;
  images: ManufacturerProductImage[];
};

export function adaptManufacturerProduct(p: ManufacturerProduct): Product {
  const sortedImages = [...(p.images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  return {
    id: p.id,
    slug: p.design_number ?? p.id,
    name: p.name,
    category: (p.category ?? 'Jewellery') as Category,
    description: p.description ?? '',
    price: 0,
    metal: 'Gold',
    purity: p.purity ?? '',
    weight: p.weight_grams ? `${p.weight_grams}g` : '',
    gemstones: p.gemstones?.length ? p.gemstones.join(', ') : undefined,
    styleTags: p.style_tags ?? [],
    isFeatured: false,
    hasTryOn: p.has_tryon,
    jewellerId: p.manufacturer_id,
    occasions: (p.occasion_tags ?? []) as Occasion[],
    images: sortedImages.map((img) => ({
      id: img.id,
      url: img.secure_url,
      alt: p.name,
    })),
  };
}

export async function fetchManufacturerProductByDesignNumberOrId(
  idOrDesignNumber: string,
): Promise<ManufacturerProduct | null> {
  try {
    const res = await fetch(`/api/kiosk/catalog/${encodeURIComponent(idOrDesignNumber)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: ManufacturerProduct };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchManufacturerCatalog(params?: {
  category?: string;
  search?: string;
  hasTryOn?: boolean;
}): Promise<ManufacturerProduct[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    if (params?.hasTryOn !== undefined) qs.set('hasTryOn', String(params.hasTryOn));
    const url = `/api/kiosk/catalog${qs.size ? `?${qs}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: ManufacturerProduct[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
