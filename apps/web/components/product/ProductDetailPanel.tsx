'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, GitCompare, Sparkles, ShoppingBag, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import TrustBadge from "@/components/ui/TrustBadge";
import PriceDisplay from "@/components/ui/PriceDisplay";
import { Product } from "@/lib/mock-data";
import { useShop } from "@/hooks/use-shop";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { useCompare } from "@/contexts/CompareContext";
import { useGuestCart } from "@/hooks/use-guest-cart";
import { trackEvent } from "@/lib/analytics";

interface ProductDetailPanelProps {
  product: Product;
}

export default function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSaved, toggleSave } = useSavedItems();
  const { isCompared, toggleCompare } = useCompare();
  const guestCart = useGuestCart();
  const shop = useShop();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const saved = isSaved(product.id);
  const compared = isCompared(product.id);

  // Log a product view once per mount. The /catalog/[slug] page is the only
  // place this panel renders, so this is the canonical view signal.
  useEffect(() => {
    trackEvent('product_view', { productId: product.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function handleAddToCart() {
    setAdding(true);
    guestCart.add({
      productId: product.id,
      name: product.name,
      designNumber: null,
      imageUrl: product.images?.[0]?.url ?? null,
      category: product.category ?? null,
    });
    setAdding(false);
    setAdded(true);
    trackEvent('cart_add', { productId: product.id });
    setTimeout(() => setAdded(false), 2000);
  }

  const specs = [
    { label: "Metal", value: product.metal },
    { label: "Purity", value: product.purity },
    { label: "Weight", value: product.weight },
    ...(product.gemstones ? [{ label: "Gemstones", value: product.gemstones }] : []),
    { label: "Category", value: product.category },
  ];

  return (
    <div className="flex flex-col gap-5" data-testid="product-detail-panel">
      {/* Category + Jeweller */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{product.category}</span>
        {shop && (
          <span className="text-xs text-muted-foreground">
            by {shop.store_name}
          </span>
        )}
      </div>

      {/* Name */}
      <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-foreground leading-tight" data-testid="text-product-name">
        {product.name}
      </h1>

      {/* Price */}
      <PriceDisplay price={product.price} originalPrice={product.originalPrice} size="lg" />

      {/* Trust Badges */}
      <div className="flex flex-wrap gap-2">
        <TrustBadge variant="BIS Hallmarked" />
        <TrustBadge variant="Certified" />
        <TrustBadge variant="Staff Assisted" />
        {product.hasTryOn && <TrustBadge variant="Virtual Try-On" />}
      </div>

      {/* Primary CTAs */}
      <div className="flex gap-3">
        <Button
          className="flex-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all hover:scale-[1.02] flex items-center gap-2"
          onClick={() => handleAddToCart()}
          disabled={adding}
          data-testid="button-add-to-cart"
        >
          <ShoppingBag className="w-4 h-4" />
          {added ? "Added ✓" : adding ? "Adding…" : "Add to Cart"}
        </Button>
        <Button
          className="flex-1 rounded-full border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-all flex items-center gap-2"
          onClick={() => { handleAddToCart(); router.push('/kiosk-checkout'); }}
          disabled={adding}
          data-testid="button-buy-now"
        >
          <Zap className="w-4 h-4" />
          Buy Now
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-3">
        {product.hasTryOn && (
          <Button
            variant="outline"
            className="flex-1 rounded-full flex items-center gap-2 border-border hover:border-primary/50 hover:bg-accent"
            onClick={() => router.push(`/try-on?product=${product.id}&back=${encodeURIComponent(pathname)}`)}
            data-testid="button-try-on-detail"
          >
            <Sparkles className="w-4 h-4" />
            Try On
          </Button>
        )}
        <Button
          variant="outline"
          className={`${product.hasTryOn ? "" : "flex-1"} rounded-full flex items-center gap-2 border-border hover:border-primary/50 hover:bg-accent`}
          onClick={() => toggleSave(product.id)}
          data-testid="button-save-detail"
        >
          <Heart className={`w-4 h-4 ${saved ? "fill-primary text-primary" : ""}`} />
          {saved ? "Saved" : "Save"}
        </Button>
        <Button
          variant="outline"
          className="rounded-full flex items-center gap-2 border-border hover:border-primary/50 hover:bg-accent"
          onClick={() => toggleCompare(product.id)}
          data-testid="button-compare-detail"
        >
          <GitCompare className={`w-4 h-4 ${compared ? "text-primary" : ""}`} />
          Compare
        </Button>
      </div>

      {/* Specs */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {specs.map(({ label, value }, i) => (
              <tr key={label} className={i % 2 === 0 ? "bg-background" : "bg-muted/40"}>
                <td className="px-4 py-2.5 text-muted-foreground font-medium w-28">{label}</td>
                <td className="px-4 py-2.5 text-foreground font-medium">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Description */}
      <div>
        <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
      </div>

      {/* Occasions */}
      {product.occasions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {product.occasions.map(o => (
            <Link key={o} href={`/occasions/${o.toLowerCase().replace(" ", "-")}`}>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-accent text-accent-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                {o}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
