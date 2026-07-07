'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  Menu,
  Factory,
  Store,
  Users,
  ClipboardList,
} from 'lucide-react';

export default function ManufacturerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (pathname === '/manufacturer/login') return;
    fetch('/api/manufacturer/store-registrations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json: unknown) => {
        if (json && typeof json === 'object' && 'data' in json && Array.isArray((json as { data: unknown[] }).data)) {
          setPendingCount((json as { data: unknown[] }).data.length);
        }
      })
      .catch(() => {/* ignore — badge is non-critical */});
  }, [pathname]);

  if (pathname === '/manufacturer/login') {
    return <>{children}</>;
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/manufacturer/logout', { method: 'POST' });
    } catch {
      // cookie TTL will expire regardless
    } finally {
      router.push('/manufacturer/login');
      router.refresh();
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
            <Factory className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
              Manufacturer Portal
            </p>
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              AT Jewellers
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {[
          { label: 'Dashboard', href: '/manufacturer/dashboard', icon: LayoutDashboard },
          { label: 'Catalog', href: '/manufacturer/catalog', icon: Package },
          { label: 'Orders', href: '/manufacturer/orders', icon: ShoppingBag },
          { label: 'Kiosk Orders', href: '/manufacturer/kiosk-orders', icon: Users },
          { label: 'Stores', href: '/manufacturer/stores', icon: Store },
          { label: 'Store Registrations', href: '/manufacturer/store-registrations', icon: ClipboardList, badge: pendingCount },
        ].map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {badge != null && badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-yellow-100 text-yellow-800'}`}>
                    {badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border fixed top-0 bottom-0 left-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r border-sidebar-border bg-sidebar">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-60">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-white px-3 sm:px-4 md:px-6">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="truncate text-sm font-semibold text-foreground">
            Manufacturer Portal
          </span>
          <span className="hidden sm:inline text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            AT Jewellers
          </span>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
