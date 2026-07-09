/**
 * Kiosk / guest order API — no customer auth required.
 *
 * POST /api/kiosk/orders   — place a guest order from the in-store kiosk.
 *   Resolves prices server-side from the products table.
 *   Resolves store identity from the lm_store cookie (B2B mode) or
 *   SHOP_JEWELLER_ID env (device mode).
 *
 * GET  /api/kiosk/orders/:id — public read (order number + status for receipt).
 */

import { getServerEnv } from '@luxematch/config';
import {
  getManufacturerProductById,
  getManufacturerProductByDesignNumberOrId,
  listManufacturerProducts,
  listManufacturerTryOnProducts,
  getStoreByJewellerId,
  placeGuestOrder,
  getGuestOrderWithItems,
  placeCustomDesignRequest,
  type PlaceGuestOrderItemInput,
} from '@luxematch/db';
import {
  STORE_COOKIE_NAME,
  verifyStoreCookie,
  getShopJewellerIdOptional,
} from '@luxematch/tenant';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';

import { sendData, sendError } from './envelope';

export const kioskRoutes = new Hono();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the current jewellerId from store cookie or env (kiosk mode).
 * Returns null when neither is available.
 */
async function resolveJewellerId(
  cookieHeader: string | undefined,
  env: ReturnType<typeof getServerEnv>,
): Promise<{ jewellerId: string; storeId: string | null } | null> {
  if (cookieHeader) {
    const result = await verifyStoreCookie(cookieHeader, {
      secret: env.LM_PIN_COOKIE_SECRET,
      ttlSeconds: env.LM_STORE_COOKIE_TTL_SECONDS,
    });
    if (result.valid) {
      return { jewellerId: result.jewellerId, storeId: result.storeId };
    }
  }
  const envId = getShopJewellerIdOptional();
  if (envId) return { jewellerId: envId, storeId: null };
  return null;
}

// ── POST /api/kiosk/orders ─────────────────────────────────────────────────────

const GuestOrderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

const PlaceGuestOrderSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerPhone: z.string().min(7).max(20),
  customerEmail: z.string().email().optional(),
  pickupStore: z.boolean().default(false),
  deliveryAddress: z.string().max(400).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(GuestOrderItemSchema).min(1),
});

kioskRoutes.post(
  '/orders',
  zValidator('json', PlaceGuestOrderSchema),
  async (c) => {
    const env = getServerEnv();
    const storeCookieVal = getCookie(c, STORE_COOKIE_NAME);
    const ctx = await resolveJewellerId(storeCookieVal, env);
    if (!ctx) {
      return sendError(c, 'unauthorized', 'No store session. Log in at /store/login.', 401);
    }

    const { jewellerId, storeId: cookieStoreId } = ctx;
    const body = c.req.valid('json');

    // Validate delivery: need address or pickup
    if (!body.pickupStore && !body.deliveryAddress?.trim()) {
      return sendError(
        c,
        'bad_request',
        'Delivery address is required when not picking up in-store.',
        400,
      );
    }

    // Resolve store identity for snapshot and manufacturerId
    const store = await getStoreByJewellerId(jewellerId);
    if (!store) {
      return sendError(c, 'not_found', 'Store not found for this session.', 404);
    }
    if (!store.manufacturer_id) {
      return sendError(
        c,
        'bad_request',
        'Store is not linked to a manufacturer. Contact your manufacturer admin.',
        400,
      );
    }

    const resolvedItems: PlaceGuestOrderItemInput[] = [];

    for (const item of body.items) {
      const product = await getManufacturerProductById(item.productId);
      if (!product || product.status !== 'active') {
        return sendError(c, 'not_found', `Product ${item.productId} not found or unavailable.`, 404);
      }

      const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0] ?? null;

      resolvedItems.push({
        productId: product.id,
        productNameSnapshot: product.name,
        productSkuSnapshot: product.sku ?? product.design_number ?? undefined,
        productImageSnapshot: primaryImage?.secure_url ?? undefined,
        categorySnapshot: product.category ?? undefined,
        metalSnapshot: product.metal ?? undefined,
        quantity: item.quantity,
        unitPriceSnapshot: 0,
      });
    }

    const order = await placeGuestOrder({
      manufacturerId: store.manufacturer_id,
      storeId: store.id,
      jewellerId,
      storeNameSnapshot: store.name,
      storeCitySnapshot: store.city ?? undefined,
      storePhoneSnapshot: store.phone ?? undefined,
      storeEmailSnapshot: store.email,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      deliveryAddress: body.deliveryAddress,
      pickupStore: body.pickupStore,
      notes: body.notes,
      orderSource: 'kiosk',
      items: resolvedItems,
    });

    return sendData(c, { id: order.id, orderNumber: order.order_number }, 201);
  },
);

