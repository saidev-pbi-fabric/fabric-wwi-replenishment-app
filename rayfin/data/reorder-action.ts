//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { entity, authenticated, uuid, text, int, date, set } from "@microsoft/rayfin-core";

export const REORDER_ACTION_STATUSES = [
    "Pending Review",
    "Approved",
    "Ordered",
    "Received",
    "Dismissed",
] as const;

/**
 * The app's single write-back entity (SPEC.md locked scope — no entity beyond this one
 * without explicit sign-off). Any signed-in Fabric user can read/create/update any row
 * (`@authenticated()` with no row-level policy) — right-sized for a 2-3 person demo;
 * `createdBy`/`assignedTo` are still captured as data so an audit trail exists even though
 * it isn't access-enforced. No delete mutation: `Dismissed` status is the soft-delete.
 */
@entity()
@authenticated()
export class ReorderAction {
    @uuid() id!: string;
    @int() stockItemKey!: number;
    @text({ max: 200 }) stockItemName!: string;
    @int() currentStockOnHand!: number;
    @int() suggestedReorderQty!: number;
    @int({ optional: true }) supplierKey?: number;
    @text({ max: 200, optional: true }) supplierName?: string;
    @set({ enum: [...REORDER_ACTION_STATUSES] }) status!: (typeof REORDER_ACTION_STATUSES)[number];
    @text({ max: 1000, optional: true }) note?: string;
    @text({ max: 200, optional: true }) assignedTo?: string;
    @date() createdAt!: Date;
    @text({ max: 200 }) createdBy!: string;
}
