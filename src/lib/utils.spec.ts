//-----------------------------------------------------------------------
// <copyright company="Microsoft Corporation">
//        Copyright (c) Microsoft Corporation.  All rights reserved.
//        Licensed under the MIT license. See LICENSE file in the project root for full license information.
// </copyright>
//-----------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { parseApiDate, formatApiDateTime } from "@/lib/utils";

describe("parseApiDate", () => {
    // Regression: the Rayfin SDK's own deserializeDabResponse auto-converts any
    // ISO-8601-shaped string field to a real Date before this code ever sees it. Once
    // ReorderAction.createdAt/ReorderActionAuditLog.changedAt actually started returning data
    // (a separate field-selection fix), this crashed the whole Action Center page with
    // "value.includes is not a function" -- parseApiDate assumed its input was always a string.
    it("accepts a real Date instance without throwing", () => {
        const date = new Date("2026-08-21T17:00:18.000Z");
        expect(parseApiDate(date)).toEqual(date);
    });

    it("returns null for an invalid Date instance", () => {
        expect(parseApiDate(new Date(NaN))).toBeNull();
    });

    it("parses a raw SQL Server datetime2 string (space separator, no timezone)", () => {
        const parsed = parseApiDate("2026-08-21 17:00:18.5598798");
        expect(parsed?.toISOString()).toBe("2026-08-21T17:00:18.559Z");
    });

    it("parses a plain ISO string", () => {
        const parsed = parseApiDate("2026-08-21T17:00:18.000Z");
        expect(parsed?.toISOString()).toBe("2026-08-21T17:00:18.000Z");
    });

    it("returns null for null/undefined/empty", () => {
        expect(parseApiDate(null)).toBeNull();
        expect(parseApiDate(undefined)).toBeNull();
        expect(parseApiDate("")).toBeNull();
    });
});

describe("formatApiDateTime", () => {
    it("formats a Date instance instead of crashing", () => {
        expect(formatApiDateTime(new Date("2026-08-21T17:00:18.000Z"))).not.toBe("Unknown date");
    });

    it("falls back to a plain label for an unparseable value", () => {
        expect(formatApiDateTime(undefined)).toBe("Unknown date");
    });
});
