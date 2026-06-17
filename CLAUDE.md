# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Branch policy (read first)

**All work happens on the `production` branch. `production` is the deployment branch.** Do not switch to, commit to, or merge into `main` unless explicitly asked. This supersedes the older strategy in `plan.txt` (which described main as the deploy branch with PRs from production) — `production` is ahead of `main` and is what ships.

## What LuxeMatch is

A **shop-installed** AI jewellery platform with a full e-commerce layer. One install serves one jeweller's inventory on a device in their physical store. Customers browse, search by photo, try jewellery on in 2D AR, add to cart, log in via phone OTP, and place orders for delivery or click-and-collect. Staff unlock a back-office on the **same device** with a PIN to manage inventory, see analytics, and act on AI-generated stocking recommendations. The cloud (Supabase, Qdrant, Cloudinary, the Python embedder) is **shared across all shops**; tenancy is enforced by `jeweller_id` on every row, payload, and folder.

A public multi-jeweller mode ("MODE B" in `plan.txt` — site works without `SHOP_JEWELLER_ID`, jeweller-selector routing) is **aspirational and not built**. Everything assumes `SHOP_JEWELLER_ID` is set; `getShopJewellerId()` throws without it. The `/store/[jeweller-slug]` page exists but is wired to mock data only.

`plan.txt` is the canonical execution plan for the core platform phases. `SETUP.md` covers the e-commerce layer setup steps. `README.md`, `docs/architecture.md`, and `docs/api-contracts.md` are **out of date** (they still mention Vercel, Gemini embeddings, and a pre-migration schema shape) — prefer `plan.txt`, this file, and the code.

## Build state

All core phases (-1 through 12) plus the e-commerce layer (E1–E3) are landed on `production`:

- **Phase 9.5 (inventory intelligence)** — live. Heuristic recommendations on `/jeweller/dashboard` and `/jeweller/intelligence`.
- **E-commerce layer** — live. Customer email OTP auth through Supabase Auth (phone remains the shop-scoped customer/order identity), cart, checkout, orders, multi-branch support. Supabase migration `0002_ecommerce.sql`.
- **Phase 9 (style quiz)** — live. Builds a text query from quiz answers → `/api/search/text`.
- **Phase 10–12** — analytics events, smoke tests, vitest, Render deployment config, CORS lockdown, PIN hardening (rate limit, audit log, idle-lock).
- **Supabase Realtime** — `useMultiDeviceSync` and `useRealtimeCatalog` hooks subscribe to product/sales/tryon events so the catalog and dashboard stay live across devices without manual refresh.
- **Cart optimization + Space warm-up handling** (latest) — `useAddToCart` hook adds to cart without a mount-time cart fetch (no N+1 GETs from product cards); `/api/search/jewellery-ai` has a 45s upstream timeout + one retry on 502/503 and returns a `upstream_warming_up` 503 while the Jewellery_AI HF Space cold-boots (~30–90s).

NEXT: UI/UX refinement pass, then real DB/storage connection + real asset upload. AWS migration parked until instructed. See "Known gaps" below for production blockers.

## Commands

```bash
pnpm dev                  # Next.js dev server (apps/web on :3000)
pnpm typecheck            # tsc --noEmit across the workspace
pnpm build                # build all packages + Next.js production build
pnpm lint                 # eslint per-workspace
pnpm format               # prettier write
pnpm format:check         # prettier check

pnpm provision-shop       # interactive: creates a new shop's jeweller row,
                          # writes SHOP_JEWELLER_ID + cookie secret + PIN hash
                          # to apps/web/.env.local
pnpm reindex --jeweller-id=<uuid>   # backfill OpenCLIP embeddings into Qdrant
pnpm reindex --all                  # reindex every jeweller

pnpm seed:intelligence    # seed 180 days of synthetic views/tryons/sales/searches
                          # for SHOP_JEWELLER_ID (seasonally weighted, seeded RNG);
                          # --reset-demo-history deletes existing history first
pnpm rollup:intelligence  # roll product_views + tryon_events + product_sales into
                          # inventory_signals (7-day buckets, last 180 days)

pnpm check-env            # verify all required env vars are present (CI gate)
pnpm smoke-test           # ping Supabase + Qdrant + embedder + Cloudinary + PIN
pnpm test                 # vitest — pure-logic unit tests (tests/*.test.ts)
```

