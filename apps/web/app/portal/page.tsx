'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Store, Factory, ArrowRight } from 'lucide-react';

export default function PortalPage() {
  return (
    <div className="min-h-screen bg-[#0f0d0a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <Image
          src="/logo-wordmark.png"
          alt="Jewel Factory"
          width={160}
          height={32}
          className="h-8 w-auto object-contain brightness-0 invert opacity-80"
          priority
        />
        <p className="text-xs tracking-widest text-[#6b5e45] uppercase">Staff Portal</p>
      </div>

      {/* Cards */}
      <div className="w-full max-w-sm space-y-3">
        {/* Store Owner */}
        <Link href="/store/login">
          <div className="group flex items-center gap-4 rounded-2xl border border-[#2a2318] bg-[#1a1510] px-5 py-4 transition-all hover:border-[#c9a84c]/40 hover:bg-[#1f1a12] cursor-pointer">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#c9a84c] transition-colors group-hover:bg-[#c9a84c]/20">
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f0e6d0]">Store Owner Login</p>
              <p className="text-xs text-[#6b5e45] mt-0.5">Access your store portal &amp; dashboard</p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#4a3f2a] transition-colors group-hover:text-[#c9a84c]" />
          </div>
        </Link>

        {/* Manufacturer */}
        <Link href="/manufacturer/login">
          <div className="group flex items-center gap-4 rounded-2xl border border-[#2a2318] bg-[#1a1510] px-5 py-4 transition-all hover:border-[#c9a84c]/40 hover:bg-[#1f1a12] cursor-pointer">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/10 text-[#c9a84c] transition-colors group-hover:bg-[#c9a84c]/20">
              <Factory className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f0e6d0]">Manufacturer Login</p>
              <p className="text-xs text-[#6b5e45] mt-0.5">Admin panel — catalog, stores &amp; orders</p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-[#4a3f2a] transition-colors group-hover:text-[#c9a84c]" />
          </div>
        </Link>
      </div>

      {/* Back to store */}
      <Link href="/">
        <p className="mt-10 text-xs text-[#3d3320] hover:text-[#6b5e45] transition-colors">
          ← Back to store
        </p>
      </Link>

      <p className="mt-6 text-[10px] text-[#2a2318] tracking-wider">Powered by AT Jewellers</p>
    </div>
  );
}
