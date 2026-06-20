'use client';

import { useEffect, useState, useCallback } from 'react';

export type CustomerSession = {
  customerId: string;
  phone: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
};

export function useCustomer() {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/me', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data: CustomerSession };
        setCustomer(json.data);
      } else {
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
  }, []);

  return { customer, loading, refresh, logout };
}
