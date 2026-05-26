import { Hono } from 'hono';
import { handle } from 'hono/vercel';

import { catalogRoutes } from '@/lib/api/catalog';
import { cloudinaryRoutes } from '@/lib/api/cloudinary';
import { embeddingsRoutes } from '@/lib/api/embeddings';
import { searchRoutes } from '@/lib/api/search';
import { shopRoutes } from '@/lib/api/shop';
import { tryOnAssetRoutes } from '@/lib/api/tryon-assets';

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
app.route('/search', searchRoutes);
app.route('/tryon-assets', tryOnAssetRoutes);
app.route('/embeddings', embeddingsRoutes);
app.route('/', catalogRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
