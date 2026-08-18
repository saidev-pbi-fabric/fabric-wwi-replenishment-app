//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

/**
 * Maps `Stock Item[Lead Time Priority Tier]` values to the severity-rail
 * Tailwind class from the locked severity scale (see global.css).
 */
export const LEAD_TIME_RAIL_CLASS: Record<string, string> = {
    Long: "border-l-critical",
    Medium: "border-l-at-risk",
    Short: "border-l-on-track",
};
