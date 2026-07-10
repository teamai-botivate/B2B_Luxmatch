'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { B2BOrderWithItems } from '@luxematch/db';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

// What action can be taken from each status
const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  pending: [
    { label: 'Confirm Order', status: 'confirmed' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  confirmed: [
    { label: 'Mark Packed', status: 'packed' },
    { label: 'Cancel', status: 'cancelled' },
  ],
  packed: [{ label: 'Mark Shipped', status: 'shipped' }],
  shipped: [{ label: 'Mark Delivered', status: 'delivered' }],
  delivered: [],
  cancelled: [],
};

export default function ManufacturerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<B2BOrderWithItems | null>(null);
  const [updating, setUpdating] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/manufacturer/orders/${id}`, { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: B2BOrderWithItems }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) { window.location.assign('/manufacturer/login'); return; }
        setError('error' in json ? json.error.message : 'Failed to load order');
        return;
      }
      setOrder(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function updateStatus(status: string, note?: string) {
    setUpdating(true);
    setError(null);
    try {
      const body: { status: string; note?: string; trackingNumber?: string } = { status, note };
      if (status === 'shipped') body.trackingNumber = trackingNumber.trim();
      const res = await fetch(`/api/manufacturer/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data: unknown } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Update failed');
        return;
      }
      await load();
    } finally {
      setUpdating(false);
    }
  }

  if (!order && !error) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading order…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <Link
            href="/manufacturer/orders"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Orders
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {order && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-xl font-semibold">{order.order_number}</h1>
                {order.store_name && (
                  <p className="mt-0.5 text-sm font-medium text-primary">
                    {order.store_name}
                    {order.store_city ? ` · ${order.store_city}` : ''}
                  </p>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[order.status] ?? ''}`}>
                {order.status}
              </span>
            </div>

            {/* Delivery address */}
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Delivery Address
              </p>
              <p className="text-sm">{order.delivery_address}</p>
              {order.notes && (
                <p className="mt-2 text-xs text-muted-foreground">Note: {order.notes}</p>
              )}
              {order.tracking_number && (
                <p className="mt-1 text-xs font-medium text-primary">
                  Tracking: {order.tracking_number}
                </p>
              )}
            </div>

            {/* Items */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/40">
                <p className="text-sm font-medium">
                  Order Items ({order.total_items})
                </p>
              </div>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product_name_snapshot ?? 'Product'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <p className="text-sm font-semibold">Total Items</p>
                <p className="text-sm font-semibold tabular-nums">{order.total_items}</p>
              </div>
            </div>

            {/* Actions */}
            {(NEXT_ACTIONS[order.status] ?? []).length > 0 && (
              <div className="space-y-3">
                {order.status === 'packed' && (
                  <div className="max-w-sm">
                    <label className="text-xs font-medium text-muted-foreground">
                      Tracking Number
                    </label>
                    <Input
                      className="mt-1"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Courier or shipment reference"
                    />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {(NEXT_ACTIONS[order.status] ?? []).map((action) => (
                    <Button
                      key={action.status}
                      variant={action.status === 'cancelled' ? 'outline' : 'default'}
                      disabled={updating}
                      onClick={() => updateStatus(action.status)}
                      className={action.status === 'cancelled' ? 'text-destructive border-destructive/40 hover:bg-destructive/10' : ''}
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {order.history.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  Status History
                </p>
                <ol className="space-y-2">
                  {[...order.history].reverse().map((h) => (
                    <li key={h.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize flex-shrink-0 ${STATUS_COLORS[h.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {h.status}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(h.created_at).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                        {h.note ? ` — ${h.note}` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
    </div>
  );
}
