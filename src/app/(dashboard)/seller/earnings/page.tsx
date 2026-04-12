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
  Loader2,
} from "lucide-react";

const COMMISSION_RATE = 0.12;

interface EarningsSummary {
  grossSales: number;
  commissionDeducted: number;
  netEarnings: number;
  pendingSettlement: number;
  totalPaidOut: number;
}

interface Payout {
  id: string;
  created_at: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  reference: string | null;
}

const payoutStatusConfig: Record<
  Payout["status"],
  { label: string; variant: "warning" | "info" | "success" | "error" }
> = {
  pending: { label: "Pending", variant: "warning" },
  processing: { label: "Processing", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  failed: { label: "Failed", variant: "error" },
};

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
      if (!user) return;

      const [{ data: completedOrders }, { data: pendingOrders }, { data: payoutData }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("total_amount, commission_amount, net_seller_amount")
            .eq("seller_id", user.id)
            .in("status", ["completed", "delivered"]),
          supabase
            .from("orders")
            .select("net_seller_amount, total_amount")
            .eq("seller_id", user.id)
            .in("status", ["seller_preparing", "awaiting_pickup", "picked_up", "in_transit"]),
          supabase
            .from("seller_payouts")
            .select("id, created_at, amount, status, reference")
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

      const grossSales = (completedOrders || []).reduce(
        (sum, o) => sum + (o.total_amount || 0),
        0
      );
      const commissionDeducted = (completedOrders || []).reduce(
        (sum, o) => sum + (o.commission_amount || o.total_amount * COMMISSION_RATE || 0),
        0
      );
      const netEarningsFromCompleted = (completedOrders || []).reduce(
        (sum, o) => sum + (o.net_seller_amount || o.total_amount * (1 - COMMISSION_RATE) || 0),
        0
      );
      const pendingSettlement = (pendingOrders || []).reduce(
        (sum, o) =>
          sum + (o.net_seller_amount || o.total_amount * (1 - COMMISSION_RATE) || 0),
        0
      );
      const totalPaidOut = ((payoutData || []) as Payout[])
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      setSummary({
        grossSales,
        commissionDeducted,
        netEarnings: netEarningsFromCompleted,
        pendingSettlement,
        totalPaidOut,
      });

      setPayouts((payoutData as Payout[]) || []);
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
      hint: "Total value of completed orders",
    },
    {
      label: "Commission (12%)",
      value: formatNaira(summary.commissionDeducted),
      icon: Percent,
      color: "text-error",
      bg: "bg-error/10",
      hint: "Platform fee deducted",
    },
    {
      label: "Net Earnings",
      value: formatNaira(summary.netEarnings),
      icon: Wallet,
      color: "text-emerald",
      bg: "bg-emerald/10",
      hint: "After commission deduction",
    },
    {
      label: "Pending Settlement",
      value: formatNaira(summary.pendingSettlement),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-warning/10",
      hint: "Orders in progress, not yet released",
    },
    {
      label: "Total Paid Out",
      value: formatNaira(summary.totalPaidOut),
      icon: CheckCircle2,
      color: "text-emerald-dark",
      bg: "bg-emerald/15",
      hint: "Funds transferred to your bank",
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
            Winipat deducts 12% from each completed order. The remaining 88% is yours. Payouts are
            processed every Friday to your registered bank account.
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
                        {formatDate(payout.created_at)}
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
