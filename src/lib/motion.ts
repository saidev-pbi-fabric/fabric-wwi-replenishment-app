//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import type { Variants } from "framer-motion";

/** Shared entrance animation variants — keeps timing/easing consistent across the app. */
export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.22, ease: "easeOut" } },
};

/** Wraps a set of `fadeInUp` children so they reveal in sequence rather than all at once. */
export const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};
