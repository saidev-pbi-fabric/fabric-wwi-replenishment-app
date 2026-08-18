//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useState } from "react";
import { getRayfinClient, REORDER_ACTION_STATUSES, type ReorderActionRecord } from "@/lib/rayfin-client";

interface ReorderActionHistoryProps {
    stockItemKey: number;
    /** Bump to force a re-fetch, e.g. after a new action is created. */
    refreshKey: number;
}

export function ReorderActionHistory({ stockItemKey, refreshKey }: ReorderActionHistoryProps) {
    const [actions, setActions] = useState<ReorderActionRecord[] | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/dep-change
        setStatus("loading");
        getRayfinClient()
            .data.ReorderAction.findMany({ stockItemKey })
            .then((rows) => {
                if (cancelled) return;
                setActions(rows);
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

    async function handleStatusChange(id: string, nextStatus: ReorderActionRecord["status"]) {
        setUpdatingId(id);
        setUpdateError(null);
        try {
            const updated = await getRayfinClient().data.ReorderAction.update({ id }, { status: nextStatus });
            setActions((prev) => prev?.map((a) => (a.id === id ? updated : a)) ?? prev);
        } catch (err) {
            setUpdateError(err instanceof Error ? err.message : String(err));
        } finally {
            setUpdatingId(null);
        }
    }

    if (status === "error") {
        return (
            <div
                role="alert"
                className="rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load reorder actions: {loadError}
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div
                data-testid="reorder-history-loading"
                className="h-[120px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    if (!actions || actions.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card px-400 py-300 text-300 text-muted-foreground">
                No reorder actions recorded yet for this item.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-200 rounded-lg border border-border bg-card p-400 shadow-sm">
            <h3 className="font-heading text-400 font-semibold text-foreground">Reorder Action History</h3>
            {updateError ? (
                <p role="alert" className="font-base text-300 text-destructive">
                    Couldn't update status: {updateError}
                </p>
            ) : null}
            <ul className="flex flex-col gap-200">
                {actions.map((action) => (
                    <li
                        key={action.id}
                        className="flex items-center justify-between gap-300 border-b border-border pb-200 last:border-b-0 last:pb-0"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="font-base text-200 text-muted-foreground">
                                {new Date(action.createdAt).toLocaleString()} · Qty {action.suggestedReorderQty}
                                {action.assignedTo ? (
                                    <>
                                        {" · "}
                                        <span>{action.assignedTo}</span>
                                    </>
                                ) : null}
                            </p>
                        </div>
                        <label className="flex items-center gap-100">
                            <span className="sr-only">Status for {action.id}</span>
                            <select
                                aria-label={`Status for ${action.id}`}
                                value={action.status}
                                disabled={updatingId === action.id}
                                onChange={(e) =>
                                    handleStatusChange(action.id, e.target.value as ReorderActionRecord["status"])
                                }
                                className="rounded-md border border-border bg-background px-200 py-100-nudge text-200 text-foreground"
                            >
                                {REORDER_ACTION_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    );
}
