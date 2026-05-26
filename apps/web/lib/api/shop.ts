import { getServerEnv } from '@luxematch/config';
import {
  getJewellerInternal,
  getJewellerPublic,
  getJewellerSettings,
  getShopAnalytics,
  getShopMetrics,
  updateJewellerInfo,
  updateJewellerPinHash,
} from '@luxematch/db';
import {
  PIN_COOKIE_NAME,
  PinSchema,
  clearPinFailures,
  isPinLocked,
  issuePinCookie,
  registerPinFailure,
} from '@luxematch/tenant';
import { hashPin, verifyPin } from '@luxematch/tenant/server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { clearCache, getCached } from './cache';
import { pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const shopRoutes = new Hono<Vars>();

shopRoutes.use('*', tenantMiddleware);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/shop
//   Public info about the jeweller this device is bound to. Used by the
//   header to display "Welcome to <store_name>".
// ────────────────────────────────────────────────────────────────────────────
shopRoutes.get('/', async (c) => {
  const id = c.get('shopJewellerId');
  const jeweller = await getCached(`shop:public:${id}`, 60_000, () =>
    getJewellerPublic(id),
  );
  if (!jeweller) {
    return sendError(
      c,
      'not_found',
      'This device is configured with a SHOP_JEWELLER_ID that does not exist in the database. Re-run pnpm provision-shop.',
      404,
    );
  }
  return sendData(c, jeweller);
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/shop/unlock
//   Body: { pin: '######' }
//   On success: sets lm_pin HttpOnly cookie, returns { ok: true }
// ────────────────────────────────────────────────────────────────────────────
const UnlockBody = z.object({ pin: PinSchema });

shopRoutes.post('/unlock', zValidator('json', UnlockBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const lockKey = `unlock:${jewellerId}`;

  const lockState = isPinLocked(lockKey);
  if (lockState.locked) {
    return sendError(
      c,
      'rate_limited',
      `Too many failed attempts. Try again in ${Math.ceil(lockState.retryAfterMs / 1000)}s.`,
      429,
    );
  }

  const { pin } = c.req.valid('json');

  const jeweller = await getCached(`shop:internal:${jewellerId}`, 5 * 60_000, () =>
    getJewellerInternal(jewellerId),
  );
  if (!jeweller) {
    return sendError(c, 'not_found', 'Shop not provisioned', 404);
  }

  const ok = verifyPin(pin, jeweller.pin_hash);
  if (!ok) {
    const r = registerPinFailure(lockKey);
    if (r.locked) {
      return sendError(
        c,
        'rate_limited',
        `Too many failed attempts. Try again in ${Math.ceil(r.retryAfterMs / 1000)}s.`,
        429,
      );
    }
    return sendError(c, 'unauthorized', 'Incorrect PIN', 401);
  }

  clearPinFailures(lockKey);

  const cookie = await issuePinCookie(jewellerId, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_PIN_COOKIE_TTL_SECONDS,
  });
  setCookie(c, cookie.name, cookie.value, cookie.options);
  return sendData(c, { ok: true });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/shop/lock
//   Clears the PIN cookie. One-tap exit from jeweller mode.
// ────────────────────────────────────────────────────────────────────────────
shopRoutes.post('/lock', (c) => {
  deleteCookie(c, PIN_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/shop/pin/change  // PIN GUARD
//   Body: { currentPin, newPin }
//   Verifies currentPin against jewellers.pin_hash, then writes a new hash.
// ────────────────────────────────────────────────────────────────────────────
const PinChangeBody = z.object({
  currentPin: PinSchema,
  newPin: PinSchema,
});

shopRoutes.post(
  '/pin/change',
  pinGuard,
  zValidator('json', PinChangeBody),
  async (c) => {
    const jewellerId = c.get('shopJewellerId');
    const { currentPin, newPin } = c.req.valid('json');

    const jeweller = await getJewellerInternal(jewellerId);
    if (!jeweller) {
      return sendError(c, 'not_found', 'Shop not provisioned', 404);
    }
    if (!verifyPin(currentPin, jeweller.pin_hash)) {
      return sendError(c, 'unauthorized', 'Current PIN is incorrect', 401);
    }
    if (currentPin === newPin) {
      return sendError(c, 'bad_request', 'New PIN must differ from current', 400);
    }
    await updateJewellerPinHash(jewellerId, hashPin(newPin));
    clearCache(`shop:internal:${jewellerId}`);
    return sendData(c, { ok: true });
  },
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/shop/metrics  // PIN GUARD
//   Dashboard counts. Per-block error tolerance lives in getShopMetrics.
// ────────────────────────────────────────────────────────────────────────────
shopRoutes.get('/metrics', pinGuard, async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const metrics = await getCached(`shop:metrics:${jewellerId}`, 30_000, () =>
    getShopMetrics(jewellerId),
  );
  return sendData(c, metrics);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/shop/analytics  // PIN GUARD
//   30-day rollups for charts on /jeweller/analytics.
// ────────────────────────────────────────────────────────────────────────────
shopRoutes.get('/analytics', pinGuard, async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const analytics = await getCached(`shop:analytics:${jewellerId}`, 30_000, () =>
    getShopAnalytics(jewellerId),
  );
  return sendData(c, analytics);
});

shopRoutes.get('/settings', pinGuard, async (c) => {
  const settings = await getJewellerSettings(c.get('shopJewellerId'));
  if (!settings) {
    return sendError(c, 'not_found', 'Shop not provisioned', 404);
  }
  return sendData(c, settings);
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/shop  // PIN GUARD
//   Edit store info + idle-reset config. PIN change lives on its own route.
// ────────────────────────────────────────────────────────────────────────────
const ShopPatchBody = z.object({
  store_name: z.string().min(1).max(120).optional(),
  city: z.string().max(120).nullable().optional(),
  gstin: z.string().max(40).nullable().optional(),
  owner_name: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  idle_reset_enabled: z.boolean().optional(),
  idle_reset_seconds: z.number().int().min(15).max(600).optional(),
});

shopRoutes.patch('/', pinGuard, zValidator('json', ShopPatchBody), async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const body = c.req.valid('json');
  const updated = await updateJewellerInfo(jewellerId, body);
  if (!updated) {
    return sendError(c, 'not_found', 'Shop not provisioned', 404);
  }
  clearCache(`shop:public:${jewellerId}`);
  clearCache(`shop:internal:${jewellerId}`);
  return sendData(c, updated);
});
