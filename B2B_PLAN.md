# LuxeMatch B2B Platform — Implementation Plan

> **For agents/AI assistants:** Read `AGENT_GUIDE.md` first — it gives you a faster, denser orientation to the whole system. This file is the detailed implementation plan (B1–B21). Most of it is already built; look at the "Current Implementation Status" section below before starting any work.

---

## Current Implementation Status (as of 2026-07-07)

**All B1–B21 phases are complete in code. C-series (Jewel Factory evolution) C1–C11 are now complete on the `master` branch.**

### B-Series Status

| Phase range | Status |
|-------------|--------|
| B1–B9 | ✅ Complete and deployed |
| B10 | ⚠️ Partial — main middleware done, full browser smoke-test pending |
| B11–B19 | ✅ Complete (guest kiosk cart, checkout, order flow, portal selector, customer auth deprecated) |
| B20 | ✅ Complete (AR try-on asset management, has_tryon flag, manufacturer PNG upload) |
| B21 | ✅ Complete (store CRUD: edit/reset-password/delete for manufacturer) |

### C-Series Status (Jewel Factory Evolution — branch: `master`)

| Phase | What | Status |
|-------|------|--------|
| C1 | `use-b2b-cart.ts` — remove price/metal/sku, add designNumber/weight/purity | ✅ Done |
| C2 | Migration `0008_jewel_factory.sql` | ✅ Written — **apply in Supabase SQL editor** |
| C3 | DB helpers: store_managers, custom_design, password_reset; stores.ts self-reg | ✅ Done |
| C4 | Store manager cookie `lm_store_manager` in `packages/tenant` | ✅ Done |
| C5 | Store self-registration (`POST /api/store/register` + `/store/register` page) | ✅ Done |
| C6 | Manufacturer pending approvals API + `/manufacturer/store-registrations` page | ✅ Done |
| C7 | Manager login API + `/store/manager/login` page + `managerGuard` middleware | ✅ Done |
| C8 | Forgot/reset password — store owner + manager (pages + email APIs) | ✅ Done |
| C9 | Owner manager settings panel (`/jeweller/managers`) | ✅ Done |
| C10 | Auto design number `JF-XXXX` shown in product form + catalog | ✅ Done |
| C11 | Remove price + metal from product form, API, catalog | ✅ Done |
| C12 | Customer kiosk → manufacturer catalog (replace store inventory view) | ⬜ Next |
| C13 | Customer order → store first (manager approval) → manufacturer | ⬜ |
| C14 | Manager approval gate on store B2B catalog orders | ⬜ |
| C15 | Custom design request form on customer kiosk | ⬜ |
| C16 | Manager portal: custom requests view + approve/forward/reject | ⬜ |
| C17 | Custom design → manufacturer (sanitized, privacy-safe) | ⬜ |
| C18 | Store fixed address auto-fill on all outgoing orders | ⬜ |
| C19 | Store branding on kiosk (logo + naam + AT Jewellers footer) | ⬜ |
| C20 | Jewel Factory branding on portal/login/title pages | ⬜ |

**Migrations to apply in Supabase SQL editor (in order):**
1. `0006_guest_orders.sql` — guest_orders tables + stores branding columns
2. `0007_tryon_assets.sql` — has_tryon on manufacturer_products + manufacturer try-on assets
3. `0008_jewel_factory.sql` — C-series: store_managers, custom_design tables, password_reset_tokens, design_number sequence, nullable base_price/metal, manager approval columns on orders

**What's next:** Apply the three migrations → redeploy to Render → continue C12+ (customer kiosk shows manufacturer catalog, manager approval gates). See CLAUDE.md C-Series Phase Status table for full detail.

---

> **Scope:** Evolve LuxeMatch from a single-store kiosk into a B2B jewellery platform.
> Manufacturer uploads a global design catalog → Stores browse & order from it → End customers shop at each store via visual search + AR try-on.
>
> **Rule:** Catalog app (`../Catalog`) is retired once this plan is complete. All its features live here.
> **Rule:** Manufacturer catalog/product upload/design management stays as-is unless a new order flow needs read-only data from it.
> **Rule:** Customer account login is now deprecated for the B2B in-store flow. Customers should order as guests from the store device.
> **Rule:** Device-mode deployments (single `SHOP_JEWELLER_ID` in env) keep working throughout.

---

## Current Product Direction (Post-B1-B10)

The B1-B10 platform work created the manufacturer portal, store portal, B2B catalog, B2B order foundations, and cookie-based store tenancy. The next work changes the customer purchase model:

```
Customer does not login.
Customer uses the store device/kiosk.
Customer browses/searches/tries jewellery and adds items to a cart.
Customer fills a short order form.
Order is created directly for the manufacturer.
Store can see and track the order because every order stores store_id.
Manufacturer can see exactly which store the order came from.
Store hands over/delivers the jewellery to the customer after fulfillment.
```

Branding hierarchy for customer-facing screens:

```
Primary: <Store Name>
Product/platform: LuxMatch
Credit: Powered by Botivate
```

AT Jewellers/LuxMatch owns the software platform. Registered stores should see their own store name as the primary retail identity.

### New Order Sources

```
customer_kiosk_order
  Created by an end customer on a store device.
  Requires customer name, phone, address/pickup preference, and notes.
  Goes directly to the manufacturer.
  Store tracks status and handles customer handover.

store_owner_order
  Created by a logged-in store owner from the manufacturer catalog.
  Customer fields are optional.
  Used for customer-assisted orders or store restock.
```

### Target Order Status Flow

```
pending
accepted
in_production
packed
shipped_to_store
arrived_at_store
customer_notified
delivered_to_customer
cancelled
```

Manufacturer controls `pending → shipped_to_store`.
Store controls `arrived_at_store → delivered_to_customer`.

### Required Next Phases

| Phase | What | Risk | Touches existing code? |
|-------|------|------|------------------------|
| B11 | Remove customer-login dependency from cart/checkout | High | Yes |
| B12 | Store public signup/login polish + store profile branding | Medium | Yes |
| B13 | Guest cart/session model for in-store customers | Medium | Yes |
| B14 | Guest checkout form creates manufacturer B2B order | High | Yes |
| B15 | Manufacturer order dashboard shows store + customer source details | Medium | Yes |
| B16 | Store dashboard tracks customer kiosk orders + handover statuses | Medium | Yes |
| B17 | Store owner catalog ordering supports customer-assisted/restock orders | Low | Existing B8/B9 extension |
| B18 | Update customer-facing UI labels/branding: store name + LuxMatch + Powered by Botivate | Low | Yes |
| B19 | /portal staff login selector + customer auth deprecated | Low | Yes |
| B20 | AR Try-On asset management — manufacturer uploads transparent PNG per product; try-on button shown only when asset exists; filter in all three portals | Medium | Yes |
| B21 | Store CRUD for manufacturer — edit store details (name/email/city/phone), reset store password, delete store; full UI in manufacturer portal | Low | Yes |

Start implementation from **B11**. Do not rewrite manufacturer product upload/catalog unless a field is required to display/order existing products.

---

## B21 — Store CRUD for Manufacturer (implementation details)

### Goal
Manufacturer can fully manage store accounts: edit name/email/city/phone, reset store login password, delete a store (which also removes the auto-created `jewellers` row).

### DB helpers added (`packages/db/src/stores.ts`)
- `updateStore(manufacturerId, storeId, input)` — patches stores table, syncs `jewellers.store_name` when name changes
- `updateStorePassword(manufacturerId, storeId, newPassword)` — bcrypt hash + update `password_hash`
- `deleteStore(manufacturerId, storeId)` — deletes store row, then deletes the auto-created `jewellers` row

### API routes added (`apps/web/lib/api/manufacturer.ts`)
```
PATCH  /api/manufacturer/stores/:id           — edit name/email/city/phone (Zod validated)
PUT    /api/manufacturer/stores/:id/password  — reset password (min 6 chars)
DELETE /api/manufacturer/stores/:id           — delete store + jewellers row
```

### UI (`apps/web/app/manufacturer/stores/page.tsx`)
Full rewrite:
- Edit button (pencil icon) → modal pre-populated with existing store data
- Key icon → reset-password modal with new + confirm fields
- Trash icon → `window.confirm()` prompt → DELETE call
- Activate/deactivate toggle retained
- Responsive table: name + email always visible; city + phone hidden on small screens

---

## B20 — AR Try-On Asset Management (implementation details)

### Goal
Manufacturer uploads a transparent-background PNG for any product. That flag propagates through the system so:
- Customer storefront shows "Try On" button **only** on products with an asset
- All three portals (manufacturer/store/customer) show an "AR Try-On" badge/filter
- B2B order fulfillment auto-copies the try-on asset to the store's product inventory

### Database changes (migration 0007_tryon_assets.sql)
```sql
-- Flag on manufacturer_products
ALTER TABLE manufacturer_products ADD COLUMN has_tryon boolean NOT NULL DEFAULT false;

-- Extend product_tryon_assets to support manufacturer products directly
-- product_id becomes nullable; manufacturer_product_id is the alternative FK
ALTER TABLE product_tryon_assets
  ADD COLUMN manufacturer_product_id uuid REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  ALTER COLUMN product_id DROP NOT NULL;

CREATE INDEX idx_tryon_assets_mfr_product
  ON product_tryon_assets(manufacturer_product_id)
  WHERE manufacturer_product_id IS NOT NULL;
```

### API changes
```
POST /api/manufacturer/products/:id/tryon-asset   — upload transparent PNG, set has_tryon=true
DELETE /api/manufacturer/products/:id/tryon-asset  — remove asset, set has_tryon=false
GET /api/manufacturer/products                     — include has_tryon in response
GET /api/store/catalog                             — include has_tryon + tryon asset_url/jewellery_type
GET /api/products (customer)                       — include has_tryon
```

### UI changes
| Portal | Change |
|--------|--------|
| Manufacturer products page | "AR Try-On" section in add/edit modal — transparent PNG upload + jewellery_type select |
| Manufacturer products list | "AR" badge on rows with has_tryon=true |
| Store manufacturer-catalog | "AR" badge + "Try-On Only" filter toggle |
| Customer ProductCard | Try-On button shown only when product.hasTryOn === true |
| Customer try-on page | Real DB products take priority over showcase; showcase shown only when no real data |

### fulfillB2BOrder change
When copying manufacturer product to store inventory: if `has_tryon=true`, also copy the `product_tryon_assets` row (with `product_id` = new store product id, same asset_url + calibration).

---

## Legacy B1-B10 Plan Status

The section below documents the completed/mostly completed B1-B10 implementation. Keep it for history and schema/API context, but new work should follow the post-B1-B10 phases above.

---

## Three-Actor Model

```
MANUFACTURER (global admin)
  └─ Uploads designs → global catalog (manufacturer_products)
  └─ Creates store accounts
  └─ Receives B2B orders from stores
  └─ Manages: pending → confirmed → packed → shipped → delivered

STORE / RETAILER (tenant-isolated)
  └─ Logs in with email + password → lm_store cookie → resolves jeweller_id
  └─ Browses manufacturer catalog
  └─ Places B2B orders → manufacturer sees them
  └─ On "delivered": designs auto-appear in store's products table
  └─ Manages own customer orders, sales, stock, analytics

END CUSTOMER (unchanged from today)
  └─ Visits store kiosk
  └─ Visual search / AR try-on
  └─ Adds to cart → places order → goes to STORE (not manufacturer)
  └─ Store fulfills from stock sourced via B2B orders
```

