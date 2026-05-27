import {
  ShieldCheck,
  Package,
  Truck,
  Home,
  CheckCircle2,
} from "lucide-react";
import type { OrderStatus } from "@/lib/utils";

type OrderProgressProps = {
  status: OrderStatus;
};

// 5-step horizontal progress strip for the order detail page. Same
// shape as the OrderTracker on the buyer dashboard but bigger + with
// step descriptions instead of just labels. Exception states
// (disputed / cancelled / refunded) render nothing — the
// OrderStateBanner takes over for those.
export function OrderProgress({ status }: OrderProgressProps) {
  const stage = stageFor(status);
  if (stage === null) return null;

  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="mb-5">
        <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
          Order progress
        </h2>
        <p className="mt-0.5 text-sm text-slate-light">
          {STAGE_NEXT_HINT[stage]}
        </p>
      </header>

      {/* Mobile: vertical with subdued connector lines.
          Desktop: horizontal with gradient connector between stages. */}
      <ol
        className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-0 sm:items-stretch relative"
        role="list"
        aria-label="Order delivery progress"
      >
        {STAGES.map((s, i) => {
          const reached = i + 1 <= stage;
          const isCurrent = i + 1 === stage;
          const Icon = s.icon;
          const isLast = i === STAGES.length - 1;

          return (
            <li
              key={s.label}
              className="relative flex flex-col items-center text-center px-2 py-2 sm:py-1"
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-6 left-1/2 w-full h-0.5 ${
                    reached && i + 1 < stage ? "bg-emerald/40" : "bg-mist"
                  }`}
                />
              )}

              <div
                className={`relative z-[1] inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-2 ring-4 ring-white ${
                  isCurrent
                    ? "bg-violet text-white shadow-lg shadow-violet/20"
                    : reached
                    ? "bg-emerald/15 text-emerald-dark"
                    : "bg-mist text-slate-lighter"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>

              <p
                className={`text-[11px] uppercase tracking-wider font-bold ${
                  reached ? "text-midnight" : "text-slate-lighter"
                }`}
              >
                Stage {i + 1}
              </p>
              <p
                className={`text-sm font-bold mt-0.5 leading-tight ${
                  isCurrent
                    ? "text-violet"
                    : reached
                    ? "text-emerald-dark"
                    : "text-midnight"
                }`}
              >
                {s.label}
              </p>
              <p className="text-[11px] text-slate-light mt-1 leading-snug max-w-[120px] mx-auto">
                {s.sub}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

// ─── Stage mapping ────────────────────────────────────────────────────

const STAGES: Array<{
  label: string;
  sub: string;
  icon: React.ElementType;
}> = [
  { label: "Paid",       sub: "Held in escrow",         icon: ShieldCheck },
  { label: "Packed",     sub: "Seller prepared item",   icon: Package },
  { label: "Picked up",  sub: "Courier collected",      icon: Package },
  { label: "In transit", sub: "On the way",             icon: Truck },
  { label: "Delivered",  sub: "At your door",           icon: Home },
];

// Returns 1..5 for the current stage, or null for exception states
// (disputed/cancelled/refunded — those don't fit the linear flow and
// get the OrderStateBanner instead).
function stageFor(status: OrderStatus): 1 | 2 | 3 | 4 | 5 | null {
  switch (status) {
    case "pending_payment":   return 1;
    case "payment_confirmed": return 1;
    case "seller_preparing":  return 2;
    case "awaiting_pickup":   return 2;
    case "picked_up":         return 3;
    case "in_transit":        return 4;
    case "delivered":         return 5;
    case "completed":         return 5;
    default:                  return null;
  }
}

const STAGE_NEXT_HINT: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Seller has 15 minutes to accept your order once payment confirms.",
  2: "Seller is preparing your order for pickup.",
  3: "Courier has collected the package and is heading out.",
  4: "On the way — track your delivery for live updates.",
  5: "Confirm delivery within 48 hours to release escrow to the seller.",
};

// Re-export for use in callers — they need CheckCircle2 for "completed".
void CheckCircle2;
