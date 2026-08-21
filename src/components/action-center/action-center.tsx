//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { RankedListPanel } from "@/components/action-center/ranked-list-panel";
import { ItemDetailPanel } from "@/components/action-center/item-detail-panel";
import { ReorderActionForm } from "@/components/action-center/reorder-action-form";
import { ReorderActionHistory } from "@/components/action-center/reorder-action-history";
import { ReorderActionAuditLogPanel } from "@/components/action-center/reorder-action-audit-log";
import { useParetoDataset, type ParetoRow, type RankMode } from "@/hooks/use-pareto-dataset";
import type { ValueTier } from "@/lib/severity";

interface SelectedItem {
    row: ParetoRow;
    tier: ValueTier;
}

interface ActionCenterProps {
    rankMode: RankMode;
    /** Stock item name handed off from Page 1's ranked-list click-through, if any. */
    initialSelectedItemName: string | null;
}

export function ActionCenter({ rankMode, initialSelectedItemName }: ActionCenterProps) {
    // Same pareto-reorder-risk dataset as the Overview page (already
    // live-verified DAX) — reused here instead of a second lead-time-filtered
    // query, so the ranked list's Tier column and the item detail's rationale
    // both read off the one shared ranking rather than two different concepts.
    const dataset = useParetoDataset();
    const [selected, setSelected] = useState<SelectedItem | null>(null);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    // Lets the ranked-list card stretch to match however tall the right column actually
    // renders (detail + form + history + audit log stacked can exceed a single viewport) instead
    // of independently capping at 100vh, which left it visibly shorter than its sibling.
    const rightColRef = useRef<HTMLDivElement>(null);
    const [rightColHeight, setRightColHeight] = useState<number | null>(null);

    useEffect(() => {
        const el = rightColRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            setRightColHeight(entries[0]?.contentRect.height ?? null);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="grid grid-cols-1 items-start gap-500 lg:grid-cols-[1fr_1.05fr]">
            <RankedListPanel
                dataset={dataset}
                rankMode={rankMode}
                selectedStockItemKey={selected?.row.stockItemKey ?? null}
                initialSelectedItemName={initialSelectedItemName}
                onSelectItem={(row, tier) => setSelected({ row, tier })}
                matchHeight={rightColHeight}
            />
            <div ref={rightColRef} className="flex flex-col gap-500">
                <ItemDetailPanel
                    stockItemKey={selected?.row.stockItemKey ?? null}
                    tier={selected?.tier ?? null}
                    rank={selected ? (rankMode === "value" ? selected.row.reorderValueRank : selected.row.atRiskRank) : null}
                    rankMode={rankMode}
                    totalItemCount={dataset.rows.length}
                />
                {selected ? (
                    <>
                        <ReorderActionForm
                            stockItemKey={selected.row.stockItemKey}
                            stockItemName={selected.row.stockItem}
                            onSubmitted={() => setHistoryRefreshKey((n) => n + 1)}
                        />
                        <ReorderActionHistory
                            stockItemKey={selected.row.stockItemKey}
                            refreshKey={historyRefreshKey}
                            onStatusChanged={() => setHistoryRefreshKey((n) => n + 1)}
                        />
                        <ReorderActionAuditLogPanel
                            stockItemKey={selected.row.stockItemKey}
                            refreshKey={historyRefreshKey}
                        />
                    </>
                ) : null}
            </div>
        </div>
    );
}
