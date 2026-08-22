//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { kpiStrip } from "@/queries/overview/kpi-strip";
import { scalarByColumnName } from "@/lib/to-data-table";
import { KPI_STRIP_FIXTURE } from "@/lib/dev-preview-fixtures";
import { cn } from "@/lib/utils";

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
                            className={i <= PREVIEW_CUTOFF_INDEX ? "bg-brand" : "bg-muted-foreground/50"}
                            style={{ height: `${(v / max) * 100}%`, transformOrigin: "bottom", flex: 1 }}
                        />
                    ))}
                </motion.div>
            </div>

            <p className="font-base text-100 leading-snug text-muted-foreground">
                Illustrative shape, not live data. The real view ranks all 219 stock items and the
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

function TeaserTile({ label, value, severity }: { label: string; value: string; severity?: "at-risk" }) {
    return (
        <div
            className={cn(
                "rounded-lg border border-border bg-card p-400",
                severity === "at-risk" && "border-l-4 border-l-at-risk",
            )}
        >
            <div className="font-monospace text-100 uppercase tracking-wide text-muted-foreground">{label}</div>
            <div
                className={cn(
                    "mt-200 font-numeric text-hero-800 font-semibold",
                    severity === "at-risk" ? "text-at-risk" : "text-foreground",
                )}
            >
                {value}
            </div>
        </div>
    );
}

// Reuses the exact same lightweight query already fired by Overview's KpiStrip (3 scalar
// measures, one round-trip) -- deliberately NOT the full pareto dataset that page also loads,
// which is why this only surfaces 3 of Overview's 5 tiles. The other 2 ($/qty-in-cutoff) are a
// client-side reduction over that larger dataset there; pulling it here just for a landing-page
// preview would reintroduce the real DAX round-trip this page has always avoided before the user
// asks for the dashboard (see ConcentrationPreview's comment above).
function KpiTeaser() {
    const panel = useQueryPanel(kpiStrip());
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) return null; // quiet degrade -- the dashboard itself still surfaces this error properly
    if (!usingDevFixture && (panel.status === "loading" || panel.status === "empty")) {
        return (
            <div className="grid grid-cols-1 gap-300 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card p-400">
                        <div className="h-200 w-2/3 animate-pulse rounded-md bg-muted" />
                        <div className="mt-300 h-600 w-1/3 animate-pulse rounded-md bg-muted" />
                    </div>
                ))}
            </div>
        );
    }

    const table = usingDevFixture ? KPI_STRIP_FIXTURE : panel.status === "ready" ? panel.table : undefined;
    if (!table) return null;

    return (
        <div className="flex flex-col gap-300">
            {usingDevFixture ? (
                <p className="font-base text-200 text-muted-foreground">Sample data · dev preview (no Fabric embed)</p>
            ) : null}
            <div className="grid grid-cols-1 gap-300 sm:grid-cols-3">
                <TeaserTile label="Items tracked" value={String(scalarByColumnName(table, "[Items Tracked]") ?? "—")} />
                <TeaserTile
                    label="Avg lead time (days)"
                    value={String(scalarByColumnName(table, "[Avg Lead Time Days]") ?? "—")}
                />
                <TeaserTile
                    label="Accelerating demand"
                    value={String(scalarByColumnName(table, "[Accelerating Demand Items]") ?? "—")}
                    severity="at-risk"
                />
            </div>
        </div>
    );
}

interface TrustPoint {
    title: string;
    body: string;
}

// Every claim below is already stated elsewhere in the app (item detail's disclosure copy,
// docs/talk-track.md's Q&A) -- reused nearly verbatim here, not reworded, so the landing page
// never asserts something the dashboard itself doesn't also stand behind.
const TRUST_POINTS: TrustPoint[] = [
    {
        title: "A disclosed proxy, not an inventory system",
        body: "Suggested Reorder Qty is recent daily sales rate × an item's own lead time × a safety buffer — never a fixed 30- or 60-day window, and never a prediction. No stock-on-hand figure exists anywhere in this dataset, so “days of stock left” is never shown.",
    },
    {
        title: "Live numbers, not staged ones",
        body: "Every live number here — the KPIs above, everything inside the dashboard — comes from a real measure against the semantic model. The concentration preview above is the one deliberately-illustrative exception, and it says so.",
    },
    {
        title: "No forecasting pretense",
        body: "Trend lines show historical daily sales only. This dataset's DAX has no forecast measure, so we don't draw a projection.",
    },
];

function TrustStrip() {
    return (
        <div className="flex flex-col gap-300">
            <div className="flex flex-col gap-100">
                <span className="font-monospace text-100 font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Why you can trust the numbers
                </span>
                <h2 className="font-heading text-500 font-semibold text-foreground">
                    Every claim here is disclosed, not dressed up.
                </h2>
            </div>
            <div className="grid grid-cols-1 gap-300 md:grid-cols-3">
                {TRUST_POINTS.map((point, i) => (
                    <div key={point.title} className="flex gap-200">
                        <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-brand font-monospace text-200 font-bold text-primary-foreground">
                            {i + 1}
                        </span>
                        <div className="flex flex-col gap-100">
                            <h3 className="font-heading text-300 font-semibold text-foreground">{point.title}</h3>
                            <p className="font-base text-200 leading-relaxed text-muted-foreground">{point.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ClosingBand() {
    return (
        <div className="rounded-lg bg-band px-600 py-500 text-center text-band-foreground">
            <p className="font-monospace text-100 uppercase tracking-[0.15em] opacity-70">
                Fabric Data App · Wide World Importers
            </p>
            <h3 className="mx-auto mt-200 max-w-[52ch] font-heading text-500 font-semibold">
                One app for seeing the risk and acting on it &mdash; dashboards and write-back, together.
            </h3>
            <p className="mt-200 font-base text-200 opacity-70">
                Built on Microsoft Fabric &middot; Semantic model (Import mode) &middot; Rayfin write-back + audit
                trail
            </p>
        </div>
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
                        className="flex flex-col gap-100 rounded-lg border border-border bg-card p-400 shadow-sm"
                    >
                        <span className="mb-100 flex h-[36px] w-[36px] items-center justify-center rounded-full bg-brand font-monospace text-200 font-bold text-primary-foreground">
                            {step.n}
                        </span>
                        <h3 className="font-heading text-400 font-semibold text-foreground">{step.title}</h3>
                        <p className="font-base text-200 leading-relaxed text-muted-foreground">
                            {step.description}
                        </p>
                    </motion.div>
                ))}
            </motion.section>

            <motion.section variants={fadeInUp}>
                <KpiTeaser />
            </motion.section>

            <motion.section variants={fadeInUp}>
                <TrustStrip />
            </motion.section>

            <motion.section variants={fadeInUp}>
                <ClosingBand />
            </motion.section>
        </motion.div>
    );
}
