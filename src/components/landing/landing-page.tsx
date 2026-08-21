//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";

interface LandingPageProps {
    onOpenDashboard: () => void;
}

interface Step {
    n: string;
    title: string;
    description: string;
}

// Copy locked verbatim against docs/mockup-reference.html's #page-landing section —
// do not rephrase without updating the mockup or getting sign-off first.
const STEPS: Step[] = [
    {
        n: "01",
        title: "See the concentration",
        description: "A live Pareto view of every stock item, ranked by dollar exposure.",
    },
    {
        n: "02",
        title: "Drill into one item",
        description: "Sales trend, lead time, and the plain-English reason it's flagged.",
    },
    {
        n: "03",
        title: "Log the reorder",
        description: "Record quantity, supplier, and status — tracked with a full audit trail.",
    },
];

export function LandingPage({ onOpenDashboard }: LandingPageProps) {
    return (
        <motion.div
            className="flex flex-col gap-400"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
        >
            <motion.section
                variants={fadeInUp}
                className="flex flex-col items-start gap-300 rounded-lg border border-border bg-card p-600 shadow-sm"
            >
                <h1 className="max-w-[720px] font-heading text-800 font-bold leading-tight text-foreground">
                    Twenty percent of your catalog is carrying{" "}
                    <span className="text-primary">eighty percent</span> of the reorder risk.
                </h1>

                <p className="max-w-[560px] font-base text-400 leading-relaxed text-muted-foreground">
                    WWI Replenishment ranks stock items by sales velocity against supplier lead time,
                    then shows exactly how concentrated that risk is &mdash; and lets a planner act on
                    it without leaving the app.
                </p>
                <motion.button
                    type="button"
                    onClick={onOpenDashboard}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-200 flex items-center gap-200 rounded-md bg-primary px-400 py-200 font-base text-300 font-semibold text-primary-foreground shadow-sm"
                >
                    Open the dashboard
                    <ArrowRight className="icon-size-300" />
                </motion.button>
            </motion.section>

            <motion.section
                variants={staggerContainer}
                className="grid grid-cols-1 gap-300 md:grid-cols-3"
            >
                {STEPS.map((step) => (
                    <motion.div
                        key={step.title}
                        variants={fadeInUp}
                        className="flex flex-col gap-100 rounded-lg border border-border bg-card p-400 shadow-sm"
                    >
                        <span className="font-numeric text-200 font-semibold text-primary">{step.n}</span>
                        <h3 className="font-heading text-400 font-semibold text-foreground">{step.title}</h3>
                        <p className="font-base text-200 leading-relaxed text-muted-foreground">
                            {step.description}
                        </p>
                    </motion.div>
                ))}
            </motion.section>
        </motion.div>
    );
}
