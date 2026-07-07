'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'jewelfactory_b2b_cart';

export type B2BCartItem = {
  productId: string;
  manufacturerId: string;
  designNumber: string;
  name: string;
  imageUrl?: string;
  category?: string | null;
  weightGrams?: number | null;
  purity?: string | null;
  minOrderQty: number;
  quantity: number;
};

function readCart(): B2BCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as B2BCartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: B2BCartItem[]) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('jewelfactory:b2b-cart'));
}

export function useB2BCart() {
  const [items, setItems] = useState<B2BCartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const onChange = () => setItems(readCart());
    window.addEventListener('jewelfactory:b2b-cart', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('jewelfactory:b2b-cart', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const totals = useMemo(
    () => ({
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items],
  );

  function replace(next: B2BCartItem[]) {
    setItems(next);
    writeCart(next);
  }

  function add(item: Omit<B2BCartItem, 'quantity'>, quantity?: number) {
    const current = readCart();
    const existing = current.find((x) => x.productId === item.productId);
    const qty = Math.max(quantity ?? item.minOrderQty, item.minOrderQty);
    const next = existing
      ? current.map((x) =>
          x.productId === item.productId
            ? { ...x, quantity: Math.max(x.quantity + qty, x.minOrderQty) }
            : x,
        )
      : [...current, { ...item, quantity: qty }];
    replace(next);
  }

  function update(productId: string, quantity: number) {
    const next = readCart().map((item) =>
      item.productId === productId
        ? { ...item, quantity: Math.max(quantity, item.minOrderQty) }
        : item,
    );
    replace(next);
  }

  function remove(productId: string) {
    replace(readCart().filter((item) => item.productId !== productId));
  }

  function clear() {
    replace([]);
  }

  return { items, totals, add, update, remove, clear };
}

export function useB2BCartCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const items = readCart();
      setCount(items.reduce((sum, item) => sum + item.quantity, 0));
    };
    update();
    window.addEventListener('jewelfactory:b2b-cart', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('jewelfactory:b2b-cart', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return count;
}
