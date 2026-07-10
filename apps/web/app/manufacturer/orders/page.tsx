'use client';

import { Loader2, ShoppingBag, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { B2BOrderRow } from '@luxematch/db';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const ALL_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function ManufacturerOrdersPage() {
  const [orders, setOrders] = useState<B2BOrderRow[] | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/manufacturer/orders', { cache: 'no-store' });
        const json = (await res.json()) as
          | { data: B2BOrderRow[] }
          | { error: { message: string } };
        if (!res.ok || 'error' in json) {
          if (res.status === 401) { window.location.assign('/manufacturer/login'); return; }
          setError('error' in json ? json.error.message : 'Failed to load');
          return;
        }
        setOrders(json.data);
      } catch {
        setError('Network error');
      }
    }
    void load();
  }, []);

  const visible = (orders ?? []).filter(
    (o) => filterStatus === 'all' || o.status === filterStatus,
  );

  return (
    <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">B2B Orders</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Orders placed by stores from your catalog.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            className="rounded-md border bg-background px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {orders === null && !error ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading orders…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Orders from stores will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Store</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary truncate">{order.store_name ?? '—'}</p>
                      {order.store_city && (
                        <p className="text-xs text-muted-foreground">{order.store_city}</p>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">
                      {order.total_items} item{order.total_items !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/manufacturer/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
