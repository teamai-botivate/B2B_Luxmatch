import {
  fullTextSearchProducts,
  getProductsByIds,
  logSearchEvent,
} from '@luxematch/db';
import {
  embedHybrid,
  embedImage,
  embedText,
} from '@luxematch/embeddings';
import { searchByVector } from '@luxematch/qdrant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const searchRoutes = new Hono<Vars>();

searchRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// Shared filter schema
// ────────────────────────────────────────────────────────────────────────────

const FilterSchema = z
  .object({
    category_id: z.string().uuid().optional(),
    metal: z.string().optional(),
    occasion_tags: z.array(z.string()).optional(),
    price_min: z.number().nonnegative().optional(),
    price_max: z.number().nonnegative().optional(),
    has_tryon: z.boolean().optional(),
  })
  .optional();

type ApiFilter = z.infer<typeof FilterSchema>;

function toQdrantFilter(jewellerId: string, filter: ApiFilter) {
  return {
    jewellerId,
    categoryId: filter?.category_id,
    metal: filter?.metal,
    occasionTags: filter?.occasion_tags,
    priceMin: filter?.price_min,
    priceMax: filter?.price_max,
    hasTryOn: filter?.has_tryon,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Result hydration — Qdrant → Supabase, preserving order.
// ────────────────────────────────────────────────────────────────────────────

async function hydrate(
  jewellerId: string,
  scored: Array<{ productId: string; score: number }>,
) {
  if (!scored.length) return [];
  const products = await getProductsByIds(
    jewellerId,
    scored.map((s) => s.productId),
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  return scored
    .map((s) => {
      const product = byId.get(s.productId);
      return product ? { product, score: s.score } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function decodeBase64(s: string): Buffer {
  const cleaned = s.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(cleaned, 'base64');
}

function getShowcaseVisualSearchUrl(): string | null {
  const raw = process.env.JEWELLERY_AI_URL ?? process.env.SHOWCASE_VISUAL_SEARCH_URL;
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/$/, '');
  return trimmed.endsWith('/search') ? trimmed : `${trimmed}/search`;
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/search/text
// ────────────────────────────────────────────────────────────────────────────

const TextBody = z.object({
  query: z.string().min(1).max(500),
  filters: FilterSchema,
  limit: z.number().int().positive().max(100).optional(),
  session_id: z.string().optional(),
});

searchRoutes.post('/text', zValidator('json', TextBody), async (c) => {
  const t0 = Date.now();
  const jewellerId = c.get('shopJewellerId');
  const { query, filters, limit, session_id } = c.req.valid('json');

  let scored: Array<{ productId: string; score: number }>;
  try {
    const vector = await embedText(query);
    scored = await searchByVector({
      vector,
      filter: toQdrantFilter(jewellerId, filters),
      limit,
    });
  } catch (err) {
    return sendError(
      c,
      'upstream_failed',
      `Search failed: ${err instanceof Error ? err.message : err}`,
      502,
    );
  }

  const results = await hydrate(jewellerId, scored);
  void logSearchEvent({
    jewellerId,
    queryText: query,
    queryType: 'text',
    resultCount: results.length,
    latencyMs: Date.now() - t0,
    sessionId: session_id,
  });
  return sendData(c, { results });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/search/image
// ────────────────────────────────────────────────────────────────────────────

const ImageBody = z.object({
  image_base64: z.string().min(1),
  filters: FilterSchema,
  limit: z.number().int().positive().max(100).optional(),
  session_id: z.string().optional(),
});

searchRoutes.post('/image', zValidator('json', ImageBody), async (c) => {
  const t0 = Date.now();
  const jewellerId = c.get('shopJewellerId');
  const { image_base64, filters, limit, session_id } = c.req.valid('json');

  let scored: Array<{ productId: string; score: number }>;
  try {
    const buf = decodeBase64(image_base64);
    if (buf.length === 0) {
      return sendError(c, 'bad_request', 'image_base64 decoded to empty bytes', 400);
    }
    const vector = await embedImage(buf);
    scored = await searchByVector({
      vector,
      filter: toQdrantFilter(jewellerId, filters),
      limit,
    });
  } catch (err) {
    return sendError(
      c,
      'upstream_failed',
      `Search failed: ${err instanceof Error ? err.message : err}`,
      502,
    );
  }

  const results = await hydrate(jewellerId, scored);
  void logSearchEvent({
    jewellerId,
    queryType: 'image',
    resultCount: results.length,
    latencyMs: Date.now() - t0,
    sessionId: session_id,
  });
  return sendData(c, { results });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/search/jewellery-ai
//
// Temporary showcase adapter for the existing Jewellery_AI Hugging Face app.
// The original service accepts multipart form-data:
//   POST <JEWELLERY_AI_URL>/search?top_k=20  field: file
// and returns [{ id, image_url, score }].
// ────────────────────────────────────────────────────────────────────────────

searchRoutes.post('/jewellery-ai', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const t0 = Date.now();
  const endpoint = getShowcaseVisualSearchUrl();

  if (!endpoint) {
    return sendError(
      c,
      'internal_error',
      'Set JEWELLERY_AI_URL or SHOWCASE_VISUAL_SEARCH_URL to your deployed Jewellery_AI backend.',
      500,
    );
  }

  const form = await c.req.formData();
  const file = form.get('file');
  const topKRaw = form.get('top_k');
  const topK = Math.min(Math.max(Number(topKRaw ?? 20) || 20, 1), 100);

  if (!(file instanceof File)) {
    return sendError(c, 'bad_request', 'Expected multipart field "file"', 400);
  }

  try {
    const imageBytes = await file.arrayBuffer();
    if (imageBytes.byteLength === 0) {
      return sendError(c, 'bad_request', 'Uploaded image is empty', 400);
    }

    const upstream = new FormData();
    upstream.append(
      'file',
      new Blob([imageBytes], { type: file.type || 'image/jpeg' }),
      file.name || 'search-image.jpg',
    );

    const res = await fetch(`${endpoint}?top_k=${topK}`, {
      method: 'POST',
      body: upstream,
    });

    if (!res.ok) {
      let detail = `Jewellery_AI returned ${res.status}`;
      try {
        const body = (await res.json()) as { detail?: string };
        detail = body.detail ?? detail;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) detail = text;
      }
      return sendError(c, 'upstream_failed', detail, 502);
    }

    const rows = (await res.json()) as Array<{
      id: string | number;
      image_url: string;
      score: number;
    }>;

    const results = rows
      .filter((r) => r.image_url)
      .map((r, index) => ({
        id: String(r.id ?? index),
        image_url: r.image_url,
        score: Number(r.score ?? 0),
      }));

    void logSearchEvent({
      jewellerId,
      queryType: 'image',
      resultCount: results.length,
      latencyMs: Date.now() - t0,
    });

    return sendData(c, { results });
  } catch (err) {
    return sendError(
      c,
      'upstream_failed',
      err instanceof Error ? err.message : String(err),
      502,
    );
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/search/hybrid
// ────────────────────────────────────────────────────────────────────────────

const HybridBody = z
  .object({
    query: z.string().min(1).max(500).optional(),
    image_base64: z.string().min(1).optional(),
    weight: z.number().min(0).max(1).optional(),
    filters: FilterSchema,
    limit: z.number().int().positive().max(100).optional(),
    session_id: z.string().optional(),
  })
  .refine((b) => Boolean(b.query) || Boolean(b.image_base64), {
    message: 'Provide query, image_base64, or both',
  });

searchRoutes.post('/hybrid', zValidator('json', HybridBody), async (c) => {
  const t0 = Date.now();
  const jewellerId = c.get('shopJewellerId');
  const { query, image_base64, weight, filters, limit, session_id } =
    c.req.valid('json');

  let scored: Array<{ productId: string; score: number }>;
  try {
    const vector = await embedHybrid({
      text: query,
      image: image_base64 ? decodeBase64(image_base64) : undefined,
      weight,
    });
    scored = await searchByVector({
      vector,
      filter: toQdrantFilter(jewellerId, filters),
      limit,
    });
  } catch (err) {
    return sendError(
      c,
      'upstream_failed',
      `Search failed: ${err instanceof Error ? err.message : err}`,
      502,
    );
  }

  const results = await hydrate(jewellerId, scored);
  void logSearchEvent({
    jewellerId,
    queryText: query,
    queryType: 'hybrid',
    resultCount: results.length,
    latencyMs: Date.now() - t0,
    sessionId: session_id,
  });
  return sendData(c, { results });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/search/suggest?q=
// Postgres FTS, no embedder hop — cheap autocomplete.
// ────────────────────────────────────────────────────────────────────────────

const SuggestQuery = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

searchRoutes.get('/suggest', zValidator('query', SuggestQuery), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const { q, limit } = c.req.valid('query');
  const results = await fullTextSearchProducts(jewellerId, q, limit ?? 8);
  return sendData(c, {
    suggestions: results.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      primary_image_url: p.primary_image_url,
    })),
  });
});
