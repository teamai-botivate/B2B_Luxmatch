# LuxeMatch Platform Architecture

**Version:** v1 (no authentication)
**Audience:** engineers building or reviewing the platform
**Companion docs:** [api-contracts.md](./api-contracts.md), [ar-calibration.md](./ar-calibration.md), Claude Design output in [design-notes/](./design-notes/)

LuxeMatch is a premium AI-powered jewellery discovery platform for the Indian market. Two audiences (shopper, jeweller) share a single deployment. V1 ships without authentication; saved items, compare state, and quiz answers live in the browser.

---

## 1. Monorepo structure

```
luxematch-platform/
├── apps/
│   └── web/                         Next.js 15 (App Router) + Hono BFF
│       ├── app/
│       │   ├── (shopper)/...        Shopper routes (see api-contracts.md)
│       │   ├── (jeweller)/...       Jeweller console routes
│       │   └── api/
│       │       └── [[...route]]/
│       │           └── route.ts     Single Hono app mounted as a Next route handler
│       ├── public/
│       └── package.json
├── packages/
│   ├── ui/                          Shared shadcn/ui wrappers, design-system primitives
│   ├── types/                       Shared TypeScript types (Product, Jeweller, TryOnAsset, …)
│   ├── config/                      t3-oss/env-nextjs env validation, runtime guards
│   ├── db/                          Supabase client factory + typed queries
│   ├── cloudinary/                  Signed upload URL helper, signature verification
│   ├── qdrant/                      Qdrant client wrapper, named-vector helpers
│   └── embeddings/                  Gemini Embedding 2 client wrapper
├── supabase/
│   ├── migrations/                  SQL migrations, ordered
│   └── seed.sql                     Demo data for local dev
├── docs/
│   ├── architecture.md              this file
│   ├── api-contracts.md             every Hono route, request + response shape
│   ├── ar-calibration.md            MediaPipe landmark targets + calibration math
│   ├── deployment.md                Vercel deployment + env wiring
│   ├── auth-readiness.md            where future auth guards plug in
│   └── design-notes/                Claude Design exports per phase
└── scripts/
    ├── reindex.ts                   rebuild Qdrant from Supabase
    └── smoke-test.ts                end-to-end API smoke test
```

**Package manager:** pnpm with workspaces.
**Node:** ≥ 20.

---

## 2. `apps/web` responsibilities

`apps/web` is a single Next.js 15 App Router application that hosts both the shopper site and the Hono BFF inside the same deployment.

**Frontend (App Router, RSC):**
- Server-render the catalogue, product detail, collections, occasions, jeweller storefronts (SEO + first paint).
- Client-render local-state surfaces: `/saved`, `/compare`, `/style-quiz`, the try-on viewport, the image-search dropzone.
- Lazy-load the MediaPipe + Canvas 2D bundle only on `/try-on` and inside the try-on modal — never paid for elsewhere.

**Hono BFF (`app/api/[[...route]]/route.ts`):**
- A single Hono app exported as the App Router catch-all route handler. Hono provides routing, middleware, and Zod validation; `@hono/zod-openapi` produces the OpenAPI spec consumed by the typed client.
- Hono runs **inside** the Next.js route handler. WebSocket upgrade is **not** possible from a Next.js route handler — the BFF is REST-only. Real-time use cases must use polling, SSE on a regular route, or a third-party service.
- All server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `GEMINI_API_KEY`, `QDRANT_API_KEY`) are read here through `@luxematch/config` and never imported from client code.

**Shared between the two layers:** typed fetch client generated from the Hono OpenAPI spec; React Server Components can call Hono directly via in-process invocation when needed for SSR.

---

## 3. Package responsibilities

