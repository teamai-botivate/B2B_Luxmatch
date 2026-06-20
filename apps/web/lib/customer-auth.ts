// Server-side only utility — used by Hono API routes (Node runtime).
// Not a React Server Action; 'use server' removed because it rejects
// non-async exports (constants, types).

export const CUSTOMER_COOKIE_NAME = 'lm_customer';
export const CUSTOMER_COOKIE_TTL  = 7 * 24 * 60 * 60; // 7 days in seconds

export type CustomerCookiePayload = {
  customerId: string;
  phone: string;
  email: string;
  name: string | null;
};

const enc = new TextEncoder();

/**
 * Extract and URL-decode the lm_customer cookie from a request.
 *
 * Hono's setCookie() runs the value through encodeURIComponent, so the stored
 * cookie escapes the base64 payload's `=`, `/`, `+` as `%3D`, `%2F`, `%2B`.
 * Reading the raw Cookie header therefore yields an encoded string that
 * verifyCustomerCookie() can't parse — it must be decoded first, or every
 * customer request looks logged-out (401 → redirect to /login).
 */
export function readCustomerCookie(
  c: { req: { header: (k: string) => string | undefined } },
): string | undefined {
  const raw = c.req.header('cookie')
    ?.split(';')
    .find(s => s.trim().startsWith(CUSTOMER_COOKIE_NAME + '='))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret + ':customer'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signCustomerCookie(
  payload: CustomerCookiePayload,
  secret: string,
): Promise<string> {
  const data = JSON.stringify(payload);
  const b64  = btoa(data);
  const key  = await importKey(secret);
  const sig  = await crypto.subtle.sign('HMAC', key, enc.encode(b64));
  return `${b64}.${b64url(sig)}`;
}

export async function verifyCustomerCookie(
  cookie: string | undefined,
  secret: string,
): Promise<{ valid: true; payload: CustomerCookiePayload } | { valid: false }> {
  if (!cookie) return { valid: false };
  const [b64, sig] = cookie.split('.');
  if (!b64 || !sig) return { valid: false };
  try {
    const key   = await importKey(secret);
    const sigBuf = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const ok    = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(b64));
    if (!ok) return { valid: false };
    const payload = JSON.parse(atob(b64)) as CustomerCookiePayload;
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
