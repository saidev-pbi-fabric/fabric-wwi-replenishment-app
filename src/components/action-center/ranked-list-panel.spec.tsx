//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankedListPanel } from "@/components/action-center/ranked-list-panel";
import type { ParetoDataset } from "@/hooks/use-pareto-dataset";

const mockQuery = vi.fn();
const mockDownloadCsv = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

vi.mock("@/lib/csv-export", () => ({
    downloadCsv: (...args: unknown[]) => mockDownloadCsv(...args),
}));

const ROWS: ParetoDataset["rows"] = [
    {
        stockItemKey: 17,
        stockItem: "Shipping carton (Brown)",
        tier: "Long Lead Time",
        reorderValue: 3200000,
        valueSharePct: 0.5,
        cumulativeValuePct: 0.5,
        atRiskRank: 1,
        reorderValueRank: 1,
        suggestedReorderQty: 320,
        qtySharePct: 0.5,
        cumulativeQtyPct: 0.5,
    },
    {
        stockItemKey: 126,
        stockItem: "Pallet wrap 500mm x 300m",
        tier: "Short Lead Time",
        reorderValue: 940000,
        valueSharePct: 0.1,
        cumulativeValuePct: 0.97,
        atRiskRank: 5,
        reorderValueRank: 2,
        suggestedReorderQty: 94,
        qtySharePct: 0.1,
        cumulativeQtyPct: 0.97,
    },
];

function readyDataset(rows = ROWS): ParetoDataset {
    return { status: "ready", usingDevFixture: false, rows, rowsByValueRank: rows };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue({
        status: "success",
        table: { columns: [{ name: "Date[Date]" }, { name: "[Quantity]" }], rows: [] },
        fromCache: false,
    });
});

describe("RankedListPanel", () => {
    it("shows a loading skeleton while the dataset is loading", () => {
        render(
            <RankedListPanel
                dataset={{ status: "loading", usingDevFixture: false, rows: [], rowsByValueRank: [] }}
                rankMode="value"
                selectedStockItemKey={null}
                onSelectItem={vi.fn()}
            />,
        );
        expect(screen.getByTestId("ranked-list-loading")).toBeInTheDocument();
    });

    it("renders every row with its stock item name once loaded", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
    });

    it("calls onSelectItem with the row and its value tier when clicked", async () => {
        const onSelectItem = vi.fn();
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={onSelectItem} />);

        const row = await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(row);

        expect(onSelectItem).toHaveBeenCalledWith(
            expect.objectContaining({ stockItemKey: 17, stockItem: "Shipping carton (Brown)" }),
            "A",
        );
    });

    it("filters client-side by value tier when a tier chip is clicked, without a re-query", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        const callsBeforeFilter = mockQuery.mock.calls.length;

        fireEvent.click(screen.getByRole("button", { name: "Tier C" }));

        expect(screen.queryByText("Shipping carton (Brown)")).not.toBeInTheDocument();
        expect(screen.getByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
        expect(mockQuery.mock.calls.length).toBe(callsBeforeFilter);
    });

    it("shows a tier-aware empty message when a tier has no matching rows", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(screen.getByRole("button", { name: "Tier B" }));

        expect(await screen.findByText(/no items in tier b/i)).toBeInTheDocument();
    });

    it("shows an empty message when the dataset has no rows", async () => {
        render(<RankedListPanel dataset={readyDataset([])} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByText(/no at-risk items/i)).toBeInTheDocument();
    });

    it("shows an error banner when the dataset fails to load", async () => {
        render(
            <RankedListPanel
                dataset={{ status: "error", usingDevFixture: false, rows: [], rowsByValueRank: [] }}
                rankMode="value"
                selectedStockItemKey={null}
                onSelectItem={vi.fn()}
            />,
        );

        expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("bounds the panel height so a long list scrolls internally instead of growing the page", async () => {
        const { container } = render(
            <RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />,
        );

        await screen.findByText("Shipping carton (Brown)");

        // Viewport-relative height (not a fixed 640px cap, per user feedback that the list was
        // cutting off early with room to spare) but still bounded + internally scrollable, not
        // free to grow the whole page.
        expect(container.firstElementChild?.className).toMatch(/h-\[calc\(100vh-/);
        expect(container.firstElementChild?.className).toMatch(/overflow-hidden/);
    });

    it("filters rows client-side by name as the user types, without a re-query", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        const callsBeforeSearch = mockQuery.mock.calls.length;

        fireEvent.change(screen.getByLabelText("Search items by name"), { target: { value: "pallet" } });

        expect(screen.queryByText("Shipping carton (Brown)")).not.toBeInTheDocument();
        expect(screen.getByText("Pallet wrap 500mm x 300m")).toBeInTheDocument();
        expect(mockQuery.mock.calls.length).toBe(callsBeforeSearch);
    });

    it("shows a search-aware empty message when no item matches the query", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.change(screen.getByLabelText("Search items by name"), { target: { value: "zzz-no-match" } });

        expect(await screen.findByText(/no items match "zzz-no-match"/i)).toBeInTheDocument();
    });

    it("downloads a CSV of the currently visible (filtered) rows", async () => {
        render(<RankedListPanel dataset={readyDataset()} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.change(screen.getByLabelText("Search items by name"), { target: { value: "pallet" } });
        fireEvent.click(screen.getByRole("button", { name: /csv/i }));

        expect(mockDownloadCsv).toHaveBeenCalledWith(
            "at-risk-items.csv",
            ["Rank", "Item", "Value Tier", "Reorder Value"],
            [[2, "Pallet wrap 500mm x 300m", "C", "940000.00"]],
        );
    });

    it("disables the CSV button when there are no rows to export", async () => {
        render(<RankedListPanel dataset={readyDataset([])} rankMode="value" selectedStockItemKey={null} onSelectItem={vi.fn()} />);

        expect(await screen.findByRole("button", { name: /csv/i })).toBeDisabled();
    });
});
