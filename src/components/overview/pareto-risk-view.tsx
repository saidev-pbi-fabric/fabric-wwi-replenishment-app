//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { Download, TrendingDown } from "lucide-react";
import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { InteractionEventCallback } from "@microsoft/fabric-visuals-core";
import { useThemeContext } from "@/hooks/theme.context";
import type { ParetoDataset, ParetoRow } from "@/hooks/use-pareto-dataset";
import { buildParetoChartSpec, CUTOFF_COLOR_RANGE } from "@/components/overview/pareto-chart-spec";
import { LEAD_TIME_DOT_CLASS, TIER_FILTERS } from "@/lib/severity";
import { downloadCsv } from "@/lib/csv-export";
import { cn } from "@/lib/utils";

interface ParetoRiskViewProps {
    dataset: ParetoDataset;
    cutoffPct: number;
    onCutoffChange: (pct: number) => void;
    onSelectItem?: (stockItemName: string) => void;
}

function formatCompactCurrency(value: number): string {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

/** Index of the first row whose cumulative value % reaches the cutoff — the "N items" count. */
function itemsWithinCutoff(rows: ParetoRow[], cutoffPct: number): number {
    const idx = rows.findIndex((r) => r.cumulativeValuePct >= cutoffPct);
    return idx === -1 ? rows.length : idx + 1;
}

interface TierSubtotal {
    tier: string;
    count: number;
    reorderValue: number;
    valueSharePct: number;
}

function subtotalsByTier(rows: ParetoRow[]): TierSubtotal[] {
    const byTier = new Map<string, TierSubtotal>();
    for (const row of rows) {
        const existing = byTier.get(row.tier);
        if (existing) {
            existing.count += 1;
            existing.reorderValue += row.reorderValue;
            existing.valueSharePct += row.valueSharePct;
        } else {
            byTier.set(row.tier, { tier: row.tier, count: 1, reorderValue: row.reorderValue, valueSharePct: row.valueSharePct });
        }
    }
    // Stable Short/Medium/Long order, matching the app's other tier displays.
    return TIER_FILTERS.filter((t) => t !== "All")
        .map((tier) => byTier.get(tier))
        .filter((v): v is TierSubtotal => v !== undefined);
}

export function ParetoRiskView({ dataset, cutoffPct, onCutoffChange, onSelectItem }: ParetoRiskViewProps) {
    const { rows, status, usingDevFixture } = dataset;
    const [selectedRank, setSelectedRank] = useState<number | null>(null);
    const theme = useCssTheme();
    const { isDark } = useThemeContext();

    if (status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex min-h-[400px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load the at-risk value breakdown.
            </div>
        );
    }

    if (!usingDevFixture && (status === "loading" || status === "refreshing") && rows.length === 0) {
        return <div className="min-h-[400px] animate-pulse rounded-lg border border-border bg-card" />;
    }

    if (rows.length === 0) {
        return (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No at-risk items right now.
            </div>
        );
    }

    const itemCount = itemsWithinCutoff(rows, cutoffPct);
    const inCutoffRows = rows.slice(0, itemCount);
    const pastCutoffRows = rows.slice(itemCount);
    const valueInCutoff = inCutoffRows.reduce((sum, r) => sum + r.reorderValue, 0);
    const subtotals = subtotalsByTier(pastCutoffRows);

    // Chart shows in-cutoff items plus a fixed window past the cutoff, so the
    // "drop-off" reads visually — rendering all 672 bars would be unreadable
    // and isn't necessary once the point (concentration) is made.
    const chartRows = rows.slice(0, Math.min(rows.length, Math.max(itemCount + 30, 40)));
    const chartData = {
        columns: [
            { name: "AtRiskRank" },
            { name: "StockItem" },
            { name: "Tier" },
            { name: "ReorderValue" },
            { name: "CumulativeValuePct" },
            { name: "InCutoff" },
        ],
        rows: chartRows.map((r, i) => [
            r.atRiskRank,
            r.stockItem,
            r.tier,
            r.reorderValue,
            r.cumulativeValuePct,
            i < itemCount ? "In cutoff" : "Past cutoff",
        ]),
    };

    const handleInteraction: InteractionEventCallback = (events) => {
        for (const event of events) {
            if (event.action !== "select") continue;
            for (const selection of event.selections) {
                for (const predicate of selection.predicates) {
                    if (predicate.type === "set" && predicate.name === "AtRiskRank") {
                        const value = predicate.values[0];
                        if (typeof value === "number") setSelectedRank(value);
                    }
                }
            }
        }
    };

    const handleDownloadCsv = () => {
        downloadCsv(
            "pareto-reorder-risk.csv",
            ["Rank", "Item", "Lead Time Tier", "Reorder Value", "Value Share %", "Cumulative Value %"],
            inCutoffRows.map((r) => [
                r.atRiskRank,
                r.stockItem,
                r.tier,
                r.reorderValue.toFixed(2),
                (r.valueSharePct * 100).toFixed(2) + "%",
                (r.cumulativeValuePct * 100).toFixed(2) + "%",
            ]),
        );
    };

    return (
        <div className="flex flex-col gap-400 rounded-lg border border-border bg-card p-400 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-300">
                <div>
                    <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                        <TrendingDown className="icon-size-300 text-muted-foreground" />
                        At-Risk Value Concentration
                    </h2>
                    <p className="mt-100 font-numeric text-500 font-semibold text-foreground">
                        {Math.round(cutoffPct * 100)}% of at-risk reorder value is generated by {itemCount} items.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={inCutoffRows.length === 0}
                    className="flex shrink-0 items-center gap-100 rounded-md border border-border bg-background px-300 py-100-nudge font-base text-200 text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="icon-size-200" />
                    Download CSV
                </button>
            </div>

            <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                <span>
                    Cutoff: <span className="font-numeric font-semibold text-foreground">{Math.round(cutoffPct * 100)}%</span>{" "}
                    of cumulative reorder value
                </span>
                <input
                    type="range"
                    min={10}
                    max={99}
                    step={1}
                    value={Math.round(cutoffPct * 100)}
                    onChange={(e) => onCutoffChange(Number(e.target.value) / 100)}
                    aria-label="Cumulative reorder value cutoff percentage"
                    className="w-full accent-primary"
                />
            </label>

            {usingDevFixture ? (
                <p className="text-200 text-muted-foreground">Sample data · dev preview (no Fabric embed)</p>
            ) : null}

            <VegaVisual
                spec={JSON.stringify(buildParetoChartSpec(cutoffPct))}
                data={chartData}
                theme={theme}
                configVegaLite={{ range: { category: [...CUTOFF_COLOR_RANGE[isDark ? "dark" : "light"]] } }}
                onInteraction={handleInteraction}
                style={{ height: 320 }}
            />

            <div className="overflow-x-auto">
                <table className="w-full text-left font-base text-200">
                    <thead>
                        <tr className="border-b border-border text-muted-foreground">
                            <th className="py-200 pr-200 font-normal">Rank</th>
                            <th className="py-200 pr-200 font-normal">Item</th>
                            <th className="py-200 pr-200 font-normal">Lead Time</th>
                            <th className="py-200 pr-200 text-right font-normal">Reorder Value</th>
                            <th className="py-200 pr-200 text-right font-normal">Value Share %</th>
                            <th className="py-200 text-right font-normal">Cumulative %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inCutoffRows.map((row) => (
                            <tr
                                key={row.stockItemKey}
                                className={cn(
                                    "cursor-pointer border-b border-border last:border-b-0 hover:bg-accent",
                                    selectedRank === row.atRiskRank && "bg-accent",
                                )}
                                onClick={() => {
                                    setSelectedRank(row.atRiskRank);
                                    onSelectItem?.(row.stockItem);
                                }}
                            >
                                <td className="py-200 pr-200 font-numeric text-foreground">{row.atRiskRank}</td>
                                <td className="max-w-[280px] truncate py-200 pr-200 text-foreground" title={row.stockItem}>
                                    <span className="mr-100 inline-flex items-center gap-100">
                                        <span
                                            className={`icon-size-100 inline-block shrink-0 rounded-full ${LEAD_TIME_DOT_CLASS[row.tier] ?? "bg-muted-foreground"}`}
                                            aria-hidden="true"
                                        />
                                        {row.stockItem}
                                    </span>
                                </td>
                                <td className="py-200 pr-200 text-muted-foreground">{row.tier.replace(" Lead Time", "")}</td>
                                <td className="py-200 pr-200 text-right font-numeric text-foreground">
                                    {formatCompactCurrency(row.reorderValue)}
                                </td>
                                <td className="py-200 pr-200 text-right font-numeric text-foreground">
                                    {(row.valueSharePct * 100).toFixed(1)}%
                                </td>
                                <td className="py-200 text-right font-numeric text-foreground">
                                    {(row.cumulativeValuePct * 100).toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                        {subtotals.map((s) => (
                            <tr key={s.tier} className="border-b border-border bg-muted/40 last:border-b-0">
                                <td className="py-200 pr-200 text-muted-foreground">—</td>
                                <td className="py-200 pr-200 text-muted-foreground">
                                    {s.count} more {s.tier.replace(" Lead Time", "")} items, past cutoff
                                </td>
                                <td className="py-200 pr-200 text-muted-foreground">{s.tier.replace(" Lead Time", "")}</td>
                                <td className="py-200 pr-200 text-right font-numeric text-muted-foreground">
                                    {formatCompactCurrency(s.reorderValue)}
                                </td>
                                <td className="py-200 pr-200 text-right font-numeric text-muted-foreground">
                                    {(s.valueSharePct * 100).toFixed(1)}%
                                </td>
                                <td className="py-200 text-right font-numeric text-muted-foreground">—</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="font-base text-100 text-muted-foreground">
                Value here is a proxy (Suggested Reorder Qty × Unit Price), not a real inventory valuation — see the
                Action Center item detail for the full disclosure.{" "}
                {Math.max(0, valueInCutoff) > 0
                    ? `In-cutoff reorder value: ${formatCompactCurrency(valueInCutoff)}.`
                    : null}
            </p>
        </div>
    );
}
