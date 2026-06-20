'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, GitCompare, Camera, Award, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { Product } from "@/lib/mock-data";
import { productImageUrl } from "@/lib/catalog-adapter";
import { formatINR } from "@/lib/format";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { useCompare } from "@/contexts/CompareContext";
import { useAddToCart } from "@/hooks/use-cart";
import { trackEvent } from "@/lib/analytics";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const { isSaved, toggleSave } = useSavedItems();
  const { isCompared, toggleCompare } = useCompare();
  const addToCart = useAddToCart();
  const saved = isSaved(product.id);
  const compared = isCompared(product.id);

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    const ok = await addToCart(product.id);
    setAdding(false);
    if (ok) {
      setAdded(true);
      trackEvent('cart_add', { productId: product.id });
      setTimeout(() => setAdded(false), 2000);
    } else {
      router.push('/login');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="group relative"
      data-testid={`card-product-${product.id}`}
    >
      {/* Image Container */}
      <Link href={`/catalog/${product.slug}`}>
        <div
          className="relative cursor-pointer overflow-hidden rounded-lg bg-[#ece5da] shadow-[0_1px_0_rgba(25,21,17,0.08)] ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(31,24,15,0.16)]"
          style={{ aspectRatio: "3/4" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <img
            src={productImageUrl(product.images)}
            alt={product.images[0]?.alt ?? product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />

          {/* Gradient Overlay on Hover */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/52 via-black/12 to-transparent opacity-80" />
          <div className={`absolute inset-0 bg-[#1a1208]/15 transition-opacity duration-300 ${hovered ? "opacity-100" : "opacity-0"}`} />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isFeatured && (
              <span className="rounded-full bg-[#1A1510]/[0.82] px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                Trending
              </span>
            )}
          </div>
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {product.hasTryOn && (
              <span className="metal-sheen rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#1a1208] shadow-sm">
                AR
              </span>
            )}
          </div>

          {/* BIS Badge */}
          <div className="absolute bottom-3 right-3">
            <div className="flex items-center gap-1 rounded-full bg-[#f7fff8]/[0.92] px-1.5 py-0.5 backdrop-blur-sm">
              <Award className="w-2.5 h-2.5 text-[#15803D]" />
              <span className="text-[9px] font-semibold text-[#15803D]">BIS</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`absolute inset-x-3 bottom-3 flex gap-2 transition-all duration-300 ${hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            {/* Add to Cart — primary quick action */}
            <button
              onClick={(e) => { void handleAddToCart(e); }}
              disabled={adding}
              className="metal-sheen flex-1 rounded-lg py-2 text-xs font-semibold text-[#1a1208] shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-70"
              aria-label="Add to cart"
              data-testid={`button-cart-${product.id}`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
              {added ? "Added ✓" : adding ? "…" : "Add to Cart"}
              </span>
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(product.id); }}
              className={`flex items-center justify-center rounded-lg p-2 text-xs font-medium backdrop-blur-sm transition-colors ${saved ? "bg-primary/20 text-primary" : "bg-white/90 hover:bg-white"}`}
              aria-label={saved ? "Remove from saved" : "Save item"}
              data-testid={`button-save-${product.id}`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? "fill-[#C9A84C] text-[#C9A84C]" : "text-foreground"}`} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(product.id); }}
              className={`flex items-center justify-center rounded-lg p-2 text-xs font-medium backdrop-blur-sm transition-colors ${compared ? "bg-primary text-primary-foreground" : "bg-white/90 hover:bg-white"}`}
              aria-label="Add to compare"
              data-testid={`button-compare-${product.id}`}
            >
              <GitCompare className="w-3.5 h-3.5" />
            </button>
            {product.hasTryOn && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push("/try-on"); }}
                className="flex items-center justify-center rounded-lg bg-black/[0.72] p-2 backdrop-blur-sm transition-colors hover:bg-black/[0.85]"
                aria-label="Try on"
                data-testid={`button-try-on-${product.id}`}
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Product Info */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/catalog/${product.slug}`}>
            <p className="line-clamp-1 cursor-pointer text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary" data-testid={`text-name-${product.id}`}>
              {product.name}
            </p>
          </Link>
          <button
            onClick={() => toggleSave(product.id)}
            className="flex-shrink-0 mt-0.5"
            aria-label="Toggle save"
          >
            <Heart className={`w-4 h-4 transition-all ${saved ? "fill-[#C9A84C] text-[#C9A84C] scale-110" : "text-muted-foreground hover:text-foreground"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{product.category} · {product.metal} {product.purity}</p>
        <p className="text-[15px] font-semibold text-foreground" data-testid={`text-price-${product.id}`}>
          {formatINR(product.price)}
          {product.originalPrice && (
            <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{formatINR(product.originalPrice)}</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}
