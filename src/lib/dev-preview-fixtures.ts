//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { QueryTable } from "@microsoft/fabric-app-data";

/**
 * Canned data shaped exactly like each Page 1 query's real result, so
 * `npm run dev` can render the success state (tiles, chart, ranked bars)
 * without a Fabric embed. Only ever read behind `import.meta.env.DEV` —
 * statically false in the production build, so this never ships.
 *
 * Values are illustrative, not derived from the live semantic model.
 */

export const KPI_STRIP_FIXTURE: QueryTable = {
    columns: [
        { name: "[Items Tracked]", dataType: "Int64" },
        { name: "[Avg Lead Time Days]", dataType: "Double" },
        { name: "[Accelerating Demand Items]", dataType: "Int64" },
    ],
    rows: [[672, 12.3, 164]],
};

// Shaped like the real pareto-reorder-risk.dax result (live-verified 2026-08-20 against the
// rebuild SM — real data puts 80% cumulative value at rank 109 of 672). This fixture is a short
// illustrative slice, not the full 672 rows, but keeps the same monotonic-cumulative shape so the
// slider/chart/table read correctly in dev preview.
export const PARETO_REORDER_RISK_FIXTURE: QueryTable = {
    columns: [
        { name: "Stock Item[Stock Item Key]", dataType: "Int64" },
        { name: "Stock Item[Stock Item]", dataType: "String" },
        { name: "Stock Item[Lead Time Priority Tier]", dataType: "String" },
        { name: "[Reorder Value]", dataType: "Double" },
        { name: "[Value Share %]", dataType: "Double" },
        { name: "[Cumulative Value %]", dataType: "Double" },
        { name: "[At Risk Rank]", dataType: "Int64" },
    ],
    rows: [
        [43, "Shipping carton (Brown) 413x285x187mm", "Medium Lead Time", 3241644, 0.0019, 0.0019, 1],
        [32, "3 kg Courier post bag (White) 300x190x95mm", "Medium Lead Time", 1510925, 0.0009, 0.0028, 2],
        [20, "Black and yellow heavy despatch tape 48mmx100m", "Medium Lead Time", 9232786, 0.0054, 0.0081, 3],
        [29, "Black and orange fragile despatch tape 48mmx75m", "Medium Lead Time", 8163347, 0.0048, 0.0129, 4],
        [35, "Shipping carton (Brown) 356x356x279mm", "Medium Lead Time", 4444164, 0.0026, 0.0155, 5],
        [19, "Red and white urgent despatch tape 48mmx75m", "Medium Lead Time", 7327917, 0.0043, 0.0198, 6],
        [23, "Black and orange this way up despatch tape 48mmx75m", "Medium Lead Time", 7270633, 0.0042, 0.0240, 7],
        [41, "Shipping carton (Brown) 229x229x229mm", "Medium Lead Time", 2036244, 0.0012, 0.0252, 8],
        [24, "Black and orange handle with care despatch tape 48mmx100m", "Medium Lead Time", 7915579, 0.0046, 0.0298, 9],
        [28, "Black and orange fragile despatch tape 48mmx100m", "Medium Lead Time", 7855625, 0.0046, 0.0344, 10],
        [61, "Bubble wrap 500mm x 10m", "Long Lead Time", 1620000, 0.0009, 0.0353, 11],
        [77, "Pallet wrap 500mm x 300m", "Short Lead Time", 940000, 0.0005, 0.0359, 12],
        [88, "Address label roll 100x150mm", "Short Lead Time", 780000, 0.0005, 0.0363, 13],
        [102, "Foam corner protector 4-pack", "Long Lead Time", 640000, 0.0004, 0.0367, 14],
        [115, "Courier satchel 375x480mm", "Medium Lead Time", 705000, 0.0004, 0.0371, 15],
    ],
};

// 61 days, mild upward drift + noise — illustrative shape for local dev preview only, not
// derived from the live model (see item-sales-trend.ts for the real query).
export const ITEM_SALES_TREND_FIXTURE: QueryTable = {
    columns: [
        { name: "Date[Date]", dataType: "DateTime" },
        { name: "[Quantity]", dataType: "Int64" },
    ],
    rows: Array.from({ length: 61 }, (_, i) => {
        const date = new Date(2000, 8, 1 + i);
        const quantity = Math.round(60 + i * 0.6 + Math.sin(i / 3) * 8);
        return [date.toISOString().slice(0, 10), quantity];
    }),
};

