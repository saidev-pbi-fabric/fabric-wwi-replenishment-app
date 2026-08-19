//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { cn } from "@/lib/utils";

interface Point {
    x: number;
    y: number;
}

/** Ordinary least-squares slope/intercept over `[0..n-1] -> data[i]`. */
function linearRegression(data: number[]): { slope: number; intercept: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] ?? 0 };

    const meanX = (n - 1) / 2;
    const meanY = data.reduce((sum, v) => sum + v, 0) / n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        num += (i - meanX) * (data[i] - meanY);
        den += (i - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    return { slope, intercept: meanY - slope * meanX };
}

function toPath(points: Point[]): string {
    return points.map((p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ");
}

interface SparklineProps {
    /** Real daily values, chronological. */
    data: number[];
    /**
     * Days to project forward as a dashed continuation, using a naive linear trend over `data`
     * (least-squares slope) — not a statistical forecast model. Omit or 0 to show actual data only.
     */
    forecastDays?: number;
    width?: number;
    height?: number;
    /** Tailwind text-color class (e.g. "text-critical") — stroke/fill use currentColor. */
    className?: string;
    ariaLabel: string;
    /** Labels the highest/lowest real (non-forecast) points — a sparkline with no scale at all is
     * unreadable on its own; this is the minimum context to keep it honest without adding a full
     * axis (which would defeat the point of a sparkline). */
    showMinMax?: boolean;
    /** Labels the last real data point too ("Label Latest Data Point" — the value the rest of the
     * panel is already keyed off, so it's worth calling out even though it's also the plain dot). */
    showLatestValue?: boolean;
    /** How to render the min/max/latest values — defaults to a rounded integer. */
    formatValue?: (value: number) => string;
    /**
     * One label per real (non-forecast) `data` point, same order/length — typically a date.
     * When provided, each point gets an invisible, larger hit-target with a native SVG `<title>`
     * so hovering any point (not just the always-visible min/max/latest dots) shows its exact
     * label + value as a plain browser tooltip. No hover-state JS, no popover positioning to get
     * wrong — matches this component's "hand-rolled, minimal" brief. Omit to skip per-point
     * tooltips entirely (e.g. when no date data is available).
     */
    labels?: string[];
}

/**
 * Minimal inline line chart — no axes/gridlines/legend, matches the "recognizable, not bespoke"
 * guidance (see docs/design-reference-bank.md's data-goblins reference) over a fancier custom
 * visual. Hand-rolled SVG rather than VegaVisual: this renders inline per-row/per-panel at a
 * size Vega's chrome isn't built for, and plain SVG can use `currentColor` + Tailwind's severity
 * classes directly (Vega's internal renderer can't resolve `var(--color-*)`, see
 * top-at-risk-list.tsx) — no light/dark hex duplication needed here.
 */
export function Sparkline({
    data,
    forecastDays = 0,
    width = 96,
    height = 32,
    className,
    ariaLabel,
    showMinMax = false,
    showLatestValue = false,
    formatValue = (v) => Math.round(v).toLocaleString(),
    labels,
}: SparklineProps) {
    const padX = 3;
    // Value labels need clear room above/below the line, or they clip against the chart edge.
    const padY = showMinMax || showLatestValue ? 15 : 3;
    if (data.length === 0) return null;

    const { slope, intercept } = linearRegression(data);
    const projected =
        forecastDays > 0
            ? Array.from({ length: forecastDays }, (_, i) => intercept + slope * (data.length - 1 + i + 1))
            : [];

    const all = [...data, ...projected];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = Math.max(1, max - min);
    const stepX = (width - padX * 2) / Math.max(1, all.length - 1);

    const toPoint = (v: number, i: number): Point => ({
        x: padX + i * stepX,
        y: padY + (1 - (v - min) / range) * (height - padY * 2),
    });

    const actualPoints = data.map((v, i) => toPoint(v, i));
    const last = actualPoints[actualPoints.length - 1];
    const areaPath =
        toPath(actualPoints) +
        ` L${last.x.toFixed(1)},${(height - padY).toFixed(1)} L${actualPoints[0].x.toFixed(1)},${(height - padY).toFixed(1)} Z`;

    const forecastPoints =
        projected.length > 0
            ? [last, ...projected.map((v, i) => toPoint(v, data.length + i))]
            : [];

    let maxIndex = 0;
    let minIndex = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] > data[maxIndex]) maxIndex = i;
        if (data[i] < data[minIndex]) minIndex = i;
    }
    const maxPoint = actualPoints[maxIndex];
    const minPoint = actualPoints[minIndex];

    return (
        <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={ariaLabel}
            className={cn("block", className)}
        >
            {forecastPoints.length > 0 ? (
                <rect
                    x={last.x}
                    y="0"
                    width={Math.max(0, width - last.x)}
                    height={height}
                    fill="currentColor"
                    opacity="0.06"
                />
            ) : null}
            <path d={areaPath} fill="currentColor" opacity="0.12" />
            <path d={toPath(actualPoints)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            {forecastPoints.length > 0 ? (
                <path
                    d={toPath(forecastPoints)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeDasharray="3,2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.55"
                />
            ) : null}
            {showMinMax && maxIndex !== minIndex ? (
                <>
                    <circle cx={maxPoint.x} cy={maxPoint.y} r="1.8" fill="currentColor" opacity="0.7" />
                    <text
                        x={maxPoint.x}
                        y={maxPoint.y - 5}
                        textAnchor={maxIndex < data.length / 2 ? "start" : "end"}
                        fontSize="8"
                        fill="currentColor"
                        opacity="0.75"
                    >
                        {formatValue(data[maxIndex])}
                    </text>
                    <circle cx={minPoint.x} cy={minPoint.y} r="1.8" fill="currentColor" opacity="0.7" />
                    <text
                        x={minPoint.x}
                        y={minPoint.y + 11}
                        textAnchor={minIndex < data.length / 2 ? "start" : "end"}
                        fontSize="8"
                        fill="currentColor"
                        opacity="0.75"
                    >
                        {formatValue(data[minIndex])}
                    </text>
                </>
            ) : null}
            <circle cx={last.x} cy={last.y} r="2.4" fill="currentColor" />
            {showLatestValue ? (
                <text
                    x={last.x}
                    y={last.y - 6}
                    textAnchor="end"
                    fontSize="8"
                    fontWeight="600"
                    fill="currentColor"
                >
                    {formatValue(data[data.length - 1])}
                </text>
            ) : null}
            {labels
                ? actualPoints.map((p, i) =>
                      labels[i] === undefined ? null : (
                          <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r="6"
                              fill="transparent"
                              className="cursor-default"
                          >
                              <title>{`${labels[i]}: ${formatValue(data[i])}`}</title>
                          </circle>
                      ),
                  )
                : null}
        </svg>
    );
}
