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
        { name: "[Top At Risk Items]", dataType: "Int64" },
        { name: "[Accelerating Demand Items]", dataType: "Int64" },
    ],
    rows: [[672, 12.3, 20, 15]],
};

export const SALES_TREND_FIXTURE: QueryTable = {
    columns: [
        { name: "Date[Date]", dataType: "DateTime" },
        { name: "[Total Quantity]", dataType: "Int64" },
    ],
    rows: [
        ["2000-11-01", 48210],
        ["2000-11-05", 51330],
        ["2000-11-09", 46980],
        ["2000-11-13", 55120],
        ["2000-11-17", 52870],
        ["2000-11-21", 61040],
        ["2000-11-25", 58390],
        ["2000-11-30", 63510],
    ],
};

export const TOP_AT_RISK_ITEMS_FIXTURE: QueryTable = {
    columns: [
        { name: "Stock Item[Stock Item]", dataType: "String" },
        { name: "Stock Item[Lead Time Priority Tier]", dataType: "String" },
        { name: "[Suggested Reorder Qty]", dataType: "Double" },
        { name: "[Demand Trend]", dataType: "Double" },
        { name: "[At Risk Rank]", dataType: "Int64" },
    ],
    rows: [
        ["Shipping carton (Brown) 413x285x187mm", "Long", 1840, 0.34, 1],
        ["Bubble wrap 500mm x 10m", "Long", 1620, 0.28, 2],
        ["Packing tape 48mm x 100m clear", "Medium", 1310, 0.22, 3],
        ["Corrugated void fill 1m3 bag", "Medium", 1105, 0.19, 4],
        ["Pallet wrap 500mm x 300m", "Short", 940, 0.15, 5],
        ["Address label roll 100x150mm", "Short", 780, 0.11, 6],
        ["Courier satchel 375x480mm", "Medium", 705, 0.09, 7],
        ["Foam corner protector 4-pack", "Long", 640, 0.07, 8],
    ],
};
