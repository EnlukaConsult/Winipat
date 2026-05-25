"use client";

import { useId, useState } from "react";

type Series = { label: string; color: string; values: number[] };

interface LineChartProps {
  series: Series[];
  xLabels?: string[];
  height?: number;
  yFormat?: (n: number) => string;
  area?: boolean;
}

// SVG line chart with optional gradient area fill + hover tooltip.
// One <polyline> per series, no dependencies. Y axis is auto-scaled
// from the max value across all series.
export function LineChart({
  series,
  xLabels = [],
  height = 180,
  yFormat = (n) => n.toLocaleString(),
  area = true,
}: LineChartProps) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);

  const width = 600; // viewBox width; scales to container
  const padding = { top: 10, right: 10, bottom: 24, left: 36 };

  const count = Math.max(1, ...series.map((s) => s.values.length));
  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);

  const xStep =
    count > 1 ? (width - padding.left - padding.right) / (count - 1) : 0;
  const chartH = height - padding.top - padding.bottom;

  function xAt(i: number) {
    return padding.left + i * xStep;
  }
  function yAt(v: number) {
    return padding.top + chartH - (v / max) * chartH;
  }

  // Y grid: 4 horizontal dashes
  const gridLines = [0.25, 0.5, 0.75, 1.0].map((p) => padding.top + chartH * (1 - p));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseLeave={() => setHover(null)}
      >
        {/* Y grid */}
        {gridLines.map((y, i) => (
          <line
            key={`${id}-g-${i}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="rgb(229,231,235)"
            strokeDasharray="2 4"
          />
        ))}

        {/* Y labels */}
        {[1, 0.5, 0].map((p, i) => (
          <text
            key={`${id}-yl-${i}`}
            x={padding.left - 6}
            y={padding.top + chartH * (1 - p) + 4}
            fontSize="10"
            textAnchor="end"
            fill="rgb(148,163,184)"
          >
            {yFormat(max * p)}
          </text>
        ))}

        {/* Series */}
        {series.map((s, sIdx) => {
          const points = s.values
            .map((v, i) => `${xAt(i)},${yAt(v)}`)
            .join(" ");
          const areaPoints = `${xAt(0)},${padding.top + chartH} ${points} ${xAt(
            s.values.length - 1
          )},${padding.top + chartH}`;
          const gradientId = `${id}-grad-${sIdx}`;
          return (
            <g key={`${id}-s-${sIdx}`}>
              {area && (
                <>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill={`url(#${gradientId})`} />
                </>
              )}
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {hover !== null && s.values[hover] !== undefined && (
                <circle
                  cx={xAt(hover)}
                  cy={yAt(s.values[hover])}
                  r={4}
                  fill="white"
                  stroke={s.color}
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* Hover hit-areas (invisible verticals across the chart) */}
        {Array.from({ length: count }).map((_, i) => (
          <rect
            key={`${id}-h-${i}`}
            x={xAt(i) - xStep / 2}
            y={padding.top}
            width={xStep}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Hover vertical line */}
        {hover !== null && (
          <line
            x1={xAt(hover)}
            x2={xAt(hover)}
            y1={padding.top}
            y2={padding.top + chartH}
            stroke="rgb(148,163,184)"
            strokeDasharray="2 2"
          />
        )}

        {/* X labels (first / mid / last only to keep things tidy) */}
        {xLabels.length > 0 && (
          <>
            <text
              x={xAt(0)}
              y={height - 6}
              fontSize="10"
              textAnchor="start"
              fill="rgb(148,163,184)"
            >
              {xLabels[0]}
            </text>
            {xLabels.length > 2 && (
              <text
                x={(xAt(0) + xAt(count - 1)) / 2}
                y={height - 6}
                fontSize="10"
                textAnchor="middle"
                fill="rgb(148,163,184)"
              >
                {xLabels[Math.floor((count - 1) / 2)]}
              </text>
            )}
            <text
              x={xAt(count - 1)}
              y={height - 6}
              fontSize="10"
              textAnchor="end"
              fill="rgb(148,163,184)"
            >
              {xLabels[xLabels.length - 1]}
            </text>
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hover !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs px-2">
          <span className="text-slate-lighter font-medium">
            {xLabels[hover] ?? `#${hover + 1}`}
          </span>
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate">{s.label}:</span>
              <span className="text-midnight font-semibold">
                {yFormat(s.values[hover] ?? 0)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Legend */}
      {series.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {series.map((s, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-slate-light">{s.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
