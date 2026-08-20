//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemTrendChart } from "@/components/action-center/item-trend-chart";

describe("ItemTrendChart", () => {
    it("renders nothing for empty data", () => {
        const { container } = render(
            <ItemTrendChart data={[]} startLabel="Oct 1" endLabel="Nov 30" ariaLabel="empty" />,
        );
        expect(container.querySelector("svg")).not.toBeInTheDocument();
    });

    it("renders exactly one polyline and no dashed/projected path — no forecast, ever", () => {
        render(
            <ItemTrendChart data={[72, 79, 74, 86]} startLabel="Oct 1" endLabel="Nov 30, 2000" ariaLabel="Trend" />,
        );
        const svg = screen.getByRole("img", { name: "Trend" });
        expect(svg.querySelectorAll("polyline")).toHaveLength(1);
        expect(svg.querySelectorAll("[stroke-dasharray]")).toHaveLength(0);
    });

    it("renders min/mid/max gridlines with value labels", () => {
        render(<ItemTrendChart data={[72, 79, 74, 86]} startLabel="Oct 1" endLabel="Nov 30" ariaLabel="Trend" />);
        const svg = screen.getByRole("img", { name: "Trend" });
        expect(svg.querySelectorAll("line")).toHaveLength(3);
        expect(svg.textContent).toContain("72");
        expect(svg.textContent).toContain("86");
    });

    it("renders the start and end date labels", () => {
        render(<ItemTrendChart data={[72, 79]} startLabel="Oct 1" endLabel="Nov 30, 2000" ariaLabel="Trend" />);
        expect(screen.getByText("Oct 1")).toBeInTheDocument();
        expect(screen.getByText("Nov 30, 2000")).toBeInTheDocument();
    });

    it("does not produce NaN path coordinates for a single-point series", () => {
        render(<ItemTrendChart data={[42]} startLabel="Nov 30" endLabel="Nov 30" ariaLabel="Single point" />);
        const svg = screen.getByRole("img", { name: "Single point" });
        expect(svg.querySelector("polyline")?.getAttribute("points")).not.toContain("NaN");
    });
});
