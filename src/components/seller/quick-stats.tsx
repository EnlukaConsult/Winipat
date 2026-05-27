import Link from "next/link";
import {
  TrendingUp,
  Package,
  Clock,
  Star,
  ArrowRight,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

type QuickStatsProps = {
  totalSales: number;        // kobo
  activeProducts: number;
  pendingOrders: number;
  avgRating: number;         // 0 if no reviews yet
  totalReviews: number;      // used to distinguish "0★" vs "no reviews yet"
  loading: boolean;
};

// 4-up KPI tiles with proper empty states. Old card said "₦0 · 0 · 0 · —"
// which kills emotional engagement on day one. Each tile now has a
// distinct empty-state copy + a CTA that turns the zero into action.
export function QuickStats({
  totalSales,
  activeProducts,
  pendingOrders,
  avgRating,
  totalReviews,
  loading,
}: QuickStatsProps) {
  const tiles: Tile[] = [
    {
      label: "Total sales",
      icon: TrendingUp,
      tone: "emerald",
      empty: totalSales === 0,
      value: formatNaira(totalSales / 100),
      emptyTitle: "No sales yet",
      emptyHint: "First payout typically arrives 2–3 days after delivery.",
      emptyCta: { href: "/seller/products/new", label: "List your first product" },
    },
    {
      label: "Active products",
      icon: Package,
      tone: "royal",
      empty: activeProducts === 0,
      value: activeProducts.toLocaleString(),
      emptyTitle: "No live products",
      emptyHint: "Products go live once you've listed and they pass moderation.",
      emptyCta: { href: "/seller/products/new", label: "Add a product" },
    },
    {
      label: "Pending orders",
      icon: Clock,
      tone: "amber",
      empty: pendingOrders === 0,
      value: pendingOrders.toLocaleString(),
      emptyTitle: "Nothing to ship",
      emptyHint: "Orders appear here the moment a buyer pays.",
      emptyCta: { href: "/seller/orders", label: "View order history" },
    },
    {
      label: "Average rating",
      icon: Star,
      tone: "gold",
      empty: totalReviews === 0,
      value: `${avgRating.toFixed(1)}★`,
      emptyTitle: "No reviews yet",
      emptyHint: "Buyers leave a review after confirming delivery.",
      emptyCta: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {tiles.map((tile) => (
        <Tile key={tile.label} tile={tile} loading={loading} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

type Tone = "emerald" | "royal" | "amber" | "gold";

type Tile = {
  label: string;
  icon: React.ElementType;
  tone: Tone;
  empty: boolean;
  value: string;
  emptyTitle: string;
  emptyHint: string;
  emptyCta: { href: string; label: string } | null;
};

function Tile({ tile, loading }: { tile: Tile; loading: boolean }) {
  const Icon = tile.icon;
  const iconBg = TONE_ICON_BG[tile.tone];
  const iconFg = TONE_ICON_FG[tile.tone];

  if (loading) {
    return (
      <div className="rounded-2xl border border-mist bg-white p-4 sm:p-5 min-h-[148px]">
        <div className="h-9 w-9 rounded-xl bg-mist animate-pulse" />
        <div className="mt-3 h-4 w-20 bg-mist rounded animate-pulse" />
        <div className="mt-2 h-7 w-32 bg-mist rounded animate-pulse" />
      </div>
    );
  }

  // Filled state — show the number, large
  if (!tile.empty) {
    return (
      <div className="group rounded-2xl border border-mist bg-white p-4 sm:p-5 hover:border-mist-dark transition-colors min-h-[148px] flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">
            {tile.label}
          </p>
          <div
            className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg}`}
          >
            <Icon className={`h-4 w-4 ${iconFg}`} aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 font-[family-name:var(--font-sora)] text-2xl sm:text-[26px] font-bold text-midnight leading-tight">
          {tile.value}
        </p>
      </div>
    );
  }

  // Empty state — copy that drives action
  return (
    <div
      className={`group rounded-2xl border ${TONE_EMPTY_BORDER[tile.tone]} ${TONE_EMPTY_BG[tile.tone]} p-4 sm:p-5 min-h-[148px] flex flex-col`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">
          {tile.label}
        </p>
        <div
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg}`}
        >
          <Icon className={`h-4 w-4 ${iconFg}`} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm font-bold text-midnight leading-tight">
        {tile.emptyTitle}
      </p>
      <p className="mt-1 text-xs text-slate-light leading-snug flex-1">
        {tile.emptyHint}
      </p>
      {tile.emptyCta && (
        <Link
          href={tile.emptyCta.href}
          className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${iconFg} hover:underline`}
        >
          {tile.emptyCta.label}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// ─── Tone palette lookups ────────────────────────────────────────────────

const TONE_ICON_BG: Record<Tone, string> = {
  emerald: "bg-emerald/10",
  royal:   "bg-royal/10",
  amber:   "bg-warning/15",
  gold:    "bg-gold/20",
};

const TONE_ICON_FG: Record<Tone, string> = {
  emerald: "text-emerald-dark",
  royal:   "text-royal",
  amber:   "text-amber-600",
  gold:    "text-gold-dark",
};

const TONE_EMPTY_BG: Record<Tone, string> = {
  emerald: "bg-emerald/[0.03]",
  royal:   "bg-royal/[0.03]",
  amber:   "bg-warning/[0.04]",
  gold:    "bg-gold/[0.04]",
};

const TONE_EMPTY_BORDER: Record<Tone, string> = {
  emerald: "border-emerald/15",
  royal:   "border-royal/15",
  amber:   "border-warning/20",
  gold:    "border-gold/25",
};
