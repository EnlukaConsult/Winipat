import {
  ShieldCheck,
  Truck,
  PackageCheck,
  AlertTriangle,
  Heart,
} from "lucide-react";

type HealthStatus = "good" | "warn" | "bad" | "unknown";

type HealthRow = {
  icon: React.ElementType;
  label: string;
  value: string;          // e.g. "95%", "Verified", "Low"
  status: HealthStatus;
  hint?: string;          // small italic note shown under value
};

type SellerHealthProps = {
  isApproved: boolean;
  totalOrders: number;
  completedOrders: number;
  onTimeRate: number;     // 0..1
  disputeRate: number;    // 0..1
};

// Composite health card — at-a-glance "is your account in good shape?".
// 5 rows: KYC, fulfilment, on-time shipping, dispute rate, overall health.
export function SellerHealth({
  isApproved,
  totalOrders,
  completedOrders,
  onTimeRate,
  disputeRate,
}: SellerHealthProps) {
  const fulfilmentRate =
    totalOrders > 0 ? completedOrders / totalOrders : null;

  const rows: HealthRow[] = [
    {
      icon: ShieldCheck,
      label: "KYC verification",
      value: isApproved ? "Verified" : "Not verified",
      status: isApproved ? "good" : "warn",
      hint: isApproved
        ? "Government ID + bank account confirmed"
        : "Complete onboarding to start selling",
    },
    {
      icon: PackageCheck,
      label: "Orders fulfilled",
      value:
        fulfilmentRate !== null
          ? `${Math.round(fulfilmentRate * 100)}%`
          : "—",
      status:
        fulfilmentRate === null
          ? "unknown"
          : fulfilmentRate >= 0.95
          ? "good"
          : fulfilmentRate >= 0.8
          ? "warn"
          : "bad",
      hint:
        fulfilmentRate !== null
          ? `${completedOrders} of ${totalOrders} orders completed`
          : "No orders yet",
    },
    {
      icon: Truck,
      label: "On-time shipping",
      value:
        totalOrders > 0 ? `${Math.round(onTimeRate * 100)}%` : "—",
      status:
        totalOrders === 0
          ? "unknown"
          : onTimeRate >= 0.9
          ? "good"
          : onTimeRate >= 0.7
          ? "warn"
          : "bad",
      hint:
        totalOrders > 0
          ? onTimeRate >= 0.9
            ? "Marking Ready within 24h"
            : "Speed up dispatch to climb tiers"
          : "Tracked after your first delivery",
    },
    {
      icon: AlertTriangle,
      label: "Dispute rate",
      value:
        totalOrders > 0 ? `${(disputeRate * 100).toFixed(1)}%` : "—",
      status:
        totalOrders === 0
          ? "unknown"
          : disputeRate <= 0.02
          ? "good"
          : disputeRate <= 0.05
          ? "warn"
          : "bad",
      hint:
        totalOrders > 0
          ? disputeRate <= 0.02
            ? "Very low — well done"
            : disputeRate <= 0.05
            ? "Keep under 5% to qualify for Gold"
            : "Investigate refused orders to recover trust"
          : "Tracked after your first dispute",
    },
  ];

  // Overall health = worst of the four primary rows
  const ranked: Record<HealthStatus, number> = {
    good: 0,
    warn: 1,
    bad: 2,
    unknown: -1,
  };
  const worst = rows.reduce<HealthStatus>((acc, r) =>
    ranked[r.status] > ranked[acc] ? r.status : acc, "good");
  const overall: HealthRow = {
    icon: Heart,
    label: "Overall health",
    value:
      worst === "good"
        ? "Excellent"
        : worst === "warn"
        ? "Needs attention"
        : worst === "bad"
        ? "Action needed"
        : "Just getting started",
    status: worst,
  };

  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
            Seller health
          </h2>
          <p className="mt-0.5 text-sm text-slate-light">
            Five signals buyers use to decide who to trust.
          </p>
        </div>
        <StatusPill status={overall.status} value={overall.value} />
      </header>

      <ul className="divide-y divide-mist" role="list">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <li
              key={row.label}
              className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div
                className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${
                  STATUS_ICON_BG[row.status]
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${STATUS_ICON_FG[row.status]}`}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-midnight leading-tight">
                  {row.label}
                </p>
                {row.hint && (
                  <p className="text-xs text-slate-light mt-0.5 leading-snug">
                    {row.hint}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold ${STATUS_VALUE_FG[row.status]}`}>
                  {row.value}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// ─── Styling lookups ──────────────────────────────────────────────────────

const STATUS_ICON_BG: Record<HealthStatus, string> = {
  good:    "bg-emerald/10",
  warn:    "bg-warning/15",
  bad:     "bg-error/10",
  unknown: "bg-mist",
};

const STATUS_ICON_FG: Record<HealthStatus, string> = {
  good:    "text-emerald-dark",
  warn:    "text-amber-600",
  bad:     "text-error",
  unknown: "text-slate-light",
};

const STATUS_VALUE_FG: Record<HealthStatus, string> = {
  good:    "text-emerald-dark",
  warn:    "text-amber-600",
  bad:     "text-error",
  unknown: "text-slate-light",
};

function StatusPill({ status, value }: { status: HealthStatus; value: string }) {
  const bg = STATUS_ICON_BG[status];
  const fg = STATUS_ICON_FG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bg} ${fg} text-xs font-bold uppercase tracking-wider`}
    >
      <span aria-hidden="true">●</span>
      {value}
    </span>
  );
}
