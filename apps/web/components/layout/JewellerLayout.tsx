'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Package, BarChart3, Settings, ArrowLeft, Menu, Lightbulb } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/jeweller/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/jeweller/products", icon: Package },
  { label: "Analytics", href: "/jeweller/analytics", icon: BarChart3 },
  { label: "Intelligence", href: "/jeweller/intelligence", icon: Lightbulb },
  { label: "Settings", href: "/jeweller/settings", icon: Settings },
];

function getJewellerData() {
  try {
    const raw = localStorage.getItem("luxematch_jeweller");
    if (raw) return JSON.parse(raw) as { storeName: string; ownerName: string };
  } catch {}
  return null;
}

export default function JewellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jeweller, setJeweller] = useState(getJewellerData());

  useEffect(() => {
    setJeweller(getJewellerData());
  }, [pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 mb-3">
          <Image src="/logo-icon.png" alt="LuxeMatch" width={32} height={32} className="h-8 w-8 object-contain flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-0.5">Jeweller Portal</p>
            <p className="text-sm font-semibold text-foreground truncate leading-tight">
              {jeweller?.storeName ?? "Your Store"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`nav-jeweller-${label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Back to Store */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <Link href="/">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </div>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" data-testid="jeweller-layout">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border fixed top-0 bottom-0 left-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-60 bg-sidebar border-r border-sidebar-border flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-border flex items-center px-4 md:px-6 gap-3 sticky top-0 z-10">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {jeweller?.storeName ?? "Jeweller Portal"}
            </span>
            <span className="hidden sm:inline text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Jeweller Portal
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
