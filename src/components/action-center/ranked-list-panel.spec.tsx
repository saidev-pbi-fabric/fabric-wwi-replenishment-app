//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RankedListPanel } from "@/components/action-center/ranked-list-panel";

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
        { name: "Stock Item[Lead Time Priority Tier]" },
        { name: "[Suggested Reorder Qty]" },
        { name: "[Demand Trend]" },
        { name: "[At Risk Rank]" },
    ],
    rows: [
        [17, "Shipping carton (Brown)", "Long Lead Time", 1840, 0.34, 1],
        [126, "Pallet wrap 500mm x 300m", "Short Lead Time", 940, 0.15, 5],
    ],
};

describe("RankedListPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a loading skeleton while the query is in flight", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);
        expect(screen.getByTestId("ranked-list-loading")).toBeInTheDocument();
    });

    it("renders every row with its stock item name once loaded", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
    });

    it("calls onSelectItem with the row's key, name, and tier when clicked", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const onSelectItem = vi.fn();
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={onSelectItem} />);

        const row = await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(row);

        expect(onSelectItem).toHaveBeenCalledWith(17, "Shipping carton (Brown)", "Long Lead Time");
    });

    // Regression: this used to fetch one global TOPN(25) and filter it
    // client-side by tier. On the real data, Medium Lead Time dominates the
    // top of At Risk Rank, so Long/Short tiers didn't appear in that top-25
    // at all — selecting "Short" or "Long" showed zero rows even though real
    // items exist in those tiers further down the full ranking. The filter
    // now re-queries server-side per tier instead of slicing a shared list.
    it("re-queries server-side (not just re-filters client-side) when the tier filter changes", async () => {
        const shortOnlyTable = {
            columns: TABLE.columns,
            rows: [[126, "Pallet wrap 500mm x 300m", "Short Lead Time", 940, 0.15, 5]],
        };
        mockQuery.mockImplementation((query: string) =>
            Promise.resolve({
                status: "success",
                table: query.includes('"Short Lead Time"') ? shortOnlyTable : TABLE,
                fromCache: false,
            }),
        );
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.change(screen.getByLabelText("Filter by lead time"), { target: { value: "Short Lead Time" } });

        expect(await screen.findByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
        expect(screen.queryByText("Shipping carton (Brown)")).not.toBeInTheDocument();
        expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('"Short Lead Time"'), expect.anything());
    });

    // Regression: selecting a new tier used to swap the whole list for a
    // blank skeleton while the new query was in flight (user: "the
    // transition ... goes blank"). It should keep the previous rows visible
    // (dimmed, with an "Updating" spinner) instead of going blank.
    it("keeps showing the previous rows (dimmed) instead of a blank skeleton while a new tier query is in flight", async () => {
        // Per-row sparkline fetches share this same mock, and fire (2 of them, one per TABLE row)
        // right after the list loads -- routing them past the list-query sequencing below by
        // query shape (itemSalesTrend.dax's distinguishing "'Sale'[Stock Item Key] =" filter)
        // instead of positional .mockResolvedValueOnce/.mockImplementationOnce, which would
        // otherwise get consumed by the sparkline calls instead of the real re-query.
        let resolveSecond: (value: unknown) => void = () => {};
        let listCallCount = 0;
        mockQuery.mockImplementation((query: string) => {
            if (query.includes("'Sale'[Stock Item Key]")) {
                return Promise.resolve({
                    status: "success",
                    table: { columns: [{ name: "Date[Date]" }, { name: "[Quantity]" }], rows: [] },
                    fromCache: false,
                });
            }
            listCallCount += 1;
            if (listCallCount === 1) return Promise.resolve({ status: "success", table: TABLE, fromCache: false });
            return new Promise((resolve) => (resolveSecond = resolve));
        });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.change(screen.getByLabelText("Filter by lead time"), { target: { value: "Short Lead Time" } });

        expect(await screen.findByLabelText("Updating")).toBeInTheDocument();
        expect(screen.getByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.queryByTestId("ranked-list-loading")).not.toBeInTheDocument();

        resolveSecond({
            status: "success",
            table: { columns: TABLE.columns, rows: [TABLE.rows[1]] },
            fromCache: false,
        });
        await waitFor(() => expect(screen.queryByLabelText("Updating")).not.toBeInTheDocument());
    });

    it("shows a filter-aware empty message when a tier genuinely has no matching rows", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: { columns: TABLE.columns, rows: [] }, fromCache: false });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        fireEvent.change(await screen.findByLabelText("Filter by lead time"), {
            target: { value: "Long Lead Time" },
        });

        expect(await screen.findByText(/no at-risk items match "long"/i)).toBeInTheDocument();
    });

    it("shows an empty message when the query returns no rows", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: { columns: TABLE.columns, rows: [] }, fromCache: false });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByText(/no at-risk items/i)).toBeInTheDocument();
    });

    it("shows an error banner when the query fails", async () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "401 Unauthorized" } });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });

    it("bounds the panel height so a long list scrolls internally instead of growing the page", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const { container } = render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");

        expect(container.firstElementChild?.className).toMatch(/max-h-/);
    });
});
