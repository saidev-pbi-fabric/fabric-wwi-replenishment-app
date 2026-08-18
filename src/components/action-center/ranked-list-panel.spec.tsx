//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

    it("filters rows client-side by lead time tier", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        render(<RankedListPanel selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.change(screen.getByLabelText("Filter by lead time"), { target: { value: "Short Lead Time" } });

        expect(screen.queryByText("Shipping carton (Brown)")).not.toBeInTheDocument();
        expect(screen.getByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
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
});
