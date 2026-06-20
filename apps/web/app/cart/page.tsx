'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Minus, Plus, ShoppingBag, ShieldCheck, Tag, X } from 'lucide-react';
import { motion } from 'motion/react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useCustomer } from '@/hooks/use-customer';
import { formatINR } from '@/lib/format';

function formatMetal(m: string) {
  return m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function CartPage() {
  const router = useRouter();
  const { customer } = useCustomer();
  const { items, total, loading, updateItem, removeItem } = useCart();

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#e5d8bd] bg-[#fbf9f5]">
            <ShoppingBag className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-medium">Please sign in</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to view your cart and check out.</p>
          <Button className="metal-sheen mt-6 rounded-lg border-0 font-semibold text-[#17120b]" onClick={() => router.push('/login?next=/cart')}>
            Login / Sign up
          </Button>
        </div>
      </CustomerLayout>
    );
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

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5d8bd] bg-[#fbf9f5]">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">Add some beautiful jewellery to get started.</p>
          <Link href="/catalog"><Button className="metal-sheen mt-6 rounded-lg border-0 font-semibold text-[#17120b]">Browse Catalog</Button></Link>
        </div>
      </CustomerLayout>
    );
  }

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12 lg:px-12">
        {/* Step Indicator */}
        <div className="mx-auto mb-10 max-w-md">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-1/2 h-[1px] w-full -translate-y-1/2 bg-[#e4d8c6]" />
            <div className="absolute left-0 top-1/2 h-[1px] -translate-y-1/2 bg-[#C9A84C] transition-all duration-500" style={{ width: '0%' }} />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1208] text-xs font-semibold text-[#e4d8c6] shadow-sm ring-4 ring-[#fbf9f5]">
                1
              </div>
              <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a1208]">Bag</span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e4d8c6] bg-[#fffdf8] text-xs font-medium text-muted-foreground ring-4 ring-[#fbf9f5]">
                2
              </div>
              <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Checkout</span>
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
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C]">Shopping Bag</p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-[#1a1208] md:text-4xl">Your Cart</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Item list */}
          <div className="space-y-4 lg:col-span-2">
            {items.map((item, idx) => (
              <motion.div 
                key={item.id} 
                initial={{ opacity: 0, y: 12 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="flex gap-4 rounded-lg border border-[#e4d8c6] bg-[#fffdf8] p-4 shadow-[0_4px_16px_rgba(25,21,17,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(25,21,17,0.04)]"
              >
                <Link href={`/catalog/${item.product.slug}`} className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-md bg-[#ece5da] ring-1 ring-black/5">
                  {item.product.primary_image_url ? (
                    <Image src={item.product.primary_image_url} alt={item.product.name} fill className="object-cover" />
                  ) : <div className="h-full w-full bg-[#ece5da]" />}
                </Link>
                <div className="flex flex-1 flex-col justify-between py-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/catalog/${item.product.slug}`}>
                        <p className="font-display font-medium text-[#1a1208] transition-colors hover:text-[#C9A84C] text-[15px] sm:text-base leading-tight">{item.product.name}</p>
                      </Link>
                      {item.product.metal && (
                        <p className="mt-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                          {formatMetal(item.product.metal)}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => void removeItem(item.product_id)} 
                      aria-label="Remove item"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[#1a1208]/5 hover:text-[#1a1208]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-1 rounded-md border border-[#dfd3bf] bg-white p-0.5 shadow-sm">
                      <button 
                        className="rounded p-1 transition-colors hover:bg-[#f5f0e6] disabled:opacity-40"
                        onClick={() => void updateItem(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1} 
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-[#1a1208]">{item.quantity}</span>
                      <button 
                        className="rounded p-1 transition-colors hover:bg-[#f5f0e6] disabled:opacity-40"
                        onClick={() => void updateItem(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock_count} 
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-semibold text-[#1a1208] text-[15px] sm:text-base">{formatINR((item.product.price_min ?? 0) * item.quantity)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Order summary */}
          <div className="sticky top-24 h-fit rounded-lg border border-[#e4d8c6] border-t-4 border-t-[#C9A84C] bg-[#fffdf8] p-6 shadow-[0_12px_32px_rgba(25,21,17,0.04)]">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-[#1a1208]">Order Summary</h2>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                <span className="font-medium text-[#1a1208]">{formatINR(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-semibold text-emerald-600">Free</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#dfd3bf]/60 pt-3 text-[15px] sm:text-base font-semibold text-[#1a1208]">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-md border border-[#e7dcc0] bg-[#fbf6e9] px-3 py-2 text-xs text-[#8a6d1f]">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span>Use code <strong>LUXE10</strong> for 10% off at checkout</span>
            </div>
            <Button 
              className="metal-sheen mt-4 w-full rounded-md border-0 py-2.5 font-semibold text-[#17120b] shadow-sm hover:opacity-90" 
              onClick={() => router.push('/checkout')}
            >
              Proceed to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Link href="/catalog">
              <button className="mt-3.5 w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-[#1a1208]">
                Continue Shopping
              </button>
            </Link>
            <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-[#dfd3bf]/40 pt-4 text-[10px] text-muted-foreground uppercase tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> BIS Hallmarked · Certified
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
