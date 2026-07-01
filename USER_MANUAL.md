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

| Actor | URL | Email / PIN | Password |
|---|---|---|---|
| Manufacturer | `/manufacturer/login` | `admin@atplusjewellers.com` | `manufacturer123` |
| Store/Retailer | `/store/login` | `store@aurumheritage.com` | `store123` |
| Jeweller device PIN mode | `/jeweller/unlock` | PIN `123456` | none |
| Customer | `/login` or `/signup` | customer email | customer password |

Main demo IDs:

| Entity | ID |
|---|---|
| Demo jeweller / tenant | `00000000-0000-0000-0000-00000000d3e1` |
| Demo manufacturer | `10000000-0000-0000-0000-000000000001` |
| Demo store | `20000000-0000-0000-0000-000000000001` |
| Demo manufacturer product 1 | `30000000-0000-0000-0000-000000000001` |
| Demo manufacturer product 2 | `30000000-0000-0000-0000-000000000002` |
| Demo manufacturer product 3 | `30000000-0000-0000-0000-000000000003` |

## System Actors

LuxeMatch has three actors:

1. **Manufacturer**
   - Uploads and manages the global wholesale catalog.
   - Creates store accounts.
   - Receives B2B orders.
   - Updates B2B order status from pending to delivered.

2. **Store / Retailer**
   - Logs in using store email/password.
   - Browses manufacturer catalog.
   - Adds designs to B2B cart.
   - Places B2B orders.
   - After delivery, products appear in that store's customer-facing inventory.

3. **End Customer**
   - Uses the store kiosk/site.
   - Browses products, image-searches, tries AR, adds to cart, signs in, and checks out.
   - Customer orders go to the store, not the manufacturer.

## Authentication And Authorization

| Cookie | Who gets it | Created by | Used for | Tenant source |
|---|---|---|---|---|
| `lm_manufacturer` | Manufacturer | `/api/manufacturer/login` | Manufacturer portal/API | `manufacturerId` |
| `lm_store` | Store/Retailer | `/api/store/login` | Store B2B portal + B2B mode jeweller routes | `jewellerId` inside cookie |
| `lm_pin` | Staff/device mode | `/api/shop/unlock` | Jeweller back-office | `SHOP_JEWELLER_ID` |
| `lm_customer` | Customer | `/api/customer/signin` or signup OTP verify | Customer account/cart/orders | current `jewellerId` |

Two tenant modes:

- **Device mode:** `SHOP_JEWELLER_ID` is set in `apps/web/.env.local`. Staff unlock `/jeweller/*` using PIN.
- **B2B store mode:** `SHOP_JEWELLER_ID` is blank. Store logs in at `/store/login`; `lm_store` carries the correct `jewellerId`.

## Manufacturer Flow

### 1. Login

Open:

```text
/manufacturer/login
```

Enter:

