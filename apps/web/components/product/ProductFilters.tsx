'use client';

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { formatINR } from "@/lib/format";

export interface FilterState {
  categories: string[];
  metals: string[];
  priceRange: [number, number];
  occasions: string[];
  hasTryOn: boolean;
}

const defaultFilters: FilterState = {
  categories: [],
  metals: [],
  priceRange: [0, 500000],
  occasions: [],
  hasTryOn: false,
};

const CATEGORIES = ["Necklace", "Earrings", "Ring", "Bangle", "Pendant", "Choker"];
const METALS = ["Gold", "White Gold", "Rose Gold", "Silver", "Platinum"];
const OCCASIONS = ["Wedding", "Daily Wear", "Festival", "Anniversary", "Gift"];

interface ProductFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function FiltersBody({ filters, onChange }: ProductFiltersProps) {
  const toggle = (key: "categories" | "metals" | "occasions", val: string) => {
    const arr = filters[key];
    onChange({
      ...filters,
      [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val],
    });
  };

  const activeCount =
    filters.categories.length + filters.metals.length + filters.occasions.length +
    (filters.hasTryOn ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 500000 ? 1 : 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <span className="text-sm font-semibold">Filters</span>
        {activeCount > 0 && (
          <button
            className="text-xs text-primary hover:underline font-medium"
            onClick={() => onChange(defaultFilters)}
            data-testid="button-clear-filters"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <FilterSection title="Category">
        <div className="space-y-2">
          {CATEGORIES.map(c => (
            <label key={c} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={filters.categories.includes(c)}
                onCheckedChange={() => toggle("categories", c)}
                data-testid={`checkbox-category-${c.toLowerCase()}`}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{c}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <div className="border-t border-border" />

      <FilterSection title="Metal">
        <div className="space-y-2">
          {METALS.map(m => (
            <label key={m} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={filters.metals.includes(m)}
                onCheckedChange={() => toggle("metals", m)}
                data-testid={`checkbox-metal-${m.toLowerCase().replace(" ", "-")}`}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{m}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <div className="border-t border-border" />

      <FilterSection title="Price Range">
        <div className="space-y-3 px-1">
          <Slider
            min={0}
            max={500000}
            step={5000}
            value={filters.priceRange}
            onValueChange={(v) => onChange({ ...filters, priceRange: v as [number, number] })}
            className="w-full"
            data-testid="slider-price"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatINR(filters.priceRange[0])}</span>
            <span>{formatINR(filters.priceRange[1])}</span>
          </div>
        </div>
      </FilterSection>

      <div className="border-t border-border" />

      <FilterSection title="Occasion">
        <div className="space-y-2">
          {OCCASIONS.map(o => (
            <label key={o} className="flex items-center gap-2.5 cursor-pointer group">
              <Checkbox
                checked={filters.occasions.includes(o)}
                onCheckedChange={() => toggle("occasions", o)}
                data-testid={`checkbox-occasion-${o.toLowerCase().replace(" ", "-")}`}
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">{o}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <div className="border-t border-border" />

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium">Virtual Try-On</p>
          <p className="text-xs text-muted-foreground">Only AR-enabled items</p>
        </div>
        <Switch
          checked={filters.hasTryOn}
          onCheckedChange={(v) => onChange({ ...filters, hasTryOn: v })}
          data-testid="switch-try-on"
        />
      </div>
    </div>
  );
}

export default function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  const activeCount =
    filters.categories.length + filters.metals.length + filters.occasions.length +
    (filters.hasTryOn ? 1 : 0);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-24 self-start" data-testid="product-filters-desktop">
        <FiltersBody filters={filters} onChange={onChange} />
      </aside>

      {/* Mobile Sheet Trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden flex items-center gap-2 rounded-xl" data-testid="button-open-filters">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-1 text-xs font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto" data-testid="product-filters-mobile">
          <SheetHeader className="pb-2">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FiltersBody filters={filters} onChange={onChange} />
        </SheetContent>
      </Sheet>
    </>
  );
}
