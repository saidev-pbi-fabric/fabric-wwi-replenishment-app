//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { KpiStrip } from "./kpi-strip";
import type { ParetoDataset, ParetoRow } from "@/hooks/use-pareto-dataset";

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

const SAMPLE_ROWS: ParetoRow[] = [
    { stockItemKey: 1, stockItem: "Item A", tier: "Long Lead Time", reorderValue: 60_000_000, valueSharePct: 0.6, cumulativeValuePct: 0.6, atRiskRank: 1 },
    { stockItemKey: 2, stockItem: "Item B", tier: "Medium Lead Time", reorderValue: 25_000_000, valueSharePct: 0.25, cumulativeValuePct: 0.85, atRiskRank: 2 },
    { stockItemKey: 3, stockItem: "Item C", tier: "Short Lead Time", reorderValue: 15_000_000, valueSharePct: 0.15, cumulativeValuePct: 1.0, atRiskRank: 3 },
];

function makeDataset(rows: ParetoRow[] = SAMPLE_ROWS): ParetoDataset {
    return { status: "ready", usingDevFixture: false, rows };
}

describe("KpiStrip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders a skeleton for each tile while loading", () => {
        mockQuery.mockReturnValue(new Promise(() => {}));
        render(<KpiStrip dataset={makeDataset()} cutoffPct={0.8} />);
        expect(screen.queryByText("Items Tracked")).not.toBeInTheDocument();
    });

    it("renders the three DAX-backed tiles and the two cutoff-computed tiles on success", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: {
                columns: [
                    { name: "[Items Tracked]" },
                    { name: "[Avg Lead Time Days]" },
                    { name: "[Accelerating Demand Items]" },
                ],
                rows: [[672, 12.3, 164]],
            },
            fromCache: false,
        });

        render(<KpiStrip dataset={makeDataset()} cutoffPct={0.8} />);

        await waitFor(() => expect(screen.getByText("672")).toBeInTheDocument());
        expect(screen.getByText("12.3")).toBeInTheDocument();
        expect(screen.getByText("164")).toBeInTheDocument();
        // Cutoff 0.8 crosses at row 2 (cumulative 0.85 >= 0.8) → 2 items, $85.0M value.
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("$85.0M")).toBeInTheDocument();
    });

    it("shows an empty state when the query returns no rows", async () => {
        mockQuery.mockResolvedValue({
            status: "success",
            table: { columns: [], rows: [] },
            fromCache: false,
        });

        render(<KpiStrip dataset={makeDataset()} cutoffPct={0.8} />);

        await waitFor(() =>
            expect(screen.getByText(/no kpi data available/i)).toBeInTheDocument(),
        );
    });

    it("shows a destructive banner on query error", async () => {
        mockQuery.mockResolvedValue({
            status: "error",
            error: { message: "401 Unauthorized" },
        });

        render(<KpiStrip dataset={makeDataset()} cutoffPct={0.8} />);

        await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
        expect(screen.getByRole("alert")).toHaveTextContent("401 Unauthorized");
    });
});
