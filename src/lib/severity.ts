//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * ABC value-concentration tier, per the locked mockup (docs/mockup-reference.html,
 * `tierFor`). A = cumulative reorder value share up to 80%, B = up to 95%, C = the
 * remainder. Pure client-side bucketing off a row's own `cumulativeValuePct`, no
 * new DAX measure needed (matches SPEC.md's "No fixed ABC-tier measure is needed
 * on the model side" note). This is the one tier concept used app-wide now — it
 * replaced Lead Time Priority Tier as the filter/color axis on both the Overview
 * Pareto view and the Action Center ranked list and item detail, per the mockup.
 */
export type ValueTier = "A" | "B" | "C";

export function valueTierFor(cumulativeValuePct: number): ValueTier {
    if (cumulativeValuePct <= 0.8) return "A";
    if (cumulativeValuePct <= 0.95) return "B";
    return "C";
}

export const VALUE_TIER_RAIL_CLASS: Record<ValueTier, string> = {
    A: "bg-critical",
    B: "bg-at-risk",
    C: "bg-on-track",
};

export const VALUE_TIER_FILTERS = ["All", "A", "B", "C"] as const;
export type ValueTierFilter = (typeof VALUE_TIER_FILTERS)[number];

export function valueTierFilterLabel(filter: ValueTierFilter): string {
    return filter === "All" ? "All" : `Tier ${filter}`;
}
