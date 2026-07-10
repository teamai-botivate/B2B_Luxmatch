import { getServerEnv } from '@luxematch/config';
import { generateManufacturerSignedUploadParams } from '@luxematch/cloudinary';
import {
  addManufacturerProductImage,
  addManufacturerTryOnAsset,
  removeManufacturerTryOnAsset,
  getManufacturerTryOnAsset,
  createManufacturerProduct,
  deleteManufacturerProduct,
  getManufacturerById,
  getManufacturerProductById,
  listManufacturerProducts,
  updateManufacturerProduct,
  verifyManufacturerPassword,
  getB2BOrdersByManufacturer,
  getB2BOrderWithItems,
  updateB2BOrderStatus,
  createStore,
  getStoreById,
  formatStoreFixedAddress,
  listStoresByManufacturer,
  updateStoreStatus,
  updateStore,
  updateStorePassword,
  deleteStore,
  listPendingStores,
  approveStoreRegistration,
  rejectStoreRegistration,
  getGuestOrdersByManufacturer,
  getGuestOrderWithItems,
  updateGuestOrderStatus,
  listCustomDesignOrdersByManufacturer,
  updateCustomDesignOrderStatus,
  type B2BOrderStatus,
  type GuestOrderStatus,
  type CustomDesignOrderStatus,
} from '@luxematch/db';
import { issueManufacturerCookie, MANUFACTURER_COOKIE_NAME } from '@luxematch/tenant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';

import { sendData, sendError } from './envelope';
import { indexProductForJeweller, indexManufacturerProduct } from './embeddings';
import { manufacturerGuard } from './middleware';

type Vars = { Variables: { manufacturerId: string } };

export const manufacturerRoutes = new Hono<Vars>();

// ── Auth (public) ─────────────────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/manufacturer/login
manufacturerRoutes.post('/login', zValidator('json', LoginBody), async (c) => {
  const env = getServerEnv();
  const secret = env.MANUFACTURER_COOKIE_SECRET;
  if (!secret) return sendError(c, 'internal_error', 'MANUFACTURER_COOKIE_SECRET not set', 500);

  const { email, password } = c.req.valid('json');
  const row = await verifyManufacturerPassword(email, password);
  if (!row) return sendError(c, 'unauthorized', 'Invalid email or password', 401);

  const cookie = await issueManufacturerCookie(row.id, {
    secret,
    ttlSeconds: env.LM_MANUFACTURER_COOKIE_TTL_SECONDS,
  });
  setCookie(c, cookie.name, cookie.value, cookie.options);
  return sendData(c, { id: row.id, name: row.name, email: row.email });
});

// POST /api/manufacturer/logout
manufacturerRoutes.post('/logout', (c) => {
  deleteCookie(c, MANUFACTURER_COOKIE_NAME, { path: '/' });
  return sendData(c, { ok: true });
});

// ── All routes below require lm_manufacturer cookie ───────────────────────────

manufacturerRoutes.use('*', manufacturerGuard);

// GET /api/manufacturer/me
manufacturerRoutes.get('/me', async (c) => {
  const mfr = await getManufacturerById(c.get('manufacturerId'));
  if (!mfr) return sendError(c, 'not_found', 'Manufacturer not found', 404);
  return sendData(c, mfr);
});

// ── Products ──────────────────────────────────────────────────────────────────

const ProductFiltersQuery = z.object({
  category: z.string().optional(),
  metal: z.string().optional(),
  status: z.enum(['all', 'draft', 'active', 'archived']).optional(),
  search: z.string().optional(),
});

// GET /api/manufacturer/products
manufacturerRoutes.get('/products', zValidator('query', ProductFiltersQuery), async (c) => {
  const { status, ...rest } = c.req.valid('query');
  const products = await listManufacturerProducts({
    ...rest,
    ...(status ? { status } : {}),
  });
  return sendData(c, products);
});

// GET /api/manufacturer/products/:id
manufacturerRoutes.get('/products/:id', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  return sendData(c, product);
});

