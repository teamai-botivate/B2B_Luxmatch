import { getServerEnv } from '@luxematch/config';
import {
  PIN_COOKIE_NAME,
  getShopJewellerId,
  verifyPinCookie,
} from '@luxematch/tenant';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';

import { sendError } from './envelope';

/**
 * Resolves SHOP_JEWELLER_ID from env on every request and stashes it in
 * Hono context. Read handlers use c.get('shopJewellerId') directly; write
 * handlers MUST never accept a jeweller_id from the request body.
 */
export const tenantMiddleware: MiddlewareHandler<{
  Variables: { shopJewellerId: string };
}> = async (c, next) => {
  const id = getShopJewellerId();
  c.set('shopJewellerId', id);
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
