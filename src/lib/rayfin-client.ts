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

/**
 * Frontend-facing mirror of `rayfin/data/reorder-action-audit-log.ts`'s `ReorderActionAuditLog`
 * entity — append-only change log, one row per field change on a `ReorderAction`. Named
 * `AuditLog`, not `History`, to avoid colliding with `ReorderActionRecord`/the existing
 * `ReorderActionHistory` component, which is a different concept (current records + a status
 * editor, not an immutable log).
 */
export interface ReorderActionAuditLogRecord {
    id: string;
    reorderActionId: string;
    fieldName: string;
    oldValue?: string;
    newValue?: string;
    changedAt: string;
    changedBy: string;
}

export interface AppDataSchema {
    ReorderAction: ReorderActionRecord;
    ReorderActionAuditLog: ReorderActionAuditLogRecord;
}

export const REORDER_ACTION_STATUSES: ReorderActionRecord["status"][] = [
    "Pending Review",
    "Approved",
    "Ordered",
    "Received",
    "Dismissed",
];

/**
 * Fixed list of everyone with access to the Fabric workspace (live-verified via
 * `az rest .../roleAssignments` against the Fabric REST API, 2026-08-21 -- not guessed), used
 * for the Reorder Action form's "Assigned To" dropdown instead of free text.
 */
export const ASSIGNED_TO_OPTIONS: { email: string; name: string }[] = [
    { email: "sai@r4k5.onmicrosoft.com", name: "Sai Dev" },
    { email: "adh@r4k5.onmicrosoft.com", name: "Santosh Pothnak" },
    { email: "bharath@r4k5.onmicrosoft.com", name: "Bharath Thodupunuri" },
    { email: "lahari@r4k5.onmicrosoft.com", name: "Lahari Reddy" },
];

/**
 * Fixed illustrative supplier list for the "Supplier" dropdown. This dataset's loaded WWI
 * sample has no Dimension.Supplier table (see docs/wwi-schema-reference.md) -- there's no real
 * supplier data to draw from, so this is deliberately superficial, same spirit as the fixed
 * REORDER_ACTION_STATUSES enum, not a claim of real sourcing data.
 */
export const SUPPLIER_OPTIONS: string[] = [
    "Contoso Wholesale",
    "Fabrikam Distribution",
    "Northwind Traders",
    "Tailwind Supply Co.",
    "Wide World Suppliers",
];

/**
 * Explicit field list for `.select()` on ReorderAction queries. The Rayfin SDK's
 * `findMany()` builds a GraphQL query with no field selection at all when `.select()` isn't
 * called, defaulting to `id` only -- every other field silently comes back `undefined` (this
 * was the real cause of "Unknown date"/blank Qty in Reorder Actions, not a date-format issue).
 * Always select explicitly instead of using the bare `findMany()` shorthand.
 */
export const REORDER_ACTION_FIELDS: (keyof ReorderActionRecord)[] = [
    "id",
    "stockItemKey",
    "stockItemName",
    "currentStockOnHand",
    "suggestedReorderQty",
    "supplierKey",
    "supplierName",
    "status",
    "note",
    "assignedTo",
    "createdAt",
    "createdBy",
];

/** Same reasoning as REORDER_ACTION_FIELDS, for the audit log entity. */
export const REORDER_ACTION_AUDIT_LOG_FIELDS: (keyof ReorderActionAuditLogRecord)[] = [
    "id",
    "reorderActionId",
    "fieldName",
    "oldValue",
    "newValue",
    "changedAt",
    "changedBy",
];

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