'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Circle, Clock, MapPin, Package, Truck } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { useCustomer } from '@/hooks/use-customer';

type OrderItem = { id: string; product_name: string; product_slug: string; product_image_url: string | null; quantity: number; unit_price: number; total_price: number };
type StatusHistory = { id: string; status: string; note: string | null; created_at: string };
type Order = { id: string; order_number: string; status: string; total: number; subtotal: number; discount: number; delivery_type: string; estimated_delivery: string | null; payment_method: string; shipping_name: string | null; shipping_line1: string | null; shipping_city: string | null; shipping_state: string | null; shipping_pin_code: string | null; created_at: string; items: OrderItem[]; history: StatusHistory[] };

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

const ALL_STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];
const STATUS_ICONS: Record<string, React.ReactNode> = {
  placed: <Package className="h-4 w-4" />, confirmed: <CheckCircle2 className="h-4 w-4" />,
  packed: <Package className="h-4 w-4" />, shipped: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle2 className="h-4 w-4" />,
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { customer, loading: authLoading } = useCustomer();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const id = params?.id as string;

  useEffect(() => {
    if (authLoading) return;
    if (!customer) { router.push('/login'); return; }
    fetch(`/api/customer/orders/${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((j: { data?: Order }) => setOrder(j.data ?? null))
      .finally(() => setLoading(false));
  }, [id, customer, authLoading, router]);

  if (loading || authLoading) {
    return <CustomerLayout><div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></CustomerLayout>;
  }

  if (!order) {
    return <CustomerLayout><div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Order not found.</p></div></CustomerLayout>;
  }

  const currentIdx = ALL_STATUSES.indexOf(order.status);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <Link href="/orders">
          <button className="mb-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-[#1a1208] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> All Orders
          </button>
        </Link>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Order Details</p>
            <h1 className="font-display text-2xl font-medium tracking-tight text-[#1a1208] sm:text-3xl">{order.order_number}</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {order.estimated_delivery && (
            <div className="sm:text-right border-l sm:border-l-0 sm:border-r border-[#dfd3bf]/60 pl-4 sm:pl-0 sm:pr-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estimated delivery</p>
              <p className="font-display font-semibold text-[#1a1208] text-base mt-0.5">
                {new Date(order.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </div>

        {/* Tracking timeline */}
        <section className="mb-6 rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-sm">
          <h2 className="mb-5 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">Order Tracking</h2>
          <div className="relative pl-4 border-l border-[#dfd3bf]/60 ml-4">
            {ALL_STATUSES.filter(s => s !== 'cancelled').map((s, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx;
              const historyEntry = order.history.find(h => h.status === s);
              return (
                <div key={s} className="relative mb-6 last:mb-0">
                  <span className={`absolute -left-[27px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 shadow-sm ring-4 ring-[#fffdf8] ${done ? 'border-[#C9A84C] bg-[#1a1208] text-[#e4d8c6]' : 'border-[#e4d8c6] bg-white text-muted-foreground'}`}>
                    {STATUS_ICONS[s] ?? <Circle className="h-2.5 w-2.5" />}
                  </span>
                  <div className="pl-3">
                    <p className={`text-xs font-bold uppercase tracking-wider ${done ? 'text-[#1a1208]' : 'text-muted-foreground'}`}>
                      {s.replace('_', ' ')}
                    </p>
                    {historyEntry?.note && <p className="text-xs text-muted-foreground mt-0.5">{historyEntry.note}</p>}
                    {historyEntry && (
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                        {new Date(historyEntry.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Items */}
        <section className="mb-6 rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-sm">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">Items Purchased</h2>
          <div className="space-y-4">
            {order.items.map(item => (
              <div key={item.id} className="flex gap-4 items-center pb-4 border-b border-[#dfd3bf]/40 last:pb-0 last:border-0">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-[#ece5da] ring-1 ring-black/5">
                  {item.product_image_url ? (
                    <Image src={item.product_image_url} alt={item.product_name} fill className="object-cover" />
                  ) : <div className="h-full w-full bg-[#ece5da]" />}
                </div>
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div className="min-w-0 pr-2">
                    <Link href={`/catalog/${item.product_slug}`}>
                      <p className="font-display text-sm font-medium hover:text-[#C9A84C] transition-colors text-[#1a1208] truncate">
                        {item.product_name}
                      </p>
                    </Link>
                    <p className="text-xs text-muted-foreground font-semibold mt-0.5">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-[#1a1208] text-sm shrink-0">{formatINR(item.total_price)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Price + address summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <section className="rounded-lg border border-[#e4d8c6] border-t-4 border-t-[#C9A84C] bg-[#fffdf8] p-5 shadow-sm">
            <h2 className="mb-3.5 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">Payment</h2>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Subtotal</span>
                <span className="font-semibold text-[#1a1208]">{formatINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span className="font-semibold">-{formatINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#dfd3bf]/60 pt-2 text-[15px] sm:text-base font-bold text-[#1a1208]">
                <span>Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pt-1.5 border-t border-[#dfd3bf]/30">
                Method: {order.payment_method.replace('dummy_', '').toUpperCase()}
              </p>
            </div>
          </section>

          {order.shipping_name && (
            <section className="rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 shadow-sm">
              <h2 className="mb-3.5 flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">
                <MapPin className="h-3.5 w-3.5 text-[#C9A84C]" /> Delivery Address
              </h2>
              <div className="text-xs sm:text-sm space-y-1 text-[#1a1208]">
                <p className="font-semibold">{order.shipping_name}</p>
                <p className="text-muted-foreground">{order.shipping_line1}</p>
                <p className="text-muted-foreground">{order.shipping_city}, {order.shipping_state} – {order.shipping_pin_code}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
