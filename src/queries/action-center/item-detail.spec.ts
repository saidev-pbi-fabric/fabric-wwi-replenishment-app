//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { itemDetail } from "./item-detail";

describe("itemDetail", () => {
    it("targets the wwiRetailRebuild connection (rebuild/pareto-thesis branch only)", () => {
        expect(itemDetail(43).connection).toBe("wwiRetailRebuild");
    });

    it("substitutes the stock item key into the filter", () => {
        const result = itemDetail(43);
        expect(result.query).toContain("'Stock Item'[Stock Item Key] = 43");
        expect(result.query).not.toContain("{{STOCK_ITEM_KEY}}");
    });

    it("rejects non-integer keys", () => {
        expect(() => itemDetail(1.5)).toThrow(/must be an integer/);
        expect(() => itemDetail(Number.NaN)).toThrow(/must be an integer/);
    });

    it("maps every DAX result column to friendly metadata", () => {
        const result = itemDetail(43);
        expect(Object.keys(result.columnMetadata)).toEqual([
            "Stock Item[Stock Item Key]",
            "Stock Item[Stock Item]",
            "Stock Item[Brand]",
            "Stock Item[Color]",
            "Stock Item[Lead Time Days]",
            "Stock Item[Lead Time Priority Tier]",
            "Stock Item[Unit Price]",
            "Stock Item[Recommended Retail Price]",
            "[Recent Daily Sales Rate]",
            "[Demand Trend]",
            "[Suggested Reorder Qty]",
            "[At Risk Rank]",
        ]);
    });
});
