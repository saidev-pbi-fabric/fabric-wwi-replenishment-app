//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { VegaLiteConfig } from "@microsoft/fabric-visuals";
import type { InteractionEventCallback } from "@microsoft/fabric-visuals-core";
import { cn } from "@/lib/utils";
import { toDataTable } from "@/lib/to-data-table";
import { topAtRiskItems } from "@/queries/overview/top-at-risk-items";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { useThemeContext } from "@/hooks/theme.context";
import { TOP_AT_RISK_ITEMS_FIXTURE } from "@/lib/dev-preview-fixtures";
import { TIER_FILTERS, tierDistributionCaption, tierFilterLabel } from "@/lib/severity";

// Vega renders to SVG and can't resolve `var(--color-*)`, so the severity
// scale is duplicated here as literal hex, matching global.css exactly.
// Order matches the explicit `scale.domain` pinned in top-at-risk-items.json
// (Short/Medium/Long Lead Time, the real Stock Item[Lead Time Priority Tier]
// values verified live against the semantic model) — Vega-Lite otherwise
// alphabetizes the domain, which previously inverted the severity mapping
// (Long rendered green).
const SEVERITY_RANGE = {
    light: ["#0e700e", "#9a6700", "#c50f1f"], // Short / Medium / Long lead time
    dark: ["#54c454", "#e0a828", "#f1707b"],
} as const;

interface TopAtRiskListProps {
    onSelectItem?: (stockItemName: string) => void;
}

export function TopAtRiskList({ onSelectItem }: TopAtRiskListProps) {
    const [tierFilter, setTierFilter] = useState<(typeof TIER_FILTERS)[number]>("All");
    const { connection, query, columnMetadata, vegaLiteSpec } = topAtRiskItems(tierFilter);
    const panel = useQueryPanel({ connection, query });
    const theme = useCssTheme();
    const { isDark } = useThemeContext();

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load top at-risk items: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "loading") {
        return (
            <div className="h-full min-h-[320px] animate-pulse rounded-lg border border-border bg-card" />
        );
    }

    const displayTable = usingDevFixture
        ? {
              columns: TOP_AT_RISK_ITEMS_FIXTURE.columns,
              rows: TOP_AT_RISK_ITEMS_FIXTURE.rows.filter((row) => {
                  const tierIdx = TOP_AT_RISK_ITEMS_FIXTURE.columns.findIndex(
                      (col) => col.name === "Stock Item[Lead Time Priority Tier]",
                  );
                  return tierFilter === "All" || row[tierIdx] === tierFilter;
              }),
          }
        : panel.status === "ready" || panel.status === "refreshing"
          ? panel.table
          : panel.status === "empty"
            ? { columns: [], rows: [] }
            : undefined;
    if (!displayTable) return null;

    // A filter change re-queries; keep the previous chart visible (dimmed)
    // instead of swapping to a blank skeleton on every change — the abrupt
    // swap was flagged directly by the user ("the transition ... goes blank").
    const isRefreshing = !usingDevFixture && panel.status === "refreshing";

    const configVegaLite: VegaLiteConfig = {
        range: { category: [...SEVERITY_RANGE[isDark ? "dark" : "light"]] },
    };

    const handleInteraction: InteractionEventCallback = (events) => {
        if (!onSelectItem) return;
        for (const event of events) {
            if (event.action !== "select") continue;
            for (const selection of event.selections) {
                for (const predicate of selection.predicates) {
                    if (predicate.type === "set" && predicate.name === "StockItem") {
                        const value = predicate.values[0];
                        if (typeof value === "string") onSelectItem(value);
                    }
                }
            }
        }
    };

    const legendColors = SEVERITY_RANGE[isDark ? "dark" : "light"];

    return (
        <div className="h-full min-h-[320px] rounded-lg border border-border bg-card p-400 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-200">
                <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                    <AlertTriangle className="icon-size-300 text-muted-foreground" />
                    Top At-Risk Items
                </h2>
                <div className="flex items-center gap-400">
                    {/* Custom legend, not Vega's built-in one: fabric-visuals' disableLegendTruncation
                        capability didn't reliably show all 3 swatches at typical card widths, so this
                        renders every label explicitly instead of fighting the auto-layout. */}
                    <ul className="flex items-center gap-300 font-base text-200 text-muted-foreground">
                        {(["Short", "Medium", "Long"] as const).map((label, i) => (
                            <li key={label} className="flex items-center gap-100">
                                <span
                                    className="icon-size-100 inline-block rounded-full"
                                    style={{ backgroundColor: legendColors[i] }}
                                    aria-hidden="true"
                                />
                                {label}
                            </li>
                        ))}
                    </ul>
                    <label className="flex items-center gap-200 font-base text-200 text-muted-foreground">
                        Filter by lead time
                        <select
                            aria-label="Filter by lead time"
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value as (typeof TIER_FILTERS)[number])}
                            className="rounded-md border border-border bg-background px-200 py-100-nudge text-200 text-foreground"
                        >
                            {TIER_FILTERS.map((tier) => (
                                <option key={tier} value={tier}>
                                    {tierFilterLabel(tier)}
                                </option>
                            ))}
                        </select>
                    </label>
                    {isRefreshing ? (
                        <Loader2
                            className="icon-size-300 animate-spin text-muted-foreground"
                            aria-label="Updating"
                        />
                    ) : null}
                </div>
            </div>
            <p className="pt-200 font-base text-100 text-muted-foreground">{tierDistributionCaption()}</p>
            {usingDevFixture ? (
                <p className="text-200 text-muted-foreground">Sample data — dev preview (no Fabric embed)</p>
            ) : null}
            <div className={cn("transition-opacity duration-200", isRefreshing ? "opacity-50" : "opacity-100")}>
                {displayTable.rows.length === 0 ? (
                    <div className="flex h-[400px] items-center justify-center text-300 text-muted-foreground">
                        {tierFilter === "All"
                            ? "No at-risk items right now."
                            : `No at-risk items match "${tierFilterLabel(tierFilter)}" lead time.`}
                    </div>
                ) : (
                    <VegaVisual
                        spec={JSON.stringify(vegaLiteSpec)}
                        data={toDataTable(displayTable, columnMetadata)}
                        theme={theme}
                        configVegaLite={configVegaLite}
                        onInteraction={handleInteraction}
                        style={{ height: 400 }}
                    />
                )}
            </div>
        </div>
    );
}
