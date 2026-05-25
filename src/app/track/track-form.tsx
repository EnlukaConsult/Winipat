"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hash, Mail, AlertCircle, CheckCircle2, Clock } from "lucide-react";

type HistoryRow = { status: string; created_at: string; notes: string | null };
type Result = {
  order_number: string;
  seller: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  history: HistoryRow[];
};

const STATUS_COPY: Record<string, { label: string; tone: "warning" | "success" | "error" | "default" }> = {
  pending_payment:    { label: "Awaiting payment",      tone: "warning" },
  payment_confirmed:  { label: "Paid — awaiting seller", tone: "warning" },
  seller_preparing:   { label: "Seller preparing",       tone: "warning" },
  awaiting_pickup:    { label: "Awaiting courier",       tone: "warning" },
  picked_up:          { label: "Picked up",              tone: "default" },
  in_transit:         { label: "In transit",             tone: "default" },
  delivered:          { label: "Delivered",              tone: "success" },
  completed:          { label: "Completed",              tone: "success" },
  disputed:           { label: "Disputed",               tone: "error"   },
  cancelled:          { label: "Cancelled",              tone: "error"   },
  refunded:           { label: "Refunded",               tone: "error"   },
};

function format(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function TrackForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not look up order.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-[--radius-lg] border border-mist bg-white p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Order number"
            placeholder="WNP-…"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            icon={<Hash size={14} />}
            required
            autoComplete="off"
          />
          <Input
            label="Email used at checkout"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={14} />}
            required
            autoComplete="email"
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={loading}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Look up order
        </Button>
        {error && (
          <div className="flex items-start gap-2 rounded-[--radius-md] bg-error/8 border border-error/20 px-3 py-2 text-sm text-error">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </form>

      {result && (
        <div className="rounded-[--radius-lg] border border-mist bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-slate-lighter">Order</p>
              <p className="font-bold text-midnight font-mono">{result.order_number}</p>
              <p className="text-xs text-slate-light mt-1">Sold by {result.seller}</p>
            </div>
            <Badge variant={STATUS_COPY[result.status]?.tone ?? "default"} className="text-[10px]">
              {STATUS_COPY[result.status]?.label ?? result.status}
            </Badge>
          </div>

          <ol className="mt-5 relative border-l-2 border-mist pl-4 space-y-3">
            {result.history.length === 0 && (
              <li className="text-sm text-slate-light">
                No status updates yet.
              </li>
            )}
            {result.history.map((h, i) => {
              const cfg = STATUS_COPY[h.status];
              const isLast = i === result.history.length - 1;
              return (
                <li key={i} className="relative">
                  <span
                    className={
                      "absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 " +
                      (isLast
                        ? "bg-violet border-violet"
                        : "bg-white border-mist-dark")
                    }
                  />
                  <p className="text-sm font-semibold text-midnight">
                    {cfg?.label || h.status}
                  </p>
                  <p className="text-xs text-slate-light">{format(h.created_at)}</p>
                  {h.notes && (
                    <p className="text-xs text-slate-light mt-0.5">{h.notes}</p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-[--radius-md] bg-cloud px-3 py-2 flex items-center gap-2">
              <Clock size={12} className="text-slate-light" />
              <span className="text-slate-light">Placed:</span>
              <span className="font-medium text-midnight">{format(result.created_at)}</span>
            </div>
            <div className="rounded-[--radius-md] bg-cloud px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={12} className={result.completed_at ? "text-emerald" : "text-slate-light"} />
              <span className="text-slate-light">Completed:</span>
              <span className="font-medium text-midnight">{format(result.completed_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
