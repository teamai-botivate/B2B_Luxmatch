# LuxeMatch B2B User Manual

This guide explains the complete LuxeMatch B2B flow: manufacturer, store/retailer, and end customer. It also explains authentication, test credentials, what button to press, and where data is stored in Supabase.

## Quick Start

Run the app:

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch
pnpm.cmd dev
```

For full visual search and embedding tests, also run the embedder:

```powershell
python -m uvicorn embedder:app --port 8001
```

Seed/demo credentials:

| Actor                    | URL                        | Email / PIN                        | Password      |
| ------------------------ | -------------------------- | ---------------------------------- | ------------- |
| Manufacturer             | `/manufacturer/login`    | `admin@atplusjewellers.com`      | `Admin@123` |
| Store/Retailer           | `/store/login`           | `store@aurumheritage.com`        | `Store@123` |
| Jeweller device PIN mode | `/jeweller/unlock`       | PIN`123456`                      | none          |
| Customer (kiosk)         | No login — guest checkout | name + phone on`/kiosk-checkout` | none          |

>
> **Staff Portal entry point (live site):** Go to any page → scroll to footer → click **Staff Portal**. This opens `/portal` where you choose Store Owner Login or Manufacturer Login.

Main demo IDs:

| Entity                      | ID                                       |
| --------------------------- | ---------------------------------------- |
| Demo jeweller / tenant      | `00000000-0000-0000-0000-00000000d3e1` |
| Demo manufacturer           | `10000000-0000-0000-0000-000000000001` |
| Demo store                  | `20000000-0000-0000-0000-000000000001` |
| Demo manufacturer product 1 | `30000000-0000-0000-0000-000000000001` |
| Demo manufacturer product 2 | `30000000-0000-0000-0000-000000000002` |
| Demo manufacturer product 3 | `30000000-0000-0000-0000-000000000003` |

## System Actors

LuxeMatch has three actors:

1. **Manufacturer**

   - Uploads and manages the global wholesale catalog.
   - Creates store accounts.
   - Receives B2B orders from stores.
   - Receives kiosk orders from end customers (via stores).
   - Updates B2B order and kiosk order status.
2. **Store / Retailer**

   - Logs in using store email/password at `/store/login` or via `/portal`.
   - Browses manufacturer catalog and places B2B restock orders.
   - After manufacturer delivery, products appear in the store's customer-facing inventory.
   - Views kiosk orders placed by walk-in customers.
   - Manages store branding (store name shown to customers).
3. **End Customer**

   - Uses the store kiosk/site — **no login required**.
   - Browses products, image-searches, AR try-on, adds to guest cart.
   - Fills a short guest form (name, phone, address/pickup) at `/kiosk-checkout`.
   - Order goes directly to the manufacturer. Store tracks and handles handover.

## Authentication And Authorization

| Cookie              | Who gets it    | Created by                  | Used for                                    | Tenant source                |
| ------------------- | -------------- | --------------------------- | ------------------------------------------- | ---------------------------- |
| `lm_manufacturer` | Manufacturer   | `/api/manufacturer/login` | Manufacturer portal/API                     | `manufacturerId`           |
| `lm_store`        | Store/Retailer | `/api/store/login`        | Store B2B portal + B2B mode jeweller routes | `jewellerId` inside cookie |
| `lm_pin`          | Staff/device   | `/api/shop/unlock`        | Jeweller back-office                        | `SHOP_JEWELLER_ID`         |

> **Customer login/signup is deprecated.** Customers order as guests. The `/login` and `/signup` routes redirect to home.

Two tenant modes:

- **Device mode:** `SHOP_JEWELLER_ID` is set in `apps/web/.env.local`. Staff unlock `/jeweller/*` using PIN.
- **B2B store mode:** `SHOP_JEWELLER_ID` is blank. Store logs in at `/store/login`; `lm_store` carries the correct `jewellerId`.

## Manufacturer Flow

### 1. Login

Navigate to the portal:

```text
/portal  →  Manufacturer Login  →  /manufacturer/login
```

Or go directly:

```text
/manufacturer/login
```

Enter:

```text
admin@atplusjewellers.com
Admin@123
```

Click **Sign in**.

What happens:

- Frontend calls `POST /api/manufacturer/login`.
- Password is checked with bcrypt against `manufacturers.password_hash`.
- Server sets `lm_manufacturer`.
- You land in the manufacturer portal.

Database:

- Reads table: `manufacturers`
- Demo row ID: `10000000-0000-0000-0000-000000000001`

### 2. Dashboard

```text
/manufacturer/dashboard
```

Shows:

- Total catalog designs.
- Active designs.
- Pending B2B orders.
- Recent B2B orders.

### 3. Manage Products

```text
/manufacturer/products
```

Buttons:

- **Add Product**: opens product modal.
- Eye icon: toggles `active` / `draft`.
- Pencil icon: edit design.
- Trash icon: delete design.

Required fields:

- SKU, Name, Category, Base price, Status (`active` to show to stores)

Optional:

- Weight, Metal, Purity, Gemstones, Occasion tags, Style tags, Min order qty

What happens:

- Add → `POST /api/manufacturer/products`
- Edit → `PATCH /api/manufacturer/products/:id`
- Delete → `DELETE /api/manufacturer/products/:id`

Database:

- `manufacturer_products`
- `manufacturer_product_images`
- `manufacturer_product_embeddings`

### 4. Manage Stores

```text
/manufacturer/stores
```

Full CRUD available via action icons on each row:

| Icon                       | Action              | What it does                                           |
| -------------------------- | ------------------- | ------------------------------------------------------ |
| **Add Store** button | Create              | New store login + auto-creates linked`jewellers` row |
| Pencil icon                | Edit                | Edit store name, email, city, phone                    |
| Key icon                   | Reset password      | Set a new login password (min 6 chars)                 |
| Trash icon                 | Delete              | Removes store + linked`jewellers` row permanently    |
| Toggle icon                | Activate/Deactivate | Enable or disable store login                          |

Add Store form fields: Store Name, Email, Password, City, Phone

Database:

- `stores.id` — store account ID
- `stores.jeweller_id` → `jewellers.id` (auto-created on Add, auto-deleted on Delete)
- `stores.manufacturer_id` → `manufacturers.id`

### 5. Manage B2B Orders (Store Restock)

```text
/manufacturer/orders
```

Order detail:

```text
/manufacturer/orders/:id
```

Status flow — manufacturer controls:

| Current status | Button shown             | Effect                                           |
| -------------- | ------------------------ | ------------------------------------------------ |
| `pending`    | **Confirm Order**  | Accept order                                     |
| `confirmed`  | **Mark Packed**    | Preparing                                        |
| `packed`     | **Mark Shipped**   | Add tracking number (optional)                   |
| `shipped`    | **Mark Delivered** | Triggers`fulfillB2BOrder()` → store inventory |
| `delivered`  | —                       | Done                                             |
| `cancelled`  | —                       | Closed                                           |

**Mark Delivered** triggers:

1. `fulfillB2BOrder(orderId)` runs.
2. For each order item: product created in store inventory, images copied, try-on assets copied.
3. `b2b_orders.fulfilled_at` is set.
4. Product embedding/Qdrant indexing triggered.

### 6. Kiosk Orders (Customer Walk-in Orders)

```text
/manufacturer/kiosk-orders
```

Shows all guest orders placed by walk-in customers at any store kiosk. **Store name is highlighted prominently** for each order.

Expand an order to see customer details and items. Advance status buttons:

```text
placed → confirmed → packed → shipped → delivered
```

Manufacturer controls `placed → shipped`. Store controls `arrived_at_store → delivered_to_customer` (from their own kiosk orders view).

Database:

- `guest_orders`
- `guest_order_items`
- `guest_order_status_history`

## Store / Retailer Flow

### 1. Login

Navigate via portal:

```text
/portal  →  Store Owner Login  →  /store/login
```

Or go directly:

```text
/store/login
```

Enter:

```text
store@aurumheritage.com
Store@123
```

Click **Sign in**.

What happens:

- `POST /api/store/login` → bcrypt check → `lm_store` cookie set.
- Cookie contains `storeId` + `jewellerId`.
- Redirected to `/jeweller/dashboard`.
- All customer-facing pages are now automatically scoped to this store's `jewellerId`.

Database:

- Reads `stores`
- Demo store ID: `20000000-0000-0000-0000-000000000001`

### 2. Browse Manufacturer Catalog

```text
/jeweller/manufacturer-catalog
```

- Category filter and product cards.
- **Add** button: adds to sessionStorage B2B cart.
- Cart badge → `/jeweller/b2b-orders/new`.

Database:

- Reads `manufacturer_products`, `manufacturer_product_images`.
- No DB write until order placed.

### 3. Place B2B Order (Restock)

```text
/jeweller/b2b-orders/new
```

- Review cart, set quantities, add delivery address.
- **Place B2B Order** → `POST /api/store/orders`.
- Server resolves price from DB (client price not trusted).

Database:

- Inserts `b2b_orders`, `b2b_order_items`, `b2b_order_status_history`.

### 4. View B2B Orders

```text
/jeweller/b2b-orders
/jeweller/b2b-orders/:id
```

- **Cancel Order** available only when status is `pending`.
- Cancel → `DELETE /api/store/orders/:id`.

### 5. Kiosk Orders (Customer Walk-in Orders)

```text
/jeweller/kiosk-orders
```

Shows all guest orders placed by walk-in customers on this store's kiosk. Expand any row to see customer details and items.

Database:

- Reads `guest_orders`, `guest_order_items` filtered to this store's `store_id`.

### 6. Store Profile / Branding

```text
/jeweller/store-profile
```

- Edit `logo_url`, `tagline`, `website_url`.
- **Save branding** → `PATCH /api/store/branding`.
- Customer-facing pages show: **Store Name · LuxMatch · Powered by Botivate**.

Database:

- Updates `stores.logo_url`, `stores.tagline`, `stores.website_url`.

## End Customer (Kiosk Guest) Flow

> **No login required.** Customers use the store device as a guest. No account is created.

### 1. Browse Products

```text
/
/catalog
```

- Browse product cards, open detail, save/compare.
- Add to guest cart (stored in sessionStorage, resets per tab).

### 2. Image Search

```text
/search/image
```

- Upload jewellery photo → native OpenCLIP search → results from this store's Qdrant collection.
- Requires embedder running and products indexed.

### 3. AR Try-On

```text
/try-on
```

- Pick AR-ready product (those with a transparent PNG uploaded by manufacturer), start camera, capture.
- **Try On** button on product cards is shown only when `has_tryon=true` — if no PNG uploaded, button is hidden.
- Clicking Try On on a product card opens try-on with that product pre-selected.
- **Add to Bag** button appears in try-on header when a real product is selected — adds to guest cart.
- X (close) button returns to the originating product page, not home.

### 4. Guest Checkout (No Login)

```text
/kiosk-checkout
```

Cart icon in header → `/kiosk-checkout`.

Customer fills:

- Name (required)
- Phone (required)
- Email (optional)
- Pickup at store OR delivery address
- Notes (optional)

Click **Place Order** → `POST /api/kiosk/orders`.

What happens:

1. Server resolves store from `lm_store` cookie or `SHOP_JEWELLER_ID` env.
2. Resolves store's manufacturer.
3. Prices looked up from DB — never trusted from client.
4. Inserts `guest_orders`, `guest_order_items`, `guest_order_status_history`.
5. Returns `{ id, orderNumber }`.
6. Customer sees success page with order number.

Database:

- `guest_orders`
- `guest_order_items`
- `guest_order_status_history`

> **Note:** After placing, the customer gets a receipt page only. No account, no email (unless SMTP is configured). The store and manufacturer can track the order from their portals.

## Portal Entry Point

The `/portal` page is the staff login hub. It is linked from the footer of every customer-facing page under **Staff Portal**.

```text
/portal
  ├── Store Owner Login  →  /store/login  →  /jeweller/dashboard
  └── Manufacturer Login →  /manufacturer/login  →  /manufacturer/dashboard
```

Customers never need to visit `/portal`. It is intentionally subtle (small text in footer).

## Data Flow End-To-End

### Manufacturer Design → Store Inventory (B2B Restock)

```text
manufacturer_products.id
  → store adds to B2B cart
  → store places b2b_orders
  → b2b_order_items.manufacturer_product_id
  → manufacturer marks status = delivered
  → fulfillB2BOrder():
      products row created (jeweller_id = store's jeweller)
      product_images copied
      product_tryon_assets copied (is_tryon=true images)
      product_embeddings / Qdrant indexed
```

### Customer Kiosk Order Flow

```text
Customer browses /catalog (no login)
  → adds to guest cart (sessionStorage)
  → fills /kiosk-checkout form
  → POST /api/kiosk/orders
  → guest_orders row (store_id + manufacturer_id + customer snapshot)
  → manufacturer sees it in /manufacturer/kiosk-orders
  → store sees it in /jeweller/kiosk-orders
  → status advanced: placed → confirmed → packed → shipped → delivered
```

### Tenant Isolation

Every store/customer product/order is scoped by `jeweller_id`.

In B2B mode:

```text
lm_store cookie → jewellerId → API context shopJewellerId
```

In device mode:

```text
SHOP_JEWELLER_ID env → API context shopJewellerId
```

## Database Tables

### Global Manufacturer Tables

| Table                               | Purpose                            | Key fields                                                   |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `manufacturers`                   | Manufacturer accounts              | `id`, `email`, `password_hash`                         |
| `manufacturer_products`           | Global wholesale catalog           | `id`, `manufacturer_id`, `sku`, `status`             |
| `manufacturer_product_images`     | Catalog + try-on images            | `product_id`, `secure_url`, `is_primary`, `is_tryon` |
| `manufacturer_product_embeddings` | Manufacturer Qdrant indexing state | `product_id`, `qdrant_point_id`, `indexed_at`          |

### Store / B2B Tables

| Table                        | Purpose                               | Key fields                                                             |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------- |
| `stores`                   | Store login linked to jeweller tenant | `id`, `jeweller_id`, `manufacturer_id`, `email`, `logo_url`  |
| `b2b_orders`               | Store restock order to manufacturer   | `id`, `store_id`, `jeweller_id`, `manufacturer_id`, `status` |
| `b2b_order_items`          | B2B order lines                       | `b2b_order_id`, `manufacturer_product_id`, `quantity`            |
| `b2b_order_status_history` | B2B audit trail                       | `b2b_order_id`, `status`, `note`                                 |

### Kiosk / Guest Order Tables

| Table                          | Purpose                       | Key fields                                                                                   |
| ------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `guest_orders`               | Walk-in customer kiosk orders | `id`, `store_id`, `manufacturer_id`, `customer_name`, `customer_phone`, `status` |
| `guest_order_items`          | Kiosk order lines             | `guest_order_id`, `product_id`, `quantity`, `unit_price_snapshot`                    |
| `guest_order_status_history` | Kiosk order audit trail       | `guest_order_id`, `status`                                                               |

### Storefront / Inventory Tables

| Table                    | Purpose                       | Key fields                                           |
| ------------------------ | ----------------------------- | ---------------------------------------------------- |
| `jewellers`            | Store tenant identity         | `id`, `store_name`, `pin_hash`                 |
| `products`             | Store inventory               | `id`, `jeweller_id`, `manufacturer_product_id` |
| `product_images`       | Store product photos          | `product_id`, `url`, `is_primary`              |
| `product_tryon_assets` | AR try-on assets              | `product_id`, `asset_url`, `jewellery_type`    |
| `product_embeddings`   | Store product Qdrant indexing | `product_id`, `qdrant_point_id`                  |

## Pending Migrations (Apply in Supabase SQL Editor)

Apply in this order if not already done:

### 0006_guest_orders.sql — Guest kiosk order tables

```text
supabase/migrations/0006_guest_orders.sql
```

Creates: `guest_orders`, `guest_order_items`, `guest_order_status_history`
Adds: `logo_url`, `tagline`, `website_url` to `stores`

> If you get "policy already exists" error, run only the safe idempotent patch (DROP POLICY IF EXISTS + recreate) — see Common Errors below.

### 0007_tryon_assets.sql — AR Try-On asset management

```text
supabase/migrations/0007_tryon_assets.sql
```

Adds: `has_tryon` flag to `manufacturer_products`
Extends: `product_tryon_assets` to support manufacturer products directly (before B2B fulfillment)

### Live DB city update

```sql
UPDATE jewellers SET city = 'Chhattisgarh' WHERE slug = 'at-jewellers';
```

## Test Checklist

### A. Migration And Seed

Run in Supabase SQL editor in order:

1. `0004_customer_avatar.sql` (if not applied)
2. `0005_b2b_platform.sql` (if not applied)
3. `0006_guest_orders.sql` ← required for kiosk order flow
4. `0007_tryon_assets.sql` ← required for AR try-on asset management

Verify:

```sql
select id, email from manufacturers;
select id, email, jeweller_id from stores;
select id, name, status from manufacturer_products limit 5;
select table_name from information_schema.tables
where table_name in ('guest_orders','guest_order_items','guest_order_status_history');
select column_name from information_schema.columns
where table_name = 'manufacturer_products' and column_name = 'has_tryon';
```

### B. Portal Entry Test

1. Open any customer-facing page (e.g. `/`).
2. Scroll to footer, click **Staff Portal**.
3. Confirm `/portal` opens with two cards: Store Owner Login, Manufacturer Login.
4. Click Store Owner Login → `/store/login` opens.
5. Click back, click Manufacturer Login → `/manufacturer/login` opens.

### C. Manufacturer Portal Test

1. Open `/manufacturer/login`, login.
2. Confirm `/manufacturer/dashboard` loads.
3. Check products, stores, orders, kiosk-orders tabs.

### D. Store Portal Test

1. Open `/store/login`, login.
2. Confirm `/jeweller/dashboard` loads.
3. Browse manufacturer catalog, add to B2B cart, place B2B order.
4. Check `/jeweller/kiosk-orders` (may be empty until guest order is placed).

### E. Kiosk Guest Order Test

1. As customer (no login), go to `/catalog`.
2. Add a product to cart.
3. Go to `/kiosk-checkout`.
4. Fill name + phone, choose pickup.
5. Click **Place Order**.
6. Confirm order number appears on success page.
7. Log in as manufacturer → `/manufacturer/kiosk-orders` → order appears.
8. Log in as store → `/jeweller/kiosk-orders` → same order appears.

### F. B2B Fulfillment Test

1. Place a B2B order as store.
2. Log in as manufacturer → `/manufacturer/orders`.
3. Advance through all statuses to **Mark Delivered**.
4. Verify store inventory has new products:

```sql
select id, name, jeweller_id, manufacturer_product_id, stock_count
from products
where manufacturer_product_id is not null
order by updated_at desc;
```

## Common Errors

### Policy Already Exists (0005)

```text
policy "service role all manufacturers" already exists
```

Fix: Run `0005_b2b_repair_existing.sql` then rerun `0005_b2b_platform.sql`.

### Policy Already Exists (0006)

```text
policy "service role all guest_orders" already exists
```

The tables already exist but policies failed. Run this safe patch instead of the full migration:

```sql
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role all guest_orders" ON guest_orders;
DROP POLICY IF EXISTS "service role all guest_order_items" ON guest_order_items;
DROP POLICY IF EXISTS "service role all guest_order_status_history" ON guest_order_status_history;

CREATE POLICY "service role all guest_orders"
  ON guest_orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all guest_order_items"
  ON guest_order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service role all guest_order_status_history"
  ON guest_order_status_history FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Guest Orders Table Does Not Exist

```text
relation "guest_orders" does not exist
```

Fix: Apply `supabase/migrations/0006_guest_orders.sql` in Supabase SQL editor.

### Store Login Works But `/jeweller/*` Redirects

Check:

- `lm_store` cookie exists.
- Store row has `jeweller_id`.
- In B2B mode, `SHOP_JEWELLER_ID` can be blank.

### Image Search Fails

Check:

- Embedder running on port `8001`.
- `EMBEDDER_URL=http://localhost:8001`.
- Qdrant env vars valid.
- Products have images and are indexed.

## Recommended Demo Script

Use this in a presentation:

1. Open customer-facing site. Show products, AR try-on.
2. Add product to guest cart → go to `/kiosk-checkout` → fill form → place order.
3. Show order number on success page.
4. Open footer → Staff Portal → Manufacturer Login.
5. Show kiosk order in `/manufacturer/kiosk-orders` with store name.
6. Open footer → Staff Portal → Store Owner Login.
7. Show kiosk order in `/jeweller/kiosk-orders`.
8. Show store owner browsing manufacturer catalog → place B2B restock order.
9. Switch back to manufacturer → advance B2B order through to **Mark Delivered**.
10. Show new products in store inventory.

Complete business loop:

```text
Customer walks in (no login)
  → browses kiosk → guest cart → /kiosk-checkout → order placed
  → manufacturer sees it → fulfills → ships to store
  → store hands over to customer

Store owner restock:
  → browses manufacturer catalog → B2B order
  → manufacturer delivers → store inventory auto-updated
  → customer can now buy the restocked item
```
