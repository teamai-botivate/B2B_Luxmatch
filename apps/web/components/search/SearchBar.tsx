'use client';

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MOCK_PRODUCTS, POPULAR_SEARCHES } from "@/lib/mock-data";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
  className?: string;
}

export default function SearchBar({ onSearch, autoFocus, className = "" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 1) { setSuggestions([]); return; }
    timerRef.current = setTimeout(() => {
      const q = query.toLowerCase();
      const names = MOCK_PRODUCTS
        .filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
        .slice(0, 6)
        .map(p => p.name);
      const pops = POPULAR_SEARCHES.filter(s => s.toLowerCase().includes(q)).slice(0, 2);
      setSuggestions([...new Set([...names, ...pops])].slice(0, 8));
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSubmit = (q: string = query) => {
    if (!q.trim()) return;
    setFocused(false);
    if (onSearch) onSearch(q);
    else router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={`relative ${className}`} data-testid="search-bar">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${focused ? "border-primary ring-2 ring-primary/20 bg-white" : "border-border bg-muted/40 hover:bg-white hover:border-border"}`}>
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          ref={ref}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Search jewellery..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          data-testid="input-search"
          aria-label="Search jewellery"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
        <span className="hidden lg:block text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono">⌘K</span>
      </div>

      <AnimatePresence>
        {focused && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-border shadow-lg z-50 overflow-hidden"
            data-testid="search-suggestions"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => handleSubmit(s)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors text-left"
                data-testid={`suggestion-${i}`}
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
