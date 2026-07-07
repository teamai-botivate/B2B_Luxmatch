# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Branch policy (read first)

**All work happens on `production`, which is also the deploy branch.** Do not touch `main` unless explicitly asked. This supersedes `plan.txt`'s older "main = deploy" strategy — `production` is ahead of `main` and is what ships.

## What This System Is

**Platform name: Jewel Factory** (UI-facing). Codebase package names stay `luxematch/*` — only UI text changes.  
**Footer credit: Powered by AT Jewellers** (replaces "Powered by Botivate" everywhere).  
**Supabase project: `xcvlswahgglygqfewolf`**

A **B2B jewellery platform** (Gold only — metal field removed everywhere) with **four actors**:

1. **Manufacturer** — global admin. Manages design catalog (no price, no metal field — Gold only). Approves/rejects store registration requests. Receives orders from stores (never sees customer details). Ships always to store's fixed delivery address. Portal at `/manufacturer/`.
2. **Store Owner** — self-registers (pending manufacturer approval). After approval: full store dashboard. Manages store profile, branding, fixed delivery address. Can add/delete managers (no limit). Places B2B catalog orders (goes to manager approval first). Portal at `/jeweller/` + `/store/login`.
3. **Store Manager** — multiple per store, added by owner. Same dashboard as owner **except**: cannot add/delete managers, cannot change store settings. Approves/rejects: (a) customer orders before forwarding to manufacturer, (b) custom design requests from customers, (c) B2B catalog orders placed by store. Separate email+password login + forgot password. Portal same as store owner.
4. **End Customer** — visits store kiosk (no login). Sees **manufacturer's full catalog** (not store inventory — this changed from B-series). AR try-on, visual search on manufacturer catalog. No price shown anywhere. Can submit custom design requests (image + specs). All customer details stay with store only — manufacturer never sees them.

