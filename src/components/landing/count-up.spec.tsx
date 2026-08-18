//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CountUp } from "@/components/landing/count-up";

describe("CountUp", () => {
    it("starts at 0 and animates up to the target value", async () => {
        render(<CountUp value={42} durationMs={20} />);

        await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    });

    it("applies the format function to the animated value", async () => {
        render(<CountUp value={34} durationMs={20} format={(n) => `${n}%`} />);

        await waitFor(() => expect(screen.getByText("34%")).toBeInTheDocument());
    });
});
