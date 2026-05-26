# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What LuxeMatch is

A **shop-installed** AI jewellery platform — one install serves one jeweller's inventory on a device in their physical store. Customers walk up and browse, search by photo, try jewellery on in 2D AR. Staff unlock a back-office on the **same device** with a PIN to manage inventory and see analytics. The cloud (Supabase, Qdrant, Cloudinary, the Python embedder) is **shared across all shops**; tenancy is enforced by `jeweller_id` on every row, payload, and folder.

`plan.txt` is the canonical execution plan and explains the why behind every architectural decision. Read it before making cross-cutting changes. `README.md` is **out of date** — prefer plan.txt and the code.

## Commands

```bash
pnpm dev                  # Next.js dev server only (apps/web on :3000)
pnpm typecheck            # tsc --noEmit across the whole workspace
pnpm build                # build all packages + Next.js production build
pnpm lint                 # eslint per-workspace
pnpm format               # prettier write
pnpm format:check         # prettier check

pnpm provision-shop       # interactive: creates a new shop's jeweller row,
                          # writes SHOP_JEWELLER_ID + cookie secret + PIN hash
                          # to apps/web/.env.local
pnpm reindex --jeweller-id=<uuid>   # backfill OpenCLIP embeddings into Qdrant
pnpm reindex --all                   # reindex every jeweller
```

Three processes are needed for full end-to-end:

1. **Python embedder** (`apps/embedder`) — `python -m uvicorn embedder:app --port 8001` from inside its venv. Run `pip install -r requirements.txt` once. First boot downloads ~350 MB of OpenCLIP weights to `~/.cache/huggingface/`. Use `python -m uvicorn`, not bare `uvicorn`, so the venv's interpreter is used.
2. **Next.js** — `pnpm dev` from repo root.
3. **Cloud services** — Supabase, Qdrant Cloud, Cloudinary. The dev `.env.local` already points at these.

When the dev server returns 404s for every chunk after a config change: `rm -rf apps/web/.next && pnpm dev`. Next.js sometimes leaves a stale manifest after `next.config.ts` edits or workspace changes.

## Three running stacks, three different worlds

| Concern | Lives in | Notes |
|---|---|---|
| Browser + Hono BFF | `apps/web` | One Vercel deployment, one Next.js process. Hono is mounted at `app/api/[[...route]]/route.ts`. |
| OpenCLIP inference | `apps/embedder` | FastAPI Python sidecar. The TS side talks to it over HTTP via `EMBEDDER_URL`. Same model + dim as `Jewellery_AI`: ViT-B-32 / laion2b_s34b_b79k / 512-d. |
| Shared infra | Supabase, Qdrant Cloud, Cloudinary | Multi-tenant. **Filtering by `jeweller_id` is the only thing that keeps one shop from reading another's data.** |

## Workspace shape

```
apps/
  web/         # Next.js 15 App Router + Hono BFF (the product)
  embedder/    # Python FastAPI service (OpenCLIP)

packages/
  ar-engine/   # MediaPipe + Three.js AR engine, ported from
               # ../jewellery-ar-service/frontend/app.js
  cloudinary/  # Signed-upload contract; per-jeweller folders
  config/      # zod-validated env. Throws at module load if anything missing
  db/          # Supabase client + tenant-scoped query helpers
  embeddings/  # Thin TS client for apps/embedder (text/image/hybrid)
  intelligence # Phase 9.5 inventory recommendations (scaffolded)
  qdrant/      # Single collection `luxematch_products`, jeweller-filtered search
  tenant/      # SHOP_JEWELLER_ID + PIN cookie. Edge-safe entry + Node /server entry.
  types/       # Cross-package zod schemas + inferred types
  ui/          # Shared shadcn re-exports

supabase/migrations/0001_init.sql     # Full schema. RLS enabled; service role bypasses.
supabase/seed.sql                     # Demo jeweller + 12 products + 3 try-on assets
                                      # PIN = 123456 (dev only — hash committed)
scripts/
  provision-shop.ts                   # Per-device install setup
  reindex.ts                          # OpenCLIP → Qdrant backfill
```

## Tenancy enforcement (the most important invariant)

Every read and write goes through these layers and **must** end up filtered by the device's `SHOP_JEWELLER_ID`. If you're adding a new route, helper, or query, check each:

