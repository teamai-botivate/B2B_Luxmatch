'use client';

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Plus, Search, RefreshCw, Edit, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import JewellerLayout from "@/components/layout/JewellerLayout";
import ProductTableRow from "@/components/product/ProductTableRow";
import { MOCK_PRODUCTS, Product } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ product, index }: { product: Product; index: number }) {
  const hasImage = product.images.length > 0;
  const isNotIndexed = index % 3 === 2;
  if (!hasImage) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Missing Image</span>;
  if (isNotIndexed) return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Not Indexed</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">Live</span>;
}

export default function JewellerProductsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const { toast } = useToast();

  const products = MOCK_PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleEdit = (p: Product) => router.push(`/jeweller/products/${p.id}`);
  const handleDelete = (p: Product) => setDeleteTarget(p);
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    toast({ title: "Product deleted successfully", description: `${deleteTarget.name} has been removed.`, variant: "destructive" });
    setDeleteTarget(null);
  };
  const handleReindex = (p: Product) => {
    toast({ title: "Product queued for reindex", description: `${p.name} will appear in search results shortly.` });
  };

  return (
    <JewellerLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="jeweller-products-page">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <h1 className="text-xl md:text-2xl font-medium tracking-tight">Products</h1>
          <Button
            className="rounded-full bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 text-sm px-4"
            onClick={() => router.push("/jeweller/products/new")}
            data-testid="button-add-product"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9 rounded-xl"
            value={query}
            onChange={e => setQuery(e.target.value)}
            data-testid="input-search-products"
          />
        </div>

        {/* ── MOBILE: Card list (< md) ── */}
        <div className="md:hidden space-y-3" data-testid="jeweller-products-cards">
          {products.map((p, i) => (
            <div key={p.id} className="bg-card border border-card-border rounded-2xl p-3 flex items-center gap-3">
              {/* Thumbnail */}
              {p.images[0] ? (
                <img src={p.images[0].url} alt={p.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-muted" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{p.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">{p.category}</span>
                  {p.hasTryOn && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Camera className="w-2.5 h-2.5" /> AR
                    </span>
                  )}
                  <StatusBadge product={p} index={i} />
                </div>
                <p className="text-xs font-semibold mt-1">{formatINR(p.price)}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  className="p-2 rounded-xl bg-accent hover:bg-primary/10 transition-colors"
                  onClick={() => handleEdit(p)}
                  aria-label="Edit"
                  data-testid={`button-edit-${p.id}`}
                >
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="p-2 rounded-xl bg-accent hover:bg-destructive/10 transition-colors"
                  onClick={() => handleDelete(p)}
                  aria-label="Delete"
                  data-testid={`button-delete-mobile-${p.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}

          {products.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No products match your search.</div>
          )}
        </div>

        {/* ── DESKTOP: Table (≥ md) ── */}
        <div className="hidden md:block bg-card rounded-2xl border border-card-border overflow-hidden" data-testid="jeweller-products-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  {["Product", "Category", "Metal", "Price", "AR Try-On", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <ProductTableRow
                    key={p.id}
                    product={p}
                    index={i}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReindex={handleReindex}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {products.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">No products match your search.</div>
          )}
        </div>

        {/* Summary */}
        {products.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground px-1">
            <span>{products.length} product{products.length !== 1 ? "s" : ""}</span>
            <button
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              onClick={() => toast({ title: "All products queued for reindex" })}
            >
              <RefreshCw className="w-3 h-3" /> Reindex all
            </button>
          </div>
        )}
      </motion.div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </JewellerLayout>
  );
}
