import { getServerEnv } from '@luxematch/config';
import {
  getStoreByJewellerId,
  verifyStorePassword,
  selfRegisterStore,
  listManufacturerProducts,
  getManufacturerProductById,
  placeB2BOrder,
  getB2BOrdersByStore,
  getB2BOrderWithItems,
  updateB2BOrderStatus,
  getGuestOrdersByStore,
  getGuestOrderWithItems,
  updateStoreBranding,
  getStoreByEmail,
  getSupabaseServer,
  createPasswordResetToken,
  verifyPasswordResetToken,
  consumePasswordResetToken,
  type ManufacturerProductFilters,
} from '@luxematch/db';
import { hash } from 'bcryptjs';
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

// POST /api/store/register — public self-registration (pending manufacturer approval)
// Treat empty strings from optional form fields as "not provided".
const emptyToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const RegisterBody = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  ownerNaam: z.string().min(2),
  ownerPhone: z.string().min(7),
  // Optional fields: an empty string from the form must NOT fail validation.
  logoUrl: z.preprocess(emptyToUndef, z.string().url().optional()),
  fixedAddressStreet: z.string().min(3),
  fixedAddressCity: z.string().min(2),
  fixedAddressState: z.string().min(2),
  fixedAddressPincode: z.string().min(4),
  fixedAddressLandmark: z.preprocess(emptyToUndef, z.string().optional()),
  managerNaam: z.string().min(2),
  managerEmail: z.string().email(),
  managerPassword: z.string().min(6),
  managerPhone: z.preprocess(emptyToUndef, z.string().optional()),
});

storeRoutes.post('/register', zValidator('json', RegisterBody), async (c) => {
  const body = c.req.valid('json');
  try {
    const store = await selfRegisterStore(body);
    return sendData(c, {
      id: store.id,
      name: store.name,
      registration_status: store.registration_status,
      message: 'Registration submitted. You will receive access after manufacturer approval.',
    }, 201);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return sendError(c, 'conflict', 'Email already registered', 409);
    }
    return sendError(c, 'internal_error', msg, 500);
  }
});

// ── Forgot / Reset password (public) ─────────────────────────────────────────

const ForgotPasswordBody = z.object({
  email: z.string().email(),
});

// POST /api/store/forgot-password
storeRoutes.post('/forgot-password', zValidator('json', ForgotPasswordBody), async (c) => {
  const { email } = c.req.valid('json');
  // Always return 200 to avoid email enumeration
  try {
    const store = await getStoreByEmail(email);
    if (store) {
      const token = await createPasswordResetToken(email, 'store_owner', store.id);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const resetLink = `${appUrl}/store/reset-password?token=${token}`;

      const env = getServerEnv();
      if (
        env.SMTP_HOST &&
        env.SMTP_PORT &&
        env.SMTP_USER &&
        env.SMTP_PASS &&
        env.SMTP_FROM_EMAIL
      ) {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        });
        transporter
          .sendMail({
            from: `"${env.SMTP_FROM_NAME ?? 'Jewel Factory'}" <${env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: 'Reset your Jewel Factory store password',
            text: `Hi ${store.name},\n\nClick the link below to reset your store password (valid for 1 hour):\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
            html: `<p>Hi ${store.name},</p><p>Click the link below to reset your store password (valid for 1 hour):</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`,
          })
          .catch((err: unknown) => {
            console.error('[forgot-password/store] Email send failed:', err);
          });
      } else {
        console.warn('[forgot-password/store] SMTP not configured; reset link:', resetLink);
      }
    }
  } catch (err) {
    console.error('[forgot-password/store] Error:', err);
  }
  return sendData(c, { ok: true });
});

const ResetPasswordBody = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

// POST /api/store/reset-password
storeRoutes.post('/reset-password', zValidator('json', ResetPasswordBody), async (c) => {
  const { token, password } = c.req.valid('json');

  const tokenRow = await verifyPasswordResetToken(token, 'store_owner');
  if (!tokenRow) {
    return sendError(c, 'bad_request', 'Reset link is invalid or has expired', 400);
  }

  const passwordHash = await hash(password, 10);
  const sb = getSupabaseServer();
  const { error } = await sb
    .from('stores')
    .update({ password_hash: passwordHash })
    .eq('id', tokenRow.store_id ?? '');
  if (error) {
    return sendError(c, 'internal_error', 'Failed to update password', 500);
  }
  await consumePasswordResetToken(tokenRow.id);

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
        unitPrice: null,
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

// ── Store branding ────────────────────────────────────────────────────────────

const BrandingBody = z.object({
  logo_url: z.string().url().optional().or(z.literal('')),
  tagline: z.string().max(160).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
});

// PATCH /api/store/branding — update store branding fields
storeRoutes.patch('/branding', zValidator('json', BrandingBody), async (c) => {
  const body = c.req.valid('json');
  await updateStoreBranding(c.get('storeId'), {
    logo_url: body.logo_url || null,
    tagline: body.tagline || null,
    website_url: body.website_url || null,
  });
  return sendData(c, { ok: true });
});

// ── Kiosk / Guest Orders (store view) ────────────────────────────────────────

// GET /api/store/kiosk-orders  — store sees only its own guest orders
storeRoutes.get('/kiosk-orders', async (c) => {
  const orders = await getGuestOrdersByStore(c.get('storeId'));
  return sendData(c, orders);
});

// GET /api/store/kiosk-orders/:id
storeRoutes.get('/kiosk-orders/:id', async (c) => {
  const order = await getGuestOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.store_id !== c.get('storeId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  return sendData(c, order);
});


