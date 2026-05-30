import { Hono } from 'hono';
import { handle } from 'hono/vercel';

import { catalogRoutes } from '@/lib/api/catalog';
import { cloudinaryRoutes } from '@/lib/api/cloudinary';
import { embeddingsRoutes } from '@/lib/api/embeddings';
import { intelligenceRoutes } from '@/lib/api/intelligence';
import { searchRoutes } from '@/lib/api/search';
import { shopRoutes } from '@/lib/api/shop';
import { tryOnAssetRoutes } from '@/lib/api/tryon-assets';
import { authCustomerRoutes } from '@/lib/api/auth-customer';
import { cartRoutes } from '@/lib/api/cart-routes';
import { customerOrderRoutes } from '@/lib/api/customer-orders';

export const runtime = 'nodejs';

type Vars = { Variables: { shopJewellerId: string } };

const app = new Hono<Vars>().basePath('/api');

app.get('/health', (c) =>
  c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  }),
);

app.route('/shop', shopRoutes);
app.route('/cloudinary', cloudinaryRoutes);
app.route('/intelligence', intelligenceRoutes);
app.route('/search', searchRoutes);
app.route('/tryon-assets', tryOnAssetRoutes);
app.route('/embeddings', embeddingsRoutes);
// E-commerce routes
// authCustomerRoutes handles: /send-otp /verify-otp /me /logout /profile
app.route('/customer', authCustomerRoutes);
// cartRoutes handles: GET/POST/PATCH/DELETE /api/customer/cart
app.route('/customer/cart', cartRoutes);
// customerOrderRoutes handles orders, addresses, branches, checkout.
// Mounted at /customer/orders so GET /api/customer/orders → route '/'
// GET /api/customer/orders/:id → route '/:id'
// GET /api/customer/addresses → route /addresses (kept for compatibility)
// POST /api/customer/checkout  → route /checkout (kept for compatibility)
app.route('/customer/orders', customerOrderRoutes);
// Keep legacy paths for addresses, branches, checkout so existing pages
// that call /api/customer/addresses etc. still work:
app.route('/customer', customerOrderRoutes);
app.route('/', catalogRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
