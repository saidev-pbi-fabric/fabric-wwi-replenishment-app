//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { motion } from "framer-motion";
import { PackagePlus } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { itemDetail } from "@/queries/action-center/item-detail";
import { useAuth } from "@/hooks/auth.context";
import { getRayfinClient, REORDER_ACTION_STATUSES, type ReorderActionRecord } from "@/lib/rayfin-client";
import { scalarByColumnName } from "@/lib/to-data-table";
import { ITEM_DETAIL_FIXTURE } from "@/lib/dev-preview-fixtures";

interface ReorderActionFormProps {
    stockItemKey: number;
    stockItemName: string;
    /** Called after a successful create, so a sibling history list can refetch. */
    onSubmitted?: () => void;
}

export function ReorderActionForm({ stockItemKey, stockItemName, onSubmitted }: ReorderActionFormProps) {
    const panel = useQueryPanel(itemDetail(stockItemKey));

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load item detail for the reorder form: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && (panel.status === "loading" || panel.status === "empty")) {
        return (
            <div
                data-testid="reorder-form-loading"
                className="h-[240px] animate-pulse rounded-lg border border-border bg-card"
            />
        );
    }

    const table = usingDevFixture
        ? {
              columns: ITEM_DETAIL_FIXTURE.columns,
              rows: [
                  ITEM_DETAIL_FIXTURE.rows.find((row) => row[0] === stockItemKey) ??
                      ITEM_DETAIL_FIXTURE.rows[0],
              ],
          }
        : panel.status === "ready"
          ? panel.table
          : undefined;
    if (!table) return null;

    const defaultSuggestedReorderQty = Number(scalarByColumnName(table, "[Suggested Reorder Qty]") ?? 0);

    return (
        <div className="flex flex-col gap-200">
            {usingDevFixture ? (
                <p className="text-200 text-muted-foreground">Sample data · dev preview (no Fabric embed)</p>
            ) : null}
            {/* key forces a full remount on item change, resetting the uncontrolled
                submit/field state below rather than carrying it over from the
                previously selected item. */}
            <ReorderActionFormFields
                key={stockItemKey}
                stockItemKey={stockItemKey}
                stockItemName={stockItemName}
                defaultSuggestedReorderQty={defaultSuggestedReorderQty}
                onSubmitted={onSubmitted}
            />
        </div>
    );
}

interface ReorderActionFormFieldsProps {
    stockItemKey: number;
    stockItemName: string;
    defaultSuggestedReorderQty: number;
    onSubmitted?: () => void;
}

function ReorderActionFormFields({
    stockItemKey,
    stockItemName,
    defaultSuggestedReorderQty,
    onSubmitted,
}: ReorderActionFormFieldsProps) {
    const { session } = useAuth();
    const [suggestedReorderQty, setSuggestedReorderQty] = useState(defaultSuggestedReorderQty);
    const [currentStockOnHand, setCurrentStockOnHand] = useState(0);
    const [status, setStatus] = useState<ReorderActionRecord["status"]>("Pending Review");
    const [note, setNote] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setSubmitState("submitting");
        setSubmitError(null);
        try {
            await getRayfinClient().data.ReorderAction.create({
                stockItemKey,
                stockItemName,
                currentStockOnHand,
                suggestedReorderQty,
                status,
                note: note || undefined,
                assignedTo: assignedTo || undefined,
                createdAt: new Date().toISOString(),
                createdBy: session?.user?.email ?? "unknown",
            });
            setSubmitState("success");
            onSubmitted?.();
        } catch (err) {
            setSubmitState("error");
            setSubmitError(err instanceof Error ? err.message : String(err));
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-300 rounded-lg border border-border bg-card p-400 shadow-sm">
            <h3 className="flex items-center gap-200 font-heading text-400 font-semibold text-foreground">
                <PackagePlus className="icon-size-300 text-muted-foreground" />
                Record a Reorder Action
            </h3>

            <div className="grid grid-cols-2 gap-300">
                <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                    Suggested Reorder Qty
                    <input
                        type="number"
                        value={suggestedReorderQty}
                        onChange={(e) => setSuggestedReorderQty(Number(e.target.value))}
                        className="rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    />
                </label>
                <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                    Current Stock on Hand
                    <input
                        type="number"
                        value={currentStockOnHand}
                        onChange={(e) => setCurrentStockOnHand(Number(e.target.value))}
                        className="rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    />
                </label>
            </div>

            <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                Status
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ReorderActionRecord["status"])}
                    className="rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                >
                    {REORDER_ACTION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                Assigned To
                <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                />
            </label>

            <label className="flex flex-col gap-100 font-base text-200 text-muted-foreground">
                Note
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                />
            </label>

            <motion.button
                type="submit"
                disabled={submitState === "submitting" || submitState === "success"}
                whileHover={submitState === "idle" ? { scale: 1.03 } : undefined}
                whileTap={submitState === "idle" ? { scale: 0.97 } : undefined}
                className="self-start rounded-md bg-primary px-400 py-200 font-base text-300 text-primary-foreground shadow-sm disabled:opacity-50"
            >
                {submitState === "submitting" ? "Submitting…" : "Submit Reorder Action"}
            </motion.button>

            {submitState === "success" ? (
                <p className="font-base text-300 text-on-track">Reorder action recorded.</p>
            ) : null}
            {submitState === "error" ? (
                <p role="alert" className="font-base text-300 text-destructive">
                    Couldn't submit: {submitError}
                </p>
            ) : null}
        </form>
    );
}
