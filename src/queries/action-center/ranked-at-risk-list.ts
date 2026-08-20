import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { TIER_FILTERS, tierFilterClause } from "@/lib/severity";
import queryTemplate from "./ranked-at-risk-list.dax?raw";

const connection = "wwiRetailRebuild"; // from fabric.yaml — rebuild/pareto-thesis branch only, see SPEC.md

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item Key]": { name: "StockItemKey", displayName: "Key" },
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "[Suggested Reorder Qty]": { name: "SuggestedReorderQty", displayName: "Suggested Reorder Qty" },
  "[Demand Trend]": { name: "DemandTrend", displayName: "Demand Trend" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
  "[Cumulative Value %]": { name: "CumulativeValuePct", displayName: "Cumulative Value %" },
};

/**
 * Top 25 ranked at-risk stock items for the selected lead-time tier (or every
 * tier for "All"). Filters server-side, not client-side against a shared
 * global TOPN — see tierFilterClause's doc comment for why that mattered on
 * the real data. No supplier dimension exists in this dataset (see
 * docs/wwi-schema-reference.md), so lead-time tier is the filter axis instead.
 */
export function rankedAtRiskList(tierFilter: (typeof TIER_FILTERS)[number]) {
  const query = queryTemplate.replace("{{TIER_FILTER}}", tierFilterClause(tierFilter));
  return { connection, query, columnMetadata };
}
