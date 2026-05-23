'use client';

import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSavedItems } from "@/contexts/SavedItemsContext";

interface SavedButtonProps {
  productId: string;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  variant?: "default" | "glass";
  className?: string;
}

const sizeMap = { sm: 28, md: 36, lg: 44 };
const iconMap = { sm: 14, md: 16, lg: 20 };

export default function SavedButton({
  productId,
  size = "md",
  showCount = false,
  variant = "default",
  className = "",
}: SavedButtonProps) {
  const { toggleSave, isSaved, savedItems } = useSavedItems();
  const saved = isSaved(productId);
  const dim = sizeMap[size];
  const iconDim = iconMap[size];

  const bg = variant === "glass"
    ? saved ? "bg-white/20 backdrop-blur-md" : "bg-white/10 backdrop-blur-md hover:bg-white/20"
    : saved ? "bg-red-50 hover:bg-red-100" : "bg-muted hover:bg-accent";

  return (
    <div className="relative inline-flex">
      <motion.button
        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSave(productId); }}
        whileTap={{ scale: 0.9 }}
        className={`rounded-full flex items-center justify-center transition-colors ${bg} ${className}`}
        style={{ width: dim, height: dim }}
        aria-label={saved ? "Remove from saved" : "Save item"}
        data-testid={`saved-btn-${productId}`}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={saved ? "filled" : "outline"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Heart
              style={{ width: iconDim, height: iconDim }}
              className={saved
                ? "fill-red-500 text-red-500"
                : variant === "glass" ? "text-white" : "text-muted-foreground"}
            />
          </motion.span>
        </AnimatePresence>
      </motion.button>
      {showCount && savedItems.size > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-primary text-primary-foreground rounded-full px-1 pointer-events-none">
          {savedItems.size}
        </span>
      )}
    </div>
  );
}
