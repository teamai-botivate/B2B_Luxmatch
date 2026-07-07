'use client';

// NOTE: This page is intended for STORE OWNERS only.
// Store managers (lm_store_manager cookie) should NOT have access.
// The server-side API routes enforce this by checking the lm_store (owner) cookie.
// A future guard on this route can redirect managers away client-side if needed.

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldOff,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Manager = {
  id: string;
  store_id: string;
  naam: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

type Flash = { kind: 'success' | 'error'; message: string };

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-muted text-muted-foreground'
      }`}
    >
      {active ? (
        <ShieldCheck className="h-3 w-3" />
      ) : (
        <ShieldOff className="h-3 w-3" />
      )}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

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
        {flash.message}
      </div>
      <button type="button" onClick={onDismiss} className="text-current opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password field with eye toggle
// ---------------------------------------------------------------------------

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••'}
        autoComplete={autoComplete ?? 'new-password'}
        className="pr-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Manager inline form
// ---------------------------------------------------------------------------

type AddForm = { naam: string; email: string; password: string; phone: string };
const EMPTY_ADD: AddForm = { naam: '', email: '', password: '', phone: '' };

function AddManagerForm({
  onSaved,
  onCancel,
}: {
  onSaved: (m: Manager) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AddForm>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof AddForm) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.naam.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam: form.naam.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { data: Manager } | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Failed to add manager');
        return;
      }
      onSaved((json as { data: Manager }).data);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4"
    >
      <p className="text-sm font-semibold">New Manager</p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="add-naam">Name *</Label>
          <Input
            id="add-naam"
            placeholder="Full name"
            value={form.naam}
            onChange={(e) => field('naam')(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-email">Email *</Label>
          <Input
            id="add-email"
            type="email"
            placeholder="manager@example.com"
            value={form.email}
            onChange={(e) => field('email')(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-password">Password *</Label>
          <PasswordInput
            id="add-password"
            value={form.password}
            onChange={field('password')}
            placeholder="Min 6 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-phone">Phone (optional)</Label>
          <Input
            id="add-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(e) => field('phone')(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={saving} className="metal-sheen">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" /> Add Manager
            </>
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Reset password inline widget
// ---------------------------------------------------------------------------

function ResetPasswordInline({
  managerId,
  onDone,
  onCancel,
}: {
  managerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/${managerId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: { message: string } };
        setError(j.error?.message ?? 'Reset failed');
        return;
      }
      onDone();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-amber-800">Set new password</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <PasswordInput
            id={`reset-pw-${managerId}`}
            value={password}
            onChange={setPassword}
            placeholder="New password (min 6)"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manager row
// ---------------------------------------------------------------------------

function ManagerRow({
  manager,
  onToggleActive,
  onDelete,
  onPasswordReset,
}: {
  manager: Manager;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPasswordReset: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function toggle() {
    setBusy(true);
    await onToggleActive(manager.id, !manager.is_active);
    setBusy(false);
  }

  async function remove() {
    if (
      !confirm(
        `Delete manager "${manager.naam}"? This cannot be undone.`
      )
    )
      return;
    setBusy(true);
    await onDelete(manager.id);
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Info */}
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{manager.naam}</p>
            <Badge active={manager.is_active} />
          </div>
          <p className="text-xs text-muted-foreground">{manager.email}</p>
          {manager.phone && (
            <p className="text-xs text-muted-foreground">{manager.phone}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            Added {new Date(manager.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle active */}
          <Button
            size="sm"
            variant="outline"
            onClick={toggle}
            disabled={busy}
            title={manager.is_active ? 'Deactivate manager' : 'Activate manager'}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : manager.is_active ? (
              <>
                <ShieldOff className="mr-1.5 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Activate
              </>
            )}
          </Button>

          {/* Reset password */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowReset((s) => !s)}
            disabled={busy}
            title="Reset password"
          >
            <KeyRound className="mr-1.5 h-4 w-4" />
            Reset Password
          </Button>

          {/* Delete */}
          <Button
            size="sm"
            variant="outline"
            onClick={remove}
            disabled={busy}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Delete manager"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Inline reset password */}
      {showReset && (
        <ResetPasswordInline
          managerId={manager.id}
          onDone={() => {
            setShowReset(false);
            onPasswordReset(manager.id);
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [authError, setAuthError] = useState(false);

  function showFlash(kind: Flash['kind'], message: string) {
    setFlash({ kind, message });
    // auto-dismiss after 4 s
    setTimeout(() => setFlash(null), 4000);
  }

  async function loadManagers() {
    setLoading(true);
    try {
      const res = await fetch('/api/manager/list', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const json = (await res.json()) as
        | { data: Manager[] }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        showFlash('error', 'error' in json ? json.error.message : 'Failed to load managers');
        return;
      }
      setManagers((json as { data: Manager[] }).data);
    } catch {
      showFlash('error', 'Network error loading managers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadManagers();
  }, []);

  // ---- callbacks ----

  function handleManagerAdded(m: Manager) {
    setManagers((prev) => [m, ...prev]);
    setShowAdd(false);
    showFlash('success', `Manager "${m.naam}" added successfully.`);
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/manager/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: active }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: { message: string } };
        showFlash('error', j.error?.message ?? 'Failed to update manager');
        return;
      }
      setManagers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_active: active } : m))
      );
      showFlash('success', `Manager ${active ? 'activated' : 'deactivated'}.`);
    } catch {
      showFlash('error', 'Network error');
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/manager/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = (await res.json()) as { error?: { message: string } };
        showFlash('error', j.error?.message ?? 'Failed to delete manager');
        return;
      }
      setManagers((prev) => prev.filter((m) => m.id !== id));
      showFlash('success', 'Manager deleted.');
    } catch {
      showFlash('error', 'Network error');
    }
  }

  function handlePasswordReset() {
    showFlash('success', 'Password reset successfully.');
  }

  // ---- render ----

  if (authError) {
    return (
      <JewellerLayout>
        <div className="mx-auto w-full max-w-2xl py-12 text-center">
          <p className="text-muted-foreground text-sm">
            You do not have permission to manage store managers. This page is for store owners only.
          </p>
        </div>
      </JewellerLayout>
    );
  }

  const activeManagers = managers.filter((m) => m.is_active);
  const inactiveManagers = managers.filter((m) => !m.is_active);

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 py-3 sm:py-5">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Store Managers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Add and manage staff who can approve orders and custom design requests.
            </p>
          </div>
          {!showAdd && (
            <Button
              className="metal-sheen w-full sm:w-auto flex-shrink-0"
              onClick={() => setShowAdd(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Manager
            </Button>
          )}
        </header>

        {/* Flash */}
        {flash && (
          <FlashBanner flash={flash} onDismiss={() => setFlash(null)} />
        )}

        {/* Add form */}
        {showAdd && (
          <AddManagerForm
            onSaved={handleManagerAdded}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading managers…
          </div>
        )}

        {/* Empty state */}
        {!loading && managers.length === 0 && !showAdd && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No managers yet.</p>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add your first manager
            </Button>
          </div>
        )}

        {/* Active managers */}
        {!loading && activeManagers.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Active ({activeManagers.length})
            </h2>
            {activeManagers.map((m) => (
              <ManagerRow
                key={m.id}
                manager={m}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onPasswordReset={handlePasswordReset}
              />
            ))}
          </section>
        )}

        {/* Inactive managers */}
        {!loading && inactiveManagers.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Inactive ({inactiveManagers.length})
            </h2>
            {inactiveManagers.map((m) => (
              <ManagerRow
                key={m.id}
                manager={m}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
                onPasswordReset={handlePasswordReset}
              />
            ))}
          </section>
        )}
      </div>
    </JewellerLayout>
  );
}
