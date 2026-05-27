import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export type CategoryTile = {
  id: string;
  name: string;
  slug: string;
  /** Live count of active products in this category. */
  productCount: number;
  /** Optional hero image scraped from the first product. */
  thumbnail: string | null;
};

type ContinueBrowsingProps = {
  categories: CategoryTile[];   // up to 6, ranked by productCount desc
  loading?: boolean;
};

// "Discover what's new on Winipat" — top categories ordered by live
// product count, each rendered as an image-led tile. Pulled from real
// DB state (no fake "trending" copy). Empty state appears only when the
// platform has zero categories with products, which means there's no
// catalogue to surface yet.
export function ContinueBrowsing({
  categories,
  loading,
}: ContinueBrowsingProps) {
  return (
    <article className="rounded-2xl border border-violet/20 bg-gradient-to-br from-violet/[0.04] via-white to-teal/[0.04] p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet/10 text-violet">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
              Continue browsing
            </h2>
            <p className="mt-0.5 text-sm text-slate-light">
              Categories with the most listings right now
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/browse"
          className="text-xs font-bold text-violet hover:underline inline-flex items-center gap-1 shrink-0"
        >
          Browse all
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-mist animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState />
      ) : (
        <ul
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          role="list"
        >
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/dashboard/browse?category=${cat.slug}`}
                className="group relative block aspect-[4/3] rounded-xl overflow-hidden bg-cloud border border-mist hover:border-violet/40 transition-colors"
              >
                {cat.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.thumbnail}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-violet/20 via-teal/15 to-emerald/15" />
                )}
                {/* Bottom gradient for legibility */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="text-sm font-bold leading-tight">{cat.name}</p>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {cat.productCount.toLocaleString()}{" "}
                    {cat.productCount === 1 ? "listing" : "listings"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist bg-white/50 flex flex-col items-center justify-center text-center px-6 py-8">
      <p className="text-sm font-bold text-midnight">Catalogue is still warming up</p>
      <p className="text-xs text-slate-light mt-1 max-w-sm">
        New verified sellers are joining every week. Check back tomorrow — or
        browse what&apos;s live now.
      </p>
      <Link
        href="/dashboard/browse"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet hover:underline"
      >
        Browse now
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}
