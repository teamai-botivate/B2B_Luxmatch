'use client';

import { Loader2, Pencil, Plus, Store, Trash2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StorePublic } from '@luxematch/db';

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateStoreModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', city: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/manufacturer/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          city: form.city || undefined,
          phone: form.phone || undefined,
        }),
      });
      const json = (await res.json()) as { data: unknown } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Failed to create store');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Add Store</h2>
          <button type="button" onClick={onClose} className="text-lg leading-none text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Store Name *</label>
              <Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input className="mt-1" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input className="mt-1" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password *</label>
              <Input className="mt-1" type="password" minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input className="mt-1" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Store'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditStoreModal({ store, onClose, onSaved }: { store: StorePublic; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: store.name,
    email: store.email,
    city: store.city ?? '',
    phone: store.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturer/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          city: form.city || undefined,
          phone: form.phone || undefined,
        }),
      });
      const json = (await res.json()) as { data: unknown } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Failed to update store');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Edit Store</h2>
          <button type="button" onClick={onClose} className="text-lg leading-none text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Store Name *</label>
              <Input className="mt-1" value={form.name} onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">City</label>
              <Input className="mt-1" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email *</label>
            <Input className="mt-1" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <Input className="mt-1" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ store, onClose }: { store: StorePublic; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturer/stores/${store.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json()) as { data: unknown } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Failed to update password');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">Reset Password — {store.name}</h2>
          <button type="button" onClick={onClose} className="text-lg leading-none text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {success ? (
          <div className="px-5 py-6 text-center space-y-3">
            <p className="text-sm text-green-700 font-medium">Password updated successfully.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4 px-5 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">New Password *</label>
              <Input className="mt-1" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm Password *</label>
              <Input className="mt-1" type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ManufacturerStoresPage() {
  const [stores, setStores] = useState<StorePublic[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StorePublic | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StorePublic | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/manufacturer/stores', { cache: 'no-store' });
      const json = (await res.json()) as { data: StorePublic[] } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) { window.location.assign('/manufacturer/login'); return; }
        setError('error' in json ? json.error.message : 'Failed to load stores');
        return;
      }
      setStores(json.data);
    } catch {
      setError('Network error');
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleStore(store: StorePublic) {
    setUpdatingId(store.id);
    try {
      const res = await fetch(`/api/manufacturer/stores/${store.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !store.is_active }),
      });
      if (res.ok) await load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteStoreConfirm(store: StorePublic) {
    if (!confirm(`Delete "${store.name}"? This will remove the store login and all associated data. This cannot be undone.`)) return;
    setDeletingId(store.id);
    try {
      const res = await fetch(`/api/manufacturer/stores/${store.id}`, { method: 'DELETE' });
      if (res.ok) await load();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {createOpen && <CreateStoreModal onClose={() => setCreateOpen(false)} onSaved={load} />}
      {editTarget && <EditStoreModal store={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
      {passwordTarget && <ResetPasswordModal store={passwordTarget} onClose={() => setPasswordTarget(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stores</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {stores ? `${stores.length} registered store${stores.length !== 1 ? 's' : ''}` : 'Loading...'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Store
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {stores === null && !error ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading stores...
        </div>
      ) : stores?.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Store className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No stores yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add a store account to let a retailer browse and order your catalog.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Store</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">City</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Phone</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {stores?.map((store) => (
                <tr key={store.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{store.city ?? '—'}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{store.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${store.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {store.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle active */}
                      <button
                        type="button"
                        title={store.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleStore(store)}
                        disabled={updatingId === store.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {updatingId === store.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : store.is_active
                            ? <ToggleRight className="h-4 w-4 text-green-700" />
                            : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      {/* Edit */}
                      <button
                        type="button"
                        title="Edit store details"
                        onClick={() => setEditTarget(store)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Reset password */}
                      <button
                        type="button"
                        title="Reset password"
                        onClick={() => setPasswordTarget(store)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        title="Delete store"
                        onClick={() => deleteStoreConfirm(store)}
                        disabled={deletingId === store.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {deletingId === store.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
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
