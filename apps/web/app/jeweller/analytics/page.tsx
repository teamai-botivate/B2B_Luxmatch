'use client';

import type { ShopAnalytics } from '@luxematch/db';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { BarChart3, Camera, Eye, IndianRupee, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import DashboardMetricCard from '@/components/jeweller/DashboardMetricCard';

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<ShopAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const res = await fetch('/api/shop/analytics', { cache: 'no-store' });
        const json = (await res.json()) as
          | { data: ShopAnalytics }
          | { error: { message: string } };
        if ('error' in json) {
          setError(json.error.message);
          return;
        }
        setAnalytics(json.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
      }
    }
    void load();
  }, []);

  const totals = useMemo(() => {
    const daily = analytics?.daily_activity ?? [];
    const sales = analytics?.sales_by_category ?? [];
    return {
      searches: daily.reduce((sum, d) => sum + d.searches, 0),
      tryons: daily.reduce((sum, d) => sum + d.tryons, 0),
      views: analytics?.top_viewed_products.reduce((sum, p) => sum + p.views, 0) ?? 0,
      revenue: sales.reduce((sum, s) => sum + s.revenue, 0),
    };
  }, [analytics]);

  return (
    <JewellerLayout>
      <div className="mx-auto max-w-7xl px-6 py-8" data-testid="jeweller-analytics-page">
        <header className="mb-6">
          <h1 className="text-3xl font-medium tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Last 30 days, scoped to this shop.</p>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <DashboardMetricCard label="Searches" value={analytics ? totals.searches.toLocaleString('en-IN') : '...'} icon={Search} />
          <DashboardMetricCard label="Try-ons" value={analytics ? totals.tryons.toLocaleString('en-IN') : '...'} icon={Camera} accent="amber" />
          <DashboardMetricCard label="Top-product views" value={analytics ? totals.views.toLocaleString('en-IN') : '...'} icon={Eye} accent="green" />
          <DashboardMetricCard label="Logged revenue" value={analytics ? formatInr(totals.revenue) : '...'} icon={IndianRupee} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-card-border bg-card p-5 lg:col-span-2" data-testid="chart-daily-activity">
            <h3 className="mb-4 text-sm font-semibold">Searches & try-ons</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics?.daily_activity ?? []}>
                <defs>
                  <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e0d5', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="searches" stroke="#C9A84C" strokeWidth={2} fill="url(#searchGrad)" />
                <Area type="monotone" dataKey="tryons" stroke="#2F6F5E" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          <section className="rounded-2xl border border-card-border bg-card p-5" data-testid="chart-sales-metal">
            <h3 className="mb-4 text-sm font-semibold">Sales by metal</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics?.sales_by_metal ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" />
                <XAxis dataKey="metal" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e8e0d5', fontSize: 12 }} />
                <Bar dataKey="sales" fill="#C9A84C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RankedTable title="Top try-on products" empty="No try-on events yet." rows={(analytics?.top_tryon_products ?? []).map((p) => [p.name, p.tryons])} />
          <RankedTable title="Most viewed products" empty="No product views yet." rows={(analytics?.top_viewed_products ?? []).map((p) => [p.name, p.views])} />
          <RankedTable title="Sales by category" empty="No sales logged yet." rows={(analytics?.sales_by_category ?? []).map((s) => [s.category, `${s.sales} sale${s.sales === 1 ? '' : 's'} · ${formatInr(s.revenue)}`])} />
          <RankedTable title="Sales by metal" empty="No sales logged yet." rows={(analytics?.sales_by_metal ?? []).map((s) => [s.metal, `${s.sales} sale${s.sales === 1 ? '' : 's'} · ${formatInr(s.revenue)}`])} />
        </div>
      </div>
    </JewellerLayout>
  );
}

function RankedTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<[string, string | number]>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {rows.length ? (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b last:border-b-0">
                <td className="px-4 py-2 font-medium">{label}</td>
                <td className="px-4 py-2 text-right text-muted-foreground">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-6 text-sm text-muted-foreground">{empty}</div>
      )}
    </section>
  );
}
