import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Public types
//
// This entry point is EDGE-SAFE — it must not import node:crypto. PIN hashing
// lives in @luxematch/tenant/server. Cookie signing here uses Web Crypto's
// SubtleCrypto, which is available in both Node 20+ and the Edge / Middleware
// runtime.
// ────────────────────────────────────────────────────────────────────────────

export const PinSchema = z
  .string()
  .regex(/^\d{6}$/, 'PIN must be exactly 6 digits');

export type ShopContext = {
  jewellerId: string;
};

export const PIN_COOKIE_NAME = 'lm_pin';
export const PIN_FAILURE_LIMIT = 5;
export const PIN_FAILURE_WINDOW_MS = 60_000;

// ────────────────────────────────────────────────────────────────────────────
// SHOP_JEWELLER_ID resolution
// ────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getShopJewellerId(env: Record<string, string | undefined> = process.env): string {
  const id = env.SHOP_JEWELLER_ID;
  if (!id || !UUID_RE.test(id)) {
    throw new Error(
      '[@luxematch/tenant] SHOP_JEWELLER_ID is missing or not a UUID. ' +
        'Run `pnpm provision-shop` on this device before starting the app.',
    );
  }
  return id;
}

// B2B mode: returns undefined when SHOP_JEWELLER_ID is blank.
// Use this in routes that resolve jeweller_id from the lm_store cookie instead.
export function getShopJewellerIdOptional(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const id = env.SHOP_JEWELLER_ID;
  return id && UUID_RE.test(id) ? id : undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// PIN cookie (HMAC-signed via Web Crypto SubtleCrypto)
//
// Format: <jewellerId>.<issuedAtMs>.<sigBase64Url>
//   sig = HMAC-SHA256(secret, `${jewellerId}.${issuedAtMs}`)
// ────────────────────────────────────────────────────────────────────────────

export type PinCookieOptions = {
  secret: string;
  ttlSeconds: number;
  secure?: boolean;
};

export type PinCookie = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    sameSite: 'strict';
    secure: boolean;
    path: string;
    maxAge: number;
  };
};

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const padded = s.replaceAll('-', '+').replaceAll('_', '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const bin = atob(padded + '='.repeat(padLen));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  const cached = hmacKeyCache.get(secret);
  if (cached) return cached;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  hmacKeyCache.set(secret, key);
  return key;
}

const hmacKeyCache = new Map<string, CryptoKey>();

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function issuePinCookie(
  jewellerId: string,
  opts: PinCookieOptions,
): Promise<PinCookie> {
  const issuedAt = Date.now();
  const payload = `${jewellerId}.${issuedAt}`;
  const key = await importHmacKey(opts.secret);
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  const sig = b64urlFromBytes(new Uint8Array(sigBuf));
  return {
    name: PIN_COOKIE_NAME,
    value: `${payload}.${sig}`,
    options: {
      httpOnly: true,
      sameSite: 'strict',
      secure: opts.secure ?? process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: opts.ttlSeconds,
    },
  };
}

export type PinCookieVerification =
  | { valid: true; jewellerId: string; issuedAt: number }
  | { valid: false; reason: 'missing' | 'malformed' | 'bad_signature' | 'expired' };

