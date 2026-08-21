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
import { valueTierFor, VALUE_TIER_RAIL_CLASS, type ValueTier } from "@/lib/severity";
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

interface ValueTierGroup {
    tier: ValueTier;
    count: number;
    cumPctLabel: string;
}

/**
 * Past-cutoff rows split into two ABC value-tier bands, per the locked mockup
 * (docs/mockup-reference.html, `tierFor`/`renderTable`) — "Tier B, collapsed" /
 * "Tier C, collapsed" summary rows, distinct from Lead Time Priority Tier.
 * Split at 95% cumulative (mockup's fixed B/C boundary), always relative to the
 * live cutoff rather than mockup's fixed-independent-of-slider bands, so every
 * past-cutoff row lands in exactly one group at any slider position (mockup's
 * own fixed-band version can double-count or drop rows once the slider moves
 * away from its 80% default — not worth reproducing that bug).
 */
function pastCutoffValueTierGroups(pastCutoffRows: ParetoRow[]): ValueTierGroup[] {
    const tierB = pastCutoffRows.filter((r) => r.cumulativeValuePct <= 0.95);
    const tierC = pastCutoffRows.filter((r) => r.cumulativeValuePct > 0.95);
    const groups: ValueTierGroup[] = [];
    if (tierB.length > 0) groups.push({ tier: "B", count: tierB.length, cumPctLabel: "95%" });
    if (tierC.length > 0) groups.push({ tier: "C", count: tierC.length, cumPctLabel: "100%" });
    return groups;
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
    const tierGroups = pastCutoffValueTierGroups(pastCutoffRows);

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
            ["Rank", "Item", "Lead Time Tier", "Value Tier", "Reorder Value", "Value Share %", "Cumulative Value %"],
            inCutoffRows.map((r) => [
                r.atRiskRank,
                r.stockItem,
                r.tier,
                valueTierFor(r.cumulativeValuePct),
                r.reorderValue.toFixed(2),
                (r.valueSharePct * 100).toFixed(2) + "%",
                (r.cumulativeValuePct * 100).toFixed(2) + "%",
            ]),
        );
    };

    return (
        <div className="flex flex-col gap-400 rounded-lg border border-border bg-card p-400 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-300">
                <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                    <TrendingDown className="icon-size-300 text-muted-foreground" />
                    At-Risk Value Concentration
                </h2>
                <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={inCutoffRows.length === 0}
                    className="flex shrink-0 items-center gap-100 rounded-md border border-border bg-secondary px-300 py-100-nudge font-base text-200 text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Download className="icon-size-200" />
                    Download CSV
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-300">
                <p className="font-base text-400 text-foreground">
                    <span className="font-numeric font-bold text-primary">{Math.round(cutoffPct * 100)}</span>% of
                    at-risk reorder value is generated by{" "}
                    <span className="font-numeric font-bold text-primary">{itemCount}</span> items
                </p>
                <label className="flex min-w-[220px] items-center gap-200">
                    <span className="whitespace-nowrap font-base text-200 text-muted-foreground">Cutoff</span>
                    <input
                        type="range"
                        min={10}
                        max={99}
                        step={1}
                        value={Math.round(cutoffPct * 100)}
                        onChange={(e) => onCutoffChange(Number(e.target.value) / 100)}
                        aria-label="Cumulative reorder value cutoff percentage"
                        className="flex-1 accent-primary"
                    />
                    <span className="w-[34px] shrink-0 text-right font-numeric text-200 font-semibold text-foreground">
                        {Math.round(cutoffPct * 100)}%
                    </span>
                </label>
            </div>

            {usingDevFixture ? (
                <p className="text-200 text-muted-foreground">Sample data · dev preview (no Fabric embed)</p>
            ) : null}

            <div className="grid grid-cols-1 gap-400 lg:grid-cols-[1.3fr_1fr]">
                <div>
                    <VegaVisual
                        spec={JSON.stringify(buildParetoChartSpec(cutoffPct, isDark))}
                        data={chartData}
                        theme={theme}
                        configVegaLite={{ range: { category: [...CUTOFF_COLOR_RANGE[isDark ? "dark" : "light"]] } }}
                        onInteraction={handleInteraction}
                        style={{ width: "100%", height: 280 }}
                    />
                    <div className="mt-100 flex justify-between font-base text-100 text-muted-foreground">
                        <span>Rank 1</span>
                        <span>Rank {chartRows.length}</span>
                    </div>
                </div>

                <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left font-base text-200">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="py-200 pr-200 font-normal">Item</th>
                                <th className="py-200 pr-200 text-right font-normal">Rank</th>
                                <th className="py-200 text-right font-normal">Cum. %</th>
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
                                    <td
                                        className="max-w-[220px] truncate py-200 pr-200 text-foreground"
                                        title={row.stockItem}
                                    >
                                        <span
                                            className={`mr-100 inline-block h-[14px] w-[4px] shrink-0 rounded-sm align-[-2px] ${VALUE_TIER_RAIL_CLASS[valueTierFor(row.cumulativeValuePct)]}`}
                                            aria-hidden="true"
                                        />
                                        {row.stockItem}
                                    </td>
                                    <td className="py-200 pr-200 text-right font-numeric text-foreground">
                                        #{row.atRiskRank}
                                    </td>
                                    <td className="py-200 text-right font-numeric text-foreground">
                                        {(row.cumulativeValuePct * 100).toFixed(0)}%
                                    </td>
                                </tr>
                            ))}
                            {tierGroups.map((g) => (
                                <tr key={g.tier} className="border-b border-border bg-accent last:border-b-0">
                                    <td colSpan={2} className="py-200 pr-200 font-semibold text-foreground">
                                        Tier {g.tier}, collapsed [{g.count}]
                                    </td>
                                    <td className="py-200 text-right font-numeric font-semibold text-foreground">
                                        {g.cumPctLabel}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
