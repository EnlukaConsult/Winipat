import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Package } from "lucide-react";

type BuyerHeroProps = {
  firstName: string;
  /** Count of orders currently in-flight (payment_confirmed → in_transit). */
  activeOrders: number;
};

// Buyer dashboard hero — mirrors the seller hero's visual weight but the
// content is shopper-flavoured. Big "Continue shopping" CTA on the right
// because that's the primary intent. The pill on the left changes based
// on whether the buyer has anything in flight or not.
export function BuyerHero({ firstName, activeOrders }: BuyerHeroProps) {
  const hasActive = activeOrders > 0;

  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white px-6 py-6 sm:px-8 sm:py-8"
      style={{
        background: `
          radial-gradient(circle at 90% 12%, rgba(20,184,166,0.42), transparent 38%),
          radial-gradient(circle at 8% 88%, rgba(124,58,237,0.45), transparent 38%),
          linear-gradient(125deg, #0B1020 0%, #15205A 50%, #0F766E 100%)
        `,
      }}
    >
      {/* Subtle dotted backdrop */}
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
        {/* Left — greeting + status pill */}
        <div className="min-w-0">
          {hasActive ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-[11px] font-bold uppercase tracking-wider mb-3 text-gold-light">
              <Package className="h-3 w-3" aria-hidden="true" />
              {activeOrders} order{activeOrders === 1 ? "" : "s"} in flight
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="h-3 w-3 text-teal-light" aria-hidden="true" />
              Escrow protected
            </div>
          )}

          <h1 className="font-[family-name:var(--font-sora)] text-2xl sm:text-3xl font-bold leading-tight">
            {hasActive
              ? `Welcome back, ${firstName}`
              : `Hi ${firstName} — happy shopping`}
          </h1>

          <p className="mt-1.5 text-sm sm:text-base text-white/75 max-w-xl">
            {hasActive
              ? "Track what's on the way and discover what's new — everything below."
              : "Browse verified Nigerian sellers. Your payment stays in escrow until you confirm delivery."}
          </p>
        </div>

        {/* Right — Continue shopping CTA */}
        <div className="flex flex-col gap-2.5 lg:items-end shrink-0">
          <Link
            href="/dashboard/browse"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-midnight font-bold text-sm hover:bg-cloud transition-colors shadow-lg min-h-[44px]"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Continue shopping
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p className="text-[11px] text-white/55 lg:text-right max-w-[220px]">
            Free to browse. You only register at checkout.
          </p>
        </div>
      </div>
    </section>
  );
}