export async function verifyPinCookie(
  value: string | undefined,
  opts: PinCookieOptions,
): Promise<PinCookieVerification> {
  if (!value) return { valid: false, reason: 'missing' };
  const parts = value.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed' };
  const [jewellerId, issuedAtRaw, providedSig] = parts as [string, string, string];
  if (!UUID_RE.test(jewellerId)) return { valid: false, reason: 'malformed' };
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { valid: false, reason: 'malformed' };

  const key = await importHmacKey(opts.secret);
  const expectedSigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${jewellerId}.${issuedAt}`),
  );
  const expected = new Uint8Array(expectedSigBuf);
  let provided: Uint8Array;
  try {
    provided = b64urlToBytes(providedSig);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualBytes(provided, expected)) {
    return { valid: false, reason: 'bad_signature' };
  }

  const ageMs = Date.now() - issuedAt;
  if (ageMs > opts.ttlSeconds * 1000) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, jewellerId, issuedAt };
}

// ────────────────────────────────────────────────────────────────────────────
// In-memory PIN failure tracker (per process)
//
// LEGACY soft rate limit. The authoritative limit for /api/shop/unlock is now
// durable: countRecentPinFailures() in @luxematch/db reads pin_audit_events, so
// it survives deploys/restarts and is shared across instances. These pure,
// Edge-safe helpers remain for unit-testability and as an optional in-process
// fast-path; the unlock route no longer depends on them. PIN_FAILURE_LIMIT /
// PIN_FAILURE_WINDOW_MS are the shared tuning constants for both layers.
// ────────────────────────────────────────────────────────────────────────────

type FailureRecord = { count: number; firstFailureMs: number };
const failureMap = new Map<string, FailureRecord>();

export function registerPinFailure(key: string, now = Date.now()): {
  locked: boolean;
  retryAfterMs: number;
} {
  const existing = failureMap.get(key);
  if (!existing || now - existing.firstFailureMs > PIN_FAILURE_WINDOW_MS) {
    failureMap.set(key, { count: 1, firstFailureMs: now });
    return { locked: false, retryAfterMs: 0 };
  }
  existing.count += 1;
  const locked = existing.count >= PIN_FAILURE_LIMIT;
  const retryAfterMs = locked
    ? PIN_FAILURE_WINDOW_MS - (now - existing.firstFailureMs)
    : 0;
  return { locked, retryAfterMs };
}

export function clearPinFailures(key: string): void {
  failureMap.delete(key);
}

export function isPinLocked(key: string, now = Date.now()): { locked: boolean; retryAfterMs: number } {
  const rec = failureMap.get(key);
  if (!rec) return { locked: false, retryAfterMs: 0 };
  if (now - rec.firstFailureMs > PIN_FAILURE_WINDOW_MS) {
    failureMap.delete(key);
    return { locked: false, retryAfterMs: 0 };
  }
  if (rec.count >= PIN_FAILURE_LIMIT) {
    return { locked: true, retryAfterMs: PIN_FAILURE_WINDOW_MS - (now - rec.firstFailureMs) };
  }
  return { locked: false, retryAfterMs: 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Manufacturer cookie (HMAC-signed, same primitives as PIN cookie)
//
// Format: <manufacturerId>.<issuedAtMs>.<sigBase64Url>
//   sig = HMAC-SHA256(MANUFACTURER_COOKIE_SECRET, `<manufacturerId>.<issuedAtMs>`)
// Signed with a SEPARATE secret from lm_pin so a leaked store secret
// cannot be used to forge a manufacturer session and vice-versa.
// ────────────────────────────────────────────────────────────────────────────

export const MANUFACTURER_COOKIE_NAME = 'lm_manufacturer';

export type ManufacturerCookieOptions = {
  secret: string;
  ttlSeconds: number;
  secure?: boolean;
};

export type ManufacturerCookieVerification =
  | { valid: true; manufacturerId: string; issuedAt: number }
  | { valid: false; reason: 'missing' | 'malformed' | 'bad_signature' | 'expired' };

export async function issueManufacturerCookie(
  manufacturerId: string,
  opts: ManufacturerCookieOptions,
): Promise<PinCookie> {
  const issuedAt = Date.now();
  const payload = `${manufacturerId}.${issuedAt}`;
  const key = await importHmacKey(opts.secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sig = b64urlFromBytes(new Uint8Array(sigBuf));
  return {
    name: MANUFACTURER_COOKIE_NAME,
    value: `${payload}.${sig}`,
    options: {
      httpOnly: true,
      sameSite: 'strict',
      secure: opts.secure ?? process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: opts.ttlSeconds,
    },
  };
}

export async function verifyManufacturerCookie(
  value: string | undefined,
  opts: ManufacturerCookieOptions,
): Promise<ManufacturerCookieVerification> {
  if (!value) return { valid: false, reason: 'missing' };
  const parts = value.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed' };
  const [manufacturerId, issuedAtRaw, providedSig] = parts as [string, string, string];
  if (!UUID_RE.test(manufacturerId)) return { valid: false, reason: 'malformed' };
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { valid: false, reason: 'malformed' };

  const key = await importHmacKey(opts.secret);
  const expectedSigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${manufacturerId}.${issuedAt}`),
  );
  let provided: Uint8Array;
  try {
    provided = b64urlToBytes(providedSig);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualBytes(provided, new Uint8Array(expectedSigBuf))) {
    return { valid: false, reason: 'bad_signature' };
  }
  if (Date.now() - issuedAt > opts.ttlSeconds * 1000) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, manufacturerId, issuedAt };
}