`check-env`, `smoke-test`, `reindex`, `seed:intelligence`, and `rollup:intelligence` all load `apps/web/.env.local` via `tsx --env-file`. `smoke-test` exits 1 if any service is unreachable; run it before deploying. `test` runs vitest against `tests/` (currently the security-critical `@luxematch/tenant` PIN/cookie/rate-limit logic). New CLI scripts that need Supabase/Qdrant access should follow the same `tsx --env-file=apps/web/.env.local` pattern.

> ⚠️ `node scripts/run-migration.mjs` does NOT apply migrations despite its name — it seeds demo e-commerce data (branches, customers, orders) and **contains a hardcoded Supabase URL + service-role key** (security issue; rotate the key and convert the script to env loading). Apply migrations via the Supabase dashboard SQL editor instead.

Three processes for full end-to-end:

1. **Python embedder** (`apps/embedder`) — `python -m uvicorn embedder:app --port 8001` from inside its venv. Run `pip install -r requirements.txt` once. First boot downloads ~350 MB of OpenCLIP weights to `~/.cache/huggingface/`. Use `python -m uvicorn`, not bare `uvicorn`, so the venv's interpreter is used.
2. **Next.js** — `pnpm dev` from repo root.
3. **Cloud services** — Supabase, Qdrant Cloud, Cloudinary. The dev `.env.local` already points at these.

When the dev server returns 404s for every chunk after a config change: `rm -rf apps/web/.next && pnpm dev`. Next.js sometimes leaves a stale manifest after `next.config.ts` edits or workspace changes.

## Deployment

Deploy from the `production` branch.

- **Web** — `luxematch-web` in [`render.yaml`](render.yaml): Node, runs Next.js + Hono on Render. Corepack + pnpm. Health check `/api/health`. Currently on the **free plan** (spins down on idle — cold-start blank screens for kiosk customers; upgrade before real shop installs).
- **Embedder — NOT DEPLOYED.** `apps/embedder` runs only on a local machine (`EMBEDDER_URL=http://localhost:8001`). Embeddings are generated locally: run the embedder and `pnpm reindex` from a dev machine to backfill Qdrant Cloud. Consequence: on the deployed site the OpenCLIP routes (`/api/search/text|image|hybrid`, `POST /api/embeddings/product/:id`) have no embedder to call. The `luxematch-embedder` service in render.yaml is defined but has never been deployed. Deploying the embedder is an open roadmap item (plan.txt P3 item 9b).
- **Jewellery_AI — deployed on Hugging Face** at `botivate2026-jewellery.hf.space` (separate repo `../Jewellery_AI`, `hf_space/` dir, Docker SDK Space). It is a full search service (`/search`, `/add-image`, batch/async upload, admin UI) with its **own** Qdrant collection (`jewellery_search`) — it does NOT expose `/embed/*` endpoints, so it cannot serve as `EMBEDDER_URL`. `JEWELLERY_AI_URL` points here; `/api/search/jewellery-ai` proxies to it and is the **production visual-search path** until the embedder is deployed.

`ALLOWED_ORIGINS` + `NODE_ENV=production` lock down CORS on the web service.

- **Operator deploy guide:** [`docs/deployment.md`](docs/deployment.md) — cloud setup, first-deploy checklist, per-shop install, rollback.
- **Dev/testing guide:** `SETUP.md` — local run + manual test flows.
- **Annotated prod env:** [`apps/web/.env.production.example`](apps/web/.env.production.example) — every var tagged SERVER ONLY / FRONTEND SAFE / RUNTIME.

> **AWS migration is deferred.** UI/UX refinement comes first. When it happens, only env vars + `packages/cloudinary` change — see "Infrastructure vendors" below.

## Workspace shape

