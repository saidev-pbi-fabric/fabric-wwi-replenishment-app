//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { rankedAtRiskList } from "./ranked-at-risk-list";

describe("rankedAtRiskList", () => {
    const result = rankedAtRiskList();

    it("targets the wwiRetail connection", () => {
        expect(result.connection).toBe("wwiRetail");
    });

    it("returns every stock item ordered by At Risk Rank, unfiltered", () => {
        expect(result.query).not.toContain("TOPN");
        expect(result.query).toContain("ORDER BY [At Risk Rank] ASC");
    });

    it("includes Lead Time Priority Tier for client-side filtering", () => {
        expect(result.columnMetadata["Stock Item[Lead Time Priority Tier]"]).toEqual({
            name: "LeadTimePriorityTier",
            displayName: "Lead Time",
        });
    });
});
