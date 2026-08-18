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

    // Regression: the hero used to lead with a large animated at-risk count
    // ("20 items need attention"). User feedback: "we don't need any numbers
    // here in the first place ... it needs to give you the direction only."
    // The headline is now a fixed directional statement, not data-driven —
    // it must render identically whether or not the query has resolved.
    it("always shows the directional headline and the one-liner pitch, regardless of data state", () => {
        mockQuery.mockResolvedValue({ status: "error", error: { message: "no embed" } });
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(
            screen.getByRole("heading", { name: /know what's at risk\. decide what to do about it\./i }),
        ).toBeInTheDocument();
        expect(screen.getByText(/sales velocity vs\. supplier lead time/i)).toBeInTheDocument();
        expect(screen.queryByText(/items need attention/i)).not.toBeInTheDocument();
    });

    it("shows a glimpse of the real top at-risk items once loaded", async () => {
        mockQuery.mockResolvedValue({ status: "success", table: TOP_ITEMS_TABLE, fromCache: false });
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
