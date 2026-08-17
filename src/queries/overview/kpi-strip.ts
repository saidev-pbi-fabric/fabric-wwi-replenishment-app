import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./kpi-strip.dax?raw";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "[Items Tracked]": { name: "ItemsTracked", displayName: "Items Tracked" },
  "[Avg Lead Time Days]": { name: "AvgLeadTimeDays", displayName: "Avg Lead Time (Days)" },
  "[Top At Risk Items]": { name: "TopAtRiskItems", displayName: "Top At-Risk Items" },
  "[Accelerating Demand Items]": {
    name: "AcceleratingDemandItems",
    displayName: "Accelerating Demand",
  },
};

export function kpiStrip() {
  return { connection, query, columnMetadata };
}