```text
admin@atplusjewellers.com
manufacturer123
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

Open:

```text
/manufacturer/dashboard
```

Use this page to see:

- Total catalog designs.
- Active designs.
- Pending B2B orders.
- Recent B2B orders.

Buttons/links:

- **Products / Catalog cards** go to `/manufacturer/products`.
- **Orders cards** go to `/manufacturer/orders`.

Database:

- Reads `manufacturer_products`.
- Reads `b2b_orders`.

### 3. Manage Products

Open:

```text
/manufacturer/products
```

Buttons:

- **Add Product**: opens product modal.
- **Save Changes / Add Product**: saves the form.
- Eye icon: toggles product between `active` and `draft`.
- Pencil/Edit icon: edits existing design.
- Trash/Delete icon: deletes manufacturer product.

Recommended product fields:

- SKU
- Name
- Category: `necklaces`, `earrings`, `rings`, `bangles`, `pendants`, `sets`
- Base price
- Weight
- Metal
- Purity
- Gemstones
- Occasion tags
- Style tags
- Min order quantity
- Status: `active` to show to stores

What happens:

- Add product calls `POST /api/manufacturer/products`.
- Edit calls `PATCH /api/manufacturer/products/:id`.
- Delete calls `DELETE /api/manufacturer/products/:id`.
- Status toggle calls `PATCH /api/manufacturer/products/:id`.

Database:

- Main table: `manufacturer_products`
- Images table: `manufacturer_product_images`
- Embedding tracking: `manufacturer_product_embeddings`
- Qdrant manufacturer collection: `luxematch_manufacturer_products`

Important:

- Stores can only order products whose `status = active`.
- Manufacturer catalog is global. It is not jeweller-scoped.

### 4. Manage Stores

Open:

```text
/manufacturer/stores
```

Buttons:

- **Add Store**: opens store account modal.
- **Create Store**: creates the store login.
- Toggle active/inactive button: enables/disables store account.

Add Store form:

- Store Name
- Email
- Password
- Jeweller ID
- City
- Phone

Demo linked jeweller ID:

```text
00000000-0000-0000-0000-00000000d3e1
```

What happens:

- Create calls `POST /api/manufacturer/stores`.
- Password is hashed with bcrypt.
- Store is linked to an existing jeweller row.

Database:

- `stores.id` is the store account ID.
- `stores.jeweller_id` links to `jewellers.id`.
- `stores.manufacturer_id` links to `manufacturers.id`.

### 5. Manage B2B Orders

Open:

```text
/manufacturer/orders
```

Buttons:

- Status filter dropdown.
- **View** on any order row.

Open an order:

```text
/manufacturer/orders/:id
```

Status buttons:

| Current status | Buttons shown | Meaning |
|---|---|---|
| `pending` | **Confirm Order**, **Cancel** | Accept/reject new B2B order |
| `confirmed` | **Mark Packed**, **Cancel** | Order is being prepared |
| `packed` | **Mark Shipped** | Requires tracking number if entered |
| `shipped` | **Mark Delivered** | Triggers inventory fulfillment |
| `delivered` | No next action | Store inventory already updated |
| `cancelled` | No next action | Closed |

Most important button:

```text
Mark Delivered
```

What happens on **Mark Delivered**:

1. API calls `PATCH /api/manufacturer/orders/:id` with status `delivered`.
2. `fulfillB2BOrder(orderId)` runs.
3. For each B2B order item:
   - If store already has product with same `manufacturer_product_id`, stock increases.
   - Otherwise a new `products` row is created for that store's `jeweller_id`.
   - Catalog images are copied into `product_images`.
   - Try-on images marked `is_tryon=true` are copied into `product_tryon_assets`.
4. `b2b_orders.fulfilled_at` is set.
5. `b2b_orders.fulfilled_product_ids` stores created/updated product IDs.
6. Product embedding indexing is triggered for the fulfilled products.

Database:

- Updates `b2b_orders.status`.
- Inserts `b2b_order_status_history`.
- Creates/updates `products`.
- Inserts `product_images`.
- Inserts `product_tryon_assets` when available.
- Updates `product_embeddings` after indexing.

## Store / Retailer Flow

### 1. Login

Open:

```text
/store/login
```

Enter:

```text
store@aurumheritage.com
store123
```

Click **Sign in**.

What happens:

- Frontend calls `POST /api/store/login`.
- Password is checked against `stores.password_hash`.
- Server sets `lm_store`.
- `lm_store` contains:
  - `storeId`
  - `jewellerId`
- Store is redirected to jeweller dashboard.

Database:

- Reads `stores`.
- Demo store ID: `20000000-0000-0000-0000-000000000001`
- Linked jeweller ID: `00000000-0000-0000-0000-00000000d3e1`

### 2. Browse Manufacturer Catalog

Open:

```text
/jeweller/manufacturer-catalog
```

Navigation:

- In Jeweller sidebar, click **Manufacturer Catalog**.

Buttons:

- Category/filter buttons: filter catalog.
- **Add** on product card: adds design to local B2B cart.
- Cart/order link: goes to `/jeweller/b2b-orders/new`.

What happens:

- Page calls `GET /api/store/catalog`.
- Only `active` manufacturer products are returned.
- Cart is stored in browser `sessionStorage`, not database.

Database:

- Reads `manufacturer_products`.
- Reads `manufacturer_product_images`.
- No DB write until order is placed.

### 3. Place B2B Order

Open:

```text
/jeweller/b2b-orders/new
```

Buttons:

- Quantity +/- controls: change cart quantities.
- Remove button: remove product from B2B cart.
- **Place B2B Order**: submits order.

Required fields:

- Delivery Address
- Optional Notes

What happens:

- Frontend calls `POST /api/store/orders`.
- Server resolves price from DB; client price is not trusted.
- Server checks `min_order_qty`.
- Creates `b2b_orders`.
- Creates `b2b_order_items`.
- Creates first `b2b_order_status_history` row with `pending`.
- Clears B2B cart after successful order.

Database:

- Inserts into `b2b_orders`.
- Inserts into `b2b_order_items`.
- Inserts into `b2b_order_status_history`.

Status after placing:

```text
pending
```

### 4. View / Cancel B2B Orders

Open:

```text
/jeweller/b2b-orders
```

Buttons:

- **Browse Catalog**: returns to manufacturer catalog.
- **View**: opens order detail.

Order detail:

```text
/jeweller/b2b-orders/:id
```

Button:

- **Cancel Order** appears only when status is `pending`.

What happens on cancel:

- Calls `DELETE /api/store/orders/:id`.
- Only pending orders can be cancelled.
- Status changes to `cancelled`.

Database:

- Updates `b2b_orders.status`.
- Inserts `b2b_order_status_history`.

## End Customer Flow

The customer flow is mostly unchanged. The customer sees the store inventory from `products`, not the manufacturer catalog directly.

### 1. Browse Products

Open:

```text
/
/products
```

Customer can:

- Browse product cards.
- Open product details.
- Save/compare products.
- Add products to cart.

Database:

- Reads `products`.
- Reads `product_images`.
- Filters by current `jeweller_id`.

### 2. Search By Image

Open:

```text
/search/image
```

Buttons:

- Upload/drop image.
- Result count slider.
- Product result card.

What happens:

- Frontend calls `POST /api/search/image`.
- Server embeds uploaded image using `EMBEDDER_URL`.
- Searches Qdrant collection `luxematch_products`.
- Qdrant query always filters by current `jeweller_id`.
- Results are hydrated from Supabase products.

Important:

- This is now native LuxeMatch search, not Jewellery_AI result browsing.
- It requires:
  - Embedder running.
  - Products indexed in Qdrant.

Database/Qdrant:

- Qdrant payload contains `product_id`, `jeweller_id`, category, metal, tags, price, `has_tryon`.
- Supabase hydrates product details via `products` and `product_images`.

### 3. Try-On

Open:

```text
/try-on
```

Customer can:

- Pick AR-ready product.
- Start camera try-on.
- Capture result.

Database:

- Reads `product_tryon_assets`.
- Only products for current `jeweller_id` are shown.

### 4. Add To Cart And Checkout

Buttons:

- **Add to Cart** on product card/detail.
- Cart page quantity controls.
- Checkout form.
- Place order button.

What happens:

1. Customer signs in or signs up.
2. Product is added to `cart_items`.
3. Checkout creates `orders`.
4. Checkout creates `order_items`.
5. Store manages the customer order from jeweller order pages.

Database:

- `customers`
- `cart_items`
- `customer_addresses`
- `orders`
- `order_items`
- `order_status_history`

## Data Flow End-To-End

### Manufacturer Design To Store Inventory

```text
manufacturer_products.id
  -> store places b2b_order_items.manufacturer_product_id
  -> manufacturer marks b2b_orders.status = delivered
  -> fulfillB2BOrder creates products row
  -> products.manufacturer_product_id = manufacturer_products.id
  -> product_images copied from manufacturer_product_images
  -> product_tryon_assets copied from manufacturer_product_images where is_tryon = true
  -> product_embeddings / Qdrant indexing
