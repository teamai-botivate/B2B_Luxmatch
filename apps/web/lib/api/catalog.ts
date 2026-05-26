import {
  getCategories,
  getCollectionBySlug,
  getCollectionProductIds,
  getCollections,
  getProductBySlug,
  listProducts,
  listTryOnProducts,
} from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const catalogRoutes = new Hono<Vars>();

catalogRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/products
//   Query params: category, metal, occasion (csv), price_min, price_max,
//                 has_tryon, featured, limit, offset
// ────────────────────────────────────────────────────────────────────────────
const listQuery = z.object({
  category: z.string().uuid().optional(),
  metal: z.string().optional(),
  occasion: z.string().optional(),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().nonnegative().optional(),
  has_tryon: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

catalogRoutes.get('/products', zValidator('query', listQuery), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const q = c.req.valid('query');
  const { products, total } = await listProducts(jewellerId, {
    categoryId: q.category,
    metal: q.metal,
    occasionTags: q.occasion?.split(',').filter(Boolean),
    priceMin: q.price_min,
    priceMax: q.price_max,
    hasTryOn: q.has_tryon,
    featured: q.featured,
    limit: q.limit,
    offset: q.offset,
  });
  return sendData(c, { products, total });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/products/:slug
// ────────────────────────────────────────────────────────────────────────────
catalogRoutes.get('/products/:slug', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const product = await getProductBySlug(jewellerId, c.req.param('slug'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  return sendData(c, product);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/categories  — global, not tenant-scoped
// ────────────────────────────────────────────────────────────────────────────
catalogRoutes.get('/categories', async (c) => {
  const categories = await getCategories();
  return sendData(c, categories);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/collections          — this shop's collections
// GET /api/collections/:slug    — collection + products
// ────────────────────────────────────────────────────────────────────────────
catalogRoutes.get('/collections', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const collections = await getCollections(jewellerId);
  return sendData(c, collections);
});

catalogRoutes.get('/collections/:slug', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const slug = c.req.param('slug');
  const collection = await getCollectionBySlug(jewellerId, slug);
  if (!collection) return sendError(c, 'not_found', 'Collection not found', 404);
  const productIds = await getCollectionProductIds(collection.id);
  // Fetch all the collection's products in one shot via the list query — we
  // re-filter the result against productIds to keep ordering deterministic.
  const { products } = await listProducts(jewellerId, { limit: 200 });
  const idSet = new Set(productIds);
  const collectionProducts = products.filter((p) => idSet.has(p.id));
  return sendData(c, { collection, products: collectionProducts });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/tryon/products
//   Shop's products that have at least one active try-on asset. Each product
//   carries the full asset list so the engine can switch overlay + calibration
//   without an extra round-trip.
// ────────────────────────────────────────────────────────────────────────────
catalogRoutes.get('/tryon/products', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const products = await listTryOnProducts(jewellerId);
  return sendData(c, { products });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/occasions/:slug
//   "Occasion" is a tag, not a table. We filter products by occasion_tags
//   overlap and return them with a synthetic occasion object.
// ────────────────────────────────────────────────────────────────────────────
catalogRoutes.get('/occasions/:slug', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const slug = c.req.param('slug');
  const { products } = await listProducts(jewellerId, {
    occasionTags: [slug],
    limit: 200,
  });
  return sendData(c, {
    occasion: { slug, name: slug.charAt(0).toUpperCase() + slug.slice(1) },
    products,
  });
});
