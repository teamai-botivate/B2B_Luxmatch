'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductDetailPanel from "@/components/product/ProductDetailPanel";
import ProductCard from "@/components/product/ProductCard";
import { getProductBySlug, MOCK_PRODUCTS } from "@/lib/mock-data";
import NotFoundView from "@/components/ui/NotFoundView";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const product = slug ? getProductBySlug(slug) : undefined;

  if (!product) return <NotFoundView />;

  const similar = MOCK_PRODUCTS
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  const recent = MOCK_PRODUCTS.filter(p => p.id !== product.id).slice(0, 4);

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="product-detail-page">
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

        {/* Recently Viewed */}
        <section>
          <h2 className="text-xl font-medium mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {recent.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      </div>
    </div>
    </CustomerLayout>

  );
}
