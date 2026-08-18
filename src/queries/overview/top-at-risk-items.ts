import type { ColumnMetadataMap } from "@/lib/to-data-table";
import { TIER_FILTERS, tierFilterClause } from "@/lib/severity";
import queryTemplate from "./top-at-risk-items.dax?raw";
import spec from "./top-at-risk-items.json";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "[Suggested Reorder Qty]": { name: "SuggestedReorderQty", displayName: "Suggested Reorder Qty" },
  "[Demand Trend]": { name: "DemandTrend", displayName: "Demand Trend" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
};

/**
 * Top 10 at-risk items for the selected lead-time tier (or every tier for
 * "All"). Filters server-side — see tierFilterClause's doc comment for why a
 * client-side slice of one shared global TOPN was wrong on the real data.
 */
export function topAtRiskItems(tierFilter: (typeof TIER_FILTERS)[number]) {
  const query = queryTemplate.replace("{{TIER_FILTER}}", tierFilterClause(tierFilter));
  return { connection, query, columnMetadata, vegaLiteSpec: spec };
}
