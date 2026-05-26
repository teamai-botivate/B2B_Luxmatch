"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, PackageCheck, TrendingUp } from "lucide-react";

import JewellerLayout from "@/components/layout/JewellerLayout";

type Recommendation = {
  id: string;
  title: string;
  reason: string;
  nextStep: string;
  priority: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  season?: string;
};

type ProductSignal = {
  productId: string;
  name: string;
  categoryName: string | null;
  metal: string | null;
  stockCount: number;
  sales30: number;
  sales90: number;
  revenue90: number;
  views30: number;
  views90: number;
  tryons30: number;
  tryons90: number;
};

type IntelligencePayload = {
  recommendations: Recommendation[];
  products: ProductSignal[];
};

function priorityIcon(priority: Recommendation["priority"]) {
  if (priority === "high") return AlertTriangle;
  if (priority === "medium") return TrendingUp;
  return CheckCircle2;
}

function priorityLabel(priority: Recommendation["priority"]) {
  if (priority === "high") return "Immediate";
  if (priority === "medium") return "Plan Next";
  return "Monitor";
}

function demandLevel(product: ProductSignal) {
  const score = product.sales90 * 8 + product.tryons90 * 2 + product.views90 * 0.2;
  if (score >= 80) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function stockStatus(product: ProductSignal) {
  if (product.stockCount <= 2 && product.sales30 > 0) return "Low";
  if (product.stockCount >= 8 && product.sales90 === 0) return "Overstock";
  return "Healthy";
}

function plannerAction(product: ProductSignal) {
  const demand = demandLevel(product);
  const stock = stockStatus(product);
  if (demand === "High" && stock === "Low") return "Restock now";
  if (demand === "High") return "Keep visible";
  if (stock === "Overstock") return "Reduce reorder";
  if (product.tryons30 >= 4 && product.sales30 === 0) return "Review price";
  return "Maintain";
}

function inventoryHealth(products: ProductSignal[]) {
  if (products.length === 0) return 0;
  const problemCount = products.filter((product) => {
    const stock = stockStatus(product);
    return stock === "Low" || stock === "Overstock" || plannerAction(product) === "Review price";
  }).length;
  return Math.max(35, Math.round(100 - (problemCount / products.length) * 45));
}

export default function IntelligencePage() {
  const [payload, setPayload] = useState<IntelligencePayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/intelligence/recommendations")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setPayload(json.data as IntelligencePayload);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendations = payload?.recommendations ?? [];
  const products = payload?.products ?? [];
  const health = inventoryHealth(products);
  const lowStockDemand = products.filter((product) => stockStatus(product) === "Low").length;
  const reviewPrice = products.filter((product) => plannerAction(product) === "Review price").length;
  const plannerRows = products
    .slice()
    .sort((a, b) => {
      const actionRank = (action: string) => {
        if (action === "Restock now") return 4;
        if (action === "Review price") return 3;
        if (action === "Keep visible") return 2;
        if (action === "Reduce reorder") return 1;
        return 0;
      };
      return actionRank(plannerAction(b)) - actionRank(plannerAction(a));
    })
    .slice(0, 12);

  return (
    <JewellerLayout>
      <div className="mx-auto max-w-6xl" data-testid="jeweller-intelligence-page">
        <header className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Owner Intelligence</p>
          <h1 className="text-xl md:text-2xl font-medium tracking-tight">Inventory Command Center</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Demand, stock risk, and seasonal readiness summarized into actions the owner can take this week.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">Inventory Health</p>
              <PackageCheck className="w-4 h-4 text-primary" />
            </div>
            <p className="text-3xl font-semibold mt-3">{health}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-xs text-muted-foreground mt-2">Balanced score from demand, stock pressure, and conversion signals.</p>
          </div>
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">Low Stock, Active Demand</p>
            <p className="text-3xl font-semibold mt-3">{lowStockDemand}</p>
            <p className="text-xs text-muted-foreground mt-2">Items that may lose sales if not restocked soon.</p>
          </div>
          <div className="rounded-2xl border border-card-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">Needs Price/Pitch Review</p>
            <p className="text-3xl font-semibold mt-3">{reviewPrice}</p>
            <p className="text-xs text-muted-foreground mt-2">High interest but weak recorded conversion.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {(recommendations.length > 0 ? recommendations : [
            {
              id: "empty",
              title: "No recommendation data yet",
              reason: "Seed dummy history or record sales to unlock owner guidance.",
              nextStep: "Run the seed and rollup scripts against Supabase.",
              priority: "low" as const,
              confidence: "low" as const,
            },
          ]).map((rec) => {
            const Icon = priorityIcon(rec.priority);
            return (
              <div key={rec.id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      rec.priority === "high" ? "bg-red-50 text-red-600" : rec.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                    }`}>
                      {priorityLabel(rec.priority)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{rec.confidence} confidence</span>
                </div>
                <h2 className="text-sm font-semibold mt-3 leading-snug">{rec.title}</h2>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Evidence</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rec.reason}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Action</p>
                    <p className="text-xs font-medium mt-0.5 leading-relaxed">{rec.nextStep}</p>
                  </div>
                </div>
                {rec.season && (
                  <span className="inline-flex mt-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {rec.season}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-card-border bg-card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Restock Planner</h2>
            <p className="text-xs text-muted-foreground mt-1">Sorted by the next best owner action.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Product", "Demand", "Stock", "30d Sales", "30d Try-ons", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plannerRows.map((product) => {
                  const action = plannerAction(product);
                  return (
                    <tr key={product.productId} className="border-t border-border">
                      <td className="px-4 py-3 text-xs font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-xs">{demandLevel(product)}</td>
                      <td className="px-4 py-3 text-xs">{product.stockCount} <span className="text-muted-foreground">({stockStatus(product)})</span></td>
                      <td className="px-4 py-3 text-xs">{product.sales30}</td>
                      <td className="px-4 py-3 text-xs">{product.tryons30}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          action === "Restock now" ? "bg-red-50 text-red-600" : action === "Review price" ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-card-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Product Demand Signals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Product", "Category", "Stock", "Sales 30d", "Sales 90d", "Views 30d", "Try-ons 30d"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 12).map((product) => (
                  <tr key={product.productId} className="border-t border-border">
                    <td className="px-4 py-3 text-xs font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{product.categoryName ?? product.metal ?? "Uncategorized"}</td>
                    <td className="px-4 py-3 text-xs">{product.stockCount}</td>
                    <td className="px-4 py-3 text-xs">{product.sales30}</td>
                    <td className="px-4 py-3 text-xs">{product.sales90}</td>
                    <td className="px-4 py-3 text-xs">{product.views30}</td>
                    <td className="px-4 py-3 text-xs">{product.tryons30}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </JewellerLayout>
  );
}
