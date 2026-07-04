# Client Setup Guide

Fresh installation of LuxeMatch for a new client (jeweller/manufacturer). No demo/dummy data.

---

## Overview

LuxeMatch has three components to set up:

1. **Supabase** — database + auth (client gets their own project)
2. **Cloudinary** — image storage (client gets their own account)
3. **Web App** — hosted on Render (or client's own server)

The embedder (Hugging Face) and Qdrant (vector search) can be shared or per-client depending on the plan.

---

## Step 1: Supabase Setup (Client's Own Project)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region closest to the client (Mumbai for India)
3. Set a strong database password — save it
4. Wait for project to provision (~2 min)

### 1.2 Get Credentials
From the Supabase dashboard → Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

> **Security:** Service role key bypasses RLS — never expose in frontend.

### 1.3 Apply Migrations (in order)

Go to Supabase Dashboard → SQL Editor → paste and run each file:

```
1. supabase/migrations/0001_init.sql
2. supabase/migrations/0002_ecommerce.sql
3. supabase/migrations/0003_security_advisor.sql
4. supabase/migrations/0004_customer_avatar.sql
5. supabase/migrations/0005_b2b_platform.sql
6. supabase/migrations/0006_guest_orders.sql
7. supabase/migrations/0007_tryon_assets.sql
```

Run them **one by one in order**. Each must succeed before running the next.

> If you get "policy already exists" error on 0006, run this patch first:
> ```sql
> DROP POLICY IF EXISTS "store can view own guest orders" ON guest_orders;
> DROP POLICY IF EXISTS "store can view own guest order items" ON guest_order_items;
> DROP POLICY IF EXISTS "store can view own guest order status" ON guest_order_status_history;
> ```
> Then re-run 0006.

### 1.4 Create First Manufacturer Account

In SQL Editor, run:

```sql
-- Replace these values for your client
INSERT INTO manufacturers (name, email, password_hash, is_active)
VALUES (
  'Your Manufacturer Name',
  'manufacturer@example.com',
  '$2a$10$HASH_HERE',  -- see Step 1.5 below
  true
);
```

### 1.5 Generate bcrypt Password Hash

On any machine with Node.js:

```bash
node -e "require('bcryptjs').hash('YourPassword123', 10).then(h => console.log(h))"
```

Copy the output hash and use it in the INSERT above.

### 1.6 Configure Email (for OTP / Auth)

Supabase Dashboard → Authentication → Settings → SMTP:

```
Host: smtp.gmail.com (or Resend/Brevo)
Port: 587
User: your-email@gmail.com
Password: App Password (not Gmail login password)
Sender: noreply@yourdomain.com
```

> For Gmail: Google Account → Security → App Passwords → Create one for "Mail"

---

## Step 2: Cloudinary Setup

### 2.1 Create Account
1. Go to [cloudinary.com](https://cloudinary.com) → Sign Up (free tier works to start)
2. Go to Dashboard → copy credentials:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2.2 Create Upload Presets (Optional)
Cloudinary will auto-create folders when the app uploads. No manual folder setup needed.

---

## Step 3: Environment Variables

Create `apps/web/.env.local` with all values:

```bash
# ─── Supabase ─────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# ─── Cloudinary ───────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>

# ─── Auth Secrets (generate with: openssl rand -hex 32) ───
LM_PIN_COOKIE_SECRET=<min 32 chars random string>
MANUFACTURER_COOKIE_SECRET=<min 32 chars random string, DIFFERENT from above>

# ─── Store / Kiosk ─────────────────────────────────────────
# Leave blank for B2B multi-store mode (recommended)
# Set to a jeweller UUID only for single-store kiosk mode
SHOP_JEWELLER_ID=

# ─── Cookie TTLs (optional, these are defaults) ───────────
LM_PIN_COOKIE_TTL_SECONDS=14400
LM_MANUFACTURER_COOKIE_TTL_SECONDS=28800
LM_STORE_COOKIE_TTL_SECONDS=28800

# ─── Embedder (for visual search) ─────────────────────────
EMBEDDER_URL=https://botivate2026-embedder.hf.space

# ─── Qdrant (vector search) ───────────────────────────────
QDRANT_URL=https://your-qdrant-cluster.qdrant.io
QDRANT_API_KEY=<qdrant api key>
QDRANT_COLLECTION=luxematch_products
QDRANT_MANUFACTURER_COLLECTION=luxematch_manufacturer_products

# ─── CORS (production only) ───────────────────────────────
ALLOWED_ORIGINS=https://yourdomain.com

# ─── Node env ─────────────────────────────────────────────
NODE_ENV=development
```

### Generate Secrets

```bash
# Run twice — use first for LM_PIN_COOKIE_SECRET, second for MANUFACTURER_COOKIE_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 4: Create First Store

After the manufacturer logs in at `/manufacturer/login`:

1. Go to **Stores** tab
2. Click **Add Store**
3. Fill: Store name, Email, Password, City
4. Click Save

This creates:
- A row in `stores` table
- A row in `jewellers` table (auto-linked)
- The store can now log in at `/store/login`

---

## Step 5: Set Up PIN for Store Dashboard

After store logs in → `/jeweller/unlock`:

The default PIN is set in the `jewellers` table. To set a new PIN:

```bash
# In the project directory
pnpm provision-shop
```

This interactive script will ask for jeweller ID and set the PIN.

Alternatively, generate a PIN hash:

```bash
node -e "
const crypto = require('crypto');
const PIN = '123456'; // change this
const salt = crypto.randomBytes(16).toString('hex');
crypto.scrypt(PIN, salt, 64, (err, key) => {
  console.log('pin_hash:', key.toString('hex'));
  console.log('pin_salt:', salt);
});
"
```

Then run in Supabase SQL Editor:

```sql
UPDATE jewellers
SET pin_hash = '<hash>', pin_salt = '<salt>'
WHERE id = '<jeweller_id>';
```

---

## Step 6: Add First Products (Manufacturer)

1. Log in at `/manufacturer/login`
2. Go to **Products** → **Add Product**
3. Fill in: Name, Category, Metal, Price, Description
4. Upload product image (JPEG or PNG, min 800px)
5. Set status to **Active**
6. For AR try-on: upload transparent PNG (see `TRYON_IMAGE_GUIDE.md`)

After uploading, the product appears in the store catalog automatically.

---

## Step 7: Verify Everything Works

### Checklist
- [ ] Manufacturer can log in at `/manufacturer/login`
- [ ] Manufacturer can add a product with image
- [ ] Store can log in at `/store/login`
- [ ] Store sees manufacturer products at `/jeweller/manufacturer-catalog`
- [ ] Store can place a B2B order
- [ ] Manufacturer can see and advance the B2B order
- [ ] Customer kiosk at `/` shows products
- [ ] Guest checkout at `/kiosk-checkout` works
- [ ] Manufacturer sees kiosk orders at `/manufacturer/kiosk-orders`
- [ ] Portal selector at `/portal` works

---

## Step 8: Deploy to Render (Production)

### 8.1 Render Setup
1. Create account at [render.com](https://render.com)
2. New Web Service → Connect GitHub repo
3. **Build Command:** `pnpm install && pnpm build`
4. **Start Command:** `pnpm --filter @luxematch/web exec next start -H 0.0.0.0 -p ${PORT:-3000}`
5. Or use the root `Dockerfile` directly (select "Docker" as environment)

### 8.2 Environment Variables on Render
Add all variables from Step 3 in Render Dashboard → Environment.

Additional production variables:
```
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.onrender.com
```

### 8.3 Health Check
Render health check path: `/api/health`

---

## Ongoing: Adding More Stores

Each new store the manufacturer creates:
1. Gets its own login credentials
2. Has an isolated jeweller tenant (separate inventory, orders, analytics)
3. Can have its own PIN for the in-store kiosk
4. Cannot see other stores' data

---

## Important Notes

### What's NOT included in a fresh setup
- No demo products
- No demo customers
- No demo orders
- No sample AR try-on assets

Everything starts blank. The manufacturer builds the catalog; stores place orders; customers visit the kiosk.

### Migrations must be applied before first use
The app will error if migrations are missing. Apply all 7 migration files in Supabase SQL Editor before the first login.

### MANUFACTURER_COOKIE_SECRET is required
Add this to Render env vars or manufacturer login will return 500. It must be at least 32 characters and different from `LM_PIN_COOKIE_SECRET`.

### Visual search requires the embedder
`/search/image` (camera search) needs `EMBEDDER_URL` to be set and reachable. Without it, text search and manual browsing still work.

---

## Support

For setup issues: team.ai@botivate.in

*Powered by Botivate · LuxMatch Platform*
