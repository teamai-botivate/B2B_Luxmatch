import { z } from 'zod';

// Placeholder for Phase 9.5.
// Will expose:
//   festivalCalendar — upcoming Indian festival windows by date
//   rollup — aggregate views/tryons/sales into inventory_signals
//   insights — produce Insight objects for /jeweller/intelligence

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

export const PACKAGE_NAME = '@luxematch/intelligence';
