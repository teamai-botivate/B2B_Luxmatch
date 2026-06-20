'use client';

import type { ReactNode } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import Footer from '@/components/layout/Footer';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="pt-[88px]">{children}</div>
      <Footer />
    </>
  );
}
