import type { ColumnMetadataMap } from "@/lib/to-data-table";
import queryTemplate from "./item-sales-trend.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Date[Date]": { name: "Date", displayName: "Date" },
  "[Quantity]": { name: "Quantity", displayName: "Quantity" },
};

/**
 * Last 60 calendar days of real daily `Sale[Quantity]` for one stock item, ending on the
 * dataset's `[Max Sale Date]` (this sample is historical, Jan-Nov 2000 — `TODAY()` would return
 * an empty window). One row per calendar day, including zero-sale days, so the sparkline reads
 * as a continuous trend instead of skipping gaps. `{{STOCK_ITEM_KEY}}` is substituted the same
 * way as `item-detail.dax` — an integer surrogate key, never user-typed text.
 */
export function itemSalesTrend(stockItemKey: number) {
  if (!Number.isInteger(stockItemKey)) {
    throw new Error(`itemSalesTrend: stockItemKey must be an integer, got ${stockItemKey}`);
  }

  const query = queryTemplate.replace("{{STOCK_ITEM_KEY}}", String(stockItemKey));

  return { connection, query, columnMetadata };
}
