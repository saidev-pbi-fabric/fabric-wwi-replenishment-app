//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LandingPage } from "@/components/landing/landing-page";

describe("LandingPage", () => {
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
});
