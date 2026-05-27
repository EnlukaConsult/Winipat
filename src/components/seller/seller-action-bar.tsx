import Link from "next/link";
import {
  Plus,
  Upload,
  Wallet,
  Store,
  ArrowRight,
} from "lucide-react";

type SellerActionBarProps = {
  isApproved: boolean;
  sellerId: string | null;
};

// Sticky-ish quick-action bar with the seller's 4 most common jobs.
// Lives just under the hero and stays compact on mobile (icon-only chips
// in a horizontally scrollable row). Pre-approval, write actions are
// shown but visibly disabled with hint copy.
export function SellerActionBar({ isApproved, sellerId }: SellerActionBarProps) {
  const storefrontHref = isApproved && sellerId ? `/sellers/${sellerId}` : null;

  const primary: Action = {
    href: "/seller/products/new",
    label: "Add product",
    icon: Plus,
    tone: "gold",
    disabled: !isApproved,
    disabledHint: "Complete KYC first",
  };

  const secondary: Action[] = [
    {
      href: "/seller/products/bulk",
      label: "Bulk upload",
      icon: Upload,
      tone: "violet",
      disabled: !isApproved,
    },
    {
      href: "/seller/earnings",
      label: "Withdraw",
      icon: Wallet,
      tone: "emerald",
      disabled: !isApproved,
    },
    storefrontHref
      ? {
          href: storefrontHref,
          label: "View storefront",
          icon: Store,
          tone: "royal",
          newTab: true,
        }
      : {
          href: "/seller/onboarding",
          label: "Storefront locked",
          icon: Store,
          tone: "muted",
          disabled: true,
        },
  ];

  return (
    <div className="rounded-2xl border border-mist bg-white p-3 sm:p-4">
      {/* Mobile: horizontally scrollable row of chips
          Desktop: 4-up grid */}
      <div className="flex gap-2.5 overflow-x-auto sm:grid sm:grid-cols-4 sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none">
        <ActionTile {...primary} primary />
        {secondary.map((a) => (
          <ActionTile key={a.label} {...a} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

type Tone = "gold" | "violet" | "emerald" | "royal" | "muted";

type Action = {
  href: string;
  label: string;
  icon: React.ElementType;
  tone: Tone;
  disabled?: boolean;
  disabledHint?: string;
  newTab?: boolean;
};

function ActionTile({
  href,
  label,
  icon: Icon,
  tone,
  disabled,
  disabledHint,
  newTab,
  primary,
}: Action & { primary?: boolean }) {
  const baseClasses =
    "shrink-0 sm:shrink min-w-[140px] sm:min-w-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border min-h-[48px] transition-colors";
  const colorClasses = disabled
    ? "border-mist bg-cloud/60 text-slate-lighter cursor-not-allowed"
    : primary
    ? "border-gold bg-gold text-midnight hover:bg-gold-dark font-bold"
    : `${TONE_BORDER[tone]} ${TONE_BG[tone]} ${TONE_TEXT[tone]} hover:${TONE_HOVER_BG[tone]}`;

  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-sm font-semibold leading-tight truncate flex-1">
        {label}
      </span>
      {!disabled && !primary && (
        <ArrowRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        className={`${baseClasses} ${colorClasses}`}
        title={disabledHint}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={`${baseClasses} ${colorClasses}`}
    >
      {content}
    </Link>
  );
}

const TONE_BORDER: Record<Tone, string> = {
  gold:    "border-gold/40",
  violet:  "border-violet/30",
  emerald: "border-emerald/30",
  royal:   "border-royal/30",
  muted:   "border-mist",
};
const TONE_BG: Record<Tone, string> = {
  gold:    "bg-gold/10",
  violet:  "bg-violet/8",
  emerald: "bg-emerald/8",
  royal:   "bg-royal/8",
  muted:   "bg-cloud",
};
const TONE_TEXT: Record<Tone, string> = {
  gold:    "text-midnight",
  violet:  "text-violet",
  emerald: "text-emerald-dark",
  royal:   "text-royal",
  muted:   "text-slate-light",
};
const TONE_HOVER_BG: Record<Tone, string> = {
  gold:    "bg-gold/15",
  violet:  "bg-violet/12",
  emerald: "bg-emerald/12",
  royal:   "bg-royal/12",
  muted:   "bg-mist",
};
