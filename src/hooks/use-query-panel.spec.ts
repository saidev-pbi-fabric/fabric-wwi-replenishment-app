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