**Key product decisions (C-series):**
- **No price anywhere** — not in manufacturer form, not in catalog, not in store view, not in any order
- **No metal field** — Gold only, not stored or displayed
- **Auto design number** — `JF-0001` serial, auto-generated on product create, globally sequential
- **Customer sees manufacturer catalog directly** (not store's purchased inventory)
- **All orders route through store** — customer order → store manager approves → manufacturer; store never exposes customer data to manufacturer
- **Store self-registration** → manufacturer approval → access granted
- **Store fixed delivery address** — set at registration, manufacturer always ships here
- **Branding on kiosk** — store's own logo + name (not Jewel Factory); footer = "Powered by AT Jewellers"

`plan.txt` / `B2B_PLAN.md` are the canonical B-series phase plans (B1–B21 complete). C-series is documented below. `README.md`, `docs/architecture.md`, `docs/api-contracts.md` are **stale** — prefer this file and the code.

## C-Series — Jewel Factory Evolution (Current Active Work)

### New Actors Added
```
STORE MANAGER (new)
  → Multiple per store, added/deleted by store owner only
  → email + password login, forgot password via email reset
  → Same dashboard as owner except: no manager management, no store settings
  → Must approve: customer kiosk orders, custom design requests, store B2B orders
  → Sees customer details (naam, phone) — manufacturer never does

STORE OWNER (evolved from "Store")
  → Self-registers at /store/register (no longer manufacturer-created)
  → registration_status: pending → approved → active
  → After manufacturer approval: full access
  → Settings panel: add/remove managers
  → Fixed delivery address set at registration
```

### New Order Flows

**Customer catalog order (changed from B-series):**
```
Old: Customer order → directly to manufacturer
New: Customer order → Store (manager approves) → Manufacturer
     Manufacturer sees: store name + store fixed address + product specs
     Manufacturer never sees: customer naam, phone, any detail
```

**Custom design request (new):**
```
Customer fills form on kiosk:
  image upload + category + weight + purity + notes + naam + phone
→ Store manager sees it (with customer details)
→ Manager: Approve → sanitized order sent to manufacturer (no customer data)
→ Manager: Reject → done
→ Manufacturer ships → store's fixed address
→ Store informs customer
```

**Store B2B catalog order (changed):**
```
Old: Store places order → directly to manufacturer
New: Store places order → Manager approves → Manufacturer
```

### New DB Tables (migration 0008_jewel_factory.sql)

```sql
store_managers          -- id, store_id, naam, email, password_hash, phone, is_active
custom_design_requests  -- id, store_id, customer_naam, customer_phone, reference_image_url,
                        --   category, weight_grams, purity, notes,
                        --   status (pending/approved/forwarded/rejected),
                        --   reviewed_by (manager_id), reviewed_at
custom_design_orders    -- sanitized order to manufacturer: store details + specs only, no customer
password_reset_tokens   -- id, email, role (store_owner/store_manager), token_hash, expires_at, used
```

### Existing Tables Changed (migration 0008)

```sql
-- stores
ADD COLUMN registration_status text DEFAULT 'pending'  -- pending/approved/rejected
ADD COLUMN fixed_address_street text
ADD COLUMN fixed_address_city text
ADD COLUMN fixed_address_state text
ADD COLUMN fixed_address_pincode text
ADD COLUMN fixed_address_landmark text
DROP COLUMN (price-related if any)

-- manufacturer_products
ADD COLUMN design_number text UNIQUE  -- JF-0001, auto-generated
DROP COLUMN base_price
DROP COLUMN metal

-- b2b_orders
ADD COLUMN manager_approved_by uuid  -- references store_managers.id or null (owner approved)
ADD COLUMN manager_approved_at timestamptz
DROP COLUMN total_amount
DROP COLUMN unit_price_snapshot (in items)

-- guest_orders (customer kiosk orders)
-- now routes through store first, manufacturer sees sanitized version
ADD COLUMN store_approved_by uuid  -- manager/owner who approved
ADD COLUMN store_approved_at timestamptz
ADD COLUMN forwarded_to_manufacturer boolean DEFAULT false
```

### C-Series Phase Status

| Phase | What | Status |
|-------|------|--------|
| C1 | `use-b2b-cart.ts` — remove price/metal/sku, add designNumber/weight/purity | ✅ Done |
| C2 | Migration `0008_jewel_factory.sql` | ⬜ Next |
| C3 | DB helpers: store_managers, custom_design_requests, custom_design_orders, password_reset | ⬜ |
| C4 | Store self-registration page + API (`POST /api/store/register`) | ⬜ |
| C5 | Manufacturer: Pending Approvals section + approve/reject | ⬜ |
| C6 | Store manager login + forgot password (email reset) | ⬜ |
| C7 | Owner: add/delete managers settings panel | ⬜ |
| C8 | Auto design number `JF-XXXX` on manufacturer product create | ⬜ |
| C9 | Remove price + metal from manufacturer product form + API + catalog | ⬜ |
| C10 | Customer kiosk → manufacturer catalog (replace store inventory view) | ⬜ |
| C11 | Customer order → store first (manager approval) → manufacturer | ⬜ |
| C12 | Manager approval gate on store B2B catalog orders | ⬜ |
| C13 | Custom design request form on customer kiosk | ⬜ |
| C14 | Manager portal: custom requests view + approve/forward/reject | ⬜ |
| C15 | Custom design → manufacturer (sanitized, privacy-safe) | ⬜ |
| C16 | Store fixed address auto-fill on all outgoing orders | ⬜ |
| C17 | Store branding on kiosk (logo + naam + AT Jewellers footer) | ⬜ |
| C18 | Jewel Factory branding on portal/login/title pages | ⬜ |

## Build state

All core phases (-1→12) + e-commerce (E1–E3) + B2B phases B1–B9 are landed in code; B10 tenancy refactor is started but not fully proven end-to-end. The next product phase is B11+ from `B2B_PLAN.md`: remove customer-login dependency and replace customer checkout with guest kiosk orders sent directly to the manufacturer. Highlights:

- **Inventory intelligence (9.5)** — heuristic recs on `/jeweller/dashboard` + `/jeweller/intelligence`.
- **E-commerce** — Supabase Auth email OTP, cart, checkout, orders, multi-branch. Migrations `0002_ecommerce.sql` + `0003_security_advisor.sql`.
- **Style quiz (9)**, **analytics/smoke/vitest (10)**, **Render config + CORS lockdown (11)**, **PIN hardening (12)**.
- **Realtime** — `useMultiDeviceSync` / `useRealtimeCatalog` keep catalog + dashboard live across devices.
- **Cart + cold-boot handling** — `useAddToCart` avoids mount-time cart fetches; `/api/search/jewellery-ai` remains as a showcase/fallback proxy with a 45s timeout + one retry and returns `upstream_warming_up` 503 during the HF Space's ~30–90s cold boot.
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

**B2B progress:** B1 (migration `0005_b2b_platform.sql`, B2B tables + fulfillment columns + manufacturer image try-on flags) ✅ · B2 (DB helpers: `packages/db/src/manufacturers.ts`, `stores.ts`, `b2b.ts`) ✅ · B3 (cookie auth: `issueManufacturerCookie`/`verifyManufacturerCookie`/`issueStoreCookie`/`verifyStoreCookie` in `@luxematch/tenant`) ✅ · B4 (config makes `SHOP_JEWELLER_ID` optional and adds B2B env vars) ✅ · B5 (page/API middleware guards for manufacturer + store) ✅ · B6 (B2B API routes in `apps/web/lib/api/manufacturer.ts`, `store.ts`, route mounts) ✅ · B7 manufacturer portal UI ✅ (layout, login, dashboard, catalog/products with image upload, stores, orders + tracking) · B8 store portal UI ✅ (store login, manufacturer catalog, session B2B cart, order create/history/detail/cancel, JewellerLayout nav) · B9 core fulfillment ✅ (delivered B2B orders create/update store inventory, copy catalog images, copy marked try-on PNGs, track `fulfilled_at`/`fulfilled_product_ids`) · B10 tenancy refactor partial (store cookie is now checked before env in page middleware, `tenantMiddleware`, and `pinGuard`; native `/search/image` uses tenant-scoped LuxeMatch search; still needs full browser smoke-test and remaining non-request/script/build surfaces) · **B11–B18 complete** (see below).

**B11–B18 complete:** Guest kiosk order flow fully replaces customer-login dependency for in-store purchases:
- **B11 (guest cart + checkout):** `useGuestCart` / `useGuestCartCount` in `apps/web/hooks/use-guest-cart.ts` — sessionStorage, no login. `ProductCard` + `ProductDetailPanel` use guest cart; cart link → `/kiosk-checkout`. Guest checkout at `/kiosk-checkout` (name, phone, email optional, pickup/delivery toggle, address, notes) → `POST /api/kiosk/orders` → returns `{ id, orderNumber }` → success page `/kiosk-checkout/success`.
- **B12 (store profile branding):** `/jeweller/store-profile` page — reads `GET /api/store/me`, saves `logo_url`/`tagline`/`website_url` via `PATCH /api/store/branding`. Branding columns added to `stores` table in migration `0006_guest_orders.sql`.
- **B13 (customer-facing branding):** AppHeader welcome strip shows `StoreName · LuxMatch` + `Powered by Botivate` (right). Footer: "Powered by Botivate". No teal; pearl/gold/velvet system unchanged.
- **B14 (guest checkout → manufacturer order):** `POST /api/kiosk/orders` — resolves jewellerId from `lm_store` cookie or `SHOP_JEWELLER_ID` env, resolves store + manufacturer, prices from DB, inserts `guest_orders` + `guest_order_items` + first status history row.
- **B15 (manufacturer kiosk-orders dashboard):** `/manufacturer/kiosk-orders` — shows all guest orders with **store name prominently highlighted**, expandable detail, advance-status buttons (placed→confirmed→packed→shipped→delivered).
- **B16 (store kiosk-orders dashboard):** `/jeweller/kiosk-orders` — store sees only its own guest orders with expandable detail.
- **B17 (store owner catalog ordering):** Already covered by B8 (`/jeweller/b2b-orders` + `/jeweller/manufacturer-catalog`).
- **B18 (branding):** Done in B13 above.

**Migration required:** Apply `supabase/migrations/0006_guest_orders.sql` in Supabase SQL editor — creates `guest_orders`, `guest_order_items`, `guest_order_status_history` tables and adds `logo_url`/`tagline`/`website_url` to `stores`.

**B20 complete:** AR Try-On asset management — manufacturer uploads a transparent PNG per product (`POST /api/manufacturer/products/:id/tryon-asset`); `has_tryon` flag propagates through `manufacturer_products`, store catalog, and customer product list; "Try On" button on `ProductCard` shown only when `has_tryon=true`; AR badge + "AR Try-On" filter in manufacturer products page and store manufacturer-catalog; `fulfillB2BOrder` auto-copies try-on asset to store `product_tryon_assets` on delivery; try-on page auto-selects product from `?product=<id>` URL param and shows "Add to Bag" for real products; real DB products take priority over showcase; migration `0007_tryon_assets.sql` required.

**Portal entry point (B19 complete):** `/portal` page added — dark themed staff login selector linking to `/store/login` (Store Owner) and `/manufacturer/login` (Manufacturer). Linked from footer via subtle "Staff Portal" text. Customer `/login` and `/signup` routes now redirect to `/` (customer auth deprecated). `AppHeader` account/User icon removed. `MobileNav` "Sign In / Register" link removed. All customer-facing pages are now purely guest/kiosk — no customer account UI exposed.

**B21 complete:** Store CRUD for manufacturer — manufacturer portal `/manufacturer/stores` now has full store management: edit store name/email/city/phone via pencil icon (modal pre-populated, `PATCH /api/manufacturer/stores/:id`); reset store login password via key icon (`PUT /api/manufacturer/stores/:id/password`, bcrypt, min 6 chars); delete store + auto-created `jewellers` row via trash icon with confirmation (`DELETE /api/manufacturer/stores/:id`); `updateStore()` syncs `jewellers.store_name` when store name changes; activate/deactivate toggle retained.

**Navigation + try-on flow fixes:** Image search results were linking to `/products/<slug>` (404) — fixed to `/catalog/<slug>`. Try-on X button was always returning to home (`/`) — now navigates to the originating product page via `?back=/catalog/<slug>` param (passed by `ProductCard` try-on button), falls back to `router.back()` or `/catalog` if no param. `ProductCard` try-on button now passes `?product=<id>&back=/catalog/<slug>` so try-on auto-selects the right product and knows where to return.

**Password eye toggle added:** Manufacturer login (`/manufacturer/login`) and store login (`/store/login`) both have show/hide password icon (lucide-react `Eye`/`EyeOff`), `showPassword` state, `tabIndex={-1}` so keyboard Tab is not disrupted.

**Documentation added:**
- `AGENT_GUIDE.md` — orientation file for any Claude Code agent or AI assistant; covers system architecture, auth flows, tenancy, API map, phase status, design system, deployment; give this file to any agent working on this repo
- `TRYON_IMAGE_GUIDE.md` — transparent PNG specs for AR try-on (format, size, jewellery_type positions, Canva/Photoshop/GIMP steps, do's/don'ts, tools)
- `docs/schema/` — 22 markdown files, one per DB table, with columns/types/relationships from live Supabase `information_schema`
- `docs/CLIENT_SETUP.md` — fresh client onboarding: new Supabase project, all 7 migrations in order, env vars, first manufacturer + store creation, Render deploy, no dummy data

**NEXT:** Apply `0007_tryon_assets.sql` migration · Apply `0006_guest_orders.sql` migration · finish B10 browser smoke-test (`SHOP_JEWELLER_ID` unset, store-cookie-first tenancy end-to-end) · redeploy to Render · verify HF embedder `/health` + live Qdrant search. AWS migration parked.

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

- **Web** — `luxematch-web` deploys directly from the root `Dockerfile` on Render, health `/api/health`; no Blueprint is required. The Docker image now builds successfully. The current revision uses `pnpm --filter @luxematch/web exec next start -H 0.0.0.0 -p ${PORT:-3000}`; redeploy this revision because the previous runtime used an extra `--` and treated `-H` as a directory. On the **free plan**, idle spin-down causes a cold start. `ALLOWED_ORIGINS` + `NODE_ENV=production` lock down CORS.
- **Embedder — Hugging Face Space prepared.** Docker Space source lives in `deploy/huggingface-embedder` (Python 3.10, CPU-only PyTorch, port 7860). Production endpoint is `https://botivate2026-embedder.hf.space`; set this as the web service's `EMBEDDER_URL`. Confirm `/health`, then live-smoke text/image embeddings and Qdrant search before calling deployment complete.
- **Jewellery_AI — deployed on HF** at `botivate2026-jewellery.hf.space` (repo `../Jewellery_AI`, Docker SDK Space) with its **own** Qdrant collection `jewellery_search`. It exposes `/search` etc. but **no** `/embed/*`, so it can't be `EMBEDDER_URL`. `JEWELLERY_AI_URL` points here; `/api/search/jewellery-ai` proxies to it only as a showcase/fallback path. Customer `/search/image` now calls native tenant-scoped `/api/search/image`, which requires `EMBEDDER_URL`.

Guides: [`docs/deployment.md`] (operator), `SETUP.md` (dev/testing), [`apps/web/.env.production.example`] (annotated env). AWS migration deferred; when it happens only env vars + `packages/cloudinary` change (see Infrastructure vendors).

## Workspace shape

```
apps/web/        Next.js 15 App Router + Hono BFF
apps/embedder/   Python FastAPI — OpenCLIP ViT-B-32, 512-d
packages/
  ar-engine/     MediaPipe + Three.js (ported from jewellery-ar-service); renderer.ts + preview.ts both delegate to overlayMath.ts; 2D PNG + 3D GLB/GLTF
  cloudinary/    signed upload + per-jeweller folder enforcement (only vendor-specific SDK); buckets: products, tryon, logo, avatars
  config/        zod env; server env throws at module load if missing
  db/            Supabase client + tenant-scoped helpers (products, jewellers, media, metrics, analytics, tryon, events, intelligence, customers, cart, ecommerce, branches, manufacturers, stores, b2b)
  embeddings/    thin TS client for apps/embedder
  intelligence/  heuristic recs (pure, no I/O)
  qdrant/        tenant collection luxematch_products + global manufacturer collection helpers
  tenant/        SHOP_JEWELLER_ID + PIN cookie + manufacturer cookie + store cookie (all Edge-safe HMAC) + /server (Node scrypt)
  types/         cross-package zod schemas
  ui/            EMPTY placeholder — real UI lives in apps/web/components
supabase/migrations/  0001_init.sql · 0002_ecommerce.sql · 0003_security_advisor.sql · 0004_customer_avatar.sql · 0005_b2b_platform.sql · 0006_guest_orders.sql (guest_orders + guest_order_items + guest_order_status_history + stores branding columns — **apply this next**) ; seed.sql (demo jeweller + 12 products + 3 tryon assets, PIN 123456)
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
# Embeddings              POST /api/embeddings/product/:id (PIN or valid store session)
#                         POST /api/embeddings/manufacturer/:id (manufacturer cookie)

# Search
POST /api/search/text|image|hybrid   public — OpenCLIP → Qdrant. ⚠️ need EMBEDDER_URL → dead on deployed site
POST /api/search/jewellery-ai        public — showcase/fallback multipart proxy to HF Space /search;
                                     returns Jewellery_AI's catalog {id,image_url,score}, NOT LuxeMatch products
GET  /api/search/suggest             public — Postgres FTS, no embedder hop

# Intelligence (PIN)      GET /api/intelligence/summary · /recommendations
# Analytics               POST /api/analytics/event  public — validated event_type; jeweller_id from ctx;
#                         fans product_view→product_views, tryon_start→tryon_events

# Customer auth (tenant-scoped by env or lm_store cookie)
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

# B2B — Manufacturer portal (lm_manufacturer cookie, except login/logout)
POST /api/manufacturer/login               public — bcrypt verify → lm_manufacturer cookie
POST /api/manufacturer/logout              public
GET  /api/manufacturer/me                  manufacturer-gated
GET  /api/manufacturer/products            manufacturer-gated — list with filters (category/metal/status/search)
GET  /api/manufacturer/products/:id        manufacturer-gated
POST /api/manufacturer/products            manufacturer-gated — create
PATCH|DELETE /api/manufacturer/products/:id  manufacturer-gated — ownership checked
GET  /api/manufacturer/orders              manufacturer-gated — all B2B orders for this manufacturer
GET  /api/manufacturer/orders/:id          manufacturer-gated — with items + history
PATCH /api/manufacturer/orders/:id         manufacturer-gated — status update (confirmed/packed/shipped/delivered/cancelled)

# B2B — Store portal (lm_store cookie, except login/logout)
POST /api/store/login                      public — bcrypt verify → lm_store cookie (carries jewellerId)
POST /api/store/logout                     public
GET  /api/store/me                         store-gated
GET  /api/store/catalog                    store-gated — browse active manufacturer products
GET  /api/store/catalog/:id                store-gated — single manufacturer product
POST /api/store/orders                     store-gated — place B2B order (prices resolved from DB, never trusted from client)
POST /api/store/orders                     store-gated — place B2B order (prices resolved from DB, never trusted from client)
GET  /api/store/orders                     store-gated — this store's B2B orders
GET  /api/store/orders/:id                 store-gated — with items + history
PATCH /api/store/branding                  store-gated — update logo_url/tagline/website_url
GET  /api/store/kiosk-orders               store-gated — this store's guest kiosk orders
GET  /api/store/kiosk-orders/:id           store-gated — with items + history

# Kiosk / Guest orders (public — no auth required)
POST /api/kiosk/orders                     public — place guest order (jewellerId from lm_store cookie or SHOP_JEWELLER_ID env)
GET  /api/kiosk/orders/:id                 public — receipt read (safe public fields only)

# Manufacturer kiosk-orders view
GET  /api/manufacturer/kiosk-orders        manufacturer-gated — all guest orders for this manufacturer (shows store name)
GET  /api/manufacturer/kiosk-orders/:id    manufacturer-gated — with items + history
PATCH /api/manufacturer/kiosk-orders/:id   manufacturer-gated — advance status
```

## Frontend data status

Most customer pages hit real APIs (catalog, detail, try-on, cart, checkout, orders, login/signup, account dashboard + profile picture, collections, occasions, home featured + collections, saved/compare via by-ids).

- **`/search/image` → `/api/search/image`** — native tenant-scoped visual search against `luxematch_products`; requires the OpenCLIP embedder and indexed product vectors.
- **`/search` text + `/style-quiz`** → embedder-dependent → broken on the deployed site until the embedder ships.
- **`/compare` + `/saved`** — `CompareContext`/`SavedItemsContext` on **`sessionStorage`** (`luxematch_compare`/`luxematch_saved`, max 4 compare). Intentional kiosk reset-between-customers; no `saved_items` table.
- **`/checkout/success`** — URL-param only; checkout sends a confirmation email when `SMTP_*` env is set.

**Guest kiosk cart** (no login): `apps/web/hooks/use-guest-cart.ts` — `useGuestCart()` (add/update/remove/clear, sessionStorage `luxematch_guest_cart`) · `useGuestCartCount()` (badge-only, cross-tab sync). ProductCard + ProductDetailPanel use guest cart; AppHeader cart → `/kiosk-checkout`. The old `useAddToCart` / `useCartCount` hooks remain in `use-cart.ts` for the legacy customer-auth checkout flow (`/cart`, `/checkout`) which is still mounted but not the primary in-store path.

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

## Four cookies, four auth flows

| Cookie | Purpose | Signed with | TTL | Format |
|---|---|---|---|---|
| `lm_pin` | Jeweller back-office | `LM_PIN_COOKIE_SECRET` (HMAC) | `LM_PIN_COOKIE_TTL_SECONDS` (4h) | `jewellerId.ts.sig` |
| `lm_customer` | Customer account/cart/orders | same secret + `:customer` suffix | 7d | base64 payload |
| `lm_manufacturer` | Manufacturer portal | `MANUFACTURER_COOKIE_SECRET` (HMAC, min 32 chars, **separate** secret) | `LM_MANUFACTURER_COOKIE_TTL_SECONDS` (8h) | `manufacturerId.ts.sig` |
| `lm_store` | Store portal — also carries jewellerId for tenancy | `LM_PIN_COOKIE_SECRET` + `:store` namespace | `LM_STORE_COOKIE_TTL_SECONDS` (8h) | `storeId.jewellerId.ts.sig` |

All HMAC-SHA-256 via `crypto.subtle` (Node + Edge safe). PIN + store/manufacturer passwords use **bcrypt** (`bcryptjs`). PIN hashing (scrypt) is Node-only in `@luxematch/tenant/server` — **never import from middleware/Edge**.

**Store cookie design:** embeds `jewellerId` in the payload (4-part format) so `storeGuard` sets `shopJewellerId` from the cookie with zero DB lookups — all existing tenant-scoped DB helpers work on store routes unchanged.

**PIN hardening (12):** rate limit 5 fails/60s per `(jeweller_id, IP)` — **in-memory per-process Map**, resets on deploy, not multi-instance safe (revisit via `pin_audit_events` count before scaling). Every attempt audited to `pin_audit_events` (fire-and-forget). Cookie `HttpOnly`/`SameSite=Strict`/`Secure` in prod. Lock button → `POST /api/shop/lock`. Idle-lock: `apps/web/middleware.ts` re-checks TTL on every `/jeweller/*` and redirects to `/jeweller/unlock?next=…`. Multi-staff path specced in [docs/auth-readiness.md].

## Tenancy enforcement (most important invariant)

Every read/write filtered by `jeweller_id`. Check each layer:

1. **Env / cookie** — kiosk mode: `getShopJewellerIdOptional()` from env. B2B mode: `storeGuard` reads `jewellerId` from `lm_store` cookie payload and calls `c.set('shopJewellerId', ...)`. Both paths produce the same context key — downstream code is identical.
2. **Middleware** — `tenantMiddleware` (kiosk) or `storeGuard` (B2B) sets `c.get('shopJewellerId')`; handlers read context, never the body.
3. **DB helpers** — take `jewellerId` first arg; service-role bypasses RLS so filtering is the *only* isolation. **Known exceptions** (rely on shop-scoped `lm_customer` cookie): `updateCartItem`, `removeFromCart`, `clearCart`, `getCartCount`, `getCustomerAddresses`, `upsertCustomerAddress` take only `customerId`; `getCategories`/`getCollectionProductIds` are global. Don't add new exceptions.
4. **Qdrant** — `searchByVector()` force-merges `jeweller_id` as the first must-filter; callers can't opt out. `upsertProductVector()` does NOT validate payload jeweller_id — set it correctly. Manufacturer catalog uses `QDRANT_MANUFACTURER_COLLECTION=luxematch_manufacturer_products` via `upsertManufacturerProductVector()` / `searchManufacturerCatalog()` with no jeweller filter because it is global.
5. **Cloudinary** — folders built server-side as `luxematch/<jewellerId>/<bucket>/`; `publicIdBelongsToJeweller()` checks prefix, but `deleteAsset()` does NOT — the route must check first. Manufacturer images go under `luxematch/manufacturer/<manufacturerId>/catalog/`.
6. **Guards** — `pinGuard` (jeweller mutations) · `manufacturerGuard` (all `/api/manufacturer/*`) · `storeGuard` (all `/api/store/*`) · `lm_customer` verified per-handler on customer routes.

Applies to e-commerce too: `customers`/`cart_items`/`orders`/`branches` all carry `jeweller_id`. Same phone = different `customers` row per shop; never join customers across jewellers. B2B tables (`manufacturer_products`, `b2b_orders`, etc.) are global — no `jeweller_id` on them except `b2b_orders.jeweller_id` (audit trail only).

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

1. **Apply migration `0007_tryon_assets.sql`** — B20 try-on asset support. Adds `has_tryon` to `manufacturer_products` and extends `product_tryon_assets` with `manufacturer_product_id`. Apply in Supabase SQL editor AFTER `0006_guest_orders.sql`.
2. **Apply migration `0006_guest_orders.sql`** — guest kiosk order flow is coded but the tables don't exist until this runs. Apply in Supabase SQL editor. Creates `guest_orders`, `guest_order_items`, `guest_order_status_history` and adds `logo_url`/`tagline`/`website_url` to `stores`.
2. **Secret rotation** — old Supabase service-role, Cloudinary secret, Qdrant keys were exposed in git history / sibling scripts. `run-migration.mjs` is env-loaded now, but leaked dashboard secrets still need rotating.
3. **Redeploy to Render** — all B11–B19 changes are pushed to GitHub (main branch). Trigger a new deploy on Render so the live site picks up: portal page, customer auth removal, guest kiosk flow, kiosk-orders dashboards, store profile.
4. **Apply `0004_customer_avatar.sql`** if still pending (customer DP columns — until applied, avatar save/delete errors on unknown column; `/me` degrades to `avatar_url=null`).
5. **OTP email on a personal Gmail (dev only)** — works E2E but Gmail caps ~500/day, spam risk, not a real sender. Switch to Resend/Brevo + verified domain before real customers. OTP is 8 digits; app accepts 6–8, don't re-narrow.
6. **Order confirmation email** — guest kiosk checkout could send a confirmation SMS/email; currently no notification is sent. Wire via optional `SMTP_*` or an SMS provider.
7. **Product image mapping quality** — real Cloudinary images imported + displayed, but `jewellery_search/*` sources had no metadata so the 12 products were mapped sequentially. Upload per-product photos via the jeweller flow, or add an explicit mapping layer + rerun the importer. Don't touch try-on/AR.
8. **Embedder live verification** — Hugging Face Docker Space and endpoint are prepared, but `/health`, text/image embedding, Qdrant indexing, and tenant-scoped search still need live smoke tests.
9. **B10 not complete yet** — store-cookie-first tenancy is implemented in main middleware/API guards, but must be browser-smoked with `SHOP_JEWELLER_ID` unset and audited for SSR/build-time/script paths that still require env tenancy.
10. **B2B embedding/search bridge needs live smoke** — manufacturer Qdrant helpers, `POST /api/embeddings/manufacturer/:id`, fulfilled-product indexing, and native `/search/image` are coded and typechecked. Still missing: live embedder/Qdrant smoke and optional Jewellery_AI `/add-image` bridge metadata.
11. **`luxematch-web` on Render free plan** — idle spin-down = cold-start blank kiosk.
12. **Hardcoded `LUXE10` discount** — no discount table.
13. **Test coverage** — tenancy guards exist; kiosk guest order flow, B2B login/order/fulfillment flows lack integration tests.
14. **Stale docs** — `docs/architecture.md`, `docs/api-contracts.md`, `README.md` (Gemini/Vercel/old schema); `apps/Readme.md` empty.
15. **Empty `@luxematch/ui`** — placeholder; populate or remove.

## Phase status

Done (✅): -1/0.5/1 scaffold+tenancy · 2 design system · 3 schema+catalog · 4 Cloudinary uploads · 5 OpenCLIP+Qdrant · 6 AR engine · 7 try-on calibration · 8 dashboard+CRUD+analytics · 9.5 intelligence · E1 customer auth/cart/checkout/orders/branches · E2 catalog→checkout wiring · E3 jeweller order mgmt · 9 style quiz · 10 analytics+smoke+vitest+health · 11 deploy config+CORS · 12 PIN hardening · P1 security · P2 kiosk correctness · P3 durable PIN limit+tenancy tests · Stage 3 email OTP+order email · Security Advisor migration · Email OTP live (custom SMTP, 6–8 digit) · Storefront real `product_images` + 12 Cloudinary photos imported · customer cookie-decode fix + sign-in/sign-up + account dashboard + profile pictures (Cloudinary `avatars` + migration `0004`) + cart/checkout/account redesign · customer UI/UX refinements + compare alignment + catalog hover cleanup + mobile profile responsiveness · **B1** migration `0005_b2b_platform.sql` · **B2** DB helpers (manufacturers.ts, stores.ts, b2b.ts) · **B3** cookie auth (manufacturer + store HMAC cookies in `@luxematch/tenant`) · **B4** optional shop env + B2B env vars · **B5** page/API guards · **B6** B2B API routes · **B7** manufacturer portal UI · **B8** store portal UI · **B9** core fulfillB2BOrder · **B10** partial (main middleware + API guards) · **B11** guest kiosk cart (`use-guest-cart.ts`) + checkout (`/kiosk-checkout`) + `POST /api/kiosk/orders` · **B12** store profile branding page (`/jeweller/store-profile`) + `PATCH /api/store/branding` · **B13** AppHeader branding (store name · LuxMatch · Powered by Botivate) + Footer credit · **B14** guest orders → manufacturer via `guest_orders` table + migration `0006_guest_orders.sql` · **B15** manufacturer kiosk-orders dashboard (`/manufacturer/kiosk-orders`) with store identity + status advance · **B16** store kiosk-orders dashboard (`/jeweller/kiosk-orders`) · **B17** already done (B8 store owner catalog ordering) · **B18** done in B13 · **B19** `/portal` staff login selector + customer auth deprecated (`/login`/`/signup` redirect to `/`, AppHeader account icon removed, MobileNav Sign In link removed, footer "Staff Portal" link added) · **B20** AR try-on asset management (manufacturer transparent PNG upload, `has_tryon` flag, conditional Try On button, AR badge + filter in all portals, fulfillB2BOrder auto-copies try-on asset, try-on page auto-selects from URL param + Add to Bag button, migration `0007_tryon_assets.sql`) · **B21** store CRUD for manufacturer (edit name/email/city/phone, reset password, delete store + jewellers row; full UI in manufacturer portal stores page) · **nav fixes** image search links `/products/` → `/catalog/` (was 404); try-on X button returns to originating product page via `?back=` param; ProductCard try-on passes `?product=<id>&back=/catalog/<slug>` · **password eye icon** manufacturer + store login pages (lucide-react Eye/EyeOff) · **docs** `AGENT_GUIDE.md` (agent orientation), `TRYON_IMAGE_GUIDE.md` (transparent PNG specs), `docs/schema/` (22 table docs from live DB), `docs/CLIENT_SETUP.md` (fresh client onboarding guide).

C-series (active): **C1** `use-b2b-cart.ts` updated (price/metal/sku removed, designNumber/weight/purity added, storage key → `jewelfactory_b2b_cart`) ✅ · **C2** migration `0008_jewel_factory.sql` ⬜ · **C3** DB helpers ⬜ · **C4** store self-registration ⬜ · **C5–C18** see C-Series table above ⬜

B-series pending (apply in Supabase SQL editor): **`0006_guest_orders.sql`** (guest order tables + stores branding columns) · **`0007_tryon_assets.sql`** (has_tryon + manufacturer try-on assets). Also pending: live DB city update `UPDATE jewellers SET city='Chhattisgarh' WHERE slug='at-jewellers'` · redeploy to Render · B10 smoke-test · HF embedder live verify · rotate exposed secrets. Parked: AWS migration.
