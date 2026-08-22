//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { niceTicks, buildParetoChartSpec } from "@/components/overview/pareto-chart-spec";

describe("niceTicks", () => {
    // Regression: Vega's own "nice" tick auto-selection was reported live as not showing a $0
    // label even though the scale domain genuinely started at 0 ("scale is not starting at 0").
    // These ticks are now computed explicitly and passed via axis.values, so 0 must always be
    // the first element regardless of the data's max value.
    it("always starts at 0", () => {
        expect(niceTicks(191_000_000)[0]).toBe(0);
        expect(niceTicks(7.9)[0]).toBe(0);
        expect(niceTicks(1)[0]).toBe(0);
    });

    it("picks a round step that covers the real max from the actual live data shape ($191M top item)", () => {
        const ticks = niceTicks(191_000_000);
        expect(ticks).toEqual([0, 50_000_000, 100_000_000, 150_000_000, 200_000_000]);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(191_000_000);
    });

    it("handles a small qty-mode range without collapsing to a single tick", () => {
        const ticks = niceTicks(320);
        expect(ticks[0]).toBe(0);
        expect(ticks.length).toBeGreaterThan(1);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(320);
    });

    it("returns [0] for a zero or negative max instead of an infinite loop", () => {
        expect(niceTicks(0)).toEqual([0]);
        expect(niceTicks(-5)).toEqual([0]);
    });
});

describe("buildParetoChartSpec", () => {
    it("wires the computed tick values and a matching zero-based domain into the y encoding", () => {
        const spec = buildParetoChartSpec(null, false, "value", 191_000_000) as {
            layer: {
                mark?: { type: string };
                encoding?: { y?: { axis: { values: number[] }; scale: { zero: boolean; domain: number[] } } };
            }[];
        };
        const barLayer = spec.layer.find((l) => l.mark?.type === "bar");
        const yEncoding = barLayer?.encoding?.y;
        expect(yEncoding?.axis.values[0]).toBe(0);
        expect(yEncoding?.scale.zero).toBe(true);
        expect(yEncoding?.scale.domain).toEqual([0, 200_000_000]);
    });

    // Regression: the "0" tick label kept getting squeezed out of a tight 280px chart even with a
    // provably correct zero-based domain/tick-values, still reading live as "not starting at 0".
    // A dedicated zero-baseline rule layer, independent of any axis label rendering, is the
    // unmissable fallback.
    it("includes an explicit zero-baseline rule layer, independent of the axis label", () => {
        const spec = buildParetoChartSpec(null, false, "value", 191_000_000) as {
            layer: { mark?: { type: string }; encoding?: { y?: { field: string } } }[];
        };
        const zeroRule = spec.layer.find(
            (l) => l.mark?.type === "rule" && l.encoding?.y?.field === "zero",
        );
        expect(zeroRule).toBeDefined();
    });
});