| Package | Role |
|---|---|
| `@luxematch/ui` | shadcn/ui-based primitives plus LuxeMatch-specific surfaces (`ProductCard`, `FilterRail`, `SearchOmnibar`, `PriceTag`, `TrustBand`, `JewellerCard`, `TryOnViewer`, `QuizStep`, `CompareColumn`, `MetricTile`, `UploadDropzone`, `SpecRow`, `EmptyState`, `PermissionExplainer`, `Toaster`, `BottomSheet`, `RouteTabs`, `ShareLinkPill`). Single source of truth per component; variants are props. |
| `@luxematch/types` | Domain types — `Product`, `Jeweller`, `Collection`, `Occasion`, `TryOnAsset`, `Calibration`, `SearchHit`, `AnalyticsEvent`, plus Zod schemas re-exported for shared validation. |
| `@luxematch/config` | `env.ts` using `t3-oss/env-nextjs`. Splits server-only vs. client-safe vars. Throws at build/start if a required server var is missing. |
| `@luxematch/db` | Supabase server client factory (service-role on the server, anon for any later public surface). Typed queries for products, jewellers, collections, occasions, try-on assets, analytics events. Full-text search helpers (`tsvector` queries against the products table). |
| `@luxematch/cloudinary` | Server-only Cloudinary SDK wrapper. Generates signed upload params (`POST /api/cloudinary/sign-upload`) for product images, transparent try-on PNGs, and jeweller logos. Signature verification on webhook callbacks. **The browser never sees `CLOUDINARY_API_SECRET`.** |
| `@luxematch/qdrant` | Qdrant TypeScript client wrapper. Manages the `products` collection, named vectors `image_vec` and `text_vec` (both 768-dim), payload schema, filtered-HNSW query helpers, batch upsert/delete. |
| `@luxematch/embeddings` | Google GenAI SDK wrapper. Generates embeddings via `gemini-embedding-2-preview` with `output_dimensionality: 768` (MRL-truncated from the native 3072-dim head). Single function for image bytes, single function for text — both return vectors in the **same unified space**. |

---

## 4. Supabase responsibilities

Supabase Postgres is the **system of record for relational catalogue data**. It owns:

- `products` — id, slug (unique, immutable), jeweller_id, name, description, category, metal, purity, weight_g, gem_type, gem_weight_ct, gem_certificate_no, price_inr, making_charges_note, dimensions, sizes, hallmark, bis_huid, cloudinary_image_ids[], primary_image_id, occasion_ids[], collection_ids[], published, created_at, updated_at, search_tsv (generated `tsvector`).
- `jewellers` — id, slug, name, city, year_founded, bis_licence_no, story, logo_cloudinary_id, storefront_accent, contact_phone, contact_whatsapp, address, hours, certifications[].
- `collections` — id, slug, title, story, hero_cloudinary_id, product_ids[], curated_by ("luxematch" | "jeweller:<id>").
- `occasions` — id, slug, title, description, hero_cloudinary_id.
- `try_on_assets` — id, product_id, jewellery_type (enum), cloudinary_png_id, pivot_x, pivot_y, x_offset, y_offset, scale_multiplier, rotation_offset_deg, width_mm, height_mm.
- `analytics_events` — id, ts, event ("view" | "save" | "try_on" | "compare" | "search_text" | "search_image"), product_id?, jeweller_id?, query?, session_id (anon, local).

**Full-text search** lives here — `search_tsv` is a generated `tsvector` from name + description + tags + jeweller name, indexed with GIN. The `/api/search/suggest` autocomplete reads from it directly.

**Vectors are NOT stored in Supabase.** Embeddings live in Qdrant only; Supabase stores the product row that the Qdrant point id references back to. This keeps Postgres small and avoids the pgvector size/index tradeoff for a 768-dim catalogue that may grow into the hundreds of thousands.

Access is **server-only** via the service-role key. There is no Supabase auth in V1; future auth (see `auth-readiness.md`) will introduce row-level security policies.

---

## 5. Cloudinary responsibilities

Cloudinary serves **all binary media** and the CDN.

