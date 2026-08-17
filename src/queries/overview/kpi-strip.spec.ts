//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { kpiStrip } from "./kpi-strip";

describe("kpiStrip", () => {
    const result = kpiStrip();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("queries all four KPI measures", () => {
        expect(result.query).toContain("Items Tracked");
        expect(result.query).toContain("Avg Lead Time Days");
        expect(result.query).toContain("Top At Risk Items");
        expect(result.query).toContain("Accelerating Demand Items");
    });

    it("maps every DAX result column to friendly metadata", () => {
        expect(Object.keys(result.columnMetadata)).toEqual([
            "[Items Tracked]",
            "[Avg Lead Time Days]",
            "[Top At Risk Items]",
            "[Accelerating Demand Items]",
        ]);
    });
});
