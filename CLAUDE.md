# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What LuxeMatch is

A **shop-installed** AI jewellery platform with a full e-commerce layer. One install serves one jeweller's inventory on a device in their physical store. Customers browse, search by photo, try jewellery on in 2D AR, add to cart, log in via phone OTP, and place orders for delivery or click-and-collect. Staff unlock a back-office on the **same device** with a PIN to manage inventory, see analytics, and act on AI-generated stocking recommendations. The cloud (Supabase, Qdrant, Cloudinary, the Python embedder) is **shared across all shops**; tenancy is enforced by `jeweller_id` on every row, payload, and folder.

`plan.txt` is the canonical execution plan for the core platform phases. `SETUP.md` covers the e-commerce layer setup steps. `README.md` is out of date — prefer `plan.txt`, `SETUP.md`, and the code.

## Build state

All core phases (-1 through 8) are landed. On top of those, the following have been added:

- **Phase 9.5 (inventory intelligence)** — live. Heuristic recommendations on `/jeweller/dashboard` and `/jeweller/intelligence`.
- **E-commerce layer** — live. Customer phone OTP auth, cart, checkout, orders, multi-branch support. Supabase migration `0002_ecommerce.sql`.
- **Deployment polish** — Render setup, Corepack/pnpm command fixes, hydration fix, Jewellery_AI visual-search integration, temp AR assets under `public/All_jewelleries`, dynamic document titles, responsive jeweller UI.
- **Supabase Realtime** — `useMultiDeviceSync` and `useRealtimeCatalog` hooks subscribe to product/sales/tryon events so the catalog and dashboard stay live across devices without manual refresh.

Phase 9 (style quiz) and beyond are still pending.

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

node scripts/run-migration.mjs      # apply Supabase migrations programmatically
                                    # (alternative to the dashboard SQL editor)
```

`pnpm reindex` loads env via `tsx --env-file=apps/web/.env.local scripts/reindex.ts`. New CLI scripts that need Supabase/Qdrant access should follow the same pattern.

Three processes for full end-to-end:

1. **Python embedder** (`apps/embedder`) — `python -m uvicorn embedder:app --port 8001` from inside its venv. Run `pip install -r requirements.txt` once. First boot downloads ~350 MB of OpenCLIP weights to `~/.cache/huggingface/`. Use `python -m uvicorn`, not bare `uvicorn`, so the venv's interpreter is used.
2. **Next.js** — `pnpm dev` from repo root.
3. **Cloud services** — Supabase, Qdrant Cloud, Cloudinary. The dev `.env.local` already points at these.

When the dev server returns 404s for every chunk after a config change: `rm -rf apps/web/.next && pnpm dev`. Next.js sometimes leaves a stale manifest after `next.config.ts` edits or workspace changes.

## Deployment

`apps/web` is deployed on Render. Render uses Corepack + pnpm; the build/start commands assume `pnpm` is available on PATH. The Python embedder needs a separate Render worker/service with the OpenCLIP weights cached. See `SETUP.md` for step-by-step.

## Workspace shape

```
apps/
  web/          # Next.js 15 App Router + Hono BFF
  embedder/     # Python FastAPI — OpenCLIP inference (ViT-B-32, 512-d)

packages/
  ar-engine/    # MediaPipe + Three.js AR engine (ported from jewellery-ar-service)
                # preview.ts mirrors live renderer math for the calibration tool
  cloudinary/   # Signed-upload; per-jeweller folder enforcement
  config/       # zod-validated env. Throws at module load if anything missing
  db/           # Supabase client + all tenant-scoped query helpers:
                #   products, jewellers, media, metrics, analytics, tryon,
                #   events, intelligence, customers, cart, ecommerce, branches
  embeddings/   # Thin TS client for apps/embedder (text / image / hybrid)
  intelligence/ # Heuristic recommendation engine (live — Phase 9.5)
  qdrant/       # Single collection luxematch_products, jeweller-filtered search
  tenant/       # SHOP_JEWELLER_ID + PIN cookie (Edge-safe) + /server (Node scrypt)
  types/        # Cross-package zod schemas + inferred types
  ui/           # Shared shadcn re-exports

