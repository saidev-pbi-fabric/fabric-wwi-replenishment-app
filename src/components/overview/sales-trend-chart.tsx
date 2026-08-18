//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { toDataTable } from "@/lib/to-data-table";
import { salesTrend } from "@/queries/overview/sales-trend";
import { useQueryPanel } from "@/hooks/use-query-panel";
import { SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";

export function SalesTrendChart() {
    const { connection, query, columnMetadata, vegaLiteSpec } = salesTrend();
    const panel = useQueryPanel({ connection, query });
    const theme = useCssTheme();

    // Dev-only fallback so `npm run dev` can render the ready state without
    // a Fabric embed. See use-query-panel.ts for why this stays a literal
    // `import.meta.env.DEV` check in this module rather than a hook param.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error";

    if (panel.status === "error" && !usingDevFixture) {
        return (
            <div
                role="alert"
                className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load sales trend: {panel.message}
            </div>
        );
    }

    if (!usingDevFixture && panel.status === "loading") {
        return (
            <div className="h-full min-h-[320px] animate-pulse rounded-lg border border-border bg-card" />
        );
    }

    if (!usingDevFixture && panel.status === "empty") {
        return (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No sales trend data available yet.
            </div>
        );
    }

    const table = usingDevFixture ? SALES_TREND_FIXTURE : panel.status === "ready" ? panel.table : undefined;
    if (!table) return null;

    return (
        <div className="h-full min-h-[320px] rounded-lg border border-border bg-card p-400">
            <h2 className="font-heading text-400 font-semibold text-foreground">
                Daily Sales Trend — Top At-Risk Items
            </h2>
            {usingDevFixture ? (
                <p className="text-200 text-muted-foreground">Sample data — dev preview (no Fabric embed)</p>
            ) : null}
            <VegaVisual
                spec={JSON.stringify(vegaLiteSpec)}
                data={toDataTable(table, columnMetadata)}
                theme={theme}
                style={{ height: 280 }}
            />
        </div>
    );
}
