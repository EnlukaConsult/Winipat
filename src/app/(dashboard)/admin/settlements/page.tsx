"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  Wallet,
  Clock,
  CheckCircle2,
  TrendingUp,
  Search,
  Play,
  Zap,
  Filter,
  ArrowDownToLine,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

type HoldStatus = "held" | "eligible" | "released" | "disputed";

interface Settlement {
  id: string;
  orderNumber: string;
  sellerName: string;
  businessName: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  holdStatus: HoldStatus;
  heldSince: string;
  eligibleDate: string;
  releasedDate?: string;
}

interface PayoutHistoryItem {
  id: string;
  businessName: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
  status: "completed" | "pending" | "failed";
}

const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: "set1", orderNumber: "ORD-2839", sellerName: "Adaeze Okonkwo", businessName: "Adaeze Crafts",
    grossAmount: 28_000, commission: 2_240, netAmount: 25_760,
    holdStatus: "eligible", heldSince: "2026-03-26T10:00:00Z", eligibleDate: "2026-04-10T10:00:00Z",
  },
  {
    id: "set2", orderNumber: "ORD-2835", sellerName: "Obiora Chukwu", businessName: "Chukwu Electronics",
    grossAmount: 84_500, commission: 6_760, netAmount: 77_740,
    holdStatus: "eligible", heldSince: "2026-03-28T12:30:00Z", eligibleDate: "2026-04-11T12:30:00Z",
  },
  {
    id: "set3", orderNumber: "ORD-2830", sellerName: "Adaeze Okonkwo", businessName: "Adaeze Crafts",
    grossAmount: 15_500, commission: 1_240, netAmount: 14_260,
    holdStatus: "held", heldSince: "2026-04-02T09:15:00Z", eligibleDate: "2026-04-16T09:15:00Z",
  },
  {
    id: "set4", orderNumber: "ORD-2825", sellerName: "Obiora Chukwu", businessName: "Chukwu Electronics",
    grossAmount: 120_000, commission: 9_600, netAmount: 110_400,
    holdStatus: "held", heldSince: "2026-04-05T14:00:00Z", eligibleDate: "2026-04-19T14:00:00Z",
  },
  {
    id: "set5", orderNumber: "ORD-2808", sellerName: "Babatunde Folarin", businessName: "QuickDeals NG",
    grossAmount: 14_000, commission: 1_120, netAmount: 12_880,
    holdStatus: "disputed", heldSince: "2026-03-20T11:00:00Z", eligibleDate: "2026-04-03T11:00:00Z",
  },
  {
    id: "set6", orderNumber: "ORD-2797", sellerName: "Adaeze Okonkwo", businessName: "Adaeze Crafts",
    grossAmount: 32_000, commission: 2_560, netAmount: 29_440,
    holdStatus: "released", heldSince: "2026-03-15T08:00:00Z", eligibleDate: "2026-03-29T08:00:00Z",
    releasedDate: "2026-03-29T10:45:00Z",
  },
];

const MOCK_PAYOUT_HISTORY: PayoutHistoryItem[] = [
  { id: "p1", businessName: "Adaeze Crafts", amount: 29_440, date: "2026-03-29T10:45:00Z", method: "Bank Transfer", reference: "PAY-001-XYZ", status: "completed" },
  { id: "p2", businessName: "Chukwu Electronics", amount: 77_740, date: "2026-03-28T14:00:00Z", method: "Bank Transfer", reference: "PAY-002-ABC", status: "completed" },
  { id: "p3", businessName: "Lagos Fabrics Hub", amount: 18_200, date: "2026-03-27T11:30:00Z", method: "Bank Transfer", reference: "PAY-003-DEF", status: "completed" },
  { id: "p4", businessName: "Abuja Pottery Co.", amount: 7_560, date: "2026-03-26T09:00:00Z", method: "Bank Transfer", reference: "PAY-004-GHI", status: "failed" },
  { id: "p5", businessName: "Chukwu Electronics", amount: 55_000, date: "2026-03-25T16:00:00Z", method: "Bank Transfer", reference: "PAY-005-JKL", status: "completed" },
];

const HOLD_BADGE: Record<HoldStatus, React.ReactElement> = {
  held: <Badge variant="warning">Held</Badge>,
  eligible: <Badge variant="success">Eligible</Badge>,
  released: <Badge variant="info">Released</Badge>,
  disputed: <Badge variant="error">Disputed</Badge>,
};

const PAYOUT_STATUS_BADGE: Record<PayoutHistoryItem["status"], React.ReactElement> = {
  completed: <Badge variant="success">Completed</Badge>,
  pending: <Badge variant="warning">Pending</Badge>,
  failed: <Badge variant="error">Failed</Badge>,
};

