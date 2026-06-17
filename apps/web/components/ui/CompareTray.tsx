'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";
import type { Product } from "@/lib/mock-data";
import { adaptProduct, fetchCategories, fetchProductsByIds, productImageUrl } from "@/lib/catalog-adapter";

export default function CompareTray() {
  const { compareItems, clearCompare, toggleCompare } = useCompare();
  const [items, setItems] = useState<Product[]>([]);

  // Hydrate compare thumbnails from the tenant-scoped catalog API so they show
  // real product_images instead of mock data.
  const ids = Array.from(compareItems).join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idList = ids ? ids.split(",") : [];
      if (idList.length === 0) {
        if (!cancelled) setItems([]);
        return;
      }
      const [categories, fetched] = await Promise.all([
        fetchCategories(),
        fetchProductsByIds(idList),
      ]);
      if (cancelled) return;
      setItems(fetched.map((p) => adaptProduct(p, categories)));
    })();
    return () => { cancelled = true; };
  }, [ids]);

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-xl"
          data-testid="compare-tray"
        >
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1 overflow-x-auto">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap flex-shrink-0">
                Comparing {items.length}/4
              </span>
              <div className="flex gap-2">
                {items.map(p => (
                  <div key={p.id} className="relative flex-shrink-0">
                    <img
                      src={productImageUrl(p.images)}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl object-cover border border-border"
                    />
                    <button
                      onClick={() => toggleCompare(p.id)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full flex items-center justify-center"
                      aria-label="Remove from compare"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={clearCompare}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-clear-compare"
              >
                Clear All
              </button>
              <Link href="/compare">
                <Button
                  size="sm"
                  className="rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
                  data-testid="button-compare-now"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  Compare Now
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