const CreateProductBody = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  description: z.string().optional(),
  weightGrams: z.number().positive().optional(),
  purity: z.string().optional(),
  gemstones: z.array(z.string()).optional(),
  occasionTags: z.array(z.string()).optional(),
  styleTags: z.array(z.string()).optional(),
  minOrderQty: z.number().int().positive().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

// POST /api/manufacturer/products
manufacturerRoutes.post('/products', zValidator('json', CreateProductBody), async (c) => {
  const body = c.req.valid('json');
  const manufacturerId = c.get('manufacturerId');
  const product = await createManufacturerProduct({ manufacturerId, ...body });
  // Fire-and-forget: index into Qdrant once image is available (no-op if no image yet)
  void indexManufacturerProduct(manufacturerId, product.id).catch((e) =>
    console.warn('[manufacturer] auto-embed on create failed', e),
  );
  return sendData(c, product, 201);
});

const UpdateProductBody = CreateProductBody.partial();

// PATCH /api/manufacturer/products/:id
manufacturerRoutes.patch('/products/:id', zValidator('json', UpdateProductBody), async (c) => {
  const manufacturerId = c.get('manufacturerId');
  const productId = c.req.param('id');
  const existing = await getManufacturerProductById(productId);
  if (!existing) return sendError(c, 'not_found', 'Product not found', 404);
  if (existing.manufacturer_id !== manufacturerId) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  const updated = await updateManufacturerProduct(productId, c.req.valid('json'));
  // Fire-and-forget: re-index after metadata update
  void indexManufacturerProduct(manufacturerId, productId).catch((e) =>
    console.warn('[manufacturer] auto-embed on update failed', e),
  );
  return sendData(c, updated);
});

