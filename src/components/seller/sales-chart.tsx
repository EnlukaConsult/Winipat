"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatNaira } from "@/lib/utils";

export type SalesPoint = {
  date: string;     // YYYY-MM-DD
  sales: number;    // naira (already converted from kobo)
  orders: number;
};

type SalesChartProps = {
  data: SalesPoint[];      // 30 daily points (oldest -> newest)
  loading?: boolean;
};

// Last-30-days area chart. Sales axis on left in naira, hidden by default
// on mobile to keep the chart readable. Empty state covers the "no orders
// in 30 days" case with a CTA rather than rendering an empty grid.
export function SalesChart({ data, loading }: SalesChartProps) {
  const totalSales = data.reduce((sum, p) => sum + p.sales, 0);
  const totalOrders = data.reduce((sum, p) => sum + p.orders, 0);
  const hasAnySales = totalSales > 0;

  return (
    <article className="rounded-2xl border border-mist bg-white p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-base font-bold text-midnight">
            Sales · last 30 days
          </h2>
          {hasAnySales ? (
            <p className="mt-0.5 text-sm text-slate-light">
              <strong className="text-midnight">{formatNaira(totalSales)}</strong>{" "}
              from{" "}
              <strong className="text-midnight">
                {totalOrders} order{totalOrders === 1 ? "" : "s"}
              </strong>
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-light">
              No completed orders in the last 30 days
            </p>
          )}
        </div>
        <Link
          href="/seller/orders"
          className="text-xs font-bold text-violet hover:underline inline-flex items-center gap-1 shrink-0"
        >
          View orders
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </header>

      {loading ? (
        <div className="h-[220px] rounded-xl bg-mist animate-pulse" />
      ) : !hasAnySales ? (
        <EmptyState />
      ) : (
        <div className="h-[220px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
              />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1_000     ? `${(v / 1_000).toFixed(0)}k`
                  : `${v}`}
                width={40}
              />
              <Tooltip
                content={<SalesTooltip />}
                cursor={{ stroke: "#CBD5E1", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#7C3AED"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="h-[220px] rounded-xl border border-dashed border-mist bg-cloud/40 flex flex-col items-center justify-center text-center px-6">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-violet/10 text-violet mb-2.5">
        <TrendingUp className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-bold text-midnight">Your sales chart will fill in here</p>
      <p className="text-xs text-slate-light mt-1 max-w-sm">
        Once orders complete and escrow releases, you&apos;ll see the daily trend over the last 30 days.
      </p>
      <Link
        href="/seller/products/new"
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet hover:underline"
      >
        Add a product to get started
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}

function SalesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: SalesPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg bg-midnight text-white px-3 py-2 shadow-xl text-xs border border-white/10">
      <p className="font-bold">{longDate(label || point.date)}</p>
      <p className="mt-1 text-white/80">
        <span className="text-violet-light font-bold">
          {formatNaira(point.sales)}
        </span>{" "}
        · {point.orders} order{point.orders === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function shortDate(iso: string) {
  // YYYY-MM-DD -> "12 Jun"
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

function longDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
