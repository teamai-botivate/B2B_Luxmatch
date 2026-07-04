import {
  getManufacturerProductById,
  getProductById,
  getSupabaseServer,
  trackManufacturerProductEmbedding,
} from '@luxematch/db';
import { EMBEDDING_DIM, embedImage } from '@luxematch/embeddings';
import {
  upsertManufacturerProductVector,
  upsertProductVector,
  type ManufacturerProductPayload,
  type ProductPayload,
} from '@luxematch/qdrant';
import { Hono } from 'hono';

import { sendData, sendError } from './envelope';
import { manufacturerGuard, pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string; manufacturerId: string } };

export const embeddingsRoutes = new Hono<Vars>();

function jewelleryAiAddImageUrl(): string | null {
  const raw = process.env.JEWELLERY_AI_URL;
  if (!raw) return null;
  const base = raw.trim().replace(/\/$/, '');
  return base.endsWith('/add-image') ? base : `${base}/add-image`;
}

async function addManufacturerImageToJewelleryAi(input: {
  imageBytes: Buffer;
  imageUrl: string;
  publicId: string;
  productId: string;
  manufacturerId: string;
}) {
  const url = jewelleryAiAddImageUrl();
  if (!url) return;

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(input.imageBytes)]), `${input.productId}.jpg`);
  form.append('manufacturer_product_id', input.productId);
  form.append('manufacturer_id', input.manufacturerId);
  form.append('cloudinary_url', input.imageUrl);
  form.append('public_id', input.publicId);
  form.append(
    'metadata',
    JSON.stringify({
      manufacturer_product_id: input.productId,
      manufacturer_id: input.manufacturerId,
      cloudinary_url: input.imageUrl,
      public_id: input.publicId,
    }),
  );

  const response = await fetch(url, { method: 'POST', body: form });
  if (!response.ok) {
    throw new Error(`Jewellery_AI add-image failed: ${response.status}`);
  }
}

export async function indexProductForJeweller(jewellerId: string, productId: string) {
  const product = await getProductById(jewellerId, productId);
  if (!product) return { ok: false as const, code: 'not_found', message: 'Product not found' };
  if (!product.primary_image_url) {
    return { ok: false as const, code: 'bad_request', message: 'Product has no primary image' };
  }

  const res = await fetch(product.primary_image_url);
  if (!res.ok) {
    return { ok: false as const, code: 'upstream_failed', message: `Image fetch failed: ${res.status}` };
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

  return { ok: true as const, productId: product.id };
}

export async function indexManufacturerProduct(manufacturerId: string, productId: string) {
  const product = await getManufacturerProductById(productId);
  if (!product || product.manufacturer_id !== manufacturerId) {
    return { ok: false as const, code: 'not_found', message: 'Manufacturer product not found' };
  }
  const primaryImage =
    product.images.find((img) => img.is_primary && !img.is_tryon) ??
    product.images.find((img) => !img.is_tryon);
  if (!primaryImage) {
    return { ok: false as const, code: 'no_image', message: 'No catalog image yet' };
  }

  const res = await fetch(primaryImage.secure_url);
  if (!res.ok) {
    return { ok: false as const, code: 'upstream_failed', message: `Image fetch failed: ${res.status}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const vector = await embedImage(buf);

  const payload: ManufacturerProductPayload = {
    manufacturer_product_id: product.id,
    manufacturer_id: product.manufacturer_id,
    category: product.category,
    metal: product.metal,
    purity: product.purity,
    occasion_tags: product.occasion_tags ?? [],
    style_tags: product.style_tags ?? [],
  };
  await upsertManufacturerProductVector({ productId: product.id, vector, payload });
  await trackManufacturerProductEmbedding({
    productId: product.id,
    imageUrl: primaryImage.secure_url,
    dimensions: EMBEDDING_DIM,
  });
  void addManufacturerImageToJewelleryAi({
    imageBytes: buf,
    imageUrl: primaryImage.secure_url,
    publicId: primaryImage.cloudinary_public_id,
    productId: product.id,
    manufacturerId: product.manufacturer_id,
  }).catch((e) => console.warn('[embeddings] Jewellery_AI bridge failed', e));

  return { ok: true as const, productId: product.id };
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/embeddings/product/:id  // PIN GUARD
//
// Re-embeds a single product's primary image and upserts into Qdrant. Mirrors
// the per-product slice of scripts/reindex.ts so the jeweller can re-index
// after editing images or metadata without running a full backfill.
// ────────────────────────────────────────────────────────────────────────────
embeddingsRoutes.post('/product/:id', tenantMiddleware, pinGuard, async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const productId = c.req.param('id');

  try {
    const result = await indexProductForJeweller(jewellerId, productId);
    if (!result.ok) {
      if (result.code === 'not_found') {
        return sendError(c, 'not_found', result.message, 404);
      }
      if (result.code === 'bad_request') {
        return sendError(c, 'bad_request', result.message, 400);
      }
      return sendError(c, 'upstream_failed', result.message, 502);
    }
    return sendData(c, result);
  } catch (e) {
    return sendError(
      c,
      'upstream_failed',
      e instanceof Error ? e.message : String(e),
      502,
    );
  }
});

embeddingsRoutes.post('/manufacturer/:id', manufacturerGuard, async (c) => {
  const manufacturerId = c.get('manufacturerId');
  const productId = c.req.param('id');

  try {
    const product = await getManufacturerProductById(productId);
    if (!product || product.manufacturer_id !== manufacturerId) {
      return sendError(c, 'not_found', 'Manufacturer product not found', 404);
    }

    const primaryImage =
      product.images.find((image) => image.is_primary && !image.is_tryon) ??
      product.images.find((image) => !image.is_tryon);
    if (!primaryImage) {
      return sendError(c, 'bad_request', 'Manufacturer product has no catalog image', 400);
    }

    const res = await fetch(primaryImage.secure_url);
    if (!res.ok) {
      return sendError(c, 'upstream_failed', `Image fetch failed: ${res.status}`, 502);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const vector = await embedImage(buf);
    const payload: ManufacturerProductPayload = {
      manufacturer_product_id: product.id,
      manufacturer_id: product.manufacturer_id,
      category: product.category,
      metal: product.metal,
      purity: product.purity,
      occasion_tags: product.occasion_tags ?? [],
      style_tags: product.style_tags ?? [],
    };

    await upsertManufacturerProductVector({ productId: product.id, vector, payload });
    await trackManufacturerProductEmbedding({
      productId: product.id,
      imageUrl: primaryImage.secure_url,
      dimensions: EMBEDDING_DIM,
    });
    void addManufacturerImageToJewelleryAi({
      imageBytes: buf,
      imageUrl: primaryImage.secure_url,
      publicId: primaryImage.cloudinary_public_id,
      productId: product.id,
      manufacturerId: product.manufacturer_id,
    }).catch((error) => {
      console.warn('[embeddings] Jewellery_AI add-image bridge failed', error);
    });

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
