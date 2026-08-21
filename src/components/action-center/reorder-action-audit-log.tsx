//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { getRayfinClient, type ReorderActionAuditLogRecord } from "@/lib/rayfin-client";

interface ReorderActionAuditLogPanelProps {
    stockItemKey: number;
    /** Bump to force a re-fetch, e.g. after a new action is created or its status changes. */
    refreshKey: number;
}

/**
 * Reverse-chronological, append-only change log for every `ReorderAction` belonging to this
 * stock item (SPEC.md Amendment, 2026-08-20). Self-fetches by `stockItemKey` rather than taking
 * a single `reorderActionId` — a stock item can have more than one `ReorderAction` record (see
 * `ReorderActionHistory`, which already lists them), so this spans all of them, same scope as
 * that sibling component. Complementary to it, not a replacement: that one shows current-state
 * records with a status editor; this one shows the immutable log of what changed and when.
 */
export function ReorderActionAuditLogPanel({ stockItemKey, refreshKey }: ReorderActionAuditLogPanelProps) {
    const [entries, setEntries] = useState<ReorderActionAuditLogRecord[] | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/dep-change
        setStatus("loading");

        getRayfinClient()
            .data.ReorderAction.findMany({ stockItemKey })
            .then((actions) => {
                if (cancelled) return Promise.resolve([]);
                return Promise.all(
                    actions.map((action) => getRayfinClient().data.ReorderActionAuditLog.findMany({ reorderActionId: action.id })),
                );
            })
            .then((groups) => {
                if (cancelled) return;
                const merged = groups
                    .flat()
                    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
                setEntries(merged);
                setStatus("ready");
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setLoadError(err instanceof Error ? err.message : String(err));
                setStatus("error");
            });

        return () => {
            cancelled = true;
        };
    }, [stockItemKey, refreshKey]);

    if (status === "error") {
        return (
            <div
                role="alert"
                className="rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load the audit log: {loadError}
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div
                data-testid="audit-log-loading"
                className="h-[100px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    if (!entries || entries.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card px-400 py-300 text-300 text-muted-foreground">
                No changes recorded yet for this item.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-200 rounded-lg border border-border bg-card p-400 shadow-sm">
            <h3 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                <ScrollText className="icon-size-300 text-muted-foreground" />
                Audit Trail
            </h3>
            <p className="font-base text-200 text-muted-foreground">
                Every change to this item's reorder actions, append-only
            </p>
            <ul className="flex flex-col">
                {entries.map((entry) => (
                    <li key={entry.id} className="flex gap-200 border-b border-border py-200 text-100 last:border-b-0">
                        <span className="w-[92px] shrink-0 font-numeric text-100 text-muted-foreground">
                            {new Date(entry.changedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                        <div className="min-w-0">
                            <p className="font-base text-100 text-foreground">
                                {entry.fieldName === "created" ? (
                                    <span>created</span>
                                ) : (
                                    <>
                                        <span className="text-muted-foreground">{entry.fieldName}:</span>{" "}
                                        <span className="text-muted-foreground line-through">{entry.oldValue}</span>{" "}
                                        &rarr; <span className="font-semibold">{entry.newValue}</span>
                                    </>
                                )}
                            </p>
                            <p className="font-base text-100 text-muted-foreground">{entry.changedBy}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
