'use client';

import { useState } from "react";
import Link from "next/link";
import { X, RotateCcw, Camera, ExternalLink, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ARViewport from "@/components/ar/ARViewport";
import TryOnProductPicker from "@/components/ar/TryOnProductPicker";
import { getTryOnProducts, Product } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";
import { useSavedItems } from "@/contexts/SavedItemsContext";

const STATES = ["loading", "permission", "denied", "ready", "selected"] as const;
type DemoState = typeof STATES[number];

export default function TryOnPage() {
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [selected, setSelected] = useState<Product | undefined>();
  const tryOnProducts = getTryOnProducts();
  const { toggleSave, isSaved } = useSavedItems();

  const handleSelect = (p: Product) => {
    setSelected(p);
    setDemoState("selected");
  };

  const handleReset = () => {
    setDemoState("ready");
    setSelected(undefined);
  };

  return (
    <div className="fixed inset-0 bg-[#0f0f1a] flex flex-col overflow-hidden" data-testid="try-on-page">
      {/* Top Controls */}
      <div className="flex items-center justify-between px-4 py-3 z-20 flex-shrink-0">
        <Link href="/">
          <button
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close try-on"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </Link>

        {/* Demo state toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {STATES.map(s => (
            <button
              key={s}
              onClick={() => { setDemoState(s); if (s !== "selected") setSelected(undefined); }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                demoState === s
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          onClick={handleReset}
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* AR Viewport */}
      <div className="flex-1 px-4 pb-2 min-h-0">
        {demoState === "loading" && (
          <div className="w-full h-full rounded-2xl bg-[#1a1a2e] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Initialising AR engine…</p>
          </div>
        )}

        {demoState === "permission" && (
          <div className="w-full h-full rounded-2xl bg-[#1a1a2e] flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-[#C9A84C]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Grant Camera Access</h2>
              <p className="text-sm text-white/50">Allow camera access to try on jewellery virtually in real time.</p>
            </div>
            <button
              className="px-6 py-2.5 rounded-full font-semibold text-sm text-black"
              style={{ background: "#C9A84C" }}
              onClick={() => setDemoState("ready")}
            >
              Allow Camera
            </button>
          </div>
        )}

        {demoState === "denied" && (
          <div className="w-full h-full rounded-2xl bg-[#1a1a2e] flex flex-col items-center justify-center gap-5 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Camera Access Denied</h2>
              <p className="text-sm text-white/50">Please enable camera access in your browser settings and reload.</p>
            </div>
            <Link href="/help">
              <span className="text-sm text-[#C9A84C] underline cursor-pointer">View Help Guide</span>
            </Link>
          </div>
        )}

        {(demoState === "ready" || demoState === "selected") && (
          <ARViewport className="w-full h-full" />
        )}
      </div>

      {/* Selected product info bar */}
      <AnimatePresence>
        {demoState === "selected" && selected && (
          <motion.div
            key="product-bar"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="mx-4 mb-2 flex items-center justify-between bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 z-20 flex-shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={selected.images[0]?.url}
                alt={selected.name}
                className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-1 ring-[#C9A84C]/40"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{selected.name}</p>
                <p className="text-xs text-white/50">{selected.metal} · {selected.purity}</p>
                <p className="text-sm font-bold text-[#C9A84C]">{formatINR(selected.price)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <button
                onClick={() => toggleSave(selected.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isSaved(selected.id) ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                }`}
                aria-label="Save"
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved(selected.id) ? "fill-current" : ""}`} />
              </button>
              <Link href={`/catalog/${selected.slug}`}>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#C9A84C] bg-[#C9A84C]/15 hover:bg-[#C9A84C]/25 transition-colors px-3 py-1.5 rounded-full cursor-pointer whitespace-nowrap">
                  View Details
                  <ExternalLink className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Picker */}
      <div className="px-4 pb-5 pt-1 flex-shrink-0 z-20">
        {tryOnProducts.length > 0 ? (
          <TryOnProductPicker
            products={tryOnProducts}
            selectedId={selected?.id}
            onSelect={handleSelect}
          />
        ) : (
          <p className="text-center text-xs text-white/30 py-4">No AR-ready products available</p>
        )}
      </div>
    </div>
  );
}