supabase/
  migrations/
    0001_init.sql        # Core schema (products, jewellers, events, etc.)
    0002_ecommerce.sql   # E-commerce layer (customers, OTPs, cart, orders, branches)
  seed.sql               # Demo jeweller + 12 products + 3 try-on assets (PIN 123456)

scripts/
  provision-shop.ts      # Per-device install setup
  reindex.ts             # OpenCLIP → Qdrant backfill
  run-migration.mjs      # Apply Supabase SQL migrations programmatically

apps/web/public/All_jewelleries/   # Temporary transparent PNGs for AR demo
                                   # (replaced by Cloudinary uploads via Phase 7 tool)
```

## API surface (current)

All routes are mounted in `apps/web/app/api/[[...route]]/route.ts`. PIN-gated = requires `lm_pin` cookie. Customer-gated = requires `lm_customer` cookie.

```
GET    /api/health

# Shop (jeweller info + back-office)
GET    /api/shop                        public — "Welcome to <store>" header data
POST   /api/shop/unlock                 public — PIN check, sets lm_pin cookie
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
POST   /api/search/image                public — OpenCLIP image encoder → Qdrant
POST   /api/search/hybrid               public — fused text+image → Qdrant
POST   /api/search/jewellery-ai         public — proxies to Jewellery_AI service
GET    /api/search/suggest              public — Postgres FTS (no embedder hop)

# Intelligence (Phase 9.5)
GET    /api/intelligence/summary        PIN — KPI strip + top recommendations
GET    /api/intelligence/recommendations  PIN — full ranked list

# Customer e-commerce (all scoped to SHOP_JEWELLER_ID)
POST   /api/customer/send-otp           public — phone OTP initiation
POST   /api/customer/verify-otp         public — OTP check, sets lm_customer cookie
GET    /api/customer/me                 customer-gated — profile
POST   /api/customer/logout             customer-gated — clears lm_customer cookie
POST   /api/customer/profile            customer-gated — update name/email
GET    /api/customer/                   customer-gated — order history
GET    /api/customer/:id                customer-gated — single order
GET    /api/customer/addresses          customer-gated — saved addresses
GET    /api/customer/branches           public — jeweller branches (for click-and-collect)
POST   /api/customer/checkout           customer-gated — create order from cart

