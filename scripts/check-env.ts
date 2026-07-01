#!/usr/bin/env tsx
/**
 * check-env.ts — verify all required environment variables are present.
 *
 * Run with: pnpm check-env  (loads apps/web/.env.local)
 * Exits 1 if any required var is missing so CI can gate on it.
 */

type Var = { name: string; required: boolean; note?: string };

const VARS: Var[] = [
  // Tenancy
  { name: 'SHOP_JEWELLER_ID', required: false, note: 'per-device shop id; leave unset for B2B store-cookie mode' },
  { name: 'LM_PIN_COOKIE_SECRET', required: true, note: '>= 32 chars' },
  { name: 'LM_PIN_COOKIE_TTL_SECONDS', required: false },
  { name: 'LM_STORE_COOKIE_TTL_SECONDS', required: false, note: 'defaults to 28800' },
  // Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, note: 'server-only, bypasses RLS' },
  // Cloudinary
  { name: 'CLOUDINARY_CLOUD_NAME', required: true },
  { name: 'CLOUDINARY_API_KEY', required: true },
  { name: 'CLOUDINARY_API_SECRET', required: true, note: 'server-only' },
  { name: 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', required: true },
  // Qdrant
  { name: 'QDRANT_URL', required: true },
  { name: 'QDRANT_API_KEY', required: true },
  { name: 'QDRANT_COLLECTION', required: false, note: 'defaults to luxematch_products' },
  // Embedder
  { name: 'EMBEDDER_URL', required: true, note: 'OpenCLIP FastAPI sidecar' },
  { name: 'EMBEDDER_API_KEY', required: false, note: 'optional bearer token' },
  // B2B
  { name: 'MANUFACTURER_COOKIE_SECRET', required: false, note: 'required for manufacturer portal' },
  { name: 'LM_MANUFACTURER_COOKIE_TTL_SECONDS', required: false, note: 'defaults to 28800' },
  { name: 'QDRANT_MANUFACTURER_COLLECTION', required: false, note: 'defaults to luxematch_manufacturer_products' },
];

function mask(v: string): string {
  if (v.length <= 8) return '••••';
  return `${v.slice(0, 4)}…${v.slice(-2)}`;
}

let missing = 0;
console.log('Environment check\n─────────────────');
for (const v of VARS) {
  const val = process.env[v.name];
  if (val && val.trim()) {
    console.log(`  ✓ ${v.name} = ${mask(val.trim())}`);
  } else if (v.required) {
    missing++;
    console.log(`  ✗ ${v.name}  MISSING${v.note ? ` — ${v.note}` : ''}`);
  } else {
    console.log(`  · ${v.name}  (optional, unset)${v.note ? ` — ${v.note}` : ''}`);
  }
}

if (missing > 0) {
  console.error(`\n${missing} required variable(s) missing.`);
  process.exit(1);
}
console.log('\nAll required variables present.');
