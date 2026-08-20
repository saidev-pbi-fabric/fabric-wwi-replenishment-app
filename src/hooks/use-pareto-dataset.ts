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
    atRiskRank: number;
}

export interface ParetoDataset {
    status: QueryPanelState["status"];
    /** True only in a dev-only, non-Fabric-embedded preview — see use-query-panel.ts. */
    usingDevFixture: boolean;
    /** All rows returned by pareto-reorder-risk.dax, already ordered by At Risk Rank ascending. */
    rows: ParetoRow[];
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

    return table.rows.map((row) => ({
        stockItemKey: Number(row[keyIdx]),
        stockItem: String(row[nameIdx]),
        tier: String(row[tierIdx]),
        reorderValue: Number(row[valueIdx]),
        valueSharePct: Number(row[shareIdx]),
        cumulativeValuePct: Number(row[cumIdx]),
        atRiskRank: Number(row[rankIdx]),
    }));
}

/**
 * Single fetch of the full 672-item pareto-reorder-risk dataset, shared by
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
        return { status: panel.status, usingDevFixture: true, rows: parseRows(PARETO_REORDER_RISK_FIXTURE) };
    }

    if (panel.status === "ready" || panel.status === "refreshing") {
        return { status: panel.status, usingDevFixture: false, rows: parseRows(panel.table) };
    }

    return { status: panel.status, usingDevFixture: false, rows: [] };
}
