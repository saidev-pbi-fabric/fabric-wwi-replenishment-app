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

/**
 * Parses a datetime value from the Rayfin data API (ReorderAction.createdAt,
 * ReorderActionAuditLog.changedAt). Accepts either shape the SDK can hand back: the Rayfin
 * client's own `deserializeDabResponse` already auto-converts any ISO-8601-shaped string field
 * to a real `Date` (crashed here with "value.includes is not a function" once these fields
 * actually started returning data — that fix made this path reachable for the first time), but
 * a raw SQL Server `datetime2` string (`"YYYY-MM-DD HH:mm:ss.fffffff"`, space separator, no
 * timezone marker) doesn't match that auto-conversion and arrives as a plain string instead, so
 * both shapes have to be handled rather than assuming one.
 */
export function parseApiDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const isoLike = value.includes("T") ? value : value.replace(" ", "T");
    const msPrecision = isoLike.replace(/(\.\d{3})\d*$/, "$1");
    const withZone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(msPrecision) ? msPrecision : `${msPrecision}Z`;
    const parsed = new Date(withZone);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `parseApiDate` + a locale-formatted string, falling back to a plain label instead of "Invalid Date". */
export function formatApiDateTime(value: string | Date | null | undefined): string {
    return parseApiDate(value)?.toLocaleString() ?? "Unknown date";
}

/** "$3.2M" / "$1.8B" / "$640K" / "$420" — switches tiers dynamically, including past $999M into B. */
export function formatCompactCurrency(value: number): string {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

/** Same tiering as formatCompactCurrency but for plain quantities (units), no currency sign. */
export function formatCompactNumber(value: number): string {
    if (!Number.isFinite(value)) return "—";
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${Math.round(value)}`;
}
