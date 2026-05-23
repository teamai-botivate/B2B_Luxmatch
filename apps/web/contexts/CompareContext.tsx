'use client';

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface CompareContextType {
  compareItems: Set<string>;
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  isCompared: (productId: string) => boolean;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | null>(null);

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem("luxematch_compare");
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareItems, setCompareItems] = useState<Set<string>>(loadFromStorage);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem("luxematch_compare", JSON.stringify([...compareItems]));
  }, [compareItems]);

  const toggleCompare = useCallback((productId: string) => {
    setCompareItems(prev => {
      if (prev.has(productId)) {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      }
      if (prev.size >= 4) {
        toast({ title: "Maximum 4 items for comparison", variant: "destructive" });
        return prev;
      }
      return new Set([...prev, productId]);
    });
  }, [toast]);

  const clearCompare = useCallback(() => setCompareItems(new Set()), []);
  const isCompared = useCallback((id: string) => compareItems.has(id), [compareItems]);
  const canAddMore = compareItems.size < 4;

  return (
    <CompareContext.Provider value={{ compareItems, toggleCompare, clearCompare, isCompared, canAddMore }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare(): CompareContextType {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
