//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { QueryTable } from "@microsoft/fabric-app-data";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { kpiStrip } from "@/queries/overview/kpi-strip";
import { cn } from "@/lib/utils";

type Severity = "critical" | "at-risk" | "on-track" | "neutral";

interface Tile {
    key: string;
    label: string;
    format: (value: unknown) => string;
    context: string;
    severity: (value: unknown) => Severity;
}

const TILES: Tile[] = [
    {
        key: "[Items Tracked]",
        label: "Items Tracked",
        format: (v) => String(v ?? "—"),
        context: "Distinct stock items in the model",
        severity: () => "neutral",
    },
    {
        key: "[Avg Lead Time Days]",
        label: "Avg Lead Time (Days)",
        format: (v) => String(v ?? "—"),
        context: "Average supplier lead time across all items",
        severity: () => "neutral",
    },
    {
        key: "[Top At Risk Items]",
        label: "Top At-Risk Items",
        format: (v) => String(v ?? "—"),
        context: "Ranked in the top 20 by demand-vs-lead-time risk",
        severity: () => "critical",
    },
    {
        key: "[Accelerating Demand Items]",
        label: "Accelerating Demand",
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

function scalarByColumnName(table: QueryTable, name: string): unknown {
    const index = table.columns.findIndex((col) => col.name === name);
    if (index === -1) return undefined;
    return table.rows[0]?.[index];
}

export function KpiStrip() {
    const { data, isLoading, error } = useSemanticModelQuery(kpiStrip());

    if (error || data?.status === "error") {
        const message = error?.message ?? (data?.status === "error" ? data.error.message : "Unknown error");
        return (
            <div
                role="alert"
                className="rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load KPI strip: {message}
            </div>
        );
    }

    if (isLoading || !data) {
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

    const table = data.table;
    if (table.rows.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card px-400 py-600 text-center text-300 text-muted-foreground">
                No KPI data available yet.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-400 lg:grid-cols-4">
            {TILES.map((tile) => {
                const raw = scalarByColumnName(table, tile.key);
                const severity = tile.severity(raw);
                return (
                    <div
                        key={tile.key}
                        className={cn(
                            "rounded-lg border border-border border-l-4 bg-card p-400",
                            RAIL_CLASS[severity],
                        )}
                    >
                        <div className="font-base text-200 uppercase tracking-wide text-muted-foreground">
                            {tile.label}
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
