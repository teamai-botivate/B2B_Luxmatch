'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import ProductGrid from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen" data-testid="occasion-page">
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

        {/* View all CTA */}
        <div className="flex flex-col items-center gap-3 mt-10 mb-4">
          <Link href="/catalog">
            <Button variant="outline" className="rounded-full px-8 gap-2 border-border hover:border-primary hover:text-primary">
              View All Jewellery <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Try-On CTA */}
      <section className="py-14 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6 bg-primary/5 border border-primary/10 rounded-3xl p-8 md:p-10"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Virtual Try-On</p>
            <h3 className="text-xl font-medium mb-1">See how it looks on you</h3>
            <p className="text-sm text-muted-foreground max-w-md">Try on any AR-enabled piece for this occasion before you buy — no commitment, just confidence.</p>
          </div>
          <Link href="/try-on">
            <Button className="rounded-full px-8 whitespace-nowrap bg-primary text-primary-foreground hover:opacity-90 gap-2 shrink-0">
              Open Try-On <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Style Quiz banner */}
      <section className="bg-gradient-to-r from-[#1a1208] to-[#2a1f0a] py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto px-6 text-center flex flex-col items-center gap-5"
        >
          <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#C9A84C]" />
          </div>
          <h2 className="text-2xl font-medium text-white">Not sure what suits you?</h2>
          <p className="text-white/60 text-sm leading-relaxed">
            Take our 7-step style quiz and get a personalised curation of pieces for this occasion — matched to your budget and aesthetic.
          </p>
          <Link href="/style-quiz">
            <Button className="rounded-full px-8 py-3 bg-[#C9A84C] hover:bg-[#b8963e] text-black font-semibold gap-2">
              Take the Style Quiz <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
    </CustomerLayout>

  );
}
