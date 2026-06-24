'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import ProductGrid from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/mock-data";
import {
  adaptProduct,
  fetchCategories,
  type ApiCollection,
  type ApiProduct,
} from "@/lib/catalog-adapter";
import NotFoundView from "@/components/ui/NotFoundView";

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [categories, res] = await Promise.all([
        fetchCategories(),
        fetch(`/api/collections/${encodeURIComponent(slug)}`, { cache: "no-store" }),
      ]);
      if (cancelled) return;
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as {
        data?: { collection: ApiCollection; products: ApiProduct[] };
      };
      if (!json.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCollection(json.data.collection);
      setProducts(json.data.products.map((p) => adaptProduct(p, categories)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (notFound) return <NotFoundView />;
  if (!collection) {
    return (
      <CustomerLayout>
        <div className="min-h-screen">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
            <ProductGrid products={[]} loading />
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="collection-detail-page">
      <div className="relative overflow-hidden" style={{ height: 280 }}>
        {collection.image_url && (
          <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        <div className="absolute bottom-0 left-0 right-0 max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 pb-8">
          <nav className="flex items-center gap-1.5 text-xs text-white/60 mb-3">
            <Link href="/"><span className="hover:text-white transition-colors cursor-pointer">Home</span></Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/collections"><span className="hover:text-white transition-colors cursor-pointer">Collections</span></Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">{collection.name}</span>
          </nav>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-3xl md:text-4xl font-medium text-white">{collection.name}</motion.h1>
          <p className="text-white/70 mt-2 max-w-md">{collection.description ?? ""}</p>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
        <ProductGrid products={products} loading={loading} />

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
            <p className="text-sm text-muted-foreground max-w-md">Try on any AR-enabled piece from this collection before you buy — no commitment, just confidence.</p>
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
            Take our 7-step style quiz and get a personalised curation of pieces from this collection — matched to your budget, occasion, and aesthetic.
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
