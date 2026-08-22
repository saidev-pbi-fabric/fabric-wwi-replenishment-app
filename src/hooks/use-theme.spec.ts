//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppTheme } from "@/hooks/use-theme";

function setMatchMedia(prefersDark: boolean) {
    window.matchMedia = ((query: string) => ({
        matches: query.includes("dark") ? prefersDark : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-appearance");
});

describe("useAppTheme", () => {
    it("defaults to light even when the OS prefers dark", () => {
        setMatchMedia(true);
        const { result } = renderHook(() => useAppTheme());
        expect(result.current.isDark).toBe(false);
    });

    it("defaults to light when the OS has no preference either way", () => {
        setMatchMedia(false);
        const { result } = renderHook(() => useAppTheme());
        expect(result.current.isDark).toBe(false);
    });

    it("still honors an explicit dark host signal (data-appearance)", () => {
        document.documentElement.setAttribute("data-appearance", "dark");
        setMatchMedia(false);
        const { result } = renderHook(() => useAppTheme());
        expect(result.current.isDark).toBe(true);
    });

    it("toggles on demand regardless of the default", () => {
        setMatchMedia(true);
        const { result } = renderHook(() => useAppTheme());
        expect(result.current.isDark).toBe(false);

        act(() => result.current.toggleTheme());
        expect(result.current.isDark).toBe(true);

        act(() => result.current.toggleTheme());
        expect(result.current.isDark).toBe(false);
    });
});
