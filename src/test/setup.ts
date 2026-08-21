//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import "@testing-library/jest-dom";

// jsdom has no IntersectionObserver. Used by ranked-list-panel.tsx to lazily fetch each row's
// sparkline once it scrolls into view — this mock fires "intersecting" immediately on observe,
// so tests see the same eager-fetch behavior as before without simulating real scroll/viewport.
class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(private callback: IntersectionObserverCallback) {}
    observe(target: Element) {
        this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this,
        );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global polyfill
(globalThis as any).IntersectionObserver = MockIntersectionObserver;
