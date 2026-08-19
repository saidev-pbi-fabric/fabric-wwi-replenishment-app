//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { topContributorsDrill } from "./top-contributors-drill";

describe("topContributorsDrill", () => {
    const result = topContributorsDrill();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("caps to the top 10 by Reorder Value, within the same top-20-at-risk-rank set the KPI tile sums", () => {
        expect(result.query).toContain("TOPN(\n    10,");
        expect(result.query).toContain("[At Risk Rank] <= 20");
        expect(result.query).toContain("[Reorder Value], DESC");
    });

    // Must match kpi-strip.dax's "At Risk Reorder Value" = SUMX(FILTER(ALL('Stock Item'),
    // [At Risk Rank] <= 20), [Suggested Reorder Qty] * 'Stock Item'[Unit Price]) exactly — the
    // per-row Reorder Value here has to be the same formula, or the drill-through rows wouldn't
    // actually sum to the tile's total.
    it("computes Reorder Value the same way the KPI tile's total is computed", () => {
        expect(result.query).toContain("[Suggested Reorder Qty] * 'Stock Item'[Unit Price]");
    });

    it("includes the full column set for a proper drill-through table", () => {
        expect(Object.keys(result.columnMetadata)).toEqual([
            "Stock Item[Stock Item]",
            "Stock Item[Lead Time Priority Tier]",
            "[Unit Price]",
            "[Suggested Reorder Qty]",
            "[Reorder Value]",
            "[At Risk Rank]",
        ]);
    });
});
