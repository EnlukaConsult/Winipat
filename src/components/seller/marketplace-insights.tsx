import Link from "next/link";
import { Flame, ArrowRight, MapPin, Sparkles } from "lucide-react";

export type TrendingCategory = {
  slug: string;
  name: string;
  /** Order count this category received in the last 14 days, platform-wide. */
  orders14d: number;
  /** Growth vs the previous 14 days. >0 = trending up. */
  growthPct: number | null;
};

type MarketplaceInsightsProps = {
  trending: TrendingCategory[];   // top 3 categories by recent orders
  loading?: boolean;
};

// Soft real-data marketplace insights for the seller dashboard. We DON'T
// invent stats — only show what the DB actually supports right now:
//   - Top categories by recent (last-14-day) order volume across the
//     whole platform
//   - Each one's growth % vs the previous 14 days
// Things the original critique asked for (regional break-downs, suggested
// pricing) need richer analytics infrastructure and would be misleading
// to fake. Left as "Coming soon" hint at the bottom.
export function MarketplaceInsights({ trending, loading }: MarketplaceInsightsProps) {
  return (
    <article className="rounded-2xl border border-violet/20 bg-gradient-to-br from-violet/[0.04] via-white to-teal/[0.04] p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet/10 text-violet">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
              What&apos;s selling on Winipat
            </h2>
            <p className="mt-0.5 text-sm text-slate-light">
              Categories buyers are ordering most this fortnight
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-mist animate-pulse" />
          ))}
        </div>
      ) : trending.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2.5" role="list">
          {trending.map((cat, i) => (
            <li key={cat.slug}>
              <Link
                href={`/dashboard/browse?category=${cat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-mist hover:border-violet/40 hover:bg-violet/[0.02] transition-colors group"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet to-teal text-white text-xs font-bold">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-midnight truncate">
                    {cat.name}
                  </p>
                  <p className="text-xs text-slate-light mt-0.5">
                    {cat.orders14d.toLocaleString()} order
                    {cat.orders14d === 1 ? "" : "s"} · last 14 days
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <GrowthPill pct={cat.growthPct} />
                </div>
                <ArrowRight
                  className="h-4 w-4 text-slate-lighter group-hover:text-violet shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-slate-light flex items-start gap-1.5">
        <MapPin
          className="h-3 w-3 text-slate-lighter shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <span>
          Regional break-downs (e.g. &ldquo;trending in Lagos&rdquo;) coming
          soon as the platform grows. For now, all stats are nationwide.
        </span>
      </p>
    </article>
  );
}

function GrowthPill({ pct }: { pct: number | null }) {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span className="text-[10px] font-bold text-slate-lighter uppercase tracking-wider">
        New
      </span>
    );
  }
  if (pct >= 10) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald/10 text-emerald-dark text-[10px] font-bold uppercase tracking-wider">
        <Flame className="h-2.5 w-2.5" aria-hidden="true" />
        +{Math.round(pct)}%
      </span>
    );
  }
  if (pct <= -10) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-mist text-slate-light text-[10px] font-bold uppercase tracking-wider">
        {Math.round(pct)}%
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-slate-light uppercase tracking-wider">
      Steady
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist bg-white/50 flex flex-col items-center justify-center text-center px-6 py-8">
      <p className="text-sm font-bold text-midnight">Not enough data yet</p>
      <p className="text-xs text-slate-light mt-1 max-w-sm">
        We&apos;ll surface trending categories as more orders flow through the platform.
        Be one of the early sellers.
      </p>
    </div>
  );
}
