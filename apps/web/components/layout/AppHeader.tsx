'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Heart, GitCompare, Menu, Sparkles, LayoutDashboard, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { useCompare } from "@/contexts/CompareContext";
import { useShop } from "@/hooks/use-shop";
import { useGuestCartCount } from "@/hooks/use-guest-cart";
import MobileNav from "./MobileNav";

const navLinks = [
  { label: "Catalog", href: "/catalog" },
  { label: "Collections", href: "/collections" },
  { label: "Try-On", href: "/try-on" },
  { label: "About", href: "/about" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // mounted guards all counts that are read from sessionStorage/client-only
  // state so the server render and first client render are identical (both
  // show zero badges), preventing the hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const { savedItems } = useSavedItems();
  const { compareItems } = useCompare();
  const shop = useShop();
  const cartCount = useGuestCartCount();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-black/10 bg-[#fbf8f1]/95 shadow-sm backdrop-blur-xl"
            : "border-b border-black/5 bg-[#fbf8f1]/[0.88] backdrop-blur-lg"
        }`}
        data-testid="app-header"
      >
        {/* Shop welcome strip — pulled from /api/shop. Falls back to a
            generic line when the shop API is unreachable so the layout
            stays stable. */}
        <div
          className="bg-[#191511] px-3 py-1.5 text-xs tracking-wider text-[#e4cf8f] md:px-6 lg:px-12 flex items-center justify-between gap-2"
          data-testid="shop-welcome-strip"
        >
          <span className="truncate">
            {shop ? (
              <>
                <span className="font-semibold text-[#f8e7af]">{shop.store_name}</span>
                {shop.city ? <span className="text-[#c9b98b]"> · {shop.city}</span> : null}
                <span className="text-[#7a6a48] ml-1.5">· LuxMatch</span>
              </>
            ) : (
              <span className="text-[#c9b98b]">LuxMatch</span>
            )}
          </span>
          <span className="flex-shrink-0 text-[#5a4f38]">Powered by Botivate</span>
        </div>
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-12">
          {/* Logo */}
          <Link href="/" data-testid="logo-link">
            <Image
              src="/logo-wordmark.png"
              alt="LuxeMatch"
              width={160}
              height={32}
              className="h-7 w-auto cursor-pointer select-none object-contain sm:h-8"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6" data-testid="desktop-nav">
            {navLinks.map(link => {
              const active = mounted && pathname.startsWith(link.href);

              return (
              <Link key={link.href} href={link.href}>
                <span
                  className={`luxury-link-underline text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </span>
              </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Search */}
            <button
              onClick={() => router.push("/search")}
              className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-black/5 group"
              data-testid="button-search"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded font-mono">⌘K</kbd>
              </span>
            </button>

            {/* Saved */}
            <Link href="/saved">
              <button
                className="relative p-2 rounded-xl hover:bg-accent transition-colors"
                data-testid="button-saved"
                aria-label="Saved items"
              >
                <Heart className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                {mounted && savedItems.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {savedItems.size}
                  </span>
                )}
              </button>
            </Link>

            {/* Cart */}
            <Link href="/kiosk-checkout">
              <button
                className="relative p-2 rounded-xl hover:bg-accent transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                {mounted && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
            </Link>

            {/* Compare */}
            <Link href="/compare">
              <button
                className="relative hidden rounded-xl p-2 transition-colors hover:bg-black/5 md:block"
                data-testid="button-compare"
                aria-label="Compare items"
              >
                <GitCompare className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                {mounted && compareItems.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    {compareItems.size}
                  </span>
                )}
              </button>
            </Link>

            {/* Try-On CTA */}
            <Button
              size="sm"
              variant="outline"
              className="hidden items-center gap-1.5 rounded-full border-black/15 bg-white/35 md:flex"
              onClick={() => router.push("/jeweller/dashboard")}
              data-testid="button-jeweller-dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Button>

            <Button
              size="sm"
              className="metal-sheen hidden items-center gap-1.5 rounded-full border-0 text-[#17120b] shadow-sm transition-all hover:scale-[1.02] hover:opacity-95 md:flex"
              onClick={() => router.push("/try-on")}
              data-testid="button-try-on"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Try On
            </Button>

            {/* Mobile Menu */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-accent transition-colors"
              onClick={() => setMobileOpen(true)}
              data-testid="button-menu"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
