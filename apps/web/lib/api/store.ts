import { getServerEnv } from '@luxematch/config';
import {
  getStoreByJewellerId,
  verifyStorePassword,
  listManufacturerProducts,
  getManufacturerProductById,
  placeB2BOrder,
  getB2BOrdersByStore,
  getB2BOrderWithItems,
  updateB2BOrderStatus,
  type ManufacturerProductFilters,
} from '@luxematch/db';
import { issueStoreCookie, STORE_COOKIE_NAME } from '@luxematch/tenant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { storeGuard } from './middleware';

type Vars = { Variables: { shopJewellerId: string; storeId: string } };

export const storeRoutes = new Hono<Vars>();

// ── Auth (public) ─────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/store/login
storeRoutes.post('/login', zValidator('json', LoginBody), async (c) => {
  const env = getServerEnv();
  const { email, password } = c.req.valid('json');

  const row = await verifyStorePassword(email, password);
  if (!row) return sendError(c, 'unauthorized', 'Invalid email or password', 401);
  if (!row.jeweller_id) {
    return sendError(c, 'internal_error', 'Store has no linked jeweller account', 500);
  }

  const cookie = await issueStoreCookie(row.id, row.jeweller_id, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  setCookie(c, cookie.name, cookie.value, cookie.options);
  return sendData(c, {
    id: row.id,
    name: row.name,
    email: row.email,
    jewellerId: row.jeweller_id,
    city: row.city,
  });
});

// POST /api/store/logout
storeRoutes.post('/logout', (c) => {
  deleteCookie(c, STORE_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// ── All routes below require lm_store cookie ──────────────────────────────────

storeRoutes.use('*', storeGuard);

// GET /api/store/me
storeRoutes.get('/me', async (c) => {
  const store = await getStoreByJewellerId(c.get('shopJewellerId'));
  if (!store) return sendError(c, 'not_found', 'Store not found', 404);
  return sendData(c, store);
});

// ── Manufacturer catalog browse ───────────────────────────────────────────────

const CatalogQuery = z.object({
  category: z.string().optional(),
  metal: z.string().optional(),
  search: z.string().optional(),
});

// GET /api/store/catalog
// Browse the active manufacturer product catalog (global, no jeweller_id filter)
storeRoutes.get('/catalog', zValidator('query', CatalogQuery), async (c) => {
  const { category, metal, search } = c.req.valid('query');
  const filters: ManufacturerProductFilters = {
    status: 'active',
    ...(category ? { category } : {}),
    ...(metal ? { metal } : {}),
    ...(search ? { search } : {}),
  };
  const products = await listManufacturerProducts(filters);
  return sendData(c, products);
});

// GET /api/store/catalog/:id
storeRoutes.get('/catalog/:id', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product || product.status !== 'active') {
    return sendError(c, 'not_found', 'Product not found', 404);
  }
  return sendData(c, product);
});

// ── B2B cart / ordering ───────────────────────────────────────────────────────

const PlaceOrderBody = z.object({
  manufacturerId: z.string().uuid(),
  deliveryAddress: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        manufacturerProductId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
});

// POST /api/store/orders
storeRoutes.post('/orders', zValidator('json', PlaceOrderBody), async (c) => {
  const { manufacturerId, deliveryAddress, notes, items } = c.req.valid('json');
  const storeId = c.get('storeId');
  const jewellerId = c.get('shopJewellerId');

  // Resolve prices from DB — never trust client-sent prices
  const resolvedItems = await Promise.all(
    items.map(async (item) => {
      const product = await getManufacturerProductById(item.manufacturerProductId);
      if (!product || product.status !== 'active') {
        throw new Error(`Product ${item.manufacturerProductId} not available`);
      }
      if (product.manufacturer_id !== manufacturerId) {
        throw new Error(`Product ${item.manufacturerProductId} does not belong to this manufacturer`);
      }
      if (item.quantity < product.min_order_qty) {
        throw new Error(
          `Min order qty for "${product.name}" is ${product.min_order_qty}`,
        );
      }
      return {
        manufacturerProductId: item.manufacturerProductId,
        quantity: item.quantity,
        unitPrice: product.base_price,
        productName: product.name,
      };
    }),
  );

  let order;
  try {
    order = await placeB2BOrder({
      storeId,
      jewellerId,
      manufacturerId,
      deliveryAddress,
      notes,
      items: resolvedItems,
    });
  } catch (err) {
    return sendError(c, 'bad_request', (err as Error).message, 400);
  }

  return sendData(c, order, 201);
});

// GET /api/store/orders
storeRoutes.get('/orders', async (c) => {
  const orders = await getB2BOrdersByStore(c.get('storeId'));
  return sendData(c, orders);
});

// GET /api/store/orders/:id
storeRoutes.get('/orders/:id', async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  return sendData(c, order);
});

// DELETE /api/store/orders/:id
storeRoutes.delete('/orders/:id', async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  if (order.status !== 'pending') {
    return sendError(c, 'bad_request', 'Only pending orders can be cancelled', 400);
  }
  await updateB2BOrderStatus(c.req.param('id'), 'cancelled', 'Cancelled by store');
  return sendData(c, { ok: true });
});
