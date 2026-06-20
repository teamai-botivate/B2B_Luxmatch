'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCollections, type ApiCollection } from "@/lib/catalog-adapter";

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<ApiCollection[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCollections().then((cols) => {
      if (!cancelled) setCollections(cols);
    });
    return () => { cancelled = true; };
  }, []);

  const [featured, ...rest] = collections;

  return (
    <CustomerLayout>
    <div className="min-h-screen" data-testid="collections-page">

      {/* ── Page Hero ── */}
      <div className="bg-gradient-to-b from-[#F5EFE4] to-background border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10 md:py-14">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Explore</p>
            <h1 className="text-3xl md:text-5xl font-medium tracking-tight mb-3">Curated Collections</h1>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Thoughtfully assembled edits for every occasion — from bridal grandeur to everyday elegance.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10 md:py-14">

        {/* ── Featured Collection (full width hero card) ── */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => router.push(`/collections/${featured.slug}`)}
            className="relative overflow-hidden rounded-3xl cursor-pointer group mb-5 md:mb-6"
            style={{ height: "clamp(240px, 40vw, 420px)" }}
            data-testid={`card-collection-${featured.id}`}
          >
            {featured.image_url && (
              <img
                src={featured.image_url}
                alt={featured.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-transparent" />
            {/* Hover tint */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="absolute inset-0 flex items-end p-6 md:p-10">
              <div className="max-w-lg">
                <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary/90 bg-primary/15 border border-primary/20 rounded-full px-3 py-1 mb-3 backdrop-blur-sm">
                  Featured Collection
                </span>
                <h2 className="text-2xl md:text-4xl font-medium text-white mb-2">{featured.name}</h2>
                <p className="text-white/70 text-sm md:text-base leading-relaxed mb-4 max-w-sm">{featured.description ?? ""}</p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full px-4 py-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                    Explore <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Rest of collections grid ── */}
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5"
        >
          {rest.map(col => (
            <motion.div
              key={col.id}
              variants={fadeUp}
              onClick={() => router.push(`/collections/${col.slug}`)}
              className="relative overflow-hidden rounded-2xl cursor-pointer group"
              style={{ aspectRatio: "4/3" }}
              data-testid={`card-collection-${col.id}`}
            >
              {col.image_url && (
                <img
                  src={col.image_url}
                  alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {/* Base gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="font-semibold text-white text-lg leading-tight">{col.name}</p>
                <p className="text-white/65 text-sm mt-1 line-clamp-2">{col.description ?? ""}</p>
                <div className="flex items-center justify-end mt-3">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/15 border border-primary/25 rounded-full px-3 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    Explore <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 md:mt-20 rounded-3xl bg-gradient-to-br from-[#1a1208] to-[#2d2010] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-white">Not sure which collection suits you?</h3>
              <p className="text-white/60 text-sm mt-1 max-w-md leading-relaxed">
                Take our 7-step style quiz — we&apos;ll match you to the perfect collection based on your occasion, aesthetic, and budget.
              </p>
            </div>
          </div>
          <Link href="/style-quiz">
            <Button className="rounded-full px-8 py-3 bg-primary text-black font-semibold gap-2 whitespace-nowrap hover:opacity-90 flex-shrink-0">
              Take the Style Quiz <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
    </CustomerLayout>

  );
}
