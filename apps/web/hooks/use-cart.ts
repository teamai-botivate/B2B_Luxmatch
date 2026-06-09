'use client';

import { useCallback, useEffect, useState } from 'react';

export type CartProduct = {
  id: string; name: string; slug: string;
  price_min: number | null; primary_image_url: string | null; metal: string | null; stock_count: number;
};
export type CartItem = { id: string; product_id: string; quantity: number; added_at: string; product: CartProduct };

let globalCount = 0;
const listeners = new Set<() => void>();
function notifyCartChange(count: number) { globalCount = count; listeners.forEach(fn => fn()); }

export function useCartCount() {
  const [count, setCount] = useState(globalCount);
  useEffect(() => {
    const fn = () => setCount(globalCount);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return count;
}

/**
 * Lightweight cart-write hook for list contexts (ProductCard, detail panel).
 * Unlike useCart(), it does NOT fetch the cart on mount — so a page rendering
 * N product cards fires zero GETs instead of N. On a successful add it does a
 * single GET to refresh the shared count badge, then returns.
 */
export function useAddToCart() {
  return useCallback(async (productId: string, quantity = 1): Promise<boolean> => {
    const res = await fetch('/api/customer/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (!res.ok) return false;
    // Refresh just the count so the header badge updates.
    try {
      const r = await fetch('/api/customer/cart', { cache: 'no-store' });
      if (r.ok) {
        const json = (await r.json()) as { data: { count: number } };
        notifyCartChange(json.data.count);
      }
    } catch {}
    return true;
  }, []);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/cart', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data: { items: CartItem[]; total: number; count: number } };
        setItems(json.data.items);
        setTotal(json.data.total);
        notifyCartChange(json.data.count);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const addToCart = useCallback(async (productId: string, quantity = 1): Promise<boolean> => {
    const res = await fetch('/api/customer/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (res.ok) { await refresh(); return true; }
    return false;
  }, [refresh]);

  const updateItem = useCallback(async (productId: string, quantity: number) => {
    await fetch(`/api/customer/cart/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    await refresh();
  }, [refresh]);

  const removeItem = useCallback(async (productId: string) => {
    await fetch(`/api/customer/cart/${productId}`, { method: 'DELETE' });
    await refresh();
  }, [refresh]);

  return { items, total, loading, refresh, addToCart, updateItem, removeItem };
}
