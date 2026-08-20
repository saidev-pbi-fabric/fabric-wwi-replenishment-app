//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { cn } from "@/lib/utils";

interface ItemTrendChartProps {
    /** Real daily values, chronological. No forward projection — see the same decision recorded
     * on `sparkline.tsx`; this dataset's DAX has no forecast measure. */
    data: number[];
    /** Labels for the first and last data point, e.g. "Oct 1" / "Nov 30, 2000". */
    startLabel: string;
    endLabel: string;
    width?: number;
    height?: number;
    /** Tailwind text-color class (e.g. "text-critical") — stroke/fill use currentColor. */
    className?: string;
    ariaLabel: string;
    formatValue?: (value: number) => string;
}

/**
 * A real small chart, not a sparkline — deliberately a separate component from
 * `shared/sparkline.tsx`, not a variant of it. `sparkline.tsx` has an explicit, intentional
 * "no axes/gridlines/legend" design principle that holds for every true sparkline use (ranked-
 * list rows, KPI drill tables); this component is for the one spot that outgrew that shape — the
 * item-detail panel's 640px-wide trend view, where a gridded axis was picked after a direct
 * side-by-side comparison over a minimal/caption-only alternative (SPEC.md Amendment, 2026-08-20).
 * Adding gridlines into the shared component instead would have changed every other use site
 * along with the one that actually needed them.
 */
export function ItemTrendChart({
    data,
    startLabel,
    endLabel,
    width = 640,
    height = 100,
    className,
    ariaLabel,
    formatValue = (v) => Math.round(v).toLocaleString(),
}: ItemTrendChartProps) {
    if (data.length === 0) return null;

    const padL = 44;
    const padR = 12;
    const padTop = 10;
    const padBot = 24;
    const plotW = width - padL - padR;
    const plotH = height - padTop - padBot;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const mid = (min + max) / 2;
    const range = Math.max(1, max - min);

    const scaleY = (v: number) => padTop + (1 - (v - min) / range) * plotH;
    const scaleX = (i: number) => padL + (i / Math.max(1, data.length - 1)) * plotW;

    const points = data.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");
    const lastIndex = data.length - 1;

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
            {[min, mid, max].map((v) => (
                <g key={v}>
                    <line
                        x1={padL}
                        y1={scaleY(v)}
                        x2={width - padR}
                        y2={scaleY(v)}
                        stroke="currentColor"
                        strokeOpacity="0.15"
                        strokeWidth="1"
                    />
                    <text
                        x={padL - 6}
                        y={scaleY(v) + 3}
                        fontSize="9"
                        fill="currentColor"
                        opacity="0.65"
                        textAnchor="end"
                    >
                        {formatValue(v)}
                    </text>
                </g>
            ))}
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={scaleX(lastIndex)} cy={scaleY(data[lastIndex])} r="2.6" fill="currentColor" />
            <text x={padL} y={height - 6} fontSize="9" fill="currentColor" opacity="0.65">
                {startLabel}
            </text>
            <text x={width - padR} y={height - 6} fontSize="9" fill="currentColor" opacity="0.65" textAnchor="end">
                {endLabel}
            </text>
        </svg>
    );
}
