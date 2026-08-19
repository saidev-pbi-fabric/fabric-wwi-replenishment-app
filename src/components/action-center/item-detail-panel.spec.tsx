//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ItemDetailPanel } from "@/components/action-center/item-detail-panel";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

const TABLE = {
    columns: [
        { name: "Stock Item[Stock Item Key]" },
        { name: "Stock Item[Stock Item]" },
        { name: "Stock Item[Brand]" },
        { name: "Stock Item[Color]" },
        { name: "Stock Item[Lead Time Days]" },
        { name: "Stock Item[Lead Time Priority Tier]" },
        { name: "Stock Item[Unit Price]" },
        { name: "Stock Item[Recommended Retail Price]" },
        { name: "[Recent Daily Sales Rate]" },
        { name: "[Demand Trend]" },
        { name: "[Suggested Reorder Qty]" },
        { name: "[At Risk Rank]" },
    ],
    rows: [[17, "Shipping carton (Brown)", "Contoso", "Brown", 18, "Long Lead Time", 4.25, 6.5, 62.4, 0.34, 1840, 1]],
};

const TREND_TABLE = {
    columns: [{ name: "Date[Date]" }, { name: "[Quantity]" }],
    rows: [
        ["2000-11-01", 55],
        ["2000-11-02", 58],
        ["2000-11-03", 61],
    ],
};

/** Routes the shared mockQuery by query text — item-sales-trend.dax is the only query with "Quantity". */
function mockBothQueries() {
    mockQuery.mockImplementation((query: string) =>
        Promise.resolve(
            query.includes("Quantity")
                ? { status: "success", table: TREND_TABLE, fromCache: false }
                : { status: "success", table: TABLE, fromCache: false },
        ),
    );
}

describe("ItemDetailPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a placeholder prompt when nothing is selected", () => {
        render(<ItemDetailPanel stockItemKey={null} />);
        expect(screen.getByText(/select an item/i)).toBeInTheDocument();
    });

    it("shows a loading skeleton while the query is in flight", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<ItemDetailPanel stockItemKey={17} />);
        expect(screen.getByTestId("item-detail-loading")).toBeInTheDocument();
    });

    it("renders the item's name, tier, and key fields once loaded", async () => {
        mockBothQueries();
        render(<ItemDetailPanel stockItemKey={17} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Long Lead Time")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("1,840")).toBeInTheDocument();
    });

    it("renders a plain-English rationale sentence composed from the same fields", async () => {
        mockBothQueries();
        render(<ItemDetailPanel stockItemKey={17} />);

        expect(
            await screen.findByText(/Sells 62\.4\/day, restocks in 18 days, demand accelerating \(\+34%\), ranked #1 of 672\./),
        ).toBeInTheDocument();
    });

    it("renders the sales-trend sparkline once the trend query loads", async () => {
        mockBothQueries();
        render(<ItemDetailPanel stockItemKey={17} />);

        await screen.findByText("Shipping carton (Brown)");
        expect(await screen.findByRole("img", { name: /daily units sold/i })).toBeInTheDocument();
    });

    it("shows an error banner when the query fails", async () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "401 Unauthorized" } });
        render(<ItemDetailPanel stockItemKey={17} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });

    it("re-queries both the detail and trend data when the selected key changes", async () => {
        mockBothQueries();
        const { rerender } = render(<ItemDetailPanel stockItemKey={17} />);
        await screen.findByText("Shipping carton (Brown)");

        rerender(<ItemDetailPanel stockItemKey={126} />);

        // One call each for item-detail and item-sales-trend, per key.
        await waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(4));
    });

    // Regression: switching the selected item used to swap the whole panel
    // for a blank skeleton while the new query was in flight (user: "the
    // transition ... goes blank"). It should keep the previous item's detail
    // visible (dimmed, with an "Updating" spinner) instead of going blank.
    it("keeps showing the previous item's detail (dimmed) instead of a blank skeleton while re-querying", async () => {
        let resolveSecondDetail: (value: unknown) => void = () => {};
        let detailCallCount = 0;
        mockQuery.mockImplementation((query: string) => {
            if (query.includes("Quantity")) {
                return Promise.resolve({ status: "success", table: TREND_TABLE, fromCache: false });
            }
            detailCallCount += 1;
            if (detailCallCount === 1) {
                return Promise.resolve({ status: "success", table: TABLE, fromCache: false });
            }
            return new Promise((resolve) => (resolveSecondDetail = resolve));
        });
        const { rerender } = render(<ItemDetailPanel stockItemKey={17} />);

        await screen.findByText("Shipping carton (Brown)");
        rerender(<ItemDetailPanel stockItemKey={126} />);

        expect(await screen.findByLabelText("Updating")).toBeInTheDocument();
        expect(screen.getByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.queryByTestId("item-detail-loading")).not.toBeInTheDocument();

        resolveSecondDetail({ status: "success", table: TABLE, fromCache: false });
        await waitFor(() => expect(screen.queryByLabelText("Updating")).not.toBeInTheDocument());
    });

    it("omits the brand/color line when the source data has no real brand or color", async () => {
        const tableWithoutBrandColor = {
            columns: TABLE.columns,
            rows: [[17, "Shipping carton (Brown)", "N/A", "N/A", 18, "Long Lead Time", 4.25, 6.5, 62.4, 0.34, 1840, 1]],
        };
        mockQuery.mockImplementation((query: string) =>
            Promise.resolve(
                query.includes("Quantity")
                    ? { status: "success", table: TREND_TABLE, fromCache: false }
                    : { status: "success", table: tableWithoutBrandColor, fromCache: false },
            ),
        );
        render(<ItemDetailPanel stockItemKey={17} />);

        await screen.findByText("Shipping carton (Brown)");

        expect(screen.queryByText("N/A", { exact: false })).not.toBeInTheDocument();
    });
});
