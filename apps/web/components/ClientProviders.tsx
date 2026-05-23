'use client';

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SavedItemsProvider } from '@/contexts/SavedItemsContext';
import { CompareProvider } from '@/contexts/CompareContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import CompareTray from '@/components/ui/CompareTray';

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SavedItemsProvider>
        <CompareProvider>
          <TooltipProvider>
            {children}
            <CompareTray />
            <Toaster />
          </TooltipProvider>
        </CompareProvider>
      </SavedItemsProvider>
    </QueryClientProvider>
  );
}
