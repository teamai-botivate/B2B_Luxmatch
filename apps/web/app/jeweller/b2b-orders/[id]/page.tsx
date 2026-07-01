'use client';

import type { B2BOrderWithItems } from '@luxematch/db';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function B2BOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<B2BOrderWithItems | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    try {
      const res = await fetch(`/api/store/orders/${id}`, { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: B2BOrderWithItems }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) {
          window.location.assign(`/store/login?next=/jeweller/b2b-orders/${id}`);
          return;
        }
        setError('error' in json ? json.error.message : 'Failed to load order');
        return;
      }
      setOrder(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function cancelOrder() {
    if (!confirm('Cancel this pending B2B order?')) return;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/orders/${id}`, { method: 'DELETE' });
      const json = (await res.json()) as { data: unknown } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Cancel failed');
        return;
      }
      await load();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-5 py-3 sm:py-5">
        <Link
          href="/jeweller/b2b-orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> B2B Orders
        </Link>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!order && !error ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading order...
          </div>
        ) : order ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-medium tracking-tight">{order.order_number}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[order.status] ?? ''}`}>
                {order.status}
              </span>
            </header>

            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Delivery Address
              </p>
              <p className="mt-1 text-sm">{order.delivery_address}</p>
              {order.notes && <p className="mt-2 text-xs text-muted-foreground">Note: {order.notes}</p>}
              {order.tracking_number && (
                <p className="mt-2 text-xs font-medium text-primary">
                  Tracking: {order.tracking_number}
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/40 px-4 py-3 text-sm font-medium">
                Items
              </div>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.product_name_snapshot ?? 'Product'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty {item.quantity} x {formatINR(item.unit_price_snapshot ?? 0)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatINR((item.unit_price_snapshot ?? 0) * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatINR(order.total_amount)}</span>
              </div>
            </div>

            {order.status === 'pending' && (
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => void cancelOrder()}
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {cancelling ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Cancel Order
              </Button>
            )}
          </>
        ) : (
          <Button onClick={() => router.push('/jeweller/b2b-orders')}>Back to Orders</Button>
        )}
      </div>
    </JewellerLayout>
  );
}
