'use client';

import { Loader2, Save, Store } from 'lucide-react';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type StoreProfile = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  tagline: string | null;
  website_url: string | null;
};

type BrandingForm = {
  logo_url: string;
  tagline: string;
  website_url: string;
};

export default function StoreProfilePage() {
  const { toast } = useToast();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [form, setForm] = useState<BrandingForm>({ logo_url: '', tagline: '', website_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/store/me', { cache: 'no-store' });
        const json = await res.json() as { data: StoreProfile } | { error: { message: string } };
        if (!res.ok || 'error' in json) {
          if (res.status === 401) { window.location.assign('/store/login?next=/jeweller/store-profile'); return; }
          setError('error' in json ? json.error.message : 'Failed to load store');
          return;
        }
        setStore(json.data);
        setForm({
          logo_url: json.data.logo_url ?? '',
          tagline: json.data.tagline ?? '',
          website_url: json.data.website_url ?? '',
        });
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/store/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: form.logo_url.trim() || undefined,
          tagline: form.tagline.trim() || undefined,
          website_url: form.website_url.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: { message: string } };
        toast({ title: 'Error', description: j.error?.message ?? 'Save failed', variant: 'destructive' });
        return;
      }
      toast({ title: 'Saved', description: 'Store branding updated.' });
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-2xl space-y-6 py-3 sm:py-5">
        <header>
          <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">Store Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Branding shown to customers on the kiosk storefront.
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {store && (
          <>
            {/* Read-only info */}
            <section className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Store className="h-4 w-4" /> Store Details
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{store.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">City</p>
                  <p className="font-medium">{store.city ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{store.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{store.phone ?? '—'}</p>
                </div>
              </div>
            </section>

            {/* Branding form */}
            <form onSubmit={handleSave} className="space-y-5">
              <section className="rounded-xl border bg-card p-4 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Customer-Facing Branding</p>

                <div className="space-y-1.5">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    placeholder="https://..."
                    value={form.logo_url}
                    onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                  />
                  {form.logo_url && (
                    <img
                      src={form.logo_url}
                      alt="Logo preview"
                      className="mt-2 h-12 object-contain rounded border bg-muted/30 px-2"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Shown in the storefront header. Use a hosted image URL (Cloudinary, etc.).</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Your store's tagline…"
                    maxLength={160}
                    value={form.tagline}
                    onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Short description shown under your store name (max 160 chars).</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input
                    id="website_url"
                    type="url"
                    placeholder="https://yourstore.com"
                    value={form.website_url}
                    onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                  />
                </div>
              </section>

              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <Store className="h-3.5 w-3.5 flex-shrink-0" />
                Customer-facing pages show: <strong>{store.name}</strong> · Powered by AT Jewellers
              </div>

              <Button type="submit" disabled={saving} className="metal-sheen">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save Branding</>}
              </Button>
            </form>
          </>
        )}
      </div>
    </JewellerLayout>
  );
}
