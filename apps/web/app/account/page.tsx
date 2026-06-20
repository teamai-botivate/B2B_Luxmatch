'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Check,
  Heart,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { SignedUploadParams } from '@luxematch/cloudinary';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCustomer } from '@/hooks/use-customer';
import { useSavedItems } from '@/contexts/SavedItemsContext';
import { formatINR } from '@/lib/format';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function uploadAvatar(file: File): Promise<void> {
  // 1. Get a short-lived signed upload signature scoped to the avatars folder.
  const signRes = await fetch('/api/customer/avatar/sign', { method: 'POST' });
  const signJson = (await signRes.json()) as { data?: SignedUploadParams; error?: { message: string } };
  if (!signRes.ok || !signJson.data) throw new Error(signJson.error?.message ?? 'Could not start upload');
  const params = signJson.data;

  // 2. Upload the bytes straight to Cloudinary.
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', params.apiKey);
  form.append('timestamp', String(params.timestamp));
  form.append('folder', params.folder);
  if (params.publicId) form.append('public_id', params.publicId);
  form.append('signature', params.signature);
  const upRes = await fetch(params.uploadUrl, { method: 'POST', body: form });
  const upJson = (await upRes.json()) as { secure_url?: string; public_id?: string; error?: { message: string } };
  if (!upRes.ok || !upJson.secure_url || !upJson.public_id) {
    throw new Error(upJson.error?.message ?? 'Upload failed');
  }

  // 3. Persist the URL + public_id on the customer row.
  const saveRes = await fetch('/api/customer/avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: upJson.secure_url, public_id: upJson.public_id }),
  });
  if (!saveRes.ok) throw new Error('Could not save profile picture');
}

type Order = {
  id: string; order_number: string; status: string;
  total: number; created_at: string; delivery_type: string;
};

