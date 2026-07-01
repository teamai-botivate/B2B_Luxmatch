# LuxeMatch

LuxeMatch is a B2B jewellery platform with a customer storefront, AR try-on, image search, e-commerce checkout, and a manufacturer-to-store ordering system.

## Actors

- **Manufacturer**: uploads wholesale designs, creates store accounts, receives B2B orders, marks orders delivered.
- **Store/Retailer**: logs in, browses manufacturer catalog, places B2B orders, sells fulfilled inventory to customers.
- **Customer**: browses store products, searches by image, tries AR, adds to cart, and checks out.

## Important Docs

- [SETUP.md](SETUP.md): client setup for Supabase, Cloudinary, Qdrant, env vars, migrations, and deployment.
- [USER_MANUAL.md](USER_MANUAL.md): complete user flow, buttons, credentials, auth, testing, and database data flow.
- [CLAUDE.md](CLAUDE.md): engineering architecture notes and current project status.

## Requirements

```powershell
node --version   # Node 20+
pnpm --version   # pnpm 10+
python --version # Python 3.10+ only for embedder/image search
```

Install dependencies:

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch
pnpm.cmd install
```

## Environment

Create:

```text
apps/web/.env.local
```

See [SETUP.md](SETUP.md) for the full env template.

Minimum services:

- Supabase project with migrations applied.
- Cloudinary keys for uploads.
- Qdrant keys for visual search.
- Optional local embedder on `http://localhost:8001` for image search.

## Run The Web App

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch
pnpm.cmd dev
```

Open:

```text
http://localhost:3000
```

Stop:

```text
Ctrl+C
```

## Run The Embedder

Only needed for native text/image/vector search.

```powershell
cd C:\Users\prabh\Desktop\LuxeMatch\apps\embedder
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn embedder:app --port 8001
```

The embedder Docker image uses **Python 3.10**.

Stop:

```text
Ctrl+C
```

Stop any process on ports `8000` or `8001`:

```powershell
$connections = Get-NetTCPConnection -LocalPort 8000,8001 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
$connections | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Typecheck And Build

```powershell
pnpm.cmd typecheck
pnpm.cmd build
```

## Docker

Build and run the web app container:

```powershell
docker build -t luxematch-web .
docker run --env-file apps/web/.env.local -p 3000:3000 luxematch-web
```

Build and run the embedder container:

```powershell
docker build -t luxematch-embedder -f apps/embedder/Dockerfile apps/embedder
docker run -p 8001:8001 luxematch-embedder
```

For Render, create two normal **Web Services** manually and select the Docker runtime:

- Web service: Dockerfile `./Dockerfile`, context/repository root.
- Embedder service: Dockerfile `./apps/embedder/Dockerfile`, Docker context `./apps/embedder`.
- The embedder image is pinned to `python:3.10-slim-bookworm`.

No Render Blueprint or `render.yaml` is required.

## Database Setup

Apply migrations in Supabase SQL Editor:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_ecommerce.sql
supabase/migrations/0003_security_advisor.sql
supabase/migrations/0004_customer_avatar.sql
supabase/migrations/0005_b2b_platform.sql
```

If an older B2B migration was partially applied:

```text
supabase/migrations/0005_b2b_repair_existing.sql
supabase/migrations/0005_b2b_platform.sql
```

For demo data, run:

```text
supabase/seed.sql
```

Or run only the B2B section starting at:

```sql
-- B2B demo data (DEV ONLY)
```

## Demo Credentials

| Actor | URL | Login |
|---|---|---|
| Manufacturer | `/manufacturer/login` | `admin@atplusjewellers.com` / `manufacturer123` |
| Store | `/store/login` | `store@aurumheritage.com` / `store123` |
| Staff PIN | `/jeweller/unlock` | `123456` |

## Common Test Flow

1. Manufacturer logs in at `/manufacturer/login`.
2. Manufacturer checks `/manufacturer/products`.
3. Store logs in at `/store/login`.
4. Store opens `/jeweller/manufacturer-catalog`.
5. Store clicks **Add** on products.
6. Store opens `/jeweller/b2b-orders/new`.
7. Store enters delivery address and clicks **Place B2B Order**.
8. Manufacturer opens `/manufacturer/orders`.
9. Manufacturer clicks **Confirm Order**, **Mark Packed**, **Mark Shipped**, then **Mark Delivered**.
10. Delivered products appear in store inventory.
11. Customer browses `/products`, uses `/search/image`, adds to cart, and checks out.

## Key Commands

```powershell
pnpm.cmd dev
pnpm.cmd typecheck
pnpm.cmd build
pnpm.cmd check-env
pnpm.cmd smoke-test
pnpm.cmd reindex --jeweller-id=00000000-0000-0000-0000-00000000d3e1
pnpm.cmd reindex --all
```

## Monorepo Layout

```text
apps/web          Next.js + Hono web app/API
apps/embedder     Python OpenCLIP embedder
packages/db       Supabase helpers
packages/qdrant   Qdrant vector helpers
packages/tenant   Auth cookies and tenant helpers
packages/cloudinary Cloudinary upload helpers
supabase/migrations Database migrations
scripts           setup, seed, reindex, smoke utilities
```
