//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { RayfinClient } from "@microsoft/rayfin-client";

/**
 * Frontend-facing mirror of `rayfin/data/reorder-action.ts`'s `ReorderAction` entity.
 * Kept as a plain interface here (not imported from `rayfin/data/`) since that file is
 * server-side, decorated with `@microsoft/rayfin-core` decorators not meant for the client
 * bundle. Field types match the entity's GraphQL wire shape (dates as ISO strings).
 */
export interface ReorderActionRecord {
    id: string;
    stockItemKey: number;
    stockItemName: string;
    currentStockOnHand: number;
    suggestedReorderQty: number;
    supplierKey?: number;
    supplierName?: string;
    status: "Pending Review" | "Approved" | "Ordered" | "Received" | "Dismissed";
    note?: string;
    assignedTo?: string;
    createdAt: string;
    createdBy: string;
}

export interface AppDataSchema {
    ReorderAction: ReorderActionRecord;
}

let _client: RayfinClient<AppDataSchema> | undefined;

/**
 * Returns the pre-configured RayfinClient singleton.
 */
export function getRayfinClient(): RayfinClient<AppDataSchema> {
    if (!_client) {
        const apiUrl = import.meta.env.VITE_RAYFIN_API_URL;
        const publishableKey = import.meta.env.VITE_RAYFIN_PUBLISHABLE_KEY;

        if (!apiUrl || !publishableKey) {
            throw new Error(`Missing required env vars for creating rayfin client - run 'npx rayfin up'`);
        }

        _client = new RayfinClient<AppDataSchema>({
            baseUrl: apiUrl,
            publishableKey,
            authStorage: true,
            useProxy: false,
        });
    }

    return _client;
}