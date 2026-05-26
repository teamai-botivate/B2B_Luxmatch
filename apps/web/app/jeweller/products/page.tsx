'use client';

import type { ProductWithImages } from '@luxematch/db';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit,
  ImageIcon,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Filter = 'all' | 'missing-image' | 'missing-tryon' | 'missing-embedding' | 'inactive';

function ProductsContent() {
  const params = useSearchParams();
  const initialFilter = (params.get('filter') as Filter | null) ?? 'all';

  const [products, setProducts] = useState<ProductWithImages[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/products/manage', { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: { products: ProductWithImages[]; total: number } }
        | { error: { message: string } };
      if ('error' in json) {
        setError(json.error.message);
        return;
      }
      setProducts(json.data.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────

  async function reindex(id: string) {
    setBusyId(id);
    setFlash(null);
    try {
      const r = await fetch(`/api/embeddings/product/${id}`, { method: 'POST' });
      const json = (await r.json().catch(() => ({}))) as { error?: { message: string } };
      if (!r.ok) {
        setError(json.error?.message ?? 'Reindex failed');
        return;
      }
      setFlash('Product reindexed.');
    } finally {
      setBusyId(null);
    }
  }

  async function markSold(id: string) {
    const priceStr = prompt('Sale price (optional, leave blank to skip)?', '');
    const soldPrice = priceStr && !Number.isNaN(Number(priceStr)) ? Number(priceStr) : null;
    setBusyId(id);
    setFlash(null);
    try {
      const r = await fetch(`/api/products/${id}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soldPrice }),
      });
      if (!r.ok) {
        const json = (await r.json().catch(() => ({}))) as { error?: { message: string } };
        setError(json.error?.message ?? 'Mark sold failed');
        return;
      }
      setFlash('Sale recorded.');
      void load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes the product, its images, and try-on assets.`)) return;
    setBusyId(id);
    setFlash(null);
    try {
      const r = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!r.ok) {
        const json = (await r.json().catch(() => ({}))) as { error?: { message: string } };
        setError(json.error?.message ?? 'Delete failed');
        return;
      }
      setFlash('Product deleted.');
      void load();
    } finally {
      setBusyId(null);
    }
  }

  // ── Filtering ───────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.slug} ${p.sku ?? ''} ${p.metal ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case 'missing-image':
          return !p.primary_image_url;
        case 'missing-tryon':
          return !p.has_tryon;
        case 'missing-embedding':
          return !p.has_embedding;
        case 'inactive':
          return !p.is_active;
        default:
          return true;
      }
    });
  }, [products, query, filter]);

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'missing-image', label: 'Missing image' },
    { value: 'missing-tryon', label: 'Missing try-on' },
    { value: 'missing-embedding', label: 'Missing index' },
    { value: 'inactive', label: 'Inactive' },
  ];

  return (
    <JewellerLayout>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {products?.length ?? 0} total · this shop only
            </p>
          </div>
          <Link href="/jeweller/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add product
            </Button>
          </Link>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, slug, SKU…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === f.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {flash ? (
          <div className="mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {flash}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border">
          {products === null ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
              <Package className="h-6 w-6" />
              {query || filter !== 'all' ? 'No products match this filter.' : 'No products yet.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Price (₹)</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.primary_image_url ? (
                            <Image
                              src={p.primary_image_url}
                              alt={p.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <ImageIcon className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {p.metal ?? '—'} · {p.purity ?? '—'} · {p.sku ?? p.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill ok={p.is_active} okText="Active" badText="Inactive" badTone="muted" />
                        <StatusPill
                          ok={Boolean(p.primary_image_url)}
                          okText="Image"
                          okIcon={<ImageIcon className="h-3 w-3" />}
                          badText="No image"
                        />
                        <StatusPill
                          ok={p.has_tryon}
                          okText="AR"
                          okIcon={<Camera className="h-3 w-3" />}
                          badText="No AR"
                          badTone="muted"
                        />
                        <StatusPill
                          ok={p.has_embedding}
                          okText="Index"
                          okIcon={<RefreshCw className="h-3 w-3" />}
                          badText="No index"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {p.price_min != null && p.price_max != null
                        ? `${Math.round(p.price_min).toLocaleString('en-IN')} – ${Math.round(p.price_max).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{p.stock_count}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Link href={`/jeweller/products/${p.id}`} title="Edit">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Reindex"
                          onClick={() => reindex(p.id)}
                          disabled={busyId === p.id || !p.primary_image_url}
                        >
                          {busyId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Mark sold"
                          onClick={() => markSold(p.id)}
                          disabled={busyId === p.id || p.stock_count <= 0}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          title="Delete"
                          onClick={() => remove(p.id, p.name)}
                          disabled={busyId === p.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </JewellerLayout>
  );
}

function StatusPill({
  ok,
  okText,
  okIcon,
  badText,
  badTone = 'warn',
}: {
  ok: boolean;
  okText: string;
  okIcon?: React.ReactNode;
  badText: string;
  badTone?: 'warn' | 'muted';
}) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        {okIcon ?? <CheckCircle2 className="h-3 w-3" />}
        {okText}
      </span>
    );
  }
  const tone = badTone === 'warn' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
      <AlertCircle className="h-3 w-3" />
      {badText}
    </span>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <JewellerLayout>
          <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        </JewellerLayout>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
