//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Package, Clock, AlertTriangle, TrendingUp, ArrowUpRight, DollarSign } from "lucide-react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { kpiStrip } from "@/queries/overview/kpi-strip";
import { cn } from "@/lib/utils";
import { scalarByColumnName } from "@/lib/to-data-table";
import { KPI_STRIP_FIXTURE } from "@/lib/dev-preview-fixtures";
import { TopAtRiskDrillThrough } from "@/components/overview/top-at-risk-drill-through";

type Severity = "critical" | "at-risk" | "on-track" | "neutral";

interface Tile {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    format: (value: unknown) => string;
    context: string;
    severity: (value: unknown) => Severity;
    /** Opens the full-list drill-through table when the tile is clicked. */
    drillThrough?: boolean;
    /** Spans the full row on large screens — for the one tile meant to read as a headline, not a peer stat. */
    fullWidth?: boolean;
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

const TILES: Tile[] = [
    {
        key: "[Items Tracked]",
        label: "Items Tracked",
        icon: Package,
        format: (v) => String(v ?? "—"),
        context: "Distinct stock items in the model",
        severity: () => "neutral",
    },
    {
        key: "[Avg Lead Time Days]",
        label: "Avg Lead Time (Days)",
        icon: Clock,
        format: (v) => String(v ?? "—"),
        context: "Average supplier lead time across all items",
        severity: () => "neutral",
    },
    {
        key: "[Top At Risk Items]",
        label: "Top At-Risk Items",
        icon: AlertTriangle,
        format: (v) => String(v ?? "—"),
        context: "Ranked in the top 20 by demand-vs-lead-time risk",
        severity: () => "critical",
        drillThrough: true,
    },
    {
        key: "[Accelerating Demand Items]",
        label: "Accelerating Demand",
        icon: TrendingUp,
        format: (v) => String(v ?? "—"),
        context: "Items with a positive 30-day demand trend",
        severity: (v) => (Number(v) > 0 ? "at-risk" : "on-track"),
    },
    {
        key: "[At Risk Reorder Value]",
        label: "At-Risk Reorder Value",
        icon: DollarSign,
        format: (v) => formatCompactCurrency(Number(v ?? 0)),
        context: "Unit Price × Suggested Reorder Qty, top 20 at-risk items (disclosed proxy, not literal stock value)",
        severity: () => "critical",
        fullWidth: true,
    },
];

const RAIL_CLASS: Record<Severity, string> = {
    critical: "border-l-critical",
    "at-risk": "border-l-at-risk",
    "on-track": "border-l-on-track",
    // Visible neutral gray, not transparent: a transparent rail made these two
    // tiles look unstyled/unfinished next to the colored-rail tiles beside
    // them (flagged directly by the user against the live app) — this keeps
    // all 4 tiles visually consistent while still reserving color for actual
    // severity.
    neutral: "border-l-border",
};

const ICON_CLASS: Record<Severity, string> = {
    critical: "text-critical",
    "at-risk": "text-at-risk",
    "on-track": "text-on-track",
    neutral: "text-muted-foreground",
};

export function KpiStrip() {
    const panel = useQueryPanel(kpiStrip());
    const [drillOpen, setDrillOpen] = useState(false);
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
            <div className="grid grid-cols-2 gap-400 lg:grid-cols-4">
                {TILES.map((tile) => (
                    <div
                        key={tile.key}
                        className={cn(
                            "rounded-lg border border-border border-l-4 border-l-transparent bg-card p-400",
                            tile.fullWidth && "col-span-2 lg:col-span-4",
                        )}
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

    return (
        <>
            <motion.div
                className="grid grid-cols-2 gap-400 lg:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
            >
                {usingDevFixture ? (
                    <div className="col-span-2 -mb-200 text-200 text-muted-foreground lg:col-span-4">
                        Sample data — dev preview (no Fabric embed)
                    </div>
                ) : null}
                {TILES.map((tile) => {
                    const raw = scalarByColumnName(table, tile.key);
                    const severity = tile.severity(raw);
                    const Icon = tile.icon;
                    const Tag = tile.drillThrough ? motion.button : motion.div;
                    return (
                        <Tag
                            key={tile.key}
                            type={tile.drillThrough ? "button" : undefined}
                            onClick={tile.drillThrough ? () => setDrillOpen(true) : undefined}
                            variants={fadeInUp}
                            whileHover={{ y: -2 }}
                            className={cn(
                                "rounded-lg border border-border border-l-4 bg-card p-400 text-left shadow-sm transition-shadow hover:shadow-md",
                                tile.drillThrough && "cursor-pointer",
                                tile.fullWidth && "col-span-2 lg:col-span-4",
                                RAIL_CLASS[severity],
                            )}
                        >
                            <div className="flex items-center justify-between gap-200">
                                <div className="font-base text-200 uppercase tracking-wide text-muted-foreground">
                                    {tile.label}
                                </div>
                                <motion.span
                                    initial={
                                        prefersReducedMotion ? false : { scale: 0.4, rotate: -20, opacity: 0 }
                                    }
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
                                    // Only the drill-through tile's icon gets a hover/tap animation —
                                    // it's the only one bound to a real action (opening the full-list
                                    // table). Animating the other three's icons would suggest they're
                                    // clickable when they aren't, which is a false affordance.
                                    {...(tile.drillThrough && !prefersReducedMotion
                                        ? {
                                              whileHover: { rotate: [0, -8, 8, -5, 0], transition: { duration: 0.4 } },
                                              whileTap: { scale: 0.85 },
                                          }
                                        : {})}
                                >
                                    <Icon className={cn("icon-size-300 shrink-0", ICON_CLASS[severity])} />
                                </motion.span>
                            </div>
                            <div className="mt-200 font-numeric text-hero-800 font-semibold text-foreground">
                                {tile.format(raw)}
                            </div>
                            <div className="mt-200 flex items-center justify-between gap-200 text-200 text-muted-foreground">
                                <span>{tile.context}</span>
                                {tile.drillThrough ? (
                                    <span className="flex shrink-0 items-center gap-100 font-semibold text-foreground">
                                        View all
                                        <ArrowUpRight className="icon-size-200" />
                                    </span>
                                ) : null}
                            </div>
                        </Tag>
                    );
                })}
            </motion.div>

            <TopAtRiskDrillThrough open={drillOpen} onClose={() => setDrillOpen(false)} />
        </>
    );
}
