"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatNaira } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  Truck,
  RefreshCw,
  Download,
  Calendar,
  Package,
  Star,
  CheckCircle2,
  ArrowUpRight,
  Tag,
  Repeat2,
  Clock,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "custom";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom range",
};

interface MetricCard {
  label: string;
  value: string;
  subtext: string;
  trend: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

interface TopSeller {
  rank: number;
  businessName: string;
  gmv: number;
  orders: number;
  rating: number;
}

interface TopCategory {
  rank: number;
  name: string;
  orders: number;
  gmv: number;
  share: number;
}

const METRICS_30D: MetricCard[] = [
  {
    label: "Avg Order Value",
    value: formatNaira(14_280),
    subtext: "Per completed order",
    trend: 5.2,
    icon: <ShoppingBag className="h-5 w-5" />,
    iconBg: "bg-royal/10",
    iconColor: "text-royal",
  },
  {
    label: "Repeat Buyer Rate",
    value: "38.4%",
    subtext: "Buyers with 2+ orders",
    trend: 2.1,
    icon: <Repeat2 className="h-5 w-5" />,
    iconBg: "bg-emerald/10",
    iconColor: "text-emerald",
  },
  {
    label: "Seller Approval Rate",
    value: "72.1%",
    subtext: "Of submitted applications",
    trend: -3.5,
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconBg: "bg-violet/10",
    iconColor: "text-violet",
  },
  {
    label: "On-Time Delivery",
    value: "91.3%",
    subtext: "Delivered within SLA",
    trend: 1.8,
    icon: <Truck className="h-5 w-5" />,
    iconBg: "bg-gold/20",
    iconColor: "text-amber-700",
  },
  {
    label: "Dispute Rate",
    value: "2.3%",
    subtext: "Of completed orders",
    trend: -0.4,
    icon: <RefreshCw className="h-5 w-5" />,
    iconBg: "bg-error/10",
    iconColor: "text-error",
  },
  {
    label: "Platform Commission",
    value: formatNaira(1_860_000),
    subtext: "Total earned",
    trend: 9.7,
    icon: <TrendingUp className="h-5 w-5" />,
    iconBg: "bg-midnight/5",
    iconColor: "text-midnight",
  },
];

const TOP_SELLERS: TopSeller[] = [
  { rank: 1, businessName: "Chukwu Electronics", gmv: 4_560_000, orders: 214, rating: 4.6 },
  { rank: 2, businessName: "Lagos Fabrics Hub", gmv: 2_100_000, orders: 148, rating: 4.4 },
  { rank: 3, businessName: "Adaeze Crafts", gmv: 1_280_000, orders: 96, rating: 4.8 },
  { rank: 4, businessName: "Kano Leather Works", gmv: 980_000, orders: 67, rating: 4.3 },
  { rank: 5, businessName: "Abuja Pottery Co.", gmv: 540_000, orders: 41, rating: 4.7 },
];

const TOP_CATEGORIES: TopCategory[] = [
  { rank: 1, name: "Electronics", orders: 320, gmv: 5_800_000, share: 31.5 },
  { rank: 2, name: "Fashion & Apparel", orders: 280, gmv: 3_200_000, share: 17.4 },
  { rank: 3, name: "Home & Kitchen", orders: 210, gmv: 2_500_000, share: 13.6 },
  { rank: 4, name: "Arts & Crafts", orders: 180, gmv: 1_800_000, share: 9.8 },
  { rank: 5, name: "Health & Beauty", orders: 150, gmv: 1_200_000, share: 6.5 },
];

// Fake sparkline data for GMV chart bars (relative heights)
const GMV_BARS = [40, 55, 48, 62, 58, 70, 65, 80, 72, 88, 82, 95, 78, 90, 100, 88, 92, 85, 96, 100, 88, 94, 82, 76, 90, 95, 88, 100, 92, 98];

// Fake order status distribution
const ORDER_STATUS_DIST = [
  { label: "Completed", value: 62, color: "bg-emerald" },
  { label: "In Transit", value: 18, color: "bg-royal" },
  { label: "Pending", value: 12, color: "bg-gold" },
  { label: "Dispute", value: 4, color: "bg-warning" },
  { label: "Refunded", value: 4, color: "bg-error" },
];

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);
    setTimeout(() => setExporting(false), 1500);
  }

  return (
    <div className="space-y-8">
      {/* Heading + Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-light">
            Platform performance and business intelligence
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex gap-1 rounded-[--radius-md] bg-mist p-1 text-sm">
            {(["7d", "30d", "90d", "custom"] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={cn(
                  "rounded-[--radius-sm] px-3 py-1.5 font-medium transition-all",
                  dateRange === r
                    ? "bg-white text-midnight shadow-sm"
                    : "text-slate-light hover:text-slate"
                )}
              >
                {r === "custom" ? "Custom" : DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" loading={exporting} onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Custom date range inputs */}
      {dateRange === "custom" && (
        <div className="flex flex-wrap items-center gap-3 rounded-[--radius-md] border border-mist bg-white px-4 py-3">
          <Calendar className="h-4 w-4 text-slate-lighter" />
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-light">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-[--radius-sm] border border-mist-dark px-3 py-1.5 text-sm text-slate focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-slate-light">To</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-[--radius-sm] border border-mist-dark px-3 py-1.5 text-sm text-slate focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>
          <Button size="sm" variant="primary">Apply</Button>
        </div>
      )}

      {/* Chart Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GMV Over Time */}
        <Card className="rounded-[--radius-lg] lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>GMV Over Time</CardTitle>
                <CardDescription>{DATE_RANGE_LABELS[dateRange]}</CardDescription>
              </div>
              <div className="flex items-center gap-1.5 rounded-[--radius-sm] bg-royal/10 px-3 py-1.5 text-sm font-semibold text-royal">
                <ArrowUpRight className="h-4 w-4" />
                +12.4%
              </div>
            </div>
          </CardHeader>
          {/* Placeholder bar chart */}
          <div className="flex h-48 items-end gap-0.5 px-1">
            {GMV_BARS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-royal/20 transition-all duration-300 hover:bg-royal/50"
                style={{ height: `${h}%` }}
                title={`Day ${i + 1}`}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-lighter">
            <span>Day 1</span>
            <span>Day {GMV_BARS.length}</span>
          </div>
          <p className="mt-2 text-center text-xs text-slate-lighter italic">
            Chart placeholder — connect to real data for live rendering
          </p>
        </Card>

        {/* Orders by Status */}
        <Card className="rounded-[--radius-lg]">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>{DATE_RANGE_LABELS[dateRange]}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {ORDER_STATUS_DIST.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate">{item.label}</span>
                  <span className="font-semibold text-midnight">{item.value}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-lighter italic">
            Based on {DATE_RANGE_LABELS[dateRange].toLowerCase()} order data
          </p>
        </Card>
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-sora)] text-lg font-semibold text-midnight">
          Key Metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS_30D.map((m) => (
            <Card key={m.label} className="rounded-[--radius-lg]">
              <div className="flex items-start justify-between">
                <div className={cn("rounded-[--radius-md] p-2.5", m.iconBg)}>
                  <span className={m.iconColor}>{m.icon}</span>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold",
                    m.trend >= 0 ? "text-emerald" : "text-error"
                  )}
                >
                  {m.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(m.trend)}%
                </span>
              </div>
              <div className="mt-4">
                <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
                  {m.value}
                </p>
                <p className="mt-0.5 font-medium text-slate">{m.label}</p>
                <p className="text-xs text-slate-lighter">{m.subtext}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Top Sellers & Categories */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Sellers */}
        <Card className="rounded-[--radius-lg]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-royal" />
              <CardTitle>Top Sellers</CardTitle>
            </div>
            <CardDescription>By GMV — {DATE_RANGE_LABELS[dateRange]}</CardDescription>
          </CardHeader>
          <div className="space-y-2">
            {TOP_SELLERS.map((seller) => (
              <div
                key={seller.rank}
                className="flex items-center gap-3 rounded-[--radius-md] px-3 py-2.5 transition-colors hover:bg-cloud"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    seller.rank === 1
                      ? "bg-gold text-midnight"
                      : seller.rank === 2
                      ? "bg-mist-dark text-slate"
                      : seller.rank === 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-mist text-slate-light"
                  )}
                >
                  {seller.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-midnight">{seller.businessName}</p>
                  <p className="text-xs text-slate-lighter">{seller.orders} orders</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-midnight">{formatNaira(seller.gmv)}</p>
                  <p className="flex items-center justify-end gap-0.5 text-xs text-amber-600">
                    <Star className="h-3 w-3 fill-current" />
                    {seller.rating}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Categories */}
        <Card className="rounded-[--radius-lg]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-violet" />
              <CardTitle>Top Categories</CardTitle>
            </div>
            <CardDescription>By order volume — {DATE_RANGE_LABELS[dateRange]}</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {TOP_CATEGORIES.map((cat) => (
              <div key={cat.rank} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        cat.rank === 1 ? "bg-gold text-midnight" : "bg-mist text-slate-light"
                      )}
                    >
                      {cat.rank}
                    </span>
                    <span className="font-medium text-midnight">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-midnight">{cat.share}%</span>
                    <span className="ml-2 text-xs text-slate-lighter">{cat.orders} orders</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
                  <div
                    className="h-full rounded-full bg-violet transition-all duration-700"
                    style={{ width: `${cat.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-mist pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-light">Total GMV</span>
              <span className="font-semibold text-midnight">
                {formatNaira(TOP_CATEGORIES.reduce((s, c) => s + c.gmv, 0))}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
