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
        data: {
            ReorderAction: {
                create: vi.fn(),
                select: vi.fn(() => ({ where: vi.fn(() => ({ execute: vi.fn().mockResolvedValue([]) })) })),
                update: vi.fn(),
            },
            ReorderActionAuditLog: {
                select: vi.fn(() => ({ where: vi.fn(() => ({ execute: vi.fn().mockResolvedValue([]) })) })),
            },
        },
    }),
    REORDER_ACTION_FIELDS: [
        "id",
        "stockItemKey",
        "stockItemName",
        "currentStockOnHand",
        "suggestedReorderQty",
        "supplierKey",
        "supplierName",
        "status",
        "note",
        "assignedTo",
        "createdAt",
        "createdBy",
    ],
    REORDER_ACTION_AUDIT_LOG_FIELDS: ["id", "reorderActionId", "fieldName", "oldValue", "newValue", "changedAt", "changedBy"],
    REORDER_ACTION_STATUSES: ["Pending Review", "Approved", "Ordered", "Received", "Dismissed"],
    ASSIGNED_TO_OPTIONS: [
        { email: "sai@r4k5.onmicrosoft.com", name: "Sai Dev" },
        { email: "adh@r4k5.onmicrosoft.com", name: "Santosh Pothnak" },
        { email: "bharath@r4k5.onmicrosoft.com", name: "Bharath Thodupunuri" },
        { email: "lahari@r4k5.onmicrosoft.com", name: "Lahari Reddy" },
    ],
    SUPPLIER_OPTIONS: ["Contoso Wholesale", "Fabrikam Distribution", "Northwind Traders", "Tailwind Supply Co.", "Wide World Suppliers"],
}));

vi.mock("@/hooks/auth.context", () => ({
    useAuth: () => ({
        session: { user: { email: "sai@r4k5.onmicrosoft.com" }, isAuthenticated: true, isAnonymous: false },
        isAuthenticated: true,
        isLoading: false,
        error: null,
    }),
}));

const PARETO_TABLE = {
    columns: [
        { name: "Stock Item[Stock Item Key]" },
        { name: "Stock Item[Stock Item]" },
        { name: "Stock Item[Lead Time Priority Tier]" },
        { name: "[Reorder Value]" },
        { name: "[Value Share %]" },
        { name: "[Cumulative Value %]" },
        { name: "[At Risk Rank]" },
        { name: "[Reorder Value Rank]" },
        { name: "[Suggested Reorder Qty]" },
        { name: "[Qty Share %]" },
        { name: "[Cumulative Qty %]" },
    ],
    rows: [
        [17, "Shipping carton (Brown)", "Long Lead Time", 3200000, 0.5, 0.5, 1, 1, 320, 0.5, 0.5],
        [126, "Pallet wrap 500mm x 300m", "Short Lead Time", 940000, 0.1, 0.97, 5, 2, 94, 0.1, 0.97],
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

const EMPTY_TREND_TABLE = { columns: [{ name: "Date[Date]" }, { name: "[Quantity]" }], rows: [] };

function mockAllQueries() {
    mockQuery.mockImplementation((query: string) => {
        if (query.includes("Quantity")) {
            return Promise.resolve({ status: "success", table: EMPTY_TREND_TABLE, fromCache: false });
        }
        if (query.includes("126")) {
            return Promise.resolve({ status: "success", table: DETAIL_TABLE, fromCache: false });
        }
        return Promise.resolve({ status: "success", table: PARETO_TABLE, fromCache: false });
    });
}

describe("ActionCenter", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows the detail placeholder when nothing is selected yet", async () => {
        mockAllQueries();
        render(<ActionCenter rankMode="value" initialSelectedItemName={null} />);

        await screen.findByText("Shipping carton (Brown)");
        expect(screen.getByText(/select an item/i)).toBeInTheDocument();
    });

    it("selects the item clicked in the list and shows its detail", async () => {
        mockAllQueries();
        render(<ActionCenter rankMode="value" initialSelectedItemName={null} />);

        const row = await screen.findByText("Pallet wrap 500mm x 300m");
        fireEvent.click(row);

        expect(await screen.findByText(/Tier C · rank #2 of 2 by \$ value/)).toBeInTheDocument();
    });

    it("auto-selects the item handed off from Page 1's click-through", async () => {
        mockAllQueries();
        render(<ActionCenter rankMode="value" initialSelectedItemName="Pallet wrap 500mm x 300m" />);

        expect(await screen.findByText(/Tier C · rank #2 of 2 by \$ value/)).toBeInTheDocument();
    });
});
