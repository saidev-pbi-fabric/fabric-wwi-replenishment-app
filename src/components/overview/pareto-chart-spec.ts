import type { RankMode } from "@/hooks/use-pareto-dataset";

// Vega renders to SVG and can't resolve `var(--color-*)`, so these are duplicated as literal
// hex, matching global.css exactly. Matches the locked mockup (docs/mockup-reference.html):
// in-cutoff bars are --color-brand (each theme's own signature accent — Cohere's coral, Sentry's
// electric lime), not a severity color — red/amber/green are reserved for the ABC value-tier
// rail, not the chart fill. Was wired to --color-primary until the Cohere+Sentry pairing, when
// dark-mode primary became an off-white button color (Sentry's own "invert on dark" CTA rule) —
// --color-brand is what was actually meant for "bar/area fills" per its own token comment in
// global.css, so the chart now reads that instead of trailing whatever primary happens to be.
export const CUTOFF_COLOR_RANGE = {
    light: ["#d94f30", "#75758a"], // In cutoff (brand) / Past cutoff (muted-foreground) — Cohere's coral
    dark: ["#c2ef4e", "#9187ab"], // Kept in sync with global.css's .dark --color-brand / --color-muted-foreground — Sentry's electric lime
} as const;

// Mockup's `.cutoff-rule` is --color-at-risk (amber) — the one non-primary accent in the chart.
const CUTOFF_RULE_COLOR = { light: "#a8600e", dark: "#f0b429" } as const;

/**
 * Explicit tick values for the y-axis, always starting at 0. `scale: { zero: true }` alone forces
 * the *domain* to include 0, but doesn't guarantee a "$0" tick actually gets drawn — Vega's
 * automatic "nice" tick-count heuristic picks its own values from the domain and, in this
 * rendering environment, was consistently choosing a lowest label (e.g. "$50M") above the true
 * axis floor, reported directly ("scale is not starting at 0") even though the domain genuinely
 * did start at 0 the whole time. Computing the tick set ourselves and passing it via `axis.values`
 * removes that ambiguity entirely instead of trusting an opaque default a second time.
 */
export function niceTicks(max: number, targetCount = 5): number[] {
    if (!Number.isFinite(max) || max <= 0) return [0];
    const rawStep = max / targetCount;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const residual = rawStep / magnitude;
    const niceResidual = residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1;
    const step = niceResidual * magnitude;
    const ticks: number[] = [];
    for (let v = 0; v <= max + step; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
}

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
 * as "only parts of it visible"). Tick *values* are computed explicitly via `niceTicks()` (always
 * starting at 0) rather than left to Vega's automatic selection — see that function's doc comment
 * for why trusting the automatic "nice" behavior a second time wasn't good enough.
 *
 * Built as a function (not a static .json import) because the dashed cutoff rule's x-position is
 * the live slider value (`boundarySlot`) — needs a fresh literal data point every render, which a
 * static spec can't express.
 */
export function buildParetoChartSpec(boundarySlot: number | null, isDark: boolean, mode: RankMode, metricMax: number) {
    const ruleColor = CUTOFF_RULE_COLOR[isDark ? "dark" : "light"];
    const isValue = mode === "value";
    const metricTitle = isValue ? "Reorder Value" : "Suggested Reorder Qty";
    const axisFormat = isValue ? "$.2s" : "~s";
    const tooltipFormat = isValue ? "$,.0f" : ",.0f";
    const tickValues = niceTicks(metricMax);
    const domainMax = tickValues[tickValues.length - 1];
    const layer: Record<string, unknown>[] = [
        // Explicit zero baseline, independent of the y-axis's own tick/label rendering — a second,
        // unmissable confirmation that bars start at 0, not just the axis tick that kept getting
        // squeezed out. See the y-encoding's axis comment below for why this exists.
        {
            data: { values: [{ zero: 0 }] },
            mark: { type: "rule", strokeWidth: 1, color: "#8a8a8a" },
            encoding: { y: { field: "zero", type: "quantitative" } },
        },
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
                    // labelOverlap/domain/grid set explicitly, not left to Vega defaults — a tight
                    // 280px chart with a legend above it was squeezing out the "0" tick's label
                    // (and sometimes the label alone, even with the domain/tick values already
                    // correct), which is what kept reading as "doesn't start at 0" even though the
                    // scale genuinely did. See buildParetoChartSpec's doc comment.
                    axis: { format: axisFormat, values: tickValues, labelOverlap: false, domain: true, domainWidth: 1.5, grid: true },
                    scale: { zero: true, domain: [0, domainMax] },
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