# Cart (per-customer, per-shop)
GET    /api/customer/cart               customer-gated
POST   /api/customer/cart               customer-gated — add item
PATCH  /api/customer/cart/:productId    customer-gated — change quantity
DELETE /api/customer/cart/:productId    customer-gated — remove item
DELETE /api/customer/cart               customer-gated — clear cart
```

## Two cookies, two auth flows

The system has two independent cookie-based sessions:

| Cookie | Purpose | Signed with |
|---|---|---|
| `lm_pin` | Jeweller back-office access | `LM_PIN_COOKIE_SECRET` (HMAC, Web Crypto) |
| `lm_customer` | Customer account / cart / orders | Same secret with `:customer` suffix |

Both use HMAC-SHA-256 via `crypto.subtle` so they work in both Node and Edge runtimes. PIN hashing (scrypt) is Node-only and lives in `@luxematch/tenant/server` — never import that from middleware or any Edge code.

## Tenancy enforcement (the most important invariant)

Every read and write must be filtered by the device's `SHOP_JEWELLER_ID`. New routes and helpers must check each layer:

1. **Env** — `SHOP_JEWELLER_ID` set by `pnpm provision-shop`. Read via `getShopJewellerId()` from `@luxematch/tenant`.
2. **Hono middleware** — `tenantMiddleware` sets `c.set('shopJewellerId', id)` on every request. Handlers read from context, never from the request body.
3. **DB helpers** — every helper in `@luxematch/db` takes `jewellerId: string` as first argument. No implicit "any jeweller" path. Service-role key bypasses RLS — filtering is the *only* data isolation.
4. **Qdrant** — `searchByVector()` force-merges `jeweller_id` into the must-filter; callers cannot opt out.
5. **Cloudinary** — folder paths are built server-side as `luxematch/<jewellerId>/<bucket>/`. Deletes verify the prefix.
6. **PIN/customer guard** — mutations go through `pinGuard`; customer routes through `requireCustomer` (in `auth-customer.ts`).

This applies to the e-commerce layer too: every `customers`, `cart_items`, `orders`, and `branches` row carries `jeweller_id`. A customer logged into shop A cannot see shop B's orders even if they have the same phone number.

## AR engine math (don't fight the conventions)

`packages/ar-engine` is a TypeScript port of `../jewellery-ar-service/frontend/app.js`:

- **Y-down orthographic camera** — `atan2(dy, dx) + π/2` is correct without a leading negation. If rotation looks mirrored, check for an extra negation, don't add one.
- **`mirrorLandmarks()` runs ONCE** before smoothing. The video is CSS-mirrored; the canvas is not. Doing this twice causes the OneEuro filter history to snap.
- **Selective landmark smoothing** — `FACE_LM_USED`, `HAND_LM_USED`, `POSE_LM_USED` (~7 indices each). Don't smooth more.
- **Visible-bounds anchoring** — earrings anchor at PNG top-center, necklace at 5% below top (skips clasp), rings/bangles at visible center.
- **`preview.ts` must stay in sync with `renderer.ts`** — they both implement applyOverlay. If one changes, update the other. Drift means the jeweller calibrates against a lie.

## Intelligence (Phase 9.5 — live)

`@luxematch/intelligence` generates recommendations like *restock*, *review price*, *reduce stock*, *prepare for wedding/festive/gift season*. Input signals:
- `product_sales` (from "mark sold" in the jeweller products list — most important)
- `product_views`, `tryon_events`
- `products.stock_count`, `price_min`/`price_max`
- Hardcoded seasonal windows (Diwali, wedding season, Akshaya Tritiya, etc.)

**It is heuristic, not ML.** Sparse demo data correctly degrades to low-confidence guidance. Extend the scoring logic in `packages/intelligence/src/index.ts`; the API routes (`apps/web/lib/api/intelligence.ts`) are thin shells.

## Realtime sync

`useMultiDeviceSync(jewellerId, callback)` subscribes to Supabase Realtime on three tables (`products`, `product_sales`, `tryon_events`) scoped by `jeweller_id`. When staff updates inventory on one device, the customer catalog and dashboard on other devices refresh without a manual reload. `useRealtimeCatalog` is a lighter variant for customer-facing catalog pages only.

Both hooks use `getSupabaseBrowser()` (from `apps/web/lib/supabase-browser.ts`) which creates a Supabase client with the anon key — safe for the browser.

## E-commerce data model (migration 0002)

New tables in `0002_ecommerce.sql`:
- `branches` — physical shop locations for a jeweller (click-and-collect)
- `customers` — phone-identified per jeweller (same phone = different customer across shops)
- `customer_otps` — time-limited one-time passwords for phone login
- `customer_addresses` — saved delivery addresses per customer
- `cart_items` — per-customer, per-jeweller shopping cart
- `orders` / `order_items` — placed orders with delivery/C&C type, status, payment info

Apply with: Supabase dashboard → SQL Editor → paste `supabase/migrations/0002_ecommerce.sql` → Run. Or use `node scripts/run-migration.mjs`.

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
| E-com | Customer auth, cart, checkout, orders, branches | ✅ (added outside plan) |
| 9 | Style quiz | ⬜ TODO |
| 10 | Smoke tests + analytics events | ⬜ TODO |
| 11 | Deployment docs | ⬜ partial (Render live, docs TODO) |
| 12 | Auth-readiness cleanup | ⬜ TODO |
