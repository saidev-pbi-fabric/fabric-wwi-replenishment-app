import { useQueryPanel, type QueryPanelState } from "@/hooks/use-query-panel";
import { paretoReorderRisk } from "@/queries/overview/pareto-reorder-risk";
import { PARETO_REORDER_RISK_FIXTURE } from "@/lib/dev-preview-fixtures";
import type { QueryTable } from "@microsoft/fabric-app-data";

export interface ParetoRow {
    stockItemKey: number;
    stockItem: string;
    tier: string;
    reorderValue: number;
    valueSharePct: number;
    cumulativeValuePct: number;
    /** Qty x lead-time based rank (Suggested Reorder Qty, no price) — drives Action Center's
     * ranked list and its "#N" badges. NOT the same ordering as the Pareto $ chart — see
     * reorderValueRank. */
    atRiskRank: number;
    /** $ Reorder Value based rank, highest first — drives the Overview Pareto chart's bar order
     * and cumulativeValuePct (see rowsByValueRank below). Kept distinct from atRiskRank on
     * purpose: an item can have a low qty-based rank but a huge dollar value (high unit price,
     * modest quantity), and conflating the two made the Pareto chart's tallest bar land anywhere
     * but rank 1 — fixed 2026-08-21 after that was reported as "doesn't make sense."
     */
    reorderValueRank: number;
    /** Suggested Reorder Qty, summed (qty-mode counterpart to reorderValue). */
    suggestedReorderQty: number;
    /** This item's share of total qty (qty-mode counterpart to valueSharePct). */
    qtySharePct: number;
    /** Cumulative qty %, monotonic when walked in atRiskRank order — qty-mode counterpart to
     * cumulativeValuePct (which is only monotonic in reorderValueRank order). */
    cumulativeQtyPct: number;
}

/** Which metric the app is currently ranked/displayed by — set once, shared by Overview and
 * Action Center via a single toggle (App.tsx), never diverges per-page. */
export type RankMode = "qty" | "value";

/** The correctly-ordered row array for the given mode — `rows` (query order) is already qty-rank
 * ascending, `rowsByValueRank` is $ -rank ascending; cumulative %/tier math is only monotonic in
 * the matching order, so always read through this rather than picking an array by hand. */
export function rankedRows(dataset: ParetoDataset, mode: RankMode): ParetoRow[] {
    return mode === "value" ? dataset.rowsByValueRank : dataset.rows;
}

export function rankOf(row: ParetoRow, mode: RankMode): number {
    return mode === "value" ? row.reorderValueRank : row.atRiskRank;
}

export function metricOf(row: ParetoRow, mode: RankMode): number {
    return mode === "value" ? row.reorderValue : row.suggestedReorderQty;
}

export function cumPctOf(row: ParetoRow, mode: RankMode): number {
    return mode === "value" ? row.cumulativeValuePct : row.cumulativeQtyPct;
}

/** "reorder value" / "reorder quantity" — for headline/caption sentences that name the metric. */
export function metricNoun(mode: RankMode): string {
    return mode === "value" ? "reorder value" : "reorder quantity";
}

export interface ParetoDataset {
    status: QueryPanelState["status"];
    /** True only in a dev-only, non-Fabric-embedded preview — see use-query-panel.ts. */
    usingDevFixture: boolean;
    /** All rows returned by pareto-reorder-risk.dax, in the query's own order (At Risk Rank
     * ascending — qty x lead-time). Use this for Action Center, which ranks by that metric. */
    rows: ParetoRow[];
    /** The same rows, re-sorted by reorderValueRank ascending ($ value, highest first). Use this
     * for anything on the Overview page (Pareto chart/table, the two cutoff-based KPI tiles) —
     * cumulativeValuePct is only monotonic in this order, not in `rows`' order. */
    rowsByValueRank: ParetoRow[];
}

function parseRows(table: QueryTable): ParetoRow[] {
    const idx = (name: string) => table.columns.findIndex((col) => col.name === name);
    const keyIdx = idx("Stock Item[Stock Item Key]");
    const nameIdx = idx("Stock Item[Stock Item]");
    const tierIdx = idx("Stock Item[Lead Time Priority Tier]");
    const valueIdx = idx("[Reorder Value]");
    const shareIdx = idx("[Value Share %]");
    const cumIdx = idx("[Cumulative Value %]");
    const rankIdx = idx("[At Risk Rank]");
    const valueRankIdx = idx("[Reorder Value Rank]");
    const qtyIdx = idx("[Suggested Reorder Qty]");
    const qtyShareIdx = idx("[Qty Share %]");
    const qtyCumIdx = idx("[Cumulative Qty %]");

    return table.rows.map((row) => ({
        stockItemKey: Number(row[keyIdx]),
        stockItem: String(row[nameIdx]),
        tier: String(row[tierIdx]),
        reorderValue: Number(row[valueIdx]),
        valueSharePct: Number(row[shareIdx]),
        cumulativeValuePct: Number(row[cumIdx]),
        atRiskRank: Number(row[rankIdx]),
        reorderValueRank: Number(row[valueRankIdx]),
        suggestedReorderQty: Number(row[qtyIdx]),
        qtySharePct: Number(row[qtyShareIdx]),
        cumulativeQtyPct: Number(row[qtyCumIdx]),
    }));
}

function byValueRank(rows: ParetoRow[]): ParetoRow[] {
    return [...rows].sort((a, b) => a.reorderValueRank - b.reorderValueRank);
}

/**
 * Single fetch of the pareto-reorder-risk dataset (items with nonzero reorder value only,
 * see pareto-reorder-risk.ts), shared by
 * both kpi-strip.tsx (the two cutoff-based tiles) and pareto-risk-view.tsx
 * (chart, slider, table) — see SPEC.md's "KPI strip — becomes hybrid"
 * section for why this is one shared fetch instead of two separate queries.
 */
export function useParetoDataset(): ParetoDataset {
    const panel = useQueryPanel(paretoReorderRisk());

    // Dev-only fallback, same literal-check placement as every other query-backed
    // component — see use-query-panel.ts for why this stays inline per call site.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (usingDevFixture) {
        const rows = parseRows(PARETO_REORDER_RISK_FIXTURE);
        return { status: panel.status, usingDevFixture: true, rows, rowsByValueRank: byValueRank(rows) };
    }

    if (panel.status === "ready" || panel.status === "refreshing") {
        const rows = parseRows(panel.table);
        return { status: panel.status, usingDevFixture: false, rows, rowsByValueRank: byValueRank(rows) };
    }

    return { status: panel.status, usingDevFixture: false, rows: [], rowsByValueRank: [] };
}