```
apps/
  web/          # Next.js 15 App Router + Hono BFF
  embedder/     # Python FastAPI — OpenCLIP inference (ViT-B-32, 512-d)

packages/
  ar-engine/    # MediaPipe + Three.js AR engine (ported from jewellery-ar-service)
                # renderer.ts + preview.ts both delegate to overlayMath.ts
                # supports 2D PNGs AND 3D GLB/GLTF models
  cloudinary/   # Signed-upload; per-jeweller folder enforcement
  config/       # zod-validated env. Server env throws at module load if missing
  db/           # Supabase client + tenant-scoped query helpers:
                #   products, jewellers, media, metrics, analytics, tryon,
                #   events, intelligence, customers, cart, ecommerce, branches
  embeddings/   # Thin TS client for apps/embedder (text / image / batch / hybrid)
  intelligence/ # Heuristic recommendation engine (pure functions, no I/O)
  qdrant/       # Single collection luxematch_products, jeweller-filtered search
  tenant/       # SHOP_JEWELLER_ID + PIN cookie (Edge-safe) + /server (Node scrypt)
  types/        # Cross-package zod schemas + inferred types
  ui/           # EMPTY placeholder (one constant export) — real shared UI lives
                # in apps/web/components; delete or populate eventually

supabase/
  migrations/
    0001_init.sql        # Core schema (products, jewellers, events,
                         # pin_audit_events, inventory_signals, etc.)
    0002_ecommerce.sql   # E-commerce layer (customers, OTPs, cart, orders,
                         # order_items, order_status_history, branches)
  seed.sql               # Demo jeweller + 12 products + 3 try-on assets (PIN 123456)

scripts/
  provision-shop.ts      # Per-device install setup
  reindex.ts             # OpenCLIP → Qdrant backfill
  seed-intelligence.ts   # Synthetic 180-day demand history (demo/dev)
  seasonal-rollup.ts     # inventory_signals weekly rollup
  check-env.ts           # env presence gate
  smoke-test.ts          # external-service reachability gate
  run-migration.mjs      # ⚠️ demo-data seeder with hardcoded keys — see Commands

apps/web/public/All_jewelleries/   # ~46 temporary transparent PNGs for AR demo
                                   # (replaced by Cloudinary uploads via Phase 7 tool)
apps/web/lib/showcase-ar-assets.ts # 44 hardcoded showcase products always prepended
                                   # to /api/tryon/products results on /try-on
```

## API surface (current)

All routes are mounted in `apps/web/app/api/[[...route]]/route.ts`. PIN-gated = requires `lm_pin` cookie. Customer-gated = requires `lm_customer` cookie. CORS is applied app-wide via `hono/cors` — `ALLOWED_ORIGINS` allow-list, credentialed; `NODE_ENV=production` rejects unknown origins.

```
GET    /api/health                      public — Supabase+Qdrant ping, masked shop id, 200/503

# Shop (jeweller info + back-office)
GET    /api/shop                        public — "Welcome to <store>" header data
POST   /api/shop/unlock                 public — PIN check, sets lm_pin cookie (rate-limited)
POST   /api/shop/lock                   public — clears lm_pin cookie
PATCH  /api/shop                        PIN — edit store info + idle-reset config
POST   /api/shop/pin/change             PIN — change PIN (current + new)
GET    /api/shop/metrics                PIN — dashboard counts
GET    /api/shop/analytics              PIN — 30-day rollups for charts
GET    /api/shop/settings               PIN — full settings payload

# Catalog (reads public, writes PIN-gated)
GET    /api/products                    public — customer catalog listing
GET    /api/products/manage             PIN — back-office listing (richer shape)
GET    /api/products/:slug              public — by slug
GET    /api/products/by-id/:id          public — by UUID (edit form)
POST   /api/products                    PIN
PATCH  /api/products/:id                PIN
DELETE /api/products/:id                PIN
POST   /api/products/:id/sales          PIN — "mark sold" → feeds intelligence
GET    /api/categories                  global
GET    /api/collections                 public
GET    /api/collections/:slug           public
GET    /api/occasions/:slug             public (tag-based pseudo-collection)
GET    /api/tryon/products              public — products with active try-on assets

# Cloudinary
POST   /api/cloudinary/sign-upload      PIN — server forces per-jeweller folder
POST   /api/cloudinary/delete           PIN — verifies publicId belongs to this shop

# Try-on assets
POST   /api/tryon-assets                PIN
PATCH  /api/tryon-assets/:id            PIN
DELETE /api/tryon-assets/:id            PIN — best-effort Cloudinary cleanup

# Embeddings
POST   /api/embeddings/product/:id      PIN — re-embed a single product

# Search
POST   /api/search/text                 public — OpenCLIP text encoder → Qdrant
                                        (used by /search and /style-quiz)
POST   /api/search/image                public — OpenCLIP image encoder → Qdrant
                                        (no page calls this today)
POST   /api/search/hybrid               public — fused text+image → Qdrant
                                        (used by /style-quiz when a photo is given)
                                        ⚠️ text/image/hybrid need EMBEDDER_URL;
                                        the embedder is local-only today, so these
                                        do NOT work on the deployed site
POST   /api/search/jewellery-ai         public — THE visual-search path (/search/image
                                        posts here): multipart proxy to the Jewellery_AI
                                        HF Space /search. 45s timeout + one retry on
                                        502/503; 503 "upstream_warming_up" while the
                                        Space cold-boots (~30–90s). Returns the Space's
                                        own { id, image_url, score } — Jewellery_AI's
                                        indexed catalog, NOT LuxeMatch products (no
                                        Supabase hydration, no tenancy filter)
GET    /api/search/suggest              public — Postgres FTS (no embedder hop)

# Intelligence (Phase 9.5)
GET    /api/intelligence/summary        PIN — KPI strip + top recommendations
GET    /api/intelligence/recommendations  PIN — full ranked list

# Analytics (Phase 10)
POST   /api/analytics/event             public — fire-and-forget event log
                                        (event_type validated; jeweller_id from ctx;
                                        product_view → also product_views table,
                                        tryon_start → also tryon_events table)

# Jeweller order management (Phase E3)
GET    /api/shop/orders                 PIN — all orders for this shop (filterable by status)
GET    /api/shop/orders/:id             PIN — single order with items + status history
PATCH  /api/shop/orders/:id             PIN — update status (confirmed/packed/shipped/delivered/cancelled)

# Customer auth + e-commerce (all scoped to SHOP_JEWELLER_ID)
POST   /api/customer/send-otp           public — Supabase Auth email OTP initiation
POST   /api/customer/verify-otp         public — Supabase Auth OTP check, sets lm_customer cookie (7d)
GET    /api/customer/me                 customer-gated — profile
POST   /api/customer/logout             customer-gated — clears lm_customer cookie
POST   /api/customer/profile            customer-gated — update name/email

# Customer orders (customerOrderRoutes is dual-mounted at /api/customer/orders
# AND /api/customer — both path styles resolve; the frontend uses /api/customer/orders)
GET    /api/customer/orders             customer-gated — order history
GET    /api/customer/orders/:id         customer-gated — single order
GET    /api/customer/orders/addresses   customer-gated — saved addresses
GET    /api/customer/orders/branches    public — jeweller branches (click-and-collect)
POST   /api/customer/orders/checkout    customer-gated — create order from cart
                                        (discount code is hardcoded: LUXE10 = 10%)

# Cart (per-customer, per-shop)
GET    /api/customer/cart               customer-gated
POST   /api/customer/cart               customer-gated — add item
PATCH  /api/customer/cart/:productId    customer-gated — change quantity
DELETE /api/customer/cart/:productId    customer-gated — remove item
DELETE /api/customer/cart               customer-gated — clear cart
```

