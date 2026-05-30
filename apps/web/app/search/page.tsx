'use client';

import { Camera, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import CustomerLayout from '@/components/layout/CustomerLayout';
import ProductGrid from '@/components/product/ProductGrid';
import SearchBar from '@/components/search/SearchBar';
import { adaptProduct, fetchCategories, type ApiCategory, type ApiProduct } from '@/lib/catalog-adapter';
import { POPULAR_SEARCHES, type Product } from '@/lib/mock-data';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const lastQuery = useRef('');

  useEffect(() => {
    void fetchCategories().then((c) => setCats(c));
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    lastQuery.current = q;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/search/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 40 }),
      });
      if (!res.ok) { setResults([]); return; }
      const json = (await res.json()) as
        | { data: { results: Array<{ product: ApiProduct; score: number }> } }
        | { error: { message: string } };
      if (q !== lastQuery.current) return;
      if ('error' in json) { setError(json.error.message); return; }
      const adapted = json.data.results.map((r) => adaptProduct(r.product, cats));
      setResults(adapted);
    } catch {
      if (q === lastQuery.current) setResults([]);
    } finally {
      if (q === lastQuery.current) setLoading(false);
    }
  }, [cats]);

  function onSearch(q: string) {
    setQuery(q);
    void runSearch(q);
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen pt-16" data-testid="search-page">
        <div className="max-w-[1400px] mx-auto px-4 py-10 md:px-6 lg:px-12">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mb-10 max-w-2xl">
            <h1 className="mb-6 text-center text-3xl font-medium tracking-tight">Search Jewellery</h1>
            <SearchBar onSearch={onSearch} autoFocus className="w-full" />
            <div className="mt-4 flex justify-center">
              <Link href="/search/image" className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10">
                <Camera className="h-4 w-4" />
                Search by photo
              </Link>
            </div>
          </motion.div>

          {!query ? (
            <div className="mx-auto max-w-2xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button key={s} onClick={() => onSearch(s)}
                    className="rounded-full bg-accent px-3 py-1.5 text-sm text-accent-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    data-testid={`chip-popular-${s.toLowerCase().replace(/\s+/g, '-')}`}>{s}</button>
                ))}
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div>
              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
              {!error && <p className="mb-6 text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;</p>}
              <ProductGrid products={results} emptyTitle="No products found" emptyDescription={`We couldn't find anything for "${query}". Try a different search.`} />
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
