// Server-side only utility — used by Hono API routes (Node runtime).
// Not a React Server Action; 'use server' removed because it rejects
// non-async exports (constants, types).

export const CUSTOMER_COOKIE_NAME = 'lm_customer';
export const CUSTOMER_COOKIE_TTL  = 7 * 24 * 60 * 60; // 7 days in seconds

export type CustomerCookiePayload = {
  customerId: string;
  phone: string;
  name: string | null;
};

const enc = new TextEncoder();

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
