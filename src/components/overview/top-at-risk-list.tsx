//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { VegaLiteConfig } from "@microsoft/fabric-visuals";
import type { InteractionEventCallback } from "@microsoft/fabric-visuals-core";
import { toDataTable } from "@/lib/to-data-table";
import { topAtRiskItems } from "@/queries/overview/top-at-risk-items";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { useThemeContext } from "@/hooks/theme.context";

// Vega renders to SVG and can't resolve `var(--color-*)`, so the severity
// scale is duplicated here as literal hex, matching global.css exactly.
const SEVERITY_RANGE = {
    light: ["#0e700e", "#9a6700", "#c50f1f"], // Short / Medium / Long lead time
    dark: ["#54c454", "#e0a828", "#f1707b"],
} as const;

interface TopAtRiskListProps {
    onSelectItem?: (stockItemName: string) => void;
}

export function TopAtRiskList({ onSelectItem }: TopAtRiskListProps) {
    const { connection, query, columnMetadata, vegaLiteSpec } = topAtRiskItems();
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });
    const theme = useCssTheme();
    const { isDark } = useThemeContext();

    if (error || data?.status === "error") {
        const message = error?.message ?? (data?.status === "error" ? data.error.message : "Unknown error");
        return (
            <div
                role="alert"
                className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load top at-risk items: {message}
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="h-full min-h-[320px] animate-pulse rounded-lg border border-border bg-card" />
        );
    }

    if (data.table.rows.length === 0) {
        return (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No at-risk items right now.
            </div>
        );
    }

    const configVegaLite: VegaLiteConfig = {
        range: { category: [...SEVERITY_RANGE[isDark ? "dark" : "light"]] },
    };

    const handleInteraction: InteractionEventCallback = (events) => {
        if (!onSelectItem) return;
        for (const event of events) {
            if (event.action !== "select") continue;
            for (const selection of event.selections) {
                for (const predicate of selection.predicates) {
                    if (predicate.type === "set" && predicate.name === "StockItem") {
                        const value = predicate.values[0];
                        if (typeof value === "string") onSelectItem(value);
                    }
                }
            }
        }
    };

    return (
        <div className="h-full min-h-[320px] rounded-lg border border-border bg-card p-400">
            <h2 className="font-heading text-400 font-semibold text-foreground">Top At-Risk Items</h2>
            <VegaVisual
                spec={JSON.stringify(vegaLiteSpec)}
                data={toDataTable(data.table, columnMetadata)}
                theme={theme}
                configVegaLite={configVegaLite}
                onInteraction={handleInteraction}
                style={{ height: 400 }}
            />
        </div>
    );
}