## Frontend data status

Most customer pages hit real APIs (catalog, product detail, try-on, cart, checkout, orders, login, collections, occasions). Search wiring:

- **`/search/image` → `/api/search/jewellery-ai`** — LuxeMatch uses Jewellery_AI's search system for visual search. Works in production via the HF Space, but returns Jewellery_AI's own indexed catalog, not this shop's inventory.
- **`/search` (text) → `/api/search/text`** and **`/style-quiz` → `/api/search/text|hybrid`** — embedder-dependent, so broken on the deployed site until the embedder is deployed.

Exceptions that still use mock/local data:

- **`/` (home)** — renders `MOCK_PRODUCTS` from `lib/mock-data`. The first screen customers see is fake inventory; wiring it to `/api/products` (`is_featured`) is pending UI/UX work.
- **`/compare` and `/saved`** — client-only via `CompareContext` / `SavedItemsContext`, backed by **`localStorage`** keys `luxematch_compare` / `luxematch_saved` (max 4 compare items). No Supabase `saved_items` table exists.
- **`/store/[jeweller-slug]`** — mock-data only (vestige of unbuilt MODE B).
- **`/checkout/success`** — UI-only, reads `?order=<orderNumber>` from the URL. Checkout sends an order confirmation email when the optional `SMTP_*` env vars are configured.

Cart state: `useCart()` (full fetch, used on /cart and /checkout), `useAddToCart()` (POST-only, used by ProductCard/ProductDetailPanel), `useCartCount()` (global listener) — all in `apps/web/hooks/use-cart.ts`.

## Image storage + vector search data flow

This is the canonical flow for every product image — both regular product photos and transparent AR-ready PNGs. **The flow is the same in dev and in production; only the vendor endpoints change.**

```
Jeweller uploads image
        │
        ▼
  Cloudinary (CDN)                   ← permanent, served to customers
  luxematch/<jewellerId>/<bucket>/
  Returns: secure_url, public_id
        │
        ▼ (pnpm reindex  OR  POST /api/embeddings/product/:id)
  Image bytes fetched from Cloudinary URL
        │
        ▼
  Python embedder (apps/embedder)
  POST /embed/image
  Model: OpenCLIP ViT-B-32 / laion2b_s34b_b79k
  Output: 512-d L2-normalised float32 vector
        │
        ▼
  Qdrant Cloud                       ← searchable representation
  Collection: luxematch_products
  Point ID: product_id (UUID)
  Vector: 512-d cosine
  Payload: { product_id, jeweller_id, slug, category, metal,
             occasion_tags, price_min, price_max, has_tryon }
```

