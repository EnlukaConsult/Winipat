"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatNaira, formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  SplitSquareVertical,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";

type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_seller"
  | "resolved_buyer"
  | "resolved_partial";

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  order: {
    id: string;
    order_number: string;
    total: number;
    subtotal: number;
    buyer: { id: string; full_name: string; email: string } | null;
    seller: { id: string; business_name: string } | null;
  } | null;
  evidence: { id: string; file_url: string; description: string | null }[];
  messages: { id: string; sender_id: string; content: string; created_at: string }[];
};

const STATUS_LABEL: Record<DisputeStatus, { label: string; variant: "warning" | "success" | "error" | "default" }> = {
  open:             { label: "Open",             variant: "warning" },
  under_review:     { label: "Under review",     variant: "warning" },
  resolved_seller:  { label: "Released to seller", variant: "success" },
  resolved_buyer:   { label: "Refunded to buyer",  variant: "error"   },
  resolved_partial: { label: "Partial refund",     variant: "default" },
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [partialAmountById, setPartialAmountById] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("disputes")
      .select(
        `id, reason, description, status, admin_notes, created_at, resolved_at,
         order:orders!order_id(
           id, order_number, total, subtotal,
           buyer:profiles!buyer_id(id, full_name, email),
           seller:sellers!seller_id(id, business_name)
         ),
         evidence:dispute_evidence(id, file_url, description),
         messages:dispute_messages(id, sender_id, content, created_at)`
      )
      .order("created_at", { ascending: false });

    const rows = (data || []).map((r: Record<string, unknown>) => {
      const order = r.order as Dispute["order"] | Dispute["order"][] | null;
      const o = Array.isArray(order) ? order[0] ?? null : order;
      if (o) {
        const buyer = o.buyer as Dispute["order"] extends infer T
          ? T extends { buyer: infer B } ? B | B[] | null : null
          : null;
        const seller = o.seller;
        const ob = Array.isArray(buyer)  ? buyer[0]  ?? null : buyer;
        const os = Array.isArray(seller) ? seller[0] ?? null : seller;
        o.buyer = ob;
        o.seller = os;
      }
      return { ...r, order: o } as Dispute;
    });

    setDisputes(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = disputes.filter((d) => {
    if (filter === "open") return d.status === "open" || d.status === "under_review";
    if (filter === "resolved") return d.status.startsWith("resolved");
    return true;
  });

  async function resolve(
    disputeId: string,
    resolution: "release_to_seller" | "full_refund" | "partial_refund"
  ) {
    const notes = notesById[disputeId];
    const refundAmount =
      resolution === "partial_refund"
        ? Math.round(parseFloat(partialAmountById[disputeId] || "0") * 100)
        : undefined;

    if (!notes?.trim()) {
      alert("Please add resolution notes before proceeding.");
      return;
    }
    if (resolution === "partial_refund" && (!refundAmount || refundAmount <= 0)) {
      alert("Enter a partial refund amount in Naira.");
      return;
    }

    setActionLoading(disputeId);
    const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution, refundAmount, notes }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Failed to resolve dispute.");
      return;
    }
    await load();
  }

  const counts = disputes.reduce(
    (acc, d) => {
      if (d.status === "open" || d.status === "under_review") acc.open++;
      if (d.status.startsWith("resolved")) acc.resolved++;
      return acc;
    },
    { open: 0, resolved: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Disputes
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Review buyer disputes and decide on refunds or releases.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            { key: "open",     label: `Open (${counts.open})` },
            { key: "resolved", label: `Resolved (${counts.resolved})` },
            { key: "all",      label: "All" },
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-mist rounded-[--radius-md] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-12 text-center">
          <AlertTriangle className="mx-auto mb-3 text-slate-lighter" size={28} />
          <p className="text-sm font-medium text-midnight">No disputes in this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const expanded = expandedId === d.id;
            const styleConfig = STATUS_LABEL[d.status];
            return (
              <Card key={d.id} padding="sm">
                <button
                  onClick={() => setExpandedId(expanded ? null : d.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-midnight">
                      Order #{d.order?.order_number ?? "—"}
                    </p>
                    <p className="text-xs text-slate-light mt-0.5">
                      {d.order?.buyer?.full_name || "Buyer"} vs{" "}
                      {d.order?.seller?.business_name || "Seller"} ·{" "}
                      {d.reason} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-violet">
                      {formatNaira((d.order?.total || 0) / 100)}
                    </span>
                    <Badge variant={styleConfig.variant} className="text-[10px]">
                      {styleConfig.label}
                    </Badge>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 border-t border-mist pt-4 space-y-4">
                    {d.description && (
                      <div>
                        <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                          <MessageSquare size={12} />
                          Buyer&apos;s claim
                        </CardTitle>
                        <p className="text-sm text-slate bg-cloud rounded-[--radius-md] px-3 py-2">
                          {d.description}
                        </p>
                      </div>
                    )}

                    {d.messages.length > 0 && (
                      <div>
                        <CardTitle className="text-xs uppercase tracking-wide mb-2">
                          Conversation
                        </CardTitle>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {d.messages.map((m) => (
                            <div key={m.id} className="text-xs bg-cloud rounded-[--radius-md] px-3 py-2">
                              <span className="text-slate-lighter mr-2">
                                {formatDate(m.created_at)}
                              </span>
                              {m.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.evidence.length > 0 && (
                      <div>
                        <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <ImageIcon size={12} />
                          Evidence
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          {d.evidence.map((e) => (
                            <a
                              key={e.id}
                              href={e.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1.5 rounded-full border border-mist bg-white hover:border-violet/40 text-violet"
                            >
                              View file
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.status.startsWith("resolved") ? (
                      <div className="text-xs text-slate-light bg-cloud rounded-[--radius-md] px-3 py-2">
                        Resolved {d.resolved_at && formatDate(d.resolved_at)} —{" "}
                        {d.admin_notes || "no notes"}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Resolution notes (visible internally; summarized to both parties)…"
                          rows={2}
                          value={notesById[d.id] ?? ""}
                          onChange={(e) =>
                            setNotesById((m) => ({ ...m, [d.id]: e.target.value }))
                          }
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => resolve(d.id, "release_to_seller")}
                            loading={actionLoading === d.id}
                          >
                            <CheckCircle2 size={14} className="mr-1.5" />
                            Release to seller
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolve(d.id, "full_refund")}
                            loading={actionLoading === d.id}
                          >
                            <RotateCcw size={14} className="mr-1.5" />
                            Full refund
                          </Button>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Partial ₦"
                              value={partialAmountById[d.id] ?? ""}
                              onChange={(e) =>
                                setPartialAmountById((m) => ({
                                  ...m,
                                  [d.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolve(d.id, "partial_refund")}
                              loading={actionLoading === d.id}
                            >
                              <SplitSquareVertical size={14} className="mr-1.5" />
                              Apply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
