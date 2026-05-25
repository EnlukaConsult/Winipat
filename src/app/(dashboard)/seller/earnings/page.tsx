"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  Info,
  RefreshCw,
  Hash,
  Calendar,
} from "lucide-react";

// Default commission rate per FRD (BR-040). Falls back to this when no
// commissions row exists yet for a given order.
const DEFAULT_COMMISSION_RATE = 0.12;

type DateRange = "30d" | "90d" | "12mo";
const RANGE_LABEL: Record<DateRange, string> = {
  "30d":  "Last 30 days",
  "90d":  "Last 90 days",
  "12mo": "Last 12 months",
};
const RANGE_DAYS: Record<DateRange, number> = { "30d": 30, "90d": 90, "12mo": 365 };

type PayoutStatus = "pending" | "processing" | "completed" | "failed";

type Payout = {
  id: string;
  created_at: string;
  amount: number;
  status: PayoutStatus;
  reference: string | null;
  processed_at: string | null;
};

type SettledOrder = {
  id: string;
  total: number;
  created_at: string;
  completed_at: string | null;
  commissions: { amount: number } | { amount: number }[] | null;
};

type InFlightOrder = { id: string; total: number };

const payoutStatusConfig: Record<
  PayoutStatus,
  { label: string; variant: "warning" | "default" | "success" | "error" }
> = {
  pending:    { label: "Pending",    variant: "warning" },
  processing: { label: "Processing", variant: "default" },
  completed:  { label: "Paid",       variant: "success" },
  failed:     { label: "Failed",     variant: "error" },
};

const SETTLED_STATUSES   = ["completed", "delivered"] as const;
const IN_FLIGHT_STATUSES = [
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
] as const;

