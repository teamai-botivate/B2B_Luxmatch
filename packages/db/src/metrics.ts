import { getSupabaseServer } from './client';

// ────────────────────────────────────────────────────────────────────────────
// Shop metrics for the jeweller dashboard.
//
// Each block runs as an independent count() query so an outage in one stat
// doesn't blank the whole dashboard. We catch per-block and degrade to null
// where appropriate — the UI shows "—" rather than crashing.
// ────────────────────────────────────────────────────────────────────────────

export type ShopMetrics = {
  total_products: number;
  active_products: number;
  missing_images_count: number;
  missing_tryon_count: number;
  missing_embedding_count: number;
  tryon_events_today: number;
  tryon_events_week: number;
  tryon_events_month: number;
  search_events_today: number;
  search_events_week: number;
  search_events_month: number;
  top_viewed_products: Array<{ product_id: string; name: string; view_count: number }>;
};

/**
 * Best-effort count. A failure in one stat shouldn't blank the dashboard, so
 * we swallow the error and return 0 with a warning.
 */
async function safeCount(label: string, q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  try {
    const { count, error } = await q;
    if (error) {
      console.warn(`[metrics] ${label} failed`, error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn(`[metrics] ${label} threw`, err);
    return 0;
  }
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function getShopMetrics(jewellerId: string): Promise<ShopMetrics> {
  const sb = getSupabaseServer();

  // ── Product counts ───────────────────────────────────────────────────────
  const [total, active, productRowsResult] = await Promise.all([
    safeCount(
      'products total',
      sb.from('products').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId),
    ),
    safeCount(
      'products active',
      sb
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('jeweller_id', jewellerId)
        .eq('is_active', true),
    ),
    sb
      .from('products')
      .select('id')
      .eq('jeweller_id', jewellerId)
      .eq('is_active', true),
  ]);

  // ── "Missing" counts via two-step lookup ─────────────────────────────────
  // We pull the active product ids first, then count which ones lack
  // images / tryon-assets / embeddings. This is a few extra round trips
  // but each one is small and the queries are simple to reason about.
  const productIds = (productRowsResult.data as { id: string }[] | null ?? []).map((r) => r.id);

  let missingImagesCount = 0;
  let missingTryOnCount = 0;
  let missingEmbeddingCount = 0;
  if (productIds.length) {
    const [imgRes, tryonRes, embRes] = await Promise.all([
      sb.from('product_images').select('product_id').in('product_id', productIds),
      sb.from('product_tryon_assets').select('product_id').in('product_id', productIds).eq('is_active', true),
      sb.from('product_embeddings').select('product_id').in('product_id', productIds),
    ]);
    const haveImages = new Set((imgRes.data as { product_id: string }[] | null ?? []).map((r) => r.product_id));
    const haveTryOn = new Set((tryonRes.data as { product_id: string }[] | null ?? []).map((r) => r.product_id));
    const haveEmbedding = new Set((embRes.data as { product_id: string }[] | null ?? []).map((r) => r.product_id));
    for (const id of productIds) {
      if (!haveImages.has(id)) missingImagesCount++;
      if (!haveTryOn.has(id)) missingTryOnCount++;
      if (!haveEmbedding.has(id)) missingEmbeddingCount++;
    }
  }

  // ── Event windows ────────────────────────────────────────────────────────
  const today = daysAgoIso(1);
  const week = daysAgoIso(7);
  const month = daysAgoIso(30);

  const [tryonToday, tryonWeek, tryonMonth, searchToday, searchWeek, searchMonth] =
    await Promise.all([
      safeCount(
        'tryon_events today',
        sb.from('tryon_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', today),
      ),
      safeCount(
        'tryon_events week',
        sb.from('tryon_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', week),
      ),
      safeCount(
        'tryon_events month',
        sb.from('tryon_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', month),
      ),
      safeCount(
        'search_events today',
        sb.from('search_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', today),
      ),
      safeCount(
        'search_events week',
        sb.from('search_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', week),
      ),
      safeCount(
        'search_events month',
        sb.from('search_events').select('id', { count: 'exact', head: true }).eq('jeweller_id', jewellerId).gte('created_at', month),
      ),
    ]);

  // ── Top viewed products (last 30 days) ───────────────────────────────────
  // No native group-by in supabase-js v2 client; we pull the rows for the
  // window and aggregate in JS. Fine at our scale.
  let topViewed: ShopMetrics['top_viewed_products'] = [];
  try {
    const { data: viewRows } = await sb
      .from('product_views')
      .select('product_id')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', month);
    const counts = new Map<string, number>();
    for (const row of (viewRows as { product_id: string }[] | null ?? [])) {
      counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
    }
    const sortedIds = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (sortedIds.length) {
      const ids = sortedIds.map(([id]) => id);
      const { data: nameRows } = await sb
        .from('products')
        .select('id, name')
        .eq('jeweller_id', jewellerId)
        .in('id', ids);
      const nameById = new Map((nameRows as { id: string; name: string }[] | null ?? []).map((r) => [r.id, r.name]));
      topViewed = sortedIds.map(([id, count]) => ({
        product_id: id,
        name: nameById.get(id) ?? 'Unknown',
        view_count: count,
      }));
    }
  } catch (err) {
    console.warn('[metrics] top viewed failed', err);
  }

  return {
    total_products: total,
    active_products: active,
    missing_images_count: missingImagesCount,
    missing_tryon_count: missingTryOnCount,
    missing_embedding_count: missingEmbeddingCount,
    tryon_events_today: tryonToday,
    tryon_events_week: tryonWeek,
    tryon_events_month: tryonMonth,
    search_events_today: searchToday,
    search_events_week: searchWeek,
    search_events_month: searchMonth,
    top_viewed_products: topViewed,
  };
}
