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
