import { getSupabaseServer } from './client';

// ────────────────────────────────────────────────────────────────────────────
// Shop analytics — feeds /jeweller/analytics charts.
//
// Like metrics.ts, we aggregate in JS rather than relying on SQL group-by so
// the queries stay portable. At our scale (small shops, modest event volume)
// the cost is negligible.
// ────────────────────────────────────────────────────────────────────────────

export type ShopAnalytics = {
  /** Last 30 days: counts per day for searches + tryons. */
  daily_activity: Array<{ date: string; searches: number; tryons: number }>;
  /** Top 10 products by try-on count over last 30 days. */
  top_tryon_products: Array<{ product_id: string; name: string; tryons: number }>;
  /** Top 10 viewed products over last 30 days. */
  top_viewed_products: Array<{ product_id: string; name: string; views: number }>;
  /** Sales breakdown for the last 30 days. */
  sales_by_category: Array<{ category: string; sales: number; revenue: number }>;
  sales_by_metal: Array<{ metal: string; sales: number; revenue: number }>;
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** YYYY-MM-DD bucketing — local time is fine, dashboard isn't audit-grade. */
function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function getShopAnalytics(jewellerId: string): Promise<ShopAnalytics> {
  const sb = getSupabaseServer();
  const monthStart = daysAgoIso(30);

  // ── Daily activity ───────────────────────────────────────────────────────
  const [searchRows, tryonRows] = await Promise.all([
    sb
      .from('search_events')
      .select('created_at')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', monthStart),
    sb
      .from('tryon_events')
      .select('created_at, product_id')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', monthStart),
  ]);

  const dailySearch = new Map<string, number>();
  for (const r of (searchRows.data as { created_at: string }[] | null ?? [])) {
    const k = dayKey(r.created_at);
    dailySearch.set(k, (dailySearch.get(k) ?? 0) + 1);
  }
  const dailyTryon = new Map<string, number>();
  for (const r of (tryonRows.data as { created_at: string; product_id: string | null }[] | null ?? [])) {
    const k = dayKey(r.created_at);
    dailyTryon.set(k, (dailyTryon.get(k) ?? 0) + 1);
  }

  // Fill in zeros for the full 30-day span so the chart is continuous.
  const daily_activity: ShopAnalytics['daily_activity'] = [];
  for (let i = 29; i >= 0; i--) {
    const k = dayKey(daysAgoIso(i));
    daily_activity.push({
      date: k,
      searches: dailySearch.get(k) ?? 0,
      tryons: dailyTryon.get(k) ?? 0,
    });
  }

  // ── Top try-on products ─────────────────────────────────────────────────
  const tryonByProduct = new Map<string, number>();
  for (const r of (tryonRows.data as { product_id: string | null }[] | null ?? [])) {
    if (!r.product_id) continue;
    tryonByProduct.set(r.product_id, (tryonByProduct.get(r.product_id) ?? 0) + 1);
  }

  // ── Top viewed products ─────────────────────────────────────────────────
  const { data: viewRows } = await sb
    .from('product_views')
    .select('product_id')
    .eq('jeweller_id', jewellerId)
    .gte('created_at', monthStart);
  const viewsByProduct = new Map<string, number>();
  for (const r of (viewRows as { product_id: string }[] | null ?? [])) {
    viewsByProduct.set(r.product_id, (viewsByProduct.get(r.product_id) ?? 0) + 1);
  }

  const productIds = Array.from(new Set([...tryonByProduct.keys(), ...viewsByProduct.keys()]));
  let nameById = new Map<string, string>();
  if (productIds.length) {
    const { data: nameRows } = await sb
      .from('products')
      .select('id, name')
      .eq('jeweller_id', jewellerId)
      .in('id', productIds);
    nameById = new Map(
      (nameRows as { id: string; name: string }[] | null ?? []).map((r) => [r.id, r.name]),
    );
  }

  const top_tryon_products = Array.from(tryonByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      product_id: id,
      name: nameById.get(id) ?? 'Unknown',
      tryons: count,
    }));

  const top_viewed_products = Array.from(viewsByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      product_id: id,
      name: nameById.get(id) ?? 'Unknown',
      views: count,
    }));

  // ── Sales ───────────────────────────────────────────────────────────────
  const { data: salesRows } = await sb
    .from('product_sales')
    .select('product_id, quantity, sold_price, sold_at')
    .eq('jeweller_id', jewellerId)
    .gte('sold_at', monthStart);
  const saleIds = Array.from(
    new Set((salesRows as { product_id: string }[] | null ?? []).map((r) => r.product_id)),
  );

  let categoryByProduct = new Map<string, string>();
  let metalByProduct = new Map<string, string | null>();
  if (saleIds.length) {
    const { data: catRows } = await sb
      .from('products')
      .select('id, metal, category:category_id ( name )')
      .eq('jeweller_id', jewellerId)
      .in('id', saleIds);
    for (const r of (catRows as Array<{
      id: string;
      metal: string | null;
      category: { name: string } | { name: string }[] | null;
    }> | null ?? [])) {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category;
      categoryByProduct.set(r.id, cat?.name ?? 'Uncategorised');
      metalByProduct.set(r.id, r.metal);
    }
  }

  const byCat = new Map<string, { sales: number; revenue: number }>();
  const byMetal = new Map<string, { sales: number; revenue: number }>();
  for (const s of (salesRows as { product_id: string; quantity: number; sold_price: number | null }[] | null ?? [])) {
    const cat = categoryByProduct.get(s.product_id) ?? 'Uncategorised';
    const metal = metalByProduct.get(s.product_id) ?? 'unspecified';
    const q = s.quantity ?? 1;
    const revenue = (s.sold_price ?? 0) * q;
    const c = byCat.get(cat) ?? { sales: 0, revenue: 0 };
    c.sales += q;
    c.revenue += revenue;
    byCat.set(cat, c);
    const m = byMetal.get(metal) ?? { sales: 0, revenue: 0 };
    m.sales += q;
    m.revenue += revenue;
    byMetal.set(metal, m);
  }

  const sales_by_category = Array.from(byCat.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([category, v]) => ({ category, sales: v.sales, revenue: v.revenue }));
  const sales_by_metal = Array.from(byMetal.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .map(([metal, v]) => ({ metal, sales: v.sales, revenue: v.revenue }));

  return {
    daily_activity,
    top_tryon_products,
    top_viewed_products,
    sales_by_category,
    sales_by_metal,
  };
}
