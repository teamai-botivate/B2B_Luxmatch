import { getServerEnv } from '@luxematch/config';
import { addToCart, clearCart, getCart, removeFromCart, updateCartItem } from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { readCustomerCookie, verifyCustomerCookie } from '../customer-auth';
import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };
export const cartRoutes = new Hono<Vars>();
cartRoutes.use('*', tenantMiddleware);

async function getSession(c: { req: { header: (k: string) => string | undefined } }, secret: string) {
  const cookie = readCustomerCookie(c);
  return verifyCustomerCookie(cookie, secret);
}

// GET /api/customer/cart
cartRoutes.get('/', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await getSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendData(c, { items: [], total: 0 });

  const items = await getCart(jewellerId, session.payload.customerId);
  const total = items.reduce((sum, i) => sum + (i.product.price_min ?? 0) * i.quantity, 0);
  return sendData(c, { items, total, count: items.reduce((s, i) => s + i.quantity, 0) });
});

// POST /api/customer/cart  { product_id, quantity }
const AddBody = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(10).default(1),
});
cartRoutes.post('/', zValidator('json', AddBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await getSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login to add to cart', 401);

  const { product_id, quantity } = c.req.valid('json');
  await addToCart(jewellerId, session.payload.customerId, product_id, quantity);
  return sendData(c, { ok: true });
});

// PATCH /api/customer/cart/:productId  { quantity }
const PatchBody = z.object({ quantity: z.number().int().min(0).max(10) });
cartRoutes.patch('/:productId', zValidator('json', PatchBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await getSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);

  const productId = c.req.param('productId');
  const { quantity } = c.req.valid('json');
  await updateCartItem(jewellerId, session.payload.customerId, productId, quantity);
  return sendData(c, { ok: true });
});

// DELETE /api/customer/cart/:productId
cartRoutes.delete('/:productId', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await getSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);

  await removeFromCart(jewellerId, session.payload.customerId, c.req.param('productId'));
  return sendData(c, { ok: true });
});

// DELETE /api/customer/cart  (clear all)
cartRoutes.delete('/', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await getSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);
  await clearCart(jewellerId, session.payload.customerId);
  return sendData(c, { ok: true });
});
