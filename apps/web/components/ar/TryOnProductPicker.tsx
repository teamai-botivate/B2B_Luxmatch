'use client';

import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, Camera, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";

interface TryOnProductPickerProps {
  products: Product[];
  selectedId?: string;
  onSelect: (product: Product) => void;
}

const ALL_LABEL = "All";

function getCategoryOrder(cat: string) {
  const order = ["Necklace", "Choker", "Earrings", "Ring", "Bangle", "Pendant"];
  const i = order.indexOf(cat);
  return i >= 0 ? i : 99;
}

export default function TryOnProductPicker({ products, selectedId, onSelect }: TryOnProductPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState(ALL_LABEL);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = [ALL_LABEL, ...Array.from(new Set(products.map(p => p.category))).sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b))];

  const filtered = products.filter(p => {
    const matchCat = activeCategory === ALL_LABEL || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  useEffect(() => {
    if (expanded && scrollRef.current && selectedId) {
      const el = scrollRef.current.querySelector(`[data-id="${selectedId}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest", inline: "center" });
    }
  }, [expanded, selectedId]);

  return (
    <div className="w-full" data-testid="try-on-product-picker">
      {/* Collapsed strip */}
      <AnimatePresence initial={false}>
        {!expanded && (
          <motion.div
            key="strip"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  AR-Ready
                </span>
                <span className="text-[10px] font-bold bg-[#C9A84C]/20 text-[#C9A84C] rounded-full px-2 py-0.5">
                  {products.length} items
                </span>
              </div>
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70 hover:text-white transition-colors"
              >
                Browse all
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category pills row */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-[#C9A84C] text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {cat}
                  {cat !== ALL_LABEL && (
                    <span className="ml-1 opacity-60">
                      ({products.filter(p => p.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Horizontal scroll strip */}
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 snap-x no-scrollbar">
              {filtered.map(p => {
                const isSelected = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    data-id={p.id}
                    onClick={() => onSelect(p)}
                    className={`flex-shrink-0 snap-start flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                      isSelected
                        ? "ring-2 ring-[#C9A84C] bg-[#C9A84C]/10"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                    style={{ width: 80 }}
                    data-testid={`try-on-pick-${p.id}`}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a2e]">
                      <img src={p.images[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#C9A84C]/30 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-[#C9A84C]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-medium text-white/80 text-center line-clamp-2 leading-tight w-full">{p.name}</p>
                    <span className="text-[8px] font-semibold text-[#C9A84C]/80">{p.category}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-white/30 text-xs py-4 px-2">No items in this category</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded full panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[#111118] rounded-t-3xl border-t border-white/10 shadow-2xl"
            style={{ maxHeight: "70vh" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">AR-Ready Jewellery</h3>
                <p className="text-xs text-white/40 mt-0.5">{products.length} pieces available for virtual try-on</p>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-5 pb-3">
              <div className="flex items-center gap-2 bg-white/8 rounded-xl px-3 py-2 border border-white/10">
                <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search jewellery..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent text-xs text-white placeholder-white/30 outline-none flex-1"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                  </button>
                )}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                    activeCategory === cat
                      ? "bg-[#C9A84C] text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {cat}
                  {cat !== ALL_LABEL && (
                    <span className="ml-1 opacity-60">
                      ({products.filter(p => p.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/8 mx-5" />

            {/* Grid */}
            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(70vh - 200px)" }}>
              {filtered.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filtered.map(p => {
                    const isSelected = p.id === selectedId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => { onSelect(p); setExpanded(false); }}
                        className={`flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all text-left ${
                          isSelected
                            ? "ring-2 ring-[#C9A84C] bg-[#C9A84C]/10"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                        data-testid={`try-on-grid-${p.id}`}
                      >
                        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1a1a2e]">
                          <img src={p.images[0]?.url} alt={p.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#C9A84C]/30 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-[#C9A84C]" />
                            </div>
                          )}
                          <span className="absolute top-1.5 left-1.5 text-[8px] font-bold bg-[#C9A84C]/90 text-black rounded-full px-1.5 py-0.5">
                            AR
                          </span>
                        </div>
                        <div className="w-full">
                          <p className="text-[10px] font-medium text-white/90 line-clamp-2 leading-tight">{p.name}</p>
                          <p className="text-[10px] font-semibold text-[#C9A84C] mt-0.5">{formatINR(p.price)}</p>
                          <span className="text-[9px] text-white/40">{p.category}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Search className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-white/30 text-sm">No items match your search</p>
                  <button onClick={() => { setSearch(""); setActiveCategory(ALL_LABEL); }} className="text-xs text-[#C9A84C] underline">
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setExpanded(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
