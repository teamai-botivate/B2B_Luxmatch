'use client';

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton";
  message?: string;
  count?: number;
  className?: string;
}

export default function LoadingState({
  variant = "spinner",
  message,
  count = 8,
  className = "",
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`} data-testid="loading-skeleton">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="w-full aspect-[3/4] rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded-full" />
            <Skeleton className="h-3 w-1/2 rounded-full" />
            <Skeleton className="h-4 w-1/3 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-20 gap-4 ${className}`} data-testid="loading-spinner">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
