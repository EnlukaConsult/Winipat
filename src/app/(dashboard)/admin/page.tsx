"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  UserCheck,
  AlertTriangle,
  BarChart3,
  Clock,
  ShieldCheck,
  MessageSquareWarning,
  Package,
  ArrowUpRight,
  Activity,
} from "lucide-react";

interface KpiCard {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

interface ActivityItem {
  id: string;
  type: "seller_approved" | "dispute_opened" | "order_completed" | "seller_suspended" | "refund_issued" | "settlement_released";
  description: string;
  timestamp: string;
  actor?: string;
}

const MOCK_KPI: KpiCard[] = [
  {
    label: "Total GMV",
    value: formatNaira(18_450_000),
    trend: 12.4,
    icon: <TrendingUp className="h-5 w-5" />,
    iconBg: "bg-royal/10",
    iconColor: "text-royal",
  },
  {
    label: "Active Sellers",
    value: "342",
    trend: 8.1,
    icon: <ShoppingBag className="h-5 w-5" />,
    iconBg: "bg-violet/10",
    iconColor: "text-violet",
  },
  {
    label: "Total Buyers",
    value: "4,891",
    trend: 15.3,
    icon: <Users className="h-5 w-5" />,
    iconBg: "bg-emerald/10",
    iconColor: "text-emerald",
  },
  {
    label: "Dispute Rate",
    value: "2.3%",
    trend: -0.4,
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-warning/10",
    iconColor: "text-amber-600",
  },
  {
    label: "Conversion Rate",
    value: "4.7%",
    trend: 0.6,
    icon: <BarChart3 className="h-5 w-5" />,
    iconBg: "bg-gold/20",
    iconColor: "text-amber-700",
  },
];

const MOCK_QUICK_STATS = [
  { label: "Orders Today", value: "127", icon: <Package className="h-4 w-4" />, color: "text-royal" },
  { label: "Pending Verifications", value: "14", icon: <ShieldCheck className="h-4 w-4" />, color: "text-amber-600" },
  { label: "Open Disputes", value: "7", icon: <MessageSquareWarning className="h-4 w-4" />, color: "text-error" },
];

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", type: "seller_approved", description: "Seller 'Adaeze Crafts' was approved", timestamp: new Date(Date.now() - 5 * 60_000).toISOString(), actor: "Admin" },
  { id: "2", type: "dispute_opened", description: "Dispute #ORD-2841 opened by buyer Emeka O.", timestamp: new Date(Date.now() - 22 * 60_000).toISOString() },
  { id: "3", type: "order_completed", description: "Order #ORD-2839 marked as completed", timestamp: new Date(Date.now() - 45 * 60_000).toISOString() },
  { id: "4", type: "settlement_released", description: "Settlement of ₦84,500 released to 'Chukwu Electronics'", timestamp: new Date(Date.now() - 1.2 * 3600_000).toISOString(), actor: "System" },
  { id: "5", type: "seller_suspended", description: "Seller 'QuickDeals NG' suspended for policy violation", timestamp: new Date(Date.now() - 2.5 * 3600_000).toISOString(), actor: "Admin" },
  { id: "6", type: "refund_issued", description: "Full refund of ₦12,000 issued for Order #ORD-2821", timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(), actor: "Admin" },
  { id: "7", type: "seller_approved", description: "Seller 'Lagos Fabrics Hub' was approved", timestamp: new Date(Date.now() - 4 * 3600_000).toISOString(), actor: "Admin" },
  { id: "8", type: "dispute_opened", description: "Dispute #ORD-2808 opened by buyer Ngozi A.", timestamp: new Date(Date.now() - 5.5 * 3600_000).toISOString() },
  { id: "9", type: "order_completed", description: "Order #ORD-2795 marked as completed", timestamp: new Date(Date.now() - 7 * 3600_000).toISOString() },
  { id: "10", type: "settlement_released", description: "Batch settlement of ₦320,000 processed", timestamp: new Date(Date.now() - 10 * 3600_000).toISOString(), actor: "System" },
];

const activityConfig: Record<ActivityItem["type"], { icon: React.ReactNode; badge: React.ReactElement }> = {
  seller_approved: {
    icon: <UserCheck className="h-4 w-4 text-emerald" />,
    badge: <Badge variant="success">Approved</Badge>,
  },
  dispute_opened: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    badge: <Badge variant="warning">Dispute</Badge>,
  },
  order_completed: {
    icon: <Package className="h-4 w-4 text-royal" />,
    badge: <Badge variant="info">Order</Badge>,
  },
  seller_suspended: {
    icon: <AlertTriangle className="h-4 w-4 text-error" />,
    badge: <Badge variant="error">Suspended</Badge>,
  },
  refund_issued: {
    icon: <ArrowUpRight className="h-4 w-4 text-violet" />,
    badge: <Badge variant="royal">Refund</Badge>,
  },
  settlement_released: {
    icon: <TrendingUp className="h-4 w-4 text-emerald" />,
    badge: <Badge variant="gold">Settlement</Badge>,
  },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetch — replace with real Supabase queries
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-slate-light">
          Real-time snapshot of Winipat marketplace activity
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {MOCK_KPI.map((kpi) => (
          <Card key={kpi.label} className="rounded-[--radius-lg]">
            <div className="flex items-start justify-between">
              <div className={cn("rounded-[--radius-md] p-2.5", kpi.iconBg)}>
                <span className={kpi.iconColor}>{kpi.icon}</span>
              </div>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold",
                  kpi.trend >= 0 ? "text-emerald" : "text-error"
                )}
              >
                {kpi.trend >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(kpi.trend)}%
              </span>
            </div>
            <div className="mt-4">
              <p className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
                {loading ? (
                  <span className="inline-block h-7 w-24 animate-pulse rounded bg-mist" />
                ) : (
                  kpi.value
                )}
              </p>
              <p className="mt-0.5 text-sm text-slate-light">{kpi.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Stats */}
        <Card className="rounded-[--radius-lg] lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-royal" />
              <CardTitle>Quick Stats</CardTitle>
            </div>
            <CardDescription>Live counters for today</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            {MOCK_QUICK_STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-[--radius-md] bg-cloud px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className={stat.color}>{stat.icon}</span>
                  <span className="text-sm font-medium text-slate">{stat.label}</span>
                </div>
                <span className="font-[family-name:var(--font-sora)] text-xl font-bold text-midnight">
                  {loading ? (
                    <span className="inline-block h-5 w-8 animate-pulse rounded bg-mist" />
                  ) : (
                    stat.value
                  )}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="rounded-[--radius-lg] lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-royal" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>Last 10 platform events</CardDescription>
          </CardHeader>
          <div className="space-y-0 divide-y divide-mist">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3">
                    <span className="h-8 w-8 animate-pulse rounded-full bg-mist" />
                    <div className="flex-1 space-y-1.5">
                      <span className="block h-3.5 w-3/4 animate-pulse rounded bg-mist" />
                      <span className="block h-3 w-1/3 animate-pulse rounded bg-mist" />
                    </div>
                  </div>
                ))
              : MOCK_ACTIVITY.map((item) => {
                  const config = activityConfig[item.type];
                  return (
                    <div key={item.id} className="flex items-start gap-3 py-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cloud">
                        {config.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate">{item.description}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-slate-lighter">{timeAgo(item.timestamp)}</span>
                          {item.actor && (
                            <span className="text-xs text-slate-lighter">· {item.actor}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">{config.badge}</div>
                    </div>
                  );
                })}
          </div>
        </Card>
      </div>
    </div>
  );
}