- **Product images** — uploaded by jewellers via the signed upload flow. Cloudinary returns the public id; we store the id in `products.cloudinary_image_ids[]` and render via Cloudinary's responsive transformation URLs (AVIF + WebP fallback, sized to viewport).
- **Transparent try-on PNGs** — one per `try_on_assets` row. Must be PNG with alpha. Stored in a dedicated folder (`tryon/<product_id>/`) with a tag for invalidation.
- **Jeweller logos** — `jewellers.logo_cloudinary_id`. PNG or SVG accepted.

**Signed upload flow:**
1. Browser requests `POST /api/cloudinary/sign-upload` with `{ folder, public_id?, tags?, resource_type }`.
2. Hono BFF signs the request with `CLOUDINARY_API_SECRET` (server-only) and returns `{ signature, timestamp, api_key, cloud_name, params }`.
3. Browser uploads directly to Cloudinary's upload endpoint with those signed params. Bytes never traverse our server.
4. Browser POSTs the resulting `public_id` to the relevant Hono route (`POST /api/products`, `POST /api/tryon-assets`, `PATCH /api/jewellers/:id`).

**Deletion** (`DELETE /api/cloudinary/delete`) is signed server-side and authorized by jeweller ownership of the parent product/jeweller row.

The browser **never** sees `CLOUDINARY_API_SECRET`.

---

## 6. Qdrant responsibilities

Qdrant Cloud (free tier in V1) provides **vector search with filtered HNSW**.

**Collection layout:**

- Collection name: `products`
- Point id: `products.id` (uuid) from Supabase — 1:1 mapping.
- **Named vectors** per point:
  - `image_vec` — 768-dim, cosine distance. Generated from the product's primary image via Gemini Embedding 2.
  - `text_vec` — 768-dim, cosine distance. Generated from a concatenated text representation (name + description + category + metal + gem_type + occasion tags + jeweller name) via the same Gemini model.
- Both vectors live in the **same unified image+text embedding space** — they are comparable. This is what enables hybrid search (text query + image query combined) and cross-modal search (text query against `image_vec`, image query against `text_vec`).

**Payload (filterable, kept small):**
`jeweller_id`, `category`, `metal`, `purity`, `gem_type`, `price_inr`, `weight_g`, `occasion_ids[]`, `collection_ids[]`, `published`, `created_at`.

Heavy fields (description, full image list, certificates) are **not** in Qdrant — they are fetched from Supabase using the returned point ids.

**Indexing:** payload indexes are created on `jeweller_id`, `category`, `metal`, `gem_type`, `price_inr`, `weight_g`, `published` to keep filtered-HNSW fast.

**Indexing flow** runs on product create/update via `POST /api/embeddings/product/:id` and in bulk via `POST /api/embeddings/reindex` (scripted in `scripts/reindex.ts` for cold rebuilds).

The browser **never** talks to Qdrant. `QDRANT_API_KEY` is server-only.

---

## 7. Gemini Embedding 2 responsibilities

`@luxematch/embeddings` wraps Google's `gemini-embedding-2-preview` model.

