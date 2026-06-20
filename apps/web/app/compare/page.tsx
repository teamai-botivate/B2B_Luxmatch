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
  }  return (
    <CustomerLayout>
      <div className="min-h-screen bg-[#fbf9f5]" data-testid="compare-page">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#dfd3bf]/60">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A84C] mb-1">Side by Side</p>
              <h1 className="font-display text-3xl font-medium tracking-tight text-[#1a1208]">Compare Jewellery</h1>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-md border-[#e4d8c6] text-xs font-semibold text-[#1a1208] hover:bg-[#1a1208]/5" 
              onClick={clearCompare} 
              data-testid="button-clear-all-compare"
            >
              Clear All
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e4d8c6] bg-[#fffdf8] shadow-sm">
            <table className="w-full border-collapse" style={{ minWidth: (products.length + (canAddMore ? 1 : 0)) * 220 + 160 }}>
              {/* Product headers */}
              <thead>
                <tr className="border-b border-[#e4d8c6]">
                  <th className="w-40 min-w-[160px] p-4 text-left font-display text-xs font-bold uppercase tracking-wider text-muted-foreground bg-[#fbf9f5]/50 border-r border-[#dfd3bf]/40" />
                  {products.map(p => (
                    <th key={p.id} className="w-[220px] min-w-[220px] p-4 align-top border-r border-[#dfd3bf]/40 last:border-0 relative">
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative group/card pt-3 w-[180px] mx-auto">
                        <button
                          onClick={() => toggleCompare(p.id)}
                          className="absolute top-0 right-0 w-6 h-6 bg-[#1a1208] border border-[#e4d8c6] rounded-full flex items-center justify-center z-10 shadow-sm transition-transform hover:scale-105"
                          aria-label="Remove from compare"
                          data-testid={`button-remove-compare-${p.id}`}
                        >
                          <X className="w-3 h-3 text-[#e4d8c6] stroke-[2.5px]" />
                        </button>
                        <Link href={`/catalog/${p.slug}`}>
                          <div className="overflow-hidden rounded-md bg-[#ece5da] mb-3 cursor-pointer ring-1 ring-black/5 w-[180px] h-[240px]" style={{ aspectRatio: "3/4" }}>
                            <img src={productImageUrl(p.images)} alt={p.name} className="w-full h-full object-cover group-hover/card:scale-[1.03] transition-transform duration-500" />
                          </div>
                        </Link>
                        <p className="font-display text-sm font-semibold text-center text-[#1a1208] leading-tight px-1">{p.name}</p>
                      </motion.div>
                    </th>
                  ))}
                  {canAddMore && (
                    <th className="w-[220px] min-w-[220px] p-4 align-top">
                      <div className="pt-3 w-[180px] mx-auto">
                        <div
                          onClick={() => router.push("/catalog")}
                          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#dfd3bf] rounded-md cursor-pointer hover:border-[#C9A84C] hover:bg-[#fbf9f5] transition-all w-[180px] h-[240px]"
                        >
                          <Plus className="w-6 h-6 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Add More</span>
                        </div>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {ROWS.map(({ label, key, render }, i) => (
                  <tr key={key} className={`border-b border-[#dfd3bf]/30 ${i % 2 === 0 ? "bg-[#fbf9f5]/50" : "bg-[#fffdf8]"}`}>
                    <td className="w-40 min-w-[160px] p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-[#fbf9f5]/30 border-r border-[#dfd3bf]/40">{label}</td>
                    {products.map(p => (
                      <td key={p.id} className="w-[220px] min-w-[220px] p-4 text-xs sm:text-sm text-center font-semibold text-[#1a1208] border-r border-[#dfd3bf]/40 last:border-r-0">
                        <div className="w-[180px] mx-auto">
                          {render(p)}
                        </div>
                      </td>
                    ))}
                    {canAddMore && <td className="w-[220px] min-w-[220px] bg-transparent" />}
                  </tr>
                ))}
                {/* Actions row */}
                <tr className="bg-[#fbf9f5]/20">
                  <td className="w-40 min-w-[160px] p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r border-[#dfd3bf]/40">Actions</td>
                  {products.map(p => (
                    <td key={p.id} className="w-[220px] min-w-[220px] p-4 border-r border-[#dfd3bf]/40 last:border-0">
                      <div className="flex flex-col gap-2 w-[180px] mx-auto">
                        <Link href={`/catalog/${p.slug}`} className="w-full">
                          <Button variant="outline" size="sm" className="w-full rounded-md border-[#e4d8c6] text-xs font-semibold hover:bg-[#1a1208]/5">View Details</Button>
                        </Link>
                        {p.hasTryOn && (
                          <Link href="/try-on" className="w-full">
                            <Button size="sm" className="metal-sheen w-full rounded-md border-0 text-xs font-bold text-[#17120b] shadow-sm">
                              <Camera className="w-3.5 h-3.5 mr-1" /> Try On
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  ))}
                  {canAddMore && <td className="w-[220px] min-w-[220px]" />}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
