"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { AppSettings } from "@/lib/types";

interface RevenueChartProps {
  data: { date: Date; revenue: number }[];
  settings: AppSettings;
}

const HEIGHT = 150;
const PLOT_TOP = 26;
const LABEL_GAP = 20;

/**
 * Single-series daily revenue bars. Tap a bar to read its value; the highest
 * day is labeled by default. Values use ink text tokens, not the series color.
 */
export function RevenueChart({ data, settings }: RevenueChartProps) {
  const [selected, setSelected] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.revenue), 1);
  const maxIndex = data.reduce(
    (best, d, i) => (d.revenue > data[best].revenue ? i : best),
    0,
  );
  const hasSales = data.some((d) => d.revenue > 0);
  const labeled = selected ?? (hasSales ? maxIndex : null);

  const width = 320;
  const slot = width / data.length;
  const barWidth = Math.min(28, slot * 0.55);
  const plotHeight = HEIGHT - PLOT_TOP - LABEL_GAP;

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className="w-full h-auto touch-manipulation"
      role="img"
      aria-label={`Revenue for the last ${data.length} days`}
    >
      {/* Baseline */}
      <line
        x1={0}
        x2={width}
        y1={HEIGHT - LABEL_GAP}
        y2={HEIGHT - LABEL_GAP}
        stroke="var(--color-border-strong)"
        strokeWidth={1}
      />
      {data.map((d, i) => {
        const barHeight =
          d.revenue > 0 ? Math.max(4, (d.revenue / max) * plotHeight) : 2;
        const x = i * slot + (slot - barWidth) / 2;
        const y = HEIGHT - LABEL_GAP - barHeight;
        const isLabeled = labeled === i;
        return (
          <g key={d.date.toISOString()} onClick={() => setSelected(i)}>
            {/* Oversized invisible hit target */}
            <rect x={i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={
                d.revenue > 0 ? "var(--color-primary)" : "var(--color-border)"
              }
              opacity={selected === null || selected === i ? 1 : 0.45}
            />
            {isLabeled && d.revenue > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 7}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-ink)"
              >
                {formatMoney(d.revenue, settings)}
              </text>
            )}
            <text
              x={x + barWidth / 2}
              y={HEIGHT - 5}
              textAnchor="middle"
              fontSize={10.5}
              fill="var(--color-ink-3)"
            >
              {d.date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