- **Model id:** `gemini-embedding-2-preview`
- **`output_dimensionality`:** `768` (MRL-truncated from the model's native 3072-dim head — matryoshka representations make truncated prefixes still meaningful).
- **Modalities:** image bytes and text both produce vectors in the **same unified space**.

**Inputs:**
- For text: the concatenated product text described above, or the raw user search query.
- For image: raw bytes (jpeg/png/webp). For products, the primary image is fetched from Cloudinary server-side and embedded. For visual search, the browser uploads to Cloudinary as a transient `search/` asset, then the BFF fetches and embeds it.

**Caching:** product embeddings are persisted to Qdrant on write — never re-computed at query time. Query-side embeddings (text or image at search time) are not cached in V1; if Gemini latency becomes the search bottleneck, an LRU on `(query, modality)` is the obvious next step.

`GEMINI_API_KEY` is server-only.

---

## 8. MediaPipe JS responsibilities

`@mediapipe/tasks-vision` runs **entirely in the browser** on the `/try-on` route (and the embedded try-on modal). Camera frames **never** leave the device.

- **`FaceLandmarker`** — used for necklace and earring placement. Produces 478 face landmarks per frame. We read a small subset (chin 152, left jaw 234, right jaw 454, and IPD landmarks for scale — see [ar-calibration.md](./ar-calibration.md)).
- **`HandLandmarker`** — used for ring and bangle placement. Produces 21 landmarks per detected hand. We read MCP/PIP for the chosen finger and the wrist landmark (0) for bangle.

**Runtime:**
- WebGL delegate, targeting 60 fps on mid-range mobile. Falls back to CPU delegate on devices without WebGL2.
- Model assets (`face_landmarker.task`, `hand_landmarker.task`) are served from `/public/mediapipe/` and cached by the browser.
- The MediaPipe + try-on overlay bundle is **route-split** — never loaded outside `/try-on` and the embedded modal.

**Zero backend round-trips for AR.** The only network calls from `/try-on` are (a) the initial PNG and calibration payload fetch from `GET /api/tryon-assets/:productId`, and (b) optional analytics events.

---

## 9. Canvas 2D responsibilities

Overlay rendering uses the **Canvas 2D API**. No Three.js, no WebGL custom shaders, no 3D models.

Per frame:
1. Draw the live video frame to the canvas (mirrored if mirror toggle is on).
2. Look up the relevant MediaPipe landmark(s) for the active jewellery type (see [ar-calibration.md](./ar-calibration.md)).
3. Compute the placement transform: translate (landmark + offsets), scale (IPD-based scale × `scale_multiplier`), rotate (face/hand angle + `rotation_offset_deg`), about the asset's `(pivot_x, pivot_y)`.
4. Apply jitter smoothing using a One-Euro Filter on translation, scale, and rotation independently (parameters in [ar-calibration.md](./ar-calibration.md)).
5. `drawImage` the transparent PNG with the computed transform.
6. Draw HUD overlays (capture flash, lighting hint) on top.

Capture is `canvas.toBlob('image/png')` — also entirely client-side.

---

## 10. Flow diagrams

### 10.1 Product creation + Cloudinary upload + Qdrant indexing

```
[Jeweller browser]                [Hono BFF]              [Cloudinary]    [Supabase]    [Gemini]    [Qdrant]
       │                              │                        │              │            │           │
       │ POST /api/cloudinary/sign-upload  ────────────────►   │              │            │           │
       │                              │  sign with secret      │              │            │           │
       │  ◄── { signature, timestamp, api_key, params }        │              │            │           │
       │                              │                        │              │            │           │
       │ ─ direct upload (multipart) ───────────────────────►  │              │            │           │
       │  ◄── { public_id, secure_url }                        │              │            │           │
       │                              │                        │              │            │           │
       │ POST /api/products { ...specs, cloudinary_image_ids } ►              │            │           │
       │                              │  insert product row ──────────────►   │            │           │
       │                              │  ◄── product.id, slug                 │            │           │
       │                              │                        │              │            │           │
       │                              │  fetch primary image bytes ───────►   │            │           │
       │                              │  ◄── jpeg/png bytes                   │            │           │
       │                              │  embed (image) ────────────────────────────────►   │           │
       │                              │  ◄── image_vec (768)                                            │
       │                              │  embed (text: name+desc+tags) ──────────────────►              │
       │                              │  ◄── text_vec (768)                                             │
       │                              │  upsert point(id, {image_vec, text_vec}, payload) ──────────►  │
       │  ◄── 201 { id, slug }        │                                                                 │
```

### 10.2 Text search

```
[Browser]                  [Hono BFF]          [Gemini]            [Qdrant]               [Supabase]
   │                           │                   │                   │                       │
   │ POST /api/search/text     │                   │                   │                       │
   │  { q, filters, limit }   ►│                   │                   │                       │
   │                           │ embed(text=q) ──► │                   │                       │
   │                           │  ◄── query_vec    │                   │                       │
   │                           │ search(vector_name=text_vec,          │                       │
   │                           │   query=query_vec, filter=filters) ──►│                       │
   │                           │  ◄── [{ id, score }, ...]             │                       │
   │                           │ select * from products where id in (...) ──────────────────► │
   │                           │  ◄── product rows                                              │
   │  ◄── [{ product, score }] │                                                                │
```

Text suggestions (`GET /api/search/suggest`) read Supabase `search_tsv` directly without touching Qdrant — it is a typeahead, not a semantic search.

### 10.3 Image search

```
[Browser]                            [Hono BFF]         [Cloudinary]      [Gemini]    [Qdrant]    [Supabase]
   │ (1) upload via signed URL ───────────────────────► │
   │  ◄── { public_id }                                  │
   │                                                     │
   │ POST /api/search/image { public_id, filters } ────► │
   │                            │  fetch bytes  ───────► │
   │                            │  ◄── bytes              │
   │                            │  embed(image=bytes) ─────────────────► │
   │                            │  ◄── query_vec                          │
   │                            │  search(vector_name=image_vec,                  │
   │                            │    query=query_vec, filter=filters) ─────────► │
   │                            │  ◄── [{ id, score }]                            │
   │                            │  select products where id in (...) ──────────────────────► │
   │                            │  ◄── product rows                                            │
   │  ◄── [{ product, score }]                                                                  │
```

### 10.4 Hybrid search (text + image)

```
[Browser]                            [Hono BFF]                                  [Gemini]    [Qdrant]    [Supabase]
   │ POST /api/search/hybrid { q?, image_public_id?, filters, weights } ───────► │
   │                            │  embed(text=q) ──────────────────────────────► │
   │                            │  embed(image=bytes from cloudinary) ─────────► │
   │                            │  ◄── text_vec, image_vec                       │
   │                            │                                                 │
   │                            │  Qdrant query API combines two searches in one round trip:           │
   │                            │    - prefetch using image_vec on the image_vec field                 │
   │                            │    - prefetch using text_vec on the text_vec field                   │
   │                            │    - fuse with weighted RRF (default weights: text 0.5, image 0.5)   │
   │                            │  ──────────────────────────────────────────────────────────────────► │
   │                            │  ◄── fused [{ id, score }]                                           │
   │                            │  select products where id in (...) ──────────────────────────────────►
   │                            │  ◄── product rows                                                     │
   │  ◄── [{ product, score }]                                                                          │
```

Weights are tunable per request to support "more like the picture" or "more like the words" toggles.

### 10.5 AR try-on (zero backend round-trips during the loop)

```
[Browser only — no backend during the loop]

  /try-on mount
       │
       ├─► GET /api/tryon-assets/:productId  ──►  { png_url, calibration }
       │     (one-time fetch; png cached by browser CDN)
       │
       ├─► getUserMedia({ video: { facingMode: 'user' } })
       │     → MediaStream
       │
       ├─► load MediaPipe FaceLandmarker / HandLandmarker  (one-time, from /public/mediapipe/)
       │
       └─► requestAnimationFrame loop @ ~60fps
             │
             ├─ grab video frame
             ├─ landmarker.detectForVideo(frame, ts)  →  landmarks
             ├─ pick landmarks for jewellery_type (see ar-calibration.md)
             ├─ compute transform (translate, scale via IPD or hand span, rotate, pivot)
             ├─ One-Euro filter on (tx, ty, scale, rot)
             ├─ canvas.drawImage(video)                 ← background
             ├─ canvas.drawImage(pngOverlay, transform) ← jewellery
             └─ canvas.drawImage(hud)                   ← HUD

  capture → canvas.toBlob('image/png') (entirely client-side)
```

No frame ever leaves the browser. The persistent "processed in your browser" hint is part of the contract with the user.

### 10.6 Jeweller product + try-on asset upload flow

```
/jeweller/products/new — five-step stepper, auto-saving to localStorage at each step.

  Step 1 — Photos
    For each image:
      browser ─► POST /api/cloudinary/sign-upload (folder: products/<jeweller_id>/)
              ◄─ signed params
      browser ─► Cloudinary direct upload
              ◄─ public_id
    User picks the primary image.

  Step 2 — Specs  (category, metal, purity, weight, gem, price, …)
    Validated client-side via shared Zod schema from @luxematch/types.

  Step 3 — Story & tags  (description, occasions[], collection_ids[], craft technique)

  Step 4 — Try-on calibration
    browser ─► POST /api/cloudinary/sign-upload (folder: tryon/<draft_id>/, resource_type: image, format: png)
            ◄─ signed params
    browser ─► Cloudinary direct upload (transparent PNG, alpha required)
            ◄─ public_id
    User drags anchor onto a reference face/hand preview in the browser,
    sets scale/rotation sliders. Calibration fields recorded locally
    (see ar-calibration.md for the exact field list).

  Step 5 — Review & publish
    browser ─► POST /api/products { ...specs, cloudinary_image_ids, primary_image_id }
            ◄─ { id, slug }
    browser ─► POST /api/tryon-assets { product_id, jewellery_type, cloudinary_png_id, ...calibration }
            ◄─ { id }
    BFF (background within the same request):
      - fetch primary image bytes from Cloudinary
      - Gemini embed (image)
      - Gemini embed (text)
      - Qdrant upsert(point_id = product.id, named vectors, payload)
    Redirect to /jeweller/products/<id>.

  Edit later (/jeweller/products/[id]):
    Same shell, populated. Any change to image set or core text fields triggers a
    POST /api/embeddings/product/:id to re-embed and re-upsert the Qdrant point.
```

---

## 11. Deployment targets

- **Vercel** — single project hosting `apps/web`. Frontend (Next.js) and the Hono BFF (Next route handler) ship in the same deployment.
- **Supabase** — managed Postgres + Storage (Storage not used in V1; Cloudinary owns binaries). Service-role key is added to Vercel as an environment variable, scoped to server functions.
- **Cloudinary** — managed; cloud name + API key are client-readable, the API secret is server-only.
- **Qdrant Cloud** — free tier in V1, single cluster, single `products` collection.
- **Google AI Studio** — Gemini Embedding 2 access via `GEMINI_API_KEY`.

Runtime: Vercel Functions on Fluid Compute (default). Edge runtime is **not** used — the Hono routes pull in Node-only SDKs (Supabase service client, Cloudinary SDK, Google GenAI). Middleware is kept thin; long-running re-index work is intended for `scripts/reindex.ts` invoked manually or as a one-off Vercel CLI run, **not** as a per-request handler.

See [deployment.md](./deployment.md) for the full env-var matrix and Vercel project setup.

---

## 12. Future auth boundaries

V1 has **no authentication**. Locations where future auth guards will plug in are marked with a `// AUTH:` comment in the source and listed in [auth-readiness.md](./auth-readiness.md). The key boundaries:

- **All `/api/jewellers/*` write routes** (`POST /api/jewellers`, `PATCH /api/jewellers/:id`) — currently open, will require the authenticated user to own the jeweller row.
- **All `/api/products/*` write routes** (`POST`, `PATCH`) — will require the authenticated user to be a member of the product's owning jeweller.
- **`POST /api/cloudinary/sign-upload`** — will require an authenticated jeweller session; folder will be derived from session, not from the request body.
- **`DELETE /api/cloudinary/delete`** — same.
- **`POST /api/tryon-assets`, `PATCH /api/tryon-assets/:id`** — will require ownership of the parent product.
- **`POST /api/embeddings/product/:id`, `POST /api/embeddings/reindex`** — will become internal/admin only.
- **`POST /api/analytics/event`** — will continue to accept anonymous session ids; authenticated sessions enrich the event with user id.
- **Shopper-facing local state** (`/saved`, `/compare`, `/style-quiz` results) — will gain a "sync to account" path. The localStorage shape is the source of truth and is intentionally designed to be uploaded as-is to a user-scoped row.

V1 does not pretend the guards exist. The comments are signposts so the rewrite to add auth is mechanical, not architectural.
