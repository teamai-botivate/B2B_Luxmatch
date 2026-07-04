# AGENT_GUIDE.md

**Give this file to any Claude Code agent or AI assistant working on LuxeMatch.**  
Read this first. It tells you what this project is, how it's structured, what files do what, what's done, what's next, and exactly how to work on it without breaking things.

---

## 1. What Is LuxeMatch?

A **B2B jewellery platform** — not a consumer app. Three actors:

```
MANUFACTURER (global admin)
  → Uploads product designs to a global catalog
  → Creates + manages store accounts
  → Receives B2B orders from stores AND guest kiosk orders from end customers
  → Controls order status: placed → confirmed → packed → shipped → delivered

STORE / RETAILER (tenant-isolated)
  → Logs in at /store/login → gets lm_store cookie → resolves to a jeweller_id
  → Browses manufacturer catalog, places B2B restock orders
  → Their kiosk runs the customer-facing storefront for walk-in customers
  → Sees their own kiosk (guest) orders, tracks delivery to customer

END CUSTOMER (kiosk / walk-in, no login)
  → Visits the store kiosk device
  → Searches by photo, uses AR try-on, browses
  → Adds to guest cart (sessionStorage only)
  → Fills short order form → order goes directly to manufacturer
  → No account, no login, nothing persisted across visits
```

**Key rule:** Customer login/accounts are **deprecated**. Do NOT re-add customer auth.  
**Key rule:** All tenant data is isolated by `jeweller_id`. Every DB query must filter by it.  
**Key rule:** The `production` branch is what deploys. Work on `production` unless told otherwise.

---

## 2. Reference Files — Read These, In This Order

| File | What it is | When to read |
|------|-----------|--------------|
| `AGENT_GUIDE.md` | **This file** — orientation for any agent | First |
| `CLAUDE.md` | Full technical spec, pitfalls, API surface, phase status | Always |
| `B2B_PLAN.md` | Original implementation plan for B1–B21 phases | When working on B2B features |
| `TRYON_IMAGE_GUIDE.md` | Transparent PNG specs for AR try-on | When working on try-on |
| `docs/CLIENT_SETUP.md` | How to set up the system for a new client | When onboarding a client |
| `docs/schema/` | One .md per DB table — columns, types, relationships | When touching DB or writing queries |

**Stale (do not trust):** `README.md`, `docs/architecture.md`, `docs/api-contracts.md`, `apps/Readme.md`

---

## 3. Workspace Layout

```
apps/web/              → Next.js 15 App Router + Hono BFF (main app)
apps/embedder/         → Python FastAPI, OpenCLIP image embedder (separate process)

packages/
  ar-engine/           → AR overlay math (MediaPipe + Three.js)
  cloudinary/          → Signed upload + folder enforcement per jeweller
  config/              → Zod env schema; throws at startup if required vars missing
  db/                  → Supabase client + ALL tenant-scoped DB helpers
  embeddings/          → HTTP client for apps/embedder
  intelligence/        → Pure heuristic recommendation engine (no I/O)
  qdrant/              → Vector search (luxematch_products + luxematch_manufacturer_products)
  tenant/              → Cookie auth for PIN, customer, manufacturer, store
  types/               → Cross-package Zod schemas
  ui/                  → Empty placeholder — real UI is in apps/web/components

supabase/migrations/   → 0001 → 0007, apply in order in Supabase SQL editor
scripts/               → CLI tools (reindex, seed, provision-shop, smoke-test, etc.)
docs/schema/           → DB schema docs (one file per table)
```

---

## 4. The Four Cookies — Auth System

| Cookie | Who uses it | Secret env var | Format |
|--------|-------------|----------------|--------|
| `lm_pin` | Store back-office (jeweller dashboard) | `LM_PIN_COOKIE_SECRET` | `jewellerId.timestamp.sig` |
| `lm_store` | Store portal login | `LM_PIN_COOKIE_SECRET` + `:store` namespace | `storeId.jewellerId.timestamp.sig` |
| `lm_manufacturer` | Manufacturer portal login | `MANUFACTURER_COOKIE_SECRET` | base64 payload + sig |
| `lm_customer` | **Deprecated** — do not use | same as lm_pin + `:customer` | — |

