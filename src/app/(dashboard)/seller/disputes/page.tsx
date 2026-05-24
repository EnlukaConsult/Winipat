"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  FileText,
  Upload,
  X,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  Loader2,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";

type DisputeStatus = "open" | "investigating" | "resolved" | "rejected";

interface DisputeEvidence {
  id: string;
  uploaded_by: string;
  file_url: string;
  description: string | null;
  created_at: string;
}

interface DisputeMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface DisputeOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  buyer_id: string;
  seller_id: string;
}

interface Dispute {
  id: string;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  opened_by: string;
  order: DisputeOrder;
  evidence: DisputeEvidence[];
  messages: DisputeMessage[];
}

const STATUS_TABS: Array<{ key: "open" | "resolved"; label: string; statuses: DisputeStatus[] }> = [
  { key: "open",     label: "Open + Investigating", statuses: ["open", "investigating"] },
  { key: "resolved", label: "Resolved",             statuses: ["resolved", "rejected"] },
];

const STATUS_BADGES: Record<DisputeStatus, { label: string; variant: "warning" | "info" | "success" | "error" }> = {
  open:          { label: "Open",          variant: "warning" },
  investigating: { label: "Investigating", variant: "info" },
  resolved:      { label: "Resolved",      variant: "success" },
  rejected:      { label: "Rejected",      variant: "error" },
};

