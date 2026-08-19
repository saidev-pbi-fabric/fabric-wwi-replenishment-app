//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "@/components/shared/sparkline";

describe("Sparkline", () => {
    it("renders nothing for empty data", () => {
        const { container } = render(<Sparkline data={[]} ariaLabel="empty" />);
        expect(container.querySelector("svg")).not.toBeInTheDocument();
    });

    it("renders an accessible chart with only actual data when forecastDays is omitted", () => {
        render(<Sparkline data={[10, 12, 11, 15]} ariaLabel="Sales trend" />);
        const svg = screen.getByRole("img", { name: "Sales trend" });
        expect(svg.querySelectorAll("path[stroke-dasharray]")).toHaveLength(0);
    });

    it("adds a dashed projected segment when forecastDays is set", () => {
        render(<Sparkline data={[10, 12, 11, 15]} forecastDays={5} ariaLabel="Sales trend with forecast" />);
        const svg = screen.getByRole("img", { name: "Sales trend with forecast" });
        expect(svg.querySelectorAll("path[stroke-dasharray]")).toHaveLength(1);
    });

    it("does not produce NaN path coordinates for a single-point series", () => {
        render(<Sparkline data={[42]} forecastDays={3} ariaLabel="Single point" />);
        const svg = screen.getByRole("img", { name: "Single point" });
        for (const path of svg.querySelectorAll("path")) {
            expect(path.getAttribute("d")).not.toContain("NaN");
        }
    });
});
