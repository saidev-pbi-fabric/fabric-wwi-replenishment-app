//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { topAtRiskItems } from "./top-at-risk-items";

describe("topAtRiskItems", () => {
    const result = topAtRiskItems("All");

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("ranks the top 10 items by At Risk Rank", () => {
        expect(result.query).toContain("TOPN(\n    10,");
        expect(result.query).toContain("[At Risk Rank]");
    });

    it("maps every DAX result column to friendly metadata", () => {
        expect(Object.keys(result.columnMetadata)).toEqual([
            "Stock Item[Stock Item]",
            "Stock Item[Lead Time Priority Tier]",
            "[Suggested Reorder Qty]",
            "[Demand Trend]",
            "[At Risk Rank]",
        ]);
    });

    it("caps y-axis label width so long WWI item names truncate with an ellipsis instead of crowding the chart", () => {
        // Narrowed back from 420 to 220 (2026-08-19, user feedback): at full width, long real WWI
        // names were eating most of the plot area, leaving every bar looking the same length.
        // Ellipsis-truncated labels rely on the tooltip encoding (added same change) for the full
        // name and other fields on hover.
        expect(result.vegaLiteSpec.encoding.y.axis.labelLimit).toBe(220);
    });

    it("omits the redundant y-axis title (item names are self-explanatory as a ranked list)", () => {
        expect(result.vegaLiteSpec.encoding.y.title).toBeNull();
    });

    it("provides a rich tooltip with item, tier, qty, trend, and rank", () => {
        const tooltipFields = result.vegaLiteSpec.encoding.tooltip.map((t: { field: string }) => t.field);
        expect(tooltipFields).toEqual([
            "StockItem",
            "LeadTimePriorityTier",
            "SuggestedReorderQty",
            "DemandTrend",
            "AtRiskRank",
        ]);
    });

    it("colors the ranked bar chart by Lead Time Priority Tier", () => {
        expect(result.vegaLiteSpec.encoding.color.field).toBe("LeadTimePriorityTier");
    });

    it("pins the color domain to the real Short/Medium/Long Lead Time values, not Vega-Lite's alphabetical default", () => {
        // Regression: without an explicit domain, Vega-Lite alphabetizes nominal
        // domains (Long, Medium, Short), which inverted the severity color mapping —
        // "Long" (highest risk) rendered green instead of red. See top-at-risk-list.tsx.
        // Domain values are the real Stock Item[Lead Time Priority Tier] strings
        // ("Short Lead Time" etc, verified live against the semantic model) — an
        // earlier version of this domain used bare "Short"/"Medium"/"Long", which
        // never matched any real row and silently disabled the color mapping.
        expect(result.vegaLiteSpec.encoding.color.scale.domain).toEqual([
            "Short Lead Time",
            "Medium Lead Time",
            "Long Lead Time",
        ]);
    });

    it("applies no tier filter for 'All'", () => {
        expect(result.query).not.toContain("FILTER(ALL('Stock Item'[Lead Time Priority Tier])");
    });

    // Regression: this chart used to fetch one global TOPN(25) and filter/slice
    // it client-side by tier. On the real data, Medium Lead Time dominates the
    // top of At Risk Rank (Long doesn't appear until rank 27, Short not until
    // rank 43), so a global top-25 silently excluded both — selecting "Short" or
    // "Long" showed an empty chart. Each tier now queries its own top 10.
    it("filters server-side to the selected tier, so a tier can never be silently excluded by the global rank cutoff", () => {
        const filtered = topAtRiskItems("Long Lead Time");
        expect(filtered.query).toContain(
            "FILTER(ALL('Stock Item'[Lead Time Priority Tier]), 'Stock Item'[Lead Time Priority Tier] = \"Long Lead Time\")",
        );
    });
});
