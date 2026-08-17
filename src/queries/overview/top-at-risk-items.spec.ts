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

    it("colors the ranked bar chart by Lead Time Priority Tier", () => {
        expect(result.vegaLiteSpec.encoding.color.field).toBe("LeadTimePriorityTier");
    });
});
