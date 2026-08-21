//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { itemSalesTrend } from "@/queries/action-center/item-sales-trend";
import { getFabricClient } from "@/lib/fabric-client";
import { downloadCsv } from "@/lib/csv-export";
import { cn, formatShortDate } from "@/lib/utils";
import { ITEM_SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";
import { Sparkline } from "@/components/shared/sparkline";
import { VALUE_TIER_FILTERS, VALUE_TIER_RAIL_CLASS, valueTierFilterLabel, valueTierFor, type ValueTier } from "@/lib/severity";
import type { ParetoDataset, ParetoRow } from "@/hooks/use-pareto-dataset";

function formatCompactCurrency(value: number): string {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

interface RankedListPanelProps {
    dataset: ParetoDataset;
    selectedStockItemKey: number | null;
    onSelectItem: (stockItemKey: number, stockItemName: string, tier: ValueTier) => void;
    /** Name handed off from Page 1's click-through; auto-selected once the list loads, then ignored. */
    initialSelectedItemName?: string | null;
}

export function RankedListPanel({
    dataset,
    selectedStockItemKey,
    onSelectItem,
    initialSelectedItemName,
}: RankedListPanelProps) {
    const { rows, status, usingDevFixture } = dataset;
    const [tierFilter, setTierFilter] = useState<(typeof VALUE_TIER_FILTERS)[number]>("All");
    const [nameQuery, setNameQuery] = useState("");
    const autoSelectedRef = useRef(false);

    // Per-row sparklines: one small itemSalesTrend fetch per visible row, fired directly via the
    // Fabric client (not a hook) so all rows' requests run in parallel and each fills in as it
    // resolves rather than blocking the whole list on the slowest row.
    const [sparklineData, setSparklineData] = useState<Record<number, { qty: number[]; dates: string[] }>>({});

    useEffect(() => {
        if (rows.length === 0) return;
        const keys = rows.slice(0, 40).map((row) => row.stockItemKey);
        let cancelled = false;

        if (usingDevFixture) {
            const qtyIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "[Quantity]");
            const dateIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "Date[Date]");
            const fixtureQty = ITEM_SALES_TREND_FIXTURE.rows.map((row) => Number(row[qtyIdx] ?? 0));
            const fixtureDates = ITEM_SALES_TREND_FIXTURE.rows.map((row) => formatShortDate(String(row[dateIdx])));
            // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only fixture fill, mirrors the real fetch branch below which is necessarily async
            setSparklineData(Object.fromEntries(keys.map((key) => [key, { qty: fixtureQty, dates: fixtureDates }])));
            return;
        }

        keys.forEach((key) => {
            if (sparklineData[key]) return; // already fetched
            const { connection, query } = itemSalesTrend(key);
            getFabricClient()
                .semanticModel(connection)
                .query(query)
                .then((result) => {
                    if (cancelled || result.status !== "success") return;
                    const qtyIdx = result.table.columns.findIndex((col) => col.name === "[Quantity]");
                    const dateIdx = result.table.columns.findIndex((col) => col.name === "Date[Date]");
                    const qty = result.table.rows.map((row) => Number(row[qtyIdx] ?? 0));
                    const dates = result.table.rows.map((row) => formatShortDate(String(row[dateIdx])));
                    setSparklineData((prev) => ({ ...prev, [key]: { qty, dates } }));
                })
                .catch(() => {
                    // A missing sparkline for one row isn't worth surfacing as a panel-level error.
                });
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sparklineData deliberately excluded: this only skips re-fetching rows already cached
    }, [rows, usingDevFixture]);

    useEffect(() => {
        if (autoSelectedRef.current || !initialSelectedItemName || rows.length === 0) return;
        const match = rows.find((row) => row.stockItem === initialSelectedItemName);
        if (match) {
            autoSelectedRef.current = true;
            onSelectItem(match.stockItemKey, match.stockItem, valueTierFor(match.cumulativeValuePct));
        }
    }, [rows, initialSelectedItemName, onSelectItem]);

    if (status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load at-risk items.
            </div>
        );
    }

    if (!usingDevFixture && status === "loading") {
        return (
            <div
                data-testid="ranked-list-loading"
                className="h-full min-h-[480px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    const trimmedQuery = nameQuery.trim().toLowerCase();
    const filteredByTier = tierFilter === "All" ? rows : rows.filter((r) => valueTierFor(r.cumulativeValuePct) === tierFilter);
    const visibleRows = trimmedQuery
        ? filteredByTier.filter((r) => r.stockItem.toLowerCase().includes(trimmedQuery))
        : filteredByTier;

    function handleDownloadCsv() {
        downloadCsv(
            "at-risk-items.csv",
            ["Rank", "Item", "Value Tier", "Reorder Value"],
            visibleRows.map((r) => [r.atRiskRank, r.stockItem, valueTierFor(r.cumulativeValuePct), r.reorderValue.toFixed(2)]),
        );
    }

    return (
        <div className="flex max-h-[640px] min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-300 border-b border-border p-400">
                <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                    <AlertTriangle className="icon-size-300 text-muted-foreground" />
                    Ranked At-Risk Items
                </h2>
                <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={visibleRows.length === 0}
                    className="flex items-center gap-100 rounded-md border border-border bg-secondary px-200 py-100-nudge font-base text-200 text-foreground hover:bg-accent disabled:opacity-50"
                >
                    <Download className="icon-size-200" />
                    CSV
                </button>
            </div>
            <div className="flex flex-col gap-200 border-b border-border px-400 py-300">
                <input
                    type="text"
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    placeholder="Search items by name…"
                    aria-label="Search items by name"
                    className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-200 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
                <div className="flex gap-100" role="group" aria-label="Filter by value tier">
                    {VALUE_TIER_FILTERS.map((tier) => (
                        <button
                            key={tier}
                            type="button"
                            onClick={() => setTierFilter(tier)}
                            aria-pressed={tierFilter === tier}
                            className={cn(
                                "rounded-full border px-200 py-100-nudge font-base text-100 transition-colors",
                                tierFilter === tier
                                    ? "border-primary text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {valueTierFilterLabel(tier)}
                        </button>
                    ))}
                </div>
            </div>
            {usingDevFixture ? (
                <p className="px-400 pt-200 text-200 text-muted-foreground">
                    Sample data · dev preview (no Fabric embed)
                </p>
            ) : null}
            {visibleRows.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-400 py-300 text-300 text-muted-foreground">
                    {trimmedQuery
                        ? `No items match "${nameQuery}".`
                        : tierFilter === "All"
                          ? "No at-risk items right now."
                          : `No items in ${valueTierFilterLabel(tierFilter)}.`}
                </div>
            ) : (
                <ul className="flex-1 overflow-y-auto">
                    {visibleRows.map((r) => (
                        <ListRow
                            key={r.stockItemKey}
                            row={r}
                            isSelected={r.stockItemKey === selectedStockItemKey}
                            sparkline={sparklineData[r.stockItemKey]}
                            onSelect={() => onSelectItem(r.stockItemKey, r.stockItem, valueTierFor(r.cumulativeValuePct))}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function ListRow({
    row,
    isSelected,
    sparkline,
    onSelect,
}: {
    row: ParetoRow;
    isSelected: boolean;
    sparkline: { qty: number[]; dates: string[] } | undefined;
    onSelect: () => void;
}) {
    return (
        <li>
            <button
                type="button"
                onClick={onSelect}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                    "flex w-full items-center gap-200 border-b border-border px-400 py-200 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isSelected ? "bg-accent" : undefined,
                )}
            >
                <span className="w-[28px] shrink-0 font-numeric text-100 text-muted-foreground">
                    #{row.atRiskRank}
                </span>
                <span
                    className={cn("h-[14px] w-[4px] shrink-0 rounded-sm", VALUE_TIER_RAIL_CLASS[valueTierFor(row.cumulativeValuePct)])}
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-base text-200 text-foreground" title={row.stockItem}>
                    {row.stockItem}
                </span>
                {sparkline ? (
                    <span className="block h-[20px] w-[56px] shrink-0">
                        <Sparkline
                            data={sparkline.qty}
                            labels={sparkline.dates}
                            width={56}
                            height={20}
                            className="text-at-risk"
                            ariaLabel={`${row.stockItem}: daily units sold, last 60 days`}
                        />
                    </span>
                ) : (
                    <span aria-hidden="true" className="block h-[20px] w-[56px] shrink-0 animate-pulse rounded-md bg-muted" />
                )}
                <span className="w-[56px] shrink-0 text-right font-numeric text-100 text-foreground">
                    {formatCompactCurrency(row.reorderValue)}
                </span>
            </button>
        </li>
    );
}
