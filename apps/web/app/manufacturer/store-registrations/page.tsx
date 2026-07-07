'use client';

import { CheckCircle, ClipboardList, Loader2, MapPin, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { StorePublic } from '@luxematch/db';

function formatAddress(store: StorePublic): string {
  const parts = [
    store.fixed_address_street,
    store.fixed_address_landmark,
    store.fixed_address_city,
    store.fixed_address_state,
    store.fixed_address_pincode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function StoreRegistrationsPage() {
  const [stores, setStores] = useState<StorePublic[] | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/manufacturer/store-registrations', { cache: 'no-store' });
      const json = (await res.json()) as { data: StorePublic[] } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) {
          window.location.assign('/manufacturer/login?next=/manufacturer/store-registrations');
          return;
        }
        setError('error' in json ? json.error.message : 'Failed to load registrations');
        return;
      }
      setStores(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/manufacturer/store-registrations/${id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        await load();
      } else {
        const json = (await res.json()) as { error?: { message: string } };
        setError(json.error?.message ?? 'Failed to approve store');
      }
    } catch {
      setError('Network error');
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    if (!confirm('Reject this store registration? The store owner will not be able to log in.')) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/manufacturer/store-registrations/${id}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        await load();
      } else {
        const json = (await res.json()) as { error?: { message: string } };
        setError(json.error?.message ?? 'Failed to reject store');
      }
    } catch {
      setError('Network error');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Store Registrations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stores === null
              ? 'Loading...'
              : stores.length === 0
                ? 'No pending registrations'
                : `${stores.length} pending registration${stores.length !== 1 ? 's' : ''} awaiting review`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {stores === null && !error ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading registrations...
        </div>
      ) : stores?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No pending registrations</p>
          <p className="mt-1 text-xs text-muted-foreground">
            New store self-registrations will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {stores?.map((store) => {
            const isActing = actingId === store.id;
            const address = formatAddress(store);

            return (
              <div
                key={store.id}
                className="overflow-hidden rounded-xl border bg-card transition-colors hover:bg-muted/10"
              >
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Store + owner info */}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold">{store.name}</h2>
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
                            Pending
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{store.email}</p>
                      </div>

                      <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Owner Name</p>
                          <p className="mt-0.5">{store.owner_naam ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Owner Phone</p>
                          <p className="mt-0.5">{store.owner_phone ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">City</p>
                          <p className="mt-0.5">{store.city ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Store Phone</p>
                          <p className="mt-0.5">{store.phone ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                          <p className="mt-0.5">{formatDate(store.registration_submitted_at)}</p>
                        </div>
                      </div>

                      {address !== '—' && (
                        <div className="flex items-start gap-1.5 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          <div>
                            <span className="font-medium text-muted-foreground">Fixed Delivery Address: </span>
                            <span>{address}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        onClick={() => void approve(store.id)}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void reject(store.id)}
                        disabled={isActing}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isActing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
