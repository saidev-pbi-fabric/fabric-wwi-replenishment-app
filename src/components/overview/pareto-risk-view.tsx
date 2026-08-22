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
import {
    cumPctOf,
    metricNoun,
    metricOf,
    rankOf,
    rankedRows,
    type ParetoDataset,
    type ParetoRow,
    type RankMode,
} from "@/hooks/use-pareto-dataset";
import { buildParetoChartSpec, CUTOFF_COLOR_RANGE } from "@/components/overview/pareto-chart-spec";
import { valueTierFor, VALUE_TIER_RAIL_CLASS, type ValueTier } from "@/lib/severity";
import { downloadCsv } from "@/lib/csv-export";
import { cn, formatCompactCurrency, formatCompactNumber } from "@/lib/utils";

interface ParetoRiskViewProps {
    dataset: ParetoDataset;
    rankMode: RankMode;
    cutoffPct: number;
    onCutoffChange: (pct: number) => void;
    onSelectItem?: (stockItemName: string) => void;
}

/** Index of the first row whose cumulative metric % reaches the cutoff — the "N items" count. */
function itemsWithinCutoff(rows: ParetoRow[], cutoffPct: number, mode: RankMode): number {
    const idx = rows.findIndex((r) => cumPctOf(r, mode) >= cutoffPct);
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
function pastCutoffValueTierGroups(pastCutoffRows: ParetoRow[], mode: RankMode): ValueTierGroup[] {
    const tierB = pastCutoffRows.filter((r) => cumPctOf(r, mode) <= 0.95);
    const tierC = pastCutoffRows.filter((r) => cumPctOf(r, mode) > 0.95);
    const groups: ValueTierGroup[] = [];
    if (tierB.length > 0) groups.push({ tier: "B", count: tierB.length, cumPctLabel: "95%" });
    if (tierC.length > 0) groups.push({ tier: "C", count: tierC.length, cumPctLabel: "100%" });
    return groups;
}

function formatMetric(value: number, mode: RankMode): string {
    return mode === "value" ? formatCompactCurrency(value) : formatCompactNumber(value);
}

export function ParetoRiskView({ dataset, rankMode, cutoffPct, onCutoffChange, onSelectItem }: ParetoRiskViewProps) {
    const { status, usingDevFixture } = dataset;
    const rows = rankedRows(dataset, rankMode);
    const [selectedKey, setSelectedKey] = useState<number | null>(null);
    const [chartMode, setChartMode] = useState<"dynamic" | "fixed">("fixed");
    const theme = useCssTheme();
    const { isDark } = useThemeContext();

    if (status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex min-h-[400px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load the at-risk breakdown.
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

    const itemCount = itemsWithinCutoff(rows, cutoffPct, rankMode);
    const inCutoffRows = rows.slice(0, itemCount);
    const pastCutoffRows = rows.slice(itemCount);
    const metricInCutoff = inCutoffRows.reduce((sum, r) => sum + metricOf(r, rankMode), 0);
    const tierGroups = pastCutoffValueTierGroups(pastCutoffRows, rankMode);

    // Two team-reviewed chart-window strategies (approved as an Artifact mockup before wiring —
    // see that mockup's "Variant A/B" naming, kept here so the two stay traceable to each other).
    // Neither changes the underlying data/ranking, only how many bars the chart renders.
    let chartRows: ParetoRow[];
    let chartAxisRight: string;
    if (chartMode === "dynamic") {
        // Every in-cutoff bar, plus the true remainder evenly sampled (not just the next few
        // ranks) so the long-tail shape stays honest at any cutoff position.
        const remainder = pastCutoffRows;
        const tailSampleSize = Math.min(remainder.length, 40);
        const step = tailSampleSize === 0 ? 1 : remainder.length / tailSampleSize;
        const tailSample = Array.from({ length: tailSampleSize }, (_, i) => remainder[Math.floor(i * step)]);
        chartRows = [...inCutoffRows, ...tailSample];
        chartAxisRight =
            remainder.length > tailSampleSize
                ? `Rank ${itemCount} + ${tailSampleSize} sampled of ${remainder.length} remaining`
                : `Rank ${chartRows.length}`;
    } else {
        // Fixed window — always the same ~20 bars regardless of the cutoff, so the layout never
        // jitters as the slider moves. Illustrative shape, not a literal 1:1 census past the
        // window edge; the table's "Tier B/C, collapsed [N]" rows carry the real counts. Was 40
        // — with a single outlier item dominating the $ scale (top item ~$182M), bars past ~15-20
        // were only a couple pixels tall, reading as a blank chart (live feedback, 2026-08-22).
        // 20 keeps the chart dense-looking without hiding that most items are far smaller.
        const FIXED_WINDOW = 20;
        chartRows = rows.slice(0, Math.min(rows.length, FIXED_WINDOW));
        chartAxisRight =
            itemCount < FIXED_WINDOW ? `Rank ${FIXED_WINDOW} (fixed window, illustrative)` : `Rank ${FIXED_WINDOW}`;
    }

    // ChartSlot = plain sequential position, always unique per bar — ranks can legitimately tie
    // (two items at the same $ value), and two bars sharing one x-category would collide. Never
    // position bars by the displayed rank; DisplayRank is tooltip-only. See pareto-chart-spec.ts.
    const chartData = {
        columns: [
            { name: "ChartSlot" },
            { name: "StockItemKey" },
            { name: "StockItem" },
            { name: "Tier" },
            { name: "Metric" },
            { name: "CumulativePct" },
            { name: "InCutoff" },
            { name: "DisplayRank" },
        ],
        rows: chartRows.map((r, i) => [
            i + 1,
            r.stockItemKey,
            r.stockItem,
            r.tier,
            metricOf(r, rankMode),
            cumPctOf(r, rankMode),
            i < itemCount ? "In cutoff" : "Past cutoff",
            rankOf(r, rankMode),
        ]),
    };
    const boundarySlot = pastCutoffRows.length > 0 ? itemCount + 1 : null;
    const metricMax = Math.max(0, ...chartRows.map((r) => metricOf(r, rankMode)));

    const handleInteraction: InteractionEventCallback = (events) => {
        for (const event of events) {
            if (event.action !== "select") continue;
            for (const selection of event.selections) {
                for (const predicate of selection.predicates) {
                    if (predicate.type === "set" && predicate.name === "StockItemKey") {
                        const value = predicate.values[0];
                        if (typeof value === "number") setSelectedKey(value);
                    }
                }
            }
        }
    };

    const handleDownloadCsv = () => {
        const metricHeader = rankMode === "value" ? "Reorder Value" : "Suggested Reorder Qty";
        const shareHeader = rankMode === "value" ? "Value Share %" : "Qty Share %";
        downloadCsv(
            "pareto-reorder-risk.csv",
            ["Rank", "Item", "Lead Time Tier", "Value Tier", metricHeader, shareHeader, "Cumulative %"],
            inCutoffRows.map((r) => [
                rankOf(r, rankMode),
                r.stockItem,
                r.tier,
                valueTierFor(cumPctOf(r, rankMode)),
                metricOf(r, rankMode).toFixed(2),
                ((rankMode === "value" ? r.valueSharePct : r.qtySharePct) * 100).toFixed(2) + "%",
                (cumPctOf(r, rankMode) * 100).toFixed(2) + "%",
            ]),
        );
    };

    return (
        <div className="flex flex-col gap-400 rounded-lg border border-border bg-card p-400 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-300">
                <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                    <TrendingDown className="icon-size-300 text-muted-foreground" />
                    Reorder Risk Concentration
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

            <p className="-mt-200 font-base text-200 text-muted-foreground">
                Ranked by {rankMode === "value" ? "$ reorder value" : "suggested reorder quantity (units)"}. Use the
                "Rank by" switch above to compare the other lens. Shows rank, {rankMode === "value" ? "$" : "qty"},
                and cumulative % for every item. Click a bar to find it in the table.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-300">
                <p className="font-base text-400 text-foreground">
                    <span className="font-numeric font-bold text-primary">{Math.round(cutoffPct * 100)}</span>% of
                    at-risk {metricNoun(rankMode)} is generated by{" "}
                    <span className="font-numeric font-bold text-primary">{itemCount}</span> of{" "}
                    <span className="font-numeric font-semibold text-foreground">{rows.length}</span> stock items
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
                        aria-label="Cumulative cutoff percentage"
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

            <div className="flex items-center gap-100" role="group" aria-label="Chart window strategy">
                <span className="mr-100 font-base text-100 text-muted-foreground">Chart window</span>
                {(
                    [
                        ["dynamic", "A — Dynamic"],
                        ["fixed", "B — Fixed window"],
                    ] as const
                ).map(([mode, label]) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => setChartMode(mode)}
                        aria-pressed={chartMode === mode}
                        className={cn(
                            "rounded-full border px-200 py-100-nudge font-base text-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            chartMode === mode
                                ? "border-primary text-primary"
                                : "border-border text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Full-width chart on top, table below — was a side-by-side 1.3fr/1fr grid, moved to a
                single-column stack so the chart gets the whole container width instead of splitting
                it with the table. */}
            <div className="flex flex-col gap-400">
                <div>
                    <VegaVisual
                        spec={JSON.stringify(buildParetoChartSpec(boundarySlot, isDark, rankMode, metricMax))}
                        data={chartData}
                        theme={theme}
                        configVegaLite={{ range: { category: [...CUTOFF_COLOR_RANGE[isDark ? "dark" : "light"]] } }}
                        onInteraction={handleInteraction}
                        style={{ width: "100%", height: 320 }}
                        // fabric-visuals always injects its own scale.nice=5 onto quantitative axes
                        // ("for cleaner tick values") unless told not to -- confirmed in its own
                        // source (chunk-YOIUDW6A.js applyAxisBounds) and public capability doc
                        // comment. That auto-nice-ing was fighting the explicit tickValues/domain
                        // this chart computes itself (niceTicks in pareto-chart-spec.ts, which
                        // already guarantees a $0 floor), which is why "not starting at 0" kept
                        // reproducing even after the spec-level fix.
                        capabilities={{ disableNiceAxisBounds: true }}
                    />
                    <div className="mt-100 flex justify-between font-base text-100 text-muted-foreground">
                        <span>Rank 1</span>
                        <span>{chartAxisRight}</span>
                    </div>
                </div>

                <div className="scroll-overlay max-h-[420px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-left font-base text-200">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground">
                                <th className="py-200 pr-200 font-normal">Item</th>
                                <th className="py-200 pr-200 text-right font-normal">Rank</th>
                                <th className="py-200 pr-200 text-right font-normal">
                                    {rankMode === "value" ? "Value" : "Qty"}
                                </th>
                                <th className="py-200 text-right font-normal">Cum. %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inCutoffRows.map((row) => (
                                <tr
                                    key={row.stockItemKey}
                                    className={cn(
                                        "cursor-pointer border-b border-border last:border-b-0 hover:bg-accent",
                                        selectedKey === row.stockItemKey && "bg-accent",
                                    )}
                                    onClick={() => {
                                        setSelectedKey(row.stockItemKey);
                                        onSelectItem?.(row.stockItem);
                                    }}
                                >
                                    <td
                                        className="max-w-[220px] truncate py-200 pr-200 text-foreground"
                                        title={row.stockItem}
                                    >
                                        <span
                                            className={`mr-100 inline-block h-[14px] w-[4px] shrink-0 rounded-sm align-[-2px] ${VALUE_TIER_RAIL_CLASS[valueTierFor(cumPctOf(row, rankMode))]}`}
                                            aria-hidden="true"
                                        />
                                        {row.stockItem}
                                    </td>
                                    <td className="py-200 pr-200 text-right font-numeric text-foreground">
                                        #{rankOf(row, rankMode)}
                                    </td>
                                    <td className="py-200 pr-200 text-right font-numeric text-foreground">
                                        {formatMetric(metricOf(row, rankMode), rankMode)}
                                    </td>
                                    <td className="py-200 text-right font-numeric text-foreground">
                                        {(cumPctOf(row, rankMode) * 100).toFixed(0)}%
                                    </td>
                                </tr>
                            ))}
                            {tierGroups.map((g) => (
                                <tr key={g.tier} className="border-b border-border bg-accent last:border-b-0">
                                    <td colSpan={3} className="py-200 pr-200 font-semibold text-foreground">
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
                Value here is a proxy (Suggested Reorder Qty × Unit Price), not a real inventory valuation. See the
                Action Center item detail for the full disclosure.{" "}
                {Math.max(0, metricInCutoff) > 0
                    ? `In-cutoff ${rankMode === "value" ? "reorder value" : "reorder qty"}: ${formatMetric(metricInCutoff, rankMode)}.`
                    : null}
            </p>
        </div>
    );
}
