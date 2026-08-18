//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "@/App";

describe("App", () => {
    it("renders without throwing", () => {
        expect(() => render(<App />)).not.toThrow();
    });

    it("mounts content into the document", () => {
        render(<App />);
        expect(document.body).not.toBeEmptyDOMElement();
    });

    it("shows the landing page by default", () => {
        render(<App />);
        expect(screen.getByRole("button", { name: /open the dashboard/i })).toBeInTheDocument();
    });

    it("navigates to the Overview page from the landing page's primary CTA", () => {
        render(<App />);
        fireEvent.click(screen.getByRole("button", { name: /open the dashboard/i }));
        expect(screen.getByRole("heading", { name: /replenishment overview/i })).toBeInTheDocument();
    });

    it("returns to the landing page via the Home nav tab", () => {
        render(<App />);
        fireEvent.click(screen.getByRole("button", { name: "Overview" }));
        fireEvent.click(screen.getByRole("button", { name: "Home" }));
        expect(screen.getByRole("button", { name: /open the dashboard/i })).toBeInTheDocument();
    });
});
