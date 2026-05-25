"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { cn, formatNaira } from "@/lib/utils";
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
};

type SellerRow = {
  id: string;
  business_name: string;
};

type CategoryRow = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  category_id: string | null;
};

type EscrowRow = { amount: number; status: string };
type PayoutRow = { amount: number; status: string };
type DisputeRow = { id: string; status: string; created_at: string };

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
        .select("id, status, subtotal, total, buyer_id, seller_id, created_at, completed_at")
        .gte("created_at", since)
        .limit(5000),
      supabase.from("sellers").select("id, business_name"),
      supabase.from("categories").select("id, name"),
      supabase.from("products").select("id, category_id"),
      supabase.from("escrow_ledger").select("amount, status"),
      supabase.from("payouts").select("amount, status").gte("created_at", since),
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

  // ----- Transaction metrics -----
  const completedOrders = orders.filter((o) => o.status === "completed");
  const gmvKobo = completedOrders.reduce((s, o) => s + o.total, 0);
  const avgOrderKobo = completedOrders.length
    ? Math.round(gmvKobo / completedOrders.length)
    : 0;
  const totalOrders = orders.length;
  const payoutVolumeKobo = payouts
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);
  const pendingPayoutKobo = payouts
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((s, p) => s + p.amount, 0);
  const escrowHeldKobo = escrows
    .filter((e) => ["held", "captured", "release_eligible"].includes(e.status))
    .reduce((s, e) => s + e.amount, 0);

  // ----- Operational metrics -----
  const STATUS_FUNNEL: Array<{ key: string; label: string }> = [
    { key: "pending_payment",    label: "Awaiting payment" },
    { key: "payment_confirmed",  label: "Paid" },
    { key: "seller_preparing",   label: "Preparing" },
    { key: "awaiting_pickup",    label: "Awaiting pickup" },
    { key: "in_transit",         label: "In transit" },
    { key: "delivered",          label: "Delivered" },
    { key: "completed",          label: "Completed" },
  ];
  const funnel = STATUS_FUNNEL.map((s) => ({
    ...s,
    count: orders.filter((o) => o.status === s.key).length,
  }));
  const funnelMax = Math.max(1, ...funnel.map((s) => s.count));

  // Avg time to complete (created_at -> completed_at)
  const completionTimes = completedOrders
    .filter((o) => o.completed_at)
    .map(
      (o) =>
        new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()
    );
  const avgCompletionDays = completionTimes.length
    ? Math.round(
        completionTimes.reduce((s, t) => s + t, 0) /
          completionTimes.length /
          (1000 * 60 * 60 * 24) *
          10
      ) / 10
    : 0;

  // Dispute rate
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

  // ----- Performance metrics -----
  const sellerById = new Map(sellers.map((s) => [s.id, s.business_name]));
  const sellerGmv = new Map<string, number>();
  const sellerOrderCount = new Map<string, number>();
  for (const o of completedOrders) {
    sellerGmv.set(o.seller_id, (sellerGmv.get(o.seller_id) || 0) + o.total);
    sellerOrderCount.set(
      o.seller_id,
      (sellerOrderCount.get(o.seller_id) || 0) + 1
    );
  }
  const topSellers = [...sellerGmv.entries()]
    .map(([id, gmv]) => ({
      id,
      name: sellerById.get(id) || "Unknown",
      gmv,
      orders: sellerOrderCount.get(id) || 0,
    }))
    .sort((a, b) => b.gmv - a.gmv)
    .slice(0, 5);

  // Top categories: orders -> products -> category
  const productCat = new Map(products.map((p) => [p.id, p.category_id]));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const catOrderCount = new Map<string, number>();
  // Without order_items details (avoid a big join), approximate by counting
  // orders per seller's top category. Cheap and visual — admin gets the
  // shape, not accounting-level precision.
  for (const o of orders) {
    const sellerProducts = products.filter((p) => p.id === o.seller_id);
    for (const p of sellerProducts) {
      const cat = p.category_id || (productCat.get(p.id) ?? null);
      if (!cat) continue;
      catOrderCount.set(cat, (catOrderCount.get(cat) || 0) + 1);
    }
  }
  const topCategories = [...catOrderCount.entries()]
    .map(([id, count]) => ({ id, name: categoryById.get(id) || "Unknown", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Repeat buyer rate
  const buyerOrderCount = new Map<string, number>();
  for (const o of orders) {
    buyerOrderCount.set(o.buyer_id, (buyerOrderCount.get(o.buyer_id) || 0) + 1);
  }
  const repeaters = [...buyerOrderCount.values()].filter((n) => n >= 2).length;
  const buyerCount = buyerOrderCount.size;
  const repeatRate = buyerCount
    ? Math.round((repeaters / buyerCount) * 1000) / 10
    : 0;

  // Sparkline: GMV per day across the range
  const dayBuckets = useMemo(() => {
    const days = RANGE_DAYS[range];
    const buckets = Array.from({ length: days }, () => 0);
    for (const o of completedOrders) {
      const idx =
        days -
        1 -
        Math.floor(
          (Date.now() - new Date(o.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
        );
      if (idx >= 0 && idx < days) buckets[idx] += o.total;
    }
    return buckets;
  }, [completedOrders, range]);
  const dayMax = Math.max(1, ...dayBuckets);

  return (
    <div className="space-y-6">
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

      {/* ===== TRANSACTION ===== */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-slate-lighter font-semibold">
          Transaction
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="GMV (completed)"
            value={formatNaira(gmvKobo / 100)}
            icon={<ShoppingBag size={18} />}
            color="from-violet to-violet-dark"
            loading={loading}
          />
          <KPICard
            label="Avg order value"
            value={formatNaira(avgOrderKobo / 100)}
            icon={<TrendingUp size={18} />}
            color="from-teal to-teal-dark"
            loading={loading}
          />
          <KPICard
            label="Escrow held"
            value={formatNaira(escrowHeldKobo / 100)}
            icon={<Clock size={18} />}
            color="from-gold-dark to-gold"
            loading={loading}
          />
          <KPICard
            label="Payouts completed"
            value={formatNaira(payoutVolumeKobo / 100)}
            icon={<Activity size={18} />}
            color="from-royal to-royal-dark"
            sub={`+ ${formatNaira(pendingPayoutKobo / 100)} pending`}
            loading={loading}
          />
        </div>

        {/* Daily GMV sparkline */}
        <Card padding="md">
          <CardTitle className="text-sm flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-violet" />
            Daily GMV — {RANGE_LABEL[range]}
          </CardTitle>
          <div className="flex items-end gap-0.5 h-24">
            {dayBuckets.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-violet/70 rounded-t hover:bg-violet transition-colors"
                style={{ height: `${(v / dayMax) * 100}%` }}
                title={`Day ${i + 1}: ${formatNaira(v / 100)}`}
              />
            ))}
          </div>
        </Card>
      </section>

      {/* ===== OPERATIONAL ===== */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-slate-lighter font-semibold">
          Operational
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Total orders"
            value={totalOrders.toLocaleString()}
            icon={<ShoppingBag size={18} />}
            color="from-violet to-teal"
            loading={loading}
          />
          <KPICard
            label="Open disputes"
            value={openDisputes.toLocaleString()}
            icon={<AlertTriangle size={18} />}
            color="from-error to-red-700"
            loading={loading}
          />
          <KPICard
            label="Dispute rate"
            value={`${disputeRate.toFixed(1)}%`}
            icon={<AlertTriangle size={18} />}
            color="from-warn to-gold-dark"
            sub={`${disputes.length} of ${totalOrders} orders`}
            loading={loading}
          />
          <KPICard
            label="Avg completion time"
            value={avgCompletionDays ? `${avgCompletionDays} days` : "—"}
            icon={<Clock size={18} />}
            color="from-teal to-emerald"
            sub={`${cancelledRate}% cancel rate`}
            loading={loading}
          />
        </div>

        <Card padding="md">
          <CardTitle className="text-sm mb-3">Order status funnel</CardTitle>
          <div className="space-y-2">
            {funnel.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <p className="text-xs text-slate w-32 truncate">{s.label}</p>
                <div className="flex-1 h-5 bg-mist rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet to-teal"
                    style={{ width: `${(s.count / funnelMax) * 100}%` }}
                  />
                </div>
                <p className="text-xs font-semibold text-midnight w-10 text-right">
                  {s.count}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ===== PERFORMANCE ===== */}
      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-slate-lighter font-semibold">
          Performance
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Active buyers"
            value={buyerCount.toLocaleString()}
            icon={<Users size={18} />}
            color="from-royal to-violet"
            loading={loading}
          />
          <KPICard
            label="Repeat buyer rate"
            value={`${repeatRate.toFixed(1)}%`}
            icon={<Repeat2 size={18} />}
            color="from-emerald to-teal"
            sub={`${repeaters} of ${buyerCount} returned`}
            loading={loading}
          />
          <KPICard
            label="Active sellers"
            value={sellers.length.toLocaleString()}
            icon={<Star size={18} />}
            color="from-gold-dark to-gold"
            loading={loading}
          />
          <KPICard
            label="Listed categories"
            value={categories.length.toLocaleString()}
            icon={<Tag size={18} />}
            color="from-teal to-royal"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding="md">
            <CardTitle className="text-sm flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-gold-dark" />
              Top sellers by GMV
            </CardTitle>
            {topSellers.length === 0 ? (
              <p className="text-xs text-slate-light py-4 text-center">No completed orders yet.</p>
            ) : (
              <ol className="space-y-1.5">
                {topSellers.map((s, i) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 bg-cloud"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-lighter text-xs w-4">
                        {i + 1}.
                      </span>
                      <span className="font-medium text-midnight truncate">
                        {s.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-slate-light shrink-0">
                      <span>{s.orders} orders</span>
                      <span className="font-bold text-violet">
                        {formatNaira(s.gmv / 100)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card padding="md">
            <CardTitle className="text-sm flex items-center gap-2 mb-3">
              <Tag size={14} className="text-teal" />
              Top categories by orders
            </CardTitle>
            {topCategories.length === 0 ? (
              <p className="text-xs text-slate-light py-4 text-center">
                Not enough order/product overlap yet.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {topCategories.map((c, i) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 text-sm rounded-md px-2 py-1.5 bg-cloud"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-slate-lighter text-xs w-4">
                        {i + 1}.
                      </span>
                      <span className="font-medium text-midnight truncate">
                        {c.name}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-teal">{c.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

function KPICard({
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
    <div
      className={cn(
        "rounded-[--radius-lg] p-4 text-white bg-gradient-to-br",
        color
      )}
    >
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
      <p className="text-xs text-white/70 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>}
    </div>
  );
}
