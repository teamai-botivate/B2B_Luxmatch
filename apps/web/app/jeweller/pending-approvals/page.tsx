'use client';

import { ClipboardCheck, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';

type KioskOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_items: number;
  total_amount: number;
  created_at: string;
  pickup_store: boolean;
};

type B2BOrder = {
  id: string;
  order_number: string;
  total_items: number;
  total_amount: number;
  created_at: string;
  notes: string | null;
};

type ActionState = { id: string; action: 'approving' | 'rejecting' } | null;

export default function PendingApprovalsPage() {
  const [kioskOrders, setKioskOrders] = useState<KioskOrder[] | null>(null);
  const [b2bOrders, setB2BOrders] = useState<B2BOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kioskRes, b2bRes] = await Promise.all([
        fetch('/api/manager/kiosk-orders/pending', { cache: 'no-store' }),
        fetch('/api/manager/b2b-orders/pending', { cache: 'no-store' }),
      ]);

      if (kioskRes.status === 401 || b2bRes.status === 401) {
        window.location.assign('/store/login?next=/jeweller/pending-approvals');
        return;
      }

      if (!kioskRes.ok || !b2bRes.ok) {
        setError('Failed to load pending approvals');
        return;
      }

      const kioskJson = await kioskRes.json() as { data: KioskOrder[] };
      const b2bJson = await b2bRes.json() as { data: B2BOrder[] };
      setKioskOrders(kioskJson.data ?? []);
      setB2BOrders(b2bJson.data ?? []);
    } catch {
      setError('Network error loading approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleKioskAction(id: string, action: 'approve' | 'reject') {
    setActionState({ id, action: action === 'approve' ? 'approving' : 'rejecting' });
    try {
      const res = await fetch(`/api/manager/kiosk-orders/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setKioskOrders((prev) => (prev ?? []).filter((o) => o.id !== id));
      }
    } catch { /* ignore */ }
    setActionState(null);
  }

  async function handleB2BAction(id: string, action: 'approve' | 'reject') {
    setActionState({ id, action: action === 'approve' ? 'approving' : 'rejecting' });
    try {
      const res = await fetch(`/api/manager/b2b-orders/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setB2BOrders((prev) => (prev ?? []).filter((o) => o.id !== id));
      }
    } catch { /* ignore */ }
    setActionState(null);
  }

  const totalPending = (kioskOrders?.length ?? 0) + (b2bOrders?.length ?? 0);

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-4xl space-y-6 py-3 sm:py-5">
        <header>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-amber-700" />
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Pending Approvals</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and approve kiosk orders and B2B catalog orders before they reach the manufacturer.
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pending approvals…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && totalPending === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <CheckCircle className="h-10 w-10 text-green-500/60" />
            <p className="text-sm font-medium text-muted-foreground">All clear — no pending approvals.</p>
            <p className="text-xs text-muted-foreground">New kiosk and B2B orders awaiting approval will appear here.</p>
          </div>
        )}

        {/* Kiosk Orders Section */}
        {!loading && (kioskOrders?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Kiosk Orders Awaiting Approval</h2>
              <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5">
                {kioskOrders!.length}
              </span>
            </div>
            <div className="rounded-xl border bg-card divide-y overflow-hidden">
              {kioskOrders!.map((order) => {
                const isActing = actionState?.id === order.id;
                return (
                  <div key={order.id} className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Order</p>
                        <p className="font-mono font-semibold text-xs">{order.order_number}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
                        <p className="font-medium truncate">{order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                        <p className="tabular-nums">{order.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Items / Type</p>
                        <p>{order.total_items} item{order.total_items !== 1 ? 's' : ''} · {order.pickup_store ? 'Pickup' : 'Delivery'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={!!actionState}
                        onClick={() => void handleKioskAction(order.id, 'reject')}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isActing && actionState?.action === 'rejecting' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={!!actionState}
                        onClick={() => void handleKioskAction(order.id, 'approve')}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {isActing && actionState?.action === 'approving' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Approve & Forward
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* B2B Orders Section */}
        {!loading && (b2bOrders?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">B2B Catalog Orders Awaiting Approval</h2>
              <span className="rounded-full bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5">
                {b2bOrders!.length}
              </span>
            </div>
            <div className="rounded-xl border bg-card divide-y overflow-hidden">
              {b2bOrders!.map((order) => {
                const isActing = actionState?.id === order.id;
                return (
                  <div key={order.id} className="px-4 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Order</p>
                        <p className="font-mono font-semibold text-xs">{order.order_number}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Items</p>
                        <p>{order.total_items} item{order.total_items !== 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
                        <p className="truncate text-muted-foreground">{order.notes ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={!!actionState}
                        onClick={() => void handleB2BAction(order.id, 'reject')}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isActing && actionState?.action === 'rejecting' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={!!actionState}
                        onClick={() => void handleB2BAction(order.id, 'approve')}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        {isActing && actionState?.action === 'approving' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Approve & Forward
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </JewellerLayout>
  );
}
