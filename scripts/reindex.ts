#!/usr/bin/env tsx
/**
 * scripts/reindex.ts
 *
 * Backfill OpenCLIP embeddings into Qdrant for a jeweller's products.
 *
 *   pnpm reindex --jeweller-id=<uuid>         # default: $SHOP_JEWELLER_ID
 *   pnpm reindex --all                        # every jeweller in Supabase
 *   pnpm reindex --jeweller-id=<uuid> --limit=10
 *
 * Safe to re-run. Each product:
 *   1. Fetches the primary product_image URL
 *   2. Downloads bytes
 *   3. POSTs to the embedder, gets a 512-d vector
 *   4. Upserts into Qdrant with the full payload
 *   5. Records the indexing in product_embeddings
 */

import {
  getSupabaseServer,
  listProducts,
  type ProductWithImages,
} from '@luxematch/db';
import { EMBEDDING_DIM, embedImage } from '@luxematch/embeddings';
import {
  ensureCollection,
  upsertProductVector,
  type ProductPayload,
} from '@luxematch/qdrant';

type Args = {
  jewellerId?: string;
  all?: boolean;
  limit?: number;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (const a of argv) {
    if (a === '--all') out.all = true;
    else if (a.startsWith('--jeweller-id=')) out.jewellerId = a.slice('--jeweller-id='.length);
    else if (a.startsWith('--limit=')) out.limit = Number(a.slice('--limit='.length));
  }
  return out;
}

async function listAllJewellerIds(): Promise<string[]> {
  const sb = getSupabaseServer();
  const { data, error } = await sb.from('jewellers').select('id');
  if (error) throw error;
  return (data as { id: string }[] | null ?? []).map((r) => r.id);
}

function toPayload(p: ProductWithImages): ProductPayload {
  return {
    product_id: p.id,
    jeweller_id: p.jeweller_id,
    slug: p.slug,
    category_id: p.category_id,
    metal: p.metal,
    occasion_tags: p.occasion_tags,
    style_tags: p.style_tags,
    price_min: p.price_min,
    price_max: p.price_max,
    has_tryon: p.has_tryon,
  };
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function recordEmbedding(productId: string): Promise<void> {
  const sb = getSupabaseServer();
  const { error } = await sb.from('product_embeddings').upsert(
    {
      product_id: productId,
      qdrant_point_id: productId,
      embedding_model: 'open_clip:ViT-B-32:laion2b_s34b_b79k',
      dimensions: EMBEDDING_DIM,
      indexed_at: new Date().toISOString(),
    },
    { onConflict: 'product_id' },
  );
  if (error) throw error;
}

async function reindexJeweller(jewellerId: string, limit?: number): Promise<void> {
  console.log(`\n[reindex] Jeweller ${jewellerId}`);
  const { products } = await listProducts(jewellerId, { limit: limit ?? 200 });
  console.log(`  Found ${products.length} active products`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of products) {
    if (!p.primary_image_url) {
      console.warn(`  · ${p.slug}: no primary image, skipping`);
      skipped++;
      continue;
    }
    try {
      const bytes = await fetchImageBytes(p.primary_image_url);
      const vector = await embedImage(bytes);
      await upsertProductVector({
        productId: p.id,
        vector,
        payload: toPayload(p),
      });
      await recordEmbedding(p.id);
      ok++;
      console.log(`  ✓ ${p.slug}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${p.slug}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`  Done: ${ok} indexed, ${skipped} skipped, ${failed} failed`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log('[reindex] Ensuring Qdrant collection exists…');
  await ensureCollection();

  const ids = args.all
    ? await listAllJewellerIds()
    : [args.jewellerId ?? process.env.SHOP_JEWELLER_ID ?? ''].filter(Boolean);

  if (!ids.length) {
    console.error(
      'Specify --jeweller-id=<uuid> or --all (or set SHOP_JEWELLER_ID).',
    );
    process.exit(2);
  }

  for (const id of ids) {
    await reindexJeweller(id, args.limit);
  }
  console.log('\n[reindex] All done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
