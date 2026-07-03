'use client';

import { ChevronRight, Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  packed: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const NEXT_STATUS: Record<string, string> = {
  placed: 'confirmed',
  confirmed: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

type GuestOrder = {
  id: string;
  order_number: string;
  store_name_snapshot: string;
  store_city_snapshot: string | null;
  customer_name: string;
  customer_phone: string;
  status: string;
  total_items: number;
  total_amount: number;
  pickup_store: boolean;
  delivery_address: string | null;
  created_at: string;
};

export default function ManufacturerKioskOrdersPage() {
  const [orders, setOrders] = useState<GuestOrder[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch('/api/manufacturer/kiosk-orders', { cache: 'no-store' });
      const json = await res.json() as { data: GuestOrder[] } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) { window.location.assign('/manufacturer/login?next=/manufacturer/kiosk-orders'); return; }
        setError('error' in json ? json.error.message : 'Failed to load orders');
        return;
      }
      setOrders(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  async function toggleDetail(id: string) {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/manufacturer/kiosk-orders/${id}`, { cache: 'no-store' });
      const json = await res.json() as { data: Record<string, unknown> } | { error: unknown };
      if (res.ok && 'data' in json) setDetail(json.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }

  async function advanceStatus(orderId: string, nextStatus: string) {
    setUpdating(orderId);
    try {
      await fetch(`/api/manufacturer/kiosk-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadOrders();
    } catch { /* ignore */ }
    setUpdating(null);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 py-3 sm:py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Kiosk Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guest orders placed by customers at store kiosks. Shows which store each order came from.
          </p>
        </div>
      </header>

      {!orders && !error && (
        <div className="flex items-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {orders && orders.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No kiosk orders yet.</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="divide-y">
            {orders.map((order) => (
              <div key={order.id}>
                <button
                  type="button"
                  onClick={() => void toggleDetail(order.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-0.5">
                    <div>
                      <p className="text-xs text-muted-foreground">Order</p>
                      <p className="text-sm font-medium">{order.order_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Store</p>
                      <p className="text-sm truncate font-medium text-primary">{order.store_name_snapshot}</p>
                      {order.store_city_snapshot && (
                        <p className="text-xs text-muted-foreground">{order.store_city_snapshot}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-sm truncate">{order.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-semibold tabular-nums">{formatINR(order.total_amount)}</p>
                    </div>
                    <div className="flex items-start gap-2 pt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{order.pickup_store ? 'Pickup' : 'Delivery'}</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${expanded === order.id ? 'rotate-90' : ''}`} />
                </button>

                {expanded === order.id && (
                  <div className="px-4 pb-4 bg-muted/10 border-t">
                    {detailLoading && (
                      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                      </div>
                    )}
                    {!detailLoading && detail && (
                      <div className="pt-3 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div><p className="text-xs text-muted-foreground">Customer Phone</p><p>{order.customer_phone}</p></div>
                          <div><p className="text-xs text-muted-foreground">Date</p><p>{new Date(order.created_at).toLocaleDateString('en-IN')}</p></div>
                          {order.delivery_address && (
                            <div className="sm:col-span-1">
                              <p className="text-xs text-muted-foreground">Delivery Address</p>
                              <p className="text-xs">{order.delivery_address}</p>
                            </div>
                          )}
                        </div>

                        {'items' in detail && Array.isArray(detail.items) && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Items</p>
                            <div className="space-y-1">
                              {(detail.items as Array<{ product_name_snapshot: string; quantity: number; unit_price_snapshot: number }>).map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span>{item.product_name_snapshot} × {item.quantity}</span>
                                  <span className="tabular-nums">{formatINR(item.unit_price_snapshot * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {NEXT_STATUS[order.status] && (
                          <button
                            type="button"
                            disabled={updating === order.id}
                            onClick={() => void advanceStatus(order.id, NEXT_STATUS[order.status]!)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
                          >
                            {updating === order.id
                              ? 'Updating…'
                              : `Mark as ${NEXT_STATUS[order.status]}`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
