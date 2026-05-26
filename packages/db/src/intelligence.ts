import type { ProductDemandSnapshot } from '@luxematch/intelligence';

import { getSupabaseServer } from './client';

type ProductDemandRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  metal: string | null;
  occasion_tags: string[] | null;
  price_min: number | null;
  stock_count: number;
  categories?: { name: string | null } | { name: string | null }[] | null;
  product_images?: Array<{
    url: string | null;
    is_primary: boolean | null;
    sort_order: number | null;
  }> | null;
};

type SaleRow = {
  product_id: string | null;
  quantity: number | null;
  sold_price: number | null;
  sold_at: string;
};

type EventRow = {
  product_id: string | null;
  created_at: string;
};

export type DashboardSummary = {
  views7: number;
  views30: number;
  tryons7: number;
  tryons30: number;
  sales30: number;
  revenue30: number;
  products: number;
};

export type RecordSaleInput = {
  productId: string;
  quantity: number;
  soldPrice?: number;
  soldAt?: string;
  occasion?: string;
  notes?: string;
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function countRows<T extends { product_id: string | null; created_at?: string; sold_at?: string }>(
  rows: T[],
  productId: string,
  sinceIso: string,
  dateField: 'created_at' | 'sold_at',
): number {
  const sinceMs = Date.parse(sinceIso);
  return rows.reduce((sum, row) => {
    if (row.product_id !== productId) return sum;
    const rawDate = row[dateField];
    if (!rawDate || Date.parse(rawDate) < sinceMs) return sum;
    return sum + 1;
  }, 0);
}

function salesCount(rows: SaleRow[], productId: string, sinceIso: string): number {
  const sinceMs = Date.parse(sinceIso);
  return rows.reduce((sum, row) => {
    if (row.product_id !== productId || Date.parse(row.sold_at) < sinceMs) return sum;
    return sum + (row.quantity ?? 1);
  }, 0);
}

function revenue(rows: SaleRow[], productId: string, sinceIso: string): number {
  const sinceMs = Date.parse(sinceIso);
  return rows.reduce((sum, row) => {
    if (row.product_id !== productId || Date.parse(row.sold_at) < sinceMs) return sum;
    return sum + Number(row.sold_price ?? 0) * (row.quantity ?? 1);
  }, 0);
}

function latestSaleAt(rows: SaleRow[], productId: string): string | null {
  return (
    rows
      .filter((row) => row.product_id === productId)
      .sort((a, b) => Date.parse(b.sold_at) - Date.parse(a.sold_at))[0]?.sold_at ?? null
  );
}

function categoryName(row: ProductDemandRow): string | null {
  const relation = row.categories;
  if (Array.isArray(relation)) return relation[0]?.name ?? null;
  return relation?.name ?? null;
}

function primaryImage(row: ProductDemandRow): string | null {
  return (
    (row.product_images ?? [])
      .slice()
      .sort((a, b) => {
        if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      })[0]?.url ?? null
  );
}

export async function getDashboardSummary(jewellerId: string): Promise<DashboardSummary> {
  const sb = getSupabaseServer();
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [products, views7, views30, tryons7, tryons30, sales30] = await Promise.all([
    sb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('jeweller_id', jewellerId)
      .eq('is_active', true),
    sb
      .from('product_views')
      .select('id', { count: 'exact', head: true })
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since7),
    sb
      .from('product_views')
      .select('id', { count: 'exact', head: true })
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since30),
    sb
      .from('tryon_events')
      .select('id', { count: 'exact', head: true })
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since7),
    sb
      .from('tryon_events')
      .select('id', { count: 'exact', head: true })
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since30),
    sb
      .from('product_sales')
      .select('quantity, sold_price')
      .eq('jeweller_id', jewellerId)
      .gte('sold_at', since30),
  ]);

  for (const result of [products, views7, views30, tryons7, tryons30, sales30]) {
    if (result.error) throw result.error;
  }

  const saleRows = (sales30.data ?? []) as Array<{ quantity: number | null; sold_price: number | null }>;
  return {
    views7: views7.count ?? 0,
    views30: views30.count ?? 0,
    tryons7: tryons7.count ?? 0,
    tryons30: tryons30.count ?? 0,
    sales30: saleRows.reduce((sum, row) => sum + (row.quantity ?? 1), 0),
    revenue30: saleRows.reduce(
      (sum, row) => sum + Number(row.sold_price ?? 0) * (row.quantity ?? 1),
      0,
    ),
    products: products.count ?? 0,
  };
}

