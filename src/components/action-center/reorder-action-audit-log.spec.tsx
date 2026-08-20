//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReorderActionAuditLogPanel } from "@/components/action-center/reorder-action-audit-log";

const mockActionFindMany = vi.fn();
const mockAuditFindMany = vi.fn();

vi.mock("@/lib/rayfin-client", () => ({
    getRayfinClient: () => ({
        data: {
            ReorderAction: { findMany: mockActionFindMany },
            ReorderActionAuditLog: { findMany: mockAuditFindMany },
        },
    }),
}));

const ACTION = { id: "action-1", stockItemKey: 17 };

const ENTRY_OLD = {
    id: "entry-1",
    reorderActionId: "action-1",
    fieldName: "created",
    changedAt: "2026-08-19T16:15:00.000Z",
    changedBy: "sai@r4k5.onmicrosoft.com",
};
const ENTRY_NEW = {
    id: "entry-2",
    reorderActionId: "action-1",
    fieldName: "status",
    oldValue: "Pending Review",
    newValue: "Approved",
    changedAt: "2026-08-20T14:02:00.000Z",
    changedBy: "sai@r4k5.onmicrosoft.com",
};

describe("ReorderActionAuditLogPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a loading state while fetching", () => {
        mockActionFindMany.mockReturnValue(new Promise(() => {}));
        render(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={0} />);
        expect(screen.getByTestId("audit-log-loading")).toBeInTheDocument();
    });

    it("shows an empty message when there are no reorder actions for this item", async () => {
        mockActionFindMany.mockResolvedValue([]);
        render(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={0} />);
        expect(await screen.findByText(/no changes recorded yet/i)).toBeInTheDocument();
    });

    it("shows an error banner when the fetch fails", async () => {
        mockActionFindMany.mockRejectedValue(new Error("401 Unauthorized"));
        render(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={0} />);
        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });

    it("merges entries across all of the item's reorder actions, newest first", async () => {
        mockActionFindMany.mockResolvedValue([ACTION]);
        mockAuditFindMany.mockResolvedValue([ENTRY_OLD, ENTRY_NEW]);
        render(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={0} />);

        const items = await screen.findAllByRole("listitem");
        expect(items).toHaveLength(2);
        expect(items[0]).toHaveTextContent("status:");
        expect(items[0]).toHaveTextContent("Pending Review");
        expect(items[0]).toHaveTextContent("Approved");
        expect(items[1]).toHaveTextContent("created");
    });

    it("re-fetches when refreshKey changes", async () => {
        mockActionFindMany.mockResolvedValue([ACTION]);
        mockAuditFindMany.mockResolvedValue([ENTRY_OLD]);
        const { rerender } = render(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={0} />);
        await screen.findByText(/created/i);

        rerender(<ReorderActionAuditLogPanel stockItemKey={17} refreshKey={1} />);

        await waitFor(() => expect(mockActionFindMany).toHaveBeenCalledTimes(2));
    });
});
