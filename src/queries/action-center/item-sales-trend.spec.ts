//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { itemSalesTrend } from "./item-sales-trend";

describe("itemSalesTrend", () => {
    it("targets the wwiRetail connection", () => {
        expect(itemSalesTrend(43).connection).toBe("wwiRetail");
    });

    it("substitutes the stock item key into the filter", () => {
        const result = itemSalesTrend(43);
        expect(result.query).toContain("'Sale'[Stock Item Key] = 43");
        expect(result.query).not.toContain("{{STOCK_ITEM_KEY}}");
    });

    it("rejects non-integer keys", () => {
        expect(() => itemSalesTrend(1.5)).toThrow(/must be an integer/);
        expect(() => itemSalesTrend(Number.NaN)).toThrow(/must be an integer/);
    });

    it("bounds the window to Max Sale Date, not TODAY()", () => {
        const result = itemSalesTrend(43);
        expect(result.query).toContain("[Max Sale Date]");
        expect(result.query).not.toContain("TODAY()");
    });

    it("maps every DAX result column to friendly metadata", () => {
        const result = itemSalesTrend(43);
        expect(Object.keys(result.columnMetadata)).toEqual(["Date[Date]", "[Quantity]"]);
    });
});
