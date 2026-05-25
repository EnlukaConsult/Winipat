"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Phone,
  RefreshCw,
} from "lucide-react";

type Status = "new" | "in_progress" | "resolved" | "spam";

type Enquiry = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  subject: string;
  message: string;
  chat_context: string | null;
  status: Status;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<
  Status,
  { label: string; variant: "warning" | "default" | "success" | "error" }
> = {
  new:         { label: "New",          variant: "warning" },
  in_progress: { label: "In progress",  variant: "default" },
  resolved:    { label: "Resolved",     variant: "success" },
  spam:        { label: "Spam",         variant: "error" },
};

const CATEGORY_LABEL: Record<string, string> = {
  order_issue:        "Order issue",
  payment:            "Payment",
  seller_application: "Seller application",
  kyc_question:       "KYC",
  dispute_help:       "Dispute help",
  partnership:        "Partnership",
  feedback:           "Feedback",
  other:              "Other",
};

export default function AdminEnquiriesPage() {
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [replyById, setReplyById] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("support_enquiries")
      .select(
        "id, user_id, name, email, phone, category, subject, message, chat_context, status, admin_notes, resolved_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(300);
    setItems((data as Enquiry[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: Status) {
    setActionLoading(id);
    const res = await fetch(`/api/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: notesById[id] }),
    });
    setActionLoading(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Failed.");
      return;
    }
    await load();
  }

  async function sendReply(id: string) {
    const body = replyById[id]?.trim();
    if (!body) {
      alert("Type your reply first.");
      return;
    }
    setActionLoading(id);
    const res = await fetch(`/api/admin/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply: { body } }),
    });
    setActionLoading(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Failed to send reply.");
      return;
    }
    setReplyById((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    await load();
  }

  const filtered = items.filter((i) => filter === "all" || i.status === filter);
  const counts = items.reduce(
    (acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Enquiries
          </h1>
          <p className="mt-0.5 text-sm text-slate-light">
            Messages submitted via the contact form and chat handoff.
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

      <div className="flex flex-wrap items-center gap-2">
        {(["new", "in_progress", "resolved", "spam", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === f
                ? "border-violet bg-violet text-white"
                : "border-mist bg-white text-slate hover:border-violet/40"
            )}
          >
            {f === "all" ? "All" : STATUS_STYLE[f].label}
            {f !== "all" && counts[f] ? ` · ${counts[f]}` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-mist rounded-[--radius-md] animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-12 text-center">
          <Mail className="mx-auto mb-3 text-slate-lighter" size={28} />
          <p className="text-sm font-medium text-midnight">
            Nothing in this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const expanded = expandedId === e.id;
            const style = STATUS_STYLE[e.status];
            return (
              <Card key={e.id} padding="sm">
                <button
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  className="w-full flex items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-midnight">{e.name}</p>
                      <Badge variant="default" className="text-[10px]">
                        {CATEGORY_LABEL[e.category] || e.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate mt-0.5 truncate">
                      {e.subject}
                    </p>
                    <p className="text-[11px] text-slate-lighter mt-0.5">
                      {e.email} · {formatDate(e.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={style.variant} className="text-[10px]">
                      {style.label}
                    </Badge>
                    {expanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 border-t border-mist pt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-light">
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} />
                        <a
                          href={`mailto:${e.email}?subject=Re: ${encodeURIComponent(e.subject)}`}
                          className="text-violet hover:underline"
                        >
                          {e.email}
                        </a>
                      </span>
                      {e.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={12} />
                          <a
                            href={`tel:${e.phone}`}
                            className="hover:text-violet"
                          >
                            {e.phone}
                          </a>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} />
                        {formatDate(e.created_at)}
                      </span>
                    </div>

                    <div>
                      <CardTitle className="text-xs uppercase tracking-wide mb-1.5">
                        Message
                      </CardTitle>
                      <p className="text-sm text-slate bg-cloud rounded-[--radius-md] px-3 py-2 whitespace-pre-wrap">
                        {e.message}
                      </p>
                    </div>

                    {e.chat_context && (
                      <details>
                        <summary className="text-xs text-slate-light cursor-pointer hover:text-violet">
                          Chat transcript attached ({e.chat_context.length} chars)
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto bg-cloud rounded-md p-3 text-[10px] text-slate whitespace-pre-wrap">
                          {e.chat_context}
                        </pre>
                      </details>
                    )}

                    {e.admin_notes && (
                      <div>
                        <CardTitle className="text-xs uppercase tracking-wide mb-1.5">
                          Internal notes
                        </CardTitle>
                        <p className="text-xs text-slate-light bg-violet/5 border border-violet/10 rounded-[--radius-md] px-3 py-2">
                          {e.admin_notes}
                        </p>
                      </div>
                    )}

                    <div>
                      <CardTitle className="text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Mail size={12} className="text-violet" />
                        Reply
                      </CardTitle>
                      <Textarea
                        placeholder={`Hi ${e.name},\n\nThanks for reaching out. …`}
                        rows={4}
                        value={replyById[e.id] ?? ""}
                        onChange={(ev) =>
                          setReplyById((m) => ({ ...m, [e.id]: ev.target.value }))
                        }
                      />
                      <p className="mt-1 text-[10px] text-slate-lighter">
                        Sends a branded email from <strong>support@winipat.com</strong> via Resend.
                        Reply lands back here if the user responds.
                      </p>
                    </div>

                    <Textarea
                      placeholder="Internal notes (not sent to the user)…"
                      rows={2}
                      value={notesById[e.id] ?? ""}
                      onChange={(ev) =>
                        setNotesById((m) => ({ ...m, [e.id]: ev.target.value }))
                      }
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => sendReply(e.id)}
                        loading={actionLoading === e.id}
                        disabled={!replyById[e.id]?.trim()}
                      >
                        <Mail size={14} className="mr-1.5" />
                        Send reply &amp; resolve
                      </Button>
                      {e.status !== "in_progress" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStatus(e.id, "in_progress")}
                          loading={actionLoading === e.id}
                        >
                          <Clock size={14} className="mr-1.5" />
                          In progress
                        </Button>
                      )}
                      {e.status !== "resolved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald hover:bg-emerald/10"
                          onClick={() => setStatus(e.id, "resolved")}
                          loading={actionLoading === e.id}
                        >
                          <CheckCircle2 size={14} className="mr-1.5" />
                          Resolved
                        </Button>
                      )}
                      {e.status !== "spam" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-error/10"
                          onClick={() => setStatus(e.id, "spam")}
                          loading={actionLoading === e.id}
                        >
                          <Trash2 size={14} className="mr-1.5" />
                          Spam
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