**Search flow (customer uploads a photo):**
```
Customer image (browser)
        │
        ▼ POST /api/search/image  (base64 in JSON body)
  Hono route decodes → Buffer
        │
        ▼
  Python embedder  POST /embed/image → 512-d query vector
        │
        ▼
  Qdrant ANN search  (must-filter: jeweller_id = ctx.shopJewellerId)
  Returns: [ { product_id, score }, ... ]
        │
        ▼
  Supabase lookup  getProductsByIds(jewellerId, ids)
  Returns: ProductWithImages[] with Cloudinary URLs
        │
        ▼
  Browser renders results with real product images from Cloudinary
```

The **link** between the two stores is `product_id` — it is both the Qdrant point ID and the Supabase primary key. `product_embeddings` table mirrors which products are indexed (model, dimensions, indexed_at) for bookkeeping.

**AR-ready assets follow the same flow.** Transparent PNGs are uploaded to Cloudinary under `luxematch/<jewellerId>/tryon/`, their URLs are stored in `product_tryon_assets.asset_url`, and they are embedded (as product images) the same way. The AR engine loads the asset at runtime directly from its URL — which today is either a Cloudinary CDN URL (staff uploads) or a local `/All_jewelleries/...` path (temp demo assets + hardcoded showcase list).

## Infrastructure vendors — dev vs production

The data flow is identical in both environments. Only env vars change.

| Concern | Dev / current | Production (when migrating) |
|---|---|---|
| Image CDN | Cloudinary (`dyrc4bo4m`) | AWS S3 + CloudFront |
| Vector DB | Qdrant Cloud (US-West) | Self-hosted Qdrant on AWS EC2/EKS |
| Relational DB | Supabase Postgres | AWS RDS Postgres (or Supabase on AWS region) |
| Embedder | Local-only (`localhost:8001`, not deployed) | AWS EC2 / ECS with GPU, same FastAPI code |

**When migrating**, the only code changes needed are:
1. Update `CLOUDINARY_*` env vars → AWS S3 + CloudFront equivalents, and update `packages/cloudinary/src/index.ts` to use the S3 SDK
2. Update `QDRANT_URL` + `QDRANT_API_KEY` env vars to point at the AWS cluster
3. Update `EMBEDDER_URL` to the new worker endpoint
4. Update `NEXT_PUBLIC_SUPABASE_URL` + related keys
5. No changes to `packages/embeddings/`, `packages/qdrant/`, or any search route — they all speak through env-resolved URLs

The `packages/cloudinary/` wrapper is the only package with vendor-specific SDK logic. Everything else is vendor-agnostic HTTP.

## Two cookies, two auth flows

The system has two independent cookie-based sessions:

| Cookie | Purpose | Signed with | TTL |
|---|---|---|---|
| `lm_pin` | Jeweller back-office access | `LM_PIN_COOKIE_SECRET` (HMAC, Web Crypto) | `LM_PIN_COOKIE_TTL_SECONDS` (4h default) |
| `lm_customer` | Customer account / cart / orders | Same secret with `:customer` suffix | 7 days |

Both use HMAC-SHA-256 via `crypto.subtle` so they work in both Node and Edge runtimes. PIN hashing (scrypt, `scrypt$N$r$p$salt$hash` format, timing-safe compare) is Node-only and lives in `@luxematch/tenant/server` — never import that from middleware or any Edge code.

### PIN hardening (Phase 12)

- **Rate limit**: `POST /api/shop/unlock` allows 5 failures / 60s per `(jeweller_id, IP)` bucket (`isPinLocked`/`registerPinFailure`/`clearPinFailures` in `@luxematch/tenant`). The IP comes from `x-forwarded-for` / `x-real-ip`, falling back to `unknown`. **The limiter is an in-memory per-process Map** — it resets on deploy/restart and does not share state across instances. Fine for one Render node; revisit (e.g., count recent `pin_audit_events`) before scaling out.
- **Audit**: every attempt (success + failure) is written to `pin_audit_events (jeweller_id, attempt_ip, success, created_at)` via `logPinAudit()` — fire-and-forget, never blocks the unlock.
- **Cookie**: `HttpOnly`, `SameSite=Strict`, `Secure` in production.
- **Lock button**: `JewellerLayout` sidebar footer → `POST /api/shop/lock` (clears `lm_pin`) → `/jeweller/unlock`.
- **Idle-lock**: `apps/web/middleware.ts` re-checks the cookie TTL on every `/jeweller/*` request (`verifyPinCookie`) and redirects to `/jeweller/unlock?next=<path>` when expired.
- **Future path**: multi-staff Supabase Auth (the PIN stays as the fast in-shop re-lock) is specced in [docs/auth-readiness.md](docs/auth-readiness.md).