export default function SellerEarningsPage() {
  const [range, setRange] = useState<DateRange>("90d");
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState<SettledOrder[]>([]);
  const [inFlight, setInFlight] = useState<InFlightOrder[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [settledRes, inFlightRes, payoutsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, created_at, completed_at, commissions(amount)")
        .eq("seller_id", user.id)
        .in("status", SETTLED_STATUSES as unknown as string[]),
      supabase
        .from("orders")
        .select("id, total")
        .eq("seller_id", user.id)
        .in("status", IN_FLIGHT_STATUSES as unknown as string[]),
      supabase
        .from("payouts")
        .select("id, created_at, amount, status, reference, processed_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    setSettled((settledRes.data as SettledOrder[]) || []);
    setInFlight((inFlightRes.data as InFlightOrder[]) || []);
    setPayouts((payoutsRes.data as Payout[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Summary calculations ─────────────────────────────────────────────
  const summary = useMemo(() => {
    const grossSales = settled.reduce((s, o) => s + (o.total ?? 0), 0);
    const commissionDeducted = settled.reduce((sum, o) => {
      const c = Array.isArray(o.commissions) ? o.commissions[0] : o.commissions;
      if (c?.amount) return sum + c.amount;
      return sum + Math.round((o.total ?? 0) * DEFAULT_COMMISSION_RATE);
    }, 0);
    const netEarnings = grossSales - commissionDeducted;
    const pendingSettlement = inFlight.reduce(
      (sum, o) =>
        sum + Math.round((o.total ?? 0) * (1 - DEFAULT_COMMISSION_RATE)),
      0
    );
    const totalPaidOut = payouts
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    return {
      grossSales,
      commissionDeducted,
      netEarnings,
      pendingSettlement,
      totalPaidOut,
    };
  }, [settled, inFlight, payouts]);

  // ── Trend chart: net earnings per bucket (day or month depending on range) ─
  const chartBuckets = useMemo(() => {
    const isYearly = range === "12mo";
    const buckets = isYearly ? 12 : RANGE_DAYS[range];
    const arr = Array.from({ length: buckets }, (_, i) => ({
      label: "",
      value: 0,
    }));
    const now = Date.now();
    const ms = 24 * 60 * 60 * 1000;

    for (const o of settled) {
      const stamp = new Date(o.completed_at || o.created_at).getTime();
      let idx: number;
      if (isYearly) {
        const monthsAgo = Math.floor((now - stamp) / (ms * 30));
        idx = buckets - 1 - monthsAgo;
      } else {
        const daysAgo = Math.floor((now - stamp) / ms);
        idx = buckets - 1 - daysAgo;
      }
      if (idx < 0 || idx >= buckets) continue;
      const c = Array.isArray(o.commissions) ? o.commissions[0] : o.commissions;
      const commission = c?.amount ?? Math.round((o.total ?? 0) * DEFAULT_COMMISSION_RATE);
      arr[idx].value += (o.total ?? 0) - commission;
    }
    // Labels for first / middle / last bucket only (keeps the axis tidy)
    if (isYearly) {
      arr[0].label = `${buckets} mo ago`;
      arr[arr.length - 1].label = "this month";
    } else {
      arr[0].label = `${buckets}d ago`;
      arr[arr.length - 1].label = "today";
    }
    return arr;
  }, [settled, range]);

  const chartMax = Math.max(1, ...chartBuckets.map((b) => b.value));
  const hasChartData = chartBuckets.some((b) => b.value > 0);

  // ── KPI cards ────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Gross Sales",
      value: formatNaira(summary.grossSales / 100),
      hint: "Delivered + completed orders",
      icon: TrendingUp,
      gradient: "from-violet to-violet-dark",
    },
    {
      label: "Commission (12%)",
      value: formatNaira(summary.commissionDeducted / 100),
      hint: "Platform fee at settlement",
      icon: Percent,
      gradient: "from-error to-red-700",
    },
    {
      label: "Net Earnings",
      value: formatNaira(summary.netEarnings / 100),
      hint: "After commission",
      icon: Wallet,
      gradient: "from-emerald to-teal-dark",
    },
    {
      label: "Pending Settlement",
      value: formatNaira(summary.pendingSettlement / 100),
      hint: "Not yet released from escrow",
      icon: Clock,
      gradient: "from-warn to-gold-dark",
    },
    {
      label: "Total Paid Out",
      value: formatNaira(summary.totalPaidOut / 100),
      hint: "Sent to your bank",
      icon: CheckCircle2,
      gradient: "from-teal to-royal",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Earnings
          </h1>
          <p className="text-slate-light mt-0.5 text-sm">
            Track revenue, commissions, and payout history.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[--radius-md] border border-mist text-xs text-slate hover:border-violet/40 self-start sm:self-auto"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ===== Commission banner ===== */}
      <div className="relative overflow-hidden rounded-[--radius-lg] bg-gradient-to-r from-violet/8 via-teal/5 to-emerald/8 border border-violet/15 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[--radius-md] bg-violet/15 flex items-center justify-center shrink-0">
            <Info size={16} className="text-violet" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-midnight">
              Platform commission · 12%
            </p>
            <p className="text-xs text-slate-light mt-1 leading-relaxed">
              Winipat deducts 12% from each delivered order; the remaining 88% is
              yours. Payouts are released to your registered bank account 48 hours
              after delivery confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* ===== KPI cards (gradient style) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn(
              "rounded-[--radius-lg] p-4 text-white bg-gradient-to-br",
              k.gradient
            )}
          >
            <div className="w-9 h-9 rounded-md bg-white/15 flex items-center justify-center mb-2">
              <k.icon size={18} />
            </div>
            <p className="text-lg lg:text-xl font-bold font-[family-name:var(--font-sora)] truncate">
              {loading ? (
                <span className="inline-block h-6 w-20 bg-white/20 rounded animate-pulse" />
              ) : (
                k.value
              )}
            </p>
            <p className="text-[11px] text-white/80 mt-1">{k.label}</p>
            <p className="text-[10px] text-white/50 mt-0.5 leading-tight">
              {k.hint}
            </p>
          </div>
        ))}
      </div>

      {/* ===== Earnings trend chart ===== */}
      <Card padding="md">
        <div className="flex items-center justify-between gap-3 mb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={16} className="text-violet" />
            Net earnings trend
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {(["30d", "90d", "12mo"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                  range === r
                    ? "border-violet bg-violet text-white"
                    : "border-mist bg-white text-slate hover:border-violet/40"
                )}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-40 bg-mist rounded-md animate-pulse" />
        ) : !hasChartData ? (
          <div className="h-40 flex flex-col items-center justify-center text-center">
            <Calendar size={28} className="text-mist-dark mb-2" />
            <p className="text-sm text-slate-light">
              No settled earnings in this range yet.
            </p>
            <p className="text-xs text-slate-lighter mt-1">
              Charts populate as orders complete.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-0.5 h-40">
              {chartBuckets.map((b, i) => (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-violet to-violet-light rounded-t hover:from-violet-dark transition-colors group relative"
                  style={{ height: `${(b.value / chartMax) * 100}%` }}
                >
                  <span className="hidden group-hover:block absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-midnight text-white px-2 py-0.5 rounded">
                    {formatNaira(b.value / 100)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-lighter">
              <span>{chartBuckets[0].label}</span>
              <span>{chartBuckets[chartBuckets.length - 1].label}</span>
            </div>
          </>
        )}
      </Card>

      {/* ===== Payout history ===== */}
      <Card padding="md">
        <CardTitle className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-violet" />
          Payout history
        </CardTitle>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-[--radius-md] bg-mist animate-pulse"
              />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet size={36} className="text-mist-dark mb-3" />
            <p className="font-semibold text-midnight">No payouts yet</p>
            <p className="text-sm text-slate-light mt-1 max-w-md">
              Once buyers confirm delivery and the 48-hour hold passes, your
              payouts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-lighter uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-lighter uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-slate-lighter uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-lighter uppercase tracking-wide hidden sm:table-cell">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist/60">
                {payouts.map((p) => {
                  const cfg = payoutStatusConfig[p.status];
                  return (
                    <tr key={p.id} className="hover:bg-cloud/50 transition-colors">
                      <td className="px-3 py-3 text-slate whitespace-nowrap">
                        {formatDate(p.processed_at ?? p.created_at)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-midnight whitespace-nowrap">
                        {formatNaira(p.amount / 100)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={cfg.variant} className="text-[10px]">
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-slate-light font-mono text-xs hidden sm:table-cell">
                        {p.reference ? (
                          <span className="inline-flex items-center gap-1">
                            <Hash size={11} />
                            {p.reference}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
