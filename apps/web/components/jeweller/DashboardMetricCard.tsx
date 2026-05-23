'use client';

import { TrendingUp, TrendingDown } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: LucideIcon;
  accent?: "default" | "amber" | "green" | "red";
}

const accentColors = {
  default: "text-foreground",
  amber: "text-amber-500",
  green: "text-[#16A34A]",
  red: "text-destructive",
};

export default function DashboardMetricCard({ label, value, trend, trendValue, icon: Icon, accent = "default" }: DashboardMetricCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-card-border p-5 hover:shadow-md transition-shadow" data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-semibold tracking-tight ${accentColors[accent]}`}>{value}</p>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === "up" ? "text-[#16A34A]" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
          {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : trend === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : null}
          {trendValue}
        </div>
      )}
    </div>
  );
}
