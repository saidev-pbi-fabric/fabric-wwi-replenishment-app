//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { topAtRiskItems } from "./top-at-risk-items";

describe("topAtRiskItems", () => {
    const result = topAtRiskItems();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("ranks the top 25 items by At Risk Rank (superset, filtered/sliced client-side)", () => {
        // Fetches a superset so the page's lead-time filter has rows to filter
        // from; the chart itself still only displays the top 10 after filtering
        // — see TopAtRiskList's client-side slice.
        expect(result.query).toContain("TOPN(\n    25,");
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
        expect(result.vegaLiteSpec.encoding.y.axis.labelLimit).toBe(160);
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
});