export default function AdminSettlementsPage() {
  const [search, setSearch] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchLastRun, setBatchLastRun] = useState("2026-04-12T06:00:00Z");
  const [settlements, setSettlements] = useState<Settlement[]>(MOCK_SETTLEMENTS);
  const [payoutFilter, setPayoutFilter] = useState<"all" | "completed" | "failed">("all");

  const totalHeld = settlements
    .filter((s) => s.holdStatus === "held" || s.holdStatus === "eligible" || s.holdStatus === "disputed")
    .reduce((sum, s) => sum + s.netAmount, 0);
  const pendingRelease = settlements
    .filter((s) => s.holdStatus === "eligible")
    .reduce((sum, s) => sum + s.netAmount, 0);
  const releasedToday = settlements
    .filter((s) => s.holdStatus === "released" && s.releasedDate && new Date(s.releasedDate).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.netAmount, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission, 0);

  const filteredSettlements = settlements.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.businessName.toLowerCase().includes(q) || s.orderNumber.toLowerCase().includes(q);
  });

  const filteredPayouts = MOCK_PAYOUT_HISTORY.filter(
    (p) => payoutFilter === "all" || p.status === payoutFilter
  );

  function releaseSettlement(id: string) {
    setSettlements((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, holdStatus: "released" as HoldStatus, releasedDate: new Date().toISOString() }
          : s
      )
    );
  }

  function runBatch() {
    setBatchRunning(true);
    setTimeout(() => {
      setBatchRunning(false);
      setBatchLastRun(new Date().toISOString());
      setSettlements((prev) =>
        prev.map((s) =>
          s.holdStatus === "eligible"
            ? { ...s, holdStatus: "released" as HoldStatus, releasedDate: new Date().toISOString() }
            : s
        )
      );
    }, 2000);
  }

  const summaryCards = [
    { label: "Total Held", value: formatNaira(totalHeld), icon: <Wallet className="h-5 w-5" />, bg: "bg-midnight/5", color: "text-midnight" },
    { label: "Pending Release", value: formatNaira(pendingRelease), icon: <Clock className="h-5 w-5" />, bg: "bg-warning/10", color: "text-amber-700" },
    { label: "Released Today", value: formatNaira(releasedToday), icon: <CheckCircle2 className="h-5 w-5" />, bg: "bg-emerald/10", color: "text-emerald-dark" },
    { label: "Total Commission", value: formatNaira(totalCommission), icon: <TrendingUp className="h-5 w-5" />, bg: "bg-gold/20", color: "text-amber-700" },
  ];

  return (
    <div className="space-y-8">
      {/* Heading + Batch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Settlement Management
          </h1>
          <p className="mt-1 text-sm text-slate-light">
            Manage escrow releases and seller payouts
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="gold"
            size="sm"
            loading={batchRunning}
            onClick={runBatch}
          >
            <Play className="mr-2 h-4 w-4" />
            {batchRunning ? "Running Batch…" : "Run Daily Batch"}
          </Button>
          <p className="text-xs text-slate-lighter">
            Last run: {formatDate(batchLastRun)}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-[--radius-lg]">
            <div className={cn("mb-3 inline-flex rounded-[--radius-md] p-2.5", card.bg)}>
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className="font-[family-name:var(--font-sora)] text-xl font-bold text-midnight">
              {card.value}
            </p>
            <p className="mt-0.5 text-sm text-slate-light">{card.label}</p>
          </Card>
        ))}
      </div>

      {/* Settlement Queue */}
      <Card className="rounded-[--radius-lg]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Settlement Queue</CardTitle>
              <CardDescription>Pending and eligible escrow releases</CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search by order or seller…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mist text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-light">Order</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Seller</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Gross</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Commission</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Net Amount</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Status</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Eligible Date</th>
                <th className="pb-3 font-semibold text-slate-light">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {filteredSettlements.map((s) => (
                <tr key={s.id} className="text-slate">
                  <td className="py-3 pr-4 font-medium text-midnight">#{s.orderNumber}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-midnight">{s.businessName}</p>
                    <p className="text-xs text-slate-lighter">{s.sellerName}</p>
                  </td>
                  <td className="py-3 pr-4">{formatNaira(s.grossAmount)}</td>
                  <td className="py-3 pr-4 text-amber-700">{formatNaira(s.commission)}</td>
                  <td className="py-3 pr-4 font-semibold text-midnight">{formatNaira(s.netAmount)}</td>
                  <td className="py-3 pr-4">{HOLD_BADGE[s.holdStatus]}</td>
                  <td className="py-3 pr-4 text-slate-light">{formatDate(s.eligibleDate)}</td>
                  <td className="py-3">
                    {s.holdStatus === "eligible" ? (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => releaseSettlement(s.id)}
                      >
                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                        Release
                      </Button>
                    ) : s.holdStatus === "held" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => releaseSettlement(s.id)}
                        title="Manual override — release before eligible date"
                      >
                        <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                        Override
                      </Button>
                    ) : s.holdStatus === "released" ? (
                      <span className="flex items-center gap-1 text-emerald text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Released
                      </span>
                    ) : (
                      <span className="text-xs text-slate-lighter">Blocked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payout History */}
      <Card className="rounded-[--radius-lg]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Past seller disbursements</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 rounded-[--radius-sm] bg-mist p-1 text-sm">
                {(["all", "completed", "failed"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPayoutFilter(f)}
                    className={cn(
                      "rounded-[--radius-sm] px-3 py-1 font-medium capitalize transition-all",
                      payoutFilter === f
                        ? "bg-white text-midnight shadow-sm"
                        : "text-slate-light hover:text-slate"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline">
                <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mist text-left">
                <th className="pb-3 pr-4 font-semibold text-slate-light">Seller</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Amount</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Date</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Method</th>
                <th className="pb-3 pr-4 font-semibold text-slate-light">Reference</th>
                <th className="pb-3 font-semibold text-slate-light">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {filteredPayouts.map((p) => (
                <tr key={p.id} className="text-slate">
                  <td className="py-3 pr-4 font-medium text-midnight">{p.businessName}</td>
                  <td className="py-3 pr-4 font-semibold text-midnight">{formatNaira(p.amount)}</td>
                  <td className="py-3 pr-4 text-slate-light">{formatDate(p.date)}</td>
                  <td className="py-3 pr-4">{p.method}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-slate-lighter">{p.reference}</td>
                  <td className="py-3">{PAYOUT_STATUS_BADGE[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
