import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./pareto-reorder-risk.dax?raw";

const connection = "wwiRetailRebuild"; // from fabric.yaml — rebuild/pareto-thesis branch only, see SPEC.md

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item Key]": { name: "StockItemKey", displayName: "Stock Item Key" },
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "[Reorder Value]": { name: "ReorderValue", displayName: "Reorder Value" },
  "[Value Share %]": { name: "ValueSharePct", displayName: "Value Share %" },
  "[Cumulative Value %]": { name: "CumulativeValuePct", displayName: "Cumulative Value %" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
};

/**
 * All 672 stock items ranked by At Risk Rank, with per-item and running-total
 * reorder value share. Single source query for the Pareto view AND the two
 * cutoff-based KPI tiles (see kpi-strip.tsx) — fetched once, the cutoff
 * slider/table grouping/KPI numbers are all a client-side recompute over
 * this one result set, no re-query per interaction.
 */
export function paretoReorderRisk() {
  return { connection, query, columnMetadata };
}
