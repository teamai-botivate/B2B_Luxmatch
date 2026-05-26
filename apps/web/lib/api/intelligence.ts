import {
  getDashboardSummary,
  getProductDemandSnapshots,
  recordProductSale,
} from '@luxematch/db';
import { generateInventoryRecommendations } from '@luxematch/intelligence';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { clearCache, getCached } from './cache';
import { sendData } from './envelope';
import { pinGuard, tenantMiddleware } from './middleware';

type Vars = { Variables: { shopJewellerId: string } };

export const intelligenceRoutes = new Hono<Vars>();

intelligenceRoutes.use('*', tenantMiddleware);

intelligenceRoutes.get('/summary', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const { summary, products } = await getCached(
    `intelligence:summary:${jewellerId}`,
    30_000,
    async () => {
      const [summary, products] = await Promise.all([
        getDashboardSummary(jewellerId),
        getProductDemandSnapshots(jewellerId),
      ]);
      return { summary, products };
    },
  );
  const recommendations = generateInventoryRecommendations(products);
  return sendData(c, {
    summary,
    recommendations,
    topProducts: products
      .slice()
      .sort((a, b) => b.sales30 + b.tryons30 - (a.sales30 + a.tryons30))
      .slice(0, 5),
  });
});

intelligenceRoutes.get('/recommendations', async (c) => {
  const jewellerId = c.get('shopJewellerId');
  const products = await getCached(
    `intelligence:products:${jewellerId}`,
    30_000,
    () => getProductDemandSnapshots(jewellerId),
  );
  return sendData(c, {
    recommendations: generateInventoryRecommendations(products),
    products,
  });
});

const SaleBody = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().positive().max(100).default(1),
  sold_price: z.number().nonnegative().optional(),
  sold_at: z.string().datetime().optional(),
  occasion: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

intelligenceRoutes.post(
  '/sales',
  pinGuard,
  zValidator('json', SaleBody),
  async (c) => {
    const jewellerId = c.get('shopJewellerId');
    const body = c.req.valid('json');
    await recordProductSale(jewellerId, {
      productId: body.product_id,
      quantity: body.quantity,
      soldPrice: body.sold_price,
      occasion: body.occasion,
      notes: body.notes,
    });
    clearCache(`intelligence:summary:${jewellerId}`);
    clearCache(`intelligence:products:${jewellerId}`);
    clearCache(`shop:metrics:${jewellerId}`);
    clearCache(`shop:analytics:${jewellerId}`);
    return sendData(c, { ok: true });
  },
);
