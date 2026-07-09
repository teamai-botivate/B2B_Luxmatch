'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, MapPin, ShoppingBag, Store, Trash2 } from 'lucide-react';
import Link from 'next/link';

import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuestCart } from '@/hooks/use-guest-cart';

type DeliveryMode = 'delivery' | 'pickup';

export default function KioskCheckoutPage() {
  const router = useRouter();
  const cart = useGuestCart();

  const [mode, setMode] = useState<DeliveryMode>('pickup');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to home if cart is empty after hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && cart.items.length === 0) router.replace('/');
  }, [mounted, cart.items.length, router]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim() || form.phone.trim().length < 7) {
      setError('Please enter a valid phone number.'); return;
    }
    if (mode === 'delivery' && !form.address.trim()) {
      setError('Please enter a delivery address.'); return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/kiosk/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name.trim(),
          customerPhone: form.phone.trim(),
          customerEmail: form.email.trim() || undefined,
          pickupStore: mode === 'pickup',
          deliveryAddress: mode === 'delivery' ? form.address.trim() : undefined,
          notes: form.notes.trim() || undefined,
          items: cart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        }),
      });

      const json = (await res.json()) as
        | { data: { id: string; orderNumber: string } }
        | { error: { message: string } };

      if (!res.ok || 'error' in json) {
        setError('error' in json ? json.error.message : 'Could not place order. Please try again.');
        return;
      }

      cart.clear();
      router.push(`/kiosk-checkout/success?order=${json.data.orderNumber}&id=${json.data.id}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || cart.items.length === 0) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-semibold tracking-tight">Complete Your Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">No account needed — just your contact details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cart summary */}
          <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your selection ({cart.totals.count} item{cart.totals.count !== 1 ? 's' : ''})</span>
            </div>
            <div className="divide-y">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => cart.remove(item.productId)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold tabular-nums">{cart.totals.count} item{cart.totals.count !== 1 ? 's' : ''} selected</span>
            </div>
          </section>

          {/* Contact details */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name *</label>
                <Input
                  className="mt-1"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone *</label>
                <Input
                  className="mt-1"
                  type="tel"
                  placeholder="10-digit mobile"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
                <Input
                  className="mt-1"
                  type="email"
                  placeholder="For order updates"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Delivery mode */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Delivery Preference</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('pickup')}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  mode === 'pickup'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Store className="h-4 w-4 flex-shrink-0" />
                Pickup in Store
              </button>
              <button
                type="button"
                onClick={() => setMode('delivery')}
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  mode === 'delivery'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                Home Delivery
              </button>
            </div>

            {mode === 'delivery' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Delivery Address *</label>
                <textarea
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="House / flat, street, city, PIN code"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  required={mode === 'delivery'}
                />
              </div>
            )}

            {mode === 'pickup' && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                Store staff will contact you when your order is ready for pickup.
              </p>
            )}
          </section>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm resize-none min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Any special instructions…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="metal-sheen flex-1 h-11 text-sm font-semibold"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Placing Order…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Place Order</>
              )}
            </Button>
            <Link href="/catalog" className="flex-1">
              <Button type="button" variant="outline" className="w-full h-11">
                Continue Shopping
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By placing an order you agree to be contacted by store staff regarding your purchase.
          </p>
        </form>
      </div>
    </CustomerLayout>
  );
}
