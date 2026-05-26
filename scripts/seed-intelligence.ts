import { getServerEnv } from '@luxematch/config';
import { getSupabaseServer } from '@luxematch/db';

type ProductSeed = {
  id: string;
  name: string;
  category_id: string | null;
  metal: string | null;
  occasion_tags: string[] | null;
  price_min: number | null;
  price_max: number | null;
};

const rng = (() => {
  let seed = 42;
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
})();

function daysAgo(days: number, hour = 11): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

function priceFor(product: ProductSeed): number {
  const min = Number(product.price_min ?? 10_000);
  const max = Number(product.price_max ?? min);
  return Math.round(min + (max - min) * rng());
}

function seasonalWeight(product: ProductSeed, daysBack: number): number {
  const tags = product.occasion_tags ?? [];
  const categoryBoost =
    product.category_id?.endsWith('000000000003') || product.category_id?.endsWith('000000000006')
      ? 1.4
      : 1;
  const recentBoost = daysBack < 45 ? 1.4 : 1;
  const weddingBoost = tags.includes('wedding') && daysBack < 80 ? 2.2 : 1;
  const festivalBoost = tags.includes('festival') && daysBack < 65 ? 1.9 : 1;
  const giftBoost = tags.includes('gift') && daysBack > 75 && daysBack < 120 ? 1.7 : 1;
  return categoryBoost * recentBoost * weddingBoost * festivalBoost * giftBoost;
}

async function insertInChunks(table: string, rows: Record<string, unknown>[]) {
  const sb = getSupabaseServer();
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from(table).insert(chunk);
    if (error) throw error;
  }
}

async function main() {
  const env = getServerEnv();
  const jewellerId = env.SHOP_JEWELLER_ID;
  const reset = process.argv.includes('--reset-demo-history');
  const sb = getSupabaseServer();

  const { data: products, error } = await sb
    .from('products')
    .select('id, name, category_id, metal, occasion_tags, price_min, price_max')
    .eq('jeweller_id', jewellerId)
    .eq('is_active', true);
  if (error) throw error;

  const productRows = (products ?? []) as ProductSeed[];
  if (productRows.length === 0) {
    throw new Error(
      `No products found for SHOP_JEWELLER_ID=${jewellerId}. Apply migration + seed.sql first.`,
    );
  }

  if (reset) {
    for (const table of ['product_sales', 'product_views', 'tryon_events', 'search_events', 'analytics_events']) {
      const { error: deleteError } = await sb.from(table).delete().eq('jeweller_id', jewellerId);
      if (deleteError) throw deleteError;
    }
  }

  const sales: Record<string, unknown>[] = [];
  const views: Record<string, unknown>[] = [];
  const tryons: Record<string, unknown>[] = [];
  const searches: Record<string, unknown>[] = [];
  const analytics: Record<string, unknown>[] = [];

  for (let day = 1; day <= 180; day += 1) {
    for (const product of productRows) {
      const weight = seasonalWeight(product, day);
      const viewCount = Math.floor(rng() * 4 * weight);
      const tryonCount = Math.floor(rng() * 1.6 * weight);
      const saleChance = 0.018 * weight;

      for (let i = 0; i < viewCount; i += 1) {
        views.push({
          jeweller_id: jewellerId,
          product_id: product.id,
          session_id: `seed-view-${day}-${i}-${product.id.slice(-4)}`,
          created_at: daysAgo(day, 10 + (i % 8)),
        });
      }

      for (let i = 0; i < tryonCount; i += 1) {
        tryons.push({
          jeweller_id: jewellerId,
          product_id: product.id,
          jewellery_type: null,
          confidence: 0.82 + rng() * 0.15,
          device_type: 'store-kiosk',
          session_id: `seed-tryon-${day}-${i}-${product.id.slice(-4)}`,
          created_at: daysAgo(day, 12 + (i % 6)),
        });
      }

      if (rng() < saleChance) {
        const quantity = rng() > 0.82 ? 2 : 1;
        sales.push({
          jeweller_id: jewellerId,
          product_id: product.id,
          quantity,
          sold_price: priceFor(product),
          sold_at: daysAgo(day, 14),
          occasion: product.occasion_tags?.[0] ?? null,
          notes: 'seed-intelligence',
        });
      }

      if (rng() < 0.08 * weight) {
        analytics.push({
          jeweller_id: jewellerId,
          event_type: 'save',
          product_id: product.id,
          session_id: `seed-save-${day}-${product.id.slice(-4)}`,
          metadata: { source: 'seed-intelligence' },
          created_at: daysAgo(day, 16),
        });
      }
    }

    if (day % 3 === 0) {
      const queryType = rng() > 0.3 ? 'text' : 'occasion';
      const queryText = queryType === 'occasion' ? 'wedding' : ['gold bangles', 'bridal set', 'diamond ring', 'daily earrings'][Math.floor(rng() * 4)];
      searches.push({
        jeweller_id: jewellerId,
        query_text: queryText,
        query_type: queryType,
        result_count: Math.floor(5 + rng() * 18),
        latency_ms: Math.round(80 + rng() * 220),
        session_id: `seed-search-${day}`,
        created_at: daysAgo(day, 18),
      });
    }
  }

  await insertInChunks('product_views', views);
  await insertInChunks('tryon_events', tryons);
  await insertInChunks('product_sales', sales);
  await insertInChunks('search_events', searches);
  await insertInChunks('analytics_events', analytics);

  console.log(
    `Seeded intelligence history for ${productRows.length} products: ${views.length} views, ${tryons.length} try-ons, ${sales.length} sales, ${searches.length} searches.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
