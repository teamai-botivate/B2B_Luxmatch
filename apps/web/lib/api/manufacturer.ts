import { getServerEnv } from '@luxematch/config';
import { generateManufacturerSignedUploadParams } from '@luxematch/cloudinary';
import {
  addManufacturerProductImage,
  createManufacturerProduct,
  deleteManufacturerProduct,
  getManufacturerById,
  getManufacturerProductById,
  listManufacturerProducts,
  updateManufacturerProduct,
  verifyManufacturerPassword,
  getB2BOrdersByManufacturer,
  getB2BOrderWithItems,
  updateB2BOrderStatus,
  createStore,
  listStoresByManufacturer,
  updateStoreStatus,
  type B2BOrderStatus,
} from '@luxematch/db';
import { issueManufacturerCookie, MANUFACTURER_COOKIE_NAME } from '@luxematch/tenant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { indexProductForJeweller } from './embeddings';
import { manufacturerGuard } from './middleware';

type Vars = { Variables: { manufacturerId: string } };

export const manufacturerRoutes = new Hono<Vars>();

// ── Auth (public) ─────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/manufacturer/login
manufacturerRoutes.post('/login', zValidator('json', LoginBody), async (c) => {
  const env = getServerEnv();
  const secret = env.MANUFACTURER_COOKIE_SECRET;
  if (!secret) return sendError(c, 'internal_error', 'MANUFACTURER_COOKIE_SECRET not set', 500);

  const { email, password } = c.req.valid('json');
  const row = await verifyManufacturerPassword(email, password);
  if (!row) return sendError(c, 'unauthorized', 'Invalid email or password', 401);

  const cookie = await issueManufacturerCookie(row.id, {
    secret,
    ttlSeconds: env.LM_MANUFACTURER_COOKIE_TTL_SECONDS,
  });
  setCookie(c, cookie.name, cookie.value, cookie.options);
  return sendData(c, { id: row.id, name: row.name, email: row.email });
});

