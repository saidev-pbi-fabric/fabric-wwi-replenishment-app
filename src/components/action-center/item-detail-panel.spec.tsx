//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        render(<ItemDetailPanel stockItemKey={17} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Long Lead Time")).toBeInTheDocument();
        expect(screen.getByText("18")).toBeInTheDocument();
        expect(screen.getByText("1,840")).toBeInTheDocument();
    });

    it("shows an error banner when the query fails", async () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "401 Unauthorized" } });
        render(<ItemDetailPanel stockItemKey={17} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });

    it("re-queries when the selected key changes", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const { rerender } = render(<ItemDetailPanel stockItemKey={17} />);
        await screen.findByText("Shipping carton (Brown)");

        rerender(<ItemDetailPanel stockItemKey={126} />);

        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("omits the brand/color line when the source data has no real brand or color", async () => {
        const tableWithoutBrandColor = {
            columns: TABLE.columns,
            rows: [[17, "Shipping carton (Brown)", "N/A", "N/A", 18, "Long Lead Time", 4.25, 6.5, 62.4, 0.34, 1840, 1]],
        };
        mockQuery.mockResolvedValue({ status: "success", table: tableWithoutBrandColor, fromCache: false });
        render(<ItemDetailPanel stockItemKey={17} />);

        await screen.findByText("Shipping carton (Brown)");

        expect(screen.queryByText("N/A", { exact: false })).not.toBeInTheDocument();
    });
});
