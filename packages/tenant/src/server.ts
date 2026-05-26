// Node-only subpath. Importing this file pulls in node:crypto, so do NOT
// import from middleware or any code that runs on the Edge runtime. Used by:
//   - scripts/provision-shop.ts (hash PIN at install time)
//   - Hono route handlers (verify PIN against jewellers.pin_hash in Phase 3)

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { PinSchema } from './index';

const SCRYPT_N = 1 << 14;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

export function hashPin(pin: string): string {
  PinSchema.parse(pin);
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPin(pin: string, encoded: string): boolean {
  if (!PinSchema.safeParse(pin).success) return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4]!;
  const expectedHex = parts[5]!;
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(expectedHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length !== SCRYPT_KEYLEN) return false;
  const actual = scryptSync(pin, salt, expected.length, { N, r, p });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
