//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReorderActionForm } from "@/components/action-center/reorder-action-form";

const mockQuery = vi.fn();
const mockCreate = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        data: {
            ReorderAction: { create: mockCreate },
            ReorderActionAuditLog: { create: mockAuditCreate },
        },
    }),
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
    rows: [[17, "Shipping carton (Brown)", "Contoso", "Brown", 18, "Long Lead Time", 4.25, 6.5, 62.4, 0.34, 1840, 1]],
};

describe("ReorderActionForm", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a loading state while item detail loads", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);
        expect(screen.getByTestId("reorder-form-loading")).toBeInTheDocument();
    });

    it("prefills the suggested reorder qty from the item's detail query", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        expect(await screen.findByLabelText(/quantity/i)).toHaveValue(1840);
    });

    it("lists all five status values in the status dropdown", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        await screen.findByLabelText(/quantity/i);
        const options = Array.from(screen.getByLabelText(/status/i).querySelectorAll("option")).map(
            (o) => (o as HTMLOptionElement).value,
        );
        expect(options).toEqual(["Pending Review", "Approved", "Ordered", "Received", "Dismissed"]);
    });

    it("prefills supplier and assigned-to from their fixed option lists, defaulting assigned-to to the signed-in user", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        expect(await screen.findByLabelText(/supplier/i)).toHaveValue("Contoso Wholesale");
        expect(screen.getByLabelText(/assigned to/i)).toHaveValue("sai@r4k5.onmicrosoft.com");
    });

    it("submits a create call with the entered fields, a fixed 0 for current stock on hand, and the signed-in user as createdBy", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        mockCreate.mockResolvedValue({ id: "new-id" });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        await screen.findByLabelText(/quantity/i);
        fireEvent.change(screen.getByLabelText(/supplier/i), { target: { value: "Tailwind Supply Co." } });
        fireEvent.change(screen.getByLabelText(/assigned to/i), { target: { value: "lahari@r4k5.onmicrosoft.com" } });
        fireEvent.click(screen.getByRole("button", { name: /submit reorder action/i }));

        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                stockItemKey: 17,
                stockItemName: "Shipping carton (Brown)",
                currentStockOnHand: 0,
                suggestedReorderQty: 1840,
                supplierName: "Tailwind Supply Co.",
                status: "Pending Review",
                assignedTo: "lahari@r4k5.onmicrosoft.com",
                createdBy: "sai@r4k5.onmicrosoft.com",
            }),
        );
    });

    it("logs an audit entry against the new record's id after a successful create", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        mockCreate.mockResolvedValue({ id: "new-id" });
        mockAuditCreate.mockResolvedValue({ id: "audit-1" });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        await screen.findByLabelText(/quantity/i);
        fireEvent.click(screen.getByRole("button", { name: /submit reorder action/i }));

        await waitFor(() =>
            expect(mockAuditCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    reorderActionId: "new-id",
                    fieldName: "created",
                    changedBy: "sai@r4k5.onmicrosoft.com",
                }),
            ),
        );
    });

    it("shows a success message after the create call resolves", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        mockCreate.mockResolvedValue({ id: "new-id" });
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        await screen.findByLabelText(/quantity/i);
        fireEvent.click(screen.getByRole("button", { name: /submit reorder action/i }));

        expect(await screen.findByText(/reorder action recorded/i)).toBeInTheDocument();
    });

    it("shows an error message when the create call fails", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: DETAIL_TABLE, fromCache: false });
        mockCreate.mockRejectedValue(new Error("403 Forbidden"));
        render(<ReorderActionForm stockItemKey={17} stockItemName="Shipping carton (Brown)" />);

        await screen.findByLabelText(/quantity/i);
        fireEvent.click(screen.getByRole("button", { name: /submit reorder action/i }));

        expect(await screen.findByRole("alert")).toHaveTextContent("403 Forbidden");
    });
});
