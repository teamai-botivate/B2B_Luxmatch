-- ════════════════════════════════════════════════════════════════════════════
-- LuxeMatch — initial schema (Phase 3)
--
-- Multi-tenant by jeweller_id. Every product / collection / event row carries
-- the jeweller_id it belongs to. The Hono API enforces tenancy by forcing
-- jeweller_id = ctx.shopJewellerId on every read and write — RLS is enabled
-- but uses permissive policies for now because the server connects with the
-- service role key. Phase 12 tightens RLS once Supabase Auth ships.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- Helper: updated_at trigger
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- categories — global, not per-jeweller (rings, earrings, …)
-- ────────────────────────────────────────────────────────────────────────────

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  int  not null default 0
);

-- ────────────────────────────────────────────────────────────────────────────
-- brands — global (a jeweller may stock multiple brands)
-- ────────────────────────────────────────────────────────────────────────────

create table public.brands (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique,
  name      text not null,
  logo_url  text
);

-- ────────────────────────────────────────────────────────────────────────────
-- jewellers — one row per installed shop
--
-- pin_hash / pin_salt are produced by @luxematch/tenant/server hashPin().
-- (The hash already embeds the salt; pin_salt is kept as a separate column
-- only so future rotation can store the previous salt distinctly. For now
-- it mirrors what hashPin embeds.)
-- ────────────────────────────────────────────────────────────────────────────

create table public.jewellers (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  store_name            text not null,
  city                  text,
  gstin                 text,
  owner_name            text,
  phone                 text,
  logo_url              text,
  pin_hash              text not null,
  pin_salt              text not null default '',
  idle_reset_enabled    boolean not null default true,
  idle_reset_seconds    int     not null default 90,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger jewellers_touch_updated_at
  before update on public.jewellers
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- products
--
-- The (jeweller_id, slug) and (jeweller_id, sku) compound uniques let two
-- different shops coexist with the same slug or SKU — important because each
-- jeweller curates their own catalog and may reuse common identifiers.
-- ────────────────────────────────────────────────────────────────────────────

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  jeweller_id     uuid not null references public.jewellers(id) on delete cascade,
  slug            text not null,
  sku             text,
  name            text not null,
  description     text,
  category_id     uuid references public.categories(id),
  brand_id        uuid references public.brands(id),
  metal           text,
  purity          text,
  gemstones       text[]    not null default '{}',
  style_tags      text[]    not null default '{}',
  occasion_tags   text[]    not null default '{}',
  price_min       numeric(12,2),
  price_max       numeric(12,2),
  currency        text      not null default 'INR',
  weight_grams    numeric(8,2),
  stock_count     int       not null default 0,
  is_active       boolean   not null default true,
  is_featured     boolean   not null default false,
  -- search_vector is maintained by a BEFORE INSERT/UPDATE trigger
  -- (see public.products_set_search_vector below). Postgres won't accept
  -- to_tsvector() inside a STORED generated column on Supabase's managed
  -- Postgres because the planner can't prove it immutable across all
  -- versions/extensions. Trigger-maintained tsvector is the standard
  -- workaround and has identical query performance.
  search_vector   tsvector,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (jeweller_id, slug),
  unique (jeweller_id, sku)
);

create or replace function public.products_set_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector := to_tsvector(
    'english',
    coalesce(new.name, '')        || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(new.metal, '')       || ' ' ||
    coalesce(array_to_string(new.gemstones, ' '), '') || ' ' ||
    coalesce(array_to_string(new.style_tags, ' '), '') || ' ' ||
    coalesce(array_to_string(new.occasion_tags, ' '), '')
  );
  return new;
end;
$$;

create trigger products_set_search_vector_trg
  before insert or update on public.products
  for each row execute function public.products_set_search_vector();

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create index products_search_vector_idx on public.products using gin (search_vector);
create index products_jeweller_active_idx on public.products (jeweller_id, is_active);
create index products_jeweller_category_idx on public.products (jeweller_id, category_id);
create index products_jeweller_featured_idx on public.products (jeweller_id, is_featured);

-- ────────────────────────────────────────────────────────────────────────────
-- product_images
-- ────────────────────────────────────────────────────────────────────────────

