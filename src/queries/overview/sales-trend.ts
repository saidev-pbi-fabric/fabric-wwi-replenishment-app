import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./sales-trend.dax?raw";
import spec from "./sales-trend.json";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Date[Date]": { name: "Date", displayName: "Date" },
  "[Total Quantity]": { name: "TotalQuantity", displayName: "Units Sold" },
};

export function salesTrend() {
  return { connection, query, columnMetadata, vegaLiteSpec: spec };
}
