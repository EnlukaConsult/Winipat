"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  Percent,
  Wallet,
  Clock,
  CheckCircle2,
  BarChart3,
  Info,
} from "lucide-react";

// Default commission rate per FRD (BR-040). Falls back to this when no
// commissions row exists yet for a given order (e.g. an order that
// hasn't completed yet, or pre-commissions-table data).
const DEFAULT_COMMISSION_RATE = 0.12;

interface EarningsSummary {
  grossSales: number;          // kobo
  commissionDeducted: number;  // kobo
  netEarnings: number;         // kobo
  pendingSettlement: number;   // kobo (in-flight orders, net of commission)
  totalPaidOut: number;        // kobo
}

// Matches Postgres payout_status enum exactly.
type PayoutStatus = "pending" | "processing" | "completed" | "failed";

interface Payout {
  id: string;
  created_at: string;
  amount: number;            // kobo
  status: PayoutStatus;
  reference: string | null;
  processed_at: string | null;
}

const payoutStatusConfig: Record<
  PayoutStatus,
  { label: string; variant: "warning" | "info" | "success" | "error" }
> = {
  pending:    { label: "Pending",    variant: "warning" },
  processing: { label: "Processing", variant: "info" },
  completed:  { label: "Paid",       variant: "success" },
  failed:     { label: "Failed",     variant: "error" },
};

// Orders considered "settled" — escrow released, commission paid, money
// owed to the seller. (delivered counts because buyer can still confirm-or-auto-confirm.)
const SETTLED_ORDER_STATUSES = ["completed", "delivered"] as const;

// Orders considered "in flight" — money will eventually be owed but escrow
// hasn't released yet.
const IN_FLIGHT_ORDER_STATUSES = [
  "seller_preparing",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
] as const;

export default function SellerEarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary>({
    grossSales: 0,
    commissionDeducted: 0,
    netEarnings: 0,
    pendingSettlement: 0,
    totalPaidOut: 0,
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Pull settled + in-flight orders alongside their commission rows.
      // commissions.order_id is UNIQUE so the join is 1:0..1.
      const [settledResult, inFlightResult, payoutsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, commissions ( amount )")
          .eq("seller_id", user.id)
          .in("status", SETTLED_ORDER_STATUSES as unknown as string[]),
        supabase
          .from("orders")
          .select("id, total")
          .eq("seller_id", user.id)
          .in("status", IN_FLIGHT_ORDER_STATUSES as unknown as string[]),
        supabase
          .from("payouts")
          .select("id, created_at, amount, status, reference, processed_at")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      type SettledRow = { id: string; total: number; commissions: { amount: number } | { amount: number }[] | null };
      type InFlightRow = { id: string; total: number };

      const settled  = (settledResult.data  ?? []) as SettledRow[];
      const inFlight = (inFlightResult.data ?? []) as InFlightRow[];
      const payoutList = (payoutsResult.data ?? []) as Payout[];

      // ── Gross sales = sum of totals on settled orders ─────────────
      const grossSales = settled.reduce((s, o) => s + (o.total ?? 0), 0);

      // ── Commission = use commissions.amount when present, else 12% fallback ──
      const commissionDeducted = settled.reduce((sum, o) => {
        // Supabase may return the joined relation as an object OR a single-element array
        const c = Array.isArray(o.commissions) ? o.commissions[0] : o.commissions;
        if (c?.amount) return sum + c.amount;
        return sum + Math.round((o.total ?? 0) * DEFAULT_COMMISSION_RATE);
      }, 0);

      // ── Net = gross - commission ──
      const netEarnings = grossSales - commissionDeducted;

      // ── Pending settlement = in-flight orders, net of 12% ──
      const pendingSettlement = inFlight.reduce(
        (sum, o) => sum + Math.round((o.total ?? 0) * (1 - DEFAULT_COMMISSION_RATE)),
        0,
      );

      // ── Total paid out = sum of completed payout amounts ──
      const totalPaidOut = payoutList
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + (p.amount ?? 0), 0);

      setSummary({ grossSales, commissionDeducted, netEarnings, pendingSettlement, totalPaidOut });
      setPayouts(payoutList);
      setLoading(false);
    }
    load();
  }, []);

  const summaryCards = [
    {
      label: "Gross Sales",
      value: formatNaira(summary.grossSales),
      icon: TrendingUp,
      color: "text-royal",
      bg: "bg-royal/10",
      hint: "Total value of delivered + completed orders",
    },
    {
      label: "Commission (12%)",
      value: formatNaira(summary.commissionDeducted),
      icon: Percent,
      color: "text-error",
      bg: "bg-error/10",
      hint: "Platform fee deducted at settlement",
    },
    {
      label: "Net Earnings",
      value: formatNaira(summary.netEarnings),
      icon: Wallet,
      color: "text-emerald",
      bg: "bg-emerald/10",
      hint: "Total earned after commission",
    },
    {
      label: "Pending Settlement",
      value: formatNaira(summary.pendingSettlement),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-warning/10",
      hint: "In-flight orders, not yet released from escrow",
    },
    {
      label: "Total Paid Out",
      value: formatNaira(summary.totalPaidOut),
      icon: CheckCircle2,
      color: "text-emerald-dark",
      bg: "bg-emerald/15",
      hint: "Funds successfully transferred to your bank",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Earnings
        </h1>
        <p className="text-slate-light mt-1">
          Track your revenue, commissions, and payout history.
        </p>
      </div>

      {/* Commission Info Banner */}
      <div className="rounded-[--radius-lg] bg-royal/8 border border-royal/20 px-5 py-4 flex items-start gap-3">
        <Info size={16} className="text-royal mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-midnight">Platform Commission Rate: 12%</p>
          <p className="text-sm text-slate-light mt-0.5">
            Winipat deducts 12% from each delivered order. The remaining 88% is yours. Payouts are
            processed in daily batches to your registered bank account, 48 hours after delivery confirmation.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-[--radius-lg] bg-mist animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="relative group" hover>
              <div className="flex items-start justify-between mb-3">
                <div className={`rounded-[--radius-md] p-2.5 ${card.bg}`}>
                  <card.icon size={18} className={card.color} />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-light uppercase tracking-wide">
                {card.label}
              </p>
              <p className="mt-1.5 font-[family-name:var(--font-sora)] text-xl font-bold text-midnight">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-lighter">{card.hint}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings Over Time</CardTitle>
          <CardDescription>Your net earnings trend by week</CardDescription>
        </CardHeader>
        <div className="flex flex-col items-center justify-center h-48 rounded-[--radius-md] bg-cloud border border-mist gap-3">
          <BarChart3 size={36} className="text-mist-dark" />
          <p className="text-sm text-slate-light">Chart coming soon</p>
        </div>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>Bank transfers made to your account</CardDescription>
        </CardHeader>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-[--radius-md] bg-mist animate-pulse" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet size={36} className="text-mist-dark mb-3" />
            <p className="font-semibold text-midnight">No payouts yet</p>
            <p className="text-sm text-slate-light mt-1">
              Your payout history will appear here once transfers are processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mist">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-light uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-light uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-light uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-light uppercase tracking-wide hidden sm:table-cell">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {payouts.map((payout) => {
                  const config = payoutStatusConfig[payout.status];
                  return (
                    <tr key={payout.id} className="hover:bg-cloud transition-colors">
                      <td className="px-6 py-4 text-slate whitespace-nowrap">
                        {formatDate(payout.processed_at ?? payout.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-midnight whitespace-nowrap">
                        {formatNaira(payout.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-light font-mono text-xs hidden sm:table-cell">
                        {payout.reference || "—"}
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
