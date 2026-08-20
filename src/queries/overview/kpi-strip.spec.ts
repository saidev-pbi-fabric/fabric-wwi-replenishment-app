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

    it("targets the wwiRetailRebuild connection (rebuild/pareto-thesis branch only)", () => {
        expect(result.connection).toBe("wwiRetailRebuild");
    });

    it("queries the three DAX-backed KPI measures (the two cutoff-based tiles moved client-side)", () => {
        expect(result.query).toContain("Items Tracked");
        expect(result.query).toContain("Avg Lead Time Days");
        expect(result.query).toContain("Accelerating Demand Items");
        expect(result.query).not.toContain("Top At Risk Items");
        expect(result.query).not.toContain("At Risk Reorder Value");
    });

    it("maps every DAX result column to friendly metadata", () => {
        expect(Object.keys(result.columnMetadata)).toEqual([
            "[Items Tracked]",
            "[Avg Lead Time Days]",
            "[Accelerating Demand Items]",
        ]);
    });
});
