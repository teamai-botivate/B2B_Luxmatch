# LuxeMatch API Contracts

**Surface:** Hono + Zod + `@hono/zod-openapi`, mounted at `apps/web/app/api/[[...route]]/route.ts`.
**Schemas:** every route validates request body, query, and params with Zod; the same schemas are re-exported from `@luxematch/types` so the browser uses them for client-side validation.
**Auth in V1:** none. Routes marked `// AUTH:` will gain guards later — see [auth-readiness.md](./auth-readiness.md).

---

## Conventions

### Error envelope

Every non-2xx response returns this shape (HTTP status code is the source of truth; the `code` is a stable string for clients):

```ts
type ErrorEnvelope = {
  error: {
    code:
      | 'bad_request'
      | 'not_found'
      | 'conflict'
      | 'validation_failed'
      | 'unauthorized'        // reserved for post-auth
      | 'forbidden'           // reserved for post-auth
      | 'rate_limited'
      | 'upstream_failed'     // Cloudinary / Gemini / Qdrant / Supabase
      | 'internal_error';
    message: string;           // human-readable, safe to surface
    details?: Array<{          // present for validation_failed
      path: (string | number)[];
      message: string;
    }>;
    requestId: string;         // echoed in response header `x-request-id`
  };
};
```

### Common types (TypeScript notation)

```ts
const Uuid = z.string().uuid();
const Slug = z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const InrPaise = z.number().int().nonnegative();           // money stored as paise
const Pagination = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(60).default(24),
});
const SortOrder = z.enum(['relevance', 'price_asc', 'price_desc', 'weight_asc', 'weight_desc', 'newest']);

const ProductFilters = z.object({
  category: z.array(z.string()).optional(),
  metal: z.array(z.enum(['gold', 'silver', 'platinum', 'rose_gold', 'white_gold'])).optional(),
  purity: z.array(z.enum(['14K', '18K', '22K', '24K'])).optional(),
  gem_type: z.array(z.string()).optional(),
  jeweller_id: Uuid.optional(),
  occasion_ids: z.array(Uuid).optional(),
  collection_ids: z.array(Uuid).optional(),
  price_inr_min: InrPaise.optional(),
  price_inr_max: InrPaise.optional(),
  weight_g_min: z.number().nonnegative().optional(),
  weight_g_max: z.number().nonnegative().optional(),
  bis_only: z.boolean().optional(),
  certified_stones_only: z.boolean().optional(),
});

const ProductSummary = z.object({
  id: Uuid,
  slug: Slug,
  name: z.string(),
  jeweller: z.object({ id: Uuid, slug: Slug, name: z.string(), city: z.string() }),
  primary_image: z.object({ cloudinary_id: z.string(), width: z.number(), height: z.number() }),
  price_inr: InrPaise,
  weight_g: z.number(),
  metal: z.string(),
  purity: z.string(),
  hallmark: z.boolean(),
});

const Product = ProductSummary.extend({
  description: z.string(),
  images: z.array(z.object({ cloudinary_id: z.string(), width: z.number(), height: z.number() })),
  category: z.string(),
  gem: z
    .object({
      type: z.string(),
      weight_ct: z.number().optional(),
      certificate_no: z.string().optional(),
      certifying_lab: z.enum(['IGI', 'GIA', 'SSEF', 'other']).optional(),
    })
    .nullable(),
  dimensions: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  bis_huid: z.string().optional(),
  making_charges_note: z.string().optional(),
  occasions: z.array(z.object({ id: Uuid, slug: Slug, title: z.string() })),
  collections: z.array(z.object({ id: Uuid, slug: Slug, title: z.string() })),
  published: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const JewelleryType = z.enum([
  'necklace',
  'earring_left',
  'earring_right',
  'ring_index',
  'ring_middle',
  'bangle',
]);

const Calibration = z.object({
  pivot_x: z.number().min(0).max(1),
  pivot_y: z.number().min(0).max(1),
  x_offset: z.number(),
  y_offset: z.number(),
  scale_multiplier: z.number().positive(),
  rotation_offset_deg: z.number(),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
});

const TryOnAsset = z.object({
  id: Uuid,
  product_id: Uuid,
  jewellery_type: JewelleryType,
  png: z.object({ cloudinary_id: z.string(), width: z.number(), height: z.number() }),
  calibration: Calibration,
});
```

