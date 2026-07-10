'use client';

import { Package, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { B2BOrderRow, ManufacturerProductRow } from '@luxematch/db';

type Stats = {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
};

function StatCard({
  label,
  value,
  sub,
  href,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link href={href}>
      <div className="rounded-xl border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ManufacturerDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<B2BOrderRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch('/api/manufacturer/products', { cache: 'no-store' }),
          fetch('/api/manufacturer/orders', { cache: 'no-store' }),
        ]);
        const productsJson = (await productsRes.json()) as
          | { data: ManufacturerProductRow[] }
          | { error: { message: string } };
        const ordersJson = (await ordersRes.json()) as
          | { data: B2BOrderRow[] }
          | { error: { message: string } };

        if ('error' in productsJson) {
          if (productsRes.status === 401) {
            window.location.assign('/manufacturer/login');
            return;
          }
          setError(productsJson.error.message);
          return;
        }
        if ('error' in ordersJson) {
          setError(ordersJson.error.message);
          return;
        }

        const products = productsJson.data;
        const orders = ordersJson.data;
        setStats({
          totalProducts: products.length,
          activeProducts: products.filter((p) => p.status === 'active').length,
          totalOrders: orders.length,
          pendingOrders: orders.filter((o) => o.status === 'pending').length,
        });
        setRecentOrders(orders.slice(0, 5));
      } catch {
        setError('Failed to load dashboard data');
      }
    }
    void load();
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    packed: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Overview of your catalog and B2B orders.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total Products"
              value={stats.totalProducts}
              href="/manufacturer/products"
              icon={Package}
            />
            <StatCard
              label="Active Products"
              value={stats.activeProducts}
              sub="visible to stores"
              href="/manufacturer/products"
              icon={TrendingUp}
            />
            <StatCard
              label="Total Orders"
              value={stats.totalOrders}
              href="/manufacturer/orders"
              icon={ShoppingBag}
            />
            <StatCard
              label="Pending Orders"
              value={stats.pendingOrders}
              sub="need confirmation"
              href="/manufacturer/orders"
              icon={Clock}
            />
          </div>
        ) : !error ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border bg-muted animate-pulse" />
            ))}
          </div>
        ) : null}

        {recentOrders.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Recent Orders</h2>
              <Link href="/manufacturer/orders" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y">
              {recentOrders.map((order) => (
                <Link key={order.id} href={`/manufacturer/orders/${order.id}`}>
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.total_items} item{order.total_items !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ''}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
