'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Sparkles, ArrowRight, Shield, Award, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { MOCK_PRODUCTS, MOCK_COLLECTIONS, MOCK_OCCASIONS, getFeaturedProducts } from "@/lib/mock-data";

const trustItems = [
  { icon: Shield, label: "BIS Hallmarked", desc: "Every piece certified" },
  { icon: Award, label: "Certified Jewellers", desc: "Vetted & verified stores" },
  { icon: Camera, label: "Virtual Try-On", desc: "See pieces in-store" },
  { icon: Users, label: "Staff Assisted", desc: "Guided showroom experience" },
];

export default function HomePage() {
  const router = useRouter();
  const featured = getFeaturedProducts().slice(0, 8);

  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ height: "80vh", minHeight: 480 }}>
        <img
          src="https://images.unsplash.com/photo-1599643478524-fb66f7ca2b6e?w=1600&q=85"
          alt="Luxurious Indian jewellery"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 w-full">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 backdrop-blur-md border border-white/20" style={{ background: "rgba(255,255,255,0.1)" }}>
                <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span className="text-xs font-semibold text-white">AI-Powered Jewellery Discovery</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-medium tracking-tight leading-[1.1] text-white mb-5">
                Find Your<br />Perfect Piece
              </h1>
              <p className="text-base text-white/75 mb-8 max-w-sm leading-relaxed">
                Discover certified Indian jewellery from master craftsmen. Try on virtually with AI, save your favourites, and shop with confidence.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  className="rounded-full px-6 text-sm font-semibold hover:scale-[1.02] transition-transform"
                  style={{ background: "#C9A84C", color: "#fff" }}
                  onClick={() => router.push("/catalog")}
                  data-testid="button-explore-catalog"
                >
                  Explore Catalog
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full px-6 text-sm font-semibold border-white/40 text-white hover:bg-white/10 hover:border-white/60"
                  onClick={() => router.push("/try-on")}
                  data-testid="button-try-on-hero"
                >
                  Try On Now
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="py-16 md:py-24 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Explore</p>
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight">Curated Collections</h2>
          </div>
          <button
            onClick={() => router.push("/collections")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="link-all-collections"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Editorial layout: large featured left + two stacked right */}
        
          
          
          
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5" style={{ height: "clamp(auto, 52vw, 560px)" }}>
          {/* Featured — col-span-3 */}
          {MOCK_COLLECTIONS[0] && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => router.push(`/collections/${MOCK_COLLECTIONS[0]!.slug}`)}
              className="md:col-span-3 relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{ minHeight: 260, height: "100%" }}
              data-testid={`card-collection-${MOCK_COLLECTIONS[0]!.id}`}
            >
              <img
                src={MOCK_COLLECTIONS[0]!.imageUrl}
                alt={MOCK_COLLECTIONS[0]!.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/90 bg-primary/15 border border-primary/20 rounded-full px-2.5 py-1 mb-3 inline-block">Featured</span>
                <p className="font-semibold text-white text-xl md:text-2xl">{MOCK_COLLECTIONS[0]!.name}</p>
                <p className="text-white/65 text-sm mt-1.5 max-w-xs leading-relaxed">{MOCK_COLLECTIONS[0]!.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-white/50">{MOCK_COLLECTIONS[0]!.productCount} pieces</span>
                  <span className="text-white/30">·</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Two stacked — col-span-2 */}
          <div className="md:col-span-2 flex flex-col gap-4 md:gap-5">
            {MOCK_COLLECTIONS.slice(1, 3).map((col, i) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                onClick={() => router.push(`/collections/${col.slug}`)}
                className="relative overflow-hidden rounded-2xl cursor-pointer group flex-1"
                style={{ minHeight: 110 }}
                data-testid={`card-collection-${col.id}`}
              >
                <img
                  src={col.imageUrl}
                  alt={col.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="font-semibold text-white text-base">{col.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-white/55">{col.productCount} pieces</p>
                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0">
                      Explore <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-16 md:py-24 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto bg-[#F5F0EB]/50 rounded-3xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Popular Now</p>
            <h2 className="text-2xl font-medium tracking-tight">Trending Now</h2>
          </div>
          <button onClick={() => router.push("/catalog")} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1" data-testid="link-view-all-trending">
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {featured.slice(0, 4).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Shop by Occasion */}
      <section className="py-16 md:py-24 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Occasions</p>
          <h2 className="text-2xl font-medium tracking-tight">Shop by Occasion</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
          {MOCK_OCCASIONS.map((occ, i) => (
            <motion.div
              key={occ.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => router.push(`/occasions/${occ.slug}`)}
              className="flex-shrink-0 snap-start relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{ width: 160, height: 200 }}
              data-testid={`card-occasion-${occ.id}`}
            >
              <img src={occ.imageUrl} alt={occ.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="font-semibold text-white text-sm">{occ.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Try-On CTA Banner */}
      <section className="py-8 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-3xl" style={{ background: "linear-gradient(135deg, #C9A84C15 0%, #C9A84C30 100%)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="flex flex-col md:flex-row items-center min-h-[200px]">
            <div className="flex-1 px-8 py-10 md:py-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Virtual Try-On</p>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-foreground mb-4">
                See How It Looks On You
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Try on jewellery virtually with our AI-powered AR technology. Coming soon.
              </p>
              <Button
                className="rounded-full px-6 font-semibold hover:scale-[1.02] transition-transform"
                style={{ background: "#C9A84C", color: "#fff" }}
                onClick={() => router.push("/try-on")}
                data-testid="button-try-virtual"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Try Virtual Try-On
              </Button>
            </div>
            <div className="w-full md:w-64 h-48 md:h-full flex-shrink-0 overflow-hidden rounded-r-3xl">
              <img
                src="https://images.unsplash.com/photo-1573408301185-9519f94f4105?w=600&q=80"
                alt="Jewellery try-on"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* More Featured Products */}
      <section className="py-16 md:py-24 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Discover</p>
          <h2 className="text-2xl font-medium tracking-tight">More to Explore</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {MOCK_PRODUCTS.slice(4, 12).map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-12 px-4 md:px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {trustItems.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
    </CustomerLayout>

  );
}