**Critical:** `lm_store` embeds `jewellerId` in the cookie so the API resolves tenancy per-request with zero DB lookups. This is how multi-store B2B mode works.

**Critical:** `MANUFACTURER_COOKIE_SECRET` must be set in env or manufacturer login returns 500. It does NOT fail at startup (it's `.optional()` in Zod) — the error only appears at login time.

---

## 5. Tenancy — The Most Important Invariant

Every single DB read/write must be scoped to a `jeweller_id`. The service role bypasses RLS, so app-level filtering is the **only** isolation. If you write a query without a `jeweller_id` filter, you're leaking all tenants' data.

### How jeweller_id flows into a request

**Device/kiosk mode (single store per deployment):**
```
SHOP_JEWELLER_ID env var → tenantMiddleware → c.set('shopJewellerId', id)
```

**B2B mode (multi-store, store-cookie):**
```
lm_store cookie → storeGuard middleware → verifyStoreCookie → c.set('shopJewellerId', jewellerId from cookie)
```

Both paths produce the same `c.get('shopJewellerId')` in the handler. Downstream DB helpers always receive `jewellerId` as their first argument.

### Layers to check for every new route/query

1. **Middleware** — is the right guard on? (`tenantMiddleware` or `storeGuard`)
2. **Handler** — reads `jewellerId` from `c.get('shopJewellerId')`, never from request body
3. **DB helper** — accepts `jewellerId` as first arg, every `.eq('jeweller_id', jewellerId)` present
4. **Qdrant** — `searchByVector()` force-merges `jeweller_id` as a must-filter; you cannot opt out
5. **Cloudinary** — folder is `luxematch/<jewellerId>/<bucket>/`; route verifies `publicIdBelongsToJeweller()` before delete

---

## 6. API Routes — Where They Live

All API routes are mounted in `apps/web/app/api/[[...route]]/route.ts` via Hono.

Route files in `apps/web/lib/api/`:

| File | Routes | Guard |
|------|--------|-------|
| `shop.ts` | `/api/shop/**` | PIN |
| `catalog.ts` | `/api/products/**`, `/api/categories`, etc. | public (reads) + PIN (writes) |
| `manufacturer.ts` | `/api/manufacturer/**` | `manufacturerGuard` |
| `store.ts` | `/api/store/**` | `storeGuard` |
| `kiosk.ts` | `/api/kiosk/orders` | public |
| `customer.ts` | `/api/customer/**` | `lm_customer` cookie (deprecated flow) |
| `embeddings.ts` | `/api/embeddings/**` | PIN or manufacturer |
| `search.ts` | `/api/search/**` | public |
| `analytics.ts` | `/api/analytics/**` | public (fire-and-forget) |
| `intelligence.ts` | `/api/intelligence/**` | PIN |
| `tryon-assets.ts` | `/api/tryon-assets/**` | PIN |
| `cloudinary.ts` | `/api/cloudinary/**` | PIN |

---

## 7. Database — Migrations

Apply these in the **Supabase SQL editor**, in this exact order, one at a time:

```
0001_init.sql              → core schema (jewellers, products, categories, analytics...)
0002_ecommerce.sql         → customers, cart, orders, branches (legacy customer flow)
0003_security_advisor.sql  → RLS policy fixes
0004_customer_avatar.sql   → avatar_url/avatar_public_id on customers
0005_b2b_platform.sql      → manufacturers, stores, b2b_orders, manufacturer_products
0006_guest_orders.sql      → guest_orders, guest_order_items, stores branding columns
0007_tryon_assets.sql      → has_tryon on manufacturer_products, manufacturer_product_id on tryon_assets
```

**Status:** All 7 migrations are written. Apply 0006 and 0007 if not yet done (check CLAUDE.md "Known gaps").

**Never:** Run `pnpm reindex` unless product images have changed. It re-embeds everything into Qdrant.

---

## 8. Phase Status — What's Done, What's Next

### Done ✅
B1 through B21 are all complete in code. Summary of what's built:

- **Manufacturer portal** (`/manufacturer/`) — login, dashboard, products (upload + images + tryon), stores (CRUD: add/edit/reset-password/delete/activate), B2B orders (track + fulfill), kiosk orders
- **Store portal** (`/store/login`, `/jeweller/`) — login, manufacturer catalog browse, B2B cart + orders, kiosk orders, store profile branding
- **Customer kiosk** (no login) — product browse, visual search, AR try-on, guest cart (sessionStorage), guest checkout (`/kiosk-checkout`), order confirmation
- **Staff portal selector** (`/portal`) — links to store and manufacturer login
- **AR try-on** — manufacturer uploads transparent PNG, has_tryon flag, Try On button shown only when asset exists, fulfillment auto-copies asset
- **Image search** — native OpenCLIP → Qdrant (requires EMBEDDER_URL env)
- **Auto-embedding** — manufacturer products auto-indexed on create/update/image-add (fire-and-forget)
- **Password eye toggle** — manufacturer login + store login

### Pending (migrations to apply) ⬜
- Apply `0006_guest_orders.sql` in Supabase SQL editor (guest order tables)
- Apply `0007_tryon_assets.sql` in Supabase SQL editor (has_tryon flag)
- Redeploy to Render after applying migrations
- B10 browser smoke-test (SHOP_JEWELLER_ID unset, store-cookie-only tenancy)

### Not started ⬜
- AWS migration (parked — Cloudinary stays for now)
- Discount table (currently hardcoded LUXE10=10%)
- Integration tests for B2B login/order/fulfillment flow

---

## 9. Key Files to Know

| File | What it does |
|------|-------------|
| `apps/web/app/api/[[...route]]/route.ts` | All API route mounts |
| `apps/web/lib/api/middleware.ts` | `pinGuard`, `manufacturerGuard`, `storeGuard`, `tenantMiddleware` |
| `apps/web/middleware.ts` | Next.js edge middleware — redirects on cookie auth |
| `packages/tenant/src/index.ts` | All cookie issue/verify functions (HMAC, Edge-safe) |
| `packages/config/src/index.ts` | Zod env schema — add new env vars here |
| `packages/db/src/index.ts` | All DB helper exports |
| `packages/db/src/manufacturers.ts` | Manufacturer + manufacturer product helpers |
| `packages/db/src/stores.ts` | Store auth + store CRUD helpers |
| `packages/db/src/b2b.ts` | B2B orders + fulfillB2BOrder |
| `apps/web/lib/api/embeddings.ts` | `indexManufacturerProduct()` + `indexProductForJeweller()` |
| `apps/web/hooks/use-guest-cart.ts` | Guest kiosk cart (sessionStorage, no login) |
| `apps/web/lib/customer-auth.ts` | `readCustomerCookie()` — only correct parser for lm_customer |

---

## 10. How to Add a New Feature (Checklist)

**Before writing any code:**
1. Read `CLAUDE.md` — does this feature conflict with any existing decision?
2. Check `docs/schema/` — does the DB already have what you need, or do you need a migration?
3. Check `packages/db/src/` — is there a DB helper already?

**When writing the feature:**
1. DB migration first (if new tables/columns) → write `.sql` file → note: apply manually in Supabase SQL editor
2. DB helpers in `packages/db/src/` → always take `jewellerId` as first arg for tenant-scoped tables
3. API route in `apps/web/lib/api/` → correct guard middleware → read `jewellerId` from `c.get('shopJewellerId')`
4. Mount in `apps/web/app/api/[[...route]]/route.ts`
5. Page/component in `apps/web/app/`
6. Update `CLAUDE.md` Build state and Phase status sections

**Common mistakes to avoid:**
- Using `node:crypto` in middleware/Edge (use `@luxematch/tenant` base, not `/server`)
- Putting server secrets in `NEXT_PUBLIC_*`
- Forgetting `jeweller_id` filter in DB queries
- Reading `lm_customer` with raw cookie split instead of `readCustomerCookie()`
- Using `getShopJewellerId()` (may return undefined) instead of `c.get('shopJewellerId')` in handlers
- Adding `useSearchParams()` without a `<Suspense>` parent (Next.js 15 requirement)
- Trusting prices from the client body — always resolve from DB

---

## 11. Dev Setup (Quick)

```bash
# 1. Clone repo, install deps
pnpm install

# 2. Create apps/web/.env.local — copy from apps/web/.env.production.example
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#          CLOUDINARY_*, LM_PIN_COOKIE_SECRET, MANUFACTURER_COOKIE_SECRET

# 3. Start dev server
pnpm dev

# 4. (Optional) Start Python embedder for visual search
cd apps/embedder && python -m uvicorn embedder:app --port 8001
```

Supabase, Cloudinary, and Qdrant are cloud services — credentials in `.env.local`. No local Docker needed.

For a fresh client setup (new Supabase project, no demo data), follow: `docs/CLIENT_SETUP.md`

---

## 12. Design System — Customer Storefront

**Palette:** Pearl (`#FBF9F5`) backgrounds, warm near-black for display-case moments, gold (`#C9A84C`) as the only accent/CTA.  
**No teal.** The user explicitly rejected teal — do not re-introduce it.  
**Radii:** 6–12px on cards, inputs, panels. Not `rounded-2xl`.  
**CTA buttons:** Use `metal-sheen` utility class.  
**Branding strip:** `<Store Name> · LuxMatch · Powered by Botivate`

Manufacturer and store portals use a dark/neutral admin aesthetic — not the pearl/gold storefront.

---

## 13. Image Search Data Flow

```
1. Customer uploads photo → POST /api/search/image
2. Server sends image bytes to Python embedder (EMBEDDER_URL) → /embed/image
3. Embedder returns 512-d OpenCLIP vector
4. Server queries Qdrant (luxematch_products, must-filter jeweller_id)
5. Returns matching products from Supabase (getProductsByIds)
6. Customer sees results → clicks → /catalog/<slug>
```

Requires `EMBEDDER_URL` env var pointing to the running embedder. Without it, visual search is unavailable (text search and manual browse still work).

Manufacturer catalog uses a separate Qdrant collection: `luxematch_manufacturer_products` (no jeweller filter — global).

---

## 14. AR Try-On Flow

```
1. Manufacturer uploads transparent PNG → POST /api/manufacturer/products/:id/tryon-asset
2. PNG stored in Cloudinary luxematch/manufacturer/<id>/catalog-tryon/
3. has_tryon flag set true on manufacturer_products
4. Store catalog and customer ProductCard show "Try On" button only if has_tryon=true
5. Customer clicks → /try-on?product=<id>&back=/catalog/<slug>
6. AR engine (packages/ar-engine) loads PNG, overlays on camera feed
7. X button reads ?back param → navigates back to product page
8. Add to Bag button → adds to guest cart
```

When a B2B order is fulfilled (delivered):
- `fulfillB2BOrder()` copies try-on asset to store's `product_tryon_assets`
- Store's product inherits `has_tryon=true`

For transparent PNG specs: see `TRYON_IMAGE_GUIDE.md`

---

## 15. Deployment

**Platform:** Render (web service `luxematch-web`)  
**Deploy from:** `production` branch  
**Dockerfile:** in repo root — builds Next.js + serves on `PORT`  
**Health check:** `GET /api/health`

Required env vars on Render (in addition to dev vars):
```
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.onrender.com
MANUFACTURER_COOKIE_SECRET=<min 32 chars, required for manufacturer login>
EMBEDDER_URL=https://botivate2026-embedder.hf.space
```

After any code push: trigger a new Render deploy. Migrations must be applied in Supabase SQL editor separately (Render doesn't run migrations).

---

## 16. When You're Stuck

1. Check `CLAUDE.md` — it has extensive pitfall documentation
2. Check `docs/schema/<table>.md` — for DB column names and types
3. Check `apps/web/lib/api/` — for existing route patterns to follow
4. Check `packages/db/src/` — for existing DB helper patterns

If a feature is in the Phase Status as "Done ✅", the code is already there — look before writing.

---

*LuxeMatch · Powered by Botivate · Built with Claude Code*
