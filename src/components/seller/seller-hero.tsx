import Link from "next/link";
import { ArrowRight, Sparkles, Store } from "lucide-react";
import type { SellerLevel } from "./seller-level";

type SellerHeroProps = {
  firstName: string;
  businessName: string | null;
  sellerId: string | null;          // null = no sellers row yet
  isApproved: boolean;
  level: SellerLevel;
};

// Hero card sitting at the top of the seller dashboard. Replaces the old
// plain "Welcome back" line with a dark gradient card containing the
// seller's name, level badge, level progress, and the "View my storefront"
// CTA. Sets the emotional tone for the rest of the page.
export function SellerHero({
  firstName,
  businessName,
  sellerId,
  isApproved,
  level,
}: SellerHeroProps) {
  const storefrontHref = isApproved && sellerId ? `/sellers/${sellerId}` : null;

  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white px-6 py-6 sm:px-8 sm:py-8"
      style={{
        background: `
          radial-gradient(circle at 88% 12%, rgba(124,58,237,0.55), transparent 38%),
          radial-gradient(circle at 8% 88%, rgba(20,184,166,0.28), transparent 36%),
          linear-gradient(125deg, #0B1020 0%, #15205A 55%, #4B23C0 100%)
        `,
      }}
    >
      {/* Faint dotted backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-10 items-start">
        {/* Left — greeting + level */}
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="h-3 w-3 text-gold" aria-hidden="true" />
            Seller Portal
          </div>

          <h1 className="font-[family-name:var(--font-sora)] text-2xl sm:text-3xl font-bold leading-tight">
            Welcome back, {firstName}
          </h1>

          <p className="mt-1.5 text-sm sm:text-base text-white/70">
            {businessName ?? "Finish setting up your store to start earning."}
          </p>

          {/* Level pill + progress */}
          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/12 border border-white/20 text-sm font-bold">
                <span aria-hidden="true">{level.emoji}</span>
                Level {level.tier} · {level.label}
              </div>
              <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                {Math.round(level.progress * 100)}%
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-white/10 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(level.progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress to next seller level"
            >
              <div
                className="h-full bg-gradient-to-r from-gold via-teal-light to-violet-light transition-all duration-700"
                style={{ width: `${Math.max(2, level.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              {level.nextRequirement ?? "You've reached the highest tier — keep it up!"}
            </p>
          </div>
        </div>

        {/* Right — Storefront CTA */}
        <div className="flex flex-col gap-2.5 lg:items-end shrink-0">
          {storefrontHref ? (
            <Link
              href={storefrontHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-midnight font-bold text-sm hover:bg-cloud transition-colors shadow-lg min-h-[44px]"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              View my storefront
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <div
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white/45 font-bold text-sm cursor-not-allowed border border-white/10 min-h-[44px]"
              title="Storefront unlocks once KYC is approved"
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              Storefront locked
            </div>
          )}
          <p className="text-[11px] text-white/55 lg:text-right max-w-[200px]">
            {storefrontHref
              ? "Share this link to send buyers straight to your shop."
              : "Storefront unlocks once KYC is approved."}
          </p>
        </div>
      </div>
    </section>
  );
}
