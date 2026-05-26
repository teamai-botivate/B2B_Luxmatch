import { getProductById, getSupabaseServer } from '@luxematch/db';
import { EMBEDDING_DIM, embedImage } from '@luxematch/embeddings';
import { upsertProductVector, type ProductPayload } from '@luxematch/qdrant';
import { Hono } from 'hono';

import { sendData, sendError } from './envelope';
import { pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const embeddingsRoutes = new Hono<Vars>();

embeddingsRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/embeddings/product/:id  // PIN GUARD
//
// Re-embeds a single product's primary image and upserts into Qdrant. Mirrors
// the per-product slice of scripts/reindex.ts so the jeweller can re-index
// after editing images or metadata without running a full backfill.
// ────────────────────────────────────────────────────────────────────────────
embeddingsRoutes.post('/product/:id', pinGuard, async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const productId = c.req.param('id');

  const product = await getProductById(jewellerId, productId);
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (!product.primary_image_url) {
    return sendError(c, 'bad_request', 'Product has no primary image', 400);
  }

  try {
    const res = await fetch(product.primary_image_url);
    if (!res.ok) {
      return sendError(c, 'upstream_failed', `Image fetch failed: ${res.status}`, 502);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const vector = await embedImage(buf);

    const payload: ProductPayload = {
      product_id: product.id,
      jeweller_id: product.jeweller_id,
      slug: product.slug,
      category_id: product.category_id,
      metal: product.metal,
      occasion_tags: product.occasion_tags,
      style_tags: product.style_tags,
      price_min: product.price_min,
      price_max: product.price_max,
      has_tryon: product.has_tryon,
    };
    await upsertProductVector({ productId: product.id, vector, payload });

    const sb = getSupabaseServer();
    const { error } = await sb.from('product_embeddings').upsert(
      {
        product_id: product.id,
        qdrant_point_id: product.id,
        embedding_model: 'open_clip:ViT-B-32:laion2b_s34b_b79k',
        dimensions: EMBEDDING_DIM,
        indexed_at: new Date().toISOString(),
      },
      { onConflict: 'product_id' },
    );
    if (error) console.warn('[embeddings] product_embeddings upsert failed', error);

    return sendData(c, { ok: true, productId: product.id });
  } catch (e) {
    return sendError(
      c,
      'upstream_failed',
      e instanceof Error ? e.message : String(e),
      502,
    );
  }
});
