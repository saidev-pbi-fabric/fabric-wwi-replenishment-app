//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActionCenter } from "@/components/action-center/action-center";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        data: { ReorderAction: { create: vi.fn() } },
    }),
}));

vi.mock("@/hooks/auth.context", () => ({
    useAuth: () => ({
        session: { user: { email: "sai@r4k5.onmicrosoft.com" }, isAuthenticated: true, isAnonymous: false },
        isAuthenticated: true,
        isLoading: false,
        error: null,
    }),
}));

const LIST_TABLE = {
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

const DETAIL_TABLE = {
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
    rows: [[126, "Pallet wrap 500mm x 300m", "Contoso", "Clear", 6, "Short Lead Time", 2.1, 3.4, 20.1, 0.15, 940, 5]],
};

describe("ActionCenter", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows the detail placeholder when nothing is selected yet", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: LIST_TABLE, fromCache: false });
        render(<ActionCenter initialSelectedItemName={null} />);

        await screen.findByText("Shipping carton (Brown)");
        expect(screen.getByText(/select an item/i)).toBeInTheDocument();
    });

    it("selects the item clicked in the list and shows its detail", async () => {
        mockQuery.mockImplementation((query: string) =>
            Promise.resolve({
                status: "success",
                table: query.includes("126") ? DETAIL_TABLE : LIST_TABLE,
                fromCache: false,
            }),
        );
        render(<ActionCenter initialSelectedItemName={null} />);

        const row = await screen.findByText("Pallet wrap 500mm x 300m");
        fireEvent.click(row);

        expect(await screen.findByText("Contoso")).toBeInTheDocument();
    });

    it("auto-selects the item handed off from Page 1's click-through", async () => {
        mockQuery.mockImplementation((query: string) =>
            Promise.resolve({
                status: "success",
                table: query.includes("126") ? DETAIL_TABLE : LIST_TABLE,
                fromCache: false,
            }),
        );
        render(<ActionCenter initialSelectedItemName="Pallet wrap 500mm x 300m" />);

        expect(await screen.findByText("Contoso")).toBeInTheDocument();
    });
});
