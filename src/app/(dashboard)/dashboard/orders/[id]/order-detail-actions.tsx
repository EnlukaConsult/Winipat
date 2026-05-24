"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Star,
  Loader2,
} from "lucide-react";

interface OrderDetailActionsProps {
  orderId: string;
  canConfirmDelivery: boolean;
  canOpenDispute: boolean;
  canLeaveReview: boolean;
}

const DISPUTE_REASONS = [
  { value: "not_received",     label: "Item not received" },
  { value: "wrong_item",       label: "Wrong item received" },
  { value: "damaged",          label: "Item arrived damaged" },
  { value: "not_as_described", label: "Item not as described" },
  { value: "counterfeit",      label: "Suspected counterfeit" },
  { value: "other",            label: "Other" },
];

export function OrderDetailActions({
  orderId,
  canConfirmDelivery,
  canOpenDispute,
  canLeaveReview,
}: OrderDetailActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "dispute" | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState(DISPUTE_REASONS[0].value);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleConfirmDelivery() {
    setBusy("confirm");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-delivery`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Confirmation failed (status ${res.status})`);
      setSuccess("Delivery confirmed. The seller will be paid out after the 48-hour hold period.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm delivery.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmitDispute() {
    if (!disputeDescription.trim()) {
      setError("Please describe what went wrong before submitting.");
      return;
    }
    setBusy("dispute");
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: DISPUTE_REASONS.find((r) => r.value === disputeReason)?.label ?? disputeReason,
          description: disputeDescription.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; disputeId?: string };
      if (!res.ok) throw new Error(body.error ?? `Dispute failed (status ${res.status})`);
      setSuccess("Dispute opened. The seller has been notified and our team will review it.");
      setShowDisputeForm(false);
      setDisputeDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open dispute.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Primary actions row */}
      <div className="flex flex-wrap gap-3">
        {canConfirmDelivery && (
          <Button
            variant="primary"
            size="md"
            disabled={busy !== null}
            onClick={handleConfirmDelivery}
          >
            {busy === "confirm" ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Confirming…
              </>
            ) : (
              <>
                <CheckCircle2 size={16} className="mr-2" />
                Confirm Delivery
              </>
            )}
          </Button>
        )}

        {canOpenDispute && (
          <Button
            variant="outline"
            size="md"
            disabled={busy !== null}
            onClick={() => setShowDisputeForm((v) => !v)}
          >
            <AlertTriangle size={16} className="mr-2" />
            {showDisputeForm ? "Cancel dispute" : "Open Dispute"}
          </Button>
        )}

        {canLeaveReview && (
          <Button variant="gold" size="md" disabled>
            <Star size={16} className="mr-2" />
            Leave Review (coming soon)
          </Button>
        )}
      </div>

      {/* Dispute form */}
      {showDisputeForm && canOpenDispute && (
        <div className="rounded-[--radius-md] border border-warning/20 bg-warning/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-700">Open a Dispute</p>

          <Select
            label="What went wrong?"
            options={DISPUTE_REASONS}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
          />

          <Textarea
            label="Describe the issue"
            placeholder="Please explain what happened — when the order arrived, what was wrong, anything the seller said…"
            value={disputeDescription}
            onChange={(e) => setDisputeDescription(e.target.value)}
            rows={4}
          />

          <div className="flex justify-end">
            <Button
              variant="danger"
              size="sm"
              disabled={busy !== null || !disputeDescription.trim()}
              onClick={handleSubmitDispute}
            >
              {busy === "dispute" ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Dispute"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="rounded-[--radius-md] bg-error/8 border border-error/30 px-4 py-3 flex items-start gap-2 text-sm text-error">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[--radius-md] bg-emerald/8 border border-emerald/30 px-4 py-3 flex items-start gap-2 text-sm text-emerald">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}
    </div>
  );
}
