'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { MapPin, Star } from "lucide-react";
import ProductGrid from "@/components/product/ProductGrid";
import TrustBadge from "@/components/ui/TrustBadge";
import { getJewellerBySlug, getProductsByJeweller } from "@/lib/mock-data";
import NotFoundView from "@/components/ui/NotFoundView";

export default function JewellerStorefrontPage() {
  const params = useParams();
  const slug = params?.["jeweller-slug"] as string;
  const jeweller = slug ? getJewellerBySlug(slug) : undefined;
  if (!jeweller) return <NotFoundView />;

  const products = getProductsByJeweller(jeweller.id);

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="jeweller-storefront-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Store Header */}
          <div className="flex items-start gap-5 p-6 rounded-2xl border border-border bg-card mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl font-bold text-primary">
              {jeweller.storeName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-medium tracking-tight">{jeweller.storeName}</h1>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {jeweller.city}</span>
                {jeweller.rating && (
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-primary text-primary" /> {jeweller.rating}</span>
                )}
                <span>{jeweller.productCount} products</span>
              </div>
              <div className="flex gap-2 mt-3">
                <TrustBadge variant="BIS Hallmarked" />
                <TrustBadge variant="Certified" />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-medium mb-6">Products by {jeweller.name}</h2>
          <ProductGrid products={products} emptyTitle="No products yet" />
        </motion.div>
      </div>
    </div>
    </CustomerLayout>

  );
}
