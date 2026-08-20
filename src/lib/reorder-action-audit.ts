//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { getRayfinClient } from "@/lib/rayfin-client";

/**
 * Writes one `ReorderActionAuditLog` row. Called from two sites: `reorder-action-form.tsx` on
 * create, `reorder-action-history.tsx` on status update (SPEC.md Amendment, 2026-08-20).
 * Deliberately swallows its own errors — a failed audit-log write shouldn't block or roll back
 * the real `ReorderAction` create/update it's tracking, same "don't surface a supplementary
 * fetch/write as a panel-level error" pattern already used for per-row sparklines.
 */
async function logAuditEntry(entry: {
    reorderActionId: string;
    fieldName: string;
    oldValue?: string;
    newValue?: string;
    changedBy: string;
}) {
    try {
        await getRayfinClient().data.ReorderActionAuditLog.create({
            ...entry,
            changedAt: new Date().toISOString(),
        });
    } catch {
        // Supplementary tracking only — see doc comment above.
    }
}

export function logReorderActionCreated(reorderActionId: string, changedBy: string) {
    return logAuditEntry({ reorderActionId, fieldName: "created", changedBy });
}

export function logReorderActionFieldChange(
    reorderActionId: string,
    fieldName: string,
    oldValue: string,
    newValue: string,
    changedBy: string,
) {
    return logAuditEntry({ reorderActionId, fieldName, oldValue, newValue, changedBy });
}
