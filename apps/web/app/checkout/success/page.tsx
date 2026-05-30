'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Package, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { Suspense } from 'react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get('order') ?? 'ATJ-XXXXXX';

  return (
    <CustomerLayout>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-20">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">Order Placed!</h1>
          <p className="mt-2 text-muted-foreground">Your jewellery is on its way.</p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Order Details</span>
            </div>
            <p className="text-xs text-muted-foreground">Order number</p>
            <p className="text-lg font-bold tracking-wider text-primary">{orderNumber}</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Order placed & confirmed</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted" /> Packing jewellery carefully</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-muted" /> Out for delivery (3-4 days)</div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link href="/orders"><Button className="w-full rounded-full"><Package className="mr-2 h-4 w-4" />Track Order</Button></Link>
            <Link href="/catalog"><button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Continue Shopping</button></Link>
          </div>
        </motion.div>
      </div>
    </CustomerLayout>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CustomerLayout><div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></CustomerLayout>}>
      <SuccessContent />
    </Suspense>
  );
}
