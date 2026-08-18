//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { InteractionEventCallback } from "@microsoft/fabric-visuals-core";
import { TopAtRiskList } from "./top-at-risk-list";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

vi.mock("@microsoft/fabric-visuals", () => ({
    VegaVisual: ({ onInteraction }: { onInteraction?: InteractionEventCallback }) => (
        <button
            type="button"
            data-testid="fake-bar"
            onClick={() =>
                onInteraction?.([
                    {
                        action: "select",
                        selections: [
                            {
                                predicates: [
                                    { type: "set", name: "StockItem", values: ["Widget A"] },
                                ],
                            },
                        ],
                    },
                ])
            }
        >
            chart
        </button>
    ),
    useCssTheme: () => ({}),
}));

const successResult = {
    status: "success" as const,
    table: {
        columns: [
            { name: "Stock Item[Stock Item]" },
            { name: "Stock Item[Lead Time Priority Tier]" },
            { name: "[Suggested Reorder Qty]" },
            { name: "[Demand Trend]" },
            { name: "[At Risk Rank]" },
        ],
        rows: [["Widget A", "Short Lead Time", 42, 0.1, 1]],
    },
    fromCache: false,
};

describe("TopAtRiskList", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders a skeleton while loading", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<TopAtRiskList />);
        expect(screen.queryByTestId("fake-bar")).not.toBeInTheDocument();
    });

    it("calls onSelectItem with the stock item name when a bar is selected", async () => {
        mockQuery.mockResolvedValue(successResult);
        const onSelectItem = vi.fn();

        render(<TopAtRiskList onSelectItem={onSelectItem} />);

        await waitFor(() => expect(screen.getByTestId("fake-bar")).toBeInTheDocument());
        fireEvent.click(screen.getByTestId("fake-bar"));

        expect(onSelectItem).toHaveBeenCalledWith("Widget A");
    });

    it("shows an empty state when there are no rows", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: { columns: [], rows: [] },
            fromCache: false,
        });

        render(<TopAtRiskList />);

        await waitFor(() => expect(screen.getByText(/no at-risk items/i)).toBeInTheDocument());
    });

    it("shows a destructive banner on query error", async () => {
        mockQuery.mockResolvedValue({
            status: "error",
            error: { message: "401 Unauthorized" },
        });

        render(<TopAtRiskList />);

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        expect(screen.getByRole("alert")).toHaveTextContent("401 Unauthorized");
    });
});
