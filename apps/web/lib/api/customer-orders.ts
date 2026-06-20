import { getServerEnv } from '@luxematch/config';
import {
  clearCart,
  getBranches,
  getCustomerAddresses,
  getCustomerOrders,
  getJewellerPublic,
  getOrderWithItems,
  placeOrder,
  upsertCustomerAddress,
} from '@luxematch/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { readCustomerCookie, verifyCustomerCookie } from '../customer-auth';
import { sendOrderConfirmationEmail } from '../email/order-confirmation';
import { sendData, sendError } from './envelope';
import { tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };
export const customerOrderRoutes = new Hono<Vars>();
customerOrderRoutes.use('*', tenantMiddleware);

async function requireSession(c: { req: { header: (k: string) => string | undefined } }, secret: string) {
  return verifyCustomerCookie(readCustomerCookie(c), secret);
}

// GET /api/customer/orders
customerOrderRoutes.get('/', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await requireSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);

  const orders = await getCustomerOrders(jewellerId, session.payload.customerId);
  return sendData(c, { orders });
});

// GET /api/customer/orders/:id
customerOrderRoutes.get('/:id', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await requireSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);

  const order = await getOrderWithItems(jewellerId, c.req.param('id'));
  if (!order || order.customer_id !== session.payload.customerId) {
    return sendError(c, 'not_found', 'Order not found', 404);
  }
  return sendData(c, order);
});

// GET /api/customer/addresses
customerOrderRoutes.get('/addresses', async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await requireSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);
  const addresses = await getCustomerAddresses(jewellerId, session.payload.customerId);
  return sendData(c, { addresses });
});

// GET /api/customer/branches  (list branches for click & collect)
customerOrderRoutes.get('/branches', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const branches = await getBranches(jewellerId);
  return sendData(c, { branches });
});

// POST /api/customer/checkout
const CheckoutBody = z.object({
  delivery_type: z.enum(['delivery', 'click_and_collect']).default('delivery'),
  branch_id: z.string().uuid().optional(),
  payment_method: z.enum(['dummy_card', 'dummy_upi', 'dummy_cod']).default('dummy_card'),
  address: z.object({
    name: z.string().min(1),
    phone: z.string().min(10),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pin_code: z.string().min(6),
  }).optional(),
  save_address: z.boolean().default(false),
  discount_code: z.string().optional(),
});

customerOrderRoutes.post('/checkout', zValidator('json', CheckoutBody), async (c) => {
  const env = getServerEnv();
  const jewellerId = c.get('shopJewellerId');
  const session = await requireSession(c, env.LM_PIN_COOKIE_SECRET);
  if (!session.valid) return sendError(c, 'unauthorized', 'Login required', 401);

  const body = c.req.valid('json');
  const customerId = session.payload.customerId;

  // Get cart
  const { getCart } = await import('@luxematch/db');
  const cartItems = await getCart(jewellerId, customerId);
  if (cartItems.length === 0) return sendError(c, 'bad_request', 'Cart is empty', 400);

  // Dummy discount: code "LUXE10" = 10% off
  const discountPct = body.discount_code === 'LUXE10' ? 0.1 : 0;
  const subtotal = cartItems.reduce((s, i) => s + (i.product.price_min ?? 0) * i.quantity, 0);
  const discount = Math.round(subtotal * discountPct);

  // Save address if requested
  if (body.save_address && body.address) {
    await upsertCustomerAddress(jewellerId, customerId, {
      label: 'Home', is_default: true,
      name: body.address.name, phone: body.address.phone,
      line1: body.address.line1, line2: body.address.line2 ?? null,
      city: body.address.city, state: body.address.state,
      pin_code: body.address.pin_code,
    });
  }

  const order = await placeOrder({
    jewellerId, customerId,
    branchId: body.branch_id,
    deliveryType: body.delivery_type,
    items: cartItems.map(i => ({
      productId: i.product_id,
      productName: i.product.name,
      productSlug: i.product.slug,
      productImageUrl: i.product.primary_image_url ?? undefined,
      quantity: i.quantity,
      unitPrice: i.product.price_min ?? 0,
    })),
    discount,
    paymentMethod: body.payment_method,
    address: body.address ? {
      name: body.address.name, phone: body.address.phone,
      line1: body.address.line1, line2: body.address.line2,
      city: body.address.city, state: body.address.state,
      pinCode: body.address.pin_code,
    } : undefined,
  });

  // Clear cart after successful order
  await clearCart(jewellerId, customerId);

  try {
    const shop = await getJewellerPublic(jewellerId);
    const origin = new URL(c.req.url).origin;
    await sendOrderConfirmationEmail({
      to: session.payload.email,
      customerName: session.payload.name,
      shopName: shop?.store_name ?? 'LuxeMatch',
      order,
      items: cartItems,
      orderUrl: `${origin}/orders/${order.id}`,
    });
  } catch (err) {
    console.error('[email] order confirmation failed', err);
  }

  return sendData(c, { orderId: order.id, orderNumber: order.order_number, status: order.status });
});
