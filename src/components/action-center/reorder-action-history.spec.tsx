//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReorderActionHistory } from "@/components/action-center/reorder-action-history";

const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockAuditCreate = vi.fn();

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        data: {
            ReorderAction: { findMany: mockFindMany, update: mockUpdate },
            ReorderActionAuditLog: { create: mockAuditCreate },
        },
    }),
    REORDER_ACTION_STATUSES: ["Pending Review", "Approved", "Ordered", "Received", "Dismissed"],
}));

vi.mock("@/hooks/auth.context", () => ({
    useAuth: () => ({
        session: { user: { email: "sai@r4k5.onmicrosoft.com" }, isAuthenticated: true, isAnonymous: false },
        isAuthenticated: true,
        isLoading: false,
        error: null,
    }),
}));

const ROW = {
    id: "row-1",
    stockItemKey: 17,
    stockItemName: "Shipping carton (Brown)",
    currentStockOnHand: 50,
    suggestedReorderQty: 1840,
    status: "Pending Review" as const,
    assignedTo: "Priya",
    note: "",
    createdAt: "2026-08-18T10:00:00.000Z",
    createdBy: "sai@r4k5.onmicrosoft.com",
};

describe("ReorderActionHistory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a loading state while fetching", () => {
        mockFindMany.mockReturnValue(new Promise(() => {}));
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);
        expect(screen.getByTestId("reorder-history-loading")).toBeInTheDocument();
    });

    it("shows an empty message when there are no existing actions", async () => {
        mockFindMany.mockResolvedValue([]);
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);
        expect(await screen.findByText(/no reorder actions recorded yet/i)).toBeInTheDocument();
    });

    it("shows an error banner when the fetch fails", async () => {
        mockFindMany.mockRejectedValue(new Error("401 Unauthorized"));
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);
        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });

    it("lists an existing action with its current status selected", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);

        expect(await screen.findByText("Priya")).toBeInTheDocument();
        expect(screen.getByLabelText(/status for row-1/i)).toHaveValue("Pending Review");
    });

    it("calls update with the new status when changed, and reflects it", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        mockUpdate.mockResolvedValue({ ...ROW, status: "Approved" });
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);

        const select = await screen.findByLabelText(/status for row-1/i);
        fireEvent.change(select, { target: { value: "Approved" } });

        await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ id: "row-1" }, { status: "Approved" }));
        expect(select).toHaveValue("Approved");
    });

    it("logs an audit entry for the status change, old value to new value", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        mockUpdate.mockResolvedValue({ ...ROW, status: "Approved" });
        mockAuditCreate.mockResolvedValue({ id: "audit-1" });
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);

        const select = await screen.findByLabelText(/status for row-1/i);
        fireEvent.change(select, { target: { value: "Approved" } });

        await waitFor(() =>
            expect(mockAuditCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    reorderActionId: "row-1",
                    fieldName: "status",
                    oldValue: "Pending Review",
                    newValue: "Approved",
                    changedBy: "sai@r4k5.onmicrosoft.com",
                }),
            ),
        );
    });

    it("does not log an audit entry when the status is unchanged", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        mockUpdate.mockResolvedValue({ ...ROW, status: "Pending Review" });
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);

        const select = await screen.findByLabelText(/status for row-1/i);
        fireEvent.change(select, { target: { value: "Pending Review" } });

        await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
        expect(mockAuditCreate).not.toHaveBeenCalled();
    });

    it("shows an inline error and keeps the list visible when an update fails", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        mockUpdate.mockRejectedValue(new Error("403 Forbidden"));
        render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);

        const select = await screen.findByLabelText(/status for row-1/i);
        fireEvent.change(select, { target: { value: "Approved" } });

        expect(await screen.findByRole("alert")).toHaveTextContent("403 Forbidden");
        // the row is still visible — a failed update doesn't hide the list
        expect(screen.getByText("Priya")).toBeInTheDocument();
        // and the dropdown reverts rather than showing a false success
        expect(select).toHaveValue("Pending Review");
    });

    it("re-fetches when refreshKey changes", async () => {
        mockFindMany.mockResolvedValue([ROW]);
        const { rerender } = render(<ReorderActionHistory stockItemKey={17} refreshKey={0} />);
        await screen.findByText("Priya");

        rerender(<ReorderActionHistory stockItemKey={17} refreshKey={1} />);

        await waitFor(() => expect(mockFindMany).toHaveBeenCalledTimes(2));
    });
});
