'use client';

import type { ShopMetrics } from '@luxematch/db';
import { AlertTriangle, Camera, Eye, Package, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';

function MetricCard({
  label,
  value,
  sub,
  href,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  warn?: boolean;
}) {
  const inner = (
    <div
      className={`rounded-2xl border p-5 transition ${
        warn ? 'border-amber-300 bg-amber-50/40' : 'border-border bg-card'
      } ${href ? 'hover:border-foreground/30' : ''}`}
    >
      <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight ${warn ? 'text-amber-800' : ''}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ShopMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/shop/metrics', { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: ShopMetrics }
        | { error: { message: string } };
      if ('error' in json) {
        setError(json.error.message);
        return;
      }
      setMetrics(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Reindex-all walks the product list and hits the per-product reindex
  // endpoint in series. At shop-scale (<200 products) the sequential loop
  // is fine; for larger fleets we'd push this to a server-side job queue.
  async function reindexAll() {
    if (!confirm('Re-embed every active product? This may take a minute.')) return;
    setReindexing(true);
    setReindexMessage(null);
    try {
      const list = await fetch('/api/products?limit=200', { cache: 'no-store' });
      const listJson = (await list.json()) as
        | { data: { products: { id: string }[] } }
        | { error: { message: string } };
      if ('error' in listJson) throw new Error(listJson.error.message);
      const ids = listJson.data.products.map((p) => p.id);
      let ok = 0;
      let failed = 0;
      for (const id of ids) {
        const r = await fetch(`/api/embeddings/product/${id}`, { method: 'POST' });
        if (r.ok) ok++;
        else failed++;
      }
      setReindexMessage(`Reindex finished — ${ok} OK, ${failed} failed`);
      void load();
    } catch (e) {
      setReindexMessage(e instanceof Error ? e.message : 'Reindex failed');
    } finally {
      setReindexing(false);
    }
  }

  return (
    <JewellerLayout>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All numbers are scoped to this shop.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/jeweller/products/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add product
              </Button>
            </Link>
            <Button variant="outline" onClick={reindexAll} disabled={reindexing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${reindexing ? 'animate-spin' : ''}`} />
              {reindexing ? 'Reindexing…' : 'Reindex all'}
            </Button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {reindexMessage ? (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {reindexMessage}
          </div>
        ) : null}

        {/* Inventory health — warning tiles link to filtered product list */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Inventory
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MetricCard label="Total products" value={metrics?.total_products ?? '—'} href="/jeweller/products" />
            <MetricCard label="Active" value={metrics?.active_products ?? '—'} href="/jeweller/products" />
            <MetricCard
              label="Missing image"
              value={metrics?.missing_images_count ?? '—'}
              warn={(metrics?.missing_images_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-image"
            />
            <MetricCard
              label="Missing try-on"
              value={metrics?.missing_tryon_count ?? '—'}
              warn={(metrics?.missing_tryon_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-tryon"
            />
            <MetricCard
              label="Missing search index"
              value={metrics?.missing_embedding_count ?? '—'}
              warn={(metrics?.missing_embedding_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-embedding"
            />
          </div>
        </section>

        {/* Engagement — today / week / month side-by-side */}
        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Camera className="h-3 w-3" /> Try-ons
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_today ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_week ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Week</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_month ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Month</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Search className="h-3 w-3" /> Searches
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xl font-semibold">{metrics?.search_events_today ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.search_events_week ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Week</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.search_events_month ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Month</div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <Eye className="h-3 w-3" /> Top viewed (30 days)
          </h2>
          <div className="overflow-hidden rounded-2xl border">
            {metrics?.top_viewed_products?.length ? (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Product</th>
                    <th className="px-4 py-2 text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.top_viewed_products.map((p) => (
                    <tr key={p.product_id} className="border-t">
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-sm">{p.view_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                No views yet — customers haven&apos;t opened a product page in the last 30 days.
              </div>
            )}
          </div>
        </section>

        {(metrics?.missing_images_count ?? 0) > 0 ||
        (metrics?.missing_tryon_count ?? 0) > 0 ||
        (metrics?.missing_embedding_count ?? 0) > 0 ? (
          <section className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <strong>Heads up:</strong> some products are missing images, try-on assets, or
              search-index entries. Customers won&apos;t see those pieces in catalog browsing,
              search, or AR. Click the warning tiles above to filter the product list.
            </div>
          </section>
        ) : null}
      </div>
    </JewellerLayout>
  );
}
