//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Loader2 } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { itemDetail } from "@/queries/action-center/item-detail";
import { cn } from "@/lib/utils";
import { scalarByColumnName } from "@/lib/to-data-table";
import { ITEM_DETAIL_FIXTURE } from "@/lib/dev-preview-fixtures";
import { LEAD_TIME_RAIL_CLASS } from "@/lib/severity";

interface ItemDetailPanelProps {
    stockItemKey: number | null;
}

export function ItemDetailPanel({ stockItemKey }: ItemDetailPanelProps) {
    // Hooks run unconditionally — an empty connection/query is the hook's
    // own "skip" signal (see useSemanticModelQuery's `canExecute`), so this
    // stays a no-op query until a key is actually selected.
    const options = stockItemKey !== null ? itemDetail(stockItemKey) : { connection: "", query: "" };
    const panel = useQueryPanel(options);

    if (stockItemKey === null) {
        return (
            <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                Select an item from the list to see its detail.
            </div>
        );
    }

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load item detail: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "loading") {
        return (
            <div
                data-testid="item-detail-loading"
                className="h-full min-h-[480px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    if (!usingDevFixture && panel.status === "empty") {
        return (
            <div className="flex h-full min-h-[480px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No detail found for this item.
            </div>
        );
    }

    const table = usingDevFixture
        ? {
              columns: ITEM_DETAIL_FIXTURE.columns,
              rows: [
                  ITEM_DETAIL_FIXTURE.rows.find((row) => row[0] === stockItemKey) ??
                      ITEM_DETAIL_FIXTURE.rows[0],
              ],
          }
        : panel.status === "ready" || panel.status === "refreshing"
          ? panel.table
          : undefined;
    if (!table) return null;

    // Switching the selected item re-queries; keep the previous item's
    // detail visible (dimmed) instead of swapping to a blank skeleton on
    // every selection — the abrupt swap was flagged directly by the user
    // ("the transition ... goes blank").
    const isRefreshing = !usingDevFixture && panel.status === "refreshing";

    const name = String(scalarByColumnName(table, "Stock Item[Stock Item]") ?? "—");
    const tier = String(scalarByColumnName(table, "Stock Item[Lead Time Priority Tier]") ?? "—");
    const brand = String(scalarByColumnName(table, "Stock Item[Brand]") ?? "—");
    const color = String(scalarByColumnName(table, "Stock Item[Color]") ?? "—");
    const leadTimeDays = String(scalarByColumnName(table, "Stock Item[Lead Time Days]") ?? "—");
    const unitPrice = Number(scalarByColumnName(table, "Stock Item[Unit Price]") ?? 0);
    const rrp = Number(scalarByColumnName(table, "Stock Item[Recommended Retail Price]") ?? 0);
    const recentDailySales = Number(scalarByColumnName(table, "[Recent Daily Sales Rate]") ?? 0);
    const demandTrend = Number(scalarByColumnName(table, "[Demand Trend]") ?? 0);
    const suggestedReorderQty = Number(scalarByColumnName(table, "[Suggested Reorder Qty]") ?? 0);
    const atRiskRank = String(scalarByColumnName(table, "[At Risk Rank]") ?? "—");

    return (
        <div
            className={cn(
                "flex h-full min-h-[480px] flex-col rounded-lg border border-border bg-card shadow-sm transition-opacity duration-200",
                isRefreshing ? "opacity-50" : "opacity-100",
            )}
        >
            <div
                className={cn(
                    "flex items-start justify-between gap-300 border-b border-l-4 border-border p-400",
                    LEAD_TIME_RAIL_CLASS[tier] ?? "border-l-transparent",
                )}
            >
                <div>
                    <h2 className="font-heading text-400 font-semibold text-foreground">{name}</h2>
                    <p className="mt-100 font-base text-200 text-muted-foreground">
                        {brand !== "N/A" || color !== "N/A" ? (
                            <>
                                <span>{brand}</span> · <span>{color}</span> ·{" "}
                            </>
                        ) : null}
                        Rank #{atRiskRank}
                    </p>
                </div>
                {isRefreshing ? (
                    <Loader2
                        className="icon-size-300 shrink-0 animate-spin text-muted-foreground"
                        aria-label="Updating"
                    />
                ) : usingDevFixture ? (
                    <span className="shrink-0 font-base text-200 text-muted-foreground">
                        Sample data — dev preview
                    </span>
                ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-400 p-400">
                <DetailField label="Lead Time" value={tier} />
                <DetailField label="Lead Time (Days)" value={leadTimeDays} />
                <DetailField label="Unit Price" value={`$${unitPrice.toFixed(2)}`} />
                <DetailField label="Recommended Retail Price" value={`$${rrp.toFixed(2)}`} />
                <DetailField label="Recent Daily Sales" value={recentDailySales.toFixed(1)} />
                <DetailField label="Demand Trend" value={`${(demandTrend * 100).toFixed(0)}%`} />
                <DetailField label="Suggested Reorder Qty" value={suggestedReorderQty.toLocaleString()} />
            </dl>
        </div>
    );
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-base text-200 uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-100 font-numeric text-300 text-foreground">{value}</dd>
        </div>
    );
}
