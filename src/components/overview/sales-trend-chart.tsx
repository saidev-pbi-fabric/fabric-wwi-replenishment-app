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

export function SalesTrendChart() {
    const { connection, query, columnMetadata, vegaLiteSpec } = salesTrend();
    const { data, isLoading, error } = useSemanticModelQuery({ connection, query });
    const theme = useCssTheme();

    if (error || data?.status === "error") {
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

    if (isLoading || !data) {
        return (
            <div className="h-full min-h-[320px] animate-pulse rounded-lg border border-border bg-card" />
        );
    }

    if (data.table.rows.length === 0) {
        return (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-border bg-card text-300 text-muted-foreground">
                No sales trend data available yet.
            </div>
        );
    }

    return (
        <div className="h-full min-h-[320px] rounded-lg border border-border bg-card p-400">
            <h2 className="font-heading text-400 font-semibold text-foreground">Daily Sales Trend</h2>
            <VegaVisual
                spec={JSON.stringify(vegaLiteSpec)}
                data={toDataTable(data.table, columnMetadata)}
                theme={theme}
                style={{ height: 280 }}
            />
        </div>
    );
}