// ────────────────────────────────────────────────────────────────────────────
// Store cookie (HMAC-signed, reuses LM_PIN_COOKIE_SECRET)
//
// Format: <storeId>.<jewellerId>.<issuedAtMs>.<sigBase64Url>
//   sig = HMAC-SHA256(LM_PIN_COOKIE_SECRET + ":store", `<storeId>.<jewellerId>.<issuedAtMs>`)
//
// Carries jewellerId in the payload so middleware can resolve tenancy without
// a DB lookup on every request. The ":store" suffix namespaces the key so a
// PIN cookie value cannot be replayed as a store cookie.
// ────────────────────────────────────────────────────────────────────────────

export const STORE_COOKIE_NAME = 'lm_store';

export type StoreCookieOptions = {
  secret: string; // pass LM_PIN_COOKIE_SECRET
  ttlSeconds: number;
  secure?: boolean;
};

export type StoreCookieVerification =
  | { valid: true; storeId: string; jewellerId: string; issuedAt: number }
  | { valid: false; reason: 'missing' | 'malformed' | 'bad_signature' | 'expired' };

export async function issueStoreCookie(
  storeId: string,
  jewellerId: string,
  opts: StoreCookieOptions,
): Promise<PinCookie> {
  const issuedAt = Date.now();
  const payload = `${storeId}.${jewellerId}.${issuedAt}`;
  // namespace key so PIN cookie can't be replayed as a store cookie
  const key = await importHmacKey(opts.secret + ':store');
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sig = b64urlFromBytes(new Uint8Array(sigBuf));
  return {
    name: STORE_COOKIE_NAME,
    value: `${payload}.${sig}`,
    options: {
      httpOnly: true,
      sameSite: 'strict',
      secure: opts.secure ?? process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: opts.ttlSeconds,
    },
  };
}

export async function verifyStoreCookie(
  value: string | undefined,
  opts: StoreCookieOptions,
): Promise<StoreCookieVerification> {
  if (!value) return { valid: false, reason: 'missing' };
  const parts = value.split('.');
  if (parts.length !== 4) return { valid: false, reason: 'malformed' };
  const [storeId, jewellerId, issuedAtRaw, providedSig] = parts as [string, string, string, string];
  if (!UUID_RE.test(storeId) || !UUID_RE.test(jewellerId)) {
    return { valid: false, reason: 'malformed' };
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return { valid: false, reason: 'malformed' };

  const key = await importHmacKey(opts.secret + ':store');
  const expectedSigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${storeId}.${jewellerId}.${issuedAt}`),
  );
  let provided: Uint8Array;
  try {
    provided = b64urlToBytes(providedSig);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (!timingSafeEqualBytes(provided, new Uint8Array(expectedSigBuf))) {
    return { valid: false, reason: 'bad_signature' };
  }
  if (Date.now() - issuedAt > opts.ttlSeconds * 1000) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, storeId, jewellerId, issuedAt };
}

export const PACKAGE_NAME = '@luxematch/tenant';
