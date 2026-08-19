//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { Loader2 } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { itemDetail } from "@/queries/action-center/item-detail";
import { itemSalesTrend } from "@/queries/action-center/item-sales-trend";
import { cn, formatShortDate } from "@/lib/utils";
import { scalarByColumnName } from "@/lib/to-data-table";
import { ITEM_DETAIL_FIXTURE, ITEM_SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";
import { LEAD_TIME_RAIL_CLASS, LEAD_TIME_TEXT_CLASS } from "@/lib/severity";
import { Sparkline } from "@/components/shared/sparkline";

interface ItemDetailPanelProps {
    stockItemKey: number | null;
}

export function ItemDetailPanel({ stockItemKey }: ItemDetailPanelProps) {
    // Hooks run unconditionally — an empty connection/query is the hook's
    // own "skip" signal (see useSemanticModelQuery's `canExecute`), so this
    // stays a no-op query until a key is actually selected.
    const options = stockItemKey !== null ? itemDetail(stockItemKey) : { connection: "", query: "" };
    const panel = useQueryPanel(options);

    // Independent of the fields query above — a slower/failed trend fetch shouldn't block the
    // core detail fields from rendering. Rendered as its own small loading/empty block below.
    const trendOptions = stockItemKey !== null ? itemSalesTrend(stockItemKey) : { connection: "", query: "" };
    const trendPanel = useQueryPanel(trendOptions);

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

    // Composed client-side from fields already on screen — not a new metric, just a plain-English
    // read of them, so the "why" behind the rank doesn't require mentally parsing 5 separate cells.
    const trendWord = demandTrend > 0.03 ? "accelerating" : demandTrend < -0.03 ? "declining" : "steady";
    const rationale = `Sells ${recentDailySales.toFixed(1)}/day, restocks in ${leadTimeDays} days, demand ${trendWord} (${demandTrend >= 0 ? "+" : ""}${(demandTrend * 100).toFixed(0)}%) — ranked #${atRiskRank} of 672.`;

    const usingTrendFixture = import.meta.env.DEV && !import.meta.env.VITEST && trendPanel.status === "error";
    const trendTable = usingTrendFixture
        ? ITEM_SALES_TREND_FIXTURE
        : trendPanel.status === "ready" || trendPanel.status === "refreshing"
          ? trendPanel.table
          : undefined;
    const salesTrendData = trendTable
        ? (() => {
              const qtyIdx = trendTable.columns.findIndex((col) => col.name === "[Quantity]");
              return trendTable.rows.map((row) => Number(row[qtyIdx] ?? 0));
          })()
        : [];
    const salesTrendDates = trendTable
        ? (() => {
              const dateIdx = trendTable.columns.findIndex((col) => col.name === "Date[Date]");
              return trendTable.rows.map((row) => formatShortDate(String(row[dateIdx])));
          })()
        : [];
    const leadDaysNumeric = Number(leadTimeDays);
    const forecastDays = Number.isFinite(leadDaysNumeric) ? Math.min(leadDaysNumeric, 30) : 0;

    return (
        <div
            className={cn(
                "flex h-full min-h-[480px] flex-col rounded-lg border border-border bg-card shadow-sm transition-opacity duration-200",
                isRefreshing ? "opacity-50" : "opacity-100",
            )}
        >
            <div
                className={cn(
                    "flex items-start justify-between gap-300 border-b border-l-4 border-border bg-muted/40 p-400",
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
                    <p className="mt-100 font-base text-200 text-muted-foreground">{rationale}</p>
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
            <div className="border-t border-border px-400 py-300">
                <div className="flex flex-wrap items-baseline justify-between gap-200">
                    <p className="font-base text-200 uppercase tracking-wide text-muted-foreground">
                        Sales Trend — 60 Days
                    </p>
                    {salesTrendData.length > 0 && forecastDays > 0 ? (
                        <p className="font-base text-100 text-muted-foreground">
                            Shaded/dashed = {forecastDays}-day projection (linear trend, not a forecast model)
                        </p>
                    ) : null}
                </div>
                <div className="mt-200">
                    {!usingTrendFixture && (trendPanel.status === "loading" || trendPanel.status === "refreshing") && salesTrendData.length === 0 ? (
                        <div className="h-[56px] w-full animate-pulse rounded-md bg-muted" />
                    ) : salesTrendData.length > 0 ? (
                        <Sparkline
                            data={salesTrendData}
                            forecastDays={forecastDays}
                            width={640}
                            height={64}
                            className={LEAD_TIME_TEXT_CLASS[tier] ?? "text-muted-foreground"}
                            ariaLabel={`Daily units sold, last 60 days, projected ${forecastDays} days forward`}
                            showMinMax
                            showLatestValue
                            labels={salesTrendDates}
                        />
                    ) : (
                        <p className="text-200 text-muted-foreground">No recent sales history for this item.</p>
                    )}
                </div>
            </div>
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