type Address = {
  id: string; label: string; name: string; phone: string;
  line1: string; line2: string | null; city: string; state: string;
  pin_code: string; is_default: boolean;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  placed:    { label: 'Order Placed', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed',    color: 'bg-indigo-100 text-indigo-700' },
  packed:    { label: 'Packed',       color: 'bg-amber-100 text-amber-700' },
  shipped:   { label: 'Shipped',      color: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Delivered',    color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled',    color: 'bg-red-100 text-red-700' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AccountPage() {
  const router = useRouter();
  const { customer, loading, refresh, logout } = useCustomer();
  const { savedItems } = useSavedItems();

  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setAvatarError(null);
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      setAvatarError('Use a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('Image must be under 5 MB.');
      return;
    }
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
      await refresh();
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true); setAvatarError(null);
    try {
      await fetch('/api/customer/avatar', { method: 'DELETE' });
      await refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!customer) { setDataLoading(false); return; }
    Promise.all([
      fetch('/api/customer/orders', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then((j: { data?: { orders: Order[] } } | null) => setOrders(j?.data?.orders ?? []))
        .catch(() => {}),
      fetch('/api/customer/orders/addresses', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then((j: { data?: { addresses: Address[] } } | null) => setAddresses(j?.data?.addresses ?? []))
        .catch(() => {}),
    ]).finally(() => setDataLoading(false));
  }, [customer, loading]);

  async function saveName() {
    if (!nameDraft.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (res.ok) {
        await refresh();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </CustomerLayout>
    );
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#e5d8bd] bg-[#fbf9f5]">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-medium">Sign in to your account</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Track orders, manage addresses, and pick up where you left off.
          </p>
          <Button className="metal-sheen mt-6 rounded-lg border-0 font-semibold text-[#17120b]" onClick={() => router.push('/login')}>
            Login / Sign up
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const recentOrders = orders.slice(0, 3);
  const stats = [
    { label: 'Orders', value: orders.length, icon: Package, href: '/orders' },
    { label: 'Saved', value: savedItems.size, icon: Heart, href: '/saved' },
    { label: 'Addresses', value: addresses.length, icon: MapPin, href: undefined },
  ];

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">My Account</p>
          <h1 className="text-3xl font-medium tracking-tight text-foreground">
            Welcome back{customer.name ? `, ${customer.name.split(' ')[0]}` : ''}
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Profile card */}
            <section className="rounded-xl border border-[#e4d8c6] bg-[#fffdf8] p-6 shadow-[0_14px_40px_rgba(31,24,18,0.08)]">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[#e5d8bd] bg-[#fbf9f5]">
                    {customer.avatarUrl ? (
                      <Image src={customer.avatarUrl} alt={customer.name ?? 'Profile picture'} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarBusy}
                      aria-label="Change profile picture"
                      className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:opacity-100"
                    >
                      {avatarBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickAvatar} />
                  {customer.avatarUrl && !avatarBusy && (
                    <button onClick={() => void removeAvatar()} className="mt-1.5 flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={nameDraft}
                        autoFocus
                        placeholder="Your name"
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') void saveName(); if (e.key === 'Escape') setEditing(false); }}
                        className="h-9 rounded-lg border-[#d8ccba] bg-white"
                      />
                      <button onClick={() => void saveName()} disabled={saving} aria-label="Save name"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15 disabled:opacity-50">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditing(false)} aria-label="Cancel"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/5 text-muted-foreground hover:bg-black/10">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="truncate text-lg font-semibold">{customer.name ?? 'Customer'}</p>
                      <button
                        onClick={() => { setNameDraft(customer.name ?? ''); setEditing(true); }}
                        aria-label="Edit name"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5 hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {customer.phone}
                    </div>
                  </div>
                </div>
              </div>

              {avatarError && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{avatarError}</p>
              )}

              {/* Stats */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                {stats.map(s => {
                  const Inner = (
                    <div className="rounded-lg border border-[#ece2d0] bg-[#fbf9f5] p-3 text-center transition-colors hover:border-primary/40">
                      <s.icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                      <p className="text-xl font-semibold leading-none">{s.value}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    </div>
                  );
                  return s.href
                    ? <Link key={s.label} href={s.href}>{Inner}</Link>
                    : <div key={s.label}>{Inner}</div>;
                })}
              </div>
            </section>

            {/* Recent orders */}
            <section className="rounded-xl border border-[#e4d8c6] bg-[#fffdf8] p-6 shadow-[0_14px_40px_rgba(31,24,18,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Recent Orders</h2>
                {orders.length > 0 && (
                  <Link href="/orders" className="text-xs font-medium text-primary hover:underline">View all</Link>
                )}
              </div>

              {dataLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
              ) : recentOrders.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">No orders yet.</p>
                  <Link href="/catalog"><Button variant="outline" className="mt-4 rounded-lg">Browse collection</Button></Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map(o => {
                    const st = STATUS_LABEL[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-700' };
                    return (
                      <Link key={o.id} href={`/orders/${o.id}`}
                        className="flex items-center justify-between rounded-lg border border-[#ece2d0] bg-[#fbf9f5] p-3 transition-colors hover:border-primary/40">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">#{o.order_number}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(o.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}>{st.label}</span>
                          <span className="text-sm font-semibold">{formatINR(o.total)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Saved addresses */}
            <section className="rounded-xl border border-[#e4d8c6] bg-[#fffdf8] p-6 shadow-[0_14px_40px_rgba(31,24,18,0.08)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Saved Addresses</h2>
              {dataLoading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Loading…</div>
              ) : addresses.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  No saved addresses yet. They&apos;re saved automatically at checkout.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map(a => (
                    <div key={a.id} className="rounded-lg border border-[#ece2d0] bg-[#fbf9f5] p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-medium">{a.label}</span>
                        {a.is_default && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} — {a.pin_code}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-3 md:sticky md:top-24 md:h-fit">
            <Link href="/orders" className="flex items-center justify-between rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-4 transition-colors hover:border-primary/50">
              <span className="flex items-center gap-3"><Package className="h-5 w-5 text-primary" /><span className="font-medium">My Orders</span></span>
              <span className="text-muted-foreground">›</span>
            </Link>
            <Link href="/saved" className="flex items-center justify-between rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-4 transition-colors hover:border-primary/50">
              <span className="flex items-center gap-3"><Heart className="h-5 w-5 text-primary" /><span className="font-medium">Saved Items</span></span>
              <span className="text-muted-foreground">›</span>
            </Link>
            <Link href="/cart" className="flex items-center justify-between rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-4 transition-colors hover:border-primary/50">
              <span className="flex items-center gap-3"><ShoppingBag className="h-5 w-5 text-primary" /><span className="font-medium">My Cart</span></span>
              <span className="text-muted-foreground">›</span>
            </Link>

            <Button variant="outline" className="mt-2 w-full rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => { await logout(); router.push('/'); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </aside>
        </div>
      </div>
    </CustomerLayout>
  );
}
