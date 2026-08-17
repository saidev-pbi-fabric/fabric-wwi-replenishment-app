import type { ColumnMetadataMap } from "@/lib/to-data-table";
import queryTemplate from "./item-detail.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Stock Item[Stock Item Key]": { name: "StockItemKey", displayName: "Key" },
  "Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "Stock Item[Brand]": { name: "Brand", displayName: "Brand" },
  "Stock Item[Color]": { name: "Color", displayName: "Color" },
  "Stock Item[Lead Time Days]": { name: "LeadTimeDays", displayName: "Lead Time (Days)" },
  "Stock Item[Lead Time Priority Tier]": {
    name: "LeadTimePriorityTier",
    displayName: "Lead Time",
  },
  "Stock Item[Unit Price]": { name: "UnitPrice", displayName: "Unit Price" },
  "Stock Item[Recommended Retail Price]": {
    name: "RecommendedRetailPrice",
    displayName: "Recommended Retail Price",
  },
  "[Recent Daily Sales Rate]": { name: "RecentDailySalesRate", displayName: "Recent Daily Sales" },
  "[Demand Trend]": { name: "DemandTrend", displayName: "Demand Trend" },
  "[Suggested Reorder Qty]": { name: "SuggestedReorderQty", displayName: "Suggested Reorder Qty" },
  "[At Risk Rank]": { name: "AtRiskRank", displayName: "Rank" },
};

/**
 * Single-item detail lookup for the Action Center's right panel. `{{STOCK_ITEM_KEY}}` in
 * item-detail.dax is substituted with the selected row's Stock Item Key (an integer surrogate
 * key from the ranked list, never user-typed text) before the query is sent.
 */
export function itemDetail(stockItemKey: number) {
  if (!Number.isInteger(stockItemKey)) {
    throw new Error(`itemDetail: stockItemKey must be an integer, got ${stockItemKey}`);
  }

  const query = queryTemplate.replace("{{STOCK_ITEM_KEY}}", String(stockItemKey));

  return { connection, query, columnMetadata };
}