// ── GET /api/kiosk/catalog — public manufacturer catalog for customer kiosk ───

const KioskCatalogQuery = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  hasTryOn: z.string().optional(),
});

// GET /api/kiosk/catalog/:id — single manufacturer product by design_number or UUID
kioskRoutes.get('/catalog/:id', async (c) => {
  const idOrDesign = c.req.param('id');
  const product = await getManufacturerProductByDesignNumberOrId(idOrDesign);
  if (!product || product.status !== 'active') {
    return sendError(c, 'not_found', 'Product not found', 404);
  }
  return sendData(c, product);
});

kioskRoutes.get('/catalog', zValidator('query', KioskCatalogQuery), async (c) => {
  const { category, search, hasTryOn } = c.req.valid('query');
  const products = await listManufacturerProducts({
    status: 'active',
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  });

  let filtered = products;
  if (hasTryOn === 'true') {
    filtered = filtered.filter((p) => p.has_tryon);
  }

  return sendData(c, filtered);
});

// ── POST /api/kiosk/custom-design — submit custom design request (C15) ────────

const CustomDesignBody = z.object({
  customerNaam: z.string().min(1).max(120),
  customerPhone: z.string().min(7).max(20),
  category: z.string().min(1).max(80).optional(),
  weightGrams: z.number().positive().optional(),
  purity: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  referenceImageUrl: z.string().url().optional(),
});

kioskRoutes.post('/custom-design', zValidator('json', CustomDesignBody), async (c) => {
  const env = getServerEnv();
  const storeCookieVal = getCookie(c, STORE_COOKIE_NAME);
  const ctx = await resolveJewellerId(storeCookieVal, env);
  if (!ctx) {
    return sendError(c, 'unauthorized', 'No store session. Log in at /store/login.', 401);
  }

  const { jewellerId, storeId: cookieStoreId } = ctx;
  const store = await getStoreByJewellerId(jewellerId);
  if (!store) {
    return sendError(c, 'not_found', 'Store not found for this session.', 404);
  }

  const body = c.req.valid('json');
  const request = await placeCustomDesignRequest({
    store_id: store.id,
    jeweller_id: jewellerId,
    customer_naam: body.customerNaam,
    customer_phone: body.customerPhone,
    category: body.category ?? 'other',
    weight_grams: body.weightGrams,
    purity: body.purity,
    design_notes: body.notes,
    reference_image_url: body.referenceImageUrl,
  });

  return sendData(c, { id: request.id }, 201);
});

// ── GET /api/kiosk/orders/:id — public receipt read ───────────────────────────

kioskRoutes.get('/orders/:id', async (c) => {
  const order = await getGuestOrderWithItems(c.req.param('id'));
  if (!order) return sendError(c, 'not_found', 'Order not found', 404);
  // Return only safe public fields — no internal store/manufacturer IDs exposed
  return sendData(c, {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    pickupStore: order.pickup_store,
    deliveryAddress: order.delivery_address,
    totalItems: order.total_items,
    totalAmount: order.total_amount,
    createdAt: order.created_at,
    items: order.items.map((i) => ({
      name: i.product_name_snapshot,
      imageUrl: i.product_image_snapshot,
      quantity: i.quantity,
      unitPrice: i.unit_price_snapshot,
    })),
    history: order.history.map((h) => ({ status: h.status, note: h.note, at: h.created_at })),
  });
});

// ── GET /api/kiosk/tryon-products — manufacturer AR try-on products (public) ──

kioskRoutes.get('/tryon-products', async (c) => {
  try {
    const products = await listManufacturerTryOnProducts();
    return sendData(c, { products });
  } catch (err) {
    return sendData(c, { products: [] });
  }
});