```

### Customer Order Flow

```text
products.id
  -> cart_items.product_id
  -> order_items.product_id
  -> orders.jeweller_id
  -> store fulfills customer order
```

### Tenant Isolation

Every store/customer product/order is scoped by:

```text
jeweller_id
```

In B2B mode:

```text
lm_store cookie -> jewellerId -> API context shopJewellerId
```

In device mode:

```text
SHOP_JEWELLER_ID -> API context shopJewellerId
```

## Database Tables

### Global Manufacturer Tables

| Table | Purpose | Key fields |
|---|---|---|
| `manufacturers` | Manufacturer accounts | `id`, `email`, `password_hash` |
| `manufacturer_products` | Global wholesale catalog | `id`, `manufacturer_id`, `sku`, `status` |
| `manufacturer_product_images` | Catalog and try-on images | `product_id`, `secure_url`, `is_primary`, `is_tryon` |
| `manufacturer_product_embeddings` | Manufacturer Qdrant indexing state | `product_id`, `qdrant_point_id`, `indexed_at` |

### Store / B2B Tables

| Table | Purpose | Key fields |
|---|---|---|
| `stores` | Store login linked to jeweller tenant | `id`, `jeweller_id`, `manufacturer_id`, `email` |
| `b2b_orders` | Store order to manufacturer | `id`, `store_id`, `jeweller_id`, `manufacturer_id`, `status` |
| `b2b_order_items` | B2B order lines | `b2b_order_id`, `manufacturer_product_id`, `quantity` |
| `b2b_order_status_history` | B2B audit trail | `b2b_order_id`, `status`, `note` |

### Storefront / Customer Tables

| Table | Purpose | Key fields |
|---|---|---|
| `jewellers` | Store tenant identity | `id`, `store_name`, `pin_hash` |
| `products` | Store inventory | `id`, `jeweller_id`, `manufacturer_product_id` |
| `product_images` | Store product photos | `product_id`, `url`, `is_primary` |
| `product_tryon_assets` | AR try-on assets | `product_id`, `asset_url`, `jewellery_type` |
| `product_embeddings` | Store product Qdrant indexing | `product_id`, `qdrant_point_id` |
| `customers` | Store-scoped customers | `id`, `jeweller_id`, `email`, `phone` |
| `cart_items` | Customer cart | `customer_id`, `product_id`, `quantity` |
| `orders` | Customer orders | `id`, `jeweller_id`, `customer_id`, `status` |
| `order_items` | Customer order lines | `order_id`, `product_id`, `quantity` |

## Test Checklist

### A. Migration And Seed

Run in Supabase SQL editor:

1. `0004_customer_avatar.sql`
2. `0005_b2b_repair_existing.sql` if old `0005` was partially applied
3. Updated `0005_b2b_platform.sql`
4. B2B seed block from `seed.sql`, starting at `-- B2B demo data (DEV ONLY)`

Verify with SQL:

```sql
select id, email from manufacturers;
select id, email, jeweller_id from stores;
select id, sku, name, status from manufacturer_products;
```

Expected:

- One manufacturer.
- One store.
- Three active manufacturer products.

### B. Manufacturer Portal Test

1. Open `/manufacturer/login`.
2. Login as `admin@atplusjewellers.com / manufacturer123`.
3. Open `/manufacturer/products`.
4. Confirm three products show.
5. Click **Add Product**, fill form, click **Add Product**.
6. Toggle product status active/draft using eye icon.
7. Open `/manufacturer/stores`.
8. Confirm `Aurum Heritage Store` exists.
9. Open `/manufacturer/orders`.

Pass condition:

- Manufacturer can login, see products/stores/orders, and create/edit catalog.

### C. Store Portal Test

1. Open `/store/login`.
2. Login as `store@aurumheritage.com / store123`.
3. Open `/jeweller/manufacturer-catalog`.
4. Click **Add** on at least one product.
5. Click cart/order link or open `/jeweller/b2b-orders/new`.
6. Enter delivery address.
7. Click **Place B2B Order**.
8. Open `/jeweller/b2b-orders`.
9. Open order detail.

Pass condition:

- Order appears with status `pending`.

### D. Manufacturer Fulfillment Test

1. Login manufacturer.
2. Open `/manufacturer/orders`.
3. Open the pending order.
4. Click **Confirm Order**.
5. Click **Mark Packed**.
6. Optional: enter tracking number.
7. Click **Mark Shipped**.
8. Click **Mark Delivered**.

Pass condition:

- Order status becomes `delivered`.
- `b2b_orders.fulfilled_at` is set.
- `b2b_orders.fulfilled_product_ids` contains product IDs.
- Store inventory now has products with `manufacturer_product_id`.

Verify SQL:

```sql
select id, status, fulfilled_at, fulfilled_product_ids
from b2b_orders
order by created_at desc
limit 5;

