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
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16 lg:px-12">
        <div className="mb-8">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Shopping Bag</p>
          <h1 className="text-3xl font-medium tracking-tight">Your Cart</h1>
          <p className="mt-1 text-sm text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'items'} ready for checkout</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Item list */}
          <div className="space-y-3 lg:col-span-2">
            {items.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="flex gap-4 rounded-xl border border-[#e4d8c6] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(31,24,18,0.05)]">
                <Link href={`/catalog/${item.product.slug}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-[#ece5da] ring-1 ring-black/5">
                  {item.product.primary_image_url ? (
                    <Image src={item.product.primary_image_url} alt={item.product.name} fill className="object-cover" />
                  ) : <div className="h-full w-full bg-[#ece5da]" />}
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/catalog/${item.product.slug}`}>
                        <p className="truncate font-medium transition-colors hover:text-primary">{item.product.name}</p>
                      </Link>
                      {item.product.metal && <p className="mt-0.5 text-xs text-muted-foreground">{formatMetal(item.product.metal)}</p>}
                    </div>
                    <button onClick={() => void removeItem(item.product_id)} aria-label="Remove item"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 rounded-lg border border-[#dfd3bf] bg-white">
                      <button className="rounded-l-lg p-1.5 transition-colors hover:bg-[#f5f0e6] disabled:opacity-40"
                        onClick={() => void updateItem(item.product_id, item.quantity - 1)}
                        disabled={item.quantity <= 1} aria-label="Decrease quantity">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <button className="rounded-r-lg p-1.5 transition-colors hover:bg-[#f5f0e6] disabled:opacity-40"
                        onClick={() => void updateItem(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock_count} aria-label="Increase quantity">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-semibold text-foreground">{formatINR((item.product.price_min ?? 0) * item.quantity)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Order summary */}
          <div className="sticky top-24 h-fit rounded-xl border border-[#e4d8c6] bg-[#fffdf8] p-6 shadow-[0_14px_40px_rgba(31,24,18,0.08)]">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><span>{formatINR(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="font-medium text-emerald-600">Free</span></div>
              <div className="mt-1 flex justify-between border-t border-[#ece2d0] pt-3 text-base font-semibold">
                <span>Total</span><span>{formatINR(total)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#e7dcc0] bg-[#fbf6e9] px-3 py-2 text-xs text-[#8a6d1f]">
              <Tag className="h-3.5 w-3.5 shrink-0" />
              <span>Use code <strong>LUXE10</strong> for 10% off at checkout</span>
            </div>
            <Button className="metal-sheen mt-4 w-full rounded-lg border-0 font-semibold text-[#17120b]" onClick={() => router.push('/checkout')}>
              Proceed to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Link href="/catalog">
              <button className="mt-3 w-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Continue Shopping
              </button>
            </Link>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> BIS Hallmarked · Certified Jewellers
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
