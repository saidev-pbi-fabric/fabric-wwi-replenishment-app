//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 *   cn("px-2 py-1", isActive && "bg-primary text-primary-foreground")
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * "2000-11-05" -> "Nov 5, 2000" — every date in this app's DAX results comes back as an ISO
 * date string, not a JS Date, and the sample data is a single historical 2000 window rather
 * than recent dates, so the year stays in the label instead of being assumed/dropped.
 */
export function formatShortDate(isoDate: string): string {
    const date = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
