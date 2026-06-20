'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Check, CreditCard, Lock, MapPin, Smartphone, Store, Truck } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/hooks/use-cart';
import { useCustomer } from '@/hooks/use-customer';
import { trackEvent } from '@/lib/analytics';
import { formatINR } from '@/lib/format';

type PayMethod = 'dummy_card' | 'dummy_upi' | 'dummy_cod';

const PAY_METHODS: { id: PayMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
  { id: 'dummy_card', label: 'Debit / Credit Card', sub: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'dummy_upi', label: 'UPI', sub: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { id: 'dummy_cod', label: 'Cash on Delivery', sub: 'Pay when you receive', icon: Banknote },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { customer } = useCustomer();
  const { items, total } = useCart();
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'click_and_collect'>('delivery');
  const [payMethod, setPayMethod] = useState<PayMethod>('dummy_card');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [address, setAddress] = useState({ name: customer?.name ?? '', phone: '', line1: '', line2: '', city: '', state: '', pin_code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const discountAmt = discountApplied ? Math.round(total * 0.1) : 0;
  const finalTotal = total - discountAmt;

  function applyCode() {
    if (discountCode.trim().toUpperCase() === 'LUXE10') { setDiscountApplied(true); setError(null); }
    else setError('Invalid discount code');
  }

  async function placeOrder() {
    if (!customer) { router.push('/login?next=/checkout'); return; }
    if (items.length === 0) { setError('Cart is empty'); return; }
    if (deliveryType === 'delivery' && !address.line1.trim()) { setError('Please enter delivery address'); return; }

    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/customer/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_type: deliveryType,
          payment_method: payMethod,
          discount_code: discountApplied ? 'LUXE10' : undefined,
          address: deliveryType === 'delivery' ? address : undefined,
          save_address: true,
        }),
      });
      const json = (await res.json()) as { data?: { orderNumber: string; orderId: string }; error?: { message: string } };
      if (!res.ok || json.error) { setError(json.error?.message ?? 'Checkout failed'); return; }
      trackEvent('order_placed', {
        metadata: {
          order_number: json.data!.orderNumber,
          total: finalTotal,
          delivery_type: deliveryType,
          item_count: items.length,
        },
      });
      router.push(`/checkout/success?order=${json.data!.orderNumber}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">Please sign in to check out.</p>
          <Button className="metal-sheen mt-4 rounded-lg border-0 font-semibold text-[#17120b]" onClick={() => router.push('/login?next=/checkout')}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  const fieldClass = 'rounded-md border-[#e4d8c6] bg-white h-9 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] focus-visible:ring-offset-0 focus:border-[#C9A84C]';

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        {/* Step Indicator */}
        <div className="mx-auto mb-10 max-w-md">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-[#e4d8c6]" />
            <div className="absolute left-0 top-1/2 h-[1px] -translate-y-1/2 bg-[#C9A84C] transition-all duration-500" style={{ width: '50%' }} />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1208] text-xs font-semibold text-[#e4d8c6] shadow-sm ring-4 ring-[#fbf9f5]">
                1
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a1208]">Bag</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1208] text-xs font-semibold text-[#e4d8c6] shadow-sm ring-4 ring-[#fbf9f5]">
                2
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a1208]">Checkout</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4d8c6] bg-[#fffdf8] text-xs font-medium text-muted-foreground ring-4 ring-[#fbf9f5]">
                3
              </div>
              <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Confirm</span>
            </div>
          </div>
        </div>

        <div className="mb-8 text-center md:text-left">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Secure Checkout</p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-[#1a1208]">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* Left: forms */}
          <div className="space-y-6 lg:col-span-3">
            {/* Delivery type */}
            <section className="rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-[0_4px_16px_rgba(25,21,17,0.02)]">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">
                <Truck className="h-4 w-4 text-[#C9A84C]" /> Delivery Method
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { type: 'delivery' as const, icon: Truck, title: 'Home Delivery', sub: '3–5 business days · Free' },
                  { type: 'click_and_collect' as const, icon: Store, title: 'Click & Collect', sub: 'Ready in 1 day · Free' },
                ]).map(opt => {
                  const active = deliveryType === opt.type;
                  return (
                    <button 
                      key={opt.type} 
                      onClick={() => setDeliveryType(opt.type)}
                      className={`rounded-md border p-3.5 text-left text-sm transition-all shadow-sm ${active ? 'border-[#C9A84C] bg-[#1a1208]/[0.02] ring-1 ring-[#C9A84C]' : 'border-[#e4d8c6] bg-white hover:border-[#C9A84C]/50'}`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-[#1a1208]">
                        <opt.icon className="h-4 w-4 text-[#C9A84C]" /> {opt.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Address */}
            {deliveryType === 'delivery' && (
              <section className="rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-[0_4px_16px_rgba(25,21,17,0.02)]">
                <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">
                  <MapPin className="h-4 w-4 text-[#C9A84C]" /> Delivery Address
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name" value={address.name} onChange={e => setAddress(a => ({ ...a, name: e.target.value }))} className={fieldClass} />
                  <Input placeholder="Phone number" value={address.phone} onChange={e => setAddress(a => ({ ...a, phone: e.target.value }))} className={fieldClass} />
                  <Input placeholder="Address line 1" value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} className={`${fieldClass} sm:col-span-2`} />
                  <Input placeholder="Address line 2 (optional)" value={address.line2} onChange={e => setAddress(a => ({ ...a, line2: e.target.value }))} className={`${fieldClass} sm:col-span-2`} />
                  <Input placeholder="City" value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} className={fieldClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="State" value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} className={fieldClass} />
                    <Input placeholder="PIN code" value={address.pin_code} onChange={e => setAddress(a => ({ ...a, pin_code: e.target.value }))} className={fieldClass} maxLength={6} />
                  </div>
                </div>
              </section>
            )}

            {/* Payment */}
            <section className="rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-[0_4px_16px_rgba(25,21,17,0.02)]">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">
                <CreditCard className="h-4 w-4 text-[#C9A84C]" /> Payment Method
              </h2>
              <div className="space-y-2.5">
                {PAY_METHODS.map(p => {
                  const active = payMethod === p.id;
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => setPayMethod(p.id)}
                      className={`flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-all shadow-sm ${active ? 'border-[#C9A84C] bg-[#1a1208]/[0.02] ring-1 ring-[#C9A84C]' : 'border-[#e4d8c6] bg-white hover:border-[#C9A84C]/50'}`}
                    >
                      <p.icon className="h-5 w-5 shrink-0 text-[#C9A84C]" />
                      <div className="flex-1">
                        <div className="font-semibold text-[#1a1208]">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.sub}</div>
                      </div>
                      <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${active ? 'border-[#C9A84C] bg-[#1a1208] text-[#e4d8c6]' : 'border-[#d8ccba] bg-white'}`}>
                        {active && <Check className="h-2.5 w-2.5 stroke-[3px]" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {payMethod === 'dummy_card' && (
                <div className="mt-4 space-y-2.5 rounded-md border border-[#e4d8c6] bg-[#fbf9f5] p-3 shadow-inner">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demo card (any values work)</p>
                  <Input placeholder="Card number: 4111 1111 1111 1111" className="rounded-md bg-white text-xs h-9" disabled />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="MM/YY: 12/28" className="rounded-md bg-white text-xs h-9" disabled />
                    <Input placeholder="CVV: 123" className="rounded-md bg-white text-xs h-9" disabled />
                  </div>
                </div>
              )}
              {payMethod === 'dummy_upi' && (
                <div className="mt-4 rounded-md border border-[#e4d8c6] bg-[#fbf9f5] p-3 shadow-inner">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demo UPI</p>
                  <Input placeholder="demo@upi" className="mt-2 rounded-md bg-white text-xs h-9" disabled />
                </div>
              )}
            </section>
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-lg border border-[#e4d8c6] border-t-4 border-t-[#C9A84C] bg-[#fffdf8] p-5 shadow-[0_12px_32px_rgba(25,21,17,0.04)]">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">Order Summary</h2>
              <div className="mb-4 space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {items.map(i => (
                  <div key={i.id} className="flex justify-between gap-3 text-xs sm:text-sm">
                    <span className="truncate text-muted-foreground font-medium">{i.product.name} <span className="text-[#C9A84C] font-semibold">× {i.quantity}</span></span>
                    <span className="shrink-0 font-semibold text-[#1a1208]">{formatINR((i.product.price_min ?? 0) * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mb-4 flex gap-2">
                <Input 
                  placeholder="Discount code" 
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value)}
                  className="rounded-md border-[#e4d8c6] bg-white text-xs h-9 focus-visible:ring-1 focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] focus-visible:ring-offset-0 focus:border-[#C9A84C]" 
                  disabled={discountApplied} 
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="whitespace-nowrap rounded-md border-[#e4d8c6] text-xs h-9 hover:bg-[#1a1208]/5 text-[#1a1208] font-semibold px-4" 
                  onClick={applyCode} 
                  disabled={discountApplied}
                >
                  {discountApplied ? 'Applied' : 'Apply'}
                </Button>
              </div>
              <div className="space-y-2.5 border-t border-[#dfd3bf]/60 pt-3 text-xs sm:text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground font-medium">Subtotal</span><span className="font-semibold text-[#1a1208]">{formatINR(total)}</span></div>
                {discountApplied && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount (LUXE10)</span>
                    <span className="font-semibold">-{formatINR(discountAmt)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground font-medium">Delivery</span><span className="font-semibold text-emerald-600">Free</span></div>
                <div className="flex justify-between border-t border-[#dfd3bf]/60 pt-2.5 text-[15px] sm:text-base font-bold text-[#1a1208]">
                  <span>Total</span>
                  <span>{formatINR(finalTotal)}</span>
                </div>
              </div>
              {error && <p className="mt-3.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">{error}</p>}
              <Button 
                className="metal-sheen mt-4 w-full rounded-md border-0 py-2.5 font-semibold text-[#17120b] shadow-sm hover:opacity-90 disabled:opacity-50" 
                onClick={() => void placeOrder()} 
                disabled={loading || items.length === 0}
              >
                <Lock className="mr-1.5 h-4 w-4" />
                {loading ? 'Placing order…' : `Pay ${formatINR(finalTotal)}`}
              </Button>
              <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                <Lock className="h-3 w-3" /> Secure demo payment
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
