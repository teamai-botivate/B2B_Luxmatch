'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { X, Package, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";
import { trackEvent } from "@/lib/analytics";
import type { Product } from "@/lib/mock-data";
import { adaptProduct, fetchCategories, fetchProductsByIds, productImageUrl } from "@/lib/catalog-adapter";
import { formatINR } from "@/lib/format";
import EmptyState from "@/components/ui/EmptyState";

const ROWS = [
  { label: "Price", key: "price", render: (p: Product) => formatINR(p.price) },
  { label: "Category", key: "category", render: (p: Product) => p.category },
  { label: "Metal", key: "metal", render: (p: Product) => p.metal },
  { label: "Purity", key: "purity", render: (p: Product) => p.purity },
  { label: "Weight", key: "weight", render: (p: Product) => p.weight },
  { label: "Gemstones", key: "gemstones", render: (p: Product) => p.gemstones ?? "—" },
  { label: "Occasions", key: "occasions", render: (p: Product) => p.occasions.join(", ") },
  { label: "Virtual Try-On", key: "hasTryOn", render: (p: Product) => p.hasTryOn ? "Yes" : "No" },
];

export default function ComparePage() {
  const router = useRouter();
  const { compareItems, toggleCompare, clearCompare, canAddMore } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);

  // Compare IDs are real product UUIDs; hydrate from the tenant-scoped catalog
  // API so the table (and header images) reflect real product_images + specs.
  const ids = Array.from(compareItems).join(",");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idList = ids ? ids.split(",") : [];
      if (idList.length === 0) {
        if (!cancelled) setProducts([]);
        return;
      }
      const [categories, fetched] = await Promise.all([
        fetchCategories(),
        fetchProductsByIds(idList),
      ]);
      if (cancelled) return;
      setProducts(fetched.map((p) => adaptProduct(p, categories)));
    })();
    return () => { cancelled = true; };
  }, [ids]);

  // Fire once when the compare view is opened with items present.
  useEffect(() => {
    if (compareItems.size > 0) {
      trackEvent('compare_opened', { metadata: { count: compareItems.size } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (products.length === 0) {
    return (
      <CustomerLayout>
      <div className="min-h-screen flex items-center justify-center" data-testid="compare-page-empty">
        <EmptyState
          icon={Package}
          title="Nothing to compare yet"
          description="Add products to your compare list by clicking the compare icon on any product card."
          action={{ label: "Browse Catalog", onClick: () => router.push("/catalog") }}
        />
      </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="compare-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Side by Side</p>
            <h1 className="text-3xl font-medium tracking-tight">Compare</h1>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={clearCompare} data-testid="button-clear-all-compare">
            Clear All
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: products.length * 200 + 160 }}>
            {/* Product headers */}
            <thead>
              <tr>
                <th className="w-36 p-3 text-left" />
                {products.map(p => (
                  <th key={p.id} className="p-3 align-top">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
                      <button
                        onClick={() => toggleCompare(p.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-foreground rounded-full flex items-center justify-center z-10"
                        aria-label="Remove from compare"
                        data-testid={`button-remove-compare-${p.id}`}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <Link href={`/catalog/${p.slug}`}>
                        <div className="overflow-hidden rounded-2xl bg-muted mb-2 cursor-pointer" style={{ aspectRatio: "3/4" }}>
                          <img src={productImageUrl(p.images)} alt={p.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      </Link>
                      <p className="text-sm font-semibold text-center leading-snug">{p.name}</p>
                    </motion.div>
                  </th>
                ))}
                {canAddMore && (
                  <th className="p-3 align-top">
                    <div
                      onClick={() => router.push("/catalog")}
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-all"
                      style={{ aspectRatio: "3/4" }}
                    >
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Add More</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ label, key, render }, i) => (
                <tr key={key} className={i % 2 === 0 ? "bg-muted/20" : "bg-background"}>
                  <td className="p-3 text-xs font-semibold text-muted-foreground">{label}</td>
                  {products.map(p => (
                    <td key={p.id} className="p-3 text-sm text-center font-medium">
                      {render(p)}
                    </td>
                  ))}
                  {canAddMore && <td />}
                </tr>
              ))}
              {/* Actions row */}
              <tr>
                <td className="p-3 text-xs font-semibold text-muted-foreground">Actions</td>
                {products.map(p => (
                  <td key={p.id} className="p-3">
                    <div className="flex flex-col gap-1.5">
                      <Link href={`/catalog/${p.slug}`}>
                        <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">View</Button>
                      </Link>
                      {p.hasTryOn && (
                        <Link href="/try-on">
                          <Button size="sm" className="w-full rounded-xl text-xs bg-primary text-primary-foreground hover:opacity-90">
                            <Camera className="w-3 h-3 mr-1" /> Try On
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                ))}
                {canAddMore && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </CustomerLayout>

  );
}
