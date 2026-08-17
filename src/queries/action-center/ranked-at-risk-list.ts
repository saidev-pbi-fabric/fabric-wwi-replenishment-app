import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./ranked-at-risk-list.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

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
};

/**
 * Full ranked at-risk list (all stock items, one row each). Severity/lead-time filtering
 * happens client-side against LeadTimePriorityTier — no supplier dimension exists in this
 * dataset (see docs/wwi-schema-reference.md), so that's the filter axis instead.
 */
export function rankedAtRiskList() {
  return { connection, query, columnMetadata };
}