// Keyed by Stock Item Key, matching PARETO_REORDER_RISK_FIXTURE's rows one-for-one so the
// dev-preview Action Center detail panel reflects whichever row was actually clicked in the
// ranked list (both panels now share the one Pareto dataset), instead of always showing the
// same canned item regardless of selection.
export const ITEM_DETAIL_FIXTURE: QueryTable = {
    columns: [
        { name: "Stock Item[Stock Item Key]", dataType: "Int64" },
        { name: "Stock Item[Stock Item]", dataType: "String" },
        { name: "Stock Item[Brand]", dataType: "String" },
        { name: "Stock Item[Color]", dataType: "String" },
        { name: "Stock Item[Lead Time Days]", dataType: "Int64" },
        { name: "Stock Item[Lead Time Priority Tier]", dataType: "String" },
        { name: "Stock Item[Unit Price]", dataType: "Double" },
        { name: "Stock Item[Recommended Retail Price]", dataType: "Double" },
        { name: "[Recent Daily Sales Rate]", dataType: "Double" },
        { name: "[Demand Trend]", dataType: "Double" },
        { name: "[Suggested Reorder Qty]", dataType: "Double" },
        { name: "[At Risk Rank]", dataType: "Int64" },
    ],
    rows: [
        [43, "Shipping carton (Brown) 413x285x187mm", "Contoso", "Brown", 14, "Medium Lead Time", 1.05, 1.65, 183766.7, 0.18, 3087280, 1],
        [32, "3 kg Courier post bag (White) 300x190x95mm", "Fabrikam", "White", 9, "Medium Lead Time", 0.42, 0.7, 96811.0, 0.09, 1435200, 2],
        [20, "Black and yellow heavy despatch tape 48mmx100m", "Northwind", "N/A", 12, "Medium Lead Time", 2.18, 3.4, 143120.5, 0.22, 2119400, 3],
        [29, "Black and orange fragile despatch tape 48mmx75m", "Northwind", "N/A", 12, "Medium Lead Time", 2.02, 3.15, 129400.2, 0.16, 1907300, 4],
        [35, "Shipping carton (Brown) 356x356x279mm", "Contoso", "Brown", 14, "Medium Lead Time", 1.38, 2.1, 91410.4, 0.11, 1252600, 5],
        [19, "Red and white urgent despatch tape 48mmx75m", "Northwind", "N/A", 12, "Medium Lead Time", 1.95, 3.05, 118920.7, 0.14, 1758100, 6],
        [23, "Black and orange this way up despatch tape 48mmx75m", "Northwind", "N/A", 12, "Medium Lead Time", 1.9, 2.95, 117600.3, 0.05, 1747200, 7],
        [41, "Shipping carton (Brown) 229x229x229mm", "Contoso", "Brown", 14, "Medium Lead Time", 0.85, 1.35, 46200.9, 0.03, 636800, 8],
        [24, "Black and orange handle with care despatch tape 48mmx100m", "Northwind", "N/A", 12, "Medium Lead Time", 2.05, 3.2, 127800.6, -0.02, 1899600, 9],
        [28, "Black and orange fragile despatch tape 48mmx100m", "Northwind", "N/A", 12, "Medium Lead Time", 2.03, 3.18, 126500.1, 0.02, 1885300, 10],
        [61, "Bubble wrap 500mm x 10m", "Contoso", "Clear", 16, "Long Lead Time", 3.1, 4.9, 26800.0, -0.05, 415900, 11],
        [77, "Pallet wrap 500mm x 300m", "Contoso", "Clear", 6, "Short Lead Time", 2.1, 3.4, 14920.6, 0.04, 224500, 12],
        [88, "Address label roll 100x150mm", "Fabrikam", "White", 5, "Short Lead Time", 0.6, 1.1, 41200.3, 0.07, 156200, 13],
        [102, "Foam corner protector 4-pack", "Northwind", "Grey", 15, "Long Lead Time", 2.7, 4.1, 13800.5, -0.03, 206700, 14],
        [115, "Courier satchel 375x480mm", "Fabrikam", "White", 9, "Medium Lead Time", 1.2, 2.0, 24900.8, 0.06, 195400, 15],
    ],
};
