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
      <div className="mx-auto max-w-xl px-4 py-8 md:py-12 flex flex-col min-h-[75vh] justify-center">
        {/* Step Indicator */}
        <div className="mx-auto mb-10 w-full max-w-md">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-[#e4d8c6]" />
            <div className="absolute left-0 top-1/2 h-[1px] -translate-y-1/2 bg-[#C9A84C] transition-all duration-500" style={{ width: '100%' }} />
            
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1208] text-xs font-semibold text-[#e4d8c6] shadow-sm ring-4 ring-[#fbf9f5]">
                3
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a1208]">Confirm</span>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          transition={{ duration: 0.4 }}
          className="text-center w-full max-w-md mx-auto"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight text-[#1a1208]">Order Placed!</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Your beautiful jewellery is being prepared.</p>

          <div className="mt-8 rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-5 text-left shadow-[0_4px_16px_rgba(25,21,17,0.02)]">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-[#dfd3bf]/40">
              <Package className="h-4 w-4 text-[#C9A84C]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1a1208]">Order Details</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order number</p>
            <p className="text-xl font-bold tracking-wider text-[#C9A84C] font-display">{orderNumber}</p>
            
            <div className="mt-5 relative pl-4 border-l border-[#dfd3bf]/60">
              <div className="relative mb-4 flex items-start gap-3">
                <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 shadow-sm ring-4 ring-[#fffdf8]" />
                <div className="text-xs">
                  <p className="font-semibold text-[#1a1208]">Order placed & confirmed</p>
                  <p className="text-muted-foreground text-[10px]">Your order is now being processed</p>
                </div>
              </div>
              <div className="relative mb-4 flex items-start gap-3">
                <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#dfd3bf] shadow-sm ring-4 ring-[#fffdf8]" />
                <div className="text-xs">
                  <p className="font-semibold text-muted-foreground">Packing carefully</p>
                  <p className="text-muted-foreground text-[10px]">We perform quality inspection and hallmarking verification</p>
                </div>
              </div>
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-[21px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#dfd3bf] shadow-sm ring-4 ring-[#fffdf8]" />
                <div className="text-xs">
                  <p className="font-semibold text-muted-foreground">Out for delivery</p>
                  <p className="text-muted-foreground text-[10px]">Estimated delivery within 3-5 business days</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/orders" className="w-full">
              <Button className="metal-sheen w-full rounded-md border-0 py-2.5 font-semibold text-[#17120b] shadow-sm hover:opacity-90">
                <Package className="mr-2 h-4 w-4" /> Track Order
              </Button>
            </Link>
            <Link href="/catalog">
              <button className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-[#1a1208] transition-colors py-2">
                Continue Shopping
              </button>
            </Link>
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
