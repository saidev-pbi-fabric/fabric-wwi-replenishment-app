//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeContext } from "@/hooks/theme.context";
import { KpiStrip } from "@/components/overview/kpi-strip";
import { SalesTrendChart } from "@/components/overview/sales-trend-chart";
import { TopAtRiskList } from "@/components/overview/top-at-risk-list";
import { ActionCenter } from "@/components/action-center/action-center";
import { cn } from "@/lib/utils";

type Page = "overview" | "action-center";

function App() {
    const [page, setPage] = useState<Page>("overview");
    const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

    const goToActionCenter = (stockItemName: string) => {
        setSelectedItemName(stockItemName);
        setPage("action-center");
    };

    return (
        <div className="flex min-h-full flex-col bg-background">
            <header className="flex items-center justify-between border-b border-border px-500 py-300">
                <div className="flex items-center gap-600">
                    <span className="font-heading text-500 font-semibold tracking-tight text-foreground">
                        WWI Replenishment
                    </span>
                    <nav className="flex items-center gap-200" aria-label="Pages">
                        <NavTab active={page === "overview"} onClick={() => setPage("overview")}>
                            Overview
                        </NavTab>
                        <NavTab active={page === "action-center"} onClick={() => setPage("action-center")}>
                            Action Center
                        </NavTab>
                    </nav>
                </div>
                <ThemeToggle />
            </header>

            <main className="mx-auto w-full max-w-[1400px] flex-1 p-500">
                {page === "overview" ? (
                    <OverviewPage onSelectItem={goToActionCenter} />
                ) : (
                    <ActionCenterPage initialSelectedItemName={selectedItemName} />
                )}
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
                "rounded-md px-300 py-100-nudge font-base text-300 transition-colors",
                active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
        >
            {children}
        </button>
    );
}

function ThemeToggle() {
    const { isDark, toggleTheme } = useThemeContext();
    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="flex icon-size-600 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
            {isDark ? <Sun className="icon-size-300" /> : <Moon className="icon-size-300" />}
        </button>
    );
}

function OverviewPage({ onSelectItem }: { onSelectItem: (stockItemName: string) => void }) {
    return (
        <div className="flex flex-col gap-500">
            <div>
                <h1 className="font-heading text-600 font-semibold text-foreground">
                    Replenishment Overview
                </h1>
                <p className="mt-100 font-base text-300 text-muted-foreground">
                    Demand-driven reorder attention, ranked by sales velocity vs. lead time.
                </p>
            </div>
            <KpiStrip />
            <div className="grid grid-cols-1 gap-500 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <SalesTrendChart />
                </div>
                <div className="lg:col-span-1">
                    <TopAtRiskList onSelectItem={onSelectItem} />
                </div>
            </div>
        </div>
    );
}

function ActionCenterPage({ initialSelectedItemName }: { initialSelectedItemName: string | null }) {
    return (
        <div className="flex flex-col gap-500">
            <div>
                <h1 className="font-heading text-600 font-semibold text-foreground">Action Center</h1>
                <p className="mt-100 font-base text-300 text-muted-foreground">
                    Select an at-risk item to review its detail and record a reorder action.
                </p>
            </div>
            <ActionCenter initialSelectedItemName={initialSelectedItemName} />
        </div>
    );
}

export default App;
