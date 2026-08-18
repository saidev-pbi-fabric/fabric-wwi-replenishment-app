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
 * Top 25 ranked at-risk stock items (capped server-side, same TOPN pattern as Page 1's
 * top-at-risk-items chart — an uncapped list here pulled every stock item in the model,
 * including zero-suggested-reorder noise rows). Severity/lead-time filtering happens
 * client-side against LeadTimePriorityTier — no supplier dimension exists in this dataset
 * (see docs/wwi-schema-reference.md), so that's the filter axis instead.
 */
export function rankedAtRiskList() {
  return { connection, query, columnMetadata };
}
