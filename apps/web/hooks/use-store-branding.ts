'use client';
import { useEffect, useState } from 'react';

type StoreBranding = {
  logo_url: string | null;
  tagline: string | null;
};

let cache: StoreBranding | null = null;

export function useStoreBranding(): StoreBranding | null {
  const [branding, setBranding] = useState<StoreBranding | null>(cache);
  useEffect(() => {
    if (cache) return;
    fetch('/api/store/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { data?: { logo_url?: string | null; tagline?: string | null } } | null) => {
        if (json?.data) {
          const b: StoreBranding = {
            logo_url: json.data.logo_url ?? null,
            tagline: json.data.tagline ?? null,
          };
          cache = b;
          setBranding(b);
        }
      })
      .catch(() => {});
  }, []);
  return branding;
}
