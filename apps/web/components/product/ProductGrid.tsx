'use client';

import { Skeleton } from "@/components/ui/skeleton";
import { Product } from "@/lib/mock-data";
import ProductCard from "./ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import { Package } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function ProductGrid({ products, loading, emptyTitle, emptyDescription }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="product-grid-loading">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-full rounded-2xl" style={{ aspectRatio: "3/4" }} />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={emptyTitle ?? "No products found"}
        description={emptyDescription ?? "Try adjusting your filters or search query."}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" data-testid="product-grid">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} index={i} />
      ))}
    </div>
  );
}
