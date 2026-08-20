import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./kpi-strip.dax?raw";

const connection = "wwiRetailRebuild"; // from fabric.yaml — rebuild/pareto-thesis branch only, see SPEC.md

const columnMetadata: ColumnMetadataMap = {
  "[Items Tracked]": { name: "ItemsTracked", displayName: "Items Tracked" },
  "[Avg Lead Time Days]": { name: "AvgLeadTimeDays", displayName: "Avg Lead Time (Days)" },
  "[Accelerating Demand Items]": {
    name: "AcceleratingDemandItems",
    displayName: "Accelerating Demand",
  },
};

export function kpiStrip() {
  return { connection, query, columnMetadata };
}
