"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";

type ContactSellerButtonProps = {
  sellerId: string;
  orderId: string;
  className?: string;
};

// Quick "Message seller" CTA. Posts to /api/conversations which finds
// or creates a buyer<->seller conversation (scoped to an order if
// orderId is provided) and routes the user to the messages page with
// that conversation pre-selected.
//
// The order-attached conversation is what powers the "About this order"
// strip in the message thread (commit 3dfca41).
export function ContactSellerButton({
  sellerId,
  orderId,
  className,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, orderId }),
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.id) {
        setError(body.error || "Couldn't start the conversation.");
        return;
      }
      router.push(`/dashboard/messages?conv=${body.id}`);
    } catch {
      setError("Couldn't start the conversation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur text-white font-bold text-sm hover:bg-white/20 transition-colors disabled:opacity-60 min-h-[44px]"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        )}
        Message seller
      </button>
      {error && (
        <p className="mt-1 text-[11px] text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
