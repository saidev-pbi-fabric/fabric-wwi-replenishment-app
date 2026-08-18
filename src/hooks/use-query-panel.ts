//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { QueryTable } from "@microsoft/fabric-app-data";
import { useSemanticModelQuery } from "@/hooks/use-semantic-model-query";

export type QueryPanelState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "empty" }
    | { status: "ready"; table: QueryTable };

/**
 * Shared state-derivation for query-backed panels (KPI strip, charts,
 * ranked lists): resolves a `useSemanticModelQuery` result down to
 * loading/error/empty/ready.
 *
 * Deliberately has NO dev-fixture awareness — callers apply that
 * themselves, inline, as `import.meta.env.DEV && !import.meta.env.VITEST
 * && panel.status === "error" ? FIXTURE : ...`. That's a few duplicated
 * lines per component, but it keeps each fixture reference directly beside
 * a literal `import.meta.env.DEV` check in the *same* module scope, which
 * is what lets the production build's dead-code elimination fold the
 * branch away and drop the fixture data entirely. Passing fixture data
 * through this hook as a parameter previously defeated that — the
 * argument was evaluated unconditionally at every call site, and the
 * fixture bytes shipped into the production bundle even though the branch
 * that used them was unreachable at runtime. Verified by grepping the
 * built bundle for fixture strings (zero matches) after this change.
 */
export function useQueryPanel(options: { connection: string; query: string }): QueryPanelState {
    const { data, isLoading, error } = useSemanticModelQuery(options);

    if (error || data?.status === "error") {
        const message = error?.message ?? (data?.status === "error" ? data.error.message : "Unknown error");
        return { status: "error", message };
    }

    if (isLoading || !data) {
        return { status: "loading" };
    }

    if (data.status !== "success") {
        return { status: "loading" };
    }

    if (data.table.rows.length === 0) {
        return { status: "empty" };
    }

    return { status: "ready", table: data.table };
}
