//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { itemSalesTrend } from "@/queries/action-center/item-sales-trend";
import { getFabricClient } from "@/lib/fabric-client";
import { downloadCsv } from "@/lib/csv-export";
import { cn, formatCompactCurrency, formatCompactNumber, formatShortDate } from "@/lib/utils";
import { ITEM_SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";
import { Sparkline } from "@/components/shared/sparkline";
import { VALUE_TIER_FILTERS, VALUE_TIER_RAIL_CLASS, valueTierFilterLabel, valueTierFor, type ValueTier } from "@/lib/severity";
import { cumPctOf, metricOf, rankOf, rankedRows, type ParetoDataset, type ParetoRow, type RankMode } from "@/hooks/use-pareto-dataset";

interface RankedListPanelProps {
    dataset: ParetoDataset;
    rankMode: RankMode;
    selectedStockItemKey: number | null;
    onSelectItem: (row: ParetoRow, tier: ValueTier) => void;
    /** Name handed off from Page 1's click-through; auto-selected once the list loads, then ignored. */
    initialSelectedItemName?: string | null;
}

export function RankedListPanel({
    dataset,
    rankMode,
    selectedStockItemKey,
    onSelectItem,
    initialSelectedItemName,
}: RankedListPanelProps) {
    const { status, usingDevFixture } = dataset;
    const rows = rankedRows(dataset, rankMode);
    const [tierFilter, setTierFilter] = useState<(typeof VALUE_TIER_FILTERS)[number]>("All");
    const [nameQuery, setNameQuery] = useState("");
    const autoSelectedRef = useRef(false);

    // Per-row sparklines: fetched lazily, one small itemSalesTrend request per row, only once
    // that row actually scrolls into view (see the IntersectionObserver in ListRow below). Not a
    // blanket "first 40 rows" fetch — with the dataset now holding 219 ranked items and a
    // tier/search filter that can jump straight to rows past #40, a fixed prefix left every row
    // beyond it permanently blank (reported directly: "these are all blank... why blank if not
    // 0?"). Lazy-on-visible bounds concurrent requests to what's actually on screen and works
    // under any filter/scroll position.
    const [sparklineData, setSparklineData] = useState<Record<number, { qty: number[]; dates: string[] }>>({});
    const requestedKeysRef = useRef<Set<number>>(new Set());
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
        };
    }, []);

    const requestSparkline = useCallback(
        (key: number) => {
            if (requestedKeysRef.current.has(key)) return;
            requestedKeysRef.current.add(key);

            if (usingDevFixture) {
                const qtyIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "[Quantity]");
                const dateIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "Date[Date]");
                const qty = ITEM_SALES_TREND_FIXTURE.rows.map((row) => Number(row[qtyIdx] ?? 0));
                const dates = ITEM_SALES_TREND_FIXTURE.rows.map((row) => formatShortDate(String(row[dateIdx])));
                setSparklineData((prev) => ({ ...prev, [key]: { qty, dates } }));
                return;
            }

            const { connection, query } = itemSalesTrend(key);
            getFabricClient()
                .semanticModel(connection)
                .query(query)
                .then((result) => {
                    if (cancelledRef.current || result.status !== "success") return;
                    const qtyIdx = result.table.columns.findIndex((col) => col.name === "[Quantity]");
                    const dateIdx = result.table.columns.findIndex((col) => col.name === "Date[Date]");
                    const qty = result.table.rows.map((row) => Number(row[qtyIdx] ?? 0));
                    const dates = result.table.rows.map((row) => formatShortDate(String(row[dateIdx])));
                    setSparklineData((prev) => ({ ...prev, [key]: { qty, dates } }));
                })
                .catch(() => {
                    // A missing sparkline for one row isn't worth surfacing as a panel-level error.
                });
        },
        [usingDevFixture],
    );

    useEffect(() => {
        if (autoSelectedRef.current || !initialSelectedItemName || rows.length === 0) return;
        const match = rows.find((row) => row.stockItem === initialSelectedItemName);
        if (match) {
            autoSelectedRef.current = true;
            onSelectItem(match, valueTierFor(cumPctOf(match, rankMode)));
        }
    }, [rows, initialSelectedItemName, onSelectItem, rankMode]);

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
    const filteredByTier =
        tierFilter === "All" ? rows : rows.filter((r) => valueTierFor(cumPctOf(r, rankMode)) === tierFilter);
    const visibleRows = trimmedQuery
        ? filteredByTier.filter((r) => r.stockItem.toLowerCase().includes(trimmedQuery))
        : filteredByTier;

    function handleDownloadCsv() {
        const metricHeader = rankMode === "value" ? "Reorder Value" : "Suggested Reorder Qty";
        downloadCsv(
            "at-risk-items.csv",
            ["Rank", "Item", "Value Tier", metricHeader],
            visibleRows.map((r) => [
                rankOf(r, rankMode),
                r.stockItem,
                valueTierFor(cumPctOf(r, rankMode)),
                metricOf(r, rankMode).toFixed(2),
            ]),
        );
    }

    return (
        <div className="flex h-[calc(100vh-200px)] min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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
                            rankMode={rankMode}
                            isSelected={r.stockItemKey === selectedStockItemKey}
                            sparkline={sparklineData[r.stockItemKey]}
                            onVisible={requestSparkline}
                            onSelect={() => onSelectItem(r, valueTierFor(cumPctOf(r, rankMode)))}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function ListRow({
    row,
    rankMode,
    isSelected,
    sparkline,
    onVisible,
    onSelect,
}: {
    row: ParetoRow;
    rankMode: RankMode;
    isSelected: boolean;
    sparkline: { qty: number[]; dates: string[] } | undefined;
    onVisible: (stockItemKey: number) => void;
    onSelect: () => void;
}) {
    const liRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        const el = liRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) onVisible(row.stockItemKey);
            },
            { root: el.closest("ul"), rootMargin: "200px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [row.stockItemKey, onVisible]);

    return (
        <li ref={liRef}>
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
                    #{rankOf(row, rankMode)}
                </span>
                <span
                    className={cn("h-[14px] w-[4px] shrink-0 rounded-sm", VALUE_TIER_RAIL_CLASS[valueTierFor(cumPctOf(row, rankMode))])}
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
                    {rankMode === "value"
                        ? formatCompactCurrency(metricOf(row, rankMode))
                        : formatCompactNumber(metricOf(row, rankMode))}
                </span>
            </button>
        </li>
    );
}