---

## Phase Overview

| Phase | What | Risk | Touches existing code? |
|-------|------|------|------------------------|
| B1 | DB migration — new tables | Low | No (additive only) |
| B2 | New DB helpers in packages/db | Low | No (new files) |
| B3 | Manufacturer cookie auth | Low | Minimal (tenant package) |
| B4 | Config — make SHOP_JEWELLER_ID optional | Medium | Yes (config + tests) |
| B5 | Middleware — add manufacturer route guard | Low | Yes (middleware.ts) |
| B6 | API routes — manufacturer portal endpoints | Low | Yes (route.ts mount) |
| B7 | Manufacturer portal UI pages | Low | No (new pages) |
| B8 | Store portal — B2B catalog + ordering UI | Low | Yes (JewellerLayout nav) |
| B9 | B2B order fulfillment → auto inventory | Medium | Yes (ecommerce.ts) |
| B10 | Tenancy refactor: env → per-request cookie | HIGH | Yes (everything) |

**Do B10 last. All other phases work with the current env-var tenancy.**

---

## Phase B1 — Database Migration

**File to create:** `supabase/migrations/0005_b2b_platform.sql`
**Apply in:** Supabase SQL editor (same as 0003 and 0004)

### New Tables

#### `manufacturers`
Central admin account. One row per company (can be just one).

```sql
CREATE TABLE manufacturers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,           -- bcrypt, NOT scrypt (Node-safe, simpler)
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

#### `manufacturer_products`
Global design catalog. NOT jeweller-scoped. Every active store can read this.

```sql
CREATE TABLE manufacturer_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id  uuid NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  sku              text NOT NULL,
  name             text NOT NULL,
  category         text,                   -- matches existing categories (ring, earring, etc.)
  sub_category     text,                   -- free text: "Chandbali", "Hoop", etc.
  description      text,
  base_price       numeric(12,2),
  weight_grams     numeric(8,3),
  metal            text,                   -- Gold | Silver | Platinum | Rose Gold | White Gold | Mixed Metals
  purity           text,                   -- 14k | 18k | 22k | 24k | 925 | 950 | 999
  occasion_tags    text[] DEFAULT '{}',    -- collection/occasion tags from form
  style_tags       text[] DEFAULT '{}',    -- e.g. Antique, Kundan, Temple
  gemstones        text[] DEFAULT '{}',    -- e.g. Diamond, Ruby, Emerald
  min_order_qty    integer DEFAULT 1 CHECK (min_order_qty >= 1),  -- minimum pieces per B2B order
  status           text DEFAULT 'draft'    -- draft | active | archived
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (manufacturer_id, sku)
);
```

#### `manufacturer_product_images`
Images for manufacturer designs (stored in Cloudinary under manufacturer folder).

```sql
CREATE TABLE manufacturer_product_images (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid NOT NULL REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  cloudinary_public_id text NOT NULL,
  secure_url           text NOT NULL,
  is_primary           boolean DEFAULT false,
  sort_order           integer DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);
```

#### `manufacturer_product_tryon`
AR try-on assets for manufacturer designs.

```sql
CREATE TABLE manufacturer_product_tryon (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  asset_url       text NOT NULL,
  jewellery_type  text NOT NULL
    CHECK (jewellery_type IN ('earring', 'necklace', 'ring', 'bangle', 'bracelet', 'pendant')),
  pivot_x         numeric DEFAULT 0.5,
  pivot_y         numeric DEFAULT 0.5,
  scale_multiplier numeric DEFAULT 1.0,
  created_at      timestamptz DEFAULT now()
);
```

#### `stores`
One row per registered store/jeweller. Links to existing `jewellers` table.
The `jeweller_id` here is the FK into the existing `jewellers` table — this is the tenancy key.

```sql
CREATE TABLE stores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id     uuid UNIQUE REFERENCES jewellers(id) ON DELETE CASCADE,
  manufacturer_id uuid REFERENCES manufacturers(id),
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,           -- bcrypt
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

#### `b2b_orders`
Store orders to manufacturer. Completely separate from customer `orders` table.

```sql
CREATE TABLE b2b_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id),
  jeweller_id      uuid NOT NULL REFERENCES jewellers(id),  -- denormalized for easy querying
  manufacturer_id  uuid NOT NULL REFERENCES manufacturers(id),
  order_number     text NOT NULL UNIQUE,
  status           text DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  delivery_address text,                   -- store's delivery address captured at order time
  expected_by      date,                   -- store's preferred delivery date (informational)
  internal_ref     text,                   -- store's own PO/reference number
  notes            text,                   -- store's instructions to manufacturer
  tracking_number  text,                   -- filled by manufacturer when shipped
  total_items      integer DEFAULT 0,
  total_amount     numeric(12,2) DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
```

#### `b2b_order_items`
Line items of each B2B order.

```sql
CREATE TABLE b2b_order_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id            uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  manufacturer_product_id uuid NOT NULL REFERENCES manufacturer_products(id),
  quantity                integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot     numeric(12,2),   -- price at time of order
  product_name_snapshot   text,            -- name at time of order
  notes                   text,
  created_at              timestamptz DEFAULT now()
);
```

#### `b2b_order_status_history`
Audit trail for B2B order status changes (mirrors `order_status_history`).

```sql
CREATE TABLE b2b_order_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  status       text NOT NULL,
  note         text,
  created_at   timestamptz DEFAULT now()
);
```

### Existing Table Changes (ALTER, not recreate)

```sql
-- Link existing products to manufacturer source (nullable — null = jeweller's own upload)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_product_id uuid
    REFERENCES manufacturer_products(id) ON DELETE SET NULL;

-- Link existing jewellers to stores table (backfill after inserting stores rows)
-- No ALTER needed — stores.jeweller_id → jewellers.id is the FK direction
```

### Indexes

```sql
CREATE INDEX idx_manufacturer_products_status   ON manufacturer_products(status);
CREATE INDEX idx_manufacturer_products_category  ON manufacturer_products(category);
CREATE INDEX idx_b2b_orders_store_id             ON b2b_orders(store_id);
CREATE INDEX idx_b2b_orders_manufacturer_id      ON b2b_orders(manufacturer_id);
CREATE INDEX idx_b2b_orders_status               ON b2b_orders(status);
CREATE INDEX idx_b2b_order_items_order_id        ON b2b_order_items(b2b_order_id);
CREATE INDEX idx_stores_jeweller_id              ON stores(jeweller_id);
CREATE INDEX idx_stores_manufacturer_id          ON stores(manufacturer_id);
```

### RLS (enable on new tables, keep permissive for now — same as existing)

```sql
ALTER TABLE manufacturers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_product_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_product_tryon   ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_orders                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_status_history     ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (same as all existing tables)
-- App-level filtering is the primary isolation layer
```

### Seed Data (add to `supabase/seed.sql` or `run-migration.mjs`)

```sql
-- Demo manufacturer (password: "manufacturer123" — bcrypt hash)
INSERT INTO manufacturers (id, name, email, password_hash) VALUES
  ('10000000-0000-0000-0000-000000000001',
   'AT Plus Jewellers HQ',
   'admin@atplusjewellers.com',
   '$2b$10$PLACEHOLDER_HASH');   -- replace with real bcrypt hash at seed time

-- Demo store linked to the existing demo jeweller
INSERT INTO stores (id, jeweller_id, manufacturer_id, name, email, password_hash) VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000d3e1',   -- existing demo jeweller_id from seed.sql
   '10000000-0000-0000-0000-000000000001',
   'Aurum Heritage Store',
   'store@aurumheritage.com',
   '$2b$10$PLACEHOLDER_HASH');   -- replace with real bcrypt hash at seed time
```

---

## Phase B2 — New DB Helpers

**All new files in `packages/db/src/`**

### `packages/db/src/manufacturers.ts` (NEW FILE)

Functions needed:
- `getManufacturerByEmail(email)` → for login
- `getManufacturerById(id)` → for session verification
- `listManufacturerProducts(manufacturerId, filters?)` → paginated product list
- `getManufacturerProduct(manufacturerId, productId)` → single design
- `createManufacturerProduct(manufacturerId, data)` → add design
- `updateManufacturerProduct(manufacturerId, productId, data)` → edit design
- `archiveManufacturerProduct(manufacturerId, productId)` → set status=archived
- `addManufacturerProductImage(productId, data)` → add image
- `removeManufacturerProductImage(productId, publicId)` → delete image
- `addManufacturerProductTryon(productId, data)` → add AR asset
- `listManufacturerStores(manufacturerId)` → all stores under this manufacturer
- `createStore(manufacturerId, data)` → register a new store
- `updateStoreStatus(manufacturerId, storeId, isActive)` → activate/deactivate store

Pattern: Same as existing `packages/db/src/products.ts` — every function takes `manufacturerId` as first arg, every query includes `.eq('manufacturer_id', manufacturerId)`.

### `packages/db/src/stores.ts` (NEW FILE)

Functions needed:
- `getStoreByEmail(email)` → for store login
- `getStoreById(storeId)` → for session verification
- `getStoreByJewellerId(jewellerId)` → resolve store from jeweller_id
- `getStoreJewellerId(storeId)` → get jeweller_id for a store (used in middleware)

### `packages/db/src/b2b.ts` (NEW FILE)

Functions needed:
- `createB2BOrder(storeId, jewellerId, manufacturerId, items, notes?)` → place order
- `listStoreB2BOrders(jewellerId, filters?)` → store's own orders
- `listManufacturerB2BOrders(manufacturerId, filters?)` → all orders for manufacturer
- `getB2BOrder(orderId)` → single order with items
- `updateB2BOrderStatus(manufacturerId, orderId, status, note?)` → manufacturer updates status
- `cancelB2BOrder(jewellerId, orderId)` → store cancels pending order
- `fulfillB2BOrder(orderId)` → called when status → 'delivered'; creates products rows in store's inventory

#### `fulfillB2BOrder` logic (most important function):

```typescript
// When manufacturer marks B2B order as 'delivered':
// 1. Fetch all b2b_order_items for this order (with manufacturer_product details)
// 2. For each item × quantity:
//    a. INSERT into products (jeweller_id = order.jeweller_id)
//       - Copy: name, category, description, base_price as price_min/price_max
//       - Copy: weight_grams, metal, purity, occasion_tags, style_tags, gemstones
//       - Set: manufacturer_product_id = item.manufacturer_product_id
//       - Set: stock_count = item.quantity
//       - Generate: slug from name + random suffix (ensure uniqueness)
//    b. INSERT into product_images from manufacturer_product_images
//       - Same cloudinary URLs (cross-reference, no re-upload needed initially)
//    c. INSERT into product_tryon_assets from manufacturer_product_tryon
// 3. Trigger embedding for each new product (async, fire-and-forget)
//    POST /api/embeddings/product/:id for each new product UUID
// 4. Record status change in b2b_order_status_history
```

