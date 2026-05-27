import {
  CreditCard,
  Lock,
  Truck,
  CheckCircle2,
  Wallet,
} from "lucide-react";

// "Where your money is right now" — explains the escrow flow visually so
// new sellers understand WHY funds aren't instant, and existing sellers
// can see where each pending naira is sitting. Pure UI; takes the
// summary numbers as props so the dashboard owns the data fetch.

type PayoutTimelineProps = {
  /** Naira value in flight (orders accepted but not yet delivered). */
  inFlightSales: number;
  /** Naira value of completed orders that are now in escrow hold. */
  escrowHoldValue: number;
  /** Naira value released to seller, awaiting bank transfer. */
  awaitingPayout: number;
  /** Naira value already paid out to bank. */
  paidOut: number;
};

export function PayoutTimeline({
  inFlightSales,
  escrowHoldValue,
  awaitingPayout,
  paidOut,
}: PayoutTimelineProps) {
  const stages = [
    {
      icon: CreditCard,
      label: "Buyer pays",
      value: inFlightSales,
      hint: "Order accepted, awaiting delivery",
      tone: "violet" as const,
    },
    {
      icon: Lock,
      label: "Escrow hold",
      value: escrowHoldValue,
      hint: "48h buyer-protection window",
      tone: "amber" as const,
    },
    {
      icon: CheckCircle2,
      label: "Released",
      value: awaitingPayout,
      hint: "Queued for next payout batch",
      tone: "teal" as const,
    },
    {
      icon: Wallet,
      label: "In your bank",
      value: paidOut,
      hint: "All-time total transferred",
      tone: "emerald" as const,
    },
  ];

  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="mb-5">
        <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
          Where your money is right now
        </h2>
        <p className="mt-0.5 text-sm text-slate-light">
          Funds flow through these four stages from order to bank.
        </p>
      </header>

      {/* Stages — vertical on mobile, horizontal w/ connector on desktop */}
      <ol
        className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-0 sm:items-stretch relative"
        role="list"
      >
        {stages.map((stage, i) => {
          const Icon = stage.icon;
          const isLast = i === stages.length - 1;
          return (
            <li
              key={stage.label}
              className="relative flex flex-col items-center text-center px-2 py-3 sm:py-1"
            >
              {/* Connector line — drawn between stages on desktop only */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="hidden sm:block absolute top-6 left-1/2 w-full h-0.5 bg-gradient-to-r from-mist via-mist to-mist"
                />
              )}

              <div
                className={`relative z-[1] inline-flex items-center justify-center w-12 h-12 rounded-2xl ${TONE_BG[stage.tone]} ${TONE_FG[stage.tone]} mb-2 ring-4 ring-white`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>

              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-light">
                Stage {i + 1}
              </p>
              <p className="text-sm font-bold text-midnight mt-0.5 leading-tight">
                {stage.label}
              </p>
              <p
                className={`mt-1.5 font-[family-name:var(--font-sora)] text-base font-bold ${TONE_FG[stage.tone]}`}
              >
                {formatShortNaira(stage.value)}
              </p>
              <p className="text-[11px] text-slate-light mt-1 leading-snug max-w-[140px] mx-auto">
                {stage.hint}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────

const TONE_BG = {
  violet:  "bg-violet/12",
  amber:   "bg-warning/15",
  teal:    "bg-teal/12",
  emerald: "bg-emerald/12",
};
const TONE_FG = {
  violet:  "text-violet",
  amber:   "text-amber-600",
  teal:    "text-teal",
  emerald: "text-emerald-dark",
};

// Compact naira formatter — kept here (not imported from utils) because
// the timeline uses tighter formatting than the regular formatNaira:
//   ₦12.5K instead of ₦12,500
//   ₦0 instead of an awkward dash when stage is empty
function formatShortNaira(value: number) {
  if (value <= 0) return "₦0";
  if (value < 1_000) return `₦${value.toFixed(0)}`;
  if (value < 1_000_000) return `₦${(value / 1_000).toFixed(1)}K`;
  return `₦${(value / 1_000_000).toFixed(2)}M`;
}

// Note: takes naira (not kobo) for readability at call site.
// The dashboard converts before passing in.
