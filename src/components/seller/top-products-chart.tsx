"use client";

import Link from "next/link";
import { BarChart3, Package, ArrowRight } from "lucide-react";

export type TopProduct = {
  id: string;
  name: string;
  orders: number;
  revenue: number;        // naira
};

type TopProductsChartProps = {
  data: TopProduct[];     // already sorted desc by orders (top 5)
  loading?: boolean;
};

// Horizontal bar chart — bigger product names readable, fits the narrow
// dashboard column better than a vertical chart. Each row shows order
// count + revenue with a proportional bar.
export function TopProductsChart({ data, loading }: TopProductsChartProps) {
  const max = Math.max(...data.map((p) => p.orders), 1);

  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
            Top products
          </h2>
          <p className="mt-0.5 text-sm text-slate-light">
            Your 5 most-ordered listings
          </p>
        </div>
        <Link
          href="/seller/products"
          className="text-xs font-bold text-violet hover:underline inline-flex items-center gap-1 shrink-0"
        >
          All products
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-mist animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : (
        <ol className="space-y-2.5" role="list">
          {data.map((p, i) => (
            <li key={p.id} className="group">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-semibold text-midnight truncate flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-cloud text-[10px] font-bold text-slate-light shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="text-xs font-bold text-violet shrink-0">
                  {p.orders} order{p.orders === 1 ? "" : "s"}
                </span>
              </div>
              <div className="h-2 rounded-full bg-mist overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet to-teal-light transition-all duration-500"
                  style={{
                    width: `${Math.max(4, (p.orders / max) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-mist bg-cloud/40 flex flex-col items-center justify-center text-center px-6 py-10">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-teal/10 text-teal mb-2.5">
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-midnight">No order data yet</p>
      <p className="text-xs text-slate-light mt-1 max-w-sm">
        We&apos;ll rank your products by sales here as soon as your first orders complete.
      </p>
      <Link
        href="/seller/products"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal hover:underline"
      >
        <Package className="h-3 w-3" aria-hidden="true" />
        Manage products
      </Link>
    </div>
  );
}
