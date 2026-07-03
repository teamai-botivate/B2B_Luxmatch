'use client';

import { Camera, Eye, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import Link from 'next/link';

import CustomerLayout from '@/components/layout/CustomerLayout';
import ImageUploadDropzone from '@/components/search/ImageUploadDropzone';
import { productImageUrl } from '@/lib/catalog-adapter';

type NativeImageSearchResult = {
  product: {
    id: string;
    slug: string;
    name: string;
    primary_image_url?: string | null;
    images?: Array<{ url?: string | null; secure_url?: string | null; is_primary?: boolean }>;
  };
  score: number;
};

export default function ImageSearchPage() {
  const [results, setResults] = useState<NativeImageSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState(20);

  async function runSearch(file: File) {
    setError(null);
    setResults([]);

    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/search/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64, limit: topK }),
    });
    const json = (await res.json().catch(() => ({}))) as
      | { data: { results: NativeImageSearchResult[] } }
      | { error: { message: string } };

    if (!res.ok || 'error' in json) {
      const message = 'error' in json ? json.error.message : 'Visual search failed';
      setError(message);
      throw new Error(message);
    }

    setResults(json.data.results);
  }

  return (
    <CustomerLayout>
      <div className="min-h-screen" data-testid="image-search-page">
        <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Visual Discovery
            </p>
            <h1 className="text-3xl font-medium tracking-tight">Search by Image</h1>
            <p className="mt-2 text-muted-foreground">
              Upload a jewellery photo or take one with your camera to find visually similar
              pieces.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[420px_1fr]">
            <div className="space-y-4">
              <ImageUploadDropzone
                onSearch={runSearch}
                loadingLabel="Searching this store's catalog..."
              />

              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Results
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={6}
                    max={40}
                    value={topK}
                    onChange={(e) => setTopK(Number(e.target.value))}
                    className="w-full accent-[#C9A84C]"
                  />
                  <span className="w-8 text-right font-mono text-sm">{topK}</span>
                </div>
              </div>

              {error ? (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div>
              {results.length > 0 ? (
                <div>
                  <p className="mb-4 text-sm font-semibold">
                    {results.length} similar item{results.length === 1 ? '' : 's'} found
                  </p>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {results.map((item, index) => {
                      const pct = Math.round(item.score * 100);
                      return (
                        <Link
                          key={`${item.product.id}-${index}`}
                          href={`/catalog/${item.product.slug}`}
                          className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
                          data-testid={`visual-result-${index}`}
                        >
                          <div className="relative aspect-[3/4] bg-muted">
                            <img
                              src={
                                item.product.primary_image_url ??
                                productImageUrl(
                                  item.product.images?.map((image) => ({
                                    url: image.url ?? image.secure_url ?? '',
                                  })),
                                )
                              }
                              alt={item.product.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute left-2 top-2 rounded-full bg-[#C9A84C] px-2 py-0.5 text-[10px] font-bold text-white">
                              {pct}% match
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 p-3">
                            <div>
                              <p className="text-sm font-medium">Result #{index + 1}</p>
                              <p className="text-xs text-muted-foreground">Catalog match</p>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border bg-card/60 px-6 text-center text-muted-foreground">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                    <Camera className="h-8 w-8" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-foreground">Upload or capture a photo</p>
                  <p className="max-w-sm text-xs">
                    Similar products from this store&apos;s own catalog will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
