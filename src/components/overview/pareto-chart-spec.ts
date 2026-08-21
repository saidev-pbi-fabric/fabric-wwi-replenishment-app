import type { RankMode } from "@/hooks/use-pareto-dataset";

// Vega renders to SVG and can't resolve `var(--color-*)`, so these are duplicated as literal
// hex, matching global.css exactly. Matches the locked mockup (docs/mockup-reference.html):
// in-cutoff bars are --color-primary (the featured metric), not a severity color — red/amber/
// green are reserved for the ABC value-tier rail, not the chart fill.
export const CUTOFF_COLOR_RANGE = {
    light: ["#0f6cbd", "#616161"], // In cutoff (primary) / Past cutoff (muted-foreground)
    dark: ["#115ea3", "#adadad"],
} as const;

// Mockup's `.cutoff-rule` is --color-at-risk (amber) — the one non-primary accent in the chart.
const CUTOFF_RULE_COLOR = { light: "#9a6700", dark: "#e0a828" } as const;

/**
 * Pareto bar chart, mockup-faithful (docs/mockup-reference.html's `.chart-area`/`.bar`):
 * bars = per-item metric (colored by whether the item falls within the live cutoff), dashed
 * rule = the cutoff boundary. No cumulative-% line layer — that was a "richer than the mockup"
 * addition from an earlier rebuild pass that turned into visual noise once real data pushed the
 * chart to 70+ ranked bars. Cumulative % stays in the table only, same as the mockup.
 *
 * `mode` switches every $-vs-qty-specific label (axis title, axis number format, tooltip title/
 * format) — the underlying data field names stay the same regardless, only what they mean and
 * how they're labeled changes. Never hardcode "$" or "Value" here; always read from `mode`.
 *
 * x-position uses "ChartSlot" — a plain sequential index per rendered bar, NOT the displayed
 * rank — because ranks can legitimately tie (two items same $ value), and two bars sharing one
 * x-category collide into the same slot. "DisplayRank" (which can tie) is only ever shown in the
 * tooltip, never used for positioning. Selection/highlight keys off "StockItemKey" (always
 * unique) for the same reason — never key off a rank number.
 *
 * y scale is explicitly `zero: true` — without it, an unconfirmed default was compressing bars
 * into a narrow band near the axis max, making shorter bars nearly invisible (reported directly
 * as "only parts of it visible"). Tick step is left to Vega's automatic "nice" selection rather
 * than a hardcoded step, so it scales correctly whether the axis is showing hundreds of millions
 * of dollars or a qty-mode range of a few thousand units.
 *
 * Built as a function (not a static .json import) because the dashed cutoff rule's x-position is
 * the live slider value (`boundarySlot`) — needs a fresh literal data point every render, which a
 * static spec can't express.
 */
export function buildParetoChartSpec(boundarySlot: number | null, isDark: boolean, mode: RankMode) {
    const ruleColor = CUTOFF_RULE_COLOR[isDark ? "dark" : "light"];
    const isValue = mode === "value";
    const metricTitle = isValue ? "Reorder Value" : "Suggested Reorder Qty";
    const axisFormat = isValue ? "$.2s" : "~s";
    const tooltipFormat = isValue ? "$,.0f" : ",.0f";
    const layer: Record<string, unknown>[] = [
        {
            mark: { type: "bar" },
            params: [{ name: "itemSelect", select: { type: "point", fields: ["StockItemKey"] } }],
            encoding: {
                x: {
                    field: "ChartSlot",
                    type: "ordinal",
                    axis: { labels: false, ticks: false, title: "Items, ranked by risk →" },
                },
                y: {
                    field: "Metric",
                    type: "quantitative",
                    title: metricTitle,
                    axis: { format: axisFormat },
                    scale: { zero: true },
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
                    { field: "Metric", type: "quantitative", title: metricTitle, format: tooltipFormat },
                    { field: "CumulativePct", type: "quantitative", title: "Cumulative %", format: ".1%" },
                    { field: "DisplayRank", type: "quantitative", title: "Rank" },
                ],
            },
        },
    ];
    if (boundarySlot !== null) {
        layer.push({
            data: { values: [{ boundarySlot }] },
            mark: { type: "rule", strokeDash: [4, 4], color: ruleColor },
            encoding: {
                x: { field: "boundarySlot", type: "ordinal" },
            },
        });
    }
    return {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description:
            "Per-item metric, ranked. Bars in-cutoff are colored; past-cutoff bars are muted; a dashed rule marks the cutoff boundary.",
        width: "container",
        autosize: { type: "fit-x", contains: "padding" },
        layer,
    };
}
