//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KpiStrip } from "./kpi-strip";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({
            query: mockQuery,
            clearCache: vi.fn(),
        }),
    }),
}));

describe("KpiStrip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders a skeleton for each tile while loading", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<KpiStrip />);
        expect(screen.queryByText("Items Tracked")).not.toBeInTheDocument();
    });

    it("renders all four KPI values on success", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: {
                columns: [
                    { name: "[Items Tracked]" },
                    { name: "[Avg Lead Time Days]" },
                    { name: "[Top At Risk Items]" },
                    { name: "[Accelerating Demand Items]" },
                ],
                rows: [[672, 12.3, 20, 15]],
            },
            fromCache: false,
        });

        render(<KpiStrip />);

        await waitFor(() => expect(screen.getByText("672")).toBeInTheDocument());
        expect(screen.getByText("12.3")).toBeInTheDocument();
        expect(screen.getByText("20")).toBeInTheDocument();
        expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("shows an empty state when the query returns no rows", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: { columns: [], rows: [] },
            fromCache: false,
        });

        render(<KpiStrip />);

        await waitFor(() =>
            expect(screen.getByText(/no kpi data available/i)).toBeInTheDocument(),
        );
    });

    it("shows a destructive banner on query error", async () => {
        mockQuery.mockResolvedValue({
            status: "error",
            error: { message: "401 Unauthorized" },
        });

        render(<KpiStrip />);

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        expect(screen.getByRole("alert")).toHaveTextContent("401 Unauthorized");
    });
});