// POST /api/manufacturer/logout
manufacturerRoutes.post('/logout', (c) => {
  deleteCookie(c, MANUFACTURER_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// ── All routes below require lm_manufacturer cookie ───────────────────────────

manufacturerRoutes.use('*', manufacturerGuard);

// GET /api/manufacturer/me
manufacturerRoutes.get('/me', async (c) => {
  const mfr = await getManufacturerById(c.get('manufacturerId'));
  if (!mfr) return sendError(c, 'not_found', 'Manufacturer not found', 404);
  return sendData(c, mfr);
});

// ── Products ──────────────────────────────────────────────────────────────────

const ProductFiltersQuery = z.object({
  category: z.string().optional(),
  metal: z.string().optional(),
  status: z.enum(['all', 'draft', 'active', 'archived']).optional(),
  search: z.string().optional(),
});

// GET /api/manufacturer/products
manufacturerRoutes.get('/products', zValidator('query', ProductFiltersQuery), async (c) => {
  const { status, ...rest } = c.req.valid('query');
  const products = await listManufacturerProducts({
    ...rest,
    ...(status ? { status } : {}),
  });
  return sendData(c, products);
});

// GET /api/manufacturer/products/:id
manufacturerRoutes.get('/products/:id', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  return sendData(c, product);
});

const CreateProductBody = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  description: z.string().optional(),
  weightGrams: z.number().positive().optional(),
  basePrice: z.number().positive(),
  metal: z.string().optional(),
  purity: z.string().optional(),
  gemstones: z.array(z.string()).optional(),
  occasionTags: z.array(z.string()).optional(),
  styleTags: z.array(z.string()).optional(),
  minOrderQty: z.number().int().positive().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

// POST /api/manufacturer/products
manufacturerRoutes.post('/products', zValidator('json', CreateProductBody), async (c) => {
  const body = c.req.valid('json');
  const product = await createManufacturerProduct({
    manufacturerId: c.get('manufacturerId'),
    ...body,
  });
  return sendData(c, product, 201);
});

const UpdateProductBody = CreateProductBody.partial().omit({ sku: true });

// PATCH /api/manufacturer/products/:id
manufacturerRoutes.patch('/products/:id', zValidator('json', UpdateProductBody), async (c) => {
  const existing = await getManufacturerProductById(c.req.param('id'));
  if (!existing) return sendError(c, 'not_found', 'Product not found', 404);
  if (existing.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  const updated = await updateManufacturerProduct(c.req.param('id'), c.req.valid('json'));
  return sendData(c, updated);
});

// DELETE /api/manufacturer/products/:id
manufacturerRoutes.delete('/products/:id', async (c) => {
  const existing = await getManufacturerProductById(c.req.param('id'));
  if (!existing) return sendError(c, 'not_found', 'Product not found', 404);
  if (existing.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  await deleteManufacturerProduct(c.req.param('id'));
  return sendData(c, { ok: true });
});

// ── B2B Orders ────────────────────────────────────────────────────────────────

// GET /api/manufacturer/orders
manufacturerRoutes.get('/orders', async (c) => {
  const orders = await getB2BOrdersByManufacturer(c.get('manufacturerId'));
  return sendData(c, orders);
});

// GET /api/manufacturer/orders/:id
manufacturerRoutes.get('/orders/:id', async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  return sendData(c, order);
});

const UpdateOrderStatusBody = z.object({
  status: z.enum(['confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
});

// PATCH /api/manufacturer/orders/:id
manufacturerRoutes.patch(
  '/orders/:id',
  zValidator('json', UpdateOrderStatusBody),
  async (c) => {
    const order = await getB2BOrderWithItems(c.req.param('id'));
    if (!order) return sendError(c, 'not_found', 'Order not found', 404);
    if (order.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your order', 403);
    }
    const { status, note, trackingNumber } = c.req.valid('json');
    const result = await updateB2BOrderStatus(
      c.req.param('id'),
      status as B2BOrderStatus,
      note,
      trackingNumber,
    );
    const fulfilledProductIds = [
      ...(result.fulfillment?.createdProductIds ?? []),
      ...(result.fulfillment?.updatedProductIds ?? []),
    ];
    if (fulfilledProductIds.length > 0) {
      void Promise.allSettled(
        fulfilledProductIds.map((productId) =>
          indexProductForJeweller(order.jeweller_id, productId),
        ),
      ).then((results) => {
        const failed = results.filter((entry) => entry.status === 'rejected');
        if (failed.length > 0) {
          console.warn('[b2b] fulfilled product indexing failures', failed);
        }
      });
    }
    return sendData(c, { ok: true, ...result });
  },
);

// Stores
manufacturerRoutes.get('/stores', async (c) => {
  const stores = await listStoresByManufacturer(c.get('manufacturerId'));
  return sendData(c, stores);
});

const CreateStoreBody = z.object({
  jewellerId: z.string().uuid(),
  name: z.string().min(1).max(160),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().optional(),
  phone: z.string().optional(),
});

manufacturerRoutes.post('/stores', zValidator('json', CreateStoreBody), async (c) => {
  try {
    const body = c.req.valid('json');
    const store = await createStore({
      manufacturerId: c.get('manufacturerId'),
      ...body,
    });
    return sendData(c, store, 201);
  } catch (err) {
    return sendError(c, 'bad_request', (err as Error).message, 400);
  }
});

const UpdateStoreStatusBody = z.object({
  isActive: z.boolean(),
});

manufacturerRoutes.patch(
  '/stores/:id/status',
  zValidator('json', UpdateStoreStatusBody),
  async (c) => {
    const store = await updateStoreStatus(
      c.get('manufacturerId'),
      c.req.param('id'),
      c.req.valid('json').isActive,
    );
    return sendData(c, store);
  },
);

const AddProductImageBody = z.object({
  cloudinaryPublicId: z.string().min(1),
  secureUrl: z.string().url(),
  isPrimary: z.boolean().optional(),
});

manufacturerRoutes.post('/products/:id/images/sign', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (product.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  return sendData(
    c,
    generateManufacturerSignedUploadParams({
      manufacturerId: c.get('manufacturerId'),
    }),
  );
});

manufacturerRoutes.post(
  '/products/:id/images',
  zValidator('json', AddProductImageBody),
  async (c) => {
    const product = await getManufacturerProductById(c.req.param('id'));
    if (!product) return sendError(c, 'not_found', 'Product not found', 404);
    if (product.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your product', 403);
    }
    const body = c.req.valid('json');
    const image = await addManufacturerProductImage({
      productId: c.req.param('id'),
      cloudinaryPublicId: body.cloudinaryPublicId,
      secureUrl: body.secureUrl,
      isPrimary: body.isPrimary ?? product.images.length === 0,
    });
    return sendData(c, image, 201);
  },
);