select id, name, jeweller_id, manufacturer_product_id, stock_count
from products
where manufacturer_product_id is not null
order by updated_at desc;
```

### E. Customer Inventory Test

After B2B order is delivered:

1. Open `/products`.
2. Confirm delivered B2B products appear.
3. Open product detail.
4. Add to cart.
5. Checkout with customer login.

Pass condition:

- Customer can buy products sourced from manufacturer B2B fulfillment.

### F. Image Search / Embedding Test

Requirements:

- `EMBEDDER_URL=http://localhost:8001`
- Embedder running.
- Qdrant credentials set.
- Products indexed.

Test:

1. Open `/search/image`.
2. Upload jewellery image.
3. Confirm results link to real product pages.

Manufacturer embedding endpoint:

```text
POST /api/embeddings/manufacturer/:id
```

Product embedding endpoint:

```text
POST /api/embeddings/product/:id
```

Pass condition:

- `manufacturer_product_embeddings` row appears after manufacturer indexing.
- `product_embeddings` row appears after store product indexing.
- Qdrant has matching point IDs.

## Common Errors

### Policy Already Exists

Error:

```text
policy "service role all manufacturers" already exists
```

Fix:

- Run `0005_b2b_repair_existing.sql`.
- Rerun updated `0005_b2b_platform.sql`.

