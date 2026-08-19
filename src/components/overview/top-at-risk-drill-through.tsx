//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { topAtRiskDrill } from "@/queries/overview/top-at-risk-drill";
import { TOP_AT_RISK_DRILL_FIXTURE } from "@/lib/dev-preview-fixtures";
import { LEAD_TIME_RAIL_CLASS } from "@/lib/severity";
import { cn } from "@/lib/utils";

interface TopAtRiskDrillThroughProps {
    open: boolean;
    onClose: () => void;
}

interface DrillRow {
    name: string;
    tier: string;
    leadTimeDays: number;
    suggestedReorderQty: number;
    demandTrend: number;
    rank: number;
}

function rowsFromTable(table: { columns: { name: string }[]; rows: unknown[][] }): DrillRow[] {
    const idx = (name: string) => table.columns.findIndex((col) => col.name === name);
    const nameIdx = idx("Stock Item[Stock Item]");
    const tierIdx = idx("Stock Item[Lead Time Priority Tier]");
    const leadTimeIdx = idx("Stock Item[Lead Time Days]");
    const qtyIdx = idx("[Suggested Reorder Qty]");
    const trendIdx = idx("[Demand Trend]");
    const rankIdx = idx("[At Risk Rank]");

    return table.rows.map((row) => ({
        name: String(row[nameIdx]),
        tier: String(row[tierIdx]),
        leadTimeDays: Number(row[leadTimeIdx]),
        suggestedReorderQty: Number(row[qtyIdx]),
        demandTrend: Number(row[trendIdx]),
        rank: Number(row[rankIdx]),
    }));
}

export function TopAtRiskDrillThrough({ open, onClose }: TopAtRiskDrillThroughProps) {
    // Skip the query entirely until opened — matches ItemDetailPanel's
    // empty-connection/query "skip" convention (see use-semantic-model-query.ts's canExecute).
    const options = open ? topAtRiskDrill() : { connection: "", query: "" };
    const panel = useQueryPanel(options);

    useEffect(() => {
        if (!open) return;
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    const table = usingDevFixture
        ? TOP_AT_RISK_DRILL_FIXTURE
        : panel.status === "ready" || panel.status === "refreshing"
          ? panel.table
          : undefined;

    const rows = table ? rowsFromTable(table) : [];

    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Top At-Risk Items — full list"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="flex max-h-[80vh] w-full max-w-[900px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-300 border-b border-border p-400">
                            <div>
                                <h2 className="font-heading text-400 font-semibold text-foreground">
                                    Top At-Risk Items
                                </h2>
                                <p className="text-200 text-muted-foreground">
                                    All 20 items ranked in this tile's count, by At Risk Rank.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close"
                                className="flex icon-size-600 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                                <X className="icon-size-300" />
                            </button>
                        </div>

                        {usingDevFixture ? (
                            <p className="px-400 pt-200 text-200 text-muted-foreground">
                                Sample data — dev preview (no Fabric embed)
                            </p>
                        ) : null}

                        {panel.status === "error" && !usingDevFixture ? (
                            <div role="alert" className="p-400 text-300 text-destructive">
                                Couldn't load the full list: {panel.message}
                            </div>
                        ) : panel.status === "loading" && !usingDevFixture ? (
                            <div className="p-400 text-300 text-muted-foreground">Loading…</div>
                        ) : (
                            <div className="overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead className="sticky top-0 bg-card">
                                        <tr className="border-b border-border text-left">
                                            <th className="px-400 py-200 font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Rank
                                            </th>
                                            <th className="px-400 py-200 font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Item
                                            </th>
                                            <th className="px-400 py-200 font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Lead Time
                                            </th>
                                            <th className="px-400 py-200 text-right font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Days
                                            </th>
                                            <th className="px-400 py-200 text-right font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Suggested Reorder Qty
                                            </th>
                                            <th className="px-400 py-200 text-right font-base text-200 uppercase tracking-wide text-muted-foreground">
                                                Demand Trend
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr
                                                key={row.rank}
                                                className={cn(
                                                    "border-b border-l-4 border-border last:border-b-0",
                                                    LEAD_TIME_RAIL_CLASS[row.tier] ?? "border-l-transparent",
                                                )}
                                            >
                                                <td className="px-400 py-200 font-numeric text-200 text-muted-foreground">
                                                    #{row.rank}
                                                </td>
                                                <td className="px-400 py-200 font-base text-300 text-foreground">
                                                    {row.name}
                                                </td>
                                                <td className="px-400 py-200 font-base text-200 text-muted-foreground">
                                                    {row.tier}
                                                </td>
                                                <td className="px-400 py-200 text-right font-numeric text-200 text-muted-foreground">
                                                    {row.leadTimeDays}
                                                </td>
                                                <td className="px-400 py-200 text-right font-numeric text-200 text-foreground">
                                                    {row.suggestedReorderQty.toLocaleString()}
                                                </td>
                                                <td className="px-400 py-200 text-right font-numeric text-200 text-muted-foreground">
                                                    {(row.demandTrend * 100).toFixed(0)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
