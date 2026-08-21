// Vega renders to SVG and can't resolve `var(--color-*)`, so these are duplicated as literal
// hex, matching global.css exactly (critical = --color-critical, past-cutoff = a neutral not
// otherwise used as a severity color, so "in cutoff" reads as the only meaningful color).
export const CUTOFF_COLOR_RANGE = {
    light: ["#c50f1f", "#c7c7c7"], // In cutoff / Past cutoff
    dark: ["#f1707b", "#5a5a5a"],
} as const;

/**
 * Layered Pareto combo chart: bars = per-item Reorder Value (colored by
 * whether the item falls within the live cutoff), line = cumulative %
 * (independent y-scale), dashed rule = the cutoff level itself. No forward
 * projection of any kind — this dataset's DAX has no forecast measure (see
 * SPEC.md's "Pareto view" section), historical/current only.
 *
 * Built as a function (not a static .json import) because the dashed cutoff
 * rule's position is the live slider value — it needs a fresh literal data
 * point every render, which a static spec can't express.
 */
export function buildParetoChartSpec(cutoffPct: number) {
    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description:
            "Reorder Value per stock item, ranked by At Risk Rank, with a running cumulative % line. Bars in-cutoff are colored; past-cutoff bars are muted.",
        width: "container",
        autosize: { type: "fit-x", contains: "padding" },
        resolve: { scale: { y: "independent" } },
        layer: [
            {
                mark: { type: "bar" },
                params: [{ name: "itemSelect", select: { type: "point", fields: ["AtRiskRank"] } }],
                encoding: {
                    x: {
                        field: "AtRiskRank",
                        type: "ordinal",
                        axis: { labels: false, ticks: false, title: "Items, ranked by risk →" },
                    },
                    y: {
                        field: "ReorderValue",
                        type: "quantitative",
                        title: "Reorder Value",
                        axis: { format: "$.2s" },
                    },
                    color: {
                        field: "InCutoff",
                        type: "nominal",
                        scale: { domain: ["In cutoff", "Past cutoff"] },
                        legend: { title: null },
                    },
                    opacity: {
                        condition: { param: "itemSelect", value: 1 },
                        value: 0.85,
                    },
                    tooltip: [
                        { field: "StockItem", type: "nominal", title: "Item" },
                        { field: "Tier", type: "nominal", title: "Lead Time" },
                        { field: "ReorderValue", type: "quantitative", title: "Reorder Value", format: "$,.0f" },
                        { field: "CumulativeValuePct", type: "quantitative", title: "Cumulative %", format: ".1%" },
                        { field: "AtRiskRank", type: "quantitative", title: "Rank" },
                    ],
                },
            },
            {
                mark: { type: "line", point: true, color: "#8a8a8a" },
                encoding: {
                    x: { field: "AtRiskRank", type: "ordinal" },
                    y: {
                        field: "CumulativeValuePct",
                        type: "quantitative",
                        title: "Cumulative %",
                        axis: { format: ".0%" },
                        scale: { domain: [0, 1] },
                    },
                },
            },
            {
                data: { values: [{ cutoff: cutoffPct }] },
                mark: { type: "rule", strokeDash: [4, 4], color: "#8a8a8a" },
                encoding: {
                    y: { field: "cutoff", type: "quantitative", scale: { domain: [0, 1] }, axis: null },
                },
            },
        ],
    };
}
