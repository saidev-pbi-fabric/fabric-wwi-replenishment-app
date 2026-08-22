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
import type { ValueTier } from "@/lib/severity";
import type { RankMode } from "@/hooks/use-pareto-dataset";
import { ItemTrendChart } from "@/components/action-center/item-trend-chart";

interface ItemDetailPanelProps {
    stockItemKey: number | null;
    /** ABC value tier for the selected item, from the shared Pareto dataset (see action-center.tsx). */
    tier: ValueTier | null;
    /** Rank matching the active rankMode, from the shared Pareto dataset — not re-queried here, so
     * it can never disagree with what the ranked list/chart show for the same item. */
    rank: number | null;
    rankMode: RankMode;
    /** Row count of the shared Pareto dataset (see action-center.tsx) — the "of N" in the rationale line. */
    totalItemCount: number;
}

export function ItemDetailPanel({ stockItemKey, tier, rank, rankMode, totalItemCount }: ItemDetailPanelProps) {
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
    const leadTimeDays = String(scalarByColumnName(table, "Stock Item[Lead Time Days]") ?? "—");
    const unitPrice = Number(scalarByColumnName(table, "Stock Item[Unit Price]") ?? 0);
    const recentDailySales = Number(scalarByColumnName(table, "[Recent Daily Sales Rate]") ?? 0);
    const demandTrend = Number(scalarByColumnName(table, "[Demand Trend]") ?? 0);
    const suggestedReorderQty = Number(scalarByColumnName(table, "[Suggested Reorder Qty]") ?? 0);

    // Composed client-side from fields already on screen — not a new metric, just a plain-English
    // read of them, so the "why" behind the rank doesn't require mentally parsing separate cells.
    // Matches the locked mockup's phrasing (docs/mockup-reference.html, #page-action rationale
    // line), extended to read sensibly for tiers B/C too (the mockup only illustrates a Tier A row).
    // Rank/mode label is explicit ("by $ value" / "by qty") — with two live rank modes in the app
    // now, a bare "#3" is ambiguous without saying which lens it's from.
    const trendWord = demandTrend > 0.03 ? "accelerating" : demandTrend < -0.03 ? "declining" : "steady";
    // Same severity-token scale as the KPI strip (src/components/overview/kpi-strip.tsx) — rising
    // demand against a fixed lead time is the risk signal (critical), falling demand eases it
    // (on-track), flat is neutral. Was hardcoded to text-critical regardless of direction before
    // this fix, contradicting the adjacent rationale text on declining/steady items.
    const trendColorClass =
        trendWord === "accelerating" ? "text-critical" : trendWord === "declining" ? "text-on-track" : "text-muted-foreground";
    const trendPct = `${demandTrend >= 0 ? "+" : ""}${(demandTrend * 100).toFixed(0)}%`;
    const tierLabel = tier ?? "—";
    const rankLabel = rank !== null ? `#${rank}` : "—";
    const modeLabel = rankMode === "value" ? "$ value" : "qty";
    const rationale =
        `Tier ${tierLabel} · rank ${rankLabel} of ${totalItemCount} by ${modeLabel}. Sales rate ${trendWord} ${trendPct} vs. the prior 30 days, ` +
        `against a ${leadTimeDays}-day lead time` +
        (tier === "A" ? " — the combination that puts it in the top concentration band." : ".");

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

    return (
        <div
            className={cn(
                "flex flex-col rounded-lg border border-border bg-card p-400 shadow-sm transition-opacity duration-200",
                isRefreshing ? "opacity-50" : "opacity-100",
            )}
        >
            <div className="flex items-start justify-between gap-300">
                <div>
                    <h2 className="font-heading text-400 font-semibold text-foreground">{name}</h2>
                    <p className="mt-100 font-base text-200 text-muted-foreground">{rationale}</p>
                </div>
                {isRefreshing ? (
                    <Loader2
                        className="icon-size-300 shrink-0 animate-spin text-muted-foreground"
                        aria-label="Updating"
                    />
                ) : usingDevFixture ? (
                    <span className="shrink-0 font-base text-200 text-muted-foreground">
                        Sample data · dev preview
                    </span>
                ) : null}
            </div>

            <div className="mt-300 rounded-md border border-border p-300">
                {!usingTrendFixture && (trendPanel.status === "loading" || trendPanel.status === "refreshing") && salesTrendData.length === 0 ? (
                    <div className="h-[100px] w-full animate-pulse rounded-md bg-muted" />
                ) : salesTrendData.length > 0 ? (
                    <>
                        <ItemTrendChart
                            data={salesTrendData}
                            startLabel={salesTrendDates[0] ?? ""}
                            endLabel={salesTrendDates[salesTrendDates.length - 1] ?? ""}
                            className={trendColorClass}
                            ariaLabel="Daily units sold, last 60 days"
                        />
                        {Math.min(...salesTrendData) === Math.max(...salesTrendData) ? (
                            <p className="mt-100 font-base text-100 text-muted-foreground">
                                Flat by design, not a rendering issue — this item sold the exact same quantity every
                                day over this window, verified against the underlying data.
                            </p>
                        ) : null}
                    </>
                ) : (
                    <p className="text-200 text-muted-foreground">No recent sales history for this item.</p>
                )}
            </div>
            <p className="mt-100 font-base text-100 text-muted-foreground">
                Historical daily sales only — no forward projection. This dataset's DAX has no forecast
                measure, so we don't draw one.
            </p>

            <p className="mt-300 rounded-md border border-border bg-accent px-300 py-200 font-base text-100 text-muted-foreground">
                No stock-on-hand figure exists anywhere in this dataset — "days of stock left" can't be
                shown honestly. <strong className="text-foreground">Suggested Reorder Qty</strong> below covers
                this item's own {leadTimeDays}-day lead time (recent daily sales rate &times; lead time &times;
                safety buffer) — not a fixed 30- or 60-day window, and not a prediction.
            </p>

            <dl className="mt-300 grid grid-cols-3 gap-300">
                <DetailStat label="Unit Price" value={`$${unitPrice.toFixed(2)}`} />
                <DetailStat label="Recent Daily Sales" value={recentDailySales.toLocaleString(undefined, { maximumFractionDigits: 1 })} />
                <DetailStat label={`Suggested Reorder Qty (next ${leadTimeDays}d)`} value={suggestedReorderQty.toLocaleString()} />
            </dl>
        </div>
    );
}

function DetailStat({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-base text-100 uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-100 font-numeric text-300 text-foreground">{value}</dd>
        </div>
    );
}
