'use client';

import type { JewellerSettings } from '@luxematch/db';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

type ShopForm = {
  store_name: string;
  city: string;
  gstin: string;
  owner_name: string;
  phone: string;
  logo_url: string;
  idle_reset_enabled: boolean;
  idle_reset_seconds: number;
};

const emptyForm: ShopForm = {
  store_name: '',
  city: '',
  gstin: '',
  owner_name: '',
  phone: '',
  logo_url: '',
  idle_reset_enabled: true,
  idle_reset_seconds: 90,
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<ShopForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [pin, setPin] = useState({ currentPin: '', newPin: '', confirmPin: '' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/shop/settings', { cache: 'no-store' });
        const json = (await res.json()) as
          | { data: JewellerSettings }
          | { error: { message: string } };
        if ('error' in json) throw new Error(json.error.message);
        setForm({
          store_name: json.data.store_name,
          city: json.data.city ?? '',
          gstin: json.data.gstin ?? '',
          owner_name: json.data.owner_name ?? '',
          phone: json.data.phone ?? '',
          logo_url: json.data.logo_url ?? '',
          idle_reset_enabled: json.data.idle_reset_enabled,
          idle_reset_seconds: json.data.idle_reset_seconds,
        });
      } catch (e) {
        toast({
          title: 'Could not load settings',
          description: e instanceof Error ? e.message : 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [toast]);

  function setField<K extends keyof ShopForm>(key: K, value: ShopForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveShopInfo(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: form.store_name.trim(),
          city: form.city.trim() || null,
          gstin: form.gstin.trim() || null,
          owner_name: form.owner_name.trim() || null,
          phone: form.phone.trim() || null,
          logo_url: form.logo_url.trim() || null,
          idle_reset_enabled: form.idle_reset_enabled,
          idle_reset_seconds: form.idle_reset_seconds,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'Settings update failed');
      toast({ title: 'Settings saved', description: 'Shop information has been updated.' });
    } catch (e) {
      toast({
        title: 'Could not save settings',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function changePin(e: FormEvent) {
    e.preventDefault();
    if (pin.newPin !== pin.confirmPin) {
      toast({ title: 'PINs do not match', variant: 'destructive' });
      return;
    }
    setPinSaving(true);
    try {
      const res = await fetch('/api/shop/pin/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: pin.currentPin, newPin: pin.newPin }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? 'PIN change failed');
      setPin({ currentPin: '', newPin: '', confirmPin: '' });
      toast({ title: 'PIN changed', description: 'Use the new PIN next time you unlock jeweller mode.' });
    } catch (e) {
      toast({
        title: 'Could not change PIN',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPinSaving(false);
    }
  }

  return (
    <JewellerLayout>
      <div className="mx-auto max-w-5xl px-6 py-8" data-testid="jeweller-settings-page">
        <header className="mb-6">
          <h1 className="text-3xl font-medium tracking-tight">Shop settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage store info, PIN, and idle-reset behaviour.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <form onSubmit={saveShopInfo} className="space-y-5 rounded-2xl border bg-card p-6 lg:col-span-2">
              <div>
                <h2 className="text-sm font-semibold">Store information</h2>
                <p className="mt-1 text-xs text-muted-foreground">Shown in customer-facing shop surfaces.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Store name" htmlFor="store_name">
                  <Input id="store_name" value={form.store_name} onChange={(e) => setField('store_name', e.target.value)} required />
                </Field>
                <Field label="City" htmlFor="city">
                  <Input id="city" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                </Field>
                <Field label="Owner name" htmlFor="owner_name">
                  <Input id="owner_name" value={form.owner_name} onChange={(e) => setField('owner_name', e.target.value)} />
                </Field>
                <Field label="Phone" htmlFor="phone">
                  <Input id="phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </Field>
                <Field label="GSTIN" htmlFor="gstin">
                  <Input id="gstin" value={form.gstin} onChange={(e) => setField('gstin', e.target.value)} />
                </Field>
                <Field label="Logo URL" htmlFor="logo_url">
                  <Input id="logo_url" value={form.logo_url} onChange={(e) => setField('logo_url', e.target.value)} placeholder="https://..." />
                </Field>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-semibold">Idle reset</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Clear customer state after inactivity.</p>
                  </div>
                  <Switch checked={form.idle_reset_enabled} onCheckedChange={(v) => setField('idle_reset_enabled', v)} />
                </div>
                <div className="mt-4 max-w-xs">
                  <Label htmlFor="idle_reset_seconds" className="mb-1.5 block text-xs font-semibold">Idle reset seconds</Label>
                  <Input
                    id="idle_reset_seconds"
                    type="number"
                    min={15}
                    max={600}
                    value={form.idle_reset_seconds}
                    onChange={(e) => setField('idle_reset_seconds', Number(e.target.value))}
                    disabled={!form.idle_reset_enabled}
                  />
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save settings
              </Button>
            </form>

            <form onSubmit={changePin} className="space-y-4 rounded-2xl border bg-card p-6">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Change PIN
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">PIN must be exactly 6 digits.</p>
              </div>
              <Field label="Current PIN" htmlFor="currentPin">
                <Input id="currentPin" type="password" inputMode="numeric" maxLength={6} value={pin.currentPin} onChange={(e) => setPin((p) => ({ ...p, currentPin: e.target.value }))} />
              </Field>
              <Field label="New PIN" htmlFor="newPin">
                <Input id="newPin" type="password" inputMode="numeric" maxLength={6} value={pin.newPin} onChange={(e) => setPin((p) => ({ ...p, newPin: e.target.value }))} />
              </Field>
              <Field label="Confirm new PIN" htmlFor="confirmPin">
                <Input id="confirmPin" type="password" inputMode="numeric" maxLength={6} value={pin.confirmPin} onChange={(e) => setPin((p) => ({ ...p, confirmPin: e.target.value }))} />
              </Field>
              <Button type="submit" variant="outline" disabled={pinSaving}>
                {pinSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update PIN
              </Button>
            </form>
          </div>
        )}
      </div>
    </JewellerLayout>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold">
        {label}
      </Label>
      {children}
    </div>
  );
}
