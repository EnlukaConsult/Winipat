"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import {
  TrendingUp,
  Users,
  ShoppingBag,
  RefreshCw,
  Star,
  Repeat2,
  Clock,
  AlertTriangle,
  Trophy,
  Tag,
  Activity,
  Wallet,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d";
const RANGE_DAYS: Record<DateRange, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABEL: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

type OrderRow = {
  id: string;
  status: string;
  subtotal: number;
  total: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  completed_at: string | null;
  order_number?: string;
};
type SellerRow = { id: string; business_name: string };
type CategoryRow = { id: string; name: string };
type ProductRow = { id: string; category_id: string | null; seller_id: string };
type EscrowRow = { amount: number; status: string };
type PayoutRow = { amount: number; status: string; created_at: string };
type DisputeRow = { id: string; status: string; created_at: string };

// Palette for charts — picked to match existing brand tokens.
const COLOR = {
  violet:  "#7c3aed",
  teal:    "#14b8a6",
  emerald: "#10b981",
  royal:   "#3b82f6",
  gold:    "#d97706",
  rose:    "#e11d48",
  slate:   "#64748b",
  indigo:  "#6366f1",
  pink:    "#ec4899",
  cyan:    "#06b6d4",
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [escrows, setEscrows] = useState<EscrowRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d.toISOString();
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [oRes, sRes, cRes, pRes, eRes, payRes, dRes] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, status, subtotal, total, buyer_id, seller_id, created_at, completed_at, order_number"
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("sellers").select("id, business_name"),
      supabase.from("categories").select("id, name"),
      supabase.from("products").select("id, category_id, seller_id"),
      supabase.from("escrow_ledger").select("amount, status"),
      supabase
        .from("payouts")
        .select("amount, status, created_at")
        .gte("created_at", since),
      supabase
        .from("disputes")
        .select("id, status, created_at")
        .gte("created_at", since),
    ]);

    setOrders((oRes.data as OrderRow[]) || []);
    setSellers((sRes.data as SellerRow[]) || []);
    setCategories((cRes.data as CategoryRow[]) || []);
    setProducts((pRes.data as ProductRow[]) || []);
    setEscrows((eRes.data as EscrowRow[]) || []);
    setPayouts((payRes.data as PayoutRow[]) || []);
    setDisputes((dRes.data as DisputeRow[]) || []);

    setLoading(false);
  }, [since]);

  useEffect(() => {
    load();
  }, [load]);

  // ----- Transaction -----
  const completed = orders.filter((o) => o.status === "completed");
  const gmvKobo = completed.reduce((s, o) => s + o.total, 0);
  const avgOrderKobo = completed.length
    ? Math.round(gmvKobo / completed.length)
    : 0;
  const totalOrders = orders.length;
  const escrowHeldKobo = escrows
    .filter((e) => ["held", "captured", "release_eligible"].includes(e.status))
    .reduce((s, e) => s + e.amount, 0);

  // Daily GMV series (for line chart) + xLabels
  const days = RANGE_DAYS[range];
  const dailyGmv = useMemo(() => {
    const arr = Array.from({ length: days }, () => 0);
    const dailyOrders = Array.from({ length: days }, () => 0);
    const ms = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const o of orders) {
      const idx =
        days - 1 - Math.floor((now - new Date(o.created_at).getTime()) / ms);
      if (idx < 0 || idx >= days) continue;
      dailyOrders[idx] += 1;
      if (o.status === "completed") arr[idx] += o.total;
    }
    return { gmv: arr, count: dailyOrders };
  }, [orders, days]);
  const xLabels = useMemo(() => {
    const arr: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }));
    }
    return arr;
  }, [days]);

  // ----- Operational -----
  const STATUS_FUNNEL = [
    { key: "pending_payment",   label: "Awaiting payment" },
    { key: "payment_confirmed", label: "Paid" },
    { key: "seller_preparing",  label: "Preparing" },
    { key: "awaiting_pickup",   label: "Awaiting pickup" },
    { key: "in_transit",        label: "In transit" },
    { key: "delivered",         label: "Delivered" },
    { key: "completed",         label: "Completed" },
  ];
  const funnel = STATUS_FUNNEL.map((s) => ({
    ...s,
    count: orders.filter((o) => o.status === s.key).length,
  }));
  const funnelMax = Math.max(1, ...funnel.map((s) => s.count));

  const completionTimes = completed
    .filter((o) => o.completed_at)
    .map(
      (o) =>
        new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()
    );
  const avgCompletionDays = completionTimes.length
    ? Math.round(
        (completionTimes.reduce((s, t) => s + t, 0) /
          completionTimes.length /
          (1000 * 60 * 60 * 24)) *
          10
      ) / 10
    : 0;

  const openDisputes = disputes.filter(
    (d) => d.status === "open" || d.status === "under_review"
  ).length;
  const disputeRate = totalOrders
    ? Math.round((disputes.length / totalOrders) * 1000) / 10
    : 0;
  const cancelledRate = totalOrders
    ? Math.round(
        (orders.filter((o) => o.status === "cancelled").length / totalOrders) *
          1000
      ) / 10
    : 0;

  // ----- Order outcome donut (3 buckets) -----
  const inFlightStates = new Set([
    "pending_payment",
    "payment_confirmed",
    "seller_preparing",
    "awaiting_pickup",
    "picked_up",
    "in_transit",
    "delivered",
  ]);
  const outcomeDonut = [
    {
      label: "Completed",
      value: completed.length,
      color: COLOR.emerald,
    },
    {
      label: "In flight",
      value: orders.filter((o) => inFlightStates.has(o.status)).length,
      color: COLOR.violet,
    },
    {
      label: "Cancelled / refunded",
      value: orders.filter((o) =>
        ["cancelled", "refunded"].includes(o.status)
      ).length,
      color: COLOR.slate,
    },
    {
      label: "Disputed",
      value: orders.filter((o) => o.status === "disputed").length,
      color: COLOR.rose,
    },
  ];

  // ----- Payout mix donut -----
  const payoutDonut = [
    {
      label: "Completed",
      value: payouts.filter((p) => p.status === "completed").length,
      color: COLOR.emerald,
    },
    {
      label: "Processing",
      value: payouts.filter((p) => p.status === "processing").length,
      color: COLOR.violet,
    },
    {
      label: "Pending",
      value: payouts.filter((p) => p.status === "pending").length,
      color: COLOR.gold,
    },
    {
      label: "Failed",
      value: payouts.filter((p) => p.status === "failed").length,
      color: COLOR.rose,
    },
  ];

  // ----- Top sellers -----
  const sellerById = new Map(sellers.map((s) => [s.id, s.business_name]));
  const sellerGmv = new Map<string, number>();
  const sellerOrders = new Map<string, number>();
  for (const o of completed) {
    sellerGmv.set(o.seller_id, (sellerGmv.get(o.seller_id) || 0) + o.total);
    sellerOrders.set(
      o.seller_id,
      (sellerOrders.get(o.seller_id) || 0) + 1
    );
  }
  const topSellers = [...sellerGmv.entries()]
    .map(([id, gmv]) => ({
      id,
      name: sellerById.get(id) || "Unknown",
      gmv,
      orders: sellerOrders.get(id) || 0,
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 6);

  // ----- Top categories (orders by seller → seller's products → categories) -----
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const sellerCategories = new Map<string, Map<string, number>>();
  for (const p of products) {
    if (!p.category_id) continue;
    if (!sellerCategories.has(p.seller_id))
      sellerCategories.set(p.seller_id, new Map());
    const m = sellerCategories.get(p.seller_id)!;
    m.set(p.category_id, (m.get(p.category_id) || 0) + 1);
  }
  const catOrders = new Map<string, number>();
  for (const o of orders) {
    const catMap = sellerCategories.get(o.seller_id);
    if (!catMap || catMap.size === 0) continue;
    // Attribute order to seller's most-listed category — best-effort
    // without joining order_items (kept lightweight for V1).
    let best: [string, number] | null = null;
    for (const [cid, n] of catMap) {
      if (!best || n > best[1]) best = [cid, n];
    }
    if (best) catOrders.set(best[0], (catOrders.get(best[0]) || 0) + 1);
  }
  const topCategoryDonut = [...catOrders.entries()]
    .map(([id, count], i) => ({
      label: categoryById.get(id) || "Unknown",
      value: count,
      color: [
        COLOR.violet,
        COLOR.teal,
        COLOR.gold,
        COLOR.rose,
        COLOR.indigo,
        COLOR.cyan,
      ][i % 6],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // ----- Buyer cohort -----
  const buyerOrderCount = new Map<string, number>();
  for (const o of orders) {
    buyerOrderCount.set(o.buyer_id, (buyerOrderCount.get(o.buyer_id) || 0) + 1);
  }
  const repeaters = [...buyerOrderCount.values()].filter((n) => n >= 2).length;
  const buyerCount = buyerOrderCount.size;
  const buyerDonut = [
    {
      label: "Repeat buyers",
      value: repeaters,
      color: COLOR.emerald,
    },
    {
      label: "One-time buyers",
      value: Math.max(0, buyerCount - repeaters),
      color: COLOR.violet,
    },
  ];

  // ----- Recent orders table -----
  const recentOrders = orders.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Analytics
          </h1>
          <p className="mt-0.5 text-sm text-slate-light">
            Operational, transaction, and performance metrics across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                range === r
                  ? "border-violet bg-violet text-white"
                  : "border-mist bg-white text-slate hover:border-violet/40"
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-mist bg-white text-slate hover:border-violet/40"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* ===== Row 1: Hero KPIs ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="GMV (completed)"  value={formatNaira(gmvKobo / 100)}      icon={<ShoppingBag size={18}/>} color="from-violet to-violet-dark" loading={loading} />
        <KPI label="Avg order value"  value={formatNaira(avgOrderKobo / 100)} icon={<TrendingUp size={18}/>}  color="from-teal to-teal-dark"    loading={loading} />
        <KPI label="Escrow held"      value={formatNaira(escrowHeldKobo / 100)} icon={<Wallet size={18}/>}    color="from-gold-dark to-gold"    loading={loading} />
        <KPI label="Total orders"     value={totalOrders.toLocaleString()}    icon={<Activity size={18}/>}   color="from-royal to-royal-dark"  loading={loading} />
      </div>

      {/* ===== Row 2: Line chart (2/3) + Order outcome donut (1/3) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={14} className="text-violet" />
              GMV trend
            </CardTitle>
            <span className="text-xs text-slate-lighter">{RANGE_LABEL[range]}</span>
          </div>
          {loading ? (
            <div className="h-44 bg-mist rounded-md animate-pulse" />
          ) : (
            <LineChart
              series={[
                {
                  label: "GMV",
                  color: COLOR.violet,
                  values: dailyGmv.gmv.map((v) => v / 100),
                },
                {
                  label: "Orders",
                  color: COLOR.teal,
                  values: dailyGmv.count.map((v) => v * (avgOrderKobo / 100 || 1)),
                },
              ]}
              xLabels={xLabels}
              yFormat={(n) => `₦${(n / 1000).toFixed(n >= 1000 ? 0 : 1)}k`}
            />
          )}
        </Card>

        <Card padding="md">
          <CardTitle className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-emerald" />
            Order outcomes
          </CardTitle>
          {loading ? (
            <div className="h-44 bg-mist rounded-md animate-pulse" />
          ) : (
            <DonutChart
              data={outcomeDonut}
              centerValue={totalOrders.toLocaleString()}
              centerLabel="Orders"
            />
          )}
        </Card>
      </div>

      {/* ===== Row 3: Operational KPIs ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Open disputes"   value={openDisputes.toLocaleString()}      icon={<AlertTriangle size={18}/>} color="from-rose-500 to-red-700" loading={loading} />
        <KPI label="Dispute rate"    value={`${disputeRate.toFixed(1)}%`}        icon={<AlertTriangle size={18}/>} color="from-warn to-gold-dark"    sub={`${disputes.length} of ${totalOrders} orders`} loading={loading} />
        <KPI label="Avg completion"  value={avgCompletionDays ? `${avgCompletionDays}d` : "—"} icon={<Clock size={18}/>} color="from-teal to-emerald"  sub={`${cancelledRate}% cancel rate`} loading={loading} />
        <KPI label="Active buyers"   value={buyerCount.toLocaleString()}        icon={<Users size={18}/>}        color="from-royal to-violet"   sub={`${repeaters} returned`} loading={loading} />
      </div>

      {/* ===== Row 4: Funnel + Top sellers (table) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding="md">
          <CardTitle className="text-sm mb-3">Order status funnel</CardTitle>
          <div className="space-y-2.5">
            {funnel.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <p className="text-xs text-slate w-28 truncate">{s.label}</p>
                <div className="flex-1 h-5 bg-mist rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet to-teal transition-all"
                    style={{ width: `${(s.count / funnelMax) * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-midnight w-10 text-right tabular-nums">
                  {s.count}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-gold-dark" />
            Top sellers by GMV
          </CardTitle>
          {topSellers.length === 0 ? (
            <p className="text-xs text-slate-light py-6 text-center">
              No completed orders yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist text-[10px] uppercase text-slate-lighter">
                  <th className="text-left py-1.5 px-1 w-6">#</th>
                  <th className="text-left py-1.5 px-1">Seller</th>
                  <th className="text-right py-1.5 px-1">Orders</th>
                  <th className="text-right py-1.5 px-1">GMV</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.map((s, i) => (
                  <tr key={s.id} className="border-b border-mist/40 last:border-0">
                    <td className="py-2 px-1 text-slate-lighter">{i + 1}</td>
                    <td className="py-2 px-1 font-medium text-midnight truncate">
                      {s.name}
                    </td>
                    <td className="py-2 px-1 text-right text-slate tabular-nums">
                      {s.orders}
                    </td>
                    <td className="py-2 px-1 text-right font-bold text-violet tabular-nums">
                      {formatNaira(s.gmv / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ===== Row 5: Category donut + Payout donut + Buyer cohort donut ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <Tag size={14} className="text-teal" />
            Top categories
          </CardTitle>
          {topCategoryDonut.length === 0 ? (
            <p className="text-xs text-slate-light py-6 text-center">
              Not enough product/order data yet.
            </p>
          ) : (
            <DonutChart
              data={topCategoryDonut}
              centerValue={[...catOrders.values()]
                .reduce((s, v) => s + v, 0)
                .toLocaleString()}
              centerLabel="Orders"
              size={160}
            />
          )}
        </Card>

        <Card padding="md">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <Wallet size={14} className="text-violet" />
            Payout pipeline
          </CardTitle>
          {payouts.length === 0 ? (
            <p className="text-xs text-slate-light py-6 text-center">
              No payouts in this range.
            </p>
          ) : (
            <DonutChart
              data={payoutDonut}
              centerValue={payouts.length.toLocaleString()}
              centerLabel="Payouts"
              size={160}
            />
          )}
        </Card>

        <Card padding="md">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <Repeat2 size={14} className="text-emerald" />
            Buyer cohort
          </CardTitle>
          {buyerCount === 0 ? (
            <p className="text-xs text-slate-light py-6 text-center">
              No buyers in this range.
            </p>
          ) : (
            <DonutChart
              data={buyerDonut}
              centerValue={`${buyerCount ? Math.round((repeaters / buyerCount) * 100) : 0}%`}
              centerLabel="Repeat rate"
              size={160}
            />
          )}
        </Card>
      </div>

      {/* ===== Row 6: Recent orders table ===== */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingBag size={14} className="text-violet" />
            Recent orders
          </CardTitle>
          <span className="text-xs text-slate-lighter">
            Showing latest {recentOrders.length} of {totalOrders}
          </span>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-xs text-slate-light py-6 text-center">
            No orders in this range yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist text-[10px] uppercase text-slate-lighter">
                  <th className="text-left py-2 px-2">Order</th>
                  <th className="text-left py-2 px-2">Seller</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Placed</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-mist/60 last:border-0 hover:bg-cloud/40"
                  >
                    <td className="py-2 px-2 font-medium text-midnight">
                      {o.order_number || o.id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-2 text-slate truncate">
                      {sellerById.get(o.seller_id) || "—"}
                    </td>
                    <td className="py-2 px-2 text-right font-bold tabular-nums text-midnight">
                      {formatNaira(o.total / 100)}
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          o.status === "completed"
                            ? "success"
                            : o.status === "cancelled" || o.status === "refunded"
                            ? "default"
                            : o.status === "disputed"
                            ? "error"
                            : "warning"
                        }
                        className="text-[10px] capitalize"
                      >
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-slate-light text-xs">
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({
  label,
  value,
  icon,
  color,
  sub,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className={cn("rounded-[--radius-lg] p-4 text-white bg-gradient-to-br", color)}>
      <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-xl font-bold font-[family-name:var(--font-sora)]">
        {loading ? (
          <span className="inline-block h-6 w-20 bg-white/20 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-white/80 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}
