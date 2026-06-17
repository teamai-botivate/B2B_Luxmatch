'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import ProductGrid from "@/components/product/ProductGrid";
import { MOCK_OCCASIONS } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { adaptProduct, fetchCategories, type ApiProduct } from "@/lib/catalog-adapter";
import NotFoundView from "@/components/ui/NotFoundView";

export default function OccasionPage() {
  const params = useParams();
  const slug = params?.slug as string;
  // The occasion taxonomy (label + cover image) is a fixed navigation set, not
  // shop inventory — keep it static. Products come from the tenant-scoped API.
  const occasionData = MOCK_OCCASIONS.find(o => o.slug === slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [categories, res] = await Promise.all([
        fetchCategories(),
        fetch(`/api/occasions/${encodeURIComponent(slug)}`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      const json = res.ok
        ? ((await res.json()) as { data?: { products: ApiProduct[] } })
        : { data: { products: [] } };
      setProducts((json.data?.products ?? []).map((p) => adaptProduct(p, categories)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (!occasionData) return <NotFoundView />;

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="occasion-page">
      <div className="relative overflow-hidden" style={{ height: 240 }}>
        <img src={occasionData.imageUrl} alt={occasionData.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 pb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-1">Occasion</p>
            <h1 className="text-3xl font-medium text-white">{occasionData.name}</h1>
            <p className="text-white/70 text-sm mt-1">{occasionData.description}</p>
          </motion.div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
        <ProductGrid products={products} loading={loading} emptyTitle="No products for this occasion" />
      </div>
    </div>
    </CustomerLayout>

  );
}