## Tenancy enforcement (the most important invariant)

Every read and write must be filtered by the device's `SHOP_JEWELLER_ID`. New routes and helpers must check each layer:

1. **Env** — `SHOP_JEWELLER_ID` set by `pnpm provision-shop`. Read via `getShopJewellerId()` from `@luxematch/tenant`.
2. **Hono middleware** — `tenantMiddleware` sets `c.set('shopJewellerId', id)` on every request. Handlers read from context, never from the request body.
3. **DB helpers** — helpers in `@luxematch/db` take `jewellerId: string` as first argument. Service-role key bypasses RLS — filtering is the *only* data isolation. **Known exceptions that rely on upstream scoping instead** (the customerId comes from a shop-scoped `lm_customer` cookie): `updateCartItem`, `removeFromCart`, `clearCart`, `getCartCount`, `getCustomerAddresses`, `upsertCustomerAddress` take only `customerId`; `getCategories` and `getCollectionProductIds` are global. Don't add new exceptions; prefer adding `jewellerId` to these when touched.
4. **Qdrant** — `searchByVector()` force-merges `jeweller_id` into the must-filter (first condition in `buildMust()`); callers cannot opt out. Note `upsertProductVector()` does NOT validate the payload's jeweller_id — callers must set it correctly.
5. **Cloudinary** — folder paths are built server-side as `luxematch/<jewellerId>/<bucket>/`. `publicIdBelongsToJeweller()` does the prefix check, but `deleteAsset()` itself does NOT verify — the route layer must check before calling.
6. **PIN/customer guard** — mutations go through `pinGuard`; customer routes verify the `lm_customer` cookie per-handler (there is no global `requireCustomer` middleware — each cart/order handler parses + checks the cookie and returns 401).

This applies to the e-commerce layer too: every `customers`, `cart_items`, `orders`, and `branches` row carries `jeweller_id`. A customer logged into shop A cannot see shop B's orders even if they have the same phone number.

## AR engine math (don't fight the conventions)

`packages/ar-engine` is a TypeScript port of `../jewellery-ar-service/frontend/app.js`:

- **Y-down orthographic camera** — `atan2(dy, dx) + π/2` is correct without a leading negation. If rotation looks mirrored, check for an extra negation, don't add one.
- **`mirrorLandmarks()` runs ONCE** before smoothing. The video is CSS-mirrored; the canvas is not. Doing this twice causes the OneEuro filter history to snap.
- **Selective landmark smoothing** — `FACE_LM_USED` (7 indices), `HAND_LM_USED` (7), `POSE_LM_USED` (shoulders 11/12). Don't smooth more.
- **Visible-bounds anchoring** — earrings anchor at PNG top-center, necklace at 5% below top (skips clasp), rings/bangles at visible center. Alpha-bounds scanning downscales to max 512px and needs CORS headers on the image host (falls back to full image otherwise).
- **`renderer.ts` and `preview.ts` both delegate to `overlayMath.ts`** for anchor selection, bounds, and calibration — drift between live AR and the jeweller calibrator preview is structurally impossible. Put any new positioning math in `overlayMath.ts`, not in either consumer.
- **3D model support exists**: `ARRenderer` loads GLB/GLTF via GLTFLoader (centered, longest-dim normalized) alongside 2D PNGs; format is detected from the URL extension.
- OneEuroFilter defaults: `minCutoff=2.0`, `beta=0.1`, `dCutoff=1.0` — same tuning as the source app.js.

## Intelligence (Phase 9.5 — live)

`@luxematch/intelligence` is **pure functions, no I/O** (DB reads live in `packages/db/src/intelligence.ts`; API routes are thin shells in `apps/web/lib/api/intelligence.ts`). It generates recommendations like *restock*, *review price*, *reduce stock*, *prepare for wedding/festive/gift season*. Input signals:

- `product_sales` (from "mark sold" in the jeweller products list — most important; demandScore weights sales 8×, tryons 2.5×, views 0.25×)
- `product_views`, `tryon_events`
- `products.stock_count`, `price_min`/`price_max`
- `INDIAN_SEASONAL_WINDOWS` — ⚠️ **hardcoded 2026 dates** (wedding Oct–Dec, festive Sep–Nov, gift Jul–Aug). These expire after 2026 and need to become year-relative.

