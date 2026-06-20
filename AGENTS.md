# AGENTS.md

Guidance for Codex when working in this repo.

## Branch policy (read first)

**All work happens on `production`, which is also the deploy branch.** Do not touch `main` unless explicitly asked. This supersedes `plan.txt`'s older "main = deploy" strategy — `production` is ahead of `main` and is what ships.

## What LuxeMatch is

A **shop-installed** AI jewellery platform with a full e-commerce layer. One install serves one jeweller's inventory on an in-store device. Customers browse, search by photo, try jewellery on in 2D AR, add to cart, log in with an email + password (a one-time email OTP verifies the address during sign-up only; phone is still the shop-scoped customer/order identity), and order for delivery or click-and-collect. Staff unlock a back-office on the **same device** with a PIN. The cloud (Supabase, Qdrant, Cloudinary, the Python embedder) is **shared across all shops**; tenancy is enforced by `jeweller_id` on every row, payload, and folder.

Multi-jeweller "MODE B" (works without `SHOP_JEWELLER_ID`) is **not built** — `getShopJewellerId()` throws without it, and the dead `/store/[jeweller-slug]` page was removed. `plan.txt` is the canonical phase plan; `SETUP.md` covers e-commerce setup. `README.md`, `docs/architecture.md`, `docs/api-contracts.md` are **stale** (Vercel/Gemini/old schema) — prefer `plan.txt`, this file, and the code.

## Build state

All core phases (-1→12) + e-commerce (E1–E3) are landed on `production`. Highlights:

