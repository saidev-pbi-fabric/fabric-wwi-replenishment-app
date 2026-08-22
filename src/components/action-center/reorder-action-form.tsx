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
import {
    ASSIGNED_TO_OPTIONS,
    getRayfinClient,
    REORDER_ACTION_STATUSES,
    SUPPLIER_OPTIONS,
    type ReorderActionRecord,
} from "@/lib/rayfin-client";
import { logReorderActionCreated } from "@/lib/reorder-action-audit";
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
    const [supplierName, setSupplierName] = useState(SUPPLIER_OPTIONS[0]);
    const [status, setStatus] = useState<ReorderActionRecord["status"]>("Pending Review");
    const [note, setNote] = useState("");
    const [assignedTo, setAssignedTo] = useState(session?.user?.email ?? ASSIGNED_TO_OPTIONS[0].email);
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!Number.isInteger(suggestedReorderQty) || suggestedReorderQty < 0) {
            setSubmitState("error");
            setSubmitError("Quantity must be a whole number of 0 or more.");
            return;
        }
        setSubmitState("submitting");
        setSubmitError(null);
        try {
            const createdBy = session?.user?.email ?? "unknown";
            const created = await getRayfinClient().data.ReorderAction.create({
                stockItemKey,
                stockItemName,
                // No stock-on-hand figure exists anywhere in this dataset (see the item detail
                // panel's own disclosure) -- there's nothing honest to ask the user for here, so
                // this stays a fixed 0 rather than a form field. currentStockOnHand is still a
                // required (non-nullable) column on the locked ReorderAction entity.
                currentStockOnHand: 0,
                suggestedReorderQty,
                supplierName,
                status,
                note: note || undefined,
                assignedTo,
                createdAt: new Date().toISOString(),
                createdBy,
            });
            void logReorderActionCreated(created.id, createdBy);
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
                Log Reorder Action
            </h3>

            <div className="grid grid-cols-2 gap-300">
                <FormField label="Quantity">
                    <input
                        type="number"
                        min={0}
                        step={1}
                        required
                        value={suggestedReorderQty}
                        onChange={(e) => setSuggestedReorderQty(Number(e.target.value))}
                        className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    />
                </FormField>
                <FormField label="Supplier">
                    <select
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    >
                        {SUPPLIER_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            <div className="grid grid-cols-2 gap-300">
                <FormField label="Status">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ReorderActionRecord["status"])}
                        className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    >
                        {REORDER_ACTION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Assigned To">
                    <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                    >
                        {ASSIGNED_TO_OPTIONS.map((a) => (
                            <option key={a.email} value={a.email}>
                                {a.name}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>

            <FormField label="Note">
                <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-200 py-100-nudge text-300 text-foreground"
                />
            </FormField>

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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-100">
            <span className="font-base text-100 uppercase tracking-wide text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}
