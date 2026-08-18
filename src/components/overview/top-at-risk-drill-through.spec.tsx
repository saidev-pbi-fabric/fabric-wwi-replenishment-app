//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopAtRiskDrillThrough } from "@/components/overview/top-at-risk-drill-through";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

const TABLE = {
    columns: [
        { name: "Stock Item[Stock Item]" },
        { name: "Stock Item[Lead Time Priority Tier]" },
        { name: "Stock Item[Lead Time Days]" },
        { name: "[Suggested Reorder Qty]" },
        { name: "[Demand Trend]" },
        { name: "[At Risk Rank]" },
    ],
    rows: [
        ["Shipping carton (Brown)", "Long Lead Time", 18, 1840, 0.34, 1],
        ["Bubble wrap 500mm x 10m", "Long Lead Time", 21, 1620, 0.28, 2],
    ],
};

describe("TopAtRiskDrillThrough", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing when closed", () => {
        render(<TopAtRiskDrillThrough open={false} onClose={vi.fn()} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    it("shows the full ranked table when open", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        render(<TopAtRiskDrillThrough open onClose={vi.fn()} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Bubble wrap 500mm x 10m")).toBeInTheDocument();
        expect(screen.getByText("#1")).toBeInTheDocument();
        expect(screen.getByText("1,840")).toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const onClose = vi.fn();
        render(<TopAtRiskDrillThrough open onClose={onClose} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(screen.getByRole("button", { name: /close/i }));

        expect(onClose).toHaveBeenCalledOnce();
    });

    it("calls onClose when the backdrop is clicked", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const onClose = vi.fn();
        render(<TopAtRiskDrillThrough open onClose={onClose} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(screen.getByRole("dialog"));

        expect(onClose).toHaveBeenCalledOnce();
    });

    it("does not close when clicking inside the panel", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const onClose = vi.fn();
        render(<TopAtRiskDrillThrough open onClose={onClose} />);

        const name = await screen.findByText("Shipping carton (Brown)");
        fireEvent.click(name);

        expect(onClose).not.toHaveBeenCalled();
    });

    it("calls onClose on Escape", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TABLE, fromCache: false });
        const onClose = vi.fn();
        render(<TopAtRiskDrillThrough open onClose={onClose} />);

        await screen.findByText("Shipping carton (Brown)");
        fireEvent.keyDown(document, { key: "Escape" });

        expect(onClose).toHaveBeenCalledOnce();
    });

    it("shows an error message when the query fails", async () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "401 Unauthorized" } });
        render(<TopAtRiskDrillThrough open onClose={vi.fn()} />);

        expect(await screen.findByRole("alert")).toHaveTextContent("401 Unauthorized");
    });
});
