'use client';

import { useEffect, useState } from 'react';

import type { JewellerPublic } from '@luxematch/db';

let cache: JewellerPublic | null | undefined;
let inflight: Promise<JewellerPublic | null> | null = null;

async function fetchShop(): Promise<JewellerPublic | null> {
  if (cache !== undefined) return cache;
  if (inflight) return inflight;
  inflight = fetch('/api/shop', { cache: 'no-store' })
    .then(async (res) => {
      const json = (await res.json()) as
        | { data: JewellerPublic }
        | { error: { message: string } };
      cache = 'data' in json ? json.data : null;
      return cache;
    })
    .catch(() => {
      cache = null;
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Fetches the installed shop's public info once per session and caches it
 * across mounts. Returns null while loading or if the API is unreachable.
 */
export function useShop(): JewellerPublic | null {
  const [shop, setShop] = useState<JewellerPublic | null>(cache ?? null);
  useEffect(() => {
    if (cache !== undefined) return;
    let active = true;
    void fetchShop().then((s) => {
      if (active) setShop(s);
    });
    return () => {
      active = false;
    };
  }, []);
  return shop;
}
