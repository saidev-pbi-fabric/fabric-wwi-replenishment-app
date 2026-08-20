//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { rankedAtRiskList } from "./ranked-at-risk-list";

describe("rankedAtRiskList", () => {
    it("targets the wwiRetailRebuild connection (rebuild/pareto-thesis branch only)", () => {
        expect(rankedAtRiskList("All").connection).toBe("wwiRetailRebuild");
    });

    it("caps to the top 25 at-risk stock items ordered by At Risk Rank", () => {
        const result = rankedAtRiskList("All");
        expect(result.query).toContain("TOPN(\n    25,");
        expect(result.query).toContain("[At Risk Rank], ASC");
        expect(result.query).toContain("ORDER BY [At Risk Rank] ASC");
    });

    it("includes Lead Time Priority Tier in the projected columns", () => {
        expect(rankedAtRiskList("All").columnMetadata["Stock Item[Lead Time Priority Tier]"]).toEqual({
            name: "LeadTimePriorityTier",
            displayName: "Lead Time",
        });
    });

    it("applies no tier filter for 'All'", () => {
        expect(rankedAtRiskList("All").query).not.toContain("FILTER(ALL('Stock Item'[Lead Time Priority Tier])");
    });

    // Regression: the ranked list used to fetch one global TOPN(25) and filter
    // it client-side by tier. On the real data, Medium Lead Time dominates the
    // top of At Risk Rank (Long doesn't appear until rank 27, Short not until
    // rank 43), so a global top-25 silently excluded both — selecting "Short"
    // or "Long" always showed zero rows. Each tier now queries its own ranked
    // top 25, so this can't happen regardless of the tier's rank distribution.
    it("filters server-side to the selected tier, so a tier can never be silently excluded by the global rank cutoff", () => {
        const result = rankedAtRiskList("Short Lead Time");
        expect(result.query).toContain(
            "FILTER(ALL('Stock Item'[Lead Time Priority Tier]), 'Stock Item'[Lead Time Priority Tier] = \"Short Lead Time\")",
        );
    });
});
