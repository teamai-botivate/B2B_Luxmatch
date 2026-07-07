'use client';

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal, SortAsc } from "lucide-react";

import CustomerLayout from "@/components/layout/CustomerLayout";
import ProductGrid from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@/lib/mock-data";
import {
  adaptManufacturerProduct,
  fetchManufacturerCatalog,
} from "@/lib/catalog-adapter";

interface FilterState {
  categories: string[];
  occasions: string[];
  hasTryOn: boolean;
}

const defaultFilters: FilterState = {
  categories: [],
  occasions: [],
  hasTryOn: false,
};

const OCCASIONS = ["Wedding", "Daily Wear", "Festival", "Anniversary", "Gift"];

function FilterSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FiltersPanel({
  filters,
  onChange,
  categoryNames,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  categoryNames: string[];
}) {
  const toggle = (key: "categories" | "occasions", val: string) => {
    const arr = filters[key];
    onChange({ ...filters, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] });
  };
  const activeCount =
    filters.categories.length + filters.occasions.length +
    (filters.hasTryOn ? 1 : 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-sm font-semibold">Filters</span>
        {activeCount > 0 && (
          <button className="text-xs text-primary hover:underline font-medium" onClick={() => onChange(defaultFilters)} data-testid="button-clear-filters">
            Clear all ({activeCount})
          </button>
        )}
      </div>

      {categoryNames.length > 0 && (
        <FilterSection title="Category">
          <div className="space-y-2.5">
            {categoryNames.map(c => (
              <label key={c} className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox checked={filters.categories.includes(c)} onCheckedChange={() => toggle("categories", c)} data-testid={`checkbox-${c.toLowerCase()}`} />
                <span className="text-sm">{c}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      <div className="border-t border-border" />
      <FilterSection title="Occasion">
        <div className="space-y-2.5">
          {OCCASIONS.map(o => (
            <label key={o} className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={filters.occasions.includes(o)} onCheckedChange={() => toggle("occasions", o)} />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <div className="border-t border-border" />
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium">Virtual Try-On Only</p>
          <p className="text-xs text-muted-foreground">Show AR-enabled items</p>
        </div>
        <Switch checked={filters.hasTryOn} onCheckedChange={v => onChange({ ...filters, hasTryOn: v })} />
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sort, setSort] = useState("relevance");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const rawProducts = await fetchManufacturerCatalog();
      setProducts(rawProducts.map(p => adaptManufacturerProduct(p)));
      setLoading(false);
    }
    void load();
  }, []);

  const categoryNames = useMemo(() => [...new Set(products.map(p => p.category))].sort(), [products]);
  const activeFilterCount = filters.categories.length + filters.occasions.length + (filters.hasTryOn ? 1 : 0);

  const filtered = useMemo(() => {
    let items = products.filter(p => {
      if (filters.categories.length && !filters.categories.includes(p.category)) return false;
      if (filters.occasions.length && !p.occasions.some(o => filters.occasions.includes(o))) return false;
      if (filters.hasTryOn && !p.hasTryOn) return false;
      return true;
    });
    if (sort === "newest") items = [...items].sort((a, b) => b.id.localeCompare(a.id));
    return items;
  }, [products, filters, sort]);

  return (
    <CustomerLayout>
      <div className="min-h-screen" data-testid="catalog-page">
        <div className="border-b border-black/10 bg-[#201812] text-white">
          <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-6 md:py-16 lg:px-12">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4cf8f]">Browse</p>
              <h1 className="font-display text-4xl font-normal tracking-normal md:text-6xl">All jewellery</h1>
              <p className="mt-4 text-sm leading-6 text-white/68">
                Filter by category, occasion, or try-on availability across the full jewellery collection.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-12 py-8">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-lg border-black/15 bg-white/45 lg:hidden" data-testid="button-open-filters">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="text-xs font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{activeFilterCount}</span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
                  <SheetHeader className="pb-2"><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <FiltersPanel filters={filters} onChange={setFilters} categoryNames={categoryNames} />
                </SheetContent>
              </Sheet>
              <span className="text-sm text-muted-foreground" data-testid="text-result-count">
                {loading ? "Loading…" : `${filtered.length} Products`}
              </span>
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44 rounded-lg border-black/15 bg-white/45 text-sm" data-testid="select-sort">
                <SortAsc className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-8 items-start">
            <aside className="hidden w-60 flex-shrink-0 self-start border-r border-black/10 pr-6 lg:sticky lg:top-28 lg:block" data-testid="filters-sidebar">
              <FiltersPanel filters={filters} onChange={setFilters} categoryNames={categoryNames} />
            </aside>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <ProductGrid products={filtered} />
              )}
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