### `packages/db/src/index.ts` — EXISTING FILE, add exports

Add at end of file:
```typescript
// B2B platform
export * from './manufacturers';
export * from './stores';
export * from './b2b';
```

---

## Phase B3 — Manufacturer Cookie Auth

**File to modify:** `packages/tenant/src/index.ts`

### What to add (do NOT touch existing PIN cookie code)

```typescript
// New cookie name
export const MANUFACTURER_COOKIE_NAME = 'lm_manufacturer';
export const STORE_COOKIE_NAME = 'lm_store';

// Manufacturer cookie payload
export type ManufacturerCookiePayload = {
  manufacturerId: string;
  email: string;
};

// Store cookie payload
export type StoreCookiePayload = {
  storeId: string;
  jewellerId: string;   // ← this is the key — resolves tenancy per-request
  email: string;
};

// Issue manufacturer cookie (same HMAC-SHA256 pattern as PIN cookie)
export async function issueManufacturerCookie(
  payload: ManufacturerCookiePayload,
  secret: string
): Promise<string>

// Verify manufacturer cookie
export async function verifyManufacturerCookie(
  cookie: string | undefined,
  secret: string
): Promise<{ valid: true; payload: ManufacturerCookiePayload } | { valid: false }>

// Issue store cookie
export async function issueStoreCookie(
  payload: StoreCookiePayload,
  secret: string
): Promise<string>

// Verify store cookie — returns jewellerId for per-request tenancy
export async function verifyStoreCookie(
  cookie: string | undefined,
  secret: string
): Promise<{ valid: true; payload: StoreCookiePayload } | { valid: false }>
```

**Implementation:** Copy the pattern of `issuePinCookie` / `verifyPinCookie` exactly.
Format: `base64(JSON.stringify(payload)).hmacSig` — same as current PIN cookie.
TTL: Manufacturer = 8h, Store = 8h (configurable via env in Phase B4).

**New env vars to add in `packages/config/src/index.ts`:**
```typescript
MANUFACTURER_COOKIE_SECRET: z.string().min(32),   // separate secret for manufacturer
LM_STORE_COOKIE_TTL_SECONDS: z.coerce.number().default(28800),  // 8h
LM_MANUFACTURER_COOKIE_TTL_SECONDS: z.coerce.number().default(28800),
```

---

## Phase B4 — Config: Make SHOP_JEWELLER_ID Optional

**File to modify:** `packages/config/src/index.ts`

### Change

```typescript
// BEFORE (line ~5):
SHOP_JEWELLER_ID: z.string().uuid(),

// AFTER:
SHOP_JEWELLER_ID: z.string().uuid().optional(),
```

### Impact

- `getShopJewellerId()` in `packages/tenant/src/index.ts` currently throws if missing.
- After this change: it returns `undefined` instead of throwing (update the function signature too).
- All call sites that do `const id = getShopJewellerId()` will still compile — but routes that need a jeweller_id must now handle `undefined`.
- **During B1–B9:** Every jeweller route still needs a jeweller_id. The existing device-mode path (`SHOP_JEWELLER_ID` set) covers all existing routes. New B2B routes will use the store cookie path.
- **B10** is when all routes are migrated to cookie-first resolution.

### Files to update after this change

| File | Change |
|------|--------|
| `packages/tenant/src/index.ts` | `getShopJewellerId()` returns `string \| undefined` |
| `tests/setup-env.ts` | Keep `SHOP_JEWELLER_ID` in test env (tests stay in device mode) |
| `scripts/check-env.ts` | Mark as optional in check output |
| `render.yaml` | Add comment: `# optional in B2B mode` |
| `.env.production.example` | Add note: `# Leave unset for B2B multi-store deployment` |

---

## Phase B5 — Middleware: Add Manufacturer Route Guard

**File to modify:** `apps/web/middleware.ts`

### Current (lines 1–37)

Protects only `/jeweller/:path*` with PIN cookie.

### What to add

```typescript
// Add manufacturer route protection
// Pattern: identical to jeweller/PIN guard but checks lm_manufacturer cookie

// New public paths (no redirect):
const PUBLIC_PATHS = [
  '/jeweller/unlock',
  '/manufacturer/login',   // ← ADD
];

// New protected path group:
// /manufacturer/:path* → verify lm_manufacturer cookie
//   If invalid → redirect to /manufacturer/login?next=...
```

**Middleware matcher update:**
```typescript
// BEFORE:
export const config = { matcher: ['/jeweller/:path*'] };

// AFTER:
export const config = { matcher: ['/jeweller/:path*', '/manufacturer/:path*'] };
```

**File to modify:** `apps/web/lib/api/middleware.ts` — add `manufacturerGuard` and `storeGuard`:

```typescript
// manufacturerGuard: verifies lm_manufacturer cookie (for /api/manufacturer/* routes)
export const manufacturerGuard: MiddlewareHandler = async (c, next) => {
  const env = getServerEnv();
  const cookie = getCookie(c, MANUFACTURER_COOKIE_NAME);
  const result = await verifyManufacturerCookie(cookie, env.MANUFACTURER_COOKIE_SECRET);
  if (!result.valid) {
    return sendError(c, 'unauthorized', 'Manufacturer login required', 401);
  }
  c.set('manufacturerId', result.payload.manufacturerId);
  await next();
};

// storeGuard: verifies lm_store cookie (for /api/store/* routes in B2B mode)
// Also sets shopJewellerId from the store cookie payload (per-request tenancy)
export const storeGuard: MiddlewareHandler = async (c, next) => {
  const env = getServerEnv();
  const cookie = getCookie(c, STORE_COOKIE_NAME);
  const result = await verifyStoreCookie(cookie, env.LM_PIN_COOKIE_SECRET);
  if (!result.valid) {
    return sendError(c, 'unauthorized', 'Store login required', 401);
  }
  // This is where dynamic tenancy resolution happens:
  c.set('shopJewellerId', result.payload.jewellerId);
  c.set('storeId', result.payload.storeId);
  await next();
};
```

**Hono context type update** in `apps/web/app/api/[[...route]]/route.ts`:
```typescript
// BEFORE:
type Vars = { Variables: { shopJewellerId: string } }

// AFTER:
type Vars = {
  Variables: {
    shopJewellerId: string;
    manufacturerId?: string;
    storeId?: string;
  }
}
```

---

## Phase B6 — API Routes: Manufacturer & Store Endpoints

### New file: `apps/web/lib/api/manufacturer.ts`

All routes manufacturer-gated via `manufacturerGuard`.

```
# Auth
POST   /login                     → bcrypt verify → issue lm_manufacturer cookie
POST   /logout                    → clear lm_manufacturer cookie
GET    /me                        → return manufacturer info

# Catalog management
GET    /catalog                   → list manufacturer_products (with filters: category, status, search)
POST   /catalog                   → create manufacturer_product
GET    /catalog/:id               → single product with images + tryon assets
PATCH  /catalog/:id               → update product
DELETE /catalog/:id               → archive product (soft delete, status=archived)

# Images (Cloudinary upload flow)
POST   /catalog/:id/images/sign   → signed Cloudinary upload params (folder: luxematch/manufacturer/:id/catalog/)
POST   /catalog/:id/images        → save image URL after Cloudinary upload
DELETE /catalog/:id/images/:imageId → remove image

# Try-on assets
POST   /catalog/:id/tryon/sign    → signed Cloudinary upload (folder: luxematch/manufacturer/:id/catalog-tryon/)
POST   /catalog/:id/tryon         → save tryon asset
DELETE /catalog/:id/tryon/:tryonId

# B2B order management (manufacturer receives orders from stores)
GET    /b2b-orders                → all stores' orders (filterable: status, store, date)
GET    /b2b-orders/:id            → single order with items + store info
PATCH  /b2b-orders/:id            → update status (confirmed/packed/shipped/delivered/cancelled)
                                    → when status=delivered: trigger fulfillB2BOrder()

# Store management
GET    /stores                    → list all registered stores
POST   /stores                    → create new store account (generates credentials)
PATCH  /stores/:id                → update store (activate/deactivate, update info)
GET    /stores/:id/orders         → order history for a specific store
```

### New file: `apps/web/lib/api/store.ts`

Store-authenticated routes (B2B side only — existing jeweller PIN routes unchanged).

```
# Auth
POST   /login                     → bcrypt verify → issue lm_store cookie (contains jewellerId)
POST   /logout                    → clear lm_store cookie
GET    /me                        → return store info + jeweller info

# Browse manufacturer catalog (read-only)
GET    /catalog                   → list active manufacturer_products (no jeweller_id filter — global)
GET    /catalog/:id               → single design with images + tryon

# Place and track B2B orders
GET    /b2b-orders                → this store's orders only (filtered by jeweller_id)
POST   /b2b-orders                → place new B2B order (items array)
GET    /b2b-orders/:id            → single order detail
DELETE /b2b-orders/:id            → cancel order (only if status=pending)
```

### Mount in `apps/web/app/api/[[...route]]/route.ts`

```typescript
// Add these two lines after existing route mounts:
app.route('/manufacturer', manufacturerRoutes);
app.route('/store', storeRoutes);
```

### B2B Cart (store-side, session-based)

The store's "B2B cart" (designs they want to order) is NOT stored in the database — it lives in `sessionStorage` on the browser (same kiosk pattern as customer saved/compare). When the store submits, it creates a `b2b_order` row. This avoids a new cart table and keeps the store-ordering flow simple.

Frontend hook: `apps/web/hooks/use-b2b-cart.ts` (new file):
```typescript
// Wraps sessionStorage key 'luxematch_b2b_cart'
// Items: { manufacturerProductId, name, quantity, unitPrice, imageUrl }[]
export function useB2BCart()
```

---

## Phase B7 — Manufacturer Portal UI

**New directory:** `apps/web/app/manufacturer/`

Modelled on the Catalog app's admin experience — sidebar nav, category grid, product cards, modal for add/edit. Same pearl/gold/velvet design system as the jeweller dashboard. No wizards, no complex multi-step flows.

### Pages to create

| File | Route | What it shows |
|------|-------|---------------|
| `login/page.tsx` | `/manufacturer/login` | Email + password login |
| `layout.tsx` | wraps all `/manufacturer/*` | Sidebar nav + header with logout |
| `dashboard/page.tsx` | `/manufacturer/dashboard` | Summary cards: total designs, pending orders, active stores |
| `catalog/page.tsx` | `/manufacturer/catalog` | Category grid → click category → product cards (two-level browse, same as Catalog app) |
| `catalog/new/page.tsx` | `/manufacturer/catalog/new` | Add design form |
| `catalog/[id]/page.tsx` | `/manufacturer/catalog/:id` | Edit design form (pre-filled) |
| `orders/page.tsx` | `/manufacturer/orders` | All B2B orders from stores (table/card list) |
| `orders/[id]/page.tsx` | `/manufacturer/orders/:id` | Order detail + status action buttons |
| `stores/page.tsx` | `/manufacturer/stores` | Store list + Add Store modal |

### Sidebar nav

