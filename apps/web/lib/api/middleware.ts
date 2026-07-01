import { getServerEnv } from '@luxematch/config';
import {
  MANUFACTURER_COOKIE_NAME,
  PIN_COOKIE_NAME,
  STORE_COOKIE_NAME,
  getShopJewellerIdOptional,
  verifyManufacturerCookie,
  verifyPinCookie,
  verifyStoreCookie,
} from '@luxematch/tenant';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';

import { sendError } from './envelope';

/**
 * Resolves the current jeweller_id and stashes it in Hono context. B2B mode
 * uses the lm_store cookie first; kiosk/device mode falls back to
 * SHOP_JEWELLER_ID. Handlers must never accept jeweller_id from request bodies.
 */
export const tenantMiddleware: MiddlewareHandler<{
  Variables: { shopJewellerId: string };
}> = async (c, next) => {
  const env = getServerEnv();
  const storeCookie = getCookie(c, STORE_COOKIE_NAME);
  const storeResult = await verifyStoreCookie(storeCookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  if (storeResult.valid) {
    c.set('shopJewellerId', storeResult.jewellerId);
    await next();
    return;
  }

  const envJewellerId = getShopJewellerIdOptional();
  if (!envJewellerId) {
    return sendError(c, 'unauthorized', 'Store login required', 401);
  }
  c.set('shopJewellerId', envJewellerId);
  await next();
};

/**
 * Verifies the lm_pin cookie. Applied to all mutation routes. Read routes
 * do not need this — customer mode is open by design.
 */
export const pinGuard: MiddlewareHandler<{
  Variables: { shopJewellerId: string };
}> = async (c, next) => {
  const env = getServerEnv();
  const storeCookie = getCookie(c, STORE_COOKIE_NAME);
  const storeResult = await verifyStoreCookie(storeCookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  if (storeResult.valid) {
    if (storeResult.jewellerId !== c.get('shopJewellerId')) {
      return sendError(c, 'forbidden', 'Store session does not match this tenant', 403);
    }
    await next();
    return;
  }

  const cookie = getCookie(c, PIN_COOKIE_NAME);
  const result = await verifyPinCookie(cookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_PIN_COOKIE_TTL_SECONDS,
  });
  if (!result.valid) {
    return sendError(c, 'unauthorized', 'PIN required', 401);
  }
  if (result.jewellerId !== c.get('shopJewellerId')) {
    // The cookie was signed for a different jeweller than this device is
    // configured for. Treat as forgery.
    return sendError(c, 'forbidden', 'PIN does not match this device', 403);
  }
  await next();
};

// ────────────────────────────────────────────────────────────────────────────
// B2B guards
// ────────────────────────────────────────────────────────────────────────────

/**
 * Verifies the lm_manufacturer cookie and stashes manufacturerId in context.
 * Applied to all /api/manufacturer/* mutation and read routes.
 */
export const manufacturerGuard: MiddlewareHandler<{
  Variables: { manufacturerId: string };
}> = async (c, next) => {
  const env = getServerEnv();
  const secret = env.MANUFACTURER_COOKIE_SECRET;
  if (!secret) {
    return sendError(c, 'internal_error', 'MANUFACTURER_COOKIE_SECRET not set', 500);
  }
  const cookie = getCookie(c, MANUFACTURER_COOKIE_NAME);
  const result = await verifyManufacturerCookie(cookie, {
    secret,
    ttlSeconds: env.LM_MANUFACTURER_COOKIE_TTL_SECONDS,
  });
  if (!result.valid) {
    return sendError(c, 'unauthorized', 'Manufacturer login required', 401);
  }
  c.set('manufacturerId', result.manufacturerId);
  await next();
};

/**
 * Verifies the lm_store cookie and stashes storeId + jewellerId in context.
 * Applied to all /api/store/* routes that need tenant isolation.
 * Overwrites shopJewellerId so downstream handlers work identically to
 * single-device mode — no other route code needs to change.
 */
export const storeGuard: MiddlewareHandler<{
  Variables: { shopJewellerId: string; storeId: string };
}> = async (c, next) => {
  const env = getServerEnv();
  const cookie = getCookie(c, STORE_COOKIE_NAME);
  const result = await verifyStoreCookie(cookie, {
    secret: env.LM_PIN_COOKIE_SECRET,
    ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
  });
  if (!result.valid) {
    return sendError(c, 'unauthorized', 'Store login required', 401);
  }
  // Overwrite shopJewellerId so all existing DB helpers work transparently.
  c.set('shopJewellerId', result.jewellerId);
  c.set('storeId', result.storeId);
  await next();
};
