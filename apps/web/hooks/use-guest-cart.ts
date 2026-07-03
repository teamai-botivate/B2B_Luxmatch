'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'luxematch_guest_cart';
const SYNC_EVENT = 'luxematch:guest-cart';

export type GuestCartItem = {
  productId: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  category: string | null;
  metal: string | null;
  unitPrice: number;
  quantity: number;
};

export type GuestCartTotals = {
  count: number;   // sum of quantities
  amount: number;  // sum of qty * unitPrice
};

function readCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GuestCartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: GuestCartItem[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(SYNC_EVENT));
}

function calcTotals(items: GuestCartItem[]): GuestCartTotals {
  return items.reduce(
    (acc, i) => ({
      count: acc.count + i.quantity,
      amount: acc.amount + i.unitPrice * i.quantity,
    }),
    { count: 0, amount: 0 },
  );
}

export function useGuestCart() {
  const [items, setItems] = useState<GuestCartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const onSync = () => setItems(readCart());
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  const add = useCallback((item: Omit<GuestCartItem, 'quantity'>, qty = 1) => {
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === item.productId);
    const existing = idx >= 0 ? current[idx] : undefined;
    if (existing) {
      current[idx] = { ...existing, quantity: existing.quantity + qty };
    } else {
      current.push({ ...item, quantity: qty });
    }
    writeCart(current);
    setItems([...current]);
  }, []);

  const update = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      remove(productId);
      return;
    }
    const current = readCart();
    const idx = current.findIndex((i) => i.productId === productId);
    const existing = idx >= 0 ? current[idx] : undefined;
    if (existing) {
      current[idx] = { ...existing, quantity };
      writeCart(current);
      setItems([...current]);
    }
  }, []);

  const remove = useCallback((productId: string) => {
    const current = readCart().filter((i) => i.productId !== productId);
    writeCart(current);
    setItems([...current]);
  }, []);

  const clear = useCallback(() => {
    writeCart([]);
    setItems([]);
  }, []);

  return {
    items,
    totals: calcTotals(items),
    add,
    update,
    remove,
    clear,
  };
}

export function useGuestCartCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(calcTotals(readCart()).count);
    update();
    window.addEventListener(SYNC_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(SYNC_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return count;
}