```typescript
const manufacturerNavItems = [
  { label: 'Dashboard', href: '/manufacturer/dashboard', icon: LayoutDashboard },
  { label: 'Catalog',   href: '/manufacturer/catalog',   icon: Package },
  { label: 'Orders',    href: '/manufacturer/orders',    icon: ShoppingBag },
  { label: 'Stores',    href: '/manufacturer/stores',    icon: Store },
];
```

---

### FORM SPEC A — Manufacturer Login (`/manufacturer/login`)

Centered card, same style as store login.

| Field | Type | Required |
|-------|------|----------|
| Email | `email` input | Yes |
| Password | `password` input (eye-toggle) | Yes |

Submit → `POST /api/manufacturer/login` → bcrypt verify → set `lm_manufacturer` cookie → redirect to `/manufacturer/dashboard`.
Error: "Invalid email or password."

---

### FORM SPEC B — Manufacturer Catalog (`/manufacturer/catalog`)

**Modelled on:** Catalog app's `CategoriesTab` + `CategoryProducts` flow.

**View 1 — Category grid (default):**
- Cards: category name + design count ("12 designs")
- Cover photo from first product in category (or placeholder if none)
- Clicking a card → View 2

**View 2 — Products inside a category:**
- Back button → category grid
- Product cards: photo, design name, weight (g), base price (₹), status badge (Draft / Active)
- "+ Add Design" button → `/manufacturer/catalog/new?category=<name>` (pre-selects category in form)
- Click a card → `/manufacturer/catalog/:id` (edit)

---

### FORM SPEC C — Manufacturer: Add / Edit Design

**Routes:** `/manufacturer/catalog/new` (add) and `/manufacturer/catalog/:id` (edit, form pre-filled)

**Modelled on:** Catalog app's `AddJewelleryModal` but as a full page. Single scrollable form, no wizard.

#### Fields (top to bottom)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Photo | File input (`image/*`) | Yes | Click to browse. Shows preview after selecting. Cloudinary signed upload. Folder: `luxematch/manufacturer/<manufacturerId>/catalog/`. Same pattern as existing jeweller product upload. |
| Design Name | `text` | Yes | Placeholder: "e.g. Lotus Jhumka Set" |
| Category | `select` dropdown | Yes | Options from `GET /api/categories` — shared list |
| Weight (g) | `number` | No | Placeholder: "e.g. 12.5" |
| Base Price (₹) | `number` | Yes | Wholesale reference price visible to stores |
| Description | `textarea` | No | 3–4 rows. Placeholder: "Design details, motif, occasion." |
| Min Order Qty | `number` | No | Default 1. Minimum pieces a store must order per B2B order. |
| Status | Toggle or radio | Yes | **Draft** (hidden from stores) or **Active** (visible). Default: Draft. |

**Buttons:**
- **Save** (primary) — saves with current status value
- **Cancel** — back to catalog (confirm dialog if form is dirty)

**Flow:**
```
New:  fill form → click Save → POST /api/manufacturer/catalog → redirect to catalog list, toast "Design added"
Edit: form pre-filled → change fields → click Save → PATCH /api/manufacturer/catalog/:id → toast "Saved"
```

> No multi-image support, no tag inputs, no AR try-on in v1 — one photo per design, same as Catalog app. Add these later when needed.

---

### FORM SPEC D — Manufacturer: Orders Page (`/manufacturer/orders`)

**Modelled on:** Catalog app's `BookingsTab`.

**Display:** Table (desktop) / card list (mobile). Columns: Order #, Store Name, Items, Total (₹), Date, Status badge, View button.

**Status badge colours:** pending=yellow, confirmed=blue, packed=purple, shipped=orange, delivered=green, cancelled=gray.

**Filters (top bar):** Status dropdown + Store name search.

**View button** → `/manufacturer/orders/:id`

---

### FORM SPEC E — Manufacturer: Order Detail (`/manufacturer/orders/:id`)

**Modelled on:** Catalog app's expandable booking row, but as a full page.

**Header:** Order #, Store name + email, Date placed, Status badge.

**Items table:**

| Photo (40×40) | Design Name | Qty | Unit Price (₹) | Line Total (₹) |
|---|---|---|---|---|

**Summary:** Total items, Total amount (₹). Delivery address + store notes shown below as read-only text.

**Status action buttons (bottom):**
- `pending` → "Confirm Order"
- `confirmed` → "Mark Packed"
- `packed` → "Mark Shipped" + Tracking Number text input (filled in here)
- `shipped` → "Mark Delivered" (triggers `fulfillB2BOrder()` → creates store inventory)
- Any non-cancelled status → "Cancel Order" (destructive, secondary)

Each button calls `PATCH /api/manufacturer/b2b-orders/:id` with `{ status }`.

---

### FORM SPEC F — Manufacturer: Create Store (`/manufacturer/stores`)

**Modelled on:** Catalog app's `AddUserModal` — modal, not a new page.

Page shows a table of existing stores (name, email, city, status). "+ Add Store" opens a modal:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Store Name | `text` | Yes | e.g. "Aurum Heritage - Connaught Place" |
| Email | `email` | Yes | Becomes store's login email |
| City | `text` | Yes | For display in order list |
| Phone | `tel` | No | 10-digit mobile |
| Password | `password` | Yes | min 8 chars. bcrypt on server. |
| Confirm Password | `password` | Yes | Client-side match check |
| Jeweller ID | `text` (UUID) | Yes | The existing `jewellers.id` this store maps to. Helper: "Find in the jeweller's LuxeMatch setup." |

Submit → `POST /api/manufacturer/stores` → modal closes, list refreshes, toast "Store created."

