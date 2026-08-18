//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { AlertTriangle, ArrowRight, Info, PackagePlus, History } from "lucide-react";

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
    return (
        <div className="flex flex-col gap-700">
            <section className="flex flex-col items-start gap-300 rounded-lg border border-border bg-card p-600 shadow-sm">
                <span className="font-base text-200 font-semibold uppercase tracking-wide text-muted-foreground">
                    Microsoft Fabric Hackathon 2026 &middot; Fabric App Champion
                </span>
                <h1 className="font-heading text-800 font-semibold text-foreground">WWI Replenishment</h1>
                <p className="max-w-[720px] font-base text-400 text-muted-foreground">
                    Demand-driven reorder attention for a wholesale distributor — ranks stock items by
                    sales velocity vs. supplier lead time, and lets you log and track the reorder decision,
                    without leaving the app.
                </p>
                <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="mt-200 flex items-center gap-200 rounded-md bg-primary px-400 py-200 font-base text-300 text-primary-foreground"
                >
                    Open the Dashboard
                    <ArrowRight className="icon-size-300" />
                </button>
            </section>

            <section className="flex flex-col gap-300">
                <h2 className="font-heading text-500 font-semibold text-foreground">The problem</h2>
                <p className="max-w-[820px] font-base text-300 text-muted-foreground">
                    Standard BI dashboards show sales history but leave the "what do I do about it" step to a
                    human working outside the report — usually a spreadsheet or an email. This app closes
                    that loop inside a single Fabric Data App: view what's at risk of stocking out, then
                    record and track the reorder action for it, without leaving the app.
                </p>
            </section>

            <section className="grid grid-cols-1 gap-400 md:grid-cols-3">
                {STEPS.map((step) => {
                    const Icon = step.icon;
                    return (
                        <div
                            key={step.title}
                            className="flex flex-col gap-200 rounded-lg border border-border bg-card p-400 shadow-sm"
                        >
                            <Icon className="icon-size-400 text-muted-foreground" />
                            <h3 className="font-heading text-400 font-semibold text-foreground">
                                {step.title}
                            </h3>
                            <p className="font-base text-200 text-muted-foreground">{step.description}</p>
                        </div>
                    );
                })}
            </section>

            <section className="flex items-start gap-300 rounded-lg border border-border bg-card p-400 text-200 text-muted-foreground shadow-sm">
                <Info className="icon-size-300 shrink-0" />
                <p>
                    Built on the Wide World Importers retail sample data (Fabric Warehouse Copy Job, ~50M sales
                    rows). This sample has no real purchasing or backorder data, so "risk" here is a{" "}
                    <strong className="text-foreground">disclosed proxy</strong> — sales velocity trend vs.
                    lead time, ranked — not a literal stock count.
                </p>
            </section>

            <p className="font-base text-200 uppercase tracking-wide text-muted-foreground">
                Fabric Warehouse &middot; Power BI Semantic Model &middot; Rayfin Backend &middot; React + Vite
            </p>
        </div>
    );
}
