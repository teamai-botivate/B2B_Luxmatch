'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, GitCompare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import TrustBadge from "@/components/ui/TrustBadge";
import PriceDisplay from "@/components/ui/PriceDisplay";
import { Product, MOCK_JEWELLERS } from "@/lib/mock-data";
import { useSavedItems } from "@/contexts/SavedItemsContext";
import { useCompare } from "@/contexts/CompareContext";

interface ProductDetailPanelProps {
  product: Product;
}

export default function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const router = useRouter();
  const { isSaved, toggleSave } = useSavedItems();
  const { isCompared, toggleCompare } = useCompare();
  const saved = isSaved(product.id);
  const compared = isCompared(product.id);
  const jeweller = MOCK_JEWELLERS.find(j => j.id === product.jewellerId);

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
        {jeweller && (
          <Link href={`/store/${jeweller.slug}`}>
            <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              by {jeweller.storeName}
            </span>
          </Link>
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
        <TrustBadge variant="Easy Returns" />
        {product.hasTryOn && <TrustBadge variant="Insured Delivery" />}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {product.hasTryOn && (
          <Button
            className="flex-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all hover:scale-[1.02] flex items-center gap-2"
            onClick={() => router.push("/try-on")}
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
          className={`${product.hasTryOn ? "" : "flex-1"} rounded-full flex items-center gap-2 border-border hover:border-primary/50 hover:bg-accent`}
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