1. **Env** — `SHOP_JEWELLER_ID` is set once per device by `pnpm provision-shop`. Read via `getShopJewellerId()` from `@luxematch/tenant`.
2. **Hono middleware** — `tenantMiddleware` (in `apps/web/lib/api/middleware.ts`) resolves it on every request and sets `c.set('shopJewellerId', id)`. Every route handler should pull from the context, never from the request body or query string.
3. **DB helpers** — every query helper in `@luxematch/db` takes `jewellerId: string` as its first argument. There is no implicit "any jeweller" path. The Supabase service-role key bypasses RLS, so filtering is the *only* protection.
4. **Qdrant** — `searchByVector()` force-merges `{ key: 'jeweller_id', match: { value: jewellerId } }` into the must-filter. Callers cannot opt out. Every point's payload carries `jeweller_id` and that field is indexed.
5. **Cloudinary** — uploads are signed with a server-built folder path `luxematch/<jewellerId>/<bucket>/`. The client cannot override the folder. Deletes verify the `publicId` prefix matches the requesting shop.
6. **Mutations** — anything that writes goes through `pinGuard` in `apps/web/lib/api/middleware.ts`. The PIN cookie is HMAC-signed with `LM_PIN_COOKIE_SECRET` using Web Crypto (Edge-safe).

## The two PIN cookie paths (and why they're split)

`@luxematch/tenant` has two entrypoints:

- `@luxematch/tenant` (default) — **Edge-safe**. Cookie sign/verify use `crypto.subtle` (Web Crypto). Imported by `apps/web/middleware.ts` and any client/Edge code.
- `@luxematch/tenant/server` — **Node-only**. `node:crypto` for scrypt PIN hashing. Imported by API routes and `scripts/provision-shop.ts`.

Mixing these up causes the Next.js build to choke on `node:crypto` showing up in an Edge bundle. The split exists *because* this exact bug bit the build during Phase 1.

## AR engine math (don't fight the conventions)

`packages/ar-engine` is a TypeScript port of `../jewellery-ar-service/frontend/app.js`. Several details look weird but are deliberate:

- **Y-down orthographic camera** in Three.js. `y * height` maps directly to screen pixels with origin at top-left. This inverts the sign convention of Z-rotation versus normal Three.js — `atan2(dy, dx) + π/2` is correct *without* a leading negation. If a rotation looks mirrored, do not flip the sign; check whether you accidentally added one.
- **`mirrorLandmarks()` runs ONCE at the source** (in the rAF loop), before smoothing. The video is CSS-mirrored, the canvas is not, so all overlay math must work in display-space. Doing this twice or in the wrong order makes the OneEuro filter history snap between frame halves and the overlay jitters.
- **Selective landmark smoothing** — `FACE_LM_USED`, `HAND_LM_USED`, `POSE_LM_USED` shortlist the ~7 indices the math actually consumes. Smoothing all 500+ face landmarks was the original "tracks fast but positions slow" bug. Don't smooth more.
- **Visible-bounds anchoring** — `computeAlphaBounds` finds the non-transparent pixel bbox of the PNG. Each jewellery type anchors at a specific point on that bbox (earrings at top-center, necklace 5% below top to skip the clasp, rings/bangles at visible center). If overlays look "floaty above the body", the anchor logic in `renderer.ts` is what to inspect.
- **`packages/ar-engine/src/preview.ts`** mirrors the live renderer's anchor/scale/rotation math for the calibration tool's static preview. **Keep them in sync** — drift between live and preview means the jeweller calibrates against a lie.

## Common pitfalls

- **Don't write to `node:crypto` from middleware** — see PIN cookie split above.
- **Don't use `default` exports from `@luxematch/tenant`** that re-export server bits; the package boundary matters for bundling.
- **Server secrets in `NEXT_PUBLIC_*` vars are forbidden**. `packages/config` schema separates `serverEnv` (`SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `LM_PIN_COOKIE_SECRET`, `QDRANT_API_KEY`, `EMBEDDER_API_KEY`) from `clientEnv`. If you reach for `process.env.X` directly, you're probably skipping the schema.
- **Supabase joins return relations as arrays**, even when cardinality is one. `packages/db/src/media.ts` has `extractJewellerId()` to handle both shapes — copy that pattern for new joined queries.
- **Generated columns must be IMMUTABLE in Postgres.** The schema uses a trigger (`products_set_search_vector_trg`) instead of a `GENERATED ALWAYS AS` column because Supabase's planner rejected `to_tsvector('english', …)` as non-immutable. Don't try to "fix" the trigger back into a generated column.
- **`tsx --env-file=apps/web/.env.local`** is how `pnpm reindex` loads env vars for scripts. New CLI scripts that need Supabase/Qdrant access should follow the same pattern.

## Where each phase lives

The build follows phases from `plan.txt`. As of writing: Phases -1 through 6 are landed; Phase 7 (jeweller try-on asset calibration) is in progress. Routes and packages are pre-staged for later phases — empty/placeholder files (e.g. `packages/intelligence/src/index.ts`) are deliberately there. Don't delete them assuming they're dead code; check plan.txt first.
