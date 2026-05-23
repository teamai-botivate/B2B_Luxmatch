'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useState } from "react";
import { motion } from "motion/react";
import ImageUploadDropzone from "@/components/search/ImageUploadDropzone";
import ProductCard from "@/components/product/ProductCard";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

export default function ImageSearchPage() {
  const [hasResults, setHasResults] = useState(false);
  const results = MOCK_PRODUCTS.slice(0, 6);

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="image-search-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Visual Discovery</p>
          <h1 className="text-3xl font-medium tracking-tight">Search by Image</h1>
          <p className="text-muted-foreground mt-2">Upload a photo of jewellery you love and we'll find similar pieces.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <ImageUploadDropzone onResults={() => setHasResults(true)} />
            <p className="text-xs text-muted-foreground text-center mt-4">Or describe what you're looking for:</p>
            <input type="text" placeholder="e.g. gold necklace with emerald pendant..." className="w-full mt-2 px-4 py-3 rounded-2xl border border-border bg-muted/40 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" data-testid="input-text-hybrid" />
          </div>

          <div>
            {hasResults ? (
              <div>
                <p className="text-sm font-semibold mb-4">Similar items found</p>
                <div className="grid grid-cols-2 gap-4">
                  {results.map((p, i) => (
                    <div key={p.id} className="relative" data-testid={`result-card-${p.id}`}>
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "#C9A84C" }}>
                        {92 - i * 3}% match
                      </div>
                      <ProductCard product={p} index={i} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </div>
                <p className="text-sm font-medium mb-1">Upload an image to get started</p>
                <p className="text-xs">Your results will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </CustomerLayout>

  );
}
