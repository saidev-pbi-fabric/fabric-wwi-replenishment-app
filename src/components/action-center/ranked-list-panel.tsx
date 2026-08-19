//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { QueryTable } from "@microsoft/fabric-app-data";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { rankedAtRiskList } from "@/queries/action-center/ranked-at-risk-list";
import { itemSalesTrend } from "@/queries/action-center/item-sales-trend";
import { getFabricClient } from "@/lib/fabric-client";
import { cn, formatShortDate } from "@/lib/utils";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { RANKED_AT_RISK_LIST_FIXTURE, ITEM_SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";
import { Sparkline } from "@/components/shared/sparkline";
import {
    LEAD_TIME_RAIL_CLASS,
    LEAD_TIME_TEXT_CLASS,
    TIER_FILTERS,
    tierDistributionCaption,
    tierFilterLabel,
} from "@/lib/severity";

interface Row {
    key: number;
    name: string;
    tier: string;
    suggestedReorderQty: number;
    atRiskRank: number;
}

function rowsFromTable(table: QueryTable): Row[] {
    const idx = (name: string) => table.columns.findIndex((col) => col.name === name);
    const keyIdx = idx("Stock Item[Stock Item Key]");
    const nameIdx = idx("Stock Item[Stock Item]");
    const tierIdx = idx("Stock Item[Lead Time Priority Tier]");
    const qtyIdx = idx("[Suggested Reorder Qty]");
    const rankIdx = idx("[At Risk Rank]");

    return table.rows.map((row) => ({
        key: Number(row[keyIdx]),
        name: String(row[nameIdx]),
        tier: String(row[tierIdx]),
        suggestedReorderQty: Number(row[qtyIdx]),
        atRiskRank: Number(row[rankIdx]),
    }));
}

interface RankedListPanelProps {
    selectedStockItemKey: number | null;
    onSelectItem: (stockItemKey: number, stockItemName: string, tier: string) => void;
    /** Name handed off from Page 1's click-through; auto-selected once the list loads, then ignored. */
    initialSelectedItemName?: string | null;
}

export function RankedListPanel({
    selectedStockItemKey,
    onSelectItem,
    initialSelectedItemName,
}: RankedListPanelProps) {
    const [tierFilter, setTierFilter] = useState<(typeof TIER_FILTERS)[number]>("All");
    const panel = useQueryPanel(rankedAtRiskList(tierFilter));
    const autoSelectedRef = useRef(false);

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    const loadedTable = useMemo(() => {
        if (usingDevFixture) {
            return {
                columns: RANKED_AT_RISK_LIST_FIXTURE.columns,
                rows: RANKED_AT_RISK_LIST_FIXTURE.rows.filter(
                    (row) => tierFilter === "All" || row[2] === tierFilter,
                ),
            };
        }
        if (panel.status === "ready" || panel.status === "refreshing") return panel.table;
        if (panel.status === "empty") return { columns: [], rows: [] };
        return undefined;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- panel.table/panel.status cover the panel branches
    }, [usingDevFixture, tierFilter, panel.status]);

    // A filter change re-queries; keep the previous rows visible (dimmed)
    // instead of swapping to a blank skeleton on every change — the abrupt
    // swap was flagged directly by the user ("the transition ... goes blank").
    const isRefreshing = !usingDevFixture && panel.status === "refreshing";

    // Per-row sparklines: reuses itemSalesTrend (already proven in ItemDetailPanel) fired once
    // per visible row instead of one new composite item×date DAX query — N small, independently
    // cacheable calls beat one query that's harder to get right and can't be spot-checked per
    // item. Fetched directly via the Fabric client (not useQueryPanel, which is one-query-per-
    // component) so all rows' requests fire in parallel and each fills in as it resolves rather
    // than blocking the whole list on the slowest row.
    const [sparklineData, setSparklineData] = useState<Record<number, { qty: number[]; dates: string[] }>>({});

    useEffect(() => {
        if (!loadedTable) return;
        const keys = rowsFromTable(loadedTable).map((row) => row.key);
        let cancelled = false;

        if (usingDevFixture) {
            const qtyIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "[Quantity]");
            const dateIdx = ITEM_SALES_TREND_FIXTURE.columns.findIndex((col) => col.name === "Date[Date]");
            const fixtureQty = ITEM_SALES_TREND_FIXTURE.rows.map((row) => Number(row[qtyIdx] ?? 0));
            const fixtureDates = ITEM_SALES_TREND_FIXTURE.rows.map((row) => formatShortDate(String(row[dateIdx])));
            // eslint-disable-next-line react-hooks/set-state-in-effect -- dev-only fixture fill, mirrors the real fetch branch below which is necessarily async
            setSparklineData(
                Object.fromEntries(keys.map((key) => [key, { qty: fixtureQty, dates: fixtureDates }])),
            );
            return;
        }

        keys.forEach((key) => {
            if (sparklineData[key]) return; // already fetched (e.g. still cached from a prior tier view)
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
                    // A missing sparkline for one row isn't worth surfacing as a panel-level error —
                    // the row still shows its name/rank/qty fine without it.
                });
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sparklineData deliberately excluded: this only skips re-fetching rows already cached, it's not the effect's trigger
    }, [loadedTable, usingDevFixture]);

    useEffect(() => {
        if (autoSelectedRef.current || !initialSelectedItemName || !loadedTable) return;
        const match = rowsFromTable(loadedTable).find((row) => row.name === initialSelectedItemName);
        if (match) {
            autoSelectedRef.current = true;
            onSelectItem(match.key, match.name, match.tier);
        }
    }, [loadedTable, initialSelectedItemName, onSelectItem]);

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load at-risk items: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "loading") {
        return (
            <div
                data-testid="ranked-list-loading"
                className="h-full min-h-[480px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    if (!loadedTable) return null;

    const rows = rowsFromTable(loadedTable);

    return (
        <div className="flex max-h-[640px] min-h-[480px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-300 border-b border-border p-400">
                <h2 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                    <AlertTriangle className="icon-size-300 text-muted-foreground" />
                    At-Risk Items
                </h2>
                <label className="flex items-center gap-200 font-base text-200 text-muted-foreground">
                    Filter by lead time
                    <select
                        aria-label="Filter by lead time"
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value as (typeof TIER_FILTERS)[number])}
                        className="rounded-md border border-border bg-background px-200 py-100-nudge text-200 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        {TIER_FILTERS.map((tier) => (
                            <option key={tier} value={tier}>
                                {tierFilterLabel(tier)}
                            </option>
                        ))}
                    </select>
                    {isRefreshing ? (
                        <Loader2
                            className="icon-size-300 animate-spin text-muted-foreground"
                            aria-label="Updating"
                        />
                    ) : null}
                </label>
            </div>
            <p className="px-400 pt-200 font-base text-100 text-muted-foreground">
                {tierDistributionCaption(tierFilter)}
            </p>
            {usingDevFixture ? (
                <p className="px-400 pt-200 text-200 text-muted-foreground">
                    Sample data — dev preview (no Fabric embed)
                </p>
            ) : null}
            <div
                className={cn(
                    "flex flex-1 flex-col transition-opacity duration-200",
                    isRefreshing ? "opacity-50" : "opacity-100",
                )}
            >
                {rows.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-400 py-300 text-300 text-muted-foreground">
                        {tierFilter === "All"
                            ? "No at-risk items right now."
                            : `No at-risk items match "${tierFilterLabel(tierFilter)}" lead time.`}
                    </div>
                ) : (
                    <motion.ul
                        key={tierFilter}
                        className="flex-1 overflow-y-auto"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        {rows.map((row) => (
                            <motion.li key={row.key} variants={fadeInUp}>
                                <button
                                    type="button"
                                    onClick={() => onSelectItem(row.key, row.name, row.tier)}
                                    aria-current={row.key === selectedStockItemKey ? "true" : undefined}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-300 border-b border-l-4 border-border px-400 py-300 text-left transition-all hover:-translate-y-px hover:bg-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                                        LEAD_TIME_RAIL_CLASS[row.tier] ?? "border-l-transparent",
                                        row.key === selectedStockItemKey ? "bg-accent" : undefined,
                                    )}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className="block truncate font-base text-300 text-foreground"
                                            title={row.name}
                                        >
                                            {row.name}
                                        </span>
                                        <span className="block font-base text-200 text-muted-foreground">
                                            Rank #{row.atRiskRank} · Suggested reorder {row.suggestedReorderQty}
                                        </span>
                                    </span>
                                    {sparklineData[row.key] ? (
                                        // Sparkline's <svg> sets width="100%" internally (fills whatever box it's
                                        // given) -- without this fixed-size wrapper, that 100% resolves against
                                        // the flex row itself and the sparkline claims nearly all the row's width,
                                        // squeezing the name span next to it down to ~0.
                                        <span className="block h-[28px] w-[72px] shrink-0">
                                            <Sparkline
                                                data={sparklineData[row.key].qty}
                                                labels={sparklineData[row.key].dates}
                                                width={72}
                                                height={28}
                                                className={LEAD_TIME_TEXT_CLASS[row.tier] ?? "text-muted-foreground"}
                                                ariaLabel={`${row.name}: daily units sold, last 60 days`}
                                            />
                                        </span>
                                    ) : (
                                        <span
                                            aria-hidden="true"
                                            className="block h-[28px] w-[72px] shrink-0 animate-pulse rounded-md bg-muted"
                                        />
                                    )}
                                </button>
                            </motion.li>
                        ))}
                    </motion.ul>
                )}
            </div>
        </div>
    );
}
