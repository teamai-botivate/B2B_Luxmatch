import { z } from 'zod';

export const InsightSeveritySchema = z.enum(['info', 'warn', 'critical']);
export type InsightSeverity = z.infer<typeof InsightSeveritySchema>;

export const InsightSchema = z.object({
  id: z.string(),
  headline: z.string(),
  body: z.string(),
  recommendation: z.string(),
  relatedProductIds: z.array(z.string().uuid()),
  severity: InsightSeveritySchema,
});
export type Insight = z.infer<typeof InsightSchema>;

export const RecommendationActionSchema = z.enum([
  'stock_more',
  'keep_visible',
  'review_price',
  'reduce_stock',
  'season_ready',
]);
export type RecommendationAction = z.infer<typeof RecommendationActionSchema>;

export const RecommendationSchema = z.object({
  id: z.string(),
  action: RecommendationActionSchema,
  title: z.string(),
  reason: z.string(),
  nextStep: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  confidence: z.enum(['low', 'medium', 'high']),
  score: z.number(),
  relatedProductIds: z.array(z.string().uuid()),
  season: z.string().optional(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export type ProductDemandSnapshot = {
  productId: string;
  name: string;
  slug: string;
  categoryName: string | null;
  metal: string | null;
  occasionTags: string[];
  stockCount: number;
  priceMin: number | null;
  primaryImageUrl: string | null;
  sales30: number;
  sales90: number;
  revenue90: number;
  views30: number;
  views90: number;
  tryons30: number;
  tryons90: number;
  lastSoldAt: string | null;
};

export type SeasonalWindow = {
  label: string;
  startsAt: string;
  endsAt: string;
  tags: string[];
  stockFocus: string[];
};

export const INDIAN_SEASONAL_WINDOWS: SeasonalWindow[] = [
  {
    label: 'Wedding season',
    startsAt: '2026-10-15',
    endsAt: '2026-12-20',
    tags: ['wedding', 'bridal'],
    stockFocus: ['necklace', 'set', 'bangle', 'earring', 'choker'],
  },
  {
    label: 'Festive season',
    startsAt: '2026-09-15',
    endsAt: '2026-11-15',
    tags: ['festival'],
    stockFocus: ['gold', 'bangle', 'earring', 'necklace', 'daily'],
  },
  {
    label: 'Gift season',
    startsAt: '2026-07-15',
    endsAt: '2026-08-31',
    tags: ['gift', 'daily'],
    stockFocus: ['pendant', 'earring', 'ring', 'rose_gold'],
  },
];

export function getUpcomingSeason(
  now = new Date(),
  windows: SeasonalWindow[] = INDIAN_SEASONAL_WINDOWS,
): SeasonalWindow | null {
  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return (
    windows
      .map((window) => ({
        window,
        startsMs: Date.parse(`${window.startsAt}T00:00:00.000Z`),
      }))
      .filter(({ startsMs }) => startsMs >= nowMs)
      .sort((a, b) => a.startsMs - b.startsMs)[0]?.window ?? null
  );
}

function demandScore(product: ProductDemandSnapshot): number {
  return (
    product.sales90 * 8 +
    product.tryons90 * 2.5 +
    product.views90 * 0.25 +
    product.revenue90 / 100_000
  );
}

function confidenceFor(productCount: number, signalCount: number): Recommendation['confidence'] {
  if (productCount >= 12 && signalCount >= 80) return 'high';
  if (productCount >= 6 && signalCount >= 25) return 'medium';
  return 'low';
}

function productLabel(product: ProductDemandSnapshot): string {
  const bits = [product.metal, product.categoryName].filter(Boolean);
  return bits.length ? bits.join(' ') : product.name;
}

export function generateInventoryRecommendations(
  products: ProductDemandSnapshot[],
  now = new Date(),
): Recommendation[] {
  const signalCount = products.reduce(
    (sum, p) => sum + p.sales90 + p.tryons90 + p.views90,
    0,
  );
  const confidence = confidenceFor(products.length, signalCount);
  const upcomingSeason = getUpcomingSeason(now);
  const recommendations: Recommendation[] = [];

  const hotLowStock = products
    .filter((p) => p.sales30 >= 2 && p.stockCount <= Math.max(2, p.sales30))
    .sort((a, b) => demandScore(b) - demandScore(a))[0];

  if (hotLowStock) {
    recommendations.push({
      id: `stock-more-${hotLowStock.productId}`,
      action: 'stock_more',
      title: `Immediate restock suggested for ${productLabel(hotLowStock)}`,
      reason: `${hotLowStock.name} sold ${hotLowStock.sales30} units in 30 days, generated ${hotLowStock.tryons30} try-ons, and only ${hotLowStock.stockCount} are left.`,
      nextStep: `Reorder ${Math.max(4, hotLowStock.sales30 * 2)} units or add similar designs this week to avoid missed demand.`,
      priority: 'high',
      confidence,
      score: demandScore(hotLowStock),
      relatedProductIds: [hotLowStock.productId],
    });
  }

  const highInterestLowSale = products
    .filter((p) => p.sales30 === 0 && p.tryons30 >= 4)
    .sort((a, b) => b.tryons30 - a.tryons30)[0];

  if (highInterestLowSale) {
    recommendations.push({
      id: `review-price-${highInterestLowSale.productId}`,
      action: 'review_price',
      title: `Conversion review needed for ${highInterestLowSale.name}`,
      reason: `Customers tried it ${highInterestLowSale.tryons30} times in 30 days and viewed it ${highInterestLowSale.views30} times, but no sale was recorded.`,
      nextStep: 'Review price, making charges, display placement, staff pitch, or keep a lighter variant nearby.',
      priority: 'medium',
      confidence,
      score: demandScore(highInterestLowSale),
      relatedProductIds: [highInterestLowSale.productId],
    });
  }

  const slowMoving = products
    .filter((p) => p.stockCount >= 8 && p.sales90 === 0 && p.views90 < 20)
    .sort((a, b) => b.stockCount - a.stockCount)[0];

  if (slowMoving) {
    recommendations.push({
      id: `reduce-stock-${slowMoving.productId}`,
      action: 'reduce_stock',
      title: `Pause fresh buying for ${productLabel(slowMoving)}`,
      reason: `${slowMoving.name} has ${slowMoving.stockCount} units, low views, and no sale in 90 days.`,
      nextStep: 'Avoid reordering now; move it into a bundle, offer styling help, or replace with faster designs.',
      priority: 'medium',
      confidence,
      score: Math.max(1, slowMoving.stockCount),
      relatedProductIds: [slowMoving.productId],
    });
  }

  if (upcomingSeason) {
    const seasonalProducts = products
      .filter((p) => {
        const haystack = [
          p.categoryName?.toLowerCase() ?? '',
          p.metal?.toLowerCase() ?? '',
          ...p.occasionTags.map((tag) => tag.toLowerCase()),
        ];
        return upcomingSeason.tags.some((tag) => haystack.includes(tag));
      })
      .sort((a, b) => demandScore(b) - demandScore(a))
      .slice(0, 3);

    if (seasonalProducts.length > 0) {
      const lowStockCount = seasonalProducts.filter((p) => p.stockCount <= 3).length;
      recommendations.push({
        id: `season-ready-${upcomingSeason.label.toLowerCase().replace(/\s+/g, '-')}`,
        action: 'season_ready',
        title: `Prepare inventory for ${upcomingSeason.label}`,
        reason: `${seasonalProducts.length} relevant products have demand signals; ${lowStockCount} are low-stock.`,
        nextStep: `Prioritize ${upcomingSeason.stockFocus.slice(0, 3).join(', ')} inventory and refresh display collections.`,
        priority: lowStockCount > 0 ? 'high' : 'medium',
        confidence,
        score: seasonalProducts.reduce((sum, p) => sum + demandScore(p), 0),
        relatedProductIds: seasonalProducts.map((p) => p.productId),
        season: upcomingSeason.label,
      });
    }
  }

  if (recommendations.length === 0) {
    const topInterest = [...products].sort((a, b) => demandScore(b) - demandScore(a))[0];
    if (topInterest) {
      recommendations.push({
        id: `keep-visible-${topInterest.productId}`,
        action: 'keep_visible',
        title: `Keep ${topInterest.name} visible`,
        reason: 'This product currently has the strongest combined demand signal in your catalogue.',
        nextStep: 'Place it in the first screen of the store catalogue and keep staff aware of its talking points.',
        priority: 'low',
        confidence,
        score: demandScore(topInterest),
        relatedProductIds: [topInterest.productId],
      });
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export const PACKAGE_NAME = '@luxematch/intelligence';
