'use client';

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Heart, GitCompare, ChevronRight } from "lucide-react";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { useCompare } from "@/contexts/CompareContext";

const navLinks = [
  { label: "Dashboard", href: "/jeweller/dashboard" },
  { label: "Catalog", href: "/catalog" },
  { label: "Collections", href: "/collections" },
  { label: "Try-On", href: "/try-on" },
  { label: "About", href: "/about" },
  { label: "Search", href: "/search" },
  { label: "Size Guide", href: "/size-guide" },
  { label: "Help", href: "/help" },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { savedItems } = useSavedItems();
  const { compareItems } = useCompare();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => { onClose(); }, [pathname]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[60] md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 top-0 z-[70] flex w-[min(18rem,calc(100vw-2rem))] flex-col bg-white shadow-2xl md:hidden"
            data-testid="mobile-nav"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <Image
                src="/logo-wordmark.png"
                alt="LuxeMatch"
                width={140}
                height={28}
                className="h-7 w-auto object-contain"
              />
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close menu"
                data-testid="button-close-nav"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 px-4 py-4 overflow-y-auto">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href}>
                  <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-accent transition-colors cursor-pointer group">
                    <span className="text-sm font-medium text-foreground">{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="px-4 py-4 border-t border-border space-y-2">
              <Link href="/saved">
                <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Saved Items</span>
                  </div>
                  {savedItems.size > 0 && (
                    <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      {savedItems.size}
                    </span>
                  )}
                </div>
              </Link>
              <Link href="/compare">
                <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <GitCompare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Compare</span>
                  </div>
                  {compareItems.size > 0 && (
                    <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      {compareItems.size}
                    </span>
                  )}
                </div>
              </Link>
              <Link href="/try-on">
                <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">Virtual Try-On</span>
                </div>
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