**It is heuristic, not ML.** Sparse demo data correctly degrades to low-confidence guidance (high confidence needs ≥12 products and ≥80 signals). Extend the scoring logic in `packages/intelligence/src/index.ts`. `pnpm seed:intelligence` generates demo history; `pnpm rollup:intelligence` maintains `inventory_signals`.

## Analytics (Phase 10)

`apps/web/lib/analytics.ts` exports `trackEvent(type, { productId?, metadata? })` — a fire-and-forget client helper that POSTs to `/api/analytics/event` using `navigator.sendBeacon` (falls back to `fetch` with `keepalive`). It never throws and never blocks the UI. A per-tab `lm_session_id` lives in sessionStorage (resets when the customer walks away — kiosk semantics).

The server route (`apps/web/lib/api/analytics.ts`) validates `event_type` against a fixed allowlist, attaches `jeweller_id` from the tenant context (never the client), and writes to `analytics_events`. As a convenience it **also fans out** `product_view` → `product_views` and `tryon_start` → `tryon_events` so the analytics + intelligence aggregations (which read those dedicated tables) light up from the same single client call.

Wired across: search submit (`search_text`), product detail mount (`product_view`), add-to-cart (`cart_add`, both card + detail), save/unsave (in `SavedItemsContext`), compare page open (`compare_opened`), style-quiz complete (`style_quiz_completed`), try-on select + capture (`tryon_start`/`tryon_capture`), checkout (`order_placed`).

To add a new event type: add it to the `AnalyticsEventType` union in `lib/analytics.ts` AND the `EVENT_TYPES` array in `lib/api/analytics.ts` — they must stay in sync or the server rejects the event.

## Realtime sync

`useMultiDeviceSync(jewellerId, callback)` subscribes to Supabase Realtime on three tables (`products`, `product_sales`, `tryon_events`) scoped by `jeweller_id`. When staff updates inventory on one device, the customer catalog and dashboard on other devices refresh without a manual reload. `useRealtimeCatalog` is a lighter variant for customer-facing catalog pages only.

Both hooks use `getSupabaseBrowser()` (from `apps/web/lib/supabase-browser.ts`) which creates a Supabase client with the anon key — safe for the browser.

## E-commerce data model (migration 0002)

New tables in `0002_ecommerce.sql`:
- `branches` — physical shop locations for a jeweller (click-and-collect)
- `customers` — phone-identified per jeweller (same phone = different customer across shops; unique `(jeweller_id, phone)`)
- `customer_otps` — legacy time-limited one-time passwords table from the old phone OTP flow; current customer login uses Supabase Auth email OTP.
- `customer_addresses` — saved delivery addresses per customer
- `cart_items` — per-customer, per-jeweller shopping cart (unique `(customer_id, product_id)`)
- `orders` / `order_items` / `order_status_history` — placed orders with delivery/C&C type, status (placed/confirmed/packed/shipped/delivered/cancelled), payment snapshot fields

Apply with: Supabase dashboard → SQL Editor → paste `supabase/migrations/0002_ecommerce.sql` → Run.

## Common pitfalls

- **`node:crypto` in middleware** — see the two-cookie section. `@luxematch/tenant/server` (scrypt) is Node-only; `@luxematch/tenant` (HMAC via Web Crypto) is Edge-safe. Mixing them breaks the build.
- **Server secrets in `NEXT_PUBLIC_*`** — `packages/config` enforces the split. Don't reach for `process.env.X` directly.
- **Supabase joins return arrays** even for single-row relations. See `extractJewellerId()` in `packages/db/src/media.ts` for the defensive pattern.
- **Generated columns must be IMMUTABLE.** The schema uses a trigger (`products_set_search_vector_trg`) not a `GENERATED ALWAYS AS` column — Postgres rejected `to_tsvector('english', …)` as non-immutable. Don't change it back.
- **`/api/products/manage`** (PIN-gated, richer shape) vs **`/api/products`** (public, customer shape) — they return different field sets. Don't swap them.
- **Next.js 15 + `useSearchParams`** requires `<Suspense>` wrapper in the parent. See `apps/web/app/jeweller/products/page.tsx` for the established pattern.
- **Product edit page uses UUID, not slug** — `/jeweller/products/[id]` passes the UUID to `/api/products/by-id/:id`, not to the slug route.
- **`pnpm build` needs `SHOP_JEWELLER_ID` in env** — ISR/SSR pages call DB helpers at build time. Provision `.env.local` before building.
- **Cart and orders are per-customer per-jeweller** — the same phone number is a different `customers` row at each jeweller. Never join customers across jewellers.
- **Saved/compare use `localStorage`, not sessionStorage** — they persist across customers on a shared kiosk. If you touch idle-reset or these contexts, decide intentionally: either move to sessionStorage or clear the keys on idle reset.
- **Showcase AR products are always prepended** — `/try-on` merges 44 hardcoded entries from `lib/showcase-ar-assets.ts` with the real `/api/tryon/products` results. Remove them when real assets land.

