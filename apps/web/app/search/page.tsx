'use client';

import CustomerLayout from "@/components/layout/CustomerLayout";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Camera } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import ProductGrid from "@/components/product/ProductGrid";
import { POPULAR_SEARCHES, searchProducts } from "@/lib/mock-data";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => query ? searchProducts(query) : [], [query]);

  return (
    <CustomerLayout>
    <div className="min-h-screen pt-16" data-testid="search-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-medium tracking-tight mb-6 text-center">Search Jewellery</h1>
          <SearchBar onSearch={setQuery} autoFocus className="w-full" />
          <div className="mt-4 flex justify-center">
            <Link
              href="/search/image"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            >
              <Camera className="h-4 w-4" />
              Search by photo
            </Link>
          </div>
        </motion.div>

        {!query ? (
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map(s => (
                <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-full text-sm bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary transition-colors" data-testid={`chip-popular-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-6">
              {results.length} result{results.length !== 1 ? "s" : ""} for "{query}"
            </p>
            <ProductGrid products={results} emptyTitle="No products found" emptyDescription={`We couldn't find anything for "${query}". Try a different search.`} />
          </div>
        )}
      </div>
    </div>
    </CustomerLayout>

  );
}
