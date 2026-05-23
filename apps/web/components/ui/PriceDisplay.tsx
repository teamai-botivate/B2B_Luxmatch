'use client';

import { formatINR } from "@/lib/format";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function PriceDisplay({ price, originalPrice, className = "", size = "md" }: PriceDisplayProps) {
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`font-semibold text-foreground ${sizeClass}`} data-testid="text-price">
        {formatINR(price)}
      </span>
      {originalPrice && originalPrice > price && (
        <span className="text-sm text-muted-foreground line-through">{formatINR(originalPrice)}</span>
      )}
    </div>
  );
}