export default function SellerDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "resolved">("open");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  async function fetchDisputes() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    // Get disputes where the underlying order belongs to me (the seller).
    // We use orders!inner so the filter on order.seller_id actually prunes
    // disputes from other sellers.
    const { data, error } = await supabase
      .from("disputes")
      .select(`
        id, reason, description, status, admin_notes, resolved_at, created_at, opened_by,
        order:orders!inner ( id, order_number, total, status, buyer_id, seller_id ),
        evidence:dispute_evidence ( id, uploaded_by, file_url, description, created_at ),
        messages:dispute_messages ( id, sender_id, message, created_at )
      `)
      .eq("order.seller_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDisputes(data as unknown as Dispute[]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchDisputes(); }, []);

  const visible = disputes.filter((d) =>
    STATUS_TABS.find((t) => t.key === activeTab)?.statuses.includes(d.status),
  );
  const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
    acc[tab.key] = disputes.filter((d) => tab.statuses.includes(d.status)).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-bold text-midnight">
            Disputes
          </h1>
          <p className="text-slate-light mt-1">
            Respond to buyer disputes with evidence within your SLA to protect your account.
          </p>
        </div>
      </div>

      {/* Heads-up banner */}
      <div className="rounded-[--radius-lg] bg-warning/8 border border-warning/30 px-5 py-4 flex items-start gap-3">
        <ShieldAlert size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-midnight">
            Why respond quickly?
          </p>
          <p className="text-sm text-slate-light mt-0.5">
            Disputes left without a seller response are ruled in the buyer&apos;s favour by default
            (SEL-DSP-002). Upload packaging/shipping evidence and reply to the buyer&apos;s claim as
            soon as you can.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[--radius-lg] bg-mist p-1 w-full sm:w-auto sm:inline-flex overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 sm:flex-none whitespace-nowrap rounded-[--radius-md] px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-white text-midnight shadow-sm"
                : "text-slate-light hover:text-midnight"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  activeTab === tab.key ? "bg-royal text-white" : "bg-mist-dark text-slate"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 rounded-[--radius-lg] bg-mist animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag size={36} className="text-mist-dark mb-3" />
          <p className="font-semibold text-midnight">No {activeTab} disputes</p>
          <p className="text-sm text-slate-light mt-1">
            {activeTab === "open"
              ? "Great — no active disputes against your orders right now."
              : "No resolved disputes yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((d) => (
            <DisputeCard
              key={d.id}
              dispute={d}
              currentUserId={userId}
              onRefresh={fetchDisputes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DisputeCardProps {
  dispute: Dispute;
  currentUserId: string | null;
  onRefresh: () => void;
}

function DisputeCard({ dispute, currentUserId, onRefresh }: DisputeCardProps) {
  const [expanded, setExpanded] = useState(dispute.status === "open" || dispute.status === "investigating");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isClosed = dispute.status === "resolved" || dispute.status === "rejected";
  const badge = STATUS_BADGES[dispute.status];

  async function handleSubmit() {
    if (!message.trim() && !file) {
      setError("Add a message or upload evidence (or both) before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Upload evidence to storage if a file is attached
      let fileUrl: string | null = null;
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("File is too large. Max 10 MB.");
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${dispute.id}/${Date.now()}-${currentUserId}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("dispute-evidence")
          .upload(path, file, { upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        fileUrl = supabase.storage.from("dispute-evidence").getPublicUrl(path).data.publicUrl;
      }

      // 2. Record the evidence row (only if a file was actually uploaded)
      if (fileUrl && currentUserId) {
        const { error: evErr } = await supabase.from("dispute_evidence").insert({
          dispute_id: dispute.id,
          uploaded_by: currentUserId,
          file_url: fileUrl,
          description: message.trim() || null,
        });
        if (evErr) throw new Error(`Could not save evidence: ${evErr.message}`);
      }

      // 3. Record the message (separate from evidence so chat-only updates work too)
      if (message.trim() && currentUserId) {
        const { error: msgErr } = await supabase.from("dispute_messages").insert({
          dispute_id: dispute.id,
          sender_id: currentUserId,
          message: message.trim(),
        });
        if (msgErr) throw new Error(`Could not send message: ${msgErr.message}`);
      }

      // 4. If first seller response, bump dispute to 'investigating' so admin knows
      //    we're engaging with it (only if it's still 'open').
      if (dispute.status === "open") {
        await supabase
          .from("disputes")
          .update({ status: "investigating" })
          .eq("id", dispute.id);
      }

      setMessage("");
      setFile(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-4">
      {/* Top row — order + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-midnight">#{dispute.order.order_number}</p>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {dispute.resolved_at && (
              <span className="text-xs text-slate-light inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> {formatDate(dispute.resolved_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-light mt-0.5">
            Order value: <span className="font-medium text-midnight">{formatNaira(dispute.order.total)}</span>
            {" · "}
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> Opened {formatDate(dispute.created_at)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-sm text-royal font-medium hover:underline cursor-pointer bg-transparent border-0"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {/* Buyer's claim */}
      <div className="rounded-[--radius-md] bg-error/5 border border-error/20 px-4 py-3">
        <div className="flex items-start gap-2 mb-1">
          <AlertTriangle size={14} className="text-error mt-0.5 shrink-0" />
          <p className="text-sm font-semibold text-midnight">Buyer&apos;s reason: {dispute.reason}</p>
        </div>
        {dispute.description && (
          <p className="text-sm text-slate ml-6">{dispute.description}</p>
        )}
      </div>

      {expanded && (
        <>
          {/* Admin notes if resolved */}
          {dispute.admin_notes && (
            <div className="rounded-[--radius-md] bg-royal/5 border border-royal/20 px-4 py-3">
              <p className="text-xs font-semibold text-royal uppercase tracking-wide mb-1">Admin decision</p>
              <p className="text-sm text-slate">{dispute.admin_notes}</p>
            </div>
          )}

          {/* Evidence already on file */}
          {dispute.evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wide mb-2">
                Evidence on file ({dispute.evidence.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dispute.evidence.map((ev) => {
                  const fromMe = ev.uploaded_by === currentUserId;
                  return (
                    <a
                      key={ev.id}
                      href={ev.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-2 rounded-[--radius-md] border border-mist bg-cloud px-3 py-2 hover:bg-mist transition-colors no-underline"
                    >
                      <FileText size={14} className="text-royal mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-midnight truncate">
                          {fromMe ? "From you" : "From buyer"} · {formatDate(ev.created_at)}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-slate-light truncate">{ev.description}</p>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message thread */}
          {dispute.messages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-light uppercase tracking-wide mb-2 flex items-center gap-1">
                <MessageSquare size={12} /> Conversation
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dispute.messages
                  .slice()
                  .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  .map((m) => {
                    const fromMe = m.sender_id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`rounded-[--radius-md] px-3 py-2 text-sm ${
                          fromMe ? "bg-royal/10 ml-8" : "bg-mist mr-8"
                        }`}
                      >
                        <p className="text-xs text-slate-light mb-0.5">
                          {fromMe ? "You" : "Buyer"} · {formatDate(m.created_at)}
                        </p>
                        <p className="text-slate">{m.message}</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Response form — only when dispute is still actionable */}
          {!isClosed && (
            <div className="rounded-[--radius-md] border border-mist-dark bg-cloud p-4 space-y-3">
              <p className="text-sm font-semibold text-midnight">Your response</p>

              <Textarea
                label="Message to buyer / admin"
                placeholder="Explain your side, attach delivery proof, packaging photos, etc."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />

              {/* File picker */}
              <div>
                <p className="text-sm font-medium text-slate mb-1.5">Evidence file (optional, max 10 MB)</p>
                {file ? (
                  <div className="flex items-center gap-3 rounded-[--radius-md] border border-emerald/40 bg-emerald/5 px-3 py-2">
                    <FileText size={16} className="text-emerald shrink-0" />
                    <span className="text-sm text-midnight font-medium truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-slate-lighter hover:text-error transition-colors"
                      aria-label="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="w-full rounded-[--radius-md] border-2 border-dashed border-mist-dark hover:border-royal hover:bg-royal/5 transition-colors px-3 py-3 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-slate"
                  >
                    <Upload size={14} /> Click to attach a photo / PDF
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-[--radius-md] bg-error/8 border border-error/30 px-3 py-2 text-sm text-error">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={submitting || (!message.trim() && !file)}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send size={14} className="mr-1.5" />
                      Submit response
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
