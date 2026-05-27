import Link from "next/link";
import {
  Package,
  CheckCircle2,
  Truck,
  ShieldCheck,
  ArrowRight,
  Clock,
  XCircle,
} from "lucide-react";
import { formatNaira, type OrderStatus } from "@/lib/utils";

export type TrackedOrder = {
  id: string;
  order_number: string;
  total: number;        // kobo
  status: OrderStatus;
  created_at: string;
  seller_name: string;
  item_count: number;
  first_item_name: string;
  thumbnail: string | null;
};

type OrderTrackerProps = {
  orders: TrackedOrder[];   // active orders only (3 max — most recent first)
  loading?: boolean;
};

// "Track what's on the way" — the most emotionally charged module on the
// buyer dashboard. Shows up to 3 active orders with their delivery
// progress as a 5-step visual (Paid → Packed → Picked up → In transit →
// Delivered). Empty state gently nudges back to browsing without
// guilt-tripping.
export function OrderTracker({ orders, loading }: OrderTrackerProps) {
  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
            Track what&apos;s on the way
          </h2>
          <p className="mt-0.5 text-sm text-slate-light">
            {orders.length > 0
              ? `${orders.length} order${orders.length === 1 ? "" : "s"} in progress`
              : "All caught up — no active orders right now"}
          </p>
        </div>
        {orders.length > 0 && (
          <Link
            href="/dashboard/orders"
            className="text-xs font-bold text-violet hover:underline inline-flex items-center gap-1 shrink-0"
          >
            All orders
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </header>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-mist animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3" role="list">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderRow order={order} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: TrackedOrder }) {
  const stage = stageFor(order.status);

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="group block rounded-xl border border-mist hover:border-violet/40 hover:bg-violet/[0.02] transition-colors p-3 sm:p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        {/* Thumbnail */}
        <div className="shrink-0 w-12 h-12 rounded-lg bg-cloud overflow-hidden">
          {order.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-5 w-5 text-slate-lighter" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Title + meta */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-midnight truncate">
            {order.first_item_name}
            {order.item_count > 1 && (
              <span className="text-slate-light font-normal">
                {" "}
                · +{order.item_count - 1} more
              </span>
            )}
          </p>
          <p className="text-xs text-slate-light mt-0.5">
            <span className="font-mono">#{order.order_number}</span> ·{" "}
            {order.seller_name} · {formatNaira(order.total / 100)}
          </p>
        </div>

        {/* Status pill */}
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${stage.pillBg} ${stage.pillFg}`}
        >
          {stage.label}
        </span>
      </div>

      {/* 5-step progress strip — works for all happy-path statuses.
          Disputed/cancelled show their own banner instead. */}
      {stage.kind === "progress" && (
        <ProgressSteps current={stage.currentStep} />
      )}
      {stage.kind === "exception" && (
        <div
          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${stage.banner}`}
        >
          {stage.bannerText}
        </div>
      )}
    </Link>
  );
}

function ProgressSteps({ current }: { current: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <ol className="grid grid-cols-5 gap-1.5" role="list" aria-label="Delivery progress">
      {PROGRESS_STEPS.map((step, i) => {
        const reached = i + 1 <= current;
        const isCurrent = i + 1 === current;
        const Icon = step.icon;
        return (
          <li key={step.label} className="flex flex-col items-center text-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                reached
                  ? isCurrent
                    ? "bg-violet text-white ring-4 ring-violet/15"
                    : "bg-emerald text-white"
                  : "bg-mist text-slate-lighter"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
            </div>
            <span
              className={`mt-1 text-[9px] font-bold uppercase tracking-wider leading-tight ${
                reached ? "text-midnight" : "text-slate-lighter"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist bg-cloud/40 flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet/10 text-violet mb-3">
        <Package className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-midnight">No active orders</p>
      <p className="text-xs text-slate-light mt-1 max-w-sm">
        When you place an order, you&apos;ll see live delivery progress here.
        Verified seller, escrow held — you&apos;re always covered.
      </p>
      <Link
        href="/dashboard/browse"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet hover:underline"
      >
        Start shopping
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

// ─── Stage mapping ────────────────────────────────────────────

const PROGRESS_STEPS: Array<{ label: string; icon: React.ElementType }> = [
  { label: "Paid",       icon: ShieldCheck },
  { label: "Packed",     icon: Package },
  { label: "Picked up",  icon: Package },
  { label: "In transit", icon: Truck },
  { label: "Delivered",  icon: CheckCircle2 },
];

type Stage =
  | {
      kind: "progress";
      currentStep: 1 | 2 | 3 | 4 | 5;
      label: string;
      pillBg: string;
      pillFg: string;
    }
  | {
      kind: "exception";
      label: string;
      pillBg: string;
      pillFg: string;
      bannerText: string;
      banner: string;
    };

function stageFor(status: OrderStatus): Stage {
  switch (status) {
    case "pending_payment":
      return {
        kind: "exception",
        label: "Payment pending",
        pillBg: "bg-warning/15",
        pillFg: "text-amber-600",
        bannerText: "Complete payment to release this order to the seller.",
        banner: "bg-warning/10 text-amber-700",
      };
    case "payment_confirmed":
      return { kind: "progress", currentStep: 1, label: "Paid",       pillBg: "bg-violet/10",  pillFg: "text-violet" };
    case "awaiting_pickup":
      return { kind: "progress", currentStep: 2, label: "Packed",     pillBg: "bg-royal/10",   pillFg: "text-royal" };
    case "picked_up":
      return { kind: "progress", currentStep: 3, label: "Picked up",  pillBg: "bg-teal/10",    pillFg: "text-teal" };
    case "in_transit":
      return { kind: "progress", currentStep: 4, label: "In transit", pillBg: "bg-teal/15",    pillFg: "text-teal" };
    case "delivered":
      return {
        kind: "progress",
        currentStep: 5,
        label: "Delivered",
        pillBg: "bg-emerald/10",
        pillFg: "text-emerald-dark",
      };
    case "completed":
      return {
        kind: "progress",
        currentStep: 5,
        label: "Completed",
        pillBg: "bg-emerald/10",
        pillFg: "text-emerald-dark",
      };
    case "disputed":
      return {
        kind: "exception",
        label: "Disputed",
        pillBg: "bg-error/10",
        pillFg: "text-error",
        bannerText: "Dispute open. Winipat is reviewing — expect a decision within 2–3 business days.",
        banner: "bg-error/8 text-error",
      };
    case "cancelled":
      return {
        kind: "exception",
        label: "Cancelled",
        pillBg: "bg-mist",
        pillFg: "text-slate-light",
        bannerText: "Order cancelled. Any payment is refunded to your card within 5–7 days.",
        banner: "bg-cloud text-slate",
      };
    case "refunded":
      return {
        kind: "exception",
        label: "Refunded",
        pillBg: "bg-mist",
        pillFg: "text-slate",
        bannerText: "Refund completed.",
        banner: "bg-cloud text-slate",
      };
    default:
      return {
        kind: "exception",
        label: status,
        pillBg: "bg-mist",
        pillFg: "text-slate",
        bannerText: "Status updates will appear here as your order progresses.",
        banner: "bg-cloud text-slate",
      };
  }
}

// Wrap unused-icon to keep imports tidy in case bundler drops them
void Clock;
void XCircle;
