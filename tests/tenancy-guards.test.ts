import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const JEWELLER = '00000000-0000-0000-0000-00000000d3e1';

function stubServerEnv(): void {
  vi.stubEnv('SHOP_JEWELLER_ID', JEWELLER);
  vi.stubEnv('LM_PIN_COOKIE_SECRET', 'a-test-secret-that-is-at-least-32-chars-long');
  vi.stubEnv('LM_PIN_COOKIE_TTL_SECONDS', '14400');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  vi.stubEnv('CLOUDINARY_API_KEY', 'cloudinary-key');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'cloudinary-secret');
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'cloudinary-cloud');
  vi.stubEnv('QDRANT_URL', 'https://qdrant.example.com');
  vi.stubEnv('QDRANT_API_KEY', 'qdrant-key');
  vi.stubEnv('QDRANT_COLLECTION', 'luxematch_products');
  vi.stubEnv('EMBEDDER_URL', 'https://embedder.example.com');
  vi.stubEnv('NODE_ENV', 'test');
}

function repoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  expect(start, `Expected ${name} to exist`).toBeGreaterThanOrEqual(0);
  const openBrace = source.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(openBrace, i + 1);
  }
  throw new Error(`Could not parse ${name}`);
}

describe('Qdrant tenancy filter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    stubServerEnv();
  });

  it('always places jeweller_id in the vector search must-filter', async () => {
    const { buildSearchMustFilter } = await import('@luxematch/qdrant');
    const must = buildSearchMustFilter({
      jewellerId: JEWELLER,
      categoryId: 'rings',
      metal: 'gold',
      hasTryOn: true,
      occasionTags: ['wedding'],
      priceMin: 10_000,
      priceMax: 50_000,
    });

    expect(must[0]).toEqual({ key: 'jeweller_id', match: { value: JEWELLER } });
    expect(must).toEqual(expect.arrayContaining([
      { key: 'category_id', match: { value: 'rings' } },
      { key: 'metal', match: { value: 'gold' } },
      { key: 'has_tryon', match: { value: true } },
      { key: 'occasion_tags', match: { any: ['wedding'] } },
      { key: 'price_max', range: { gte: 10_000, lte: 50_000 } },
    ]));
  });
});

describe('DB route/helper tenancy guards', () => {
  it('keeps cart mutations and count scoped by jeweller_id', () => {
    const cart = repoFile('packages/db/src/cart.ts');

    for (const name of ['updateCartItem', 'removeFromCart', 'clearCart', 'getCartCount']) {
      const body = functionBody(cart, name);
      expect(cart).toMatch(new RegExp(`function ${name}\\(\\s*jewellerId: string`));
      expect(body).toContain(".eq('jeweller_id', jewellerId)");
      expect(body).toContain(".eq('customer_id', customerId)");
    }

    expect(functionBody(cart, 'updateCartItem')).toContain(".eq('product_id', productId)");
    expect(functionBody(cart, 'removeFromCart')).toContain(".eq('product_id', productId)");
  });

  it('verifies customer ownership before address reads and writes', () => {
    const customers = repoFile('packages/db/src/customers.ts');

    const guard = functionBody(customers, 'assertCustomerBelongsToJeweller');
    expect(guard).toContain(".from('customers')");
    expect(guard).toContain(".eq('jeweller_id', jewellerId)");
    expect(guard).toContain(".eq('id', customerId)");
    expect(guard).toContain("throw new Error('Customer does not belong to this jeweller')");

    for (const name of ['getCustomerAddresses', 'upsertCustomerAddress']) {
      const body = functionBody(customers, name);
      expect(customers).toMatch(new RegExp(`function ${name}\\(\\s*jewellerId: string`));
      expect(body).toContain('await assertCustomerBelongsToJeweller(jewellerId, customerId)');
    }
  });

  it('keeps route callers passing jewellerId into scoped cart/address helpers', () => {
    const cartRoutes = repoFile('apps/web/lib/api/cart-routes.ts');
    const orderRoutes = repoFile('apps/web/lib/api/customer-orders.ts');

    expect(cartRoutes).toContain('await updateCartItem(jewellerId, session.payload.customerId');
    expect(cartRoutes).toContain('await removeFromCart(jewellerId, session.payload.customerId');
    expect(cartRoutes).toContain('await clearCart(jewellerId, session.payload.customerId)');

    expect(orderRoutes).toContain('await getCustomerAddresses(jewellerId, session.payload.customerId)');
    expect(orderRoutes).toContain('await upsertCustomerAddress(jewellerId, customerId');
    expect(orderRoutes).toContain('await clearCart(jewellerId, customerId)');
  });
});
