# LuxeMatch Client Setup Guide

This guide explains how to set up LuxeMatch for a new client using their own Supabase, Cloudinary, Qdrant, and optional embedder service.

LuxeMatch has three actors:

- **Manufacturer**: manages wholesale catalog, stores, and B2B orders.
- **Store/Retailer**: logs in, orders manufacturer designs, and sells fulfilled products to customers.
- **Customer**: browses the store inventory, image-searches, tries AR, adds to cart, and checks out.

For business/user flow, see [USER_MANUAL.md](USER_MANUAL.md).

## 1. Requirements

Install:

```powershell
node --version   # Node 20+
pnpm --version   # pnpm 10+
python --version # Python 3.10+ for embedder
git --version
```

Optional:

```powershell
npm install -g supabase
```

On Windows, use `supabase.cmd` instead of `supabase` if PowerShell blocks `.ps1` scripts.

## 2. Create Client Cloud Accounts

### Supabase

1. Go to `https://supabase.com/dashboard`.
2. Create a new project for the client.
3. Copy:
   - Project URL
   - Anon/public key
   - Service role key
4. In Authentication settings:
   - Enable email/password auth.
   - Configure SMTP before production.
   - Supabase email OTP is usually 8 digits; LuxeMatch accepts 6-8 digits.

### Cloudinary

1. Create a Cloudinary cloud for the client.
2. Copy:
   - Cloud name
   - API key
   - API secret
3. LuxeMatch stores assets under:

```text
luxematch/<jewellerId>/products/
luxematch/<jewellerId>/tryon/
luxematch/<jewellerId>/avatars/
luxematch/manufacturer/<manufacturerId>/catalog/
```

### Qdrant

1. Create a Qdrant Cloud cluster.
2. Create/copy API key.
3. LuxeMatch will use:

```text
luxematch_products
luxematch_manufacturer_products
```

The app can create Qdrant collections/indexes when indexing runs.

### Embedder

Dev/local:

```text
EMBEDDER_URL=http://localhost:8001
```

Production:

- Deploy `apps/embedder` to a GPU/CPU service.
- Keep endpoint compatible with `/embed/image`, `/embed/text`, and `/embed/hybrid`.

## 3. Configure Env

Create or edit:

```text
apps/web/.env.local
```

Use this template:

```env
NODE_ENV=development

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

LM_PIN_COOKIE_SECRET=generate-a-random-32-plus-char-secret
LM_PIN_COOKIE_TTL_SECONDS=14400
LM_STORE_COOKIE_TTL_SECONDS=28800
MANUFACTURER_COOKIE_SECRET=generate-another-random-32-plus-char-secret
LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800

# Device mode: set this to one jeweller id.
# B2B mode: leave blank, store login decides jeweller_id.
SHOP_JEWELLER_ID=

CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

QDRANT_URL=https://YOUR_QDRANT_CLUSTER
QDRANT_API_KEY=YOUR_QDRANT_API_KEY
QDRANT_COLLECTION=luxematch_products
QDRANT_MANUFACTURER_COLLECTION=luxematch_manufacturer_products

EMBEDDER_URL=http://localhost:8001
EMBEDDER_API_KEY=

# Optional showcase/fallback only
JEWELLERY_AI_URL=https://botivate2026-jewellery.hf.space

# Optional checkout confirmation email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Generate secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Check env:

```powershell
pnpm.cmd check-env
```

## 4. Install Dependencies

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch
pnpm.cmd install
```

## 5. Apply Supabase Migrations

Open Supabase SQL Editor and run in this order:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_ecommerce.sql
supabase/migrations/0003_security_advisor.sql
supabase/migrations/0004_customer_avatar.sql
supabase/migrations/0005_b2b_platform.sql
```

If an older draft of `0005` was partially applied and you see errors like existing policies or missing `sku`, run this first:

```text
supabase/migrations/0005_b2b_repair_existing.sql
```

Then rerun:

```text
supabase/migrations/0005_b2b_platform.sql
```

Verify:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'manufacturers',
    'manufacturer_products',
    'manufacturer_product_images',
    'manufacturer_product_embeddings',
    'stores',
    'b2b_orders',
    'b2b_order_items',
    'b2b_order_status_history'
  )
order by table_name;
```

## 6. Seed Client/Demo Data

For demo/dev, run the full:

```text
supabase/seed.sql
```

For only B2B demo data, run from:

```sql
-- B2B demo data (DEV ONLY)
```

Demo accounts:

```text
Manufacturer: admin@atplusjewellers.com / manufacturer123
Store:        store@aurumheritage.com / store123
PIN:          123456
```

For a real client, create production-safe records:

1. Create jeweller in `jewellers`.
2. Create manufacturer in `manufacturers`.
3. Create store in `stores`, linked to `jewellers.id`.
4. Upload manufacturer products from portal or insert into `manufacturer_products`.

Important IDs:

```text
jewellers.id                  tenant id for store/customer data
manufacturers.id              manufacturer account id
stores.id                     store login id
stores.jeweller_id            links store login to tenant
manufacturer_products.id      global design id
products.manufacturer_product_id  backlink after B2B fulfillment
```

