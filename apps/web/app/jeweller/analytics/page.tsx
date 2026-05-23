'use client';

import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import JewellerLayout from "@/components/layout/JewellerLayout";
import DashboardMetricCard from "@/components/jeweller/DashboardMetricCard";
import { Eye, Heart, Search, BarChart3 } from "lucide-react";

const MONTHLY_VIEWS = [
  { month: "Nov", views: 1200, saves: 45 }, { month: "Dec", views: 1800, saves: 72 },
  { month: "Jan", views: 2400, saves: 98 }, { month: "Feb", views: 2100, saves: 85 },
  { month: "Mar", views: 3200, saves: 130 }, { month: "Apr", views: 2900, saves: 112 },
  { month: "May", views: 3800, saves: 160 },
];

const CATEGORY_DATA = [
  { name: "Necklace", value: 35 }, { name: "Earrings", value: 28 },
  { name: "Ring", value: 20 }, { name: "Bangle", value: 10 },
  { name: "Pendant", value: 7 },
];

const OCCASION_DATA = [
  { occasion: "Wedding", views: 1400 }, { occasion: "Festival", views: 980 },
  { occasion: "Daily Wear", views: 750 }, { occasion: "Anniversary", views: 520 },
  { occasion: "Gift", views: 310 },
];

const GOLD_SHADES = ["#C9A84C", "#D4B56A", "#DFC288", "#EAD0A6", "#F4DEC4"];

export default function AnalyticsPage() {
  return (
    <JewellerLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} data-testid="jeweller-analytics-page">
        <h1 className="text-2xl font-medium tracking-tight mb-6">Analytics</h1>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <DashboardMetricCard label="Total Views" value="17,400" trend="up" trendValue="+23% vs last month" icon={Eye} />
          <DashboardMetricCard label="Saves" value="702" trend="up" trendValue="+18% vs last month" icon={Heart} accent="amber" />
          <DashboardMetricCard label="Search Impressions" value="4,200" trend="up" trendValue="+31%" icon={Search} accent="green" />
          <DashboardMetricCard label="Try-On Sessions" value="183" trend="up" trendValue="+9%" icon={BarChart3} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly Trend */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-card-border p-5" data-testid="chart-monthly">
            <h3 className="text-sm font-semibold mb-4">Views & Saves — Last 7 Months</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MONTHLY_VIEWS}>
                <defs>
                  <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d5", fontSize: 12 }} />
                <Area type="monotone" dataKey="views" stroke="#C9A84C" strokeWidth={2} fill="url(#viewsGrad)" name="Views" />
                <Area type="monotone" dataKey="saves" stroke="#D4B56A" strokeWidth={2} fill="none" name="Saves" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown */}
          <div className="bg-card rounded-2xl border border-card-border p-5" data-testid="chart-category">
            <h3 className="text-sm font-semibold mb-4">Views by Category</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {CATEGORY_DATA.map((_, i) => <Cell key={i} fill={GOLD_SHADES[i % GOLD_SHADES.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d5", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occasion Breakdown */}
        <div className="bg-card rounded-2xl border border-card-border p-5" data-testid="chart-occasion">
          <h3 className="text-sm font-semibold mb-4">Views by Occasion</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={OCCASION_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="occasion" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d5", fontSize: 12 }} />
              <Bar dataKey="views" fill="#C9A84C" radius={[0, 6, 6, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </JewellerLayout>
  );
}