---

## Routes

### `GET /api/health`

Health probe. Verifies the Hono app is alive and that Supabase + Qdrant + Cloudinary are reachable.

**Request:** none.

**Success 200:**
```ts
{
  status: 'ok';
  version: string;       // build commit sha
  upstreams: {
    supabase: 'ok' | 'degraded';
    qdrant: 'ok' | 'degraded';
    cloudinary: 'ok' | 'degraded';
    gemini: 'ok' | 'degraded';
  };
  time: string;          // ISO
}
```

**Errors:** never returns non-2xx; degraded upstreams are reported in the body with HTTP 200 so the route stays useful as a liveness probe.

---

### `GET /api/products`

List products with filters, sorting, and cursor pagination. Backed by Supabase (relational + full-text); does not call Qdrant.

**Query:**
```ts
z.object({
  q: z.string().min(1).max(200).optional(),    // optional FTS query
  sort: SortOrder.default('relevance'),
  ...ProductFilters.shape,
  ...Pagination.shape,
});
```

**Success 200:**
```ts
{
  items: ProductSummary[];
  next_cursor: string | null;
  total_estimate: number;     // approximate; may be -1 if not computed
}
```

**Errors:** `400 validation_failed`.

---

### `GET /api/products/:slug`

Fetch full product detail by slug. Used by SSR on `/catalog/[slug]`.

**Params:** `{ slug: Slug }`

**Success 200:**
```ts
{
  product: Product;
  related: {
    from_jeweller: ProductSummary[];   // up to 4
    similar: ProductSummary[];         // up to 6 (Qdrant — text_vec self-query, excluding self)
  };
}
```

**Errors:** `404 not_found` (unknown or unpublished slug).

---

### `POST /api/products`

Create a product. After the row is inserted, the BFF triggers (in the same request) Gemini embedding for image + text and upserts the Qdrant point. Returns once the Qdrant upsert succeeds.

`// AUTH: jeweller must own jeweller_id`

**Body:**
```ts
z.object({
  jeweller_id: Uuid,
  name: z.string().min(2).max(140),
  description: z.string().min(20).max(4000),
  category: z.string().min(2).max(80),
  metal: z.enum(['gold', 'silver', 'platinum', 'rose_gold', 'white_gold']),
  purity: z.enum(['14K', '18K', '22K', '24K']),
  weight_g: z.number().positive(),
  gem: z
    .object({
      type: z.string(),
      weight_ct: z.number().positive().optional(),
      certificate_no: z.string().optional(),
      certifying_lab: z.enum(['IGI', 'GIA', 'SSEF', 'other']).optional(),
    })
    .nullable(),
  dimensions: z.string().max(120).optional(),
  sizes: z.array(z.string().max(20)).optional(),
  hallmark: z.boolean(),
  bis_huid: z.string().max(20).optional(),
  price_inr: InrPaise,
  making_charges_note: z.string().max(280).optional(),
  cloudinary_image_ids: z.array(z.string().min(3)).min(1).max(12),
  primary_image_id: z.string().min(3),
  occasion_ids: z.array(Uuid).max(8).default([]),
  collection_ids: z.array(Uuid).max(8).default([]),
  publish: z.boolean().default(false),
})
.refine((v) => v.cloudinary_image_ids.includes(v.primary_image_id), {
  path: ['primary_image_id'],
  message: 'primary_image_id must be in cloudinary_image_ids',
})
.refine(
  (v) =>
    !v.hallmark ||
    (v.metal === 'gold' && ['14K', '18K', '22K', '24K'].includes(v.purity)),
  { path: ['hallmark'], message: 'BIS hallmark requires gold + a declared purity' },
);
```

**Success 201:**
```ts
{ id: Uuid; slug: Slug; embedded: true }
```

**Errors:**
- `400 validation_failed`
- `409 conflict` — slug collision (slug is derived from name + jeweller; retried server-side once)
- `502 upstream_failed` — Gemini or Qdrant failed; the Supabase row is rolled back

---

### `PATCH /api/products/:id`

Partial update. If any field that participates in the embedding text (`name`, `description`, `category`, `metal`, `gem.type`, `occasion_ids`, `collection_ids`) changed, or `primary_image_id` changed, the Qdrant point is re-upserted in the same request.

`// AUTH: jeweller must own this product's jeweller_id`

