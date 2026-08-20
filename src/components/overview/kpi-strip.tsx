//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { motion, useReducedMotion } from "framer-motion";
import { Package, Clock, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { kpiStrip } from "@/queries/overview/kpi-strip";
import { cn } from "@/lib/utils";
import { scalarByColumnName } from "@/lib/to-data-table";
import { KPI_STRIP_FIXTURE } from "@/lib/dev-preview-fixtures";
import type { ParetoDataset } from "@/hooks/use-pareto-dataset";

type Severity = "critical" | "at-risk" | "on-track" | "neutral";

interface KpiStripProps {
    dataset: ParetoDataset;
    cutoffPct: number;
}

/** "$98.8M" / "$640K" / "$420" — this app's numbers run large (aggregated over the full ~11-month
 * sample), so a raw `toLocaleString()` dollar figure would be unreadably long in a KPI tile. */
function formatCompactCurrency(value: number): string {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

const RAIL_CLASS: Record<Severity, string> = {
    critical: "border-l-critical",
    "at-risk": "border-l-at-risk",
    "on-track": "border-l-on-track",
    // Visible neutral gray, not transparent — see kpi-strip.tsx git history (2026-08-19) for why
    // a transparent rail read as unstyled next to the colored-rail tiles beside it.
    neutral: "border-l-border",
};

const ICON_CLASS: Record<Severity, string> = {
    critical: "text-critical",
    "at-risk": "text-at-risk",
    "on-track": "text-on-track",
    neutral: "text-muted-foreground",
};

function TileCard({
    label,
    icon: Icon,
    value,
    context,
    severity,
    prefersReducedMotion,
}: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: string;
    context: string;
    severity: Severity;
    prefersReducedMotion: boolean | null;
}) {
    return (
        <motion.div
            variants={fadeInUp}
            className={cn(
                "rounded-lg border border-border border-l-4 bg-card p-400 text-left shadow-sm",
                RAIL_CLASS[severity],
            )}
        >
            <div className="flex items-center justify-between gap-200">
                <div className="font-base text-200 uppercase tracking-wide text-muted-foreground">{label}</div>
                <Icon className={cn("icon-size-300 shrink-0", ICON_CLASS[severity])} />
            </div>
            <div className="mt-200 font-numeric text-hero-800 font-semibold text-foreground">
                <motion.span
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
                    className="inline-block"
                >
                    {value}
                </motion.span>
            </div>
            <div className="mt-200 font-base text-200 text-muted-foreground">{context}</div>
        </motion.div>
    );
}

export function KpiStrip({ dataset, cutoffPct }: KpiStripProps) {
    const panel = useQueryPanel(kpiStrip());
    const prefersReducedMotion = useReducedMotion();

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. Kept as a literal `import.meta.env.DEV` check right
    // here (not routed through the hook) so the production build's DCE can
    // fold this branch away and drop KPI_STRIP_FIXTURE — see
    // use-query-panel.ts for why that placement matters.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load KPI strip: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "loading") {
        return (
            <div className="grid grid-cols-2 gap-400 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-lg border border-border border-l-4 border-l-transparent bg-card p-400"
                    >
                        <div className="h-200 w-3/4 animate-pulse rounded-md bg-muted" />
                        <div className="mt-300 h-600 w-1/2 animate-pulse rounded-md bg-muted" />
                        <div className="mt-300 h-200 w-full animate-pulse rounded-md bg-muted" />
                    </div>
                ))}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "empty") {
        return (
            <div className="rounded-lg border border-border bg-card px-400 py-600 text-center text-300 text-muted-foreground shadow-sm">
                No KPI data available yet.
            </div>
        );
    }

    const table = usingDevFixture ? KPI_STRIP_FIXTURE : panel.status === "ready" ? panel.table : undefined;
    if (!table) return null;

    // The two cutoff-based tiles are a client-side reduction over the shared
    // pareto dataset at the current slider position, not their own DAX
    // measures — see SPEC.md's "KPI strip — becomes hybrid" section.
    const cutoffIdx = dataset.rows.findIndex((r) => r.cumulativeValuePct >= cutoffPct);
    const itemsInCutoff = cutoffIdx === -1 ? dataset.rows.length : cutoffIdx + 1;
    const valueInCutoff = dataset.rows.slice(0, itemsInCutoff).reduce((sum, r) => sum + r.reorderValue, 0);

    return (
        <motion.div
            className="grid grid-cols-2 gap-400 sm:grid-cols-3 lg:grid-cols-5"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
        >
            {usingDevFixture ? (
                <div className="col-span-2 -mb-200 text-200 text-muted-foreground sm:col-span-3 lg:col-span-5">
                    Sample data · dev preview (no Fabric embed)
                </div>
            ) : null}
            <TileCard
                label="Items Tracked"
                icon={Package}
                value={String(scalarByColumnName(table, "[Items Tracked]") ?? "—")}
                context="Distinct stock items in the model"
                severity="neutral"
                prefersReducedMotion={prefersReducedMotion}
            />
            <TileCard
                label="Avg Lead Time (Days)"
                icon={Clock}
                value={String(scalarByColumnName(table, "[Avg Lead Time Days]") ?? "—")}
                context="Average supplier lead time across all items"
                severity="neutral"
                prefersReducedMotion={prefersReducedMotion}
            />
            <TileCard
                label={`Items In ${Math.round(cutoffPct * 100)}% Cutoff`}
                icon={AlertTriangle}
                value={String(itemsInCutoff)}
                context="Reacts to the cutoff slider below"
                severity="critical"
                prefersReducedMotion={prefersReducedMotion}
            />
            <TileCard
                label="Accelerating Demand"
                icon={TrendingUp}
                value={String(scalarByColumnName(table, "[Accelerating Demand Items]") ?? "—")}
                context="Items with a positive 30-day demand trend"
                severity="neutral"
                prefersReducedMotion={prefersReducedMotion}
            />
            <TileCard
                label="Reorder Value In Cutoff"
                icon={DollarSign}
                value={formatCompactCurrency(valueInCutoff)}
                context="Reacts to the cutoff slider below"
                severity="critical"
                prefersReducedMotion={prefersReducedMotion}
            />
        </motion.div>
    );
}
