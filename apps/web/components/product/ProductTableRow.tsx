'use client';

import { Edit, Trash2, Camera, RefreshCw } from "lucide-react";
import { Product } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";

interface ProductTableRowProps {
  product: Product;
  index: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onReindex?: (product: Product) => void;
}

export default function ProductTableRow({ product: p, index, onEdit, onDelete, onReindex }: ProductTableRowProps) {
  const hasImage = p.images.length > 0;
  const isNotIndexed = index % 3 === 2;

  return (
    <tr
      className={`border-t border-border hover:bg-muted/20 transition-colors ${index % 2 !== 0 ? "bg-muted/5" : ""}`}
      data-testid={`product-row-${p.id}`}
    >
      {/* Product */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {hasImage ? (
            <img src={p.images[0]?.url} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-muted flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
          )}
          <div>
            <p className="font-medium text-xs line-clamp-1 max-w-[150px]">{p.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{p.purity} · {p.weight ?? "—"}</p>
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="px-4 py-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{p.category}</span>
      </td>

      {/* Metal */}
      <td className="px-4 py-3 text-xs text-muted-foreground">{p.metal}</td>

      {/* Price */}
      <td className="px-4 py-3 text-xs font-semibold">{formatINR(p.price)}</td>

      {/* AR */}
      <td className="px-4 py-3">
        {p.hasTryOn ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Camera className="w-2.5 h-2.5" /> AR Ready
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {!hasImage ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Missing Image</span>
          ) : isNotIndexed ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Not Indexed</span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">Live</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            onClick={() => onEdit(p)}
            aria-label="Edit product"
            data-testid={`button-edit-${p.id}`}
          >
            <Edit className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {onReindex && (
            <button
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              onClick={() => onReindex(p)}
              aria-label="Reindex product"
              data-testid={`button-reindex-${p.id}`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            onClick={() => onDelete(p)}
            aria-label="Delete product"
            data-testid={`button-delete-${p.id}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" />
          </button>
        </div>
      </td>
    </tr>
  );
}
