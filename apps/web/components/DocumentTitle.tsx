'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const TITLE_BY_PATH: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/catalog': 'catalog',
  '/collections': 'collections',
  '/compare': 'compare',
  '/help': 'help',
  '/jeweller': 'jeweller',
  '/jeweller/analytics': 'analytics',
  '/jeweller/dashboard': 'dashboard',
  '/jeweller/intelligence': 'intelligence',
  '/jeweller/onboarding': 'onboarding',
  '/jeweller/products': 'products',
  '/jeweller/products/new': 'new product',
  '/jeweller/settings': 'settings',
  '/jeweller/unlock': 'unlock',
  '/saved': 'saved',
  '/search': 'search',
  '/search/image': 'image search',
  '/size-guide': 'size-guide',
  '/style-quiz': 'style-quiz',
  '/try-on': 'try-on',
};

function titleFromPath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const mapped = TITLE_BY_PATH[normalized];
  if (mapped) return titleCase(mapped);

  const segments = normalized.split('/').filter(Boolean);
  return titleCase(segments.at(-1) ?? 'home');
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function DocumentTitle() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = `${titleFromPath(pathname)} \\ Jewel Factory`;
  }, [pathname]);

  return null;
}
