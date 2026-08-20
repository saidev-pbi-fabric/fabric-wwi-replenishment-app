//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { entity, authenticated, uuid, text, date } from "@microsoft/rayfin-core";

/**
 * Append-only audit trail for `ReorderAction` writes — one row per field change, never
 * updated or deleted (SPEC.md Amendment, 2026-08-20). Named `AuditLog`, not `History`, to
 * avoid colliding with the existing `ReorderActionHistory` component, which lists current
 * `ReorderAction` records and lets a user change their status — a different concept from this
 * immutable change log. Written from two sites: `reorder-action-form.tsx` on create, and
 * `reorder-action-history.tsx` on status update.
 */
@entity()
@authenticated()
export class ReorderActionAuditLog {
    @uuid() id!: string;
    @uuid() reorderActionId!: string;
    @text({ max: 100 }) fieldName!: string;
    @text({ max: 500, optional: true }) oldValue?: string;
    @text({ max: 500, optional: true }) newValue?: string;
    @date() changedAt!: Date;
    @text({ max: 200 }) changedBy!: string;
}
