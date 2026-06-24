'use client';

import type { Calibration, JewelleryType } from '@luxematch/ar-engine';
import type { ProductWithImages, TryOnProduct } from '@luxematch/db';
import { Camera, ChevronUp, RotateCcw, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ARViewport, type ARViewportHandle } from '@/components/ar/ARViewport';
import { trackEvent } from '@/lib/analytics';
import { CLOUDINARY_READY_SHOWCASE_AR_PRODUCTS } from '@/lib/showcase-ar-assets';

// Matches a v4 UUID — used to skip analytics product_id for showcase assets.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

type Asset = TryOnProduct['assets'][number];

type Selection = {
  productId: string;
  asset: Asset;
};

// A row in the "Browse all" list. The AR-ready subset is a subset of the
// catalogue; we tag every row with whether it has try-on assets so the UI can
// disable / explain when the user picks something we can't render yet.
type BrowseRow = {
  id: string;
  slug: string;
  name: string;
  category_label: string | null;
  primary_image_url: string | null;
  arReady: boolean;
  /** Available only when arReady. The first active asset, used on click. */
  asset: Asset | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function pickPrimaryAsset(p: TryOnProduct): Asset | null {
  return p.assets[0] ?? null;
}

function calibrationFrom(asset: Asset): Calibration {
  return {
    pivot_x: asset.pivot_x,
    pivot_y: asset.pivot_y,
    x_offset: asset.x_offset,
    y_offset: asset.y_offset,
    scale_multiplier: asset.scale_multiplier,
    rotation_offset_deg: asset.rotation_offset_deg,
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  necklace: 'Necklace',
  earring_left: 'Earrings',
  earring_right: 'Earrings',
  ring_index: 'Ring',
  ring_middle: 'Ring',
  bangle: 'Bangle',
};

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function TryOnPage() {
  const viewportRef = useRef<ARViewportHandle>(null);

  const [arProducts, setArProducts] = useState<TryOnProduct[] | null>(null);
  const [allProducts, setAllProducts] = useState<ProductWithImages[] | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseTab, setBrowseTab] = useState<'ar' | 'all'>('ar');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ── Initial data load: AR-ready first (we need it for the bottom strip),
  //    full catalogue lazily when the user opens "Browse all".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tryon/products', { cache: 'no-store' });
        const json = (await res.json()) as
          | { data: { products: TryOnProduct[] } }
          | { error: { message: string } };
        if (cancelled) return;
        if ('error' in json) {
          setLoadError(json.error.message);
          return;
        }
        setArProducts([...CLOUDINARY_READY_SHOWCASE_AR_PRODUCTS, ...json.data.products]);
      } catch (e) {
        if (!cancelled) setArProducts(CLOUDINARY_READY_SHOWCASE_AR_PRODUCTS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAllProducts = useCallback(async () => {
    if (allProducts !== null) return;
    try {
      const res = await fetch('/api/products?limit=200', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('application/json')) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Catalogue failed with ${res.status}`);
      }
      const json = (await res.json()) as
        | { data: { products: ProductWithImages[]; total: number } }
        | { error: { message: string } };
      if ('error' in json) {
        setLoadError(json.error.message);
        return;
      }
      setAllProducts(json.data.products);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load catalogue');
    }
  }, [allProducts]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const onSelect = useCallback(async (productId: string, asset: Asset) => {
    setSelection({ productId, asset });
    setBrowseOpen(false);
    setToast(null);
    // Only attach a real UUID productId; showcase assets use non-UUID ids.
    trackEvent('tryon_start', {
      productId: UUID_RE.test(productId) ? productId : undefined,
      metadata: { jewellery_type: asset.jewellery_type, device_type: 'web' },
    });
    try {
      await viewportRef.current?.setProduct(
        asset.asset_url,
        asset.jewellery_type as JewelleryType,
        calibrationFrom(asset),
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load try-on asset');
    }
  }, []);

  async function onCapture() {
    const blob = await viewportRef.current?.capture();
    if (!blob) return;
    trackEvent('tryon_capture', {
      productId: selection && UUID_RE.test(selection.productId) ? selection.productId : undefined,
      metadata: { jewellery_type: selection?.asset.jewellery_type },
    });
    setCaptureUrl(URL.createObjectURL(blob));
  }

  function onReset() {
    setSelection(null);
    setCaptureUrl(null);
  }

  // ── Rows for the browser drawer ───────────────────────────────────────────

  const browseRows: BrowseRow[] = useMemo(() => {
    if (browseTab === 'ar') {
      return (arProducts ?? []).map((p) => {
        const asset = pickPrimaryAsset(p);
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          category_label: asset ? CATEGORY_LABELS[asset.jewellery_type] ?? 'Try-on' : null,
          primary_image_url: p.primary_image_url,
          arReady: true,
          asset,
        };
      });
    }
    // 'all' tab — tag products with whether they have a try-on asset.
    const arById = new Map<string, Asset>();
    for (const p of arProducts ?? []) {
      const asset = pickPrimaryAsset(p);
      if (asset) arById.set(p.id, asset);
    }
    return (allProducts ?? []).map((p) => {
      const asset = arById.get(p.id) ?? null;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        category_label: asset ? CATEGORY_LABELS[asset.jewellery_type] ?? 'Try-on' : null,
        primary_image_url: p.primary_image_url,
        arReady: asset !== null,
        asset,
      };
    });
  }, [browseTab, arProducts, allProducts]);

  const filteredRows = useMemo(() => {
    if (!categoryFilter) return browseRows;
    return browseRows.filter((r) => r.category_label === categoryFilter);
  }, [browseRows, categoryFilter]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const r of browseRows) if (r.category_label) set.add(r.category_label);
    return Array.from(set).sort();
  }, [browseRows]);

  function onRowClick(row: BrowseRow) {
    if (!row.arReady || !row.asset) {
      setToast(`"${row.name}" doesn't have a try-on asset yet.`);
      return;
    }
    void onSelect(row.id, row.asset);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0f0f1a]" data-testid="try-on-page">
      {/* Top bar — compact so the viewport gets the real estate. */}
      <header className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <Link href="/" aria-label="Close try-on">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20">
            <X className="h-4 w-4 text-white" />
          </button>
        </Link>
        <div className="text-sm font-medium text-white/80">Virtual Try-On</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onCapture}
            disabled={!selection}
            className="flex h-9 items-center gap-2 rounded-full bg-[#C9A84C] px-4 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Camera className="h-4 w-4" /> Capture
          </button>
        </div>
      </header>

      {/* Viewport takes all remaining vertical space. */}
      <div className="relative flex-1 px-2 pb-2 min-h-0">
        <ARViewport ref={viewportRef} className="h-full w-full" />
      </div>

      {/* Bottom strip — AR-ready products only, horizontal scroll, compact. */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2">
        {loadError ? (
          <div className="mb-2 rounded-xl bg-red-500/80 px-4 py-2 text-sm text-white">{loadError}</div>
        ) : null}

        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/50">AR-ready</span>
            {arProducts ? (
              <span className="rounded-full bg-[#C9A84C]/20 px-2 py-0.5 text-[10px] font-medium text-[#C9A84C]">
                {arProducts.length} items
              </span>
            ) : null}
          </div>
          <button
            onClick={() => {
              setBrowseOpen(true);
              void loadAllProducts();
            }}
            className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            Browse all <ChevronUp className="h-3 w-3" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {arProducts === null && !loadError ? (
            <div className="text-xs text-white/60">Loading…</div>
          ) : null}

          {arProducts && arProducts.length === 0 && (
            <div className="text-xs text-white/60">
              No try-on-ready pieces yet. Add try-on PNGs in the jeweller dashboard.
            </div>
          )}

          {arProducts?.map((p) => {
            const asset = pickPrimaryAsset(p);
            const active = selection?.productId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => asset && void onSelect(p.id, asset)}
                disabled={!asset}
                className={`flex w-20 flex-shrink-0 flex-col items-center gap-1 rounded-lg border p-1.5 text-left transition ${
                  active
                    ? 'border-[#C9A84C] bg-white/10'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                } disabled:cursor-not-allowed disabled:opacity-40`}
                title={p.name}
              >
                <div className="relative h-12 w-full overflow-hidden rounded-md bg-black/40">
                  {p.primary_image_url ? (
                    <Image
                      src={p.primary_image_url}
                      alt={p.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="w-full truncate text-[9px] leading-tight text-white/90">
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Browse all drawer */}
      {browseOpen && (
        <BrowseDrawer
          tab={browseTab}
          setTab={(t) => {
            setBrowseTab(t);
            if (t === 'all') void loadAllProducts();
            setCategoryFilter(null);
          }}
          categories={availableCategories}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          rows={filteredRows}
          onClose={() => setBrowseOpen(false)}
          onRowClick={onRowClick}
          loadingAr={arProducts === null}
          loadingAll={browseTab === 'all' && allProducts === null}
          arCount={arProducts?.length ?? 0}
          allCount={allProducts?.length ?? 0}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-32 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-[#C9A84C]" />
            {toast}
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

      {captureUrl && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="flex max-w-md flex-col gap-4">
            <Image
              src={captureUrl}
              alt="Captured look"
              width={1280}
              height={720}
              className="rounded-xl"
              unoptimized
            />
            <div className="flex justify-end gap-2">
              <a
                href={captureUrl}
                download="luxematch-try-on.png"
                className="rounded-full bg-[#C9A84C] px-4 py-2 text-sm font-medium text-black"
              >
                Save
              </a>
              <button
                onClick={() => setCaptureUrl(null)}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Browse drawer
// ────────────────────────────────────────────────────────────────────────────

function BrowseDrawer({
  tab,
  setTab,
  categories,
  categoryFilter,
  setCategoryFilter,
  rows,
  onClose,
  onRowClick,
  loadingAr,
  loadingAll,
  arCount,
  allCount,
}: {
  tab: 'ar' | 'all';
  setTab: (t: 'ar' | 'all') => void;
  categories: string[];
  categoryFilter: string | null;
  setCategoryFilter: (c: string | null) => void;
  rows: BrowseRow[];
  onClose: () => void;
  onRowClick: (row: BrowseRow) => void;
  loadingAr: boolean;
  loadingAll: boolean;
  arCount: number;
  allCount: number;
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-black/85 backdrop-blur-md"
      data-testid="browse-drawer"
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 flex-shrink-0">
        <div className="text-sm font-semibold text-white">Browse</div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label="Close browser"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </header>

      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0">
        <button
          onClick={() => setTab('ar')}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === 'ar'
              ? 'bg-[#C9A84C] text-black'
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          }`}
        >
          AR-ready ({arCount})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            tab === 'all'
              ? 'bg-[#C9A84C] text-black'
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          }`}
        >
          All pieces{tab === 'all' && allCount ? ` (${allCount})` : ''}
        </button>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 flex-shrink-0">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-3 py-1 text-[11px] transition ${
              categoryFilter === null
                ? 'bg-white text-black'
                : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-3 py-1 text-[11px] transition ${
                categoryFilter === c
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {(tab === 'ar' && loadingAr) || (tab === 'all' && loadingAll) ? (
          <div className="p-6 text-center text-sm text-white/60">Loading catalogue…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-white/60">No items.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => onRowClick(r)}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left transition hover:border-[#C9A84C]/60"
              >
                <div className="relative aspect-square w-full bg-black/40">
                  {r.primary_image_url ? (
                    <Image
                      src={r.primary_image_url}
                      alt={r.name}
                      fill
                      sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : null}
                  {!r.arReady && (
                    <div className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-wide text-white/70">
                      Not AR
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <div className="truncate text-[11px] text-white">{r.name}</div>
                  {r.category_label && (
                    <div className="text-[10px] text-white/50">{r.category_label}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
