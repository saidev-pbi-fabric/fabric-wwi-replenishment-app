//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { QueryTable } from "@microsoft/fabric-app-data";
import { useQueryPanel } from "@/hooks/use-query-panel";

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

describe("useQueryPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("starts in the loading state", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        const { result } = renderHook(() => useQueryPanel({ connection: "model", query: "EVALUATE ROW()" }));
        expect(result.current.status).toBe("loading");
    });

    it("resolves to ready with the real table on success", async () => {
        const table: QueryTable = {
            columns: [{ name: "Value", dataType: "String" }],
            rows: [["real-row"]],
        };
        mockQuery.mockResolvedValue({ status: "success", table, fromCache: false });

        const { result } = renderHook(() => useQueryPanel({ connection: "model", query: "EVALUATE ROW()" }));

        await waitFor(() => expect(result.current.status).toBe("ready"));
        expect(result.current).toMatchObject({ status: "ready", table });
    });

    it("resolves to empty when the query returns no rows", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: { columns: [], rows: [] },
            fromCache: false,
        });

        const { result } = renderHook(() => useQueryPanel({ connection: "model", query: "EVALUATE ROW()" }));

        await waitFor(() => expect(result.current.status).toBe("empty"));
    });

    // Regression: a filter change re-queries with a different DAX string. The
    // underlying fetch hook keeps the previous successful result in state
    // while the new one is in flight, but this hook used to discard it and
    // report bare "loading" anyway — every consumer swapped its rendered rows
    // for a blank skeleton on every filter change (flagged directly by the
    // user: "the transition ... goes blank"). It should instead surface the
    // stale table so a consumer can keep showing it (dimmed/with a spinner)
    // until the fresh one arrives.
    it("reports 'refreshing' with the previous table while a new query is in flight, instead of going blank", async () => {
        const firstTable: QueryTable = { columns: [{ name: "Value" }], rows: [["first"]] };
        mockQuery.mockResolvedValueOnce({ status: "success", table: firstTable, fromCache: false });

        const { result, rerender } = renderHook(
            ({ query }: { query: string }) => useQueryPanel({ connection: "model", query }),
            { initialProps: { query: "EVALUATE ROW(\"Value\", \"A\")" } },
        );

        await waitFor(() => expect(result.current.status).toBe("ready"));

        const pending = deferred<{ status: "success"; table: QueryTable; fromCache: boolean }>();
        mockQuery.mockReturnValueOnce(pending.promise);
        rerender({ query: "EVALUATE ROW(\"Value\", \"B\")" });

        await waitFor(() => expect(result.current.status).toBe("refreshing"));
        expect(result.current).toMatchObject({ status: "refreshing", table: firstTable });

        const secondTable: QueryTable = { columns: [{ name: "Value" }], rows: [["second"]] };
        pending.resolve({ status: "success", table: secondTable, fromCache: false });

        await waitFor(() => expect(result.current.status).toBe("ready"));
        expect(result.current).toMatchObject({ status: "ready", table: secondTable });
    });

    it("resolves to error when the query errors", async () => {
        mockQuery.mockResolvedValue({
            status: "error",
            error: { message: "401 Unauthorized" },
        });

        const { result } = renderHook(() => useQueryPanel({ connection: "model", query: "EVALUATE ROW()" }));

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current).toMatchObject({ status: "error", message: "401 Unauthorized" });
    });
});
