import Link from "next/link";
import {
  ShieldAlert,
  XCircle,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";

type OrderStateBannerProps = {
  status: "disputed" | "cancelled" | "refunded";
  orderId: string;
};

// Full-width banner for the three terminal/exception states a buyer
// might land on. Replaces the old single-line "⚠ Order Cancelled"
// strip with something that explains what happened, what's next, and
// links to the right resolution path.
export function OrderStateBanner({ status, orderId }: OrderStateBannerProps) {
  const config = STATE_CONFIG[status];
  const Icon = config.icon;

  return (
    <article
      className={`rounded-2xl border ${config.borderClass} ${config.bgClass} p-5 sm:p-6`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl ${config.iconBgClass}`}
        >
          <Icon className={`h-5 w-5 ${config.iconFgClass}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2
            className={`font-[family-name:var(--font-sora)] text-base font-bold ${config.titleClass}`}
          >
            {config.title}
          </h2>
          <p className="mt-1 text-sm text-slate leading-relaxed">
            {config.body}
          </p>
          {config.ctaLabel && config.ctaHref && (
            <Link
              href={config.ctaHref(orderId)}
              className={`mt-3 inline-flex items-center gap-1.5 text-sm font-bold ${config.ctaClass} hover:underline`}
            >
              {config.ctaLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

const STATE_CONFIG: Record<
  "disputed" | "cancelled" | "refunded",
  {
    icon: React.ElementType;
    title: string;
    body: string;
    borderClass: string;
    bgClass: string;
    iconBgClass: string;
    iconFgClass: string;
    titleClass: string;
    ctaClass: string;
    ctaLabel: string | null;
    ctaHref: ((orderId: string) => string) | null;
  }
> = {
  disputed: {
    icon: ShieldAlert,
    title: "Dispute open — under review",
    body:
      "Your case is with the Winipat resolution team. We're reviewing the evidence from both sides and typically reach a decision within 2–3 business days. You'll get an email and an in-app notification the moment we do.",
    borderClass: "border-warning/30",
    bgClass: "bg-warning/8",
    iconBgClass: "bg-warning/15",
    iconFgClass: "text-amber-600",
    titleClass: "text-amber-900",
    ctaClass: "text-amber-700",
    ctaLabel: "View dispute details",
    ctaHref: (id) => `/dashboard/orders/${id}#dispute`,
  },
  cancelled: {
    icon: XCircle,
    title: "Order cancelled",
    body:
      "This order was cancelled before delivery. Any payment you made is being refunded to the original card or bank account — typically within 5–7 business days, depending on your bank.",
    borderClass: "border-mist-dark",
    bgClass: "bg-cloud",
    iconBgClass: "bg-mist",
    iconFgClass: "text-slate",
    titleClass: "text-midnight",
    ctaClass: "text-violet",
    ctaLabel: "Browse other sellers",
    ctaHref: () => `/dashboard/browse`,
  },
  refunded: {
    icon: RefreshCcw,
    title: "Refund completed",
    body:
      "The refund has been processed back to your original payment method. If it hasn't landed in your account after 7 business days, contact Winipat support with the order number.",
    borderClass: "border-emerald/30",
    bgClass: "bg-emerald/8",
    iconBgClass: "bg-emerald/15",
    iconFgClass: "text-emerald-dark",
    titleClass: "text-emerald-dark",
    ctaClass: "text-violet",
    ctaLabel: "Continue shopping",
    ctaHref: () => `/dashboard/browse`,
  },
};