**Params:** `{ id: Uuid }`

**Body:** any subset of the `POST /api/products` body, plus an optional `publish: boolean`.

**Success 200:**
```ts
{ id: Uuid; slug: Slug; re_embedded: boolean }
```

**Errors:** `400 validation_failed`, `404 not_found`, `502 upstream_failed`.

---

### `GET /api/categories`

Static-ish list of supported product categories with counts. Used by `FilterRail`.

**Query:** `{ jeweller_id?: Uuid }`

**Success 200:**
```ts
{
  categories: Array<{ key: string; label: string; count: number }>;
}
```

---

### `GET /api/collections`

List collections.

**Query:**
```ts
z.object({
  curated_by: z.enum(['luxematch', 'jeweller']).optional(),
  jeweller_id: Uuid.optional(),
  ...Pagination.shape,
});
```

**Success 200:**
```ts
{
  items: Array<{
    id: Uuid;
    slug: Slug;
    title: string;
    hero: { cloudinary_id: string; width: number; height: number } | null;
    product_count: number;
    curated_by: 'luxematch' | { jeweller_id: Uuid };
  }>;
  next_cursor: string | null;
}
```

---

### `GET /api/collections/:slug`

Single collection detail page.

**Params:** `{ slug: Slug }`

**Query:** `{ ...Pagination.shape }`

**Success 200:**
```ts
{
  collection: {
    id: Uuid;
    slug: Slug;
    title: string;
    story: string;
    hero: { cloudinary_id: string; width: number; height: number } | null;
    curated_by: 'luxematch' | { jeweller_id: Uuid };
  };
  products: ProductSummary[];
  next_cursor: string | null;
}
```

**Errors:** `404 not_found`.

---

### `GET /api/occasions/:slug`

Occasion-filtered storefront. Functionally a pre-baked `GET /api/products` with `occasion_ids` derived from the slug.

**Params:** `{ slug: Slug }`

**Query:**
```ts
z.object({
  sort: SortOrder.default('relevance'),
  ...ProductFilters.omit({ occasion_ids: true }).shape,
  ...Pagination.shape,
});
```

**Success 200:**
```ts
{
  occasion: { id: Uuid; slug: Slug; title: string; description: string };
  items: ProductSummary[];
  next_cursor: string | null;
}
```

**Errors:** `404 not_found`.

---

### `POST /api/cloudinary/sign-upload`

Sign a direct-to-Cloudinary upload. The browser then POSTs the bytes directly to Cloudinary using the returned params.

`// AUTH: jeweller session derives folder; body folder ignored once auth ships`

**Body:**
```ts
z.object({
  purpose: z.enum(['product_image', 'tryon_png', 'jeweller_logo', 'search_image']),
  jeweller_id: Uuid.optional(),   // required for product_image, tryon_png, jeweller_logo
  draft_id: z.string().max(60).optional(),  // used to namespace tryon uploads before product exists
  resource_type: z.enum(['image']).default('image'),
  public_id: z.string().min(3).max(160).optional(),
  tags: z.array(z.string()).max(8).optional(),
});
```

**Success 200:**
```ts
{
  cloud_name: string;
  api_key: string;
  timestamp: number;
  folder: string;           // server-derived
  signature: string;
  upload_url: string;       // https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload
  params: Record<string, string>;   // exactly the fields signed; client must send them verbatim
}
```

**Errors:** `400 validation_failed`, `502 upstream_failed`.

---

### `DELETE /api/cloudinary/delete`

Delete a Cloudinary asset. Authorized server-side; the browser cannot delete directly.

`// AUTH: caller must own the parent product / jeweller / tryon row`

**Body:**
```ts
z.object({
  public_id: z.string().min(3),
  purpose: z.enum(['product_image', 'tryon_png', 'jeweller_logo']),
  parent_id: Uuid,            // product_id or jeweller_id depending on purpose
});
```

**Success 200:**
```ts
{ deleted: true }
```

**Errors:** `404 not_found`, `502 upstream_failed`.

---

### `GET /api/tryon-assets/:productId`

Fetch the try-on asset(s) for a product. The `/try-on` page calls this once on mount, then runs the AR loop entirely client-side.

**Params:** `{ productId: Uuid }`

**Success 200:**
```ts
{
  product_id: Uuid;
  assets: TryOnAsset[];   // usually one; earrings may ship as a left/right pair
}
```

