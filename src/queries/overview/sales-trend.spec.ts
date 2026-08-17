//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { salesTrend } from "./sales-trend";

describe("salesTrend", () => {
    const result = salesTrend();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("groups by Date and sums Total Quantity", () => {
        expect(result.query).toContain("'Date'[Date]");
        expect(result.query).toContain("SUM(Sale[Total Quantity])");
    });

    it("maps Date and Total Quantity columns", () => {
        expect(result.columnMetadata["Date[Date]"]).toEqual({ name: "Date", displayName: "Date" });
        expect(result.columnMetadata["[Total Quantity]"]).toEqual({
            name: "TotalQuantity",
            displayName: "Units Sold",
        });
    });

    it("renders a zero-based, unsmoothed line chart per the line-chart guidance", () => {
        expect(result.vegaLiteSpec.mark).toEqual({ type: "line", point: false, interpolate: "linear" });
        expect(result.vegaLiteSpec.encoding.y.scale).toEqual({ zero: true });
    });
});
