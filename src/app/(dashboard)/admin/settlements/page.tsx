"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import { Wallet, Clock, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

type HoldStatus = "initiated" | "authorized" | "captured" | "held" | "release_eligible" | "released" | "refunded" | "disputed";

type Row = {
  id: string;
  amount: number;
  status: HoldStatus;
  release_eligible_at: string | null;
  released_at: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    seller: { id: string; business_name: string } | null;
  } | null;
};

const STATUS_VARIANTS: Record<HoldStatus, "warning" | "success" | "error" | "default"> = {
  initiated:        "default",
  authorized:       "default",
  captured:         "warning",
  held:             "warning",
  release_eligible: "warning",
  released:         "success",
  refunded:         "error",
  disputed:         "error",
};

export default function AdminSettlementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "held" | "release_eligible" | "released" | "disputed">(
    "release_eligible"
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("escrow_ledger")
      .select(
        `id, amount, status, release_eligible_at, released_at, created_at,
         order:orders!order_id(
           id, order_number,
           seller:sellers!seller_id(id, business_name)
         )`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    const shaped: Row[] = (data || []).map((r: Record<string, unknown>) => {
      const order = r.order as Row["order"] | Row["order"][] | null;
      const o = Array.isArray(order) ? order[0] ?? null : order;
      if (o) {
        const seller = o.seller as Row["order"] extends infer T
          ? T extends { seller: infer S } ? S | S[] | null : null
          : null;
        o.seller = Array.isArray(seller) ? seller[0] ?? null : seller;
      }
      return { ...(r as object), order: o } as Row;
    });

    setRows(shaped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  const stats = rows.reduce(
    (acc, r) => {
      if (r.status === "held" || r.status === "captured") acc.held += r.amount;
      if (r.status === "release_eligible") acc.eligible += r.amount;
      if (r.status === "released") acc.released += r.amount;
      return acc;
    },
    { held: 0, eligible: 0, released: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Settlements
          </h1>
          <p className="mt-0.5 text-sm text-slate-light">
            Live escrow ledger. Approved sellers are paid out via the{" "}
            <Link href="/admin/payouts" className="text-violet hover:underline">
              payouts queue
            </Link>
            .
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[--radius-md] border border-mist text-xs text-slate hover:border-violet/40"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Currently held", value: stats.held / 100, icon: Clock, color: "text-warn" },
          { label: "Eligible to release", value: stats.eligible / 100, icon: AlertTriangle, color: "text-violet" },
          { label: "Released (lifetime)", value: stats.released / 100, icon: CheckCircle2, color: "text-emerald" },
        ].map((s) => (
          <Card key={s.label} padding="md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-lighter">
                  {s.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-midnight font-[family-name:var(--font-sora)]">
                  {formatNaira(s.value)}
                </p>
              </div>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "release_eligible", label: "Eligible" },
            { key: "held",             label: "Held" },
            { key: "released",         label: "Released" },
            { key: "disputed",         label: "Disputed" },
            { key: "all",              label: "All" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === f.key
                ? "border-violet bg-violet text-white"
                : "border-mist bg-white text-slate hover:border-violet/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-mist rounded-[--radius-md] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-12 text-center">
          <Wallet className="mx-auto mb-3 text-slate-lighter" size={28} />
          <p className="text-sm font-medium text-midnight">
            No settlements in this filter.
          </p>
        </div>
      ) : (
        <Card padding="sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs text-slate-lighter uppercase">
                <tr className="border-b border-mist">
                  <th className="text-left font-medium py-2 px-3">Order</th>
                  <th className="text-left font-medium py-2 px-3">Seller</th>
                  <th className="text-right font-medium py-2 px-3">Amount</th>
                  <th className="text-left font-medium py-2 px-3">Status</th>
                  <th className="text-left font-medium py-2 px-3">Created</th>
                  <th className="text-left font-medium py-2 px-3">Released</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-mist/60 last:border-0">
                    <td className="py-2 px-3 font-medium text-midnight">
                      {r.order?.order_number || "—"}
                    </td>
                    <td className="py-2 px-3 text-slate">
                      {r.order?.seller?.business_name || "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-midnight">
                      {formatNaira(r.amount / 100)}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={STATUS_VARIANTS[r.status] || "default"}
                        className="text-[10px] capitalize"
                      >
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-slate-light text-xs">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="py-2 px-3 text-slate-light text-xs">
                      {r.released_at ? formatDate(r.released_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
