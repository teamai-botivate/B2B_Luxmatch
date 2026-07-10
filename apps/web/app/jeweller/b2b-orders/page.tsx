'use client';

import type { B2BOrderRow } from '@luxematch/db';
import { ChevronRight, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function StoreB2BOrdersPage() {
  const [orders, setOrders] = useState<B2BOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/store/orders', { cache: 'no-store' });
        const json = (await res.json()) as
          | { data: B2BOrderRow[] }
          | { error: { message: string } };
        if (!res.ok || 'error' in json) {
          if (res.status === 401) {
            window.location.assign('/store/login?next=/jeweller/b2b-orders');
            return;
          }
          setError('error' in json ? json.error.message : 'Failed to load orders');
          return;
        }
        setOrders(json.data);
      } catch {
        setError('Network error');
      }
    }
    void load();
  }, []);

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-6xl space-y-5 py-3 sm:py-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">B2B Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Purchase orders your store placed with the manufacturer.
            </p>
          </div>
          <Button asChild>
            <Link href="/jeweller/manufacturer-catalog">Browse Catalog</Link>
          </Button>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {orders === null && !error ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading B2B orders...
          </div>
        ) : orders?.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No B2B orders yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                  <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders?.map((order) => (
                  <tr key={order.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.total_items} item{order.total_items !== 1 ? 's' : ''}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ''}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/jeweller/b2b-orders/${order.id}`}
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
    </JewellerLayout>
  );
}
