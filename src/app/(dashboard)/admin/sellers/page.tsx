"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import {
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Ban,
  FileText,
  Building2,
  Phone,
  Mail,
  Shield,
  AlertCircle,
} from "lucide-react";

type SellerStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

type Seller = {
  id: string;
  business_name: string;
  description: string | null;
  status: SellerStatus;
  admin_notes: string | null;
  approved_at: string | null;
  created_at: string;
  pickup_city: string | null;
  pickup_state: string | null;
  profile: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  kyc_docs: {
    id: string;
    document_type: string;
    file_url: string;
    status: string;
  }[];
  trust: {
    average_rating: number;
    total_reviews: number;
    dispute_rate: number;
  } | null;
  bank: {
    bank_name: string;
    account_number: string;
    account_name: string;
    is_verified: boolean;
  } | null;
};

const STATUS_STYLES: Record<SellerStatus, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  draft:        { label: "Draft",         variant: "default" },
  submitted:    { label: "Submitted",     variant: "warning" },
  under_review: { label: "Under review",  variant: "warning" },
  approved:     { label: "Approved",      variant: "success" },
  rejected:     { label: "Rejected",      variant: "error" },
};

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SellerStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("sellers")
      .select(
        `id, business_name, description, status, admin_notes, approved_at, created_at,
         pickup_city, pickup_state,
         profile:profiles!id(full_name, email, phone),
         kyc_docs:seller_kyc_documents(id, document_type, file_url, status),
         trust:trust_scores(average_rating, total_reviews, dispute_rate),
         bank:bank_accounts(bank_name, account_number, account_name, is_verified)`
      )
      .order("created_at", { ascending: false });

    const rows = (data || []).map((r: Record<string, unknown>) => {
      const profile = r.profile as Seller["profile"] | Seller["profile"][] | null;
      const trust = r.trust as Seller["trust"] | Seller["trust"][] | null;
      const bank = r.bank as Seller["bank"] | Seller["bank"][] | null;
      return {
        ...r,
        profile: Array.isArray(profile) ? profile[0] ?? null : profile,
        trust:   Array.isArray(trust)   ? trust[0]   ?? null : trust,
        bank:    Array.isArray(bank)    ? bank[0]    ?? null : bank,
      } as Seller;
    });

    setSellers(rows);
    setLoading(false);
  }, []);

  // KYC files live in a PRIVATE bucket, so a stored public URL is a dead link.
  // Derive the object path (works for both legacy public-URL rows and newer
  // path-only rows) and mint a short-lived signed URL to view it.
  async function viewDoc(fileUrl: string) {
    const supabase = createClient();
    const marker = "/kyc-documents/";
    const idx = fileUrl.indexOf(marker);
    const path = idx >= 0 ? fileUrl.slice(idx + marker.length) : fileUrl;
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      alert(`Couldn't open document: ${error?.message ?? "unknown error"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    load();
  }, [load]);

  const filtered = sellers.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.business_name?.toLowerCase().includes(q) ||
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.profile?.email?.toLowerCase().includes(q)
    );
  });

  async function setStatus(
    sellerId: string,
    status: "approved" | "rejected" | "under_review"
  ) {
    const notes = notesById[sellerId];
    if ((status === "rejected" || status === "under_review") && !notes?.trim()) {
      alert("Please add admin notes explaining the decision before proceeding.");
      return;
    }
    setActionLoading(sellerId);
    const res = await fetch(`/api/admin/sellers/${sellerId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: notes ?? "" }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Failed to update seller status.");
      return;
    }
    await load();
  }

  const counts = sellers.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
          Sellers
        </h1>
        <p className="mt-0.5 text-sm text-slate-light">
          Review KYC, approve sellers, and manage suspensions.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "submitted", "under_review", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              statusFilter === s
                ? "border-violet bg-violet text-white"
                : "border-mist bg-white text-slate hover:border-violet/40"
            )}
          >
            {s === "all" ? "All" : STATUS_STYLES[s].label}
            {s !== "all" && counts[s] ? ` · ${counts[s]}` : ""}
          </button>
        ))}
        <div className="ml-auto w-64">
          <Input
            placeholder="Search name, business, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-mist rounded-[--radius-md] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-12 text-center">
          <AlertCircle className="mx-auto mb-3 text-slate-lighter" size={28} />
          <p className="text-sm font-medium text-midnight">No sellers match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const styleConfig = STATUS_STYLES[s.status];
            const expanded = expandedId === s.id;
            return (
              <Card key={s.id} padding="sm">
                <button
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="w-full flex items-start justify-between gap-4 text-left"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-violet/10 text-violet flex items-center justify-center font-bold">
                      {s.business_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-midnight truncate">
                        {s.business_name}
                      </p>
                      <p className="text-xs text-slate-light truncate">
                        {s.profile?.full_name || "—"} · {s.profile?.email || "—"}
                      </p>
                      <p className="text-[11px] text-slate-lighter mt-0.5">
                        Joined {formatDate(s.created_at)} · {s.kyc_docs.length} doc
                        {s.kyc_docs.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={styleConfig.variant} className="text-[10px]">
                      {styleConfig.label}
                    </Badge>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 border-t border-mist pt-4 space-y-4">
                    {/* Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-light">
                        <Building2 size={14} />
                        {s.pickup_city || "—"}, {s.pickup_state || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-slate-light">
                        <Phone size={14} />
                        {s.profile?.phone || "—"}
                      </div>
                      <div className="flex items-center gap-2 text-slate-light">
                        <Mail size={14} />
                        {s.profile?.email || "—"}
                      </div>
                    </div>

                    {s.description && (
                      <p className="text-sm text-slate">{s.description}</p>
                    )}

                    {/* KYC documents */}
                    <div>
                      <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <FileText size={12} />
                        KYC documents
                      </CardTitle>
                      {s.kyc_docs.length === 0 ? (
                        <p className="text-xs text-slate-lighter">
                          No documents submitted.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {s.kyc_docs.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => viewDoc(d.file_url)}
                              className="flex items-center justify-between rounded-[--radius-md] border border-mist bg-cloud px-3 py-2 text-xs hover:border-violet/40 text-left"
                            >
                              <span className="capitalize">{d.document_type.replace(/_/g, " ")}</span>
                              <Badge
                                variant={
                                  d.status === "approved"
                                    ? "success"
                                    : d.status === "rejected"
                                    ? "error"
                                    : "warning"
                                }
                                className="text-[9px]"
                              >
                                {d.status}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bank details (for payout verification) */}
                    <div>
                      <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Building2 size={12} />
                        Bank details
                      </CardTitle>
                      {!s.bank ? (
                        <p className="text-xs text-slate-lighter">
                          No bank account added.
                        </p>
                      ) : (
                        <div className="rounded-[--radius-md] border border-mist bg-cloud px-3 py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-light">Bank</span>
                            <span className="font-medium text-midnight">{s.bank.bank_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-light">Account number</span>
                            <span className="font-medium text-midnight">{s.bank.account_number}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-light">Account name</span>
                            <span className="font-medium text-midnight">{s.bank.account_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-light">Verified</span>
                            <Badge variant={s.bank.is_verified ? "success" : "warning"} className="text-[9px]">
                              {s.bank.is_verified ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Trust */}
                    {s.trust && (
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-[--radius-md] bg-cloud px-3 py-2">
                          <p className="text-xs text-slate-light">Rating</p>
                          <p className="text-sm font-bold text-midnight">
                            {Number(s.trust.average_rating).toFixed(1)} ★
                          </p>
                        </div>
                        <div className="rounded-[--radius-md] bg-cloud px-3 py-2">
                          <p className="text-xs text-slate-light">Reviews</p>
                          <p className="text-sm font-bold text-midnight">
                            {s.trust.total_reviews}
                          </p>
                        </div>
                        <div className="rounded-[--radius-md] bg-cloud px-3 py-2">
                          <p className="text-xs text-slate-light">Dispute rate</p>
                          <p className="text-sm font-bold text-midnight">
                            {(Number(s.trust.dispute_rate) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Admin notes */}
                    <div>
                      <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Shield size={12} />
                        Admin notes
                      </CardTitle>
                      {s.admin_notes && (
                        <p className="text-xs text-slate-light bg-cloud rounded-[--radius-md] px-3 py-2 mb-2">
                          Last note: {s.admin_notes}
                        </p>
                      )}
                      <Textarea
                        placeholder="Add a note (required for reject/under-review)…"
                        rows={2}
                        value={notesById[s.id] ?? ""}
                        onChange={(e) =>
                          setNotesById((m) => ({ ...m, [s.id]: e.target.value }))
                        }
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {s.status !== "approved" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setStatus(s.id, "approved")}
                          loading={actionLoading === s.id}
                        >
                          <CheckCircle2 size={14} className="mr-1.5" />
                          Approve
                        </Button>
                      )}
                      {s.status !== "under_review" && s.status !== "approved" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatus(s.id, "under_review")}
                          loading={actionLoading === s.id}
                        >
                          Mark under review
                        </Button>
                      )}
                      {s.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error/10"
                          onClick={() => setStatus(s.id, "rejected")}
                          loading={actionLoading === s.id}
                        >
                          {s.status === "approved" ? (
                            <>
                              <Ban size={14} className="mr-1.5" />
                              Suspend
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="mr-1.5" />
                              Reject
                            </>
                          )}
                        </Button>
                      )}
                    </div>
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
