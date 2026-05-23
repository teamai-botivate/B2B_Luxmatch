# LuxeMatch Platform

Production-grade jewellery discovery platform.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Hono mounted inside Next.js at `app/api/[[...route]]/route.ts`
- **Data:** Supabase Postgres, Cloudinary, Qdrant Cloud
- **AI:** Gemini Embedding 2 (unified image+text, 768-dim MRL)
- **AR:** MediaPipe `@mediapipe/tasks-vision` in the browser, Canvas 2D overlays
- **Deploy:** Vercel (frontend + Hono BFF in the same deployment)

## Repository layout

```
luxematch-platform/
  apps/
    web/                Next.js 15 App Router + Hono BFF
  packages/
    ui/                 Shared shadcn/ui component wrappers
    types/              Shared TypeScript types
    config/             Env validation helpers
    db/                 Supabase client factory + typed queries
    cloudinary/         Signed upload URL helper
    qdrant/             Qdrant client wrapper
    embeddings/         Gemini Embedding 2 client wrapper
  supabase/
    migrations/
  docs/
    design-notes/
  scripts/
```

## Local setup

Requirements:

- Node.js >= 20
- pnpm >= 10

```bash
# 1. Install all workspace deps
pnpm install

# 2. Copy the env template and fill in real values
cp apps/web/.env.local.example apps/web/.env.local

# 3. Typecheck everything
pnpm typecheck

# 4. Build the full workspace
pnpm build

# 5. Start the Next.js dev server (apps/web only)
pnpm dev
# → http://localhost:3000
# → http://localhost:3000/api/health (Hono BFF)
```

`pnpm dev` runs only `@luxematch/web` because that is the single application
in the monorepo; the other workspace entries are libraries consumed by it.

## Scripts

- `pnpm dev` — run all dev servers in parallel
- `pnpm build` — build all packages and apps
- `pnpm typecheck` — TypeScript checks across the workspace
- `pnpm lint` — lint across the workspace
- `pnpm format` — Prettier write
- `pnpm format:check` — Prettier check

## Status

Phase 0 — monorepo scaffold. No product features implemented yet.