## 7. Run Locally

Terminal 1, web app:

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch
pnpm.cmd dev
```

Open:

```text
http://localhost:3000
```

Terminal 2, embedder for image search:

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch\apps\embedder
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn embedder:app --port 8001
```

First boot downloads model weights.

Stop web app or embedder:

```text
Press Ctrl+C in the terminal running it.
```

Stop anything listening on port 8000/8001:

```powershell
$connections = Get-NetTCPConnection -LocalPort 8000,8001 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
$connections | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## 8. Modes

### Device Mode

Use when one installed device belongs to one jeweller.

```env
SHOP_JEWELLER_ID=client-jeweller-uuid
```

Staff goes to:

```text
/jeweller/unlock
```

Uses PIN.

### B2B Store Mode

Use when one deployment supports store login.

```env
SHOP_JEWELLER_ID=
```

Store goes to:

```text
/store/login
```

The `lm_store` cookie carries the `jewellerId`.

## 9. Indexing And Search

### Index store inventory

```powershell
pnpm.cmd reindex --jeweller-id=CLIENT_JEWELLER_UUID
```

Or all stores:

```powershell
pnpm.cmd reindex --all
```

### Index one store product

Requires PIN or valid store session:

```text
POST /api/embeddings/product/:id
```

### Index one manufacturer product

Requires manufacturer session:

```text
POST /api/embeddings/manufacturer/:id
```

Data goes to:

```text
product_embeddings
manufacturer_product_embeddings
Qdrant: luxematch_products
Qdrant: luxematch_manufacturer_products
```

## 10. Production Deployment Checklist

### Render Docker Deployment

This repo includes:

```text
Dockerfile
apps/embedder/Dockerfile
.python-version
apps/embedder/.python-version
```

Create two Render Web Services manually using **New + > Web Service** and the Docker runtime. No Blueprint or `render.yaml` is required.

Render services:

| Service | Dockerfile | Notes |
|---|---|---|
| `luxematch-web` | `./Dockerfile` | Next.js web app/API on port `3000` |
| `luxematch-embedder` | `./apps/embedder/Dockerfile` | FastAPI OpenCLIP service, Python 3.10, port from `$PORT` |

Manual Docker commands:

```powershell
docker build -t luxematch-web .
docker run --env-file apps/web/.env.local -p 3000:3000 luxematch-web

docker build -t luxematch-embedder -f apps/embedder/Dockerfile apps/embedder
docker run -p 8001:8001 luxematch-embedder
```

### Render Web Service

Create the first service:

```text
Runtime: Docker
Dockerfile Path: ./Dockerfile
Docker Build Context Directory: .
Health Check Path: /api/health
```

Add all variables from `apps/web/.env.local` manually in Render Environment settings. Do not upload the `.env.local` file.

Set:

```env
NODE_ENV=production
PORT=10000
EMBEDDER_URL=https://YOUR-EMBEDDER-SERVICE.onrender.com
```

For B2B multi-store mode:

```env
SHOP_JEWELLER_ID=
```

For one-store kiosk mode:

```env
SHOP_JEWELLER_ID=CLIENT_JEWELLER_UUID
```

### Render Embedder Service

Create the second service:

```text
Runtime: Docker
Root Directory: apps/embedder
Dockerfile Path: ./Dockerfile
Docker Build Context Directory: .
Health Check Path: /health
```

The Docker image uses:

```dockerfile
FROM python:3.10-slim-bookworm
```

Both `.python-version` files also specify:

```text
3.10
```

Set the same `EMBEDDER_API_KEY` on both the web service and embedder service.

Before giving to a client:

1. Rotate all secrets.
2. Use the client's Supabase, Cloudinary, and Qdrant keys.
3. Apply migrations.
4. Create real manufacturer/store/jeweller rows.
5. Configure SMTP for Supabase Auth.
6. Configure `SMTP_*` for order emails if needed.
7. Upload real product images.
8. Run `pnpm.cmd typecheck`.
9. Run `pnpm.cmd build`.
10. Run browser smoke tests:
    - `/manufacturer/login`
    - `/store/login`
    - `/jeweller/manufacturer-catalog`
    - `/jeweller/b2b-orders/new`
    - `/manufacturer/orders/:id`
    - `/products`
    - `/search/image`
    - `/cart`
    - `/checkout`

## 11. Troubleshooting

Policy already exists:

```text
Run 0005_b2b_repair_existing.sql, then rerun 0005_b2b_platform.sql.
```

`sku` column missing:

```text
Run 0005_b2b_repair_existing.sql, then rerun the B2B seed block.
```

Image search fails:

```text
Start embedder on 8001 and reindex products.
```

Store login works but jeweller pages redirect:

```text
Check stores.jeweller_id and lm_store cookie.
```

Cloudinary upload fails:

```text
Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
```

Qdrant fails:

```text
Check QDRANT_URL, QDRANT_API_KEY, and collection names.
```