create table public.product_images (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  cloudinary_public_id  text not null,
  url                   text not null,
  width                 int,
  height                int,
  alt                   text,
  sort_order            int  not null default 0,
  is_primary            boolean not null default false,
  created_at            timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ────────────────────────────────────────────────────────────────────────────
-- product_tryon_assets
-- ────────────────────────────────────────────────────────────────────────────

create table public.product_tryon_assets (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products(id) on delete cascade,
  cloudinary_public_id  text,
  asset_url             text not null,
  jewellery_type        text not null check (jewellery_type in (
    'necklace','earring_left','earring_right',
    'ring_index','ring_middle','bangle'
  )),
  pivot_x               numeric(5,3) not null default 0.5,
  pivot_y               numeric(5,3) not null default 0.5,
  x_offset              numeric(8,3) not null default 0,
  y_offset              numeric(8,3) not null default 0,
  scale_multiplier      numeric(5,3) not null default 1.0,
  rotation_offset_deg   numeric(6,2) not null default 0,
  width_mm              numeric(6,2),
  height_mm             numeric(6,2),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger product_tryon_assets_touch_updated_at
  before update on public.product_tryon_assets
  for each row execute function public.touch_updated_at();

create index product_tryon_assets_product_idx
  on public.product_tryon_assets (product_id, is_active);

-- ────────────────────────────────────────────────────────────────────────────
-- collections — per-jeweller curated bundles
-- ────────────────────────────────────────────────────────────────────────────

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  jeweller_id uuid not null references public.jewellers(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  image_url   text,
  sort_order  int  not null default 0,
  unique (jeweller_id, slug)
);

create table public.product_collections (
  product_id    uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- product_embeddings — bookkeeping that mirrors Qdrant point IDs
-- ────────────────────────────────────────────────────────────────────────────

create table public.product_embeddings (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null unique references public.products(id) on delete cascade,
  qdrant_point_id   text not null unique,
  embedding_model   text not null,
  dimensions        int  not null,
  content_hash      text,
  indexed_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- product_views — customer browsed a product detail page
-- ────────────────────────────────────────────────────────────────────────────

create table public.product_views (
  id           uuid primary key default gen_random_uuid(),
  jeweller_id  uuid not null references public.jewellers(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  session_id   text,
  created_at   timestamptz not null default now()
);

create index product_views_jeweller_created_idx
  on public.product_views (jeweller_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- product_sales — jeweller taps "mark sold" after a purchase
--                 Primary signal for Phase 9.5 inventory intelligence.
-- ────────────────────────────────────────────────────────────────────────────

create table public.product_sales (
  id                   uuid primary key default gen_random_uuid(),
  jeweller_id          uuid not null references public.jewellers(id) on delete cascade,
  product_id           uuid not null references public.products(id) on delete restrict,
  quantity             int  not null default 1,
  sold_price           numeric(12,2),
  sold_at              timestamptz not null default now(),
  customer_age_band    text,
  customer_gender      text,
  occasion             text,
  notes                text
);

create index product_sales_jeweller_sold_idx
  on public.product_sales (jeweller_id, sold_at desc);
create index product_sales_jeweller_product_idx
  on public.product_sales (jeweller_id, product_id);

-- ────────────────────────────────────────────────────────────────────────────
-- search_events
-- ────────────────────────────────────────────────────────────────────────────

create table public.search_events (
  id           uuid primary key default gen_random_uuid(),
  jeweller_id  uuid not null references public.jewellers(id) on delete cascade,
  query_text   text,
  query_type   text not null check (query_type in ('text','image','hybrid','occasion')),
  result_count int,
  latency_ms   numeric,
  session_id   text,
  created_at   timestamptz not null default now()
);

create index search_events_jeweller_created_idx
  on public.search_events (jeweller_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- tryon_events
-- ────────────────────────────────────────────────────────────────────────────

create table public.tryon_events (
  id              uuid primary key default gen_random_uuid(),
  jeweller_id     uuid not null references public.jewellers(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  jewellery_type  text,
  confidence      numeric,
  device_type     text,
  session_id      text,
  created_at      timestamptz not null default now()
);

create index tryon_events_jeweller_created_idx
  on public.tryon_events (jeweller_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- analytics_events — catch-all for the trackEvent client lib
-- ────────────────────────────────────────────────────────────────────────────

create table public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  jeweller_id  uuid not null references public.jewellers(id) on delete cascade,
  event_type   text not null,
  product_id   uuid references public.products(id) on delete set null,
  session_id   text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index analytics_events_jeweller_created_idx
  on public.analytics_events (jeweller_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- inventory_signals — nightly rollup (filled by Phase 9.5)
-- ────────────────────────────────────────────────────────────────────────────

create table public.inventory_signals (
  id           uuid primary key default gen_random_uuid(),
  jeweller_id  uuid not null references public.jewellers(id) on delete cascade,
  category_id  uuid references public.categories(id),
  metal        text,
  occasion     text,
  window_start date not null,
  window_end   date not null,
  views        int  not null default 0,
  tryons       int  not null default 0,
  sales        int  not null default 0,
  revenue      numeric(14,2) not null default 0,
  computed_at  timestamptz not null default now(),
  unique (jeweller_id, category_id, metal, occasion, window_start)
);

create index inventory_signals_jeweller_window_idx
  on public.inventory_signals (jeweller_id, window_start desc);

-- ────────────────────────────────────────────────────────────────────────────
-- pin_audit_events — every unlock attempt (Phase 12 hardens; ships now for
--                    visibility from day 1)
-- ────────────────────────────────────────────────────────────────────────────

create table public.pin_audit_events (
  id           uuid primary key default gen_random_uuid(),
  jeweller_id  uuid not null references public.jewellers(id) on delete cascade,
  attempt_ip   text,
  success      boolean not null,
  created_at   timestamptz not null default now()
);

create index pin_audit_events_jeweller_created_idx
  on public.pin_audit_events (jeweller_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- Row-level security
--
-- Enable RLS on every table so the schema is "secure by default". The server
-- connects with the service role key which bypasses RLS, so the API works
-- today. Phase 12 adds restrictive policies for the anon role and any future
-- staff role.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.categories             enable row level security;
alter table public.brands                  enable row level security;
alter table public.jewellers               enable row level security;
alter table public.products                enable row level security;
alter table public.product_images          enable row level security;
alter table public.product_tryon_assets    enable row level security;
alter table public.collections             enable row level security;
alter table public.product_collections     enable row level security;
alter table public.product_embeddings      enable row level security;
alter table public.product_views           enable row level security;
alter table public.product_sales           enable row level security;
alter table public.search_events           enable row level security;
alter table public.tryon_events            enable row level security;
alter table public.analytics_events        enable row level security;
alter table public.inventory_signals       enable row level security;
alter table public.pin_audit_events        enable row level security;
