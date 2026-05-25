"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Hash,
} from "lucide-react";

type PayoutStatus = "pending" | "processing" | "completed" | "failed";

type Payout = {
  id: string;
  amount: number;
  status: PayoutStatus;
  reference: string | null;
  processed_at: string | null;
  created_at: string;
  seller: { id: string; business_name: string } | null;
  bank: {
    bank_name: string;
    account_number: string;
    account_name: string;
  } | null;
};

const STATUS_VARIANTS: Record<PayoutStatus, "warning" | "success" | "error" | "default"> = {
  pending:    "warning",
  processing: "default",
  completed:  "success",
  failed:     "error",
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "processing" | "completed" | "failed" | "all">(
    "pending"
  );
  const [refById, setRefById] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("payouts")
      .select(
        `id, amount, status, reference, processed_at, created_at,
         seller:sellers!seller_id(id, business_name),
         bank:bank_accounts!bank_account_id(bank_name, account_number, account_name)`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    const shaped: Payout[] = (data || []).map((r: Record<string, unknown>) => {
      const seller = r.seller as Payout["seller"] | Payout["seller"][] | null;
      const bank = r.bank as Payout["bank"] | Payout["bank"][] | null;
      return {
        ...(r as object),
        seller: Array.isArray(seller) ? seller[0] ?? null : seller,
        bank:   Array.isArray(bank)   ? bank[0]   ?? null : bank,
      } as Payout;
    });
    setPayouts(shaped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = payouts.filter((p) => filter === "all" || p.status === filter);

  async function mark(id: string, status: "processing" | "completed" | "failed") {
    const reference = refById[id]?.trim();
    if (status === "completed" && !reference) {
      alert("Paste the bank transfer reference before marking as completed.");
      return;
    }
    setActionLoading(id);
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reference }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Failed to update payout.");
      return;
    }
    await load();
  }

  const stats = payouts.reduce(
    (acc, p) => {
      if (p.status === "pending")    acc.pending    += p.amount;
      if (p.status === "processing") acc.processing += p.amount;
      if (p.status === "completed")  acc.completed  += p.amount;
      return acc;
    },
    { pending: 0, processing: 0, completed: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Payouts
          </h1>
          <p className="mt-0.5 text-sm text-slate-light">
            Process seller payouts. Auto-release cron creates pending rows; admin
            wires the bank transfer and pastes the reference.
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
          { label: "Pending",    value: stats.pending / 100,    color: "text-warn"    },
          { label: "Processing", value: stats.processing / 100, color: "text-violet" },
          { label: "Completed (lifetime)", value: stats.completed / 100, color: "text-emerald" },
        ].map((s) => (
          <Card key={s.label} padding="md">
            <p className="text-xs uppercase tracking-wide text-slate-lighter">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-bold font-[family-name:var(--font-sora)]", s.color)}>
              {formatNaira(s.value)}
            </p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "pending",    label: "Pending"    },
            { key: "processing", label: "Processing" },
            { key: "completed",  label: "Completed"  },
            { key: "failed",     label: "Failed"     },
            { key: "all",        label: "All"        },
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-mist rounded-[--radius-md] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-12 text-center">
          <Banknote className="mx-auto mb-3 text-slate-lighter" size={28} />
          <p className="text-sm font-medium text-midnight">No payouts in this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Card key={p.id} padding="md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-midnight">
                      {p.seller?.business_name || "—"}
                    </p>
                    <Badge variant={STATUS_VARIANTS[p.status]} className="text-[10px] capitalize">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-light mt-1 flex items-center gap-1.5">
                    <Building2 size={12} />
                    {p.bank
                      ? `${p.bank.bank_name} · ${p.bank.account_number} · ${p.bank.account_name}`
                      : "No bank on file"}
                  </p>
                  <p className="text-[11px] text-slate-lighter mt-0.5 flex items-center gap-1.5">
                    Created {formatDate(p.created_at)}
                    {p.reference && (
                      <>
                        <span className="mx-1">·</span>
                        <Hash size={11} />
                        {p.reference}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xl font-bold text-violet">
                    {formatNaira(p.amount / 100)}
                  </span>
                </div>
              </div>

              {(p.status === "pending" || p.status === "processing") && (
                <div className="mt-3 border-t border-mist pt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Bank transfer reference"
                      placeholder="e.g. PSK-TR_abc123"
                      value={refById[p.id] ?? p.reference ?? ""}
                      onChange={(e) =>
                        setRefById((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex gap-2">
                    {p.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mark(p.id, "processing")}
                        loading={actionLoading === p.id}
                      >
                        <Clock size={14} className="mr-1.5" />
                        Processing
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => mark(p.id, "completed")}
                      loading={actionLoading === p.id}
                    >
                      <CheckCircle2 size={14} className="mr-1.5" />
                      Completed
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-error hover:bg-error/10"
                      onClick={() => mark(p.id, "failed")}
                      loading={actionLoading === p.id}
                    >
                      <XCircle size={14} className="mr-1.5" />
                      Failed
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
