'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductGrid from "@/components/product/ProductGrid";
import EmptyState from "@/components/ui/EmptyState";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import type { Product } from "@/lib/mock-data";
import { adaptProduct, fetchCategories, fetchProductsByIds } from "@/lib/catalog-adapter";

export default function SavedPage() {
  const router = useRouter();
  const { savedItems, clearSaved } = useSavedItems();
  const [saved, setSaved] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Saved IDs are real product UUIDs (set by ProductCard). Hydrate them from the
  // tenant-scoped catalog API so cards show real product_images, not mock data.
  const ids = Array.from(savedItems).join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const idList = ids ? ids.split(",") : [];
      if (idList.length === 0) {
        if (!cancelled) { setSaved([]); setLoading(false); }
        return;
      }
      const [categories, products] = await Promise.all([
        fetchCategories(),
        fetchProductsByIds(idList),
      ]);
      if (cancelled) return;
      setSaved(products.map((p) => adaptProduct(p, categories)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ids]);

  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="saved-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">My Collection</p>
            <h1 className="text-3xl font-medium tracking-tight">Saved Items</h1>
          </div>
          {saved.length > 0 && (
            <Button variant="outline" size="sm" className="rounded-xl" onClick={clearSaved} data-testid="button-clear-saved">
              Clear All
            </Button>
          )}
        </motion.div>

        {!loading && saved.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No saved items yet"
            description="Tap the heart icon on any product to save it here for later."
            action={{ label: "Browse Catalog", onClick: () => router.push("/catalog") }}
          />
        ) : (
          <ProductGrid products={saved} loading={loading} />
        )}
      </div>
    </div>
    </CustomerLayout>

  );
}
