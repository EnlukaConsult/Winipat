import Link from "next/link";
import { Lock, ShieldCheck, Truck, LifeBuoy } from "lucide-react";

// Thin 4-icon reminder of the buyer-protection promises. Sits just under
// the hero so it's the second thing buyers see — answers the implicit
// "should I trust this site with my money?" question without taking up
// dashboard real estate.
//
// Each row is a one-liner; clickable variants link to the relevant
// /legal page for the long version.
export function TrustBar() {
  return (
    <ul
      className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-mist bg-white p-3 sm:p-4"
      role="list"
      aria-label="Buyer protection promises"
    >
      {ROWS.map((row) => {
        const Icon = row.icon;
        return (
          <li key={row.title}>
            <Link
              href={row.href}
              className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-cloud transition-colors min-h-[44px]"
            >
              <span
                className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${row.bg}`}
              >
                <Icon className={`h-4 w-4 ${row.fg}`} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-midnight leading-tight">
                  {row.title}
                </p>
                <p className="text-[10px] text-slate-light leading-tight mt-0.5">
                  {row.sub}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const ROWS = [
  {
    icon: Lock,
    title: "Escrow protected",
    sub: "Funds held safe",
    bg: "bg-violet/10",
    fg: "text-violet",
    href: "/legal/terms#section-6",
  },
  {
    icon: ShieldCheck,
    title: "KYC-verified sellers",
    sub: "ID + bank checked",
    bg: "bg-emerald/10",
    fg: "text-emerald-dark",
    href: "/legal/terms#section-13",
  },
  {
    icon: Truck,
    title: "Tracked delivery",
    sub: "Photo at each step",
    bg: "bg-teal/10",
    fg: "text-teal",
    href: "/shipping",
  },
  {
    icon: LifeBuoy,
    title: "Easy disputes",
    sub: "48-hour window",
    bg: "bg-amber-500/10",
    fg: "text-amber-600",
    href: "/legal/dispute-policy",
  },
];