// DELETE /api/manufacturer/products/:id
manufacturerRoutes.delete('/products/:id', async (c) => {
  const existing = await getManufacturerProductById(c.req.param('id'));
  if (!existing) return sendError(c, 'not_found', 'Product not found', 404);
  if (existing.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  await deleteManufacturerProduct(c.req.param('id'));
  return sendData(c, { ok: true });
});

// ── B2B Orders ────────────────────────────────────────────────────────────────

// GET /api/manufacturer/orders
manufacturerRoutes.get('/orders', async (c) => {
  const orders = await getB2BOrdersByManufacturer(c.get('manufacturerId'));
  return sendData(c, orders);
});

// GET /api/manufacturer/orders/:id
manufacturerRoutes.get('/orders/:id', async (c) => {
  const order = await getB2BOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  return sendData(c, order);
});

const UpdateOrderStatusBody = z.object({
  status: z.enum(['confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
});

// PATCH /api/manufacturer/orders/:id
manufacturerRoutes.patch(
  '/orders/:id',
  zValidator('json', UpdateOrderStatusBody),
  async (c) => {
    const order = await getB2BOrderWithItems(c.req.param('id'));
    if (!order) return sendError(c, 'not_found', 'Order not found', 404);
    if (order.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your order', 403);
    }
    const { status, note, trackingNumber } = c.req.valid('json');
    const result = await updateB2BOrderStatus(
      c.req.param('id'),
      status as B2BOrderStatus,
      note,
      trackingNumber,
    );
    const fulfilledProductIds = [
      ...(result.fulfillment?.createdProductIds ?? []),
      ...(result.fulfillment?.updatedProductIds ?? []),
    ];
    if (fulfilledProductIds.length > 0) {
      void Promise.allSettled(
        fulfilledProductIds.map((productId) =>
          indexProductForJeweller(order.jeweller_id, productId),
        ),
      ).then((results) => {
        const failed = results.filter((entry) => entry.status === 'rejected');
        if (failed.length > 0) {
          console.warn('[b2b] fulfilled product indexing failures', failed);
        }
      });
    }
    return sendData(c, { ok: true, ...result });
  },
);

// Stores
manufacturerRoutes.get('/stores', async (c) => {
  const stores = await listStoresByManufacturer(c.get('manufacturerId'));
  return sendData(c, stores);
});

const CreateStoreBody = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
  password: z.string().min(6),
  city: z.string().optional(),
  phone: z.string().optional(),
});

manufacturerRoutes.post('/stores', zValidator('json', CreateStoreBody), async (c) => {
  try {
    const body = c.req.valid('json');
    const store = await createStore({
      manufacturerId: c.get('manufacturerId'),
      ...body,
    });
    return sendData(c, store, 201);
  } catch (err) {
    return sendError(c, 'bad_request', (err as Error).message, 400);
  }
});

const UpdateStoreStatusBody = z.object({
  isActive: z.boolean(),
});

manufacturerRoutes.patch(
  '/stores/:id/status',
  zValidator('json', UpdateStoreStatusBody),
  async (c) => {
    const store = await updateStoreStatus(
      c.get('manufacturerId'),
      c.req.param('id'),
      c.req.valid('json').isActive,
    );
    return sendData(c, store);
  },
);

const UpdateStoreBody = z.object({
  name: z.string().min(1).max(160).optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

// PATCH /api/manufacturer/stores/:id — edit store details
manufacturerRoutes.patch(
  '/stores/:id',
  zValidator('json', UpdateStoreBody),
  async (c) => {
    try {
      const store = await updateStore(
        c.get('manufacturerId'),
        c.req.param('id'),
        c.req.valid('json'),
      );
      return sendData(c, store);
    } catch (err) {
      return sendError(c, 'bad_request', (err as Error).message, 400);
    }
  },
);

const UpdateStorePasswordBody = z.object({
  password: z.string().min(6),
});

// PUT /api/manufacturer/stores/:id/password — reset store login password
manufacturerRoutes.put(
  '/stores/:id/password',
  zValidator('json', UpdateStorePasswordBody),
  async (c) => {
    try {
      await updateStorePassword(
        c.get('manufacturerId'),
        c.req.param('id'),
        c.req.valid('json').password,
      );
      return sendData(c, { ok: true });
    } catch (err) {
      return sendError(c, 'bad_request', (err as Error).message, 400);
    }
  },
);

// DELETE /api/manufacturer/stores/:id — delete store + its jewellers row
manufacturerRoutes.delete('/stores/:id', async (c) => {
  try {
    await deleteStore(c.get('manufacturerId'), c.req.param('id'));
    return sendData(c, { ok: true });
  } catch (err) {
    return sendError(c, 'bad_request', (err as Error).message, 400);
  }
});

const AddProductImageBody = z.object({
  cloudinaryPublicId: z.string().min(1),
  secureUrl: z.string().url(),
  isPrimary: z.boolean().optional(),
});

manufacturerRoutes.post('/products/:id/images/sign', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (product.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  return sendData(
    c,
    generateManufacturerSignedUploadParams({
      manufacturerId: c.get('manufacturerId'),
    }),
  );
});

manufacturerRoutes.post(
  '/products/:id/images',
  zValidator('json', AddProductImageBody),
  async (c) => {
    const product = await getManufacturerProductById(c.req.param('id'));
    if (!product) return sendError(c, 'not_found', 'Product not found', 404);
    if (product.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your product', 403);
    }
    const body = c.req.valid('json');
    const image = await addManufacturerProductImage({
      productId: c.req.param('id'),
      cloudinaryPublicId: body.cloudinaryPublicId,
      secureUrl: body.secureUrl,
      isPrimary: body.isPrimary ?? product.images.length === 0,
    });
    // Fire-and-forget: index into Qdrant now that image is available
    void indexManufacturerProduct(c.get('manufacturerId'), c.req.param('id')).catch((e) =>
      console.warn('[manufacturer] auto-embed on image-add failed', e),
    );
    return sendData(c, image, 201);
  },
);

// ── Try-On Assets ─────────────────────────────────────────────────────────────

const AddTryOnAssetBody = z.object({
  assetUrl: z.string().url(),
  cloudinaryPublicId: z.string().optional(),
  jewelleryType: z.enum(['necklace', 'earring_left', 'earring_right', 'ring_index', 'ring_middle', 'bangle']),
  pivotX: z.number().min(0).max(1).optional(),
  pivotY: z.number().min(0).max(1).optional(),
  xOffset: z.number().optional(),
  yOffset: z.number().optional(),
  scaleMultiplier: z.number().positive().optional(),
  rotationOffsetDeg: z.number().optional(),
});

// POST /api/manufacturer/products/:id/tryon-asset/sign
// Returns signed Cloudinary upload params for the tryon transparent PNG
manufacturerRoutes.post('/products/:id/tryon-asset/sign', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (product.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  return sendData(
    c,
    generateManufacturerSignedUploadParams({ manufacturerId: c.get('manufacturerId') }),
  );
});

// POST /api/manufacturer/products/:id/tryon-asset
manufacturerRoutes.post(
  '/products/:id/tryon-asset',
  zValidator('json', AddTryOnAssetBody),
  async (c) => {
    const product = await getManufacturerProductById(c.req.param('id'));
    if (!product) return sendError(c, 'not_found', 'Product not found', 404);
    if (product.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your product', 403);
    }
    const body = c.req.valid('json');
    await addManufacturerTryOnAsset({
      manufacturerProductId: c.req.param('id'),
      assetUrl: body.assetUrl,
      cloudinaryPublicId: body.cloudinaryPublicId ?? null,
      jewelleryType: body.jewelleryType,
      pivotX: body.pivotX,
      pivotY: body.pivotY,
      xOffset: body.xOffset,
      yOffset: body.yOffset,
      scaleMultiplier: body.scaleMultiplier,
      rotationOffsetDeg: body.rotationOffsetDeg,
    });
    return sendData(c, { ok: true });
  },
);

// GET /api/manufacturer/products/:id/tryon-asset
manufacturerRoutes.get('/products/:id/tryon-asset', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (product.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  const asset = await getManufacturerTryOnAsset(c.req.param('id'));
  return sendData(c, asset);
});

// DELETE /api/manufacturer/products/:id/tryon-asset
manufacturerRoutes.delete('/products/:id/tryon-asset', async (c) => {
  const product = await getManufacturerProductById(c.req.param('id'));
  if (!product) return sendError(c, 'not_found', 'Product not found', 404);
  if (product.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your product', 403);
  }
  await removeManufacturerTryOnAsset(c.req.param('id'));
  return sendData(c, { ok: true });
});

// ── Kiosk / Guest Orders (manufacturer view) ──────────────────────────────────

/**
 * Privacy invariant: the manufacturer must NEVER see customer PII (name, phone,
 * email), the customer's own delivery address, or any price/amount. It only ever
 * sees the STORE identity + product specs, and it always ships to the STORE's
 * fixed address (regardless of whether the customer chose pickup or home
 * delivery — the store handles the final handover to the customer).
 *
 * A small store-fixed-address cache avoids refetching per order in the list view.
 */
async function sanitizeKioskOrderForManufacturer(
  order: Record<string, unknown>,
  storeAddressCache: Map<string, string>,
) {
  const {
    customer_name, customer_phone, customer_email,           // PII — drop
    delivery_address,                                         // customer's own address — drop
    total_amount,                                             // price — drop
    items,
    ...safe
  } = order as Record<string, unknown> & { items?: Array<Record<string, unknown>> };

  // Resolve the STORE's fixed address (where the manufacturer actually ships).
  const storeId = order.store_id as string | undefined;
  let shipTo = '';
  if (storeId) {
    if (storeAddressCache.has(storeId)) {
      shipTo = storeAddressCache.get(storeId)!;
    } else {
      const store = await getStoreById(storeId);
      shipTo = store ? formatStoreFixedAddress(store) : '';
      storeAddressCache.set(storeId, shipTo);
    }
  }

  const safeItems = Array.isArray(items)
    ? items.map((it) => {
        const { unit_price_snapshot, ...restItem } = it;     // price — drop
        return restItem;
      })
    : undefined;

  // ship_to_store_address is what the manufacturer delivers to.
  const base = { ...safe, ship_to_store_address: shipTo };
  return safeItems ? { ...base, items: safeItems } : base;
}

// GET /api/manufacturer/kiosk-orders
manufacturerRoutes.get('/kiosk-orders', async (c) => {
  const orders = await getGuestOrdersByManufacturer(c.get('manufacturerId'));
  const cache = new Map<string, string>();
  const sanitized = await Promise.all(
    orders.map((o) => sanitizeKioskOrderForManufacturer(o as unknown as Record<string, unknown>, cache)),
  );
  return sendData(c, sanitized);
});

// GET /api/manufacturer/kiosk-orders/:id
manufacturerRoutes.get('/kiosk-orders/:id', async (c) => {
  const order = await getGuestOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  if (order.manufacturer_id !== c.get('manufacturerId')) {
    return sendError(c, 'forbidden', 'Not your order', 403);
  }
  const sanitized = await sanitizeKioskOrderForManufacturer(
    order as unknown as Record<string, unknown>,
    new Map(),
  );
  return sendData(c, sanitized);
});

const UpdateKioskOrderStatusBody = z.object({
  status: z.enum(['confirmed', 'packed', 'shipped', 'delivered', 'cancelled']),
  note: z.string().optional(),
  trackingNumber: z.string().optional(),
});

// PATCH /api/manufacturer/kiosk-orders/:id
manufacturerRoutes.patch(
  '/kiosk-orders/:id',
  zValidator('json', UpdateKioskOrderStatusBody),
  async (c) => {
    const order = await getGuestOrderWithItems(c.req.param('id'));
    if (!order) return sendError(c, 'not_found', 'Order not found', 404);
    if (order.manufacturer_id !== c.get('manufacturerId')) {
      return sendError(c, 'forbidden', 'Not your order', 403);
    }
    const { status, note, trackingNumber } = c.req.valid('json');
    await updateGuestOrderStatus(
      c.req.param('id'),
      status as GuestOrderStatus,
      note,
      'manufacturer',
      trackingNumber,
    );
    return sendData(c, { ok: true });
  },
);

// ── Store self-registration approvals (C6) ────────────────────────────────────

// GET /api/manufacturer/store-registrations — pending store registrations
manufacturerRoutes.get('/store-registrations', async (c) => {
  const stores = await listPendingStores();
  return sendData(c, stores);
});

// POST /api/manufacturer/store-registrations/:id/approve
manufacturerRoutes.post('/store-registrations/:id/approve', async (c) => {
  const store = await approveStoreRegistration(c.req.param('id'), c.get('manufacturerId'));
  return sendData(c, store);
});

// POST /api/manufacturer/store-registrations/:id/reject
manufacturerRoutes.post('/store-registrations/:id/reject', async (c) => {
  const store = await rejectStoreRegistration(c.req.param('id'));
  return sendData(c, store);
});

// ── Custom design orders (C17) ────────────────────────────────────────────────

// GET /api/manufacturer/custom-designs — list all sanitized custom design orders
manufacturerRoutes.get('/custom-designs', manufacturerGuard, async (c) => {
  const orders = await listCustomDesignOrdersByManufacturer(c.get('manufacturerId'));
  return sendData(c, orders);
});

// PATCH /api/manufacturer/custom-designs/:id — advance order status
const UpdateCustomDesignStatusBody = z.object({
  status: z.enum(['pending', 'confirmed', 'in_production', 'packed', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().optional(),
});

manufacturerRoutes.patch(
  '/custom-designs/:id',
  manufacturerGuard,
  zValidator('json', UpdateCustomDesignStatusBody),
  async (c) => {
    const { status, trackingNumber } = c.req.valid('json');
    const order = await updateCustomDesignOrderStatus(
      c.get('manufacturerId'),
      c.req.param('id'),
      status as CustomDesignOrderStatus,
      trackingNumber,
    );
    return sendData(c, order);
  },
);
