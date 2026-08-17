import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./top-at-risk-items.dax?raw";
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

export function topAtRiskItems() {
  return { connection, query, columnMetadata, vegaLiteSpec: spec };
}
