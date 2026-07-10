import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';

import { catalogRoutes } from '@/lib/api/catalog';
import { cloudinaryRoutes } from '@/lib/api/cloudinary';
import { embeddingsRoutes } from '@/lib/api/embeddings';
import { intelligenceRoutes } from '@/lib/api/intelligence';
import { searchRoutes } from '@/lib/api/search';
import { jewelllerOrderRoutes } from '@/lib/api/jeweller-orders';
import { shopRoutes } from '@/lib/api/shop';
import { tryOnAssetRoutes } from '@/lib/api/tryon-assets';
import { authCustomerRoutes } from '@/lib/api/auth-customer';
import { cartRoutes } from '@/lib/api/cart-routes';
import { customerOrderRoutes } from '@/lib/api/customer-orders';
import { analyticsRoutes } from '@/lib/api/analytics';
import { healthCheck } from '@/lib/api/health';
import { manufacturerRoutes } from '@/lib/api/manufacturer';
import { storeRoutes } from '@/lib/api/store';
import { storeManagerRoutes } from '@/lib/api/store-manager';
import { kioskRoutes } from '@/lib/api/kiosk';

export const runtime = 'nodejs';

type Vars = { Variables: { shopJewellerId: string } };

const app = new Hono<Vars>().basePath('/api');

// ── CORS ────────────────────────────────────────────────────────────────────
// The browser app calls /api from the same origin, so CORS is mostly a guard
// against other sites driving the authenticated API. ALLOWED_ORIGINS is a
// comma-separated allow-list. When set, only those origins get CORS headers
// (with credentials, so the lm_pin / lm_customer cookies flow). When unset,
// we allow same-origin requests (no Origin header) and, in development only,
// any origin for convenience. In production an unknown Origin gets no CORS
// headers and the browser blocks the response.
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const isProd = process.env.NODE_ENV === 'production';

app.use(
  '/*',
  cors({
    origin: (origin) => {
      if (!origin) return origin; // same-origin / server-to-server
      if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(origin) ? origin : null;
      }
      // No allow-list configured: permissive in dev, locked down in prod.
      return isProd ? null : origin;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Health endpoint pings core services (Supabase + Qdrant). Returns 200 when
// they're reachable, 503 otherwise. Used by smoke tests and uptime monitors.
app.get('/health', healthCheck);

app.route('/shop', shopRoutes);
app.route('/shop/orders', jewelllerOrderRoutes);
app.route('/cloudinary', cloudinaryRoutes);
app.route('/intelligence', intelligenceRoutes);
app.route('/search', searchRoutes);
app.route('/tryon-assets', tryOnAssetRoutes);
app.route('/embeddings', embeddingsRoutes);
app.route('/analytics', analyticsRoutes);
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
// B2B routes
// manufacturerRoutes: /login /logout /me /products /orders (manufacturerGuard on all except login/logout)
app.route('/manufacturer', manufacturerRoutes);
// storeRoutes: /login /logout /me /catalog /orders /kiosk-orders (storeGuard on all except login/logout)
app.route('/store', storeRoutes);
// storeManagerRoutes: /login /logout /me /list /create (manager CRUD + login)
app.route('/manager', storeManagerRoutes);
// kioskRoutes: public guest order placement + status read (no auth cookie required)
app.route('/kiosk', kioskRoutes);
app.route('/', catalogRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
