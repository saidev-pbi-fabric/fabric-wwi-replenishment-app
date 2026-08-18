import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./top-at-risk-drill.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "Stock Item[Lead Time Days]": { name: "LeadTimeDays", displayName: "Lead Time (Days)" },
  "[Suggested Reorder Qty]": { name: "SuggestedReorderQty", displayName: "Suggested Reorder Qty" },
  "[Demand Trend]": { name: "DemandTrend", displayName: "Demand Trend" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
};

/**
 * Drill-through target for the Overview KPI strip's "Top At-Risk Items" tile — the same top 20
 * by At Risk Rank the tile's count describes (kpi-strip.dax: rank <= 20), with the full column
 * set for a real table view instead of just the count.
 */
export function topAtRiskDrill() {
  return { connection, query, columnMetadata };
}