### Column sku Does Not Exist

Error:

```text
column "sku" of relation "manufacturer_products" does not exist
```

Fix:

- Run `0005_b2b_repair_existing.sql`.
- Rerun B2B seed block.

### Store Login Works But `/jeweller/*` Redirects

Check:

- `lm_store` cookie exists.
- Store row has `jeweller_id`.
- In B2B mode, `SHOP_JEWELLER_ID` can be blank.

### Image Search Fails

Check:

- Embedder is running on port `8001`.
- `EMBEDDER_URL=http://localhost:8001`.
- Qdrant env vars are valid.
- Products have images and embeddings.

## Recommended Manual Demo Script

Use this in a presentation:

1. Manufacturer logs in.
2. Manufacturer shows active catalog.
3. Manufacturer opens stores page and shows store account.
4. Store logs in.
5. Store browses manufacturer catalog.
6. Store clicks **Add** on a design.
7. Store clicks **Place B2B Order**.
8. Manufacturer opens orders page.
9. Manufacturer clicks:
   - **Confirm Order**
   - **Mark Packed**
   - **Mark Shipped**
   - **Mark Delivered**
10. Store/customer inventory is checked.
11. Customer opens products/search and buys the delivered item.

That is the complete business loop:

```text
Manufacturer design -> Store B2B order -> Manufacturer delivery -> Store inventory -> Customer purchase
```