- **Inventory intelligence (9.5)** — heuristic recs on `/jeweller/dashboard` + `/jeweller/intelligence`.
- **E-commerce** — Supabase Auth email OTP, cart, checkout, orders, multi-branch. Migrations `0002_ecommerce.sql` + `0003_security_advisor.sql`.
- **Style quiz (9)**, **analytics/smoke/vitest (10)**, **Render config + CORS lockdown (11)**, **PIN hardening (12)**.
- **Realtime** — `useMultiDeviceSync` / `useRealtimeCatalog` keep catalog + dashboard live across devices.
- **Cart + cold-boot handling** — `useAddToCart` avoids mount-time cart fetches; `/api/search/jewellery-ai` has a 45s timeout + one retry and returns `upstream_warming_up` 503 during the HF Space's ~30–90s cold boot.
- **Prod-blocker pass (P1–P3)** — cart/address helpers jeweller-scoped, demo OTP hidden in prod, migration seeder env-loaded, saved/compare on `sessionStorage`, home on real APIs, year-relative festival windows, durable PIN limits via `pin_audit_events`, tenancy guard tests.
- **Email OTP verified end-to-end** — custom SMTP set in the Supabase dashboard (dev: a personal Gmail App Password). Supabase email OTP is **8 digits**; verify route + login input accept **6–8** (`/^\d{6,8}$/`, input maxLength 8) — was hardcoded to 6, which made login impossible. `send-otp` logs and returns the real Supabase error on failure, including 429 rate limiting, so the login page can show the actual reason instead of a generic failure.
- **Storefront renders real `product_images`** — saved/compare/CompareTray hydrate stored UUIDs via tenant-scoped `GET /api/products/by-ids`; collections/occasions use real APIs; `productImageUrl()`/`PLACEHOLDER_IMAGE_URL` fallback. The 12 demo products point at Cloudinary assets under `luxematch/<SHOP_JEWELLER_ID>/products/`, imported from `jewellery_search/*` via `pnpm import:cloudinary-product-images` (sequential map — see gap #6).
- **Customer UI/UX Refinement & Responsiveness** — Refined the storefront customer experience for `/cart`, `/checkout`, `/checkout/success`, `/orders`, `/account`, and `/compare` to fully align with the pearl/gold/velvet design system (`#fffdf8` cards, `#e4d8c6` borders, 6–12px radii, `metal-sheen` CTAs, lucide icons instead of emojis). Key UX adjustments:
  - Catalog cards: Removed duplicate/redundant save heart icon from showing on hover, leaving only the static icon on the card.
  - Compare page: Optimized layout into standard columns (`220px` width) with restricted card sizes (`180px` max-width) and aligned the "Add More" placeholder height.
  - Mobile responsiveness: Profile icon is always visible in the mobile actions bar of `AppHeader`, and mobile navigation drawer checks `useCustomer` state to display direct "My Account" or "Sign In" options dynamically.
- **Customer cookie decode fix** — Hono's `setCookie` URL-encodes values, so the `lm_customer` base64 payload's `=`/`/`/`+` get escaped; the manual cookie parsers must `decodeURIComponent` before `verifyCustomerCookie` or **every** customer request reads as logged-out (this broke add-to-cart → bounced to `/login`). Shared `readCustomerCookie()` in `apps/web/lib/customer-auth.ts` is the one correct parser — use it; don't re-introduce raw inline splits.
- **Sign In / Sign Up (password-primary)** — `/login` (sign-in) and `/signup` share `components/auth/CustomerAuthForm.tsx` (`mode` prop). **Password is the primary credential; OTP runs exactly once, during sign-up, to verify the email.** Sign-up: name + email + phone + password + confirm-password (client-side match check + min 6) → one-time email OTP (`/send-otp` via `signInWithOtp`) → `/verify-otp` confirms the code AND sets the password via `supabase.auth.updateUser({password})` on the just-verified session. Sign-in: email + password → `POST /api/customer/signin` (`signInWithPassword`) → resolves the shop-scoped customer by email (`getCustomerByEmail`) → `lm_customer` cookie. No name field on sign-in (removed — it was a relic of the auto-create OTP flow). Requires Supabase email confirmations/SMTP (already configured). Password policy min 6 (Supabase default). Both honour `?next=`; pages wrap the form in `<Suspense>`. UI uses the velvet display-case panel + serif (`font-display`) headings + gold hairline within the pearl/gold/velvet system.
- **Customer dashboard** — `/account` is a real dashboard: editable name, stats (orders/saved/addresses), recent orders, saved addresses, sticky quick-links, and a **profile picture** (see Customer profile pictures below).
- **Customer profile pictures (DP)** — file in Cloudinary `luxematch/<jewellerId>/avatars/` (new `avatars` bucket), URL+public_id in `customers.avatar_url`/`avatar_public_id` (migration `0004_customer_avatar.sql`, **not yet applied** — gap #3). Customer-gated flow: `POST /api/customer/avatar/sign` → direct Cloudinary upload → `POST /api/customer/avatar`; `DELETE` clears it. `/me` now reads name+avatar fresh from the DB so post-login changes show without re-issuing the cookie.

**NEXT:** push/deploy local `production` commits; apply `0003_security_advisor.sql` + `0004_customer_avatar.sql` in Supabase; swap dev Gmail SMTP for a transactional provider (Resend/Brevo) + set prod `SMTP_*`; upload real per-product photos. Do **not** touch try-on/AR assets — deferred. AWS migration parked.

## Commands

```bash
pnpm dev / typecheck / build / lint / format[:check]   # standard workspace tasks
pnpm provision-shop          # interactive per-device install (writes SHOP_JEWELLER_ID + cookie secret + PIN hash to apps/web/.env.local)
pnpm reindex --jeweller-id=<uuid> | --all   # backfill OpenCLIP embeddings → Qdrant
pnpm seed:intelligence       # 180d synthetic views/tryons/sales (--reset-demo-history to wipe first)
pnpm rollup:intelligence     # roll signals → inventory_signals (7d buckets, 180d)
pnpm seed:ecommerce          # demo branches/customers/orders (env-loaded run-migration.mjs)
pnpm check-env               # required-env CI gate
pnpm smoke-test              # ping Supabase+Qdrant+embedder+Cloudinary+PIN (exit 1 if unreachable)
pnpm test                    # vitest — tenant PIN/cookie/rate-limit + DB/Qdrant tenancy guards
```

`reindex`, `seed:*`, `rollup:*`, `check-env`, `smoke-test`, `seed:ecommerce` all load `apps/web/.env.local` via `tsx --env-file`; new CLI scripts should too. `run-migration.mjs` seeds demo data — it does **not** apply migrations (despite the name); apply those in the Supabase SQL editor.

**Three processes for full E2E:** (1) Python embedder — `python -m uvicorn embedder:app --port 8001` from its venv (first boot pulls ~350 MB OpenCLIP weights; use `python -m uvicorn` so the venv interpreter is used); (2) `pnpm dev`; (3) cloud services (already in `.env.local`). After `next.config.ts`/workspace changes causing chunk 404s: `rm -rf apps/web/.next && pnpm dev`.

## Deployment

Deploy from `production`.

- **Web** — `luxematch-web` (`render.yaml`): Node, Next.js + Hono on Render, health `/api/health`. On the **free plan** (idle spin-down → cold-start blank kiosk; upgrade before real installs). `ALLOWED_ORIGINS` + `NODE_ENV=production` lock down CORS.
- **Embedder — NOT DEPLOYED.** `apps/embedder` is local-only (`EMBEDDER_URL=http://localhost:8001`); embeddings are backfilled via `pnpm reindex` from a dev machine. So on the deployed site the OpenCLIP routes (`/api/search/text|image|hybrid`, `POST /api/embeddings/product/:id`) have nothing to call. `luxematch-embedder` is defined in render.yaml but never deployed (roadmap P3 9b).
- **Jewellery_AI — deployed on HF** at `botivate2026-jewellery.hf.space` (repo `../Jewellery_AI`, Docker SDK Space) with its **own** Qdrant collection `jewellery_search`. It exposes `/search` etc. but **no** `/embed/*`, so it can't be `EMBEDDER_URL`. `JEWELLERY_AI_URL` points here; `/api/search/jewellery-ai` proxies to it and is the **production visual-search path** until the embedder ships.

Guides: [`docs/deployment.md`] (operator), `SETUP.md` (dev/testing), [`apps/web/.env.production.example`] (annotated env). AWS migration deferred; when it happens only env vars + `packages/cloudinary` change (see Infrastructure vendors).

## Workspace shape

```
apps/web/        Next.js 15 App Router + Hono BFF
apps/embedder/   Python FastAPI — OpenCLIP ViT-B-32, 512-d
packages/
  ar-engine/     MediaPipe + Three.js (ported from jewellery-ar-service); renderer.ts + preview.ts both delegate to overlayMath.ts; 2D PNG + 3D GLB/GLTF
  cloudinary/    signed upload + per-jeweller folder enforcement (only vendor-specific SDK); buckets: products, tryon, logo, avatars
  config/        zod env; server env throws at module load if missing
  db/            Supabase client + tenant-scoped helpers (products, jewellers, media, metrics, analytics, tryon, events, intelligence, customers, cart, ecommerce, branches)
  embeddings/    thin TS client for apps/embedder
  intelligence/  heuristic recs (pure, no I/O)
  qdrant/        single collection luxematch_products, jeweller-filtered search
  tenant/        SHOP_JEWELLER_ID + PIN cookie (Edge-safe) + /server (Node scrypt)
  types/         cross-package zod schemas
  ui/            EMPTY placeholder — real UI lives in apps/web/components
supabase/migrations/  0001_init.sql · 0002_ecommerce.sql · 0003_security_advisor.sql · 0004_customer_avatar.sql ; seed.sql (demo jeweller + 12 products + 3 tryon assets, PIN 123456)
scripts/         provision-shop · reindex · seed-intelligence · seasonal-rollup · check-env · smoke-test · run-migration.mjs (env-loaded demo seeder)
apps/web/public/All_jewelleries/   ~46 temp transparent AR PNGs
apps/web/lib/showcase-ar-assets.ts 44 hardcoded showcase products prepended to /api/tryon/products
```

## API surface

All mounted in `apps/web/app/api/[[...route]]/route.ts`. PIN-gated = `lm_pin` cookie; customer-gated = `lm_customer` cookie. CORS app-wide via `hono/cors` (`ALLOWED_ORIGINS` allow-list, credentialed; prod rejects unknown origins).

```
GET  /api/health                     public — Supabase+Qdrant ping, masked shop id

# Shop / back-office
GET  /api/shop                       public — header data
POST /api/shop/unlock                public — PIN check → lm_pin (rate-limited)
POST /api/shop/lock                  public — clear lm_pin
PATCH /api/shop                      PIN — store info + idle-reset
POST /api/shop/pin/change            PIN
GET  /api/shop/metrics|analytics|settings   PIN
GET  /api/shop/orders[/:id]          PIN — order list / detail
PATCH /api/shop/orders/:id           PIN — status (confirmed/packed/shipped/delivered/cancelled)

# Catalog (reads public, writes PIN)
GET  /api/products                   public — customer listing
GET  /api/products/manage            PIN — richer back-office shape (≠ /api/products)
GET  /api/products/by-ids?ids=…      public — bulk hydrate by UUID, tenant-scoped (saved/compare)
GET  /api/products/:slug             public ; GET /api/products/by-id/:id  public (edit form, UUID)
POST /api/products ; PATCH|DELETE /api/products/:id ; POST /api/products/:id/sales   PIN
GET  /api/categories (global) ; /api/collections[/:slug] ; /api/occasions/:slug (tag pseudo-collection) ; /api/tryon/products

# Cloudinary (PIN)        POST /api/cloudinary/sign-upload (server forces folder) · /delete (verifies publicId prefix)
# Try-on assets (PIN)     POST /api/tryon-assets · PATCH|DELETE /api/tryon-assets/:id
# Embeddings (PIN)        POST /api/embeddings/product/:id

# Search
POST /api/search/text|image|hybrid   public — OpenCLIP → Qdrant. ⚠️ need EMBEDDER_URL → dead on deployed site
POST /api/search/jewellery-ai        public — THE visual-search path; multipart proxy to HF Space /search;
                                     returns Jewellery_AI's catalog {id,image_url,score}, NOT LuxeMatch products
GET  /api/search/suggest             public — Postgres FTS, no embedder hop

# Intelligence (PIN)      GET /api/intelligence/summary · /recommendations
# Analytics               POST /api/analytics/event  public — validated event_type; jeweller_id from ctx;
#                         fans product_view→product_views, tryon_start→tryon_events

# Customer auth (scoped to SHOP_JEWELLER_ID)
POST /api/customer/send-otp          public — sign-up email OTP (signInWithOtp; logs real reason on failure)
POST /api/customer/verify-otp        public — confirms sign-up OTP, sets the password (updateUser),
                                     sets lm_customer (7d). ⚠️ accepts 6–8 digit codes
                                     (Supabase email OTP defaults to 8) — do NOT revert to 6
POST /api/customer/signin            public — PRIMARY sign-in: signInWithPassword + getCustomerByEmail → lm_customer
GET  /api/customer/me ; POST /api/customer/logout|profile   customer-gated
                                     (/me reads name+avatar fresh from DB)
POST /api/customer/avatar/sign       customer-gated — signed Cloudinary upload (avatars bucket)
POST|DELETE /api/customer/avatar     customer-gated — save/clear profile picture URL+public_id

# Customer orders (dual-mounted at /api/customer/orders AND /api/customer; frontend uses /orders)
GET  /api/customer/orders[/:id] ; /orders/addresses        customer-gated
GET  /api/customer/orders/branches                         public (click-and-collect)
POST /api/customer/orders/checkout                         customer-gated (discount hardcoded LUXE10=10%)

# Cart (per-customer per-shop, all customer-gated)
GET|POST /api/customer/cart ; PATCH|DELETE /api/customer/cart/:productId ; DELETE /api/customer/cart
```

## Frontend data status

Most customer pages hit real APIs (catalog, detail, try-on, cart, checkout, orders, login/signup, account dashboard + profile picture, collections, occasions, home featured + collections, saved/compare via by-ids).

- **`/search/image` → `/api/search/jewellery-ai`** — works in prod but returns Jewellery_AI's catalog, not this shop's.
- **`/search` text + `/style-quiz`** → embedder-dependent → broken on the deployed site until the embedder ships.
- **`/compare` + `/saved`** — `CompareContext`/`SavedItemsContext` on **`sessionStorage`** (`luxematch_compare`/`luxematch_saved`, max 4 compare). Intentional kiosk reset-between-customers; no `saved_items` table.
- **`/checkout/success`** — URL-param only; checkout sends a confirmation email when `SMTP_*` env is set.

Cart hooks (all `apps/web/hooks/use-cart.ts`): `useCart()` (full fetch — /cart, /checkout), `useAddToCart()` (POST-only — cards/detail), `useCartCount()` (global listener).

## Customer UI direction

The current storefront direction is **pearl gallery + warm velvet + restrained gold**, not generic cream luxury. Use `#FBF9F5`/near-white for browsing density, warm near-black/brown for display-case moments, and gold as a controlled accent/CTA. Do **not** introduce teal back into customer surfaces unless explicitly requested; the user rejected teal in the latest design pass.

Keep cards, buttons, and panels tighter than the previous `rounded-2xl`/24px style. Prefer 6–12px radii for product cards, login cards, notifications, and dense surfaces. Use the existing `metal-sheen` utility for the main gold CTA treatment when it fits. The home hero should keep the jewellery/visual-search value visible above the fold, with the featured piece as a dismissible fixed notification, not a low-opacity overlay that disappears while scrolling.

Do not re-add duplicate trust/CTA strips. The home page previously had a trust row and the footer repeated similar content; that duplication was intentionally removed/toned down. If adding trust metadata, prefer the hallmark/product metadata language already used on product cards over generic green "verified" pills.

## Image storage + vector search data flow

Same flow in dev and prod; only vendor endpoints change.

**Indexing:** Jeweller uploads → Cloudinary `luxematch/<jewellerId>/<bucket>/` (returns secure_url, public_id) → (`pnpm reindex` or `POST /api/embeddings/product/:id`) fetch bytes → Python embedder `POST /embed/image` (OpenCLIP ViT-B-32/laion2b, 512-d L2-normalised) → Qdrant `luxematch_products` (point id = product_id UUID, 512-d cosine, payload {product_id, jeweller_id, slug, category, metal, occasion_tags, price_min/max, has_tryon}).

**Search:** customer photo → `POST /api/search/image` (base64) → embedder → Qdrant ANN (must-filter `jeweller_id = ctx.shopJewellerId`) → `getProductsByIds(jewellerId, ids)` → render with Cloudinary URLs. The **link** between stores is `product_id` (Qdrant point id = Supabase PK); `product_embeddings` mirrors indexed status.

**AR assets** follow the same flow: transparent PNGs under `luxematch/<jewellerId>/tryon/`, URLs in `product_tryon_assets.asset_url`; the AR engine loads at runtime from a Cloudinary URL or local `/All_jewelleries/...`.

Current image state: the 12 demo products have primary `product_images` rows pointing at real Cloudinary assets imported from `jewellery_search/*` via `pnpm import:cloudinary-product-images --source-prefix=jewellery_search --limit=12 --apply --replace-seed`. Source assets had hex public IDs and no metadata, so they were mapped **sequentially** — use per-product uploads or an explicit mapping pass for accurate catalog photography (gap #6). Don't run `pnpm reindex` unless image rows/URLs change.

## Infrastructure vendors — dev vs prod

Data flow identical; only env changes. Dev → Prod(when migrating): Cloudinary `dyrc4bo4m` → S3+CloudFront · Qdrant Cloud → self-hosted Qdrant · Supabase Postgres → RDS · local embedder → EC2/ECS GPU (same FastAPI). Migration touches only: `CLOUDINARY_*` env + `packages/cloudinary/src/index.ts` (→ S3 SDK), `QDRANT_*`, `EMBEDDER_URL`, `NEXT_PUBLIC_SUPABASE_*`. `packages/embeddings`/`packages/qdrant`/search routes are vendor-agnostic HTTP.

## Two cookies, two auth flows

| Cookie | Purpose | Signed with | TTL |
|---|---|---|---|
| `lm_pin` | Jeweller back-office | `LM_PIN_COOKIE_SECRET` (HMAC, Web Crypto) | `LM_PIN_COOKIE_TTL_SECONDS` (4h) |
| `lm_customer` | Customer account/cart/orders | same secret + `:customer` suffix | 7d |

Both HMAC-SHA-256 via `crypto.subtle` (Node + Edge safe). PIN hashing (scrypt, `scrypt$N$r$p$salt$hash`, timing-safe) is Node-only in `@luxematch/tenant/server` — **never import from middleware/Edge**.

**PIN hardening (12):** rate limit 5 fails/60s per `(jeweller_id, IP)` — **in-memory per-process Map**, resets on deploy, not multi-instance safe (revisit via `pin_audit_events` count before scaling). Every attempt audited to `pin_audit_events` (fire-and-forget). Cookie `HttpOnly`/`SameSite=Strict`/`Secure` in prod. Lock button → `POST /api/shop/lock`. Idle-lock: `apps/web/middleware.ts` re-checks TTL on every `/jeweller/*` and redirects to `/jeweller/unlock?next=…`. Multi-staff path specced in [docs/auth-readiness.md].

## Tenancy enforcement (most important invariant)

Every read/write filtered by `SHOP_JEWELLER_ID`. Check each layer:

1. **Env** — `SHOP_JEWELLER_ID` via `getShopJewellerId()`.
2. **Middleware** — `tenantMiddleware` sets `c.set('shopJewellerId', id)`; handlers read context, never the body.
3. **DB helpers** — take `jewellerId` first arg; service-role bypasses RLS so filtering is the *only* isolation. **Known exceptions** (rely on shop-scoped `lm_customer` cookie): `updateCartItem`, `removeFromCart`, `clearCart`, `getCartCount`, `getCustomerAddresses`, `upsertCustomerAddress` take only `customerId`; `getCategories`/`getCollectionProductIds` are global. Don't add new exceptions.
4. **Qdrant** — `searchByVector()` force-merges `jeweller_id` as the first must-filter; callers can't opt out. `upsertProductVector()` does NOT validate payload jeweller_id — set it correctly.
5. **Cloudinary** — folders built server-side as `luxematch/<jewellerId>/<bucket>/`; `publicIdBelongsToJeweller()` checks prefix, but `deleteAsset()` does NOT — the route must check first.
6. **PIN/customer guard** — mutations via `pinGuard`; customer routes verify `lm_customer` per-handler (no global middleware).

Applies to e-commerce too: `customers`/`cart_items`/`orders`/`branches` all carry `jeweller_id`. Same phone = different `customers` row per shop; never join customers across jewellers.

## AR engine math (don't fight the conventions)

`packages/ar-engine` is a TS port of `../jewellery-ar-service/frontend/app.js`:

- **Y-down ortho camera** — `atan2(dy,dx)+π/2` is correct without a leading negation; if mirrored, remove an extra negation, don't add one.
- **`mirrorLandmarks()` runs ONCE** before smoothing (video is CSS-mirrored, canvas isn't); twice snaps the OneEuro history.
- **Selective smoothing** — `FACE_LM_USED`(7), `HAND_LM_USED`(7), `POSE_LM_USED`(shoulders 11/12). No more.
- **Visible-bounds anchoring** — earrings PNG top-center, necklace 5% below top (skips clasp), rings/bangles visible center. Alpha-bounds scan downscales to 512px and needs CORS on the image host (else full-image fallback).
- **`renderer.ts` + `preview.ts` both delegate to `overlayMath.ts`** — put new positioning math there, not in either consumer.
- **3D** — `ARRenderer` loads GLB/GLTF via GLTFLoader (centered, longest-dim normalized) alongside PNGs; format from URL ext.
- OneEuro defaults `minCutoff=2.0, beta=0.1, dCutoff=1.0` (matches source).

## Intelligence (9.5)

`@luxematch/intelligence` is **pure, no I/O** (DB reads in `packages/db/src/intelligence.ts`; routes are thin shells). Recs: restock / review price / reduce stock / prepare for wedding/festive/gift season. Signals: `product_sales` (from "mark sold" — demandScore weights sales 8×, tryons 2.5×, views 0.25×), `product_views`, `tryon_events`, `stock_count`, prices, `INDIAN_SEASONAL_WINDOWS` (year-relative: wedding Oct–Dec, festive Sep–Nov, gift Jul–Aug). Heuristic not ML; sparse data → low confidence (high needs ≥12 products + ≥80 signals). Scoring in `packages/intelligence/src/index.ts`.

## Analytics (10)

`apps/web/lib/analytics.ts` → `trackEvent(type, {productId?, metadata?})`: fire-and-forget `navigator.sendBeacon` (falls back to `fetch keepalive`), never throws/blocks; per-tab `lm_session_id` in sessionStorage (kiosk reset). Server (`lib/api/analytics.ts`) validates `event_type` against an allowlist, attaches `jeweller_id` from ctx, writes `analytics_events`, and fans `product_view`→`product_views`, `tryon_start`→`tryon_events`. **New event type:** add to the `AnalyticsEventType` union AND the `EVENT_TYPES` array — must stay in sync. Wired: search_text, product_view, cart_add, save/unsave, compare_opened, style_quiz_completed, tryon_start/capture, order_placed.

## Realtime sync

`useMultiDeviceSync(jewellerId, cb)` subscribes to Supabase Realtime on `products`/`product_sales`/`tryon_events` (jeweller-scoped) so other devices refresh without reload; `useRealtimeCatalog` is a lighter customer-only variant. Both use `getSupabaseBrowser()` (anon key, browser-safe).

## E-commerce data model (0002)

`branches` (click-and-collect locations) · `customers` (per-jeweller, unique `(jeweller_id, phone)`; `avatar_url`/`avatar_public_id` added in `0004`) · `customer_otps` (**legacy** phone-OTP table; login now uses email + password via Supabase Auth, with a one-time email OTP at sign-up) · `customer_addresses` · `cart_items` (unique `(customer_id, product_id)`) · `orders`/`order_items`/`order_status_history` (status placed→…→delivered/cancelled, payment snapshot). Apply via Supabase SQL editor: run `0002_ecommerce.sql`, then `0003_security_advisor.sql`, then `0004_customer_avatar.sql`.

## Common pitfalls

- **`node:crypto` in middleware** — `/server` (scrypt) is Node-only, base `@luxematch/tenant` (HMAC) is Edge-safe; mixing breaks the build.
- **Server secrets in `NEXT_PUBLIC_*`** — `packages/config` enforces the split; don't reach for `process.env.X` directly.
- **Supabase joins return arrays** even for single-row relations — see `extractJewellerId()` in `packages/db/src/media.ts`.
- **Generated columns must be IMMUTABLE** — search vector uses a trigger (`products_set_search_vector_trg`), not `GENERATED ALWAYS AS`; don't revert.
- **`/api/products/manage` (PIN, richer) ≠ `/api/products` (public)** — different field sets.
- **Next.js 15 + `useSearchParams`** needs a `<Suspense>` parent (see `apps/web/app/jeweller/products/page.tsx`).
- **Hydration warnings from extension-added body attributes** — `apps/web/app/layout.tsx` intentionally uses `suppressHydrationWarning` on `<html>`/`<body>` because Grammarly-style extensions add attributes such as `data-new-gr-c-s-check-loaded` before React hydrates. Do not remove this unless there is a real app-generated mismatch to fix.
- **Product edit uses UUID** — `/jeweller/products/[id]` → `/api/products/by-id/:id`, not the slug route.
- **`pnpm build` needs `SHOP_JEWELLER_ID`** — SSR/ISR pages call DB helpers at build time.
- **Cart/orders per-customer per-jeweller** — never join customers across jewellers.
- **Saved/compare on `sessionStorage`** (intentional kiosk reset) — don't move back to localStorage without a product decision.
- **Showcase AR products prepended** — `/try-on` merges 44 hardcoded `lib/showcase-ar-assets.ts` entries with `/api/tryon/products`; real AR assets deferred, don't change this path.
- **`lm_customer` cookie is URL-encoded by Hono** — read it via `readCustomerCookie()` (decodes), never a raw inline split, or `verifyCustomerCookie` fails and the customer reads as logged-out.

## Known gaps / production blockers (priority order)

1. **Secret rotation** — old Supabase service-role, Cloudinary secret, Qdrant keys were exposed in git history / sibling scripts. `run-migration.mjs` is env-loaded now, but leaked dashboard secrets still need rotating.
2. **Push/deploy local `production` commits** — P1–P3, email OTP, Security Advisor work is committed locally only.
3. **Apply pending migrations** in Supabase SQL editor: `0003_security_advisor.sql` (explicit `service_role` policies + fixed function `search_path`; no anon/authenticated grants — rerun the linter after) and `0004_customer_avatar.sql` (customer DP columns — until applied, avatar save/delete error on the unknown column; `/me` degrades to `avatar_url=null`).
4. **OTP email on a personal Gmail (dev only)** — works E2E but Gmail caps ~500/day, spam risk, not a real sender. Switch to Resend/Brevo + verified domain before real customers. OTP is 8 digits; app accepts 6–8, don't re-narrow.
5. **Order confirmation email** — checkout sends via optional `SMTP_*` (nodemailer, separate from Supabase Auth SMTP); set in prod env, ideally same provider as #4.
6. **Product image mapping quality** — real Cloudinary images imported + displayed, but `jewellery_search/*` sources had no metadata so the 12 products were mapped sequentially. Upload per-product photos via the jeweller flow, or add an explicit mapping layer + rerun the importer. Don't touch try-on/AR.
7. **Embedder not deployed** — text search + style quiz dead on the deployed site; indexing manual. Visual search works via the HF Space proxy but isn't tenancy-scoped. Decide hosting (own HF Space / Render service / add `/embed/*` to the Jewellery_AI Space).
8. **`luxematch-web` on Render free plan** — idle spin-down = cold-start blank kiosk.
9. **Hardcoded `LUXE10` discount** — no discount table.
10. **Test coverage** — tenancy guards exist; checkout/order-email + full auth flows lack integration tests.
11. **Stale docs** — `docs/architecture.md`, `docs/api-contracts.md`, `README.md` (Gemini/Vercel/old schema); `apps/Readme.md` empty.
12. **Empty `@luxematch/ui`** — placeholder; populate or remove.

## Phase status

Done (✅): -1/0.5/1 scaffold+tenancy · 2 design system · 3 schema+catalog · 4 Cloudinary uploads · 5 OpenCLIP+Qdrant · 6 AR engine · 7 try-on calibration · 8 dashboard+CRUD+analytics · 9.5 intelligence · E1 customer auth/cart/checkout/orders/branches · E2 catalog→checkout wiring · E3 jeweller order mgmt · 9 style quiz · 10 analytics+smoke+vitest+health · 11 deploy config+CORS · 12 PIN hardening · P1 security · P2 kiosk correctness · P3 durable PIN limit+tenancy tests · Stage 3 email OTP+order email · Security Advisor migration · Email OTP live (custom SMTP, 6–8 digit) · Storefront real `product_images` + 12 Cloudinary photos imported · customer cookie-decode fix + sign-in/sign-up + account dashboard + profile pictures (Cloudinary `avatars` + migration `0004`) + cart/checkout/account redesign · customer UI/UX refinements + compare alignment + catalog hover cleanup + mobile profile responsiveness.

Next (⬜): push/deploy local `production` · apply `0004_customer_avatar.sql` · upload real per-product photos · cleanup (discount table, stale docs, empty `@luxematch/ui`). Parked: AWS S3+CloudFront+EC2 migration.