**Errors:** `404 not_found` (product has no calibrated try-on asset).

---

### `POST /api/tryon-assets`

Attach a calibrated try-on asset to a product.

`// AUTH: caller must own product_id's jeweller`

**Body:**
```ts
z.object({
  product_id: Uuid,
  jewellery_type: JewelleryType,
  cloudinary_png_id: z.string().min(3),
  calibration: Calibration,
});
```

**Success 201:** `TryOnAsset`

**Errors:** `400 validation_failed`, `404 not_found`, `409 conflict` (asset already exists for this jewellery_type on this product).

---

### `PATCH /api/tryon-assets/:id`

Recalibrate an existing try-on asset.

`// AUTH: caller must own parent product`

**Params:** `{ id: Uuid }`

**Body:**
```ts
z.object({
  jewellery_type: JewelleryType.optional(),
  cloudinary_png_id: z.string().min(3).optional(),
  calibration: Calibration.partial().optional(),
});
```

**Success 200:** `TryOnAsset`

**Errors:** `400 validation_failed`, `404 not_found`.

---

### `POST /api/embeddings/product/:id`

Re-embed a single product and re-upsert its Qdrant point. Used after image swaps that don't trigger a `PATCH /api/products`, and as a recovery handle.

`// AUTH: internal/admin only after auth ships`

**Params:** `{ id: Uuid }`

**Body:** none.

**Success 200:**
```ts
{
  id: Uuid;
  image_vec_dim: 768;
  text_vec_dim: 768;
  upserted: true;
}
```

**Errors:** `404 not_found`, `502 upstream_failed`.

---

### `POST /api/embeddings/reindex`

Bulk re-embed and upsert across the catalogue. Intended for cold rebuilds; the matching CLI lives in `scripts/reindex.ts`.

`// AUTH: internal/admin only after auth ships`

**Body:**
```ts
z.object({
  scope: z.enum(['all', 'jeweller', 'product_ids']),
  jeweller_id: Uuid.optional(),       // required when scope === 'jeweller'
  product_ids: z.array(Uuid).max(500).optional(), // required when scope === 'product_ids'
  dry_run: z.boolean().default(false),
});
```

**Success 200:**
```ts
{
  scheduled: number;     // count of products queued
  job_id: string;        // returned even when dry_run is true
}
```

The actual upserts happen inline in the request handler (V1 has no job queue). The response returns when the batch completes. For larger backfills, prefer the CLI script over the HTTP route.

**Errors:** `400 validation_failed`, `502 upstream_failed`.

---

### `POST /api/search/text`

Semantic text search. Embeds the query via Gemini, queries Qdrant on `text_vec`, hydrates results from Supabase.

**Body:**
```ts
z.object({
  q: z.string().min(1).max(200),
  filters: ProductFilters.optional(),
  limit: z.number().int().min(1).max(60).default(24),
});
```

**Success 200:**
```ts
{
  items: Array<{ product: ProductSummary; score: number }>;
  query_vec_dim: 768;
}
```

**Errors:** `400 validation_failed`, `502 upstream_failed`.

---

### `POST /api/search/image`

Visual search. The browser uploads the query image to Cloudinary first (using `POST /api/cloudinary/sign-upload` with `purpose: 'search_image'`), then sends the `public_id` here. The BFF fetches the bytes, embeds, queries Qdrant on `image_vec`.

**Body:**
```ts
z.object({
  cloudinary_public_id: z.string().min(3),
  filters: ProductFilters.optional(),
  limit: z.number().int().min(1).max(60).default(24),
});
```

**Success 200:**
```ts
{
  items: Array<{ product: ProductSummary; score: number }>;
  query_vec_dim: 768;
}
```

**Errors:** `400 validation_failed`, `404 not_found` (cloudinary asset missing), `502 upstream_failed`.

---

### `POST /api/search/hybrid`

Combined text + image search. Either `q` or `cloudinary_public_id` may be omitted but not both. Uses Qdrant's query API to fuse two prefetches with weighted RRF.

**Body:**
```ts
z.object({
  q: z.string().min(1).max(200).optional(),
  cloudinary_public_id: z.string().min(3).optional(),
  weights: z.object({
    text: z.number().min(0).max(1).default(0.5),
    image: z.number().min(0).max(1).default(0.5),
  }).optional(),
  filters: ProductFilters.optional(),
  limit: z.number().int().min(1).max(60).default(24),
}).refine((v) => v.q || v.cloudinary_public_id, {
  message: 'At least one of q or cloudinary_public_id is required',
});
```

