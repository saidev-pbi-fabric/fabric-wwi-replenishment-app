//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useThemeContext } from "@/hooks/theme.context";
import { fadeInUp } from "@/lib/motion";
import { LandingPage } from "@/components/landing/landing-page";
import { KpiStrip } from "@/components/overview/kpi-strip";
import { ParetoRiskView } from "@/components/overview/pareto-risk-view";
import { useParetoDataset, type RankMode } from "@/hooks/use-pareto-dataset";
import { ActionCenter } from "@/components/action-center/action-center";
import { cn } from "@/lib/utils";

const DEFAULT_CUTOFF_PCT = 0.8;

type Page = "landing" | "overview" | "action-center";

function App() {
    const [page, setPage] = useState<Page>("landing");
    const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
    // Single shared toggle, lifted here so Overview and Action Center never disagree on which
    // metric is driving the app — flagged directly: "2 diff ranks in 2 pages will trip users."
    const [rankMode, setRankMode] = useState<RankMode>("value");

    const goToActionCenter = (stockItemName: string) => {
        setSelectedItemName(stockItemName);
        setPage("action-center");
    };

    return (
        <div className="flex min-h-full flex-col bg-background">
            <main className="mx-auto w-full max-w-[1400px] flex-1 p-500">
                <header className="mb-400 flex items-center justify-between rounded-lg border border-border bg-card px-500 py-300 shadow-sm">
                    <div className="flex items-center gap-600">
                        <button
                            type="button"
                            onClick={() => setPage("landing")}
                            className="flex items-center gap-200"
                        >
                            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-primary font-heading text-200 font-bold text-primary-foreground">
                                W
                            </span>
                            <span className="font-base text-300 font-semibold text-foreground">
                                WWI Replenishment
                            </span>
                        </button>
                        <nav className="flex items-center gap-100" aria-label="Pages">
                            <NavTab active={page === "landing"} onClick={() => setPage("landing")}>
                                Home
                            </NavTab>
                            <NavTab active={page === "overview"} onClick={() => setPage("overview")}>
                                Overview
                            </NavTab>
                            <NavTab active={page === "action-center"} onClick={() => setPage("action-center")}>
                                Action Center
                            </NavTab>
                        </nav>
                    </div>
                    <div className="flex items-center gap-300">
                        {page !== "landing" ? <RankModeToggle rankMode={rankMode} onChange={setRankMode} /> : null}
                        <ThemeToggle />
                    </div>
                </header>

                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div key={page} initial="hidden" animate="visible" exit="hidden" variants={fadeInUp}>
                        {page === "landing" ? (
                            <LandingPage onOpenDashboard={() => setPage("overview")} />
                        ) : page === "overview" ? (
                            <OverviewPage rankMode={rankMode} onSelectItem={goToActionCenter} />
                        ) : (
                            <ActionCenterPage rankMode={rankMode} initialSelectedItemName={selectedItemName} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}

function NavTab({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-current={active ? "page" : undefined}
            className={cn(
                "rounded-md border px-300 py-100-nudge font-base text-300 font-medium transition-colors active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                    ? "border-border bg-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
        >
            {children}
        </button>
    );
}

/**
 * One shared control for the whole app — not duplicated per page — so Overview and Action
 * Center are always looking at the same lens. Qty (At Risk Rank: velocity vs. lead time, no
 * price) vs $ Value (Reorder Value Rank: qty x unit price). See use-pareto-dataset.ts.
 */
function RankModeToggle({ rankMode, onChange }: { rankMode: RankMode; onChange: (mode: RankMode) => void }) {
    const options = [
        ["qty", "Qty"],
        ["value", "$ Value"],
    ] as const;
    const activeIndex = options.findIndex(([mode]) => mode === rankMode);

    return (
        <div className="flex items-center gap-200">
            <span className="font-base text-200 text-muted-foreground">Rank by</span>
            <div
                className="relative flex items-center rounded-md border border-border bg-secondary p-100-nudge"
                role="group"
                aria-label="Rank by"
            >
                <motion.div
                    className="absolute inset-y-100-nudge rounded-sm bg-accent shadow-sm"
                    initial={false}
                    animate={{ left: `calc(${activeIndex * 50}% + 2px)` }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    style={{ width: "calc(50% - 4px)" }}
                />
                {options.map(([mode, label]) => (
                    <button
                        key={mode}
                        type="button"
                        onClick={() => onChange(mode)}
                        aria-pressed={rankMode === mode}
                        className={cn(
                            "relative z-10 min-w-[64px] rounded-sm px-300 py-100-nudge font-base text-200 font-medium transition-colors",
                            rankMode === mode ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

function ThemeToggle() {
    const { isDark, toggleTheme } = useThemeContext();
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="rounded-md border border-border bg-secondary px-300 py-100-nudge font-base text-200 text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
            Toggle theme
        </button>
    );
}

function OverviewPage({
    rankMode,
    onSelectItem,
}: {
    rankMode: RankMode;
    onSelectItem: (stockItemName: string) => void;
}) {
    const dataset = useParetoDataset();
    const [cutoffPct, setCutoffPct] = useState(DEFAULT_CUTOFF_PCT);

    return (
        <div className="flex flex-col gap-400">
            <div>
                <h1 className="font-heading text-600 font-semibold text-foreground">
                    Replenishment Overview
                </h1>
                <p className="mt-100 font-base text-300 text-muted-foreground">
                    Demand-driven reorder attention, ranked by sales velocity vs. lead time.
                </p>
            </div>
            <KpiStrip dataset={dataset} rankMode={rankMode} cutoffPct={cutoffPct} />
            <ParetoRiskView
                dataset={dataset}
                rankMode={rankMode}
                cutoffPct={cutoffPct}
                onCutoffChange={setCutoffPct}
                onSelectItem={onSelectItem}
            />
        </div>
    );
}

function ActionCenterPage({
    rankMode,
    initialSelectedItemName,
}: {
    rankMode: RankMode;
    initialSelectedItemName: string | null;
}) {
    // No page-level H1 here — the nav tab above already reads "Action Center" (active-highlighted),
    // so a repeated "Action Center" heading directly under it was pure duplication with no added
    // information (flagged directly: "the existing one is a repetition"). Overview keeps its own
    // H1 because that one adds real framing copy the nav label doesn't carry.
    return <ActionCenter rankMode={rankMode} initialSelectedItemName={initialSelectedItemName} />;
}

export default App;
