//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import "@testing-library/jest-dom";

// jsdom has no ResizeObserver. Used by action-center.tsx to measure the right column's rendered
// height so the ranked-list card can stretch to match it. This mock never fires (no real layout
// in jsdom), which is fine -- consumers must already handle "no measurement yet" as their
// default/unmatched state.
class MockResizeObserver implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only global polyfill
(globalThis as any).ResizeObserver = MockResizeObserver;
