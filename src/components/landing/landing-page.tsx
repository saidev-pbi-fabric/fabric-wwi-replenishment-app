//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Info, PackagePlus, History } from "lucide-react";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { topAtRiskItems } from "@/queries/overview/top-at-risk-items";
import { TOP_AT_RISK_ITEMS_FIXTURE } from "@/lib/dev-preview-fixtures";
import { LEAD_TIME_DOT_CLASS } from "@/lib/severity";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface LandingPageProps {
    onOpenDashboard: () => void;
}

interface Step {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
}

const STEPS: Step[] = [
    {
        icon: AlertTriangle,
        title: "Surface the risk",
        description:
            "Every stock item ranked by demand trend vs. lead time — no guessing which SKUs need attention first.",
    },
    {
        icon: PackagePlus,
        title: "Record the action",
        description:
            "Log a reorder decision — quantity, status, note — directly against the item. No spreadsheet or email hop.",
    },
    {
        icon: History,
        title: "Track it through",
        description:
            "Status stays with the item: Pending Review → Approved → Ordered → Received.",
    },
];

export function LandingPage({ onOpenDashboard }: LandingPageProps) {
    const topItemsPanel = useQueryPanel(topAtRiskItems("All"));

    // Dev-only fallback, same pattern as every other query-backed component —
    // see use-query-panel.ts for why this stays a literal `import.meta.env.DEV`
    // check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && topItemsPanel.status === "error";

    const topTable = usingDevFixture
        ? TOP_AT_RISK_ITEMS_FIXTURE
        : topItemsPanel.status === "ready" || topItemsPanel.status === "refreshing"
          ? topItemsPanel.table
          : undefined;

    const glimpseRows = topTable ? topRowsFromTable(topTable).slice(0, 3) : [];

    return (
        <motion.div
            className="flex flex-col gap-700"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
        >
            <motion.section
                variants={fadeInUp}
                className="flex flex-col items-start gap-300 rounded-lg border border-border bg-card p-600 shadow-sm"
            >
                <span className="font-base text-200 font-semibold uppercase tracking-wide text-muted-foreground">
                    Microsoft Fabric Hackathon 2026 &middot; Fabric App Champion
                </span>

                <h1 className="font-heading text-800 font-semibold leading-tight text-foreground">
                    Know what's at risk. Decide what to do about it.
                </h1>

                <p className="max-w-[720px] font-base text-400 text-muted-foreground">
                    Demand-driven reorder attention for a wholesale distributor — ranks stock items by
                    sales velocity vs. supplier lead time, and lets you log and track the reorder decision,
                    without leaving the app.
                </p>
                <motion.button
                    type="button"
                    onClick={onOpenDashboard}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-200 flex items-center gap-200 rounded-md bg-primary px-400 py-200 font-base text-300 text-primary-foreground shadow-sm"
                >
                    Open the Dashboard
                    <ArrowRight className="icon-size-300" />
                </motion.button>
            </motion.section>

            {glimpseRows.length > 0 ? (
                <motion.section
                    variants={fadeInUp}
                    className="rounded-lg border border-border bg-card shadow-sm"
                >
                    <div className="border-b border-border px-400 py-300">
                        <h2 className="font-base text-200 font-semibold uppercase tracking-wide text-muted-foreground">
                            Right now, ranked by risk
                        </h2>
                    </div>
                    <ul>
                        {glimpseRows.map((row) => (
                            <li
                                key={row.name}
                                className="flex items-center gap-300 border-b border-border px-400 py-200 last:border-b-0"
                            >
                                <span
                                    className={`icon-size-100 inline-block shrink-0 rounded-full ${
                                        LEAD_TIME_DOT_CLASS[row.tier] ?? "bg-muted-foreground"
                                    }`}
                                    aria-hidden="true"
                                />
                                <span
                                    className="min-w-0 flex-1 truncate font-base text-300 text-foreground"
                                    title={row.name}
                                >
                                    {row.name}
                                </span>
                                <span className="shrink-0 font-numeric text-200 text-muted-foreground">
                                    Rank #{row.rank}
                                </span>
                            </li>
                        ))}
                    </ul>
                </motion.section>
            ) : null}

            <motion.section variants={fadeInUp} className="flex flex-col gap-300">
                <h2 className="font-heading text-500 font-semibold text-foreground">The problem</h2>
                <p className="max-w-[820px] font-base text-300 text-muted-foreground">
                    Sales dashboards show what happened. They don't say what to do about it — that step
                    still lives in a spreadsheet or an email, outside the report. This app closes that
                    loop: see what's at risk of stocking out, then record and track the reorder action for
                    it, in the same place.
                </p>
            </motion.section>

            <motion.section
                variants={staggerContainer}
                className="grid grid-cols-1 gap-400 md:grid-cols-[1.4fr_1fr_1fr]"
            >
                {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isFirst = index === 0;
                    return (
                        <motion.div
                            key={step.title}
                            variants={fadeInUp}
                            className={cn(
                                "relative flex flex-col gap-200 rounded-lg border border-border p-400",
                                isFirst ? "bg-muted" : "bg-card",
                            )}
                        >
                            <div className="flex items-center gap-200">
                                <span className="font-numeric text-200 font-semibold text-primary">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <Icon
                                    className={cn(
                                        "text-muted-foreground",
                                        isFirst ? "icon-size-500" : "icon-size-400",
                                    )}
                                />
                            </div>
                            <h3
                                className={cn(
                                    "font-heading font-semibold text-foreground",
                                    isFirst ? "text-500" : "text-400",
                                )}
                            >
                                {step.title}
                            </h3>
                            <p className="font-base text-200 text-muted-foreground">{step.description}</p>
                        </motion.div>
                    );
                })}
            </motion.section>

            <motion.section
                variants={fadeInUp}
                className="flex items-start gap-300 rounded-lg border border-border bg-card p-400 text-200 text-muted-foreground shadow-sm"
            >
                <Info className="icon-size-300 shrink-0" />
                <p>
                    Built on the Wide World Importers retail sample data (Fabric Warehouse Copy Job, ~50M sales
                    rows). This sample has no real purchasing or backorder data, so "risk" here is a{" "}
                    <strong className="text-foreground">disclosed proxy</strong> — sales velocity trend vs.
                    lead time, ranked — not a literal stock count.
                </p>
            </motion.section>

            <motion.p
                variants={fadeInUp}
                className="font-base text-200 uppercase tracking-wide text-muted-foreground"
            >
                Fabric Warehouse &middot; Power BI Semantic Model &middot; Rayfin Backend &middot; React + Vite
            </motion.p>
        </motion.div>
    );
}

interface GlimpseRow {
    name: string;
    tier: string;
    rank: number;
}

function topRowsFromTable(table: { columns: { name: string }[]; rows: unknown[][] }): GlimpseRow[] {
    const idx = (name: string) => table.columns.findIndex((col) => col.name === name);
    const nameIdx = idx("Stock Item[Stock Item]");
    const tierIdx = idx("Stock Item[Lead Time Priority Tier]");
    const rankIdx = idx("[At Risk Rank]");

    return table.rows.map((row) => ({
        name: String(row[nameIdx]),
        tier: String(row[tierIdx]),
        rank: Number(row[rankIdx]),
    }));
}
