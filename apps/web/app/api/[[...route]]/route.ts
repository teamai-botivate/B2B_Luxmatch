import { Hono } from 'hono';
import { handle } from 'hono/vercel';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api');

app.get('/health', (c) =>
  c.json({
    ok: true,
    timestamp: new Date().toISOString(),
  }),
);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
