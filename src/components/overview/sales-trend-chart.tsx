//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import { toDataTable } from "@/lib/to-data-table";
import { salesTrend } from "@/queries/overview/sales-trend";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";
import { SALES_TREND_FIXTURE } from "@/lib/dev-preview-fixtures";

export function SalesTrendChart() {
    const { connection, query, columnMetadata, vegaLiteSpec } = salesTrend();
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });
    const theme = useCssTheme();
    const isQueryError = Boolean(error) || data?.status === "error";

    // Dev-only fallback so `npm run dev` can render the success state
    // without a Fabric embed. `import.meta.env.DEV` is statically false in
    // the production build, so this branch never ships.
    const usingDevFixture = import.meta.env.DEV && !import.meta.env.VITEST && isQueryError;

    if (isQueryError && !usingDevFixture) {
        const message = error?.message ?? (data?.status === "error" ? data.error.message : "Unknown error");
        return (
            <div
                role="alert"
                className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-destructive bg-destructive/10 px-400 py-300 text-300 text-destructive"
            >
                Couldn't load sales trend: {message}
            </div>
        );
    }

    if (!usingDevFixture && (isLoading || !data)) {
        return (
            <div className="h-full min-h-[320px] animate-pulse rounded-lg border border-border bg-card" />
        );
    }

    const table = usingDevFixture ? SALES_TREND_FIXTURE : data && data.status === "success" ? data.table : undefined;
    if (!table) return null;

    if (table.rows.length === 0) {
        return (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No sales trend data available yet.
            </div>
        );
    }

    return (
        <div className="h-full min-h-[320px] rounded-lg border border-border bg-card p-400">
            <h2 className="font-heading text-400 font-semibold text-foreground">Daily Sales Trend</h2>
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