## Known gaps / production blockers

Tracked here so they aren't rediscovered. Roughly in priority order:

1. **Exposed credentials in git** — `scripts/run-migration.mjs` hardcodes the Supabase URL + service-role key. The sibling `../Jewellery_AI` repo hardcodes the Cloudinary API secret (account `dyrc4bo4m` is **shared with LuxeMatch**) and a Qdrant Cloud API key in `backend/full_cleanup.py` / `backend/cleanup_cloudinary.py`. Rotate all of them; convert the scripts to env loading.
2. **Customer OTP delivery** — uses Supabase Auth email OTP. Production requires Supabase Auth custom SMTP to stay configured; phone remains stored on the shop-scoped `customers` row for orders and contact.
4. **Embedder not deployed** — `/api/search/text|image|hybrid` and per-product re-embedding are dead on the deployed site, which breaks text search (`/search`) and the style quiz in production; indexing is manual via `pnpm reindex` from a local machine. Visual search (`/search/image`) works via the Jewellery_AI HF Space proxy but searches Jewellery_AI's own catalog, NOT this shop's tenancy-scoped inventory. Decide hosting: own HF Space, the Render service already defined in render.yaml, or add `/embed/*` endpoints to the Jewellery_AI Space.
5. **Order confirmation email env** — checkout can send confirmation emails through optional `SMTP_*` env vars; configure these in Render for production.
6. **Home page is mock data**; `/store/[jeweller-slug]` is mock-only dead code (MODE B not built).
7. **localStorage saved/compare** breaks reset-between-customers kiosk semantics.
8. **`luxematch-web` on Render free plan** — idle spin-down = cold-start blank kiosk.
9. **In-memory PIN rate limiter** — resets on deploy, not multi-instance safe.
10. **Hardcoded `LUXE10` discount** in checkout; no discount table.
11. **2026-only festival windows** in `@luxematch/intelligence`.
12. **Test coverage** — vitest only covers `@luxematch/tenant`; the tenancy invariant in db/qdrant helpers has no automated guard.
13. **Stale docs** — `docs/architecture.md`, `docs/api-contracts.md`, `README.md` (Gemini/Vercel/old schema). `apps/Readme.md` is empty.

## Phase status

| Phase | Description | Status |
|---|---|---|
| -1, 0.5, 1 | Repo init, tenancy, scaffold | ✅ |
| 2 | Design system + frontend shell | ✅ |
| 3 | Supabase schema + catalog API | ✅ |
| 4 | Cloudinary signed uploads | ✅ |
| 5 | OpenCLIP embedder + Qdrant search | ✅ |
| 6 | AR engine port | ✅ |
| 7 | Try-on calibration tool | ✅ |
| 8 | Jeweller dashboard + product CRUD + analytics | ✅ |
| 9.5 | Inventory intelligence recommendations | ✅ (pulled forward) |
| E1 | Customer auth (OTP), cart, checkout, orders, branches | ✅ |
| E2 | Catalog → cart → checkout wiring, search on real API, hydration fix | ✅ (email hook + saved_items table dropped) |
| E3 | Jeweller order management (list + detail + status updates) | ✅ |
| 9 | Style quiz (real OpenCLIP search + reason chips) | ✅ |
| 10 | Analytics events + trackEvent + smoke tests + vitest + real /api/health | ✅ |
| 11 | Deployment config — render.yaml (web + embedder), CORS lockdown, docs/deployment.md, .env.production.example, health w/ shop id | ✅ |
| 12 | Auth-readiness + PIN hardening (audit log, per-IP rate limit, lock button, idle-lock, docs/auth-readiness.md) | ✅ |
| — | UI/UX refinement pass | ⬜ in progress |
| — | Production blockers (see "Known gaps" above) | ⬜ next |
| — | Real DB + storage connection, real asset upload | ⬜ next |
| AWS | S3 + CloudFront + EC2 migration | ⬜ parked — do when instructed |