export async function getProductDemandSnapshots(
  jewellerId: string,
): Promise<ProductDemandSnapshot[]> {
  const sb = getSupabaseServer();
  const since90 = daysAgo(90);
  const since30 = daysAgo(30);

  const [products, sales, views, tryons] = await Promise.all([
    sb
      .from('products')
      .select(
        `
          id, slug, name, category_id, metal, occasion_tags, price_min, stock_count,
          categories ( name ),
          product_images ( url, is_primary, sort_order )
        `,
      )
      .eq('jeweller_id', jewellerId)
      .eq('is_active', true)
      .limit(200),
    sb
      .from('product_sales')
      .select('product_id, quantity, sold_price, sold_at')
      .eq('jeweller_id', jewellerId)
      .gte('sold_at', since90),
    sb
      .from('product_views')
      .select('product_id, created_at')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since90),
    sb
      .from('tryon_events')
      .select('product_id, created_at')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since90),
  ]);

  for (const result of [products, sales, views, tryons]) {
    if (result.error) throw result.error;
  }

  const productRows = (products.data ?? []) as ProductDemandRow[];
  const saleRows = (sales.data ?? []) as SaleRow[];
  const viewRows = (views.data ?? []) as EventRow[];
  const tryonRows = (tryons.data ?? []) as EventRow[];

  return productRows.map((product) => ({
    productId: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: categoryName(product),
    metal: product.metal,
    occasionTags: product.occasion_tags ?? [],
    stockCount: product.stock_count,
    priceMin: product.price_min,
    primaryImageUrl: primaryImage(product),
    sales30: salesCount(saleRows, product.id, since30),
    sales90: salesCount(saleRows, product.id, since90),
    revenue90: revenue(saleRows, product.id, since90),
    views30: countRows(viewRows, product.id, since30, 'created_at'),
    views90: countRows(viewRows, product.id, since90, 'created_at'),
    tryons30: countRows(tryonRows, product.id, since30, 'created_at'),
    tryons90: countRows(tryonRows, product.id, since90, 'created_at'),
    lastSoldAt: latestSaleAt(saleRows, product.id),
  }));
}

export async function recordProductSale(
  jewellerId: string,
  input: RecordSaleInput,
): Promise<void> {
  const sb = getSupabaseServer();
  const { data: product, error: productError } = await sb
    .from('products')
    .select('id')
    .eq('jeweller_id', jewellerId)
    .eq('id', input.productId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error('Product not found for this shop');

  const { error: saleError } = await sb.from('product_sales').insert({
    jeweller_id: jewellerId,
    product_id: input.productId,
    quantity: input.quantity,
    sold_price: input.soldPrice ?? null,
    sold_at: input.soldAt ?? new Date().toISOString(),
    occasion: input.occasion ?? null,
    notes: input.notes ?? null,
  });
  if (saleError) throw saleError;

  const { data: current, error: currentError } = await sb
    .from('products')
    .select('stock_count')
    .eq('jeweller_id', jewellerId)
    .eq('id', input.productId)
    .single();
  if (currentError) throw currentError;

  const nextStock = Math.max(0, Number(current.stock_count ?? 0) - input.quantity);
  const { error: stockError } = await sb
    .from('products')
    .update({ stock_count: nextStock })
    .eq('jeweller_id', jewellerId)
    .eq('id', input.productId);
  if (stockError) throw stockError;
}
