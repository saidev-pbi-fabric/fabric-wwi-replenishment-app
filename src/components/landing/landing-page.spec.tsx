//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LandingPage } from "@/components/landing/landing-page";

const mockQuery = vi.fn();

vi.mock("@/lib/fabric-client", () => ({
    getFabricClient: () => ({
        clearCache: vi.fn(),
        semanticModel: () => ({ query: mockQuery, clearCache: vi.fn() }),
    }),
}));

const KPI_TABLE = {
    columns: [
        { name: "[Items Tracked]" },
        { name: "[Avg Lead Time Days]" },
        { name: "[Top At Risk Items]" },
        { name: "[Accelerating Demand Items]" },
    ],
    rows: [[672, 12.3, 20, 15]],
};

const TOP_ITEMS_TABLE = {
    columns: [
        { name: "Stock Item[Stock Item]" },
        { name: "Stock Item[Lead Time Priority Tier]" },
        { name: "[Suggested Reorder Qty]" },
        { name: "[Demand Trend]" },
        { name: "[At Risk Rank]" },
    ],
    rows: [
        ["Shipping carton (Brown)", "Long Lead Time", 1840, 0.34, 1],
        ["Bubble wrap 500mm x 10m", "Long Lead Time", 1620, 0.28, 2],
        ["Packing tape 48mm x 100m", "Medium Lead Time", 1310, 0.22, 3],
    ],
};

describe("LandingPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows a static heading and the one-liner pitch when no data is loaded yet", () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "no embed" } });
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByRole("heading", { name: /wwi replenishment/i })).toBeInTheDocument();
        expect(screen.getByText(/sales velocity vs\. supplier lead time/i)).toBeInTheDocument();
    });

    it("leads with the real at-risk count once KPI data loads, instead of static copy", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: KPI_TABLE, fromCache: false });
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(await screen.findByText(/20/)).toBeInTheDocument();
        expect(screen.getByText(/items need attention/i)).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: /^wwi replenishment$/i })).not.toBeInTheDocument();
    });

    it("shows a glimpse of the real top at-risk items once loaded", async () => {
        mockQuery.mockImplementation((query: string) =>
            Promise.resolve(
                query.includes("TOPN")
                    ? { status: "success", table: TOP_ITEMS_TABLE, fromCache: false }
                    : { status: "success", table: KPI_TABLE, fromCache: false },
            ),
        );
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(await screen.findByText("Shipping carton (Brown)")).toBeInTheDocument();
        expect(screen.getByText("Bubble wrap 500mm x 10m")).toBeInTheDocument();
        expect(screen.getByText("Packing tape 48mm x 100m")).toBeInTheDocument();
    });

    it("explains the problem the app solves", () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "no embed" } });
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText(/the problem/i)).toBeInTheDocument();
    });

    it("discloses that replenishment risk is a proxy signal, not real stock data", () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "no embed" } });
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText(/disclosed proxy/i)).toBeInTheDocument();
        expect(screen.getByText(/wide world importers/i)).toBeInTheDocument();
    });

    it("calls onOpenDashboard when the primary CTA is clicked", () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "no embed" } });
        const onOpenDashboard = vi.fn();
        render(<LandingPage onOpenDashboard={onOpenDashboard} />);

        fireEvent.click(screen.getByRole("button", { name: /open the dashboard/i }));

        expect(onOpenDashboard).toHaveBeenCalledOnce();
    });
});