Active/Inactive toggle per row (same as Catalog app's user status toggle). No delete in v1.

---

### Cloudinary folder for manufacturer

Add to `packages/cloudinary/src/index.ts`:
```typescript
export function manufacturerFolder(manufacturerId: string) {
  return `luxematch/manufacturer/${manufacturerId}/catalog`;
}
```

---

## Phase B8 — Store Portal: B2B Catalog & Ordering

Two new pages inside the existing `/jeweller/` area, plus a standalone store login page. The store browsing experience is modelled on the Catalog app's user side: category grid → product grid → cart → confirm order.

### New pages to add

| File | Route | What it shows |
|------|-------|---------------|
| `apps/web/app/jeweller/manufacturer-catalog/page.tsx` | `/jeweller/manufacturer-catalog` | Browse manufacturer designs (category grid → product grid) + B2B cart |
| `apps/web/app/jeweller/b2b-orders/page.tsx` | `/jeweller/b2b-orders` | Store's own B2B order history |
| `apps/web/app/jeweller/b2b-orders/new/page.tsx` | `/jeweller/b2b-orders/new` | Review cart + delivery details + submit |
| `apps/web/app/jeweller/b2b-orders/[id]/page.tsx` | `/jeweller/b2b-orders/:id` | Read-only order detail + cancel if pending |
| `apps/web/app/store/login/page.tsx` | `/store/login` | Store email+password login |

### Jeweller nav update — `apps/web/components/layout/JewellerLayout.tsx`

```typescript
{ label: 'Manufacturer Catalog', href: '/jeweller/manufacturer-catalog', icon: Gem },
{ label: 'B2B Orders',           href: '/jeweller/b2b-orders',           icon: Truck },
```

---

### FORM SPEC G — Store: Browse Manufacturer Catalog (`/jeweller/manufacturer-catalog`)

**Modelled on:** Catalog app's `UserDashboard` — category cards first, then product grid.

**View 1 — Category grid:**
- Cards: category name + design count ("8 designs available")
- Click → View 2

**View 2 — Product grid (inside a category):**
- Back button
- Each card: product photo, design name, weight (g), base price (₹)
- **Cart icon button** on each card (same as Catalog app):
  - Click → adds to `luxematch_b2b_cart` in sessionStorage, success toast
  - If already in cart: highlighted (green border/background), click removes it
- Cart count badge in page header
- "View Cart" button in header → `/jeweller/b2b-orders/new`

**Filters (above grid — same as Catalog app):**
- Weight: min/max number inputs
- Sort: Weight low→high, Weight high→low, Name A→Z, Name Z→A

---

### FORM SPEC H — Store: Place B2B Order (`/jeweller/b2b-orders/new`)

**Modelled on:** Catalog app's Cart modal → Confirm Order flow, but as a full page (needs delivery address).

**Section 1 — Cart review:**

Table of items in `luxematch_b2b_cart`:

| Photo (40×40) | Design Name | Weight (g) | Qty (editable, min 1) | Unit Price (₹) | Line Total (₹) | × Remove |
|---|---|---|---|---|---|---|

Below: **Total Items** count, **Total Amount (₹)**.

If empty: "No designs in cart. Browse the catalog." with link.

**Section 2 — Delivery details:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Delivery Address | `textarea` | Yes | Where manufacturer should ship |
| Notes | `textarea` | No | Instructions: "Urgent", "Pack separately", etc. |

**Section 3 — Submit:**

- Summary line: "Placing order for X designs totalling ₹Y"
- **"Place Order"** (primary) → `POST /api/store/b2b-orders` → clears cart → redirect to `/jeweller/b2b-orders/:id` with success toast
- **"Cancel"** → confirm dialog ("Cart will be cleared") → back to catalog

**Order Detail page (`/jeweller/b2b-orders/:id`):**
- Order #, date, status badge (with timeline: pending→confirmed→packed→shipped→delivered)
- Items table (read-only), delivery address, notes
- **Cancel button** shown only if `status = 'pending'` → confirm → `DELETE /api/store/b2b-orders/:id`
- **Tracking number** shown when manufacturer fills it in (status = shipped)

---

### FORM SPEC I — Store: Login (`/store/login`)

**Modelled on:** Catalog app's `Login.jsx` — centered card, minimal.

| Field | Type | Required |
|-------|------|----------|
| Email | `email` | Yes |
| Password | `password` (eye-toggle) | Yes |

Submit → `POST /api/store/login` → bcrypt verify → set `lm_store` cookie (contains `storeId` + `jewellerId`) → redirect to `/jeweller/dashboard`.
Error: "Invalid email or password."

Middleware logic (`apps/web/middleware.ts`):
- `SHOP_JEWELLER_ID` set in env AND `lm_pin` valid → device mode (existing, unchanged)
- `SHOP_JEWELLER_ID` NOT set AND `lm_store` valid → B2B mode
- Neither → redirect to appropriate login

---

## Phase B9 — B2B Order Fulfillment → Auto Inventory

**File to modify:** `packages/db/src/b2b.ts` (new file from B2)

When manufacturer marks a B2B order as `delivered`, `fulfillB2BOrder` runs:

```typescript
export async function fulfillB2BOrder(supabase: SupabaseClient, orderId: string): Promise<string[]> {
  // Returns array of new product UUIDs created in the store's inventory

  // 1. Get order + items + manufacturer_product details
  const order = await getB2BOrderWithItems(supabase, orderId);

  // 2. For each line item
  const newProductIds: string[] = [];
  for (const item of order.items) {
    const mProduct = item.manufacturer_product;

    // 3. Create product in store's jeweller inventory
    const { data: newProduct } = await supabase
      .from('products')
      .insert({
        jeweller_id:               order.jeweller_id,
        manufacturer_product_id:   item.manufacturer_product_id,
        name:                      mProduct.name,
        slug:                      generateSlug(mProduct.name),  // unique per jeweller
        category:                  mProduct.category,
        description:               mProduct.description,
        price_min:                 mProduct.base_price,
        price_max:                 mProduct.base_price,
        weight_grams:              mProduct.weight_grams,
        metal:                     mProduct.metal,
        purity:                    mProduct.purity,
        occasion_tags:             mProduct.occasion_tags,
        style_tags:                mProduct.style_tags,
        gemstones:                 mProduct.gemstones,
        stock_count:               item.quantity,
      })
      .select('id')
      .single();

    // 4. Copy images
    const images = await getManufacturerProductImages(supabase, item.manufacturer_product_id);
    for (const img of images) {
      await supabase.from('product_images').insert({
        product_id:           newProduct.id,
        cloudinary_public_id: img.cloudinary_public_id,
        url:                  img.secure_url,
        is_primary:           img.is_primary,
        sort_order:           img.sort_order,
      });
    }

    // 5. Copy try-on assets
    const tryons = await getManufacturerProductTryon(supabase, item.manufacturer_product_id);
    for (const tryon of tryons) {
      await supabase.from('product_tryon_assets').insert({
        product_id:       newProduct.id,
        asset_url:        tryon.asset_url,
        jewellery_type:   tryon.jewellery_type,
        pivot_x:          tryon.pivot_x,
        pivot_y:          tryon.pivot_y,
        scale_multiplier: tryon.scale_multiplier,
      });
    }

    newProductIds.push(newProduct.id);
  }

  // 6. Record status change
  await supabase.from('b2b_order_status_history').insert({
    b2b_order_id: orderId,
    status: 'delivered',
    note: `Auto-created ${newProductIds.length} products in store inventory`,
  });

  return newProductIds;
  // Caller (API route) then triggers Qdrant indexing for each newProductId (async)
}
```

**Triggering Qdrant indexing after fulfillment:**

In the `PATCH /api/manufacturer/b2b-orders/:id` route, when status becomes `delivered`:
```typescript
const newProductIds = await fulfillB2BOrder(supabase, orderId);
// Fire-and-forget: index each new product into Qdrant
newProductIds.forEach(productId => {
  fetch(`/api/embeddings/product/${productId}`, { method: 'POST' })
    .catch(() => {}); // non-blocking, no error handling needed
});
```

---

## Phase B10 — Tenancy Refactor (Do Last)

**Risk: HIGH. Do after B1–B9 are deployed and tested.**

Currently: `getShopJewellerId()` reads env var → every API route uses it.
After B10: jeweller_id resolved from `lm_store` cookie per-request (env var becomes optional fallback).

### New helper in `packages/tenant/src/index.ts`

```typescript
/**
 * Resolves jeweller_id for the current request.
 * Priority:
 *   1. lm_store cookie (B2B mode) — set by storeGuard middleware
 *   2. SHOP_JEWELLER_ID env var (device mode) — backward compat
 *   3. throws — no tenancy context
 */
export function getRequestJewellerId(c: HonoContext): string {
  // Already set by storeGuard or tenantMiddleware
  const fromCtx = c.get('shopJewellerId');
  if (fromCtx) return fromCtx;

  // Fallback: env (device mode)
  const fromEnv = getShopJewellerId(); // now returns string | undefined
  if (fromEnv) return fromEnv;

  throw new Error('No jeweller_id in request context or env');
}
```

### Migration strategy (route by route, not all at once)

For each route handler in `apps/web/lib/api/`:
1. Replace `const jewellerId = getShopJewellerId();`
2. With `const jewellerId = getRequestJewellerId(c);`
3. Run `pnpm test` after each file — all existing tests must stay green.

### Files to migrate (all routes that call getShopJewellerId)

Based on codebase audit — these are in `apps/web/lib/api/`:
- `shop.ts`
- `catalog.ts`
- `jeweller-orders.ts`
- `intelligence.ts`
- `analytics.ts`
- `search.ts`
- `embeddings.ts`
- `tryon-assets.ts`
- `cloudinary.ts`
- `customer.ts` (uses shopJewellerId for customer scoping)

### Scripts (keep env-var based — no change needed)
`reindex`, `seed-intelligence`, `seasonal-rollup`, `check-env`, `smoke-test` all use env vars directly — fine, they're run on a specific jeweller's machine.

---

## Files: Complete Change Map

### New Files (create from scratch)

| File | Phase | Purpose |
|------|-------|---------|
| `supabase/migrations/0005_b2b_platform.sql` | B1 | DB schema for all new tables |
| `packages/db/src/manufacturers.ts` | B2 | Manufacturer CRUD helpers |
| `packages/db/src/stores.ts` | B2 | Store auth helpers |
| `packages/db/src/b2b.ts` | B2 | B2B order helpers + fulfillment |
| `apps/web/lib/api/manufacturer.ts` | B6 | All /api/manufacturer/* routes |
| `apps/web/lib/api/store.ts` | B6 | All /api/store/* routes |
| `apps/web/hooks/use-b2b-cart.ts` | B6 | sessionStorage B2B cart for store |
| `apps/web/app/manufacturer/layout.tsx` | B7 | Manufacturer portal sidebar layout |
| `apps/web/app/manufacturer/login/page.tsx` | B7 | Manufacturer email+password login form |
| `apps/web/app/manufacturer/dashboard/page.tsx` | B7 | Manufacturer overview stats |
| `apps/web/app/manufacturer/catalog/page.tsx` | B7 | Design catalog grid + filters |
| `apps/web/app/manufacturer/catalog/new/page.tsx` | B7 | Add design form (Form Spec C) — photo + name + category + weight + price + description + status |
| `apps/web/app/manufacturer/catalog/[id]/page.tsx` | B7 | Edit design form (same fields, pre-filled) |
| `apps/web/app/manufacturer/orders/page.tsx` | B7 | B2B orders table from all stores (Form Spec D) |
| `apps/web/app/manufacturer/orders/[id]/page.tsx` | B7 | Order detail + status action buttons + tracking input (Form Spec E) |
| `apps/web/app/manufacturer/stores/page.tsx` | B7 | Store list + Add Store modal (Form Spec F) |
| `apps/web/app/jeweller/manufacturer-catalog/page.tsx` | B8 | Category grid → product grid → cart button on each card (Form Spec G) |
| `apps/web/app/jeweller/b2b-orders/page.tsx` | B8 | Store's B2B order history list |
| `apps/web/app/jeweller/b2b-orders/new/page.tsx` | B8 | Cart review + delivery address + submit (Form Spec H) |
| `apps/web/app/jeweller/b2b-orders/[id]/page.tsx` | B8 | Read-only order detail + cancel button |
| `apps/web/app/store/login/page.tsx` | B8 | Store email+password login (Form Spec I) |

### Existing Files — Specific Changes

| File | Phase | What changes | Lines affected |
|------|-------|-------------|----------------|
| `packages/tenant/src/index.ts` | B3 | Add `issueStoreCookie`, `verifyStoreCookie`, `issueManufacturerCookie`, `verifyManufacturerCookie`, `MANUFACTURER_COOKIE_NAME`, `STORE_COOKIE_NAME` | Add ~80 lines at end |
| `packages/tenant/src/index.ts` | B4 | `getShopJewellerId()` returns `string \| undefined` | Lines 30–39 |
| `packages/tenant/src/index.ts` | B10 | Add `getRequestJewellerId(c)` | Add ~15 lines |
| `packages/config/src/index.ts` | B3 | Add `MANUFACTURER_COOKIE_SECRET`, `LM_STORE_COOKIE_TTL_SECONDS`, `LM_MANUFACTURER_COOKIE_TTL_SECONDS` | Add 3 lines to ServerEnvSchema |
| `packages/config/src/index.ts` | B4 | `SHOP_JEWELLER_ID` becomes `.optional()` | Line 5 |
| `packages/db/src/index.ts` | B2 | Add exports for manufacturers, stores, b2b | Add 3 lines at end |
| `packages/cloudinary/src/index.ts` | B7 | Add `MANUFACTURER_BUCKETS`, `manufacturerFolder()` | Add ~15 lines |
| `apps/web/middleware.ts` | B5 | Extend matcher, add manufacturer route protection | Lines 10–37 |
| `apps/web/lib/api/middleware.ts` | B5 | Add `manufacturerGuard`, `storeGuard` | Add ~50 lines |
| `apps/web/app/api/[[...route]]/route.ts` | B6 | Mount `manufacturerRoutes` and `storeRoutes`, extend Vars type | Add 4 lines |
| `apps/web/components/layout/JewellerLayout.tsx` | B8 | Add 2 items to `navItems` array | Lines 9–16 |
| `supabase/seed.sql` | B1 | Add demo manufacturer + store rows | Add ~20 lines at end |
| `.env.production.example` | B4 | Add new env vars, mark SHOP_JEWELLER_ID as optional | Add ~10 lines |
| `render.yaml` | B4 | Mark SHOP_JEWELLER_ID as optional comment | Add 1 comment line |

### Files That Do NOT Change

| File | Reason |
|------|--------|
| `packages/db/src/products.ts` | Already tenancy-safe (jeweller_id everywhere) |
| `packages/db/src/customers.ts` | Already tenancy-safe |
| `packages/db/src/ecommerce.ts` | Already tenancy-safe |
| `packages/ar-engine/**` | Math is correct, not touched |
| `apps/web/app/jeweller/unlock/page.tsx` | Device mode PIN unlock stays |
| `apps/web/app/jeweller/dashboard/page.tsx` | Works with updated API layer |
| `apps/web/app/jeweller/products/**` | Works unchanged |
| `apps/web/app/jeweller/orders/**` | Works unchanged |
| `apps/web/lib/customer-auth.ts` | Customer cookie flow unchanged |
| `apps/web/hooks/use-cart.ts` | Customer cart unchanged |
| `supabase/migrations/0001_init.sql` | Not modified — new migration is additive |
| `supabase/migrations/0002_ecommerce.sql` | Not modified |
| `packages/qdrant/**` | Jeweller-filtered search unchanged |
| `packages/embeddings/**` | Unchanged |
| `packages/intelligence/**` | Pure functions, unchanged |
| All customer-facing pages (`/catalog`, `/cart`, `/checkout`, `/orders`, `/account`) | Unchanged |

---

## Environment Variables

### New vars to add to `apps/web/.env.local` and `.env.production.example`

```bash
# ── B2B Platform ──────────────────────────────────────────────────────────────

# Manufacturer admin auth (separate secret from PIN cookie)
MANUFACTURER_COOKIE_SECRET=<min-32-chars-random-string>

# Store login session TTL (seconds) — default 8 hours
LM_STORE_COOKIE_TTL_SECONDS=28800

# Manufacturer session TTL (seconds) — default 8 hours
LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800

# ── Existing (no change) ──────────────────────────────────────────────────────
# SHOP_JEWELLER_ID is now OPTIONAL:
#   Set it   → device mode (current kiosk behavior, one store per deployment)
#   Leave it → B2B mode (store login resolves jeweller_id per-request)
SHOP_JEWELLER_ID=          # leave blank for B2B multi-store deployment
```

---

## Testing Checklist

Before starting B10 (tenancy refactor), verify these all pass:

```bash
# Existing tests must stay green throughout
pnpm test

# New tests to write (in tests/ directory):
# - manufacturer login → cookie issued
# - manufacturer cookie → manufacturerGuard passes
# - store login → cookie with jewellerId issued
# - storeGuard → sets shopJewellerId in context
# - fulfillB2BOrder → creates correct number of product rows
# - fulfillB2BOrder → product rows have correct jeweller_id
# - fulfillB2BOrder → product rows have manufacturer_product_id set
# - store cannot see another store's b2b_orders
# - manufacturer can see all stores' b2b_orders
```

---

## Build Order (Exact Sequence)

```
B1  → Write + apply 0005_b2b_platform.sql in Supabase SQL editor
      ↓
B2  → packages/db/src/{manufacturers,stores,b2b}.ts + update index.ts
      ↓
B3  → packages/tenant/src/index.ts: add store + manufacturer cookie functions
      ↓
B4  → packages/config/src/index.ts: add new env vars, make SHOP_JEWELLER_ID optional
      Update .env.local with new secrets
      ↓
B5  → apps/web/middleware.ts: extend matcher + manufacturer guard
      apps/web/lib/api/middleware.ts: add manufacturerGuard + storeGuard
      ↓
B6  → apps/web/lib/api/manufacturer.ts: all manufacturer API routes
      apps/web/lib/api/store.ts: all store API routes
      apps/web/app/api/[[...route]]/route.ts: mount both route files
      apps/web/hooks/use-b2b-cart.ts: sessionStorage cart
      ↓
B7  → apps/web/app/manufacturer/**  (all new pages)
      packages/cloudinary/src/index.ts: add manufacturer folders
      ↓
B8  → apps/web/app/jeweller/manufacturer-catalog/page.tsx
      apps/web/app/jeweller/b2b-orders/page.tsx
      apps/web/app/jeweller/b2b-orders/new/page.tsx
      apps/web/app/store/login/page.tsx
      apps/web/components/layout/JewellerLayout.tsx: add nav items
      ↓
B9  → Complete fulfillB2BOrder() in packages/db/src/b2b.ts
      Wire PATCH /api/manufacturer/b2b-orders/:id → call fulfillB2BOrder on delivered
      ↓
B10 → (LAST) Tenancy refactor: getRequestJewellerId(c) migration
      One API file at a time, pnpm test after each
```

---

## What This Delivers (vs Catalog App)

The entire B2B feature set is directly mapped from what the Catalog app already does — same flows, same simplicity, proper auth and tenancy on top.

| Catalog App | LuxeMatch B2B Equivalent | Form Spec | Phase |
|-------------|--------------------------|-----------|-------|
| Admin login (phone = password, plaintext) | Manufacturer login — email + bcrypt | A | B6+B7 |
| Category grid → product cards | `/manufacturer/catalog` two-level browse | B | B7 |
| Add product modal (name, category, photo, description) | Add design full page (+ weight, price, status, min qty) | C | B6+B7 |
| Bookings tab — all orders table | `/manufacturer/orders` — all B2B orders | D | B6+B7 |
| Expandable booking row with status | `/manufacturer/orders/:id` — status action buttons | E | B7 |
| Add User modal (name, phone, password, role) | Add Store modal (name, email, password, city, jewellerId) | F | B6+B7 |
| User login (phone+password) | Store login — email + bcrypt | I | B6+B8 |
| Category grid → product browse (user side) | `/jeweller/manufacturer-catalog` — same two-level browse | G | B8 |
| Cart icon on product card → cart modal | Cart button on design card → sessionStorage B2B cart | G | B8 |
| Confirm Order button → success modal | Place Order page → POST → order detail redirect | H | B8 |
| My Orders / bookings tab | `/jeweller/b2b-orders` order history | — | B8 |
| SMS notification on order | (deferred — Catalog used SMS; LuxeMatch can use email via existing nodemailer) | — | Later |
| localStorage (no real persistence) | Supabase Postgres | — | B1 |
| No tenancy (single admin) | jeweller_id isolates every store's data | — | B1+B10 |
| No real auth security | HMAC-signed cookies + bcrypt passwords | — | B3 |

---

## Complete Database Setup — Supabase

This section covers everything: creating the Supabase project, running all migrations in order, and seeding demo data. Do this once before writing any code.

---

### Step 1 — Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign in → **New Project**
2. Fill in:
   - **Name:** `luxematch-b2b` (or any name)
   - **Database Password:** generate a strong password and save it — you'll need it later
   - **Region:** pick closest to your users (e.g. `ap-south-1` for India)
3. Click **Create new project** — takes ~2 minutes to provision

4. Once ready, go to **Project Settings → API**. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> If you are **reusing the existing Supabase project** (`bpbsewxuyurpkjpdvqoy`): skip creating a new project. Just run the migrations below in the SQL editor. The existing keys in `.env.local` stay the same.

---

### Step 2 — Run All Migrations in Order

Go to **Supabase Dashboard → SQL Editor → New query**. Run each file below in exact order. Do not skip or reorder.

#### Migration 1: `supabase/migrations/0001_init.sql`
Core schema — jewellers, products, product_images, product_tryon_assets, categories, collections, tryon_events, product_views, product_sales, analytics_events, pin_audit_events, product_embeddings.

> If you're using the **existing** Supabase project, this is already applied. Skip.

#### Migration 2: `supabase/migrations/0002_ecommerce.sql`
E-commerce schema — branches, customers, customer_addresses, cart_items, orders, order_items, order_status_history.

> Already applied on the existing project. Skip.

#### Migration 3: `supabase/migrations/0003_security_advisor.sql`
RLS policy fixes and function `search_path` hardening.

> Already applied on the existing project. Skip.

#### Migration 4: `supabase/migrations/0004_customer_avatar.sql`
Adds `avatar_url` and `avatar_public_id` columns to `customers`.

> May or may not be applied. Check with: `SELECT column_name FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'avatar_url';` — if returns a row, already applied.

#### Migration 5: `supabase/migrations/0005_b2b_platform.sql` ← **NEW — must create and run this**

This is the file you create in Phase B1. Full SQL content:

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- 0005_b2b_platform.sql
-- B2B: manufacturers, manufacturer_products, manufacturer_product_images,
--      stores, b2b_orders, b2b_order_items, b2b_order_status_history
-- Apply after 0004_customer_avatar.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Manufacturers ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manufacturers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,          -- bcrypt
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 2. Manufacturer product catalog ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS manufacturer_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id uuid NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text,                 -- matches shared categories
  description     text,
  weight_grams    numeric(8,3),
  base_price      numeric(12,2) NOT NULL,
  min_order_qty   integer DEFAULT 1 CHECK (min_order_qty >= 1),
  status          text DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 3. Design images (one per design in v1 — extend to multi later) ──────────
CREATE TABLE IF NOT EXISTS manufacturer_product_images (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid NOT NULL REFERENCES manufacturer_products(id) ON DELETE CASCADE,
  cloudinary_public_id text NOT NULL,
  secure_url           text NOT NULL,
  is_primary           boolean DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

-- ── 4. Stores ─────────────────────────────────────────────────────────────────
-- One row per registered retail store. Links to the existing jewellers table.
CREATE TABLE IF NOT EXISTS stores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id     uuid UNIQUE REFERENCES jewellers(id) ON DELETE CASCADE,
  manufacturer_id uuid REFERENCES manufacturers(id),
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  password_hash   text NOT NULL,        -- bcrypt
  city            text,
  phone           text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── 5. B2B orders (store → manufacturer) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id),
  jeweller_id      uuid NOT NULL REFERENCES jewellers(id),
  manufacturer_id  uuid NOT NULL REFERENCES manufacturers(id),
  order_number     text NOT NULL UNIQUE,  -- e.g. B2B-20240601-0001
  status           text DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  delivery_address text NOT NULL,
  notes            text,
  tracking_number  text,
  total_items      integer DEFAULT 0,
  total_amount     numeric(12,2) DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── 6. B2B order line items ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_order_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id            uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  manufacturer_product_id uuid NOT NULL REFERENCES manufacturer_products(id),
  quantity                integer NOT NULL CHECK (quantity > 0),
  unit_price_snapshot     numeric(12,2),   -- base_price at time of order
  product_name_snapshot   text,            -- name at time of order
  created_at              timestamptz DEFAULT now()
);

-- ── 7. B2B order status history (audit trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS b2b_order_status_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  b2b_order_id uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  status       text NOT NULL,
  note         text,
  created_at   timestamptz DEFAULT now()
);

-- ── 8. Link existing products to their manufacturer source ───────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS manufacturer_product_id uuid
    REFERENCES manufacturer_products(id) ON DELETE SET NULL;

-- ── 9. Add city + phone to stores (already in CREATE above, here for safety) ─
-- (no-op if column already exists)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city  text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS phone text;

-- ── 10. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_manufacturer_products_status
  ON manufacturer_products(status);
CREATE INDEX IF NOT EXISTS idx_manufacturer_products_category
  ON manufacturer_products(category);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_store_id
  ON b2b_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_manufacturer_id
  ON b2b_orders(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_status
  ON b2b_orders(status);
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order_id
  ON b2b_order_items(b2b_order_id);
CREATE INDEX IF NOT EXISTS idx_stores_jeweller_id
  ON stores(jeweller_id);
CREATE INDEX IF NOT EXISTS idx_manufacturer_product_images_product_id
  ON manufacturer_product_images(product_id);

-- ── 11. RLS (enable; service role bypasses — app-level filtering is isolation) ─
ALTER TABLE manufacturers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_status_history    ENABLE ROW LEVEL SECURITY;

-- Service role full access (same pattern as existing tables)
CREATE POLICY "service role all manufacturers"
  ON manufacturers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all manufacturer_products"
  ON manufacturer_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all manufacturer_product_images"
  ON manufacturer_product_images FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all stores"
  ON stores FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_orders"
  ON b2b_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_order_items"
  ON b2b_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all b2b_order_status_history"
  ON b2b_order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
```

To run: copy the entire block above → paste into **Supabase SQL Editor → New query** → click **Run**.

---

### Step 3 — Seed Demo Data

After running `0005_b2b_platform.sql`, insert demo rows so you can log in and test immediately.

**Option A — via Supabase SQL editor** (paste and run):

```sql
-- Demo manufacturer
-- Password is "manufacturer123" — replace password_hash with real bcrypt output
-- Generate bcrypt hash: node -e "const b=require('bcryptjs');b.hash('manufacturer123',10).then(console.log)"
INSERT INTO manufacturers (id, name, email, password_hash, is_active)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'AT Plus Jewellers HQ',
  'admin@atplusjewellers.com',
  '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH',
  true
) ON CONFLICT (email) DO NOTHING;

-- Demo store linked to the existing demo jeweller
-- Password is "store123" — replace hash similarly
INSERT INTO stores (id, jeweller_id, manufacturer_id, name, email, password_hash, city, is_active)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-00000000d3e1',   -- existing demo jeweller from seed.sql
  '10000000-0000-0000-0000-000000000001',
  'Aurum Heritage Store',
  'store@aurumheritage.com',
  '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH',
  'New Delhi',
  true
) ON CONFLICT (email) DO NOTHING;

-- Demo design in the catalog
INSERT INTO manufacturer_products (id, manufacturer_id, name, category, description, weight_grams, base_price, min_order_qty, status)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Classic Gold Jhumka',
  'earring',
  'Traditional Indian jhumka, 22k gold, festive design',
  8.5,
  12500.00,
  1,
  'active'
) ON CONFLICT DO NOTHING;
```

**Option B — via `scripts/run-migration.mjs`** (env-loaded, same as existing seed):

Add the INSERT statements above to `scripts/run-migration.mjs`. The script already loads `.env.local` via `tsx --env-file`.

**Generating the bcrypt hash** (run this once in terminal before inserting):

```bash
node -e "const b=require('bcryptjs'); b.hash('manufacturer123',10).then(h=>console.log('manufacturer:',h)); b.hash('store123',10).then(h=>console.log('store:',h))"
```

If `bcryptjs` is not installed yet: `pnpm add -w bcryptjs` — it's needed for Phase B6 API routes anyway.

---

### Step 4 — Verify the Schema

After running migrations + seed, confirm everything is in place:

```sql
-- Should list all B2B tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'manufacturers', 'manufacturer_products', 'manufacturer_product_images',
    'stores', 'b2b_orders', 'b2b_order_items', 'b2b_order_status_history'
  )
ORDER BY table_name;

-- Should show 7 rows
```

```sql
-- Verify the demo manufacturer was inserted
SELECT id, name, email, is_active FROM manufacturers;

-- Verify the demo store and its jeweller_id link
SELECT s.id, s.name, s.email, s.jeweller_id, j.name AS jeweller_name
FROM stores s
LEFT JOIN jewellers j ON j.id = s.jeweller_id;
```

---

### Step 5 — Supabase Auth Settings (existing, keep unchanged)

The existing Supabase Auth (for end customers: OTP + email/password) is **not touched**. B2B auth (manufacturer + store) uses **custom bcrypt passwords stored in our own tables**, NOT Supabase Auth — so no Supabase Auth settings need to change for B2B.

Keep existing settings:
- Email confirmations: enabled (for customer sign-up OTP)
- SMTP: custom Gmail App Password (dev) or Resend/Brevo (prod)
- Site URL: `http://localhost:3000` (dev) / your Render URL (prod)

---

## Full .env.local for B2B System

Below is the **complete** `.env.local` file for the B2B system. Start from the current values and add the new B2B variables.

```bash
# ══════════════════════════════════════════════════════════════════════════════
# apps/web/.env.local — LuxeMatch B2B Platform
# ══════════════════════════════════════════════════════════════════════════════

# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://bpbsewxuyurpkjpdvqoy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_uH1fT6oi7fcShc_Kv6_RnA_ymoWENz9
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwYnNld3h1eXVycGtqcGR2cW95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwMzU1NiwiZXhwIjoyMDk1Mjc5NTU2fQ.xe6-ZMnDnbeEpjf7Wq8vkmYCGYYdLcVxH3KSGk6IB_k

# ── Cloudinary ────────────────────────────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=dyrc4bo4m
CLOUDINARY_API_KEY=779426214832782
CLOUDINARY_API_SECRET=OCG8_QxqrJ6wUTck4Dhm_L7WA_M
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dyrc4bo4m
# Manufacturer designs upload to: luxematch/manufacturer/<manufacturerId>/catalog/
# Jeweller products stay at:       luxematch/<jewellerId>/products/

# ── Qdrant (vector search) ────────────────────────────────────────────────────
QDRANT_URL=https://e6fff43d-09ee-4f26-bf4d-cef8af87f057.us-west-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6ZDk2NTg3MzYtNzhlMi00ZGM0LWE5ZDctYjZiN2EwMjM4MzZmIn0.6dmbwyx1GqtMtsxUCY1E_59W80fA3mbeLdDVA0I5EA4
QDRANT_COLLECTION=luxematch_products

# ── Embedder (OpenCLIP — local only, not deployed) ───────────────────────────
EMBEDDER_URL=http://localhost:8001
EMBEDDER_API_KEY=
# Note: embedder is NOT deployed. Text search + style quiz are dead on the live site
# until you host the embedder. Visual search works via JEWELLERY_AI_URL below.

# ── Jewellery AI (HF Space — visual search proxy) ────────────────────────────
JEWELLERY_AI_URL=https://botivate2026-jewellery.hf.space

# ── Device mode (existing kiosk deployments) ──────────────────────────────────
# Set this to lock a deployment to one jeweller (device mode).
# Leave BLANK for B2B multi-store mode — jeweller_id resolved from lm_store cookie.
SHOP_JEWELLER_ID=00000000-0000-0000-0000-00000000d3e1
# ↑ Keep this for dev (demo jeweller). Remove or blank it when testing B2B multi-store mode.

# ── PIN auth (jeweller back-office — existing, unchanged) ─────────────────────
LM_PIN_COOKIE_SECRET=dev-secret-please-replace-with-32-bytes-of-entropy
LM_PIN_COOKIE_TTL_SECONDS=14400

# ── B2B: Manufacturer auth ────────────────────────────────────────────────────
# Must be at least 32 characters. Use a different value from LM_PIN_COOKIE_SECRET.
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
MANUFACTURER_COOKIE_SECRET=dev-manufacturer-secret-replace-with-32-bytes

# Manufacturer session duration (seconds). Default 8 hours = 28800.
LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800

# ── B2B: Store auth ───────────────────────────────────────────────────────────
# Store cookies are signed with LM_PIN_COOKIE_SECRET (same secret, different cookie name).
# No extra secret needed — the cookie name suffix 'lm_store' differentiates it.

# Store session duration (seconds). Default 8 hours = 28800.
LM_STORE_COOKIE_TTL_SECONDS=28800

# ── SMTP (customer order confirmation emails — optional in dev) ───────────────
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM="LuxeMatch <your@gmail.com>"
```

### What each new variable does

| Variable | Purpose | How to generate |
|----------|---------|----------------|
| `MANUFACTURER_COOKIE_SECRET` | Signs `lm_manufacturer` HMAC cookie — must stay secret | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `LM_MANUFACTURER_COOKIE_TTL_SECONDS` | How long manufacturer stays logged in. 28800 = 8 hours | Set to any integer |
| `LM_STORE_COOKIE_TTL_SECONDS` | How long store staff stays logged in. 28800 = 8 hours | Set to any integer |
| `SHOP_JEWELLER_ID` | **Now optional.** Set = device mode (one store). Blank = B2B mode (multi-store) | Leave as-is for dev; blank for B2B testing |

### Variables that do NOT change from current

| Variable | Status |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project — unchanged |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Unchanged |
| `SUPABASE_SERVICE_ROLE_KEY` | Unchanged |
| `CLOUDINARY_*` | Same Cloudinary account — manufacturer uploads go to a new folder path, same credentials |
| `QDRANT_*` | Same collection — B2B fulfilled products get indexed into it |
| `LM_PIN_COOKIE_SECRET` | Unchanged — store cookie reuses this secret |
| `LM_PIN_COOKIE_TTL_SECONDS` | Unchanged |
| `EMBEDDER_URL` / `JEWELLERY_AI_URL` | Unchanged |

---

## System Setup Checklist (Do Before Writing Code)

```
□ 1. Supabase project ready (existing or new)
     └─ Copy URL + anon key + service_role key into .env.local

□ 2. Run migrations in Supabase SQL editor — in order:
     └─ 0001_init.sql          (skip if existing project)
     └─ 0002_ecommerce.sql     (skip if existing project)
     └─ 0003_security_advisor.sql  (skip if existing project)
     └─ 0004_customer_avatar.sql   (check if applied — see Step 2 above)
     └─ 0005_b2b_platform.sql  ← CREATE THIS FILE FIRST (Phase B1)

□ 3. Seed demo data
     └─ Generate bcrypt hashes for manufacturer + store passwords
     └─ Run seed SQL in Supabase SQL editor (or via run-migration.mjs)
     └─ Verify with SELECT queries (Step 4 above)

□ 4. Update .env.local
     └─ Add MANUFACTURER_COOKIE_SECRET (min 32 chars, different from PIN secret)
     └─ Add LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800
     └─ Add LM_STORE_COOKIE_TTL_SECONDS=28800
     └─ Keep SHOP_JEWELLER_ID set for dev (remove/blank for B2B mode testing)

□ 5. Install bcryptjs (needed for B6 API routes)
     └─ pnpm add bcryptjs
     └─ pnpm add -D @types/bcryptjs

□ 6. Verify existing system still works
     └─ pnpm dev → visit /jeweller/unlock → PIN 123456 → dashboard loads
     └─ pnpm test → all existing tests green

□ 7. Begin implementation at Phase B1
     └─ Create supabase/migrations/0005_b2b_platform.sql (SQL above)
     └─ Apply in Supabase SQL editor
     └─ Then proceed B2 → B3 → ... → B10
```

---

## Production .env (Render / Deploy)

When deploying to Render, set these environment variables in the Render dashboard (Settings → Environment):

```bash
# All existing vars stay — add these new ones:
MANUFACTURER_COOKIE_SECRET=<generate-fresh-32-byte-hex-for-prod>
LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800
LM_STORE_COOKIE_TTL_SECONDS=28800

# SHOP_JEWELLER_ID:
#   Keep it set → single-store kiosk deployment (current behaviour)
#   Remove it   → B2B multi-store deployment (store login determines jeweller)
SHOP_JEWELLER_ID=   # leave blank for B2B mode on prod
```

> **Security:** Generate a fresh `MANUFACTURER_COOKIE_SECRET` for production — never reuse the dev value. Also rotate `LM_PIN_COOKIE_SECRET` from the current dev placeholder before any real installs.

---

## Full System Architecture — How Everything Connects

This section covers the complete picture: all three actors, both Qdrant collections, Jewellery AI integration, try-on flow, and the ID linkage chain. Read this before starting any implementation phase.

---

### Three Systems, One Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  JEWELLERY AI (HF Space — botivate2026-jewellery.hf.space)              │
│  Collection: jewellery_search                                            │
│  Model: OpenCLIP ViT-B-32 / laion2b (512-d cosine)                     │
│  Payload: { filename, cloudinary_url, public_id, uploaded_at,           │
│             manufacturer_product_id }  ← NEW field to add               │
│  Point ID: SHA-256(cloudinary public_id) → integer                      │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ /search returns image_url + score
                     │ LuxeMatch looks up manufacturer_product_id
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LUXEMATCH (Next.js + Hono + Supabase)                                  │
│                                                                          │
│  Qdrant Collection A: luxematch_manufacturer_products  (GLOBAL)         │
│  Payload: { manufacturer_product_id UUID, manufacturer_id,              │
│             category, metal, purity, occasion_tags, style_tags }        │
│  Point ID: manufacturer_products.id (UUID string)                       │
│                                                                          │
│  Qdrant Collection B: luxematch_products  (TENANT-SCOPED)               │
│  Payload: { product_id UUID, jeweller_id, category_id,                  │
│             metal, occasion_tags, style_tags, has_tryon }               │
│  Point ID: products.id (UUID string)                                    │
│                                                                          │
│  Supabase Tables:                                                        │
│  manufacturer_products ──→ manufacturer_product_images                  │
│         │                  manufacturer_product_embeddings (tracking)   │
│         │                                                                │
│         └── (on B2B order delivered) ──→ products (jeweller-scoped)    │
│                                           product_images (copy)         │
│                                           product_tryon_assets (copy)   │
│                                           product_embeddings (tracking) │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### UUID Chain — How Every ID Links

```
manufacturer_products.id (UUID)
  │
  ├── manufacturer_product_images.product_id  (FK)
  ├── manufacturer_product_embeddings.product_id  (FK)
  │     └── qdrant_id = same UUID → point in luxematch_manufacturer_products
  ├── Jewellery AI payload: manufacturer_product_id = this UUID  ← bridge
  │
  └── (B2B order delivered) → products.manufacturer_product_id  (FK, nullable)
                                  │
                                  ├── products.id (NEW UUID, jeweller-scoped)
                                  ├── product_images.product_id  (FK, copied)
                                  ├── product_tryon_assets.product_id  (FK, copied)
                                  └── product_embeddings.product_id  (FK)
                                        └── qdrant_id = products.id UUID
                                              → point in luxematch_products
                                              → payload.jeweller_id = store's jeweller
```

---

### Categories & Designs — Same Across All Three Actors

All categories come from ONE shared `categories` table. Same slugs everywhere:

| Category slug | Manufacturer catalog | Store browse | Customer search | Try-on type |
|--------------|---------------------|--------------|-----------------|-------------|
| `earrings` | ✅ upload designs | ✅ browse & order | ✅ similar search | `earring_left` / `earring_right` |
| `necklaces` | ✅ | ✅ | ✅ | `necklace` |
| `rings` | ✅ | ✅ | ✅ | `ring_index` / `ring_middle` |
| `bangles` | ✅ | ✅ | ✅ | `bangle` |
| `pendants` | ✅ | ✅ | ✅ | (uses necklace AR) |
| `sets` | ✅ | ✅ | ✅ | — |

**Rule:** `manufacturer_products.category` must match `categories.slug`. Same list end customers see.

---

### Image Upload → Embedding → Search Flow (Full)

#### When Manufacturer uploads a design:

```
1. Admin fills form → selects photo → clicks Save
2. Frontend → GET /api/manufacturer/catalog/:id/images/sign
             ← signed Cloudinary upload params
3. Frontend → direct upload to Cloudinary
             ← { secure_url, public_id }
             Folder: luxematch/manufacturer/<manufacturerId>/catalog/
4. Frontend → POST /api/manufacturer/catalog/:id/images
             { cloudinary_public_id, secure_url }
             ← image saved to manufacturer_product_images
5. Server (async, fire-and-forget) → embed this design:
   a. Fetch image bytes from secure_url
   b. POST to JEWELLERY_AI_URL/add-image
      → Jewellery AI embeds via OpenCLIP → stores in jewellery_search
        Payload stored: { filename, cloudinary_url, public_id,
                          manufacturer_product_id: "<UUID>" }   ← BRIDGE KEY
   c. POST to /api/embeddings/manufacturer/:productId (new route)
      → fetch image → embedImage() via apps/embedder OR JEWELLERY_AI_URL/embed
      → upsertManufacturerProductVector() → luxematch_manufacturer_products
        Payload: { manufacturer_product_id, manufacturer_id,
                   category, metal, purity, occasion_tags, style_tags }
   d. INSERT into manufacturer_product_embeddings
      { product_id, qdrant_id: productId, image_url: secure_url }
```

#### When Store's fulfilled product enters inventory:

```
fulfillB2BOrder() runs on B2B order delivered:
  → copies manufacturer_product → new products row (jeweller_id set)
  → copies manufacturer_product_images → product_images
  → copies manufacturer_product_tryon (if exists) → product_tryon_assets
  → triggers POST /api/embeddings/product/:newProductId
      → embeds into luxematch_products collection
        Payload: { product_id, jeweller_id, category_id, metal,
                   occasion_tags, style_tags, has_tryon }
  → INSERT into product_embeddings
```

#### When Customer does similar image search:

```
Customer uploads photo → /api/search/jewellery-ai (current proxy) ← REPLACE THIS

New flow:
Customer uploads photo → /api/search/image
  → embedImage() → 512-d vector
  → searchByVector() on luxematch_products
    MUST filter: jeweller_id = ctx.shopJewellerId  ← tenancy enforced
  → returns [{ product_id, score, has_tryon, slug, ... }]
  → hydrate() → fetch full product + images from Supabase
  → return to frontend with: UUID, name, image, price, has_tryon flag

If has_tryon = true → "Try On" button shown next to "Add to Cart"
```

---

### Try-On Connection to Search Results

Currently try-on is disconnected from similar search (Jewellery AI results have no `product_id`).

**After fix:**
- Native `/api/search/image` returns `has_tryon: boolean` per result (already in Qdrant payload)
- Frontend: if `has_tryon = true` → show "Try On" button alongside "Add to Cart"
- Try-on loads `GET /api/tryon/products` → filtered to `jeweller_id` → opens AR view with that product's assets
- **Direct link:** customer sees similar product → tries it on → orders it — all same UUID throughout

---

### What's Wrong Right Now (Fixes Required)

#### Remove / Replace:

| What | Why | Action |
|------|-----|--------|
| `/api/search/jewellery-ai` proxy (current) | Returns Jewellery AI's own IDs — no link to LuxeMatch products, no cart, no try-on | Replace with native `/api/search/image` which uses `luxematch_products` collection |
| `manufacturer_product_tryon` table (migration 0005) | Unnecessary — try-on assets belong to `product_tryon_assets` only. Manufacturer uploads tryon asset → stored in `manufacturer_product_tryon` temporarily → copied to `product_tryon_assets` on fulfillment | Remove from 0005 migration; tryon handled at fulfillment time only |
| Jewellery AI `/search` as the search path | Returns external image URLs, no product metadata | Jewellery AI Space used ONLY as embedder (`/add-image` to index, `/search` only as fallback) |

#### Add / Fix:

| What | Why | Where |
|------|-----|-------|
| `manufacturer_product_embeddings` table | Track Qdrant indexing state for manufacturer designs | ✅ Already in updated 0005 migration |
| `metal`, `purity`, `gemstones`, `occasion_tags`, `style_tags`, `sku` on `manufacturer_products` | Required for Qdrant payload + search filtering | ✅ Already in updated 0005 migration |
| New Qdrant collection: `luxematch_manufacturer_products` | Manufacturer catalog is global (no jeweller_id) — can't use tenant-scoped collection | Add to `packages/qdrant/src/index.ts` in B2 |
| `manufacturer_product_id` field in Jewellery AI payload | Bridge: when Jewellery AI returns a match, we can look up the LuxeMatch product | Add when calling `/add-image` in B9 embedding step |
| `POST /api/embeddings/manufacturer/:productId` route | New route for indexing manufacturer designs into `luxematch_manufacturer_products` | Add in B6 |
| `has_tryon` flag on search results | Customer can see which results have AR try-on available | Already in `luxematch_products` payload ✓ |
| `QDRANT_MANUFACTURER_COLLECTION` env var | Separate collection name for manufacturer catalog | Add to `.env.local` and config schema |

---

### New Env Var to Add

```bash
# Qdrant collection for manufacturer global catalog (no jeweller_id filter)
QDRANT_MANUFACTURER_COLLECTION=luxematch_manufacturer_products
```

Add to `packages/config/src/index.ts` ServerEnvSchema and `apps/web/.env.local`.

---

### Updated Phase B2 — DB Helpers (additions)

Add to `packages/db/src/manufacturers.ts`:
- `trackManufacturerProductEmbedding(productId, imageUrl)` → inserts into `manufacturer_product_embeddings`
- `isManufacturerProductEmbedded(productId)` → checks if already indexed

Add to `packages/qdrant/src/index.ts`:
- `upsertManufacturerProductVector(opts)` → upserts into `luxematch_manufacturer_products`
- `searchManufacturerCatalog(vector, filters?)` → global search (no jeweller_id filter) — used by store catalog browse

### Updated Phase B6 — New API Route

```
POST /api/embeddings/manufacturer/:productId
  manufacturerGuard
  → fetch manufacturer_product + primary image URL
  → embedImage(imageUrl) via embedder
  → upsertManufacturerProductVector()
  → trackManufacturerProductEmbedding()
  → also call JEWELLERY_AI_URL/add-image with manufacturer_product_id in metadata
```

### Updated Phase B9 — fulfillB2BOrder (try-on copy)

Add to the fulfillment loop:
```typescript
// Copy tryon asset if manufacturer product has one in manufacturer_product_images
// (manufacturer uploads a transparent PNG separately — stored with is_tryon=true flag)
// On fulfillment → insert into product_tryon_assets with product_id = new store product UUID
```

> This means manufacturer_product_images needs an `is_tryon` boolean flag to distinguish
> the main catalog photo from the AR try-on transparent PNG.

Add to migration 0005:
```sql
ALTER TABLE manufacturer_product_images
  ADD COLUMN IF NOT EXISTS is_tryon boolean DEFAULT false;
-- is_tryon=false → regular product photo (shown in catalog)
-- is_tryon=true  → transparent PNG for AR try-on (copied to product_tryon_assets on fulfillment)
```

And add `jewellery_type` for when `is_tryon=true`:
```sql
ALTER TABLE manufacturer_product_images
  ADD COLUMN IF NOT EXISTS jewellery_type text
    CHECK (jewellery_type IN ('necklace','earring_left','earring_right',
                              'ring_index','ring_middle','bangle'));
```

This removes the need for a separate `manufacturer_product_tryon` table entirely.

---

### Summary: What You Want (Short Version)

```
✅ Manufacturer uploads design → auto-embedded into:
     luxematch_manufacturer_products (Qdrant, global)
     jewellery_search (Jewellery AI HF Space, for image search)
     manufacturer_product_images (Supabase, with is_tryon flag for AR PNG)

✅ Store browses manufacturer catalog → same category names as customer sees
     Similar image search on manufacturer catalog → luxematch_manufacturer_products

✅ Store places B2B order → manufacturer delivers → fulfillB2BOrder():
     → products row created (jeweller_id = store's jeweller)
     → product_images copied (same Cloudinary URLs, no re-upload)
     → product_tryon_assets copied (from is_tryon=true images)
     → auto-embedded into luxematch_products (tenant-scoped)
     → manufacturer_product_id backlink set

✅ Customer searches by photo → /api/search/image → luxematch_products
     → same product UUID from search → add to cart → checkout
     → if has_tryon=true → Try On button → AR engine loads product_tryon_assets

✅ Every product has one UUID throughout:
     manufacturer_products.id → (on fulfillment) → products.id
     Both UUIDs are Qdrant point IDs in their respective collections
     Both link back to Cloudinary images via their image tables

❌ Remove: /api/search/jewellery-ai as the customer search path
     → keep it as fallback/showcase only
     → replace with native /api/search/image (already exists, already correct)
```
