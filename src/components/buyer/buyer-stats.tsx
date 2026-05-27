import Link from "next/link";
import {
  ShoppingBag,
  Wallet,
  Package,
  Star,
  ArrowRight,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";

type BuyerStatsProps = {
  totalOrders: number;       // all-time
  activeOrders: number;      // in flight
  totalSpent: number;        // kobo
  reviewsLeft: number;
  loading: boolean;
};

// 4 KPI tiles for the buyer dashboard, mirroring the seller side's
// `quick-stats` shape — empty states with personality, not just zeros.
export function BuyerStats({
  totalOrders,
  activeOrders,
  totalSpent,
  reviewsLeft,
  loading,
}: BuyerStatsProps) {
  const tiles: Tile[] = [
    {
      label: "Orders placed",
      icon: ShoppingBag,
      tone: "violet",
      empty: totalOrders === 0,
      value: totalOrders.toLocaleString(),
      emptyTitle: "No orders yet",
      emptyHint: "Browse verified Nigerian sellers — escrow keeps your payment safe.",
      emptyCta: { href: "/dashboard/browse", label: "Start browsing" },
    },
    {
      label: "Money spent",
      icon: Wallet,
      tone: "teal",
      empty: totalSpent === 0,
      value: formatNaira(totalSpent / 100),
      emptyTitle: "Nothing spent yet",
      emptyHint: "Your spend across completed orders shows up here.",
      emptyCta: null,
    },
    {
      label: "Active orders",
      icon: Package,
      tone: "amber",
      empty: activeOrders === 0,
      value: activeOrders.toLocaleString(),
      emptyTitle: "Nothing in flight",
      emptyHint: "Orders appear here from payment confirmation through delivery.",
      emptyCta: totalOrders > 0
        ? { href: "/dashboard/orders", label: "View past orders" }
        : null,
    },
    {
      label: "Reviews left",
      icon: Star,
      tone: "gold",
      empty: reviewsLeft === 0,
      value: reviewsLeft.toLocaleString(),
      emptyTitle: "No reviews yet",
      emptyHint: "After a delivery, you can rate the seller from the order page.",
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

type Tone = "violet" | "teal" | "amber" | "gold";

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

  if (!tile.empty) {
    return (
      <div className="rounded-2xl border border-mist bg-white p-4 sm:p-5 hover:border-mist-dark transition-colors min-h-[148px] flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">
            {tile.label}
          </p>
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconFg}`} aria-hidden="true" />
          </div>
        </div>
        <p className="mt-3 font-[family-name:var(--font-sora)] text-2xl sm:text-[26px] font-bold text-midnight leading-tight">
          {tile.value}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border ${TONE_EMPTY_BORDER[tile.tone]} ${TONE_EMPTY_BG[tile.tone]} p-4 sm:p-5 min-h-[148px] flex flex-col`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-light">
          {tile.label}
        </p>
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg}`}>
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

const TONE_ICON_BG: Record<Tone, string> = {
  violet: "bg-violet/10",
  teal:   "bg-teal/10",
  amber:  "bg-warning/15",
  gold:   "bg-gold/20",
};
const TONE_ICON_FG: Record<Tone, string> = {
  violet: "text-violet",
  teal:   "text-teal",
  amber:  "text-amber-600",
  gold:   "text-gold-dark",
};
const TONE_EMPTY_BG: Record<Tone, string> = {
  violet: "bg-violet/[0.03]",
  teal:   "bg-teal/[0.03]",
  amber:  "bg-warning/[0.04]",
  gold:   "bg-gold/[0.04]",
};
const TONE_EMPTY_BORDER: Record<Tone, string> = {
  violet: "border-violet/15",
  teal:   "border-teal/15",
  amber:  "border-warning/20",
  gold:   "border-gold/25",
};
