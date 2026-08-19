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
}

/**
 * Minimal inline line chart — no axes/gridlines/legend, matches the "recognizable, not bespoke"
 * guidance (see docs/design-reference-bank.md's data-goblins reference) over a fancier custom
 * visual. Hand-rolled SVG rather than VegaVisual: this renders inline per-row/per-panel at a
 * size Vega's chrome isn't built for, and plain SVG can use `currentColor` + Tailwind's severity
 * classes directly (Vega's internal renderer can't resolve `var(--color-*)`, see
 * top-at-risk-list.tsx) — no light/dark hex duplication needed here.
 */
export function Sparkline({ data, forecastDays = 0, width = 96, height = 32, className, ariaLabel }: SparklineProps) {
    const pad = 3;
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
    const stepX = (width - pad * 2) / Math.max(1, all.length - 1);

    const toPoint = (v: number, i: number): Point => ({
        x: pad + i * stepX,
        y: pad + (1 - (v - min) / range) * (height - pad * 2),
    });

    const actualPoints = data.map((v, i) => toPoint(v, i));
    const last = actualPoints[actualPoints.length - 1];
    const areaPath =
        toPath(actualPoints) +
        ` L${last.x.toFixed(1)},${(height - pad).toFixed(1)} L${actualPoints[0].x.toFixed(1)},${(height - pad).toFixed(1)} Z`;

    const forecastPoints =
        projected.length > 0
            ? [last, ...projected.map((v, i) => toPoint(v, data.length + i))]
            : [];

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
            <circle cx={last.x} cy={last.y} r="2.4" fill="currentColor" />
        </svg>
    );
}
