//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SalesTrendChart } from "./sales-trend-chart";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

vi.mock("@microsoft/fabric-visuals", () => ({
    VegaVisual: ({ data }: { data: unknown }) => (
        <div data-testid="vega-visual">{JSON.stringify(data)}</div>
    ),
    useCssTheme: () => ({}),
}));

describe("SalesTrendChart", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders a skeleton while loading", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<SalesTrendChart />);
        expect(screen.queryByTestId("vega-visual")).not.toBeInTheDocument();
    });

    it("passes the query result through to VegaVisual on success", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: {
                columns: [{ name: "Date[Date]" }, { name: "[Total Quantity]" }],
                rows: [["2000-01-01", 10]],
            },
            fromCache: false,
        });

        render(<SalesTrendChart />);

        await waitFor(() => expect(screen.getByTestId("vega-visual")).toBeInTheDocument());
        expect(screen.getByTestId("vega-visual").textContent).toContain("TotalQuantity");
    });

    it("shows an empty state when there are no rows", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: { columns: [], rows: [] },
            fromCache: false,
        });

        render(<SalesTrendChart />);

        await waitFor(() =>
            expect(screen.getByText(/no sales trend data/i)).toBeInTheDocument(),
        );
    });

    it("shows a destructive banner on query error", async () => {
        mockQuery.mockResolvedValue({
            status: "error",
            error: { message: "401 Unauthorized" },
        });

        render(<SalesTrendChart />);

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        expect(screen.getByRole("alert")).toHaveTextContent("401 Unauthorized");
    });
});