**Success 200:**
```ts
{
  items: Array<{ product: ProductSummary; score: number }>;
  weights_used: { text: number; image: number };
}
```

**Errors:** `400 validation_failed`, `404 not_found`, `502 upstream_failed`.

---

### `GET /api/search/suggest`

Typeahead autocomplete. Reads Supabase `search_tsv` only — no Qdrant, no Gemini.

**Query:**
```ts
z.object({
  q: z.string().min(1).max(80),
  limit: z.number().int().min(1).max(20).default(8),
});
```

**Success 200:**
```ts
{
  groups: {
    products: Array<{ id: Uuid; slug: Slug; name: string; jeweller_name: string }>;
    jewellers: Array<{ id: Uuid; slug: Slug; name: string; city: string }>;
    collections: Array<{ id: Uuid; slug: Slug; title: string }>;
    occasions: Array<{ id: Uuid; slug: Slug; title: string }>;
  };
}
```

---

### `POST /api/analytics/event`

Append an analytics event. Anonymous session id is generated and stored in localStorage on the browser; no user identity in V1.

**Body:**
```ts
z.object({
  event: z.enum(['view', 'save', 'unsave', 'try_on', 'compare_add', 'compare_remove', 'search_text', 'search_image', 'search_hybrid', 'quiz_complete']),
  session_id: z.string().uuid(),
  product_id: Uuid.optional(),
  jeweller_id: Uuid.optional(),
  query: z.string().max(200).optional(),
  meta: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  ts: z.string().datetime().optional(),    // client-set; server overwrites if drift > 10 min
});
```

**Success 202:**
```ts
{ accepted: true }
```

**Errors:** `400 validation_failed`. Never blocks the UX — failures are logged client-side and the user flow continues.

---

### `GET /api/jewellers/:id`

Fetch a jeweller by id (used by the console) or by slug (used by `/store/[jeweller]`). Slug-based lookup is also exposed via this route — the param accepts either a uuid or a slug, disambiguated by shape.

**Params:** `{ id: z.union([Uuid, Slug]) }`

**Success 200:**
```ts
{
  jeweller: {
    id: Uuid;
    slug: Slug;
    name: string;
    city: string;
    year_founded: number;
    bis_licence_no: string | null;
    story: string;
    logo: { cloudinary_id: string; width: number; height: number } | null;
    storefront_accent: string;     // hex
    contact: {
      phone: string | null;
      whatsapp: string | null;
      address: string | null;
      hours: string | null;
    };
    certifications: string[];
    counts: { products: number; collections: number };
  };
}
```

**Errors:** `404 not_found`.

---

### `POST /api/jewellers`

Create a jeweller. Used by `/jeweller/onboarding`. In V1 with no auth, this is open; future auth will require a verified email/phone before allowing this.

`// AUTH: open in V1; will require verified contact post-auth`

**Body:**
```ts
z.object({
  name: z.string().min(2).max(140),
  city: z.string().min(2).max(80),
  year_founded: z.number().int().min(1850).max(new Date().getFullYear()),
  bis_licence_no: z.string().max(20).optional(),
  story: z.string().min(20).max(4000),
  logo_cloudinary_id: z.string().min(3).optional(),
  storefront_accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  contact: z.object({
    phone: z.string().max(40).optional(),
    whatsapp: z.string().max(40).optional(),
    address: z.string().max(400).optional(),
    hours: z.string().max(120).optional(),
  }).optional(),
  certifications: z.array(z.string().max(80)).max(8).optional(),
});
```

**Success 201:**
```ts
{ id: Uuid; slug: Slug }
```

**Errors:** `400 validation_failed`, `409 conflict` (slug collision).

---

### `PATCH /api/jewellers/:id`

Update jeweller profile. Used by edit-profile actions on the dashboard.

`// AUTH: caller must own this jeweller row`

**Params:** `{ id: Uuid }`

**Body:** any subset of the `POST /api/jewellers` body.

**Success 200:**
```ts
{ id: Uuid; slug: Slug }
```

**Errors:** `400 validation_failed`, `404 not_found`, `409 conflict`.
