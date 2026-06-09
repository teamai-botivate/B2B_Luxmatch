import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// Primitives
// ────────────────────────────────────────────────────────────────────────────

export const UuidSchema = z.string().uuid();
export const SlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const InrPaiseSchema = z.number().int().nonnegative();

// ────────────────────────────────────────────────────────────────────────────
// ProductImage
// ────────────────────────────────────────────────────────────────────────────

export const ProductImageSchema = z.object({
  cloudinary_id: z.string().min(3),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().optional(),
});
export type ProductImage = z.infer<typeof ProductImageSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Brand / Jeweller
// ────────────────────────────────────────────────────────────────────────────

export const BrandSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  name: z.string(),
});
export type Brand = z.infer<typeof BrandSchema>;

export const JewellerSchema = BrandSchema.extend({
  city: z.string(),
  year_founded: z.number().int().min(1850),
  bis_licence_no: z.string().nullable(),
  story: z.string(),
  logo: ProductImageSchema.nullable(),
  storefront_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  contact: z.object({
    phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    address: z.string().nullable(),
    hours: z.string().nullable(),
  }),
  certifications: z.array(z.string()),
});
export type Jeweller = z.infer<typeof JewellerSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Category / Collection
// ────────────────────────────────────────────────────────────────────────────

export const CategorySchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CollectionSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  title: z.string(),
  story: z.string().optional(),
  hero: ProductImageSchema.nullable(),
  product_ids: z.array(UuidSchema),
  curated_by: z.union([z.literal('luxematch'), z.object({ jeweller_id: UuidSchema })]),
});
export type Collection = z.infer<typeof CollectionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Product
// ────────────────────────────────────────────────────────────────────────────

export const MetalSchema = z.enum(['gold', 'silver', 'platinum', 'rose_gold', 'white_gold']);
export const PuritySchema = z.enum(['14K', '18K', '22K', '24K']);

export const ProductSchema = z.object({
  id: UuidSchema,
  slug: SlugSchema,
  jeweller_id: UuidSchema,
  name: z.string(),
  description: z.string(),
  category: z.string(),
  metal: MetalSchema,
  purity: PuritySchema,
  weight_g: z.number().nonnegative(),
  gem: z
    .object({
      type: z.string(),
      weight_ct: z.number().positive().optional(),
      certificate_no: z.string().optional(),
      certifying_lab: z.enum(['IGI', 'GIA', 'SSEF', 'other']).optional(),
    })
    .nullable(),
  dimensions: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  hallmark: z.boolean(),
  bis_huid: z.string().optional(),
  price_inr: InrPaiseSchema,
  making_charges_note: z.string().optional(),
  images: z.array(ProductImageSchema),
  primary_image_id: z.string(),
  occasion_ids: z.array(UuidSchema),
  collection_ids: z.array(UuidSchema),
  published: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Product = z.infer<typeof ProductSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Try-on asset
// ────────────────────────────────────────────────────────────────────────────

export const JewelleryTypeSchema = z.enum([
  'necklace',
  'earring_left',
  'earring_right',
  'ring_index',
  'ring_middle',
  'bangle',
]);
export type JewelleryType = z.infer<typeof JewelleryTypeSchema>;

export const CalibrationSchema = z.object({
  pivot_x: z.number().min(0).max(1),
  pivot_y: z.number().min(0).max(1),
  x_offset: z.number(),
  y_offset: z.number(),
  scale_multiplier: z.number().positive(),
  rotation_offset_deg: z.number(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
});
export type Calibration = z.infer<typeof CalibrationSchema>;

export const TryOnAssetSchema = z.object({
  id: UuidSchema,
  product_id: UuidSchema,
  jewellery_type: JewelleryTypeSchema,
  png: ProductImageSchema,
  calibration: CalibrationSchema,
});
export type TryOnAsset = z.infer<typeof TryOnAssetSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Search
// ────────────────────────────────────────────────────────────────────────────

export const SearchResultSchema = z.object({
  product: ProductSchema,
  score: z.number(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Analytics
// ────────────────────────────────────────────────────────────────────────────

export const AnalyticsEventSchema = z.object({
  event: z.enum([
    'view',
    'save',
    'unsave',
    'try_on',
    'compare_add',
    'compare_remove',
    'search_text',
    'search_image',
    'search_hybrid',
    'quiz_complete',
  ]),
  session_id: UuidSchema,
  product_id: UuidSchema.optional(),
  jeweller_id: UuidSchema.optional(),
  query: z.string().max(200).optional(),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  ts: z.string().datetime().optional(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// ────────────────────────────────────────────────────────────────────────────
// API envelope
// ────────────────────────────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  code: z.enum([
    'bad_request',
    'not_found',
    'conflict',
    'validation_failed',
    'unauthorized',
    'forbidden',
    'rate_limited',
    'upstream_failed',
    'upstream_warming_up', // transient: a sleeping upstream (HF Space) is cold-booting; retry shortly
    'internal_error',
  ]),
  message: z.string(),
  details: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
  requestId: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ApiEnvelope<T> = { data: T; error?: never } | { data?: never; error: ApiError };

export const apiEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.union([
    z.object({ data, error: z.undefined() }),
    z.object({ data: z.undefined(), error: ApiErrorSchema }),
  ]);

export const PACKAGE_NAME = '@luxematch/types';
