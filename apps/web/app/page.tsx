'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Camera, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { arDemoAssetUrl } from "@/lib/ar-demo-assets";
import { MOCK_OCCASIONS } from "@/lib/mock-data";
import type { Collection, Product } from "@/lib/mock-data";
import {
  adaptProduct,
  fetchCategories,
  fetchCollections,
  fetchProducts,
} from "@/lib/catalog-adapter";

function adaptCollection(c: {
  id: string; slug: string; name: string;
  description: string | null; image_url: string | null;
}): Collection {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    imageUrl: c.image_url ?? "",
    productCount: 0,
  };
}

export default function HomePage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<Product[]>([]);
  const [more, setMore] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [featuredDismissed, setFeaturedDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [categories, featuredRes, latestRes, cols] = await Promise.all([
        fetchCategories(),
        fetchProducts({ featured: true, limit: 8 }),
        fetchProducts({ limit: 12 }),
        fetchCollections(),
      ]);
      if (cancelled) return;
      const featuredProducts = featuredRes.products.map((p) => adaptProduct(p, categories));
      const latest = latestRes.products.map((p) => adaptProduct(p, categories));
      const featuredList = featuredProducts.length > 0 ? featuredProducts : latest.slice(0, 8);
      const featuredIds = new Set(featuredList.map((p) => p.id));
      setFeatured(featuredList);
      setMore(latest.filter((p) => !featuredIds.has(p.id)).slice(0, 8));
      setCollections(cols.map(adaptCollection));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const heroProduct = featured[0];

  return (
    <CustomerLayout>
      <div className="min-h-screen overflow-hidden" data-testid="home-page">
        <section className="relative min-h-[calc(100svh-88px)] overflow-hidden bg-[#211711]">
          <img
            src="https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=1800&q=90"
            alt="Gold jewellery displayed in a premium showroom"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.18]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,14,10,0.84)_0%,rgba(20,14,10,0.58)_42%,rgba(20,14,10,0.20)_72%,rgba(20,14,10,0.44)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/45 via-background/10 to-transparent" />
          <div className="pointer-events-none absolute right-[-1%] top-[10%] hidden h-[76%] w-[49%] md:block">
            <img
              src={arDemoAssetUrl("/All_jewelleries/necklace/N2.png")}
              alt=""
              aria-hidden="true"
              className="absolute right-[0%] top-[0%] h-[50%] w-auto object-contain opacity-95 drop-shadow-[0_38px_72px_rgba(0,0,0,0.55)]"
            />
            <img
              src={arDemoAssetUrl("/All_jewelleries/rings/4.png")}
              alt=""
              aria-hidden="true"
              className="absolute bottom-[5%] right-[36%] h-[25%] w-auto rotate-[-8deg] object-contain opacity-92 drop-shadow-[0_28px_50px_rgba(0,0,0,0.48)]"
            />
            <img
              src={arDemoAssetUrl("/All_jewelleries/bracelets/1.png")}
              alt=""
              aria-hidden="true"
              className="absolute bottom-[16%] right-[0%] h-[28%] w-auto rotate-[8deg] object-contain opacity-92 drop-shadow-[0_28px_50px_rgba(0,0,0,0.48)]"
            />
          </div>
          <div className="pointer-events-none absolute right-[-38%] top-[10%] h-[42%] w-[92%] opacity-35 md:hidden">
            <img
              src={arDemoAssetUrl("/All_jewelleries/necklace/N2.png")}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
            />
          </div>
          <div className="relative mx-auto flex min-h-[calc(100svh-88px)] max-w-[1400px] items-center px-4 py-16 md:px-6 lg:px-12">
            <div className="max-w-2xl">
              <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#e4cf8f]">
                <Sparkles className="h-3.5 w-3.5" />
                AI jewellery showroom
              </p>
              <h1 className="font-display max-w-2xl text-5xl font-normal leading-[0.98] tracking-normal text-white sm:text-6xl md:text-7xl">
                LuxeMatch
              </h1>
              <p className="mt-5 max-w-md text-lg leading-7 text-white/78">
                Browse the jeweller&apos;s live catalogue, compare certified pieces, and preview favourites with virtual try-on before checkout.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  className="metal-sheen rounded-full border-0 px-6 font-semibold text-[#17120b] shadow-lg shadow-black/20 transition-transform hover:scale-[1.02]"
                  onClick={() => router.push("/catalog")}
                  data-testid="button-explore-catalog"
                >
                  Explore Catalogue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/35 bg-white/[0.08] px-6 font-semibold text-white backdrop-blur-md hover:bg-white/[0.14] hover:text-white"
                  onClick={() => router.push("/try-on")}
                  data-testid="button-try-on-hero"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Try On
                </Button>
              </div>
            </div>

          </div>
        </section>

        {heroProduct && !featuredDismissed && (
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
            className="fixed bottom-5 right-5 z-40 hidden w-[350px] rounded-xl border border-black/10 bg-[#fbf8f1]/95 p-3 text-left shadow-[0_20px_60px_rgba(0,0,0,0.24)] ring-1 ring-black/5 backdrop-blur-xl md:block"
            data-testid="hero-featured-piece"
            aria-label="Featured piece"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-black/10 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9b762f]">Featured piece</span>
              <button
                type="button"
                onClick={() => setFeaturedDismissed(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#5f574f] transition-colors hover:bg-black/5 hover:text-[#1f1a14]"
                aria-label="Dismiss featured piece"
                data-testid="button-dismiss-featured-piece"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/catalog/${heroProduct.slug}`)}
              className="group flex w-full items-center gap-4 text-left"
            >
              <span className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#e9e2d7] ring-1 ring-black/10">
                <img src={heroProduct.images[0]?.url} alt={heroProduct.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-1 text-sm font-semibold text-[#1f1a14]">{heroProduct.name}</span>
                <span className="mt-1 block text-xs text-[#6f675e]">{heroProduct.category} · {heroProduct.metal}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#b68a3e]">
                  View details <ArrowRight className="h-3 w-3" />
                </span>
              </span>
            </button>
          </motion.aside>
        )}

        <section className="mx-auto max-w-[1400px] px-4 py-14 md:px-6 md:py-20 lg:px-12">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Explore</p>
              <h2 className="font-display text-3xl font-normal tracking-normal md:text-5xl">Curated collections</h2>
            </div>
            <button
              onClick={() => router.push("/collections")}
              className="luxury-link-underline hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              data-testid="link-all-collections"
            >
              View all collections
            </button>
          </div>

          {collections.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-5">
              {collections[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5 }}
                  onClick={() => router.push(`/collections/${collections[0]!.slug}`)}
                  className="group relative min-h-[420px] cursor-pointer overflow-hidden rounded-lg md:col-span-3"
                  data-testid={`card-collection-${collections[0]!.id}`}
                >
                  <img
                    src={collections[0]!.imageUrl}
                    alt={collections[0]!.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/42" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.24em] text-[#e4cf8f]">Featured</span>
                    <p className="font-display text-3xl font-normal text-white md:text-4xl">{collections[0]!.name}</p>
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/70">{collections[0]!.description}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#e4cf8f] opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                      Explore <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="grid gap-4 md:col-span-2 md:gap-5">
                {collections.slice(1, 3).map((col, i) => (
                  <motion.div
                    key={col.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: 0.08 + i * 0.08, duration: 0.5 }}
                    onClick={() => router.push(`/collections/${col.slug}`)}
                    className="group relative min-h-[200px] cursor-pointer overflow-hidden rounded-lg"
                    data-testid={`card-collection-${col.id}`}
                  >
                    <img
                      src={col.imageUrl}
                      alt={col.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/38" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="font-display text-2xl font-normal text-white">{col.name}</p>
                      <span className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#e4cf8f] opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                        Explore <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="bg-[#1b1612] py-14 text-white md:py-20">
          <div className="mx-auto max-w-[1400px] px-4 md:px-6 lg:px-12">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4cf8f]">Popular now</p>
                <h2 className="font-display text-3xl font-normal md:text-5xl">Pieces drawing attention</h2>
              </div>
              <button
                onClick={() => router.push("/catalog")}
                className="luxury-link-underline hidden text-sm font-semibold text-white/65 transition-colors hover:text-white sm:inline-flex"
                data-testid="link-view-all-trending"
              >
                View catalogue
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 [--foreground:40_33%_98%] [--muted-foreground:40_12%_70%] md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {featured.slice(0, 4).map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            {featured.length === 0 && (
              <p className="text-sm text-white/60">No featured pieces yet. Explore the full catalogue.</p>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-14 md:px-6 md:py-20 lg:px-12">
          <div className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Occasions</p>
            <h2 className="font-display text-3xl font-normal md:text-5xl">Shop by moment</h2>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 snap-x">
            {MOCK_OCCASIONS.map((occ, i) => (
              <motion.div
                key={occ.id}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/occasions/${occ.slug}`)}
                className="group relative h-[230px] w-[178px] flex-shrink-0 snap-start cursor-pointer overflow-hidden rounded-lg"
                data-testid={`card-occasion-${occ.id}`}
              >
                <img src={occ.imageUrl} alt={occ.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/36" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-display text-xl font-normal text-white">{occ.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 pb-8 md:px-6 lg:px-12">
          <div className="grid overflow-hidden rounded-lg bg-[#211913] text-white md:grid-cols-[1.1fr_0.9fr]">
            <div className="px-6 py-10 md:px-10 md:py-14">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4cf8f]">Virtual try-on</p>
              <h2 className="font-display max-w-xl text-3xl font-normal leading-tight md:text-5xl">
                Bring the piece closer before you decide.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-white/68">
                Preview necklaces, earrings, rings, and bangles on the kiosk, then move straight to cart or staff assistance.
              </p>
              <Button
                className="metal-sheen mt-8 rounded-full border-0 px-6 font-semibold text-[#17120b] transition-transform hover:scale-[1.02]"
                onClick={() => router.push("/try-on")}
                data-testid="button-try-virtual"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Open Try-On
              </Button>
            </div>
            <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[16/9] md:aspect-auto md:h-full md:min-h-[320px]">
              <img
                src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=85"
                alt="Jewellery try-on inspiration"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </section>

        {more.length > 0 && (
          <section className="mx-auto max-w-[1400px] px-4 py-14 md:px-6 md:py-20 lg:px-12">
            <div className="mb-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Discover</p>
              <h2 className="font-display text-3xl font-normal md:text-5xl">More to explore</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
              {more.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}

      </div>
    </CustomerLayout>
  );
}
