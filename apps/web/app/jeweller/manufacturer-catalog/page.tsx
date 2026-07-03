'use client';

import type { ManufacturerProductWithImages } from '@luxematch/db';
import { Camera, Gem, Loader2, Package, Search, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import JewellerLayout from '@/components/layout/JewellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useB2BCart } from '@/hooks/use-b2b-cart';

const CATEGORIES = ['all', 'rings', 'earrings', 'necklaces', 'bangles', 'pendants', 'sets'];

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ManufacturerCatalogPage() {
  const [products, setProducts] = useState<ManufacturerProductWithImages[]>([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [filterTryon, setFilterTryon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const cart = useB2BCart();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (query.trim()) params.set('search', query.trim());
      const res = await fetch(`/api/store/catalog?${params.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as
        | { data: ManufacturerProductWithImages[] }
        | { error: { message: string } };
      if (!res.ok || 'error' in json) {
        if (res.status === 401) {
          window.location.assign('/store/login?next=/jeweller/manufacturer-catalog');
          return;
        }
        setError('error' in json ? json.error.message : 'Failed to load catalog');
        return;
      }
      setProducts(json.data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [category]);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return CATEGORIES.filter((c) => c === 'all' || present.has(c));
  }, [products]);

  function addToCart(product: ManufacturerProductWithImages) {
    const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
    cart.add({
      productId: product.id,
      manufacturerId: product.manufacturer_id,
      sku: product.sku,
      name: product.name,
      imageUrl: primary?.secure_url,
      category: product.category,
      metal: product.metal,
      minOrderQty: product.min_order_qty,
      unitPrice: product.base_price,
    });
    setFlash(`${product.name} added to B2B cart.`);
  }

  return (
    <JewellerLayout>
      <div className="mx-auto w-full max-w-7xl space-y-5 py-3 sm:py-5">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
              Manufacturer Catalog
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse active designs and build a store purchase order.
            </p>
          </div>
          <Button asChild className="gap-2">
            <Link href="/jeweller/b2b-orders/new">
              <ShoppingCart className="h-4 w-4" />
              Cart ({cart.totals.count})
            </Link>
          </Button>
        </header>

        <div className="flex flex-wrap gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search designs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </div>
          <Button variant="outline" onClick={() => void load()}>
            Search
          </Button>
        </div>

        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 items-center">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${
                category === item
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterTryon((v) => !v)}
            className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              filterTryon
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
            }`}
          >
            <Camera className="h-3 w-3" /> AR Try-On
          </button>
        </div>

        {flash && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            {flash}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Gem className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No designs found</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products
              .filter((p) => !filterTryon || p.has_tryon)
              .map((product) => {
              const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
              return (
                <div key={product.id} className="overflow-hidden rounded-xl border bg-card">
                  <div className="relative aspect-square bg-muted">
                    {primary ? (
                      <Image
                        src={primary.secure_url}
                        alt={product.name}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    {product.has_tryon && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-0.5 rounded-full bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                          <Camera className="h-2.5 w-2.5" /> AR
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    <div>
                      <p className="line-clamp-1 text-sm font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku} {product.category ? `· ${product.category}` : ''}
                      </p>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{formatINR(product.base_price)}</p>
                        <p className="text-xs text-muted-foreground">
                          MOQ {product.min_order_qty}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => addToCart(product)}>
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </JewellerLayout>
  );
}
