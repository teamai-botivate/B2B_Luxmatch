'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";

import CustomerLayout from "@/components/layout/CustomerLayout";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductDetailPanel from "@/components/product/ProductDetailPanel";
import ProductCard from "@/components/product/ProductCard";
import NotFoundView from "@/components/ui/NotFoundView";
import type { Product } from "@/lib/mock-data";
import {
  adaptProduct,
  fetchCategories,
  fetchProductBySlug,
  fetchProducts,
} from "@/lib/catalog-adapter";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const [cats, raw] = await Promise.all([
        fetchCategories(),
        fetchProductBySlug(slug),
      ]);

      if (!raw) { setProduct(null); return; }

      const adapted = adaptProduct(raw, cats);
      setProduct(adapted);

      const { products: all } = await fetchProducts({ limit: 200 });
      const allAdapted = all.map(p => adaptProduct(p, cats));

      setSimilar(allAdapted.filter(p => p.id !== adapted.id && p.category === adapted.category).slice(0, 4));
      setRecent(allAdapted.filter(p => p.id !== adapted.id).slice(0, 4));
    }

    void load();
  }, [slug]);

  // Still loading
  if (product === undefined) {
    return (
      <CustomerLayout>
        <div className="min-h-screen">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
              <div className="space-y-4">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-8 w-32 rounded bg-muted animate-pulse" />
                <div className="h-12 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  if (product === null) return <NotFoundView />;

  return (
    <CustomerLayout>
      <div className="min-h-screen" data-testid="product-detail-page">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-8" aria-label="Breadcrumb">
            <Link href="/"><span className="hover:text-foreground transition-colors cursor-pointer">Home</span></Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/catalog"><span className="hover:text-foreground transition-colors cursor-pointer">Catalog</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>

          {/* Main Layout */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
            <ProductImageGallery images={product.images} productName={product.name} />
            <ProductDetailPanel product={product} />
          </motion.div>

          {/* Similar Products */}
          {similar.length > 0 && (
            <section className="mb-16">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-xl font-medium">Similar Products</h2>
                <Link href="/catalog"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">View All</span></Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {similar.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </section>
          )}

          {/* You May Also Like */}
          {recent.length > 0 && (
            <section>
              <h2 className="text-xl font-medium mb-6">You May Also Like</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {recent.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
