//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Maps `Stock Item[Lead Time Priority Tier]` values to the severity-rail
 * Tailwind class from the locked severity scale (see global.css).
 *
 * Keys are the real values as verified live against the semantic model
 * ("Short Lead Time" / "Medium Lead Time" / "Long Lead Time") — an earlier
 * version used bare "Short"/"Medium"/"Long", which never matched a real row
 * and silently fell back to no rail color at all.
 */
export const LEAD_TIME_RAIL_CLASS: Record<string, string> = {
    "Long Lead Time": "border-l-critical",
    "Medium Lead Time": "border-l-at-risk",
    "Short Lead Time": "border-l-on-track",
};

/**
 * Shared "Filter by lead time" dropdown values, reused by both Page 1's chart
 * and Page 2's ranked list so the two pages offer the same filter axis. Values
 * are the real Stock Item[Lead Time Priority Tier] strings, verified live
 * against the semantic model.
 */
export const TIER_FILTERS = ["All", "Short Lead Time", "Medium Lead Time", "Long Lead Time"] as const;

export function tierFilterLabel(tier: (typeof TIER_FILTERS)[number]): string {
    return tier === "All" ? "All" : tier.replace(" Lead Time", "");
}

/**
 * DAX SUMMARIZECOLUMNS filter-table argument for a lead-time tier, substituted
 * into the `{{TIER_FILTER}}` placeholder in ranked-at-risk-list.dax and
 * top-at-risk-items.dax. Safe to interpolate directly: `tier` only ever comes
 * from the fixed TIER_FILTERS union (a compile-time enum), never free text.
 *
 * This exists because filtering a single globally-ranked TOPN client-side was
 * wrong on the real data: Medium Lead Time items dominate the top of At Risk
 * Rank (582 of 672 stock items are Medium tier), so Long doesn't appear until
 * rank 27 and Short not until rank 43 — a TOPN(25) global cap silently
 * excluded both, making the "Short"/"Long" filter options show zero rows.
 * Each tier now gets its own ranked query instead of a slice of one shared list.
 */
export function tierFilterClause(tier: (typeof TIER_FILTERS)[number]): string {
    if (tier === "All") return "";
    return `,\n        FILTER(ALL('Stock Item'[Lead Time Priority Tier]), 'Stock Item'[Lead Time Priority Tier] = "${tier}")`;
}
