//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { useEffect, useState } from "react";

interface CountUpProps {
    value: number;
    durationMs?: number;
    /** Formats the animated integer for display, e.g. adding a "%" suffix. */
    format?: (n: number) => string;
}

/** Animates from 0 up to `value` on mount — a small "insight platform" signature moment. */
export function CountUp({ value, durationMs = 900, format = (n) => String(n) }: CountUpProps) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!Number.isFinite(value)) return;
        let raf: number;
        const start = performance.now();

        function tick() {
            const t = Math.min((performance.now() - start) / durationMs, 1);
            const eased = 1 - (1 - t) ** 3;
            setDisplay(Math.round(value * eased));
            if (t < 1) raf = requestAnimationFrame(tick);
        }

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, durationMs]);

    return <>{format(display)}</>;
}
