import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./top-contributors-drill.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "[Unit Price]": { name: "UnitPrice", displayName: "Unit Price" },
  "[Suggested Reorder Qty]": { name: "SuggestedReorderQty", displayName: "Suggested Reorder Qty" },
  "[Reorder Value]": { name: "ReorderValue", displayName: "Reorder Value" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
};

/**
 * Drill-through target for the Overview KPI strip's "At-Risk Reorder Value" tile — the top 10
 * $ contributors (Unit Price × Suggested Reorder Qty) within the same top-20-at-risk-rank set
 * the tile's total sums (kpi-strip.dax: SUMX over rank <= 20). Capped at 10, not all 20, because
 * the point of this drill-through is "what's driving the number," not a full duplicate listing
 * of the at-risk drill-through next to it — the top contributors are what a user acting on this
 * tile actually needs to see first.
 */
export function topContributorsDrill() {
  return { connection, query, columnMetadata };
}
