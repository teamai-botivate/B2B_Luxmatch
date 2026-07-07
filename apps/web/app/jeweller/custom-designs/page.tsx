'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, PencilLine, X, XCircle } from 'lucide-react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type CustomDesignStatus = 'pending' | 'approved' | 'rejected' | 'forwarded';

type CustomDesignRequest = {
  id: string;
  store_id: string;
  customer_naam: string;
  customer_phone: string;
  category: string;
  weight_grams: number | null;
  purity: string | null;
  design_notes: string | null;
  customer_notes: string | null;
  reference_image_url: string | null;
  status: CustomDesignStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type Flash = { kind: 'success' | 'error'; message: string };

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<CustomDesignStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-50 text-blue-800 border-blue-200',
  forwarded: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<CustomDesignStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  forwarded: 'Forwarded to Manufacturer',
  rejected: 'Rejected',
};

function StatusBadge({ status }: { status: CustomDesignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Flash banner ──────────────────────────────────────────────────────────────

function FlashBanner({ flash, onDismiss }: { flash: Flash; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm ${
        flash.kind === 'success'
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <div className="flex items-center gap-2">
        {flash.kind === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
        {flash.kind === 'error' && <XCircle className="h-4 w-4 flex-shrink-0" />}
        {flash.message}
      </div>
      <button type="button" onClick={onDismiss} className="text-current opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: CustomDesignRequest;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleApprove() {
    setBusy(true);
    await onApprove(request.id);
    setBusy(false);
  }

  async function handleReject() {
    if (!confirm(`Reject this design request from ${request.customer_naam}? This cannot be undone.`)) return;
    setBusy(true);
    await onReject(request.id);
    setBusy(false);
  }

  const isPending = request.status === 'pending';
  const date = new Date(request.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-[#e4d8c6] bg-[#FBF9F5] overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-start gap-4 px-4 py-4 text-left hover:bg-[#f5ede0]/40 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#2c1810]">{request.customer_naam}</p>
            <StatusBadge status={request.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span>{request.customer_phone}</span>
            {request.category && <span>Category: {request.category}</span>}
            {request.weight_grams != null && <span>Weight: {request.weight_grams}g</span>}
            {request.purity && <span>Purity: {request.purity}</span>}
          </div>
          <p className="text-[11px] text-muted-foreground/60">{date}</p>
        </div>
        <div className="flex-shrink-0 pt-0.5 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#e4d8c6] px-4 pb-4 pt-3 space-y-4 bg-white/60">
          {/* Design notes */}
          {(request.design_notes || request.customer_notes) && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
              {request.design_notes && (
                <p className="text-sm leading-relaxed">{request.design_notes}</p>
              )}
              {request.customer_notes && request.customer_notes !== request.design_notes && (
                <p className="text-sm leading-relaxed text-muted-foreground">{request.customer_notes}</p>
              )}
            </div>
          )}

          {/* Reference image */}
          {request.reference_image_url && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference Image</p>
              <a
                href={request.reference_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={request.reference_image_url}
                  alt="Reference design"
                  className="w-full max-h-56 rounded-lg object-contain border border-[#e4d8c6] bg-muted"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </a>
            </div>
          )}

          {/* Reviewed info */}
          {request.reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Reviewed on{' '}
              {new Date(request.reviewed_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          {/* Action buttons — only for pending */}
          {isPending && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={busy}
                className="metal-sheen"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                )}
                Approve &amp; Forward to Manufacturer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={busy}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomDesignsPage() {
  const [requests, setRequests] = useState<CustomDesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [filter, setFilter] = useState<CustomDesignStatus | 'all'>('all');

  function showFlash(kind: Flash['kind'], message: string) {
    setFlash({ kind, message });
    setTimeout(() => setFlash(null), 5000);
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await fetch('/api/manager/custom-designs', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.assign('/store/login?next=/jeweller/custom-designs');
        return;
      }
      const json = (await res.json()) as
        | { data: CustomDesignRequest[] }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        showFlash('error', 'error' in json ? json.error.message : 'Failed to load requests');
        return;
      }
      setRequests((json as { data: CustomDesignRequest[] }).data);
    } catch {
      showFlash('error', 'Network error loading requests');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/manager/custom-designs/${id}/approve`, { method: 'POST' });
      const json = (await res.json()) as { data?: unknown; error?: { message: string } };
      if (!res.ok || 'error' in json) {
        showFlash('error', json.error?.message ?? 'Failed to approve request');
        return;
      }
      showFlash('success', 'Request approved and forwarded to manufacturer.');
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'forwarded' as CustomDesignStatus } : r))
      );
    } catch {
      showFlash('error', 'Network error');
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/manager/custom-designs/${id}/reject`, { method: 'POST' });
      const json = (await res.json()) as { data?: unknown; error?: { message: string } };
      if (!res.ok || 'error' in json) {
        showFlash('error', json.error?.message ?? 'Failed to reject request');
        return;
      }
      showFlash('success', 'Request rejected.');
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as CustomDesignStatus } : r))
      );
    } catch {
      showFlash('error', 'Network error');
    }
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const forwarded = requests.filter((r) => r.status === 'forwarded');
  const rejected = requests.filter((r) => r.status === 'rejected');
  const approved = requests.filter((r) => r.status === 'approved');

  const filtered =
    filter === 'all'
      ? requests
      : requests.filter((r) => r.status === filter);

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 py-3 sm:py-5">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#a0824a] mb-1">
              <PencilLine className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Custom Designs</span>
            </div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Custom Design Requests</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review customer custom jewellery requests. Approve to forward specs to the manufacturer (no customer data sent). Reject to close the request.
            </p>
          </div>
        </header>

        {/* Stats chips */}
        {!loading && requests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(
              [
                { label: 'All', value: 'all', count: requests.length },
                { label: 'Pending', value: 'pending', count: pending.length },
                { label: 'Forwarded', value: 'forwarded', count: forwarded.length },
                { label: 'Approved', value: 'approved', count: approved.length },
                { label: 'Rejected', value: 'rejected', count: rejected.length },
              ] as const
            ).map(({ label, value, count }) =>
              count > 0 || value === 'all' ? (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    filter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-1.5 opacity-70">{count}</span>
                  )}
                </button>
              ) : null,
            )}
          </div>
        )}

        {/* Flash */}
        {flash && <FlashBanner flash={flash} onDismiss={() => setFlash(null)} />}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
          </div>
        )}

        {/* Empty state */}
        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#e4d8c6] py-16 text-center bg-[#FBF9F5]">
            <PencilLine className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No custom design requests yet.</p>
            <p className="text-xs text-muted-foreground/60">
              Customers submit requests through the in-store kiosk at <code className="bg-muted px-1 rounded">/kiosk/custom-design</code>
            </p>
          </div>
        )}

        {/* Pending alert */}
        {!loading && pending.length > 0 && filter === 'all' && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <span className="rounded-full bg-yellow-200 px-2 py-0.5 text-xs font-bold text-yellow-900">
              {pending.length}
            </span>
            <span>
              {pending.length === 1 ? '1 request' : `${pending.length} requests`} awaiting review.
            </span>
          </div>
        )}

        {/* Request list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}

        {!loading && requests.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No {filter} requests.
          </div>
        )}
      </div>
    </JewellerLayout>
  );
}
