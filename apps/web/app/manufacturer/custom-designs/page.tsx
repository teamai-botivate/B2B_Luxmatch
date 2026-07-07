'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, PencilLine } from 'lucide-react';

import ManufacturerLayout from '@/components/layout/ManufacturerLayout';

// ── Types ─────────────────────────────────────────────────────────────────────

type CustomDesignOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

type CustomDesignOrder = {
  id: string;
  order_number: string;
  store_naam_snapshot: string;
  store_address_snapshot: string;
  category: string;
  weight_grams: number | null;
  purity: string | null;
  design_notes: string | null;
  reference_image_url: string | null;
  status: CustomDesignOrderStatus;
  tracking_number: string | null;
  created_at: string;
};

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CustomDesignOrderStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
  in_production: 'bg-purple-50 text-purple-800 border-purple-200',
  packed: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  shipped: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  delivered: 'bg-green-50 text-green-800 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<CustomDesignOrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_production: 'In Production',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const NEXT_STATUS: Partial<Record<CustomDesignOrderStatus, CustomDesignOrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'in_production',
  in_production: 'packed',
  packed: 'shipped',
  shipped: 'delivered',
};

function StatusBadge({ status }: { status: CustomDesignOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border-muted'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onAdvanceStatus,
}: {
  order: CustomDesignOrder;
  onAdvanceStatus: (id: string, status: CustomDesignOrderStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const nextStatus = NEXT_STATUS[order.status];
  const date = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  async function handleAdvance() {
    if (!nextStatus) return;
    setBusy(true);
    await onAdvanceStatus(order.id, nextStatus);
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="text-sm font-medium tabular-nums">{order.order_number}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Store</p>
            <p className="text-sm font-semibold text-primary truncate">{order.store_naam_snapshot}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="text-sm">{order.category || '—'}</p>
          </div>
          <div className="flex items-start pt-0.5">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="flex-shrink-0 pt-0.5 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4 bg-muted/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Date Received</p>
              <p>{date}</p>
            </div>
            {order.weight_grams != null && (
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p>{order.weight_grams}g</p>
              </div>
            )}
            {order.purity && (
              <div>
                <p className="text-xs text-muted-foreground">Purity</p>
                <p>{order.purity}</p>
              </div>
            )}
            {order.tracking_number && (
              <div>
                <p className="text-xs text-muted-foreground">Tracking</p>
                <p className="font-mono text-xs">{order.tracking_number}</p>
              </div>
            )}
          </div>

          {/* Delivery address */}
          {order.store_address_snapshot && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Delivery Address</p>
              <p className="text-sm">{order.store_address_snapshot}</p>
            </div>
          )}

          {/* Design notes */}
          {order.design_notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Design Notes</p>
              <p className="text-sm leading-relaxed">{order.design_notes}</p>
            </div>
          )}

          {/* Reference image — no customer data shown */}
          {order.reference_image_url && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Reference Image</p>
              <a
                href={order.reference_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={order.reference_image_url}
                  alt="Design reference"
                  className="w-full max-h-56 rounded-lg object-contain border border-border bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>
            </div>
          )}

          {/* Privacy note */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
            Customer name and phone are not shared. Ship to the store address above.
          </div>

          {/* Advance status */}
          {nextStatus && (
            <button
              type="button"
              disabled={busy}
              onClick={handleAdvance}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {busy ? 'Updating…' : `Mark as ${STATUS_LABELS[nextStatus]}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManufacturerCustomDesignsPage() {
  const [orders, setOrders] = useState<CustomDesignOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    try {
      const res = await fetch('/api/manufacturer/custom-designs', { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: CustomDesignOrder[] }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) {
          window.location.assign('/manufacturer/login?next=/manufacturer/custom-designs');
          return;
        }
        setError('error' in json ? json.error.message : 'Failed to load orders');
        return;
      }
      setOrders((json as { data: CustomDesignOrder[] }).data);
    } catch {
      setError('Network error loading custom design orders');
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function handleAdvanceStatus(id: string, status: CustomDesignOrderStatus) {
    try {
      await fetch(`/api/manufacturer/custom-designs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await loadOrders();
    } catch {
      /* ignore — user can retry */
    }
  }

  const pending = orders?.filter((o) => o.status === 'pending').length ?? 0;

  return (
    <ManufacturerLayout>
      <div className="mx-auto w-full max-w-5xl space-y-5 py-3 sm:py-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PencilLine className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Custom Designs</span>
            </div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Custom Design Orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sanitized custom design orders from stores. Customer details are not shared — ship to the store address listed on each order.
            </p>
          </div>
        </header>

        {/* Pending alert */}
        {orders && pending > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-bold text-yellow-900">
              {pending}
            </span>
            <span>
              {pending === 1 ? '1 order' : `${pending} orders`} pending confirmation.
            </span>
          </div>
        )}

        {/* Loading */}
        {!orders && !error && (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {orders && orders.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <PencilLine className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No custom design orders yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Orders appear here when store managers forward approved customer requests.
            </p>
          </div>
        )}

        {/* Order list */}
        {orders && orders.length > 0 && (
          <div className="space-y-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAdvanceStatus={handleAdvanceStatus}
              />
            ))}
          </div>
        )}
      </div>
    </ManufacturerLayout>
  );
}
