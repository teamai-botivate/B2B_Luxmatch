import { getServerEnv } from '@luxematch/config';
import { getSupabaseServer } from '@luxematch/db';

type ProductRow = {
  id: string;
  category_id: string | null;
  metal: string | null;
  occasion_tags: string[] | null;
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

type Bucket = {
  jeweller_id: string;
  category_id: string | null;
  metal: string | null;
  occasion: string | null;
  window_start: string;
  window_end: string;
  views: number;
  tryons: number;
  sales: number;
  revenue: number;
};

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function windowStartFor(iso: string): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return dateOnly(d);
}

function windowEndFor(start: string): string {
  const d = new Date(`${start}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return dateOnly(d);
}

function keyFor(product: ProductRow, occasion: string | null, windowStart: string): string {
  return [
    product.category_id ?? 'none',
    product.metal ?? 'none',
    occasion ?? 'none',
    windowStart,
  ].join('|');
}

function getBucket(
  buckets: Map<string, Bucket>,
  jewellerId: string,
  product: ProductRow,
  occasion: string | null,
  windowStart: string,
): Bucket {
  const key = keyFor(product, occasion, windowStart);
  const existing = buckets.get(key);
  if (existing) return existing;
  const bucket: Bucket = {
    jeweller_id: jewellerId,
    category_id: product.category_id,
    metal: product.metal,
    occasion,
    window_start: windowStart,
    window_end: windowEndFor(windowStart),
    views: 0,
    tryons: 0,
    sales: 0,
    revenue: 0,
  };
  buckets.set(key, bucket);
  return bucket;
}

async function main() {
  const env = getServerEnv();
  const jewellerId = env.SHOP_JEWELLER_ID;
  const since = daysAgo(180);
  const sb = getSupabaseServer();

  const [products, sales, views, tryons] = await Promise.all([
    sb
      .from('products')
      .select('id, category_id, metal, occasion_tags')
      .eq('jeweller_id', jewellerId),
    sb
      .from('product_sales')
      .select('product_id, quantity, sold_price, sold_at')
      .eq('jeweller_id', jewellerId)
      .gte('sold_at', since),
    sb
      .from('product_views')
      .select('product_id, created_at')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since),
    sb
      .from('tryon_events')
      .select('product_id, created_at')
      .eq('jeweller_id', jewellerId)
      .gte('created_at', since),
  ]);

  for (const result of [products, sales, views, tryons]) {
    if (result.error) throw result.error;
  }

  const byId = new Map(
    ((products.data ?? []) as ProductRow[]).map((product) => [product.id, product]),
  );
  const buckets = new Map<string, Bucket>();

  for (const row of (views.data ?? []) as EventRow[]) {
    if (!row.product_id) continue;
    const product = byId.get(row.product_id);
    if (!product) continue;
    const occasions = product.occasion_tags?.length ? product.occasion_tags : [null];
    for (const occasion of occasions) {
      getBucket(buckets, jewellerId, product, occasion, windowStartFor(row.created_at)).views += 1;
    }
  }

  for (const row of (tryons.data ?? []) as EventRow[]) {
    if (!row.product_id) continue;
    const product = byId.get(row.product_id);
    if (!product) continue;
    const occasions = product.occasion_tags?.length ? product.occasion_tags : [null];
    for (const occasion of occasions) {
      getBucket(buckets, jewellerId, product, occasion, windowStartFor(row.created_at)).tryons += 1;
    }
  }

  for (const row of (sales.data ?? []) as SaleRow[]) {
    if (!row.product_id) continue;
    const product = byId.get(row.product_id);
    if (!product) continue;
    const occasions = product.occasion_tags?.length ? product.occasion_tags : [null];
    for (const occasion of occasions) {
      const bucket = getBucket(buckets, jewellerId, product, occasion, windowStartFor(row.sold_at));
      bucket.sales += row.quantity ?? 1;
      bucket.revenue += Number(row.sold_price ?? 0) * (row.quantity ?? 1);
    }
  }

  const rows = [...buckets.values()];
  if (rows.length === 0) {
    console.log('No source events found; inventory_signals not changed.');
    return;
  }

  const earliest = rows.map((row) => row.window_start).sort()[0];
  if (!earliest) return;

  const { error: deleteError } = await sb
    .from('inventory_signals')
    .delete()
    .eq('jeweller_id', jewellerId)
    .gte('window_start', earliest);
  if (deleteError) throw deleteError;

  for (let i = 0; i < rows.length; i += 500) {
    const { error: insertError } = await sb
      .from('inventory_signals')
      .insert(rows.slice(i, i + 500));
    if (insertError) throw insertError;
  }

  console.log(`Rolled up ${rows.length} inventory signal rows from ${earliest}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
