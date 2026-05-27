import Link from "next/link";
import {
  Building2,
  MapPin,
  FileText,
  Banknote,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

type SellerStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | null;

type Step = {
  id: 1 | 2 | 3 | 4;
  label: string;
  icon: React.ElementType;
  /** True once we have enough data to consider this step complete. */
  done: boolean;
};

type OnboardingProgressProps = {
  status: SellerStatus;
  steps: Step[];                  // 4 steps; .done flag drives the meter
  /** Free-text shown in the rejected state — the admin's reason. */
  rejectionReason?: string | null;
};

// Replaces the old single-line warning banner. Shows a visual 4-step
// progress meter for sellers still in draft, a calm "under review" card
// for submitted/under-review, a clear resubmit panel for rejected, and
// renders nothing when approved (the hero already congratulates them via
// the Verified level).
export function OnboardingProgress({
  status,
  steps,
  rejectionReason,
}: OnboardingProgressProps) {
  if (status === "approved") return null;

  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);

  // ─── REVIEW STATES ────────────────────────────────────────────────────
  if (status === "submitted" || status === "under_review") {
    return (
      <article className="rounded-2xl border border-warning/30 bg-warning/8 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-warning/15 text-amber-600">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
              KYC under review
            </h2>
            <p className="mt-1 text-sm text-slate">
              We&apos;re checking your documents. This usually takes{" "}
              <strong className="text-midnight">1–2 business days</strong>.
              You&apos;ll get an in-app notification + email the moment it&apos;s decided.
            </p>
            <p className="mt-2 text-xs text-slate-light">
              In the meantime, you can prepare your first products as drafts.
            </p>
          </div>
        </div>
      </article>
    );
  }

  if (status === "rejected") {
    return (
      <article className="rounded-2xl border border-error/30 bg-error/8 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-error/15 text-error">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
              Application needs changes
            </h2>
            <p className="mt-1 text-sm text-slate">
              {rejectionReason
                ? rejectionReason
                : "An admin reviewed your documents and asked for changes. Open your application to see the feedback."}
            </p>
            <Link
              href="/seller/onboarding"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-error hover:underline"
            >
              Open application
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // ─── DRAFT — show step progress ───────────────────────────────────────
  return (
    <article className="rounded-2xl border border-royal/25 bg-gradient-to-br from-royal/8 to-violet/8 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
            Finish your seller setup
          </h2>
          <p className="mt-1 text-sm text-slate">
            Complete these {steps.length} steps to start selling and receive payouts.
          </p>
        </div>
        <Link
          href="/seller/onboarding"
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-royal text-white font-bold text-sm px-4 py-2.5 hover:bg-royal-dark transition-colors min-h-[44px]"
        >
          {done === 0 ? "Start setup" : "Continue setup"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Progress meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate">
          <span>
            Step {Math.min(done + 1, steps.length)} of {steps.length}
          </span>
          <span className="text-royal">{pct}%</span>
        </div>
        <div
          className="h-2 rounded-full bg-mist overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-royal to-violet transition-all duration-500"
            style={{ width: `${Math.max(2, pct)}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="list">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className={`rounded-xl border p-3 transition-colors ${
                step.done
                  ? "border-emerald/30 bg-emerald/5"
                  : "border-mist bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                    step.done
                      ? "bg-emerald text-white"
                      : "bg-mist text-slate-light"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-light">
                  Step {step.id}
                </span>
              </div>
              <p
                className={`text-sm font-semibold leading-tight ${
                  step.done ? "text-emerald-dark" : "text-midnight"
                }`}
              >
                {step.label}
              </p>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

// Re-export icons so consumers don't need to import lucide-react themselves.
export const ONBOARDING_STEP_ICONS = {
  Building2,
  MapPin,
  FileText,
  Banknote,
};
