//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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

// Illustrative bar heights only (a fixed shape, not sampled from the live model) — this renders
// before any dashboard query fires, so it can't show a real ranking without either lying about it
// or paying a real DAX round-trip before the user has even opened the app. Colored with the exact
// scheme the real Pareto chart uses (src/components/overview/pareto-chart-spec.ts): primary for
// in-cutoff, muted for past-cutoff, dashed at-risk-amber rule at the cutoff — so this reads as a
// preview of that chart, not a different one.
const PREVIEW_BARS = [100, 86, 74, 63, 46, 34, 26, 20, 15, 11, 8, 6];
const PREVIEW_CUTOFF_INDEX = 4; // first 5 bars = "in cutoff"

const barGrow: Variants = {
    hidden: { scaleY: 0 },
    visible: { scaleY: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

const barStagger: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.045, delayChildren: 0.15 } },
};

function ConcentrationPreview() {
    const prefersReducedMotion = useReducedMotion();
    const max = Math.max(...PREVIEW_BARS);

    return (
        <div className="grain-texture relative flex w-full flex-col gap-200 rounded-lg border border-border bg-accent/40 p-300 shadow-sm md:w-[320px]">
            <CornerTicks />
            <div className="flex items-center justify-between">
                <span className="font-monospace text-100 font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Concentration preview
                </span>
                <span className="font-monospace text-100 uppercase tracking-[0.12em] text-primary">
                    80% cutoff
                </span>
            </div>

            <div className="relative flex h-[120px] items-end gap-[3px]" aria-hidden="true">
                {/* Dashed cutoff rule, matching the real chart's amber cutoff-rule token. */}
                <div
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-at-risk"
                    style={{ bottom: `${(PREVIEW_BARS[PREVIEW_CUTOFF_INDEX] / max) * 100}%` }}
                />
                <motion.div
                    className="flex h-full w-full items-end gap-[3px]"
                    variants={prefersReducedMotion ? undefined : barStagger}
                    initial={prefersReducedMotion ? undefined : "hidden"}
                    animate={prefersReducedMotion ? undefined : "visible"}
                >
                    {PREVIEW_BARS.map((v, i) => (
                        <motion.div
                            key={i}
                            variants={prefersReducedMotion ? undefined : barGrow}
                            className={i <= PREVIEW_CUTOFF_INDEX ? "bg-primary" : "bg-muted-foreground/50"}
                            style={{ height: `${(v / max) * 100}%`, transformOrigin: "bottom", flex: 1 }}
                        />
                    ))}
                </motion.div>
            </div>

            <p className="font-base text-100 leading-snug text-muted-foreground">
                Illustrative shape, not live data — the real view ranks all 219 stock items and the
                cutoff moves with a live slider.
            </p>
        </div>
    );
}

function CornerTicks() {
    // Small blueprint-corner accents (industrial-brutalist-ui skill: "technical framing devices")
    // — decorative only, kept out of the accessibility tree.
    const base = "pointer-events-none absolute h-200 w-200 border-primary/40";
    return (
        <span aria-hidden="true">
            <span className={`${base} left-0 top-0 border-l-2 border-t-2`} />
            <span className={`${base} right-0 top-0 border-r-2 border-t-2`} />
            <span className={`${base} bottom-0 left-0 border-b-2 border-l-2`} />
            <span className={`${base} bottom-0 right-0 border-b-2 border-r-2`} />
        </span>
    );
}

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
                className="grain-texture relative flex flex-col gap-300 overflow-hidden rounded-lg border border-border bg-card p-600 shadow-sm md:flex-row md:items-center md:justify-between md:gap-500"
            >
                <div className="flex max-w-[560px] flex-col items-start gap-300">
                    <span className="font-monospace text-100 font-medium uppercase tracking-[0.15em] text-muted-foreground">
                        [ Fabric Data App · Wide World Importers ]
                    </span>

                    <h1 className="max-w-[720px] font-heading text-800 font-bold leading-tight tracking-tight text-foreground">
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
                </div>

                <ConcentrationPreview />
            </motion.section>

            <motion.section
                variants={staggerContainer}
                className="grid grid-cols-1 gap-300 md:grid-cols-3"
            >
                {STEPS.map((step) => (
                    <motion.div
                        key={step.title}
                        variants={fadeInUp}
                        className="flex flex-col gap-100 rounded-lg border border-t-2 border-border border-t-primary bg-card p-400 shadow-sm"
                    >
                        <span className="font-monospace text-100 font-semibold uppercase tracking-[0.1em] text-primary">
                            [ {step.n} ]
                        </span>
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
