import { getServerEnv } from '@luxematch/config';
import {
  getJewellerInternal,
  getJewellerPublic,
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
  const jeweller = await getJewellerPublic(id);
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

  const jeweller = await getJewellerInternal(jewellerId);
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
    return sendData(c, { ok: true });
  },
);
