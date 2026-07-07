'use client';

import { Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useB2BCart } from '@/hooks/use-b2b-cart';


export default function NewB2BOrderPage() {
  const router = useRouter();
  const cart = useB2BCart();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    if (cart.items.length === 0) return;
    const firstItem = cart.items[0];
    if (!firstItem) return;
    const manufacturerId = firstItem.manufacturerId;
    if (cart.items.some((item) => item.manufacturerId !== manufacturerId)) {
      setError('Cart contains products from more than one manufacturer.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturerId,
          deliveryAddress,
          notes: notes || undefined,
          items: cart.items.map((item) => ({
            manufacturerProductId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });
      const json = (await res.json()) as
        | { data: { id: string } }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) {
          window.location.assign('/store/login?next=/jeweller/b2b-orders/new');
          return;
        }
        setError('error' in json ? json.error.message : 'Failed to place order');
        return;
      }
      cart.clear();
      router.push(`/jeweller/b2b-orders/${json.data.id}`);
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <JewellerLayout>
      <div className="mx-auto grid w-full max-w-6xl gap-5 py-3 sm:py-5 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Place B2B Order
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review quantities and send this purchase order to the manufacturer.
            </p>
          </div>

          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Your B2B cart is empty</p>
              <Button className="mt-4" onClick={() => router.push('/jeweller/manufacturer-catalog')}>
                Browse Catalog
              </Button>
            </div>
          ) : (
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {cart.items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-[72px] w-[72px] rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.designNumber} · MOQ {item.minOrderQty}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        className="h-8 w-24"
                        type="number"
                        min={item.minOrderQty}
                        value={item.quantity}
                        onChange={(e) => cart.update(item.productId, Number(e.target.value))}
                      />
                      <button
                        type="button"
                        onClick={() => cart.remove(item.productId)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit space-y-4 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Delivery Details</h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Delivery Address *
            </label>
            <textarea
              className="mt-1 min-h-28 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Store delivery address"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              className="mt-1 min-h-20 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional instructions"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">{cart.totals.count} items</span>
          </div>
          <Button
            className="w-full"
            disabled={cart.items.length === 0 || !deliveryAddress.trim() || submitting}
            onClick={() => void placeOrder()}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Place Order'}
          </Button>
        </aside>
      </div>
    </JewellerLayout>
  );
}
