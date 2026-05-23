'use client';

import { motion } from "motion/react";
import { BarChart3, Eye, Heart, Package, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import DashboardMetricCard from "@/components/jeweller/DashboardMetricCard";
import JewellerLayout from "@/components/layout/JewellerLayout";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { formatINR } from "@/lib/format";

const IMPRESSIONS = [
  { day: "Mon", views: 420 }, { day: "Tue", views: 680 }, { day: "Wed", views: 540 },
  { day: "Thu", views: 820 }, { day: "Fri", views: 960 }, { day: "Sat", views: 1100 },
  { day: "Sun", views: 780 },
];

const SAVES_DATA = [
  { day: "Mon", saves: 12 }, { day: "Tue", saves: 18 }, { day: "Wed", saves: 15 },
  { day: "Thu", saves: 24 }, { day: "Fri", saves: 31 }, { day: "Sat", saves: 40 },
  { day: "Sun", saves: 27 },
];

// Stable mock numbers derived from id to avoid re-render flicker
const RECENT_PRODUCTS = MOCK_PRODUCTS.slice(0, 5).map((p, i) => ({
  ...p,
  mockViews: [312, 87, 194, 441, 73][i],
  mockSaves: [28, 11, 19, 35, 6][i],
}));

export default function DashboardPage() {
  return (
    <JewellerLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="jeweller-dashboard">
        <h1 className="text-xl md:text-2xl font-medium tracking-tight mb-6">Dashboard</h1>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <DashboardMetricCard label="Total Views" value="5,280" trend="up" trendValue="+18% this week" icon={Eye} accent="default" />
          <DashboardMetricCard label="Saves" value="167" trend="up" trendValue="+12% this week" icon={Heart} accent="amber" />
          <DashboardMetricCard label="Products" value="24" trend="neutral" icon={Package} accent="default" />
          <DashboardMetricCard label="Try-Ons" value="43" trend="up" trendValue="+6% this week" icon={BarChart3} accent="green" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Impressions */}
          <div className="bg-card rounded-2xl border border-card-border p-4 md:p-5" data-testid="chart-impressions">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Impressions This Week</h3>
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={IMPRESSIONS}>
                <defs>
                  <linearGradient id="impressionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={32} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d5", fontSize: 11 }} />
                <Area type="monotone" dataKey="views" stroke="#C9A84C" strokeWidth={2} fill="url(#impressionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Saves */}
          <div className="bg-card rounded-2xl border border-card-border p-4 md:p-5" data-testid="chart-saves">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Saves This Week</h3>
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={SAVES_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d5", fontSize: 11 }} />
                <Line type="monotone" dataKey="saves" stroke="#C9A84C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Products */}
        <div className="bg-card rounded-2xl border border-card-border overflow-hidden" data-testid="table-recent-products">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Products</h3>
          </div>

          {/* ── MOBILE: Stacked rows (< md) ── */}
          <div className="md:hidden divide-y divide-border">
            {RECENT_PRODUCTS.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <img src={p.images[0]?.url} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs line-clamp-1">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{p.category} · {formatINR(p.price)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">Live</span>
                  <span className="text-[10px] text-muted-foreground">{p.mockViews} views</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── DESKTOP: Full table (≥ md) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Product", "Category", "Price", "Views", "Saves", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_PRODUCTS.map((p, i) => (
                  <tr key={p.id} className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/10"}`} data-testid={`row-product-${p.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]?.url} alt={p.name} className="w-9 h-9 rounded-xl object-cover bg-muted" />
                        <span className="font-medium text-xs line-clamp-1 max-w-[140px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-3 text-xs font-medium">{formatINR(p.price)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.mockViews}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.mockSaves}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D]">Live</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </JewellerLayout>
  );
}
