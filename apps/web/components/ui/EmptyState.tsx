'use client';

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
      <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-xs mb-6">{description}</p>}
      {action && (
        <Button
          className="rounded-full bg-primary text-primary-foreground hover:opacity-90"
          onClick={action.onClick}
          data-testid="button-empty-action"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
