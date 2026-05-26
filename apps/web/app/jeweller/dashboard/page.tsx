'use client';

import type { ShopMetrics } from '@luxematch/db';
import {
  AlertTriangle,
  Camera,
  Eye,
  Lightbulb,
  Package,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';

type Recommendation = {
  id: string;
  title: string;
  reason: string;
  nextStep: string;
  priority: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  season?: string;
};

type IntelligenceSummary = {
  summary: {
    views7: number;
    views30: number;
    tryons7: number;
    tryons30: number;
    sales30: number;
    revenue30: number;
    products: number;
  };
  recommendations: Recommendation[];
};

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

function priorityLabel(priority: Recommendation['priority']) {
  if (priority === 'high') return 'Immediate';
  if (priority === 'medium') return 'Plan Next';
  return 'Monitor';
}

function confidenceCopy(confidence: Recommendation['confidence']) {
  if (confidence === 'high') return 'Strong signal';
  if (confidence === 'medium') return 'Developing signal';
  return 'Early signal';
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ShopMetrics | null>(null);
  const [intel, setIntel] = useState<IntelligenceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [metricsRes, intelligenceRes] = await Promise.all([
        fetch('/api/shop/metrics', { cache: 'no-store' }),
        fetch('/api/intelligence/summary', { cache: 'no-store' }),
      ]);

      const metricsJson = (await metricsRes.json()) as
        | { data: ShopMetrics }
        | { error: { message: string } };
      if ('error' in metricsJson) {
        setError(metricsJson.error.message);
        return;
      }
      setMetrics(metricsJson.data);

      if (intelligenceRes.ok) {
        const intelligenceJson = (await intelligenceRes.json()) as
          | { data: IntelligenceSummary }
          | { error: { message: string } };
        if ('data' in intelligenceJson) setIntel(intelligenceJson.data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics');
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      setReindexMessage(`Reindex finished - ${ok} OK, ${failed} failed`);
      void load();
    } catch (e) {
      setReindexMessage(e instanceof Error ? e.message : 'Reindex failed');
    } finally {
      setReindexing(false);
    }
  }

  const summary = intel?.summary;
  const recommendations = intel?.recommendations ?? [];
  const monthlySales = summary?.sales30 ?? 0;
  const monthlyRevenue = summary?.revenue30 ?? 0;

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
              {reindexing ? 'Reindexing...' : 'Reindex all'}
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

        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Business Snapshot
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard label="Views 30d" value={summary?.views30 ?? '...'} sub={`${summary?.views7 ?? 0} this week`} />
            <MetricCard
              label="Sales 30d"
              value={monthlySales}
              sub={monthlyRevenue > 0 ? formatINR(monthlyRevenue) : 'Start recording sales'}
            />
            <MetricCard label="Products" value={summary?.products ?? metrics?.total_products ?? '...'} />
            <MetricCard label="Try-ons 30d" value={summary?.tryons30 ?? '...'} sub={`${summary?.tryons7 ?? 0} this week`} />
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-card-border bg-card p-5 shadow-sm" data-testid="owner-recommendations">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                Inventory Decision Brief
              </p>
              <h2 className="text-base font-semibold">What needs attention now</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Prioritized from sales history, customer interest, stock levels, and upcoming season windows.
              </p>
            </div>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {(recommendations.length > 0
              ? recommendations.slice(0, 3)
              : [
                  {
                    id: 'fallback-season',
                    title: 'Start collecting sales history',
                    reason:
                      'Recommendations become stronger after 30-60 days of sales and try-on data.',
                    nextStep: 'Seed dummy history now, then use Mark Sold for real purchases.',
                    priority: 'medium' as const,
                    confidence: 'low' as const,
                  },
                ]
            ).map((rec) => (
              <div key={rec.id} className="min-h-[172px] rounded-xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      rec.priority === 'high'
                        ? 'bg-red-50 text-red-600'
                        : rec.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {priorityLabel(rec.priority)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{confidenceCopy(rec.confidence)}</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{rec.title}</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Evidence
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {rec.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Recommended Action
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed">{rec.nextStep}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Inventory
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <MetricCard label="Total products" value={metrics?.total_products ?? '...'} href="/jeweller/products" />
            <MetricCard label="Active" value={metrics?.active_products ?? '...'} href="/jeweller/products" />
            <MetricCard
              label="Missing image"
              value={metrics?.missing_images_count ?? '...'}
              warn={(metrics?.missing_images_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-image"
            />
            <MetricCard
              label="Missing try-on"
              value={metrics?.missing_tryon_count ?? '...'}
              warn={(metrics?.missing_tryon_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-tryon"
            />
            <MetricCard
              label="Missing search index"
              value={metrics?.missing_embedding_count ?? '...'}
              warn={(metrics?.missing_embedding_count ?? 0) > 0}
              href="/jeweller/products?filter=missing-embedding"
            />
          </div>
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Camera className="h-3 w-3" /> Try-ons
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_today ?? '...'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_week ?? '...'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Week</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.tryon_events_month ?? '...'}</div>
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
                <div className="text-2xl font-semibold">{metrics?.search_events_today ?? '...'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.search_events_week ?? '...'}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Week</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{metrics?.search_events_month ?? '...'}</div>
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
                No views yet. Customers have not opened a product page in the last 30 days.
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
              search-index entries. Customers will not see those pieces in catalog browsing,
              search, or AR. Click the warning tiles above to filter the product list.
            </div>
          </section>
        ) : null}
      </div>
    </JewellerLayout>
  );
}
