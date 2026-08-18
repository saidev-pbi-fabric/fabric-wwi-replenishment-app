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
    it("shows the app name and one-liner pitch", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByRole("heading", { name: /wwi replenishment/i })).toBeInTheDocument();
        expect(screen.getByText(/sales velocity vs\. supplier lead time/i)).toBeInTheDocument();
    });

    it("explains the problem the app solves", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText(/the problem/i)).toBeInTheDocument();
    });

    it("discloses that replenishment risk is a proxy signal, not real stock data", () => {
        render(<LandingPage onOpenDashboard={vi.fn()} />);

        expect(screen.getByText(/disclosed proxy/i)).toBeInTheDocument();
        expect(screen.getByText(/wide world importers/i)).toBeInTheDocument();
    });

    it("calls onOpenDashboard when the primary CTA is clicked", () => {
        const onOpenDashboard = vi.fn();
        render(<LandingPage onOpenDashboard={onOpenDashboard} />);

        fireEvent.click(screen.getByRole("button", { name: /open the dashboard/i }));

        expect(onOpenDashboard).toHaveBeenCalledOnce();
    });
});
