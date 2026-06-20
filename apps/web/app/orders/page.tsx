'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { useCustomer } from '@/hooks/use-customer';

type Order = {
  id: string; order_number: string; status: string;
  total: number; created_at: string; delivery_type: string;
};

function formatINR(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  placed:    { label: 'Order Placed',  color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed',     color: 'bg-indigo-100 text-indigo-700' },
  packed:    { label: 'Packed',        color: 'bg-amber-100 text-amber-700' },
  shipped:   { label: 'Shipped',       color: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Delivered',     color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled',     color: 'bg-red-100 text-red-700' },
};

export default function OrdersPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useCustomer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!customer) { router.push('/login'); return; }
    fetch('/api/customer/orders', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: { data?: { orders: Order[] } }) => { setOrders(j.data?.orders ?? []); })
      .finally(() => setLoading(false));
  }, [customer, authLoading, router]);

  if (loading || authLoading) {
    return <CustomerLayout><div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mb-8 text-center md:text-left">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Order History</p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-[#1a1208] md:text-4xl">My Orders</h1>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-dashed border-[#e4d8c6] bg-[#fffdf8] px-4">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#e5d8bd] bg-[#fbf9f5] shadow-sm">
              <ShoppingBag className="h-6 w-6 text-[#C9A84C]" />
            </div>
            <h2 className="font-display text-lg font-medium text-[#1a1208]">No orders yet</h2>
            <p className="mt-1.5 text-xs text-muted-foreground max-w-xs">Your orders will appear here after you make a purchase.</p>
            <Link href="/catalog">
              <Button className="metal-sheen mt-6 rounded-md border-0 py-2 font-semibold text-[#17120b] shadow-sm hover:opacity-90">
                Shop Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, idx) => {
              const st = STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-muted text-muted-foreground' };
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    className="rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 hover:border-[#C9A84C] hover:shadow-[0_8px_24px_rgba(25,21,17,0.03)] transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#C9A84C]" />
                          <span className="font-display font-semibold text-[#1a1208] text-[15px] sm:text-base tracking-wide">{order.order_number}</span>
                        </div>
                        <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' · '}
                          {order.delivery_type === 'click_and_collect' ? 'Click & Collect' : 'Home Delivery'}
                        </p>
                      </div>
                      <div className="flex sm:flex-col items-center justify-between sm:items-end gap-2 border-t border-[#dfd3bf]/30 pt-3 sm:border-0 sm:pt-0">
                        <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${st.color} shadow-sm border border-black/5`}>
                          {st.label}
                        </span>
                        <p className="font-bold text-[#1a1208] text-[15px] sm:text-base">{formatINR(order.total)}</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
