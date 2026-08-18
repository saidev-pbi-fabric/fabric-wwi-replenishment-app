//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import type { QueryTable } from "@microsoft/fabric-app-data";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { rankedAtRiskList } from "@/queries/action-center/ranked-at-risk-list";
import { cn } from "@/lib/utils";
import { RANKED_AT_RISK_LIST_FIXTURE } from "@/lib/dev-preview-fixtures";
import { LEAD_TIME_RAIL_CLASS } from "@/lib/severity";

// Filter values are the real Stock Item[Lead Time Priority Tier] strings
// (verified live against the semantic model) — displayed with the
// " Lead Time" suffix trimmed for a compact dropdown, see tierFilterLabel.
const TIER_FILTERS = ["All", "Short Lead Time", "Medium Lead Time", "Long Lead Time"] as const;

function tierFilterLabel(tier: (typeof TIER_FILTERS)[number]): string {
    return tier === "All" ? "All" : tier.replace(" Lead Time", "");
}

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
    const panel = useQueryPanel(rankedAtRiskList());
    const [tierFilter, setTierFilter] = useState<(typeof TIER_FILTERS)[number]>("All");
    const autoSelectedRef = useRef(false);

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    const loadedTable = usingDevFixture
        ? RANKED_AT_RISK_LIST_FIXTURE
        : panel.status === "ready"
          ? panel.table
          : undefined;

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

    if (!usingDevFixture && panel.status === "empty") {
        return (
            <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No at-risk items right now.
            </div>
        );
    }

    if (!loadedTable) return null;

    const rows = rowsFromTable(loadedTable).filter((row) => tierFilter === "All" || row.tier === tierFilter);

    return (
        <div className="flex h-full min-h-[480px] flex-col rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-300 border-b border-border p-400">
                <h2 className="font-heading text-400 font-semibold text-foreground">At-Risk Items</h2>
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
            </div>
            {usingDevFixture ? (
                <p className="px-400 pt-200 text-200 text-muted-foreground">
                    Sample data — dev preview (no Fabric embed)
                </p>
            ) : null}
            <ul className="flex-1 overflow-y-auto">
                {rows.map((row) => (
                    <li key={row.key}>
                        <button
                            type="button"
                            onClick={() => onSelectItem(row.key, row.name, row.tier)}
                            aria-current={row.key === selectedStockItemKey ? "true" : undefined}
                            className={cn(
                                "flex w-full items-center justify-between gap-300 border-b border-l-4 border-border px-400 py-300 text-left transition-colors hover:bg-accent",
                                LEAD_TIME_RAIL_CLASS[row.tier] ?? "border-l-transparent",
                                row.key === selectedStockItemKey ? "bg-accent" : undefined,
                            )}
                        >
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-base text-300 text-foreground">
                                    {row.name}
                                </span>
                                <span className="block font-base text-200 text-muted-foreground">
                                    Rank #{row.atRiskRank} · Suggested reorder {row.suggestedReorderQty}
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
