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
        semanticModel: () => ({
            query: mockQuery,
            clearCache: vi.fn(),
        }),
    }),
}));

describe("LandingPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQuery.mockReturnValue(new Promise(() => {})); // pending by default -- individual tests override
    });

    // Regression: the hero used to lead with a large animated at-risk count
    // ("20 items need attention"). User feedback: "we don't need any numbers
    // here in the first place ... it needs to give you the direction only."
    // The headline is a fixed directional statement, not data-driven.
    it("shows the directional headline and the one-liner pitch", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(
            screen.getByRole("heading", {
                name: /twenty percent of your catalog is carrying eighty percent of the reorder risk\./i,
            }),
        ).toBeInTheDocument();
        expect(screen.getByText(/sales velocity against supplier lead time/i)).toBeInTheDocument();
        expect(screen.queryByText(/items need attention/i)).not.toBeInTheDocument();
    });

    // Copy locked against docs/mockup-reference.html's #page-landing .steps section.
    it("shows the three locked steps", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText("See the concentration")).toBeInTheDocument();
        expect(screen.getByText("Drill into one item")).toBeInTheDocument();
        expect(screen.getByText("Log the reorder")).toBeInTheDocument();
    });

    it("calls onOpenDashboard when the primary CTA is clicked", () => {
        const onOpenDashboard = vi.fn();
        render(<LandingPage onOpenDashboard={onOpenDashboard} />);

        fireEvent.click(screen.getByRole("button", { name: /open the dashboard/i }));

        expect(onOpenDashboard).toHaveBeenCalledOnce();
    });

    it("renders the live KPI teaser tiles once the query resolves", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: {
                columns: [
                    { name: "[Items Tracked]" },
                    { name: "[Avg Lead Time Days]" },
                    { name: "[Accelerating Demand Items]" },
                ],
                rows: [[219, 12.3, 164]],
            },
            fromCache: false,
        });

        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(await screen.findByText("219")).toBeInTheDocument();
        expect(screen.getByText("12.3")).toBeInTheDocument();
        expect(screen.getByText("164")).toBeInTheDocument();
    });

    it("renders nothing for the KPI teaser when the query errors, rather than a broken tile", async () => {
        mockQuery.mockResolvedValue({ status: "error", message: "boom" });

        render(<LandingPage onOpenDashboard={vi.fn()} />);

        // Nothing to await on success, so assert against the rest of the page having settled --
        // the three tiles never appear, no error alert shown either (dashboard itself owns that).
        await screen.findByText("See the concentration");
        expect(screen.queryByText("Items tracked")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("shows the three disclosed-honesty points, reusing the app's own real claims", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText(/a disclosed proxy, not an inventory system/i)).toBeInTheDocument();
        expect(screen.getByText(/live numbers, not staged ones/i)).toBeInTheDocument();
        expect(screen.getByText(/no forecasting pretense/i)).toBeInTheDocument();
    });

    it("shows the closing band with the dataset/tech credit", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(
            screen.getByText(/one app for seeing the risk and acting on it/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/built on microsoft fabric/i)).toBeInTheDocument();
    });
});
