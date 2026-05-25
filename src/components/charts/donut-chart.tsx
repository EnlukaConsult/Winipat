"use client";

import { useId } from "react";

type Slice = { label: string; value: number; color: string };

interface DonutChartProps {
  data: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

// SVG donut. No external chart lib — we compute strokeDasharray offsets
// around a single <circle> per slice. Cheap, theme-able, and a tiny
// payload compared to recharts/chart.js.
export function DonutChart({
  data,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  showLegend = true,
}: DonutChartProps) {
  const id = useId();
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Accumulate offsets so each slice starts where the previous one ended.
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgb(229,231,235)" // mist-ish track
            strokeWidth={thickness}
          />
          {total > 0 &&
            data.map((slice, i) => {
              const length = (slice.value / total) * circumference;
              const gap = circumference - length;
              const dashOffset = -offset;
              offset += length;
              return (
                <circle
                  key={`${id}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${length} ${gap}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                >
                  <title>
                    {slice.label}: {slice.value.toLocaleString()} (
                    {Math.round((slice.value / total) * 100)}%)
                  </title>
                </circle>
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {centerValue && (
            <p className="text-2xl font-bold text-midnight font-[family-name:var(--font-sora)] leading-none">
              {centerValue}
            </p>
          )}
          {centerLabel && (
            <p className="text-[10px] uppercase tracking-wide text-slate-lighter mt-1">
              {centerLabel}
            </p>
          )}
        </div>
      </div>

      {showLegend && data.length > 0 && (
        <ul className="w-full space-y-1">
          {data.map((s, i) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <li
                key={`${id}-l-${i}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-slate truncate">{s.label}</span>
                </span>
                <span className="text-slate-light tabular-nums shrink-0">
                  {s.value.toLocaleString()} · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
