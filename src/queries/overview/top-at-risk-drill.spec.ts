//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { topAtRiskDrill } from "./top-at-risk-drill";

describe("topAtRiskDrill", () => {
    const result = topAtRiskDrill();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    // Must match kpi-strip.dax's "Top At Risk Items" = COUNTROWS(FILTER(ALL('Stock Item'),
    // [At Risk Rank] <= 20)) exactly — this is the drill-through target for that KPI tile, so
    // TOPN(20) has to be the same 20 rows the tile's count describes, not an arbitrary window.
    it("caps to the same top 20 by At Risk Rank the KPI tile counts", () => {
        expect(result.query).toContain("TOPN(\n    20,");
        expect(result.query).toContain("[At Risk Rank], ASC");
    });

    it("includes the full column set for a proper drill-through table", () => {
        expect(Object.keys(result.columnMetadata)).toEqual([
            "Stock Item[Stock Item]",
            "Stock Item[Lead Time Priority Tier]",
            "Stock Item[Lead Time Days]",
            "[Suggested Reorder Qty]",
            "[Demand Trend]",
            "[At Risk Rank]",
        ]);
    });
});
