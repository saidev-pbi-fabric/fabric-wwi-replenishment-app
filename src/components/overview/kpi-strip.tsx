//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Package, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { kpiStrip } from "@/queries/overview/kpi-strip";
import { cn } from "@/lib/utils";
import { scalarByColumnName } from "@/lib/to-data-table";
import { KPI_STRIP_FIXTURE } from "@/lib/dev-preview-fixtures";

type Severity = "critical" | "at-risk" | "on-track" | "neutral";

interface Tile {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    format: (value: unknown) => string;
    context: string;
    severity: (value: unknown) => Severity;
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
    },
    {
        key: "[Accelerating Demand Items]",
        label: "Accelerating Demand",
        icon: TrendingUp,
        format: (v) => String(v ?? "—"),
        context: "Items with a positive 30-day demand trend",
        severity: (v) => (Number(v) > 0 ? "at-risk" : "on-track"),
    },
];

const RAIL_CLASS: Record<Severity, string> = {
    critical: "border-l-critical",
    "at-risk": "border-l-at-risk",
    "on-track": "border-l-on-track",
    neutral: "border-l-transparent",
};

const ICON_CLASS: Record<Severity, string> = {
    critical: "text-critical",
    "at-risk": "text-at-risk",
    "on-track": "text-on-track",
    neutral: "text-muted-foreground",
};

export function KpiStrip() {
    const panel = useQueryPanel(kpiStrip());

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

    return (
        <div className="grid grid-cols-2 gap-400 lg:grid-cols-4">
            {usingDevFixture ? (
                <div className="col-span-2 -mb-200 text-200 text-muted-foreground lg:col-span-4">
                    Sample data — dev preview (no Fabric embed)
                </div>
            ) : null}
            {TILES.map((tile) => {
                const raw = scalarByColumnName(table, tile.key);
                const severity = tile.severity(raw);
                const Icon = tile.icon;
                return (
                    <div
                        key={tile.key}
                        className={cn(
                            "rounded-lg border border-border border-l-4 bg-card p-400 shadow-sm",
                            RAIL_CLASS[severity],
                        )}
                    >
                        <div className="flex items-center justify-between gap-200">
                            <div className="font-base text-200 uppercase tracking-wide text-muted-foreground">
                                {tile.label}
                            </div>
                            <Icon className={cn("icon-size-300 shrink-0", ICON_CLASS[severity])} />
                        </div>
                        <div className="mt-200 font-numeric text-hero-800 font-semibold text-foreground">
                            {tile.format(raw)}
                        </div>
                        <div className="mt-200 text-200 text-muted-foreground">{tile.context}</div>
                    </div>
                );
            })}
        </div>
    );
}
