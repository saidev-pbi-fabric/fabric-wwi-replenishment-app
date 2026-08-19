# Data-App Reference Checklist

For gathering screenshots of real ops/data dashboards to compare against this app, screen by
screen. Don't browse generic "best websites" galleries cold — go find each row below on the named
sites, screenshot it, drop it in this folder (or paste into a fresh chat) with the row label.
Companion to `design-strategy-guide.md` (the audit + gallery notes already gathered) and the
"Control Room Fixes" Artifact (mockups already built from this app's real screens).

## This app's screens, mapped to what to go look for

| This app's surface | What to search for | Where to look |
|---|---|---|
| Top nav + page identity (no duplicate title) | "dashboard nav header", settings/product nav that doesn't repeat the active tab as a page title | Linear (app, not marketing site), Vercel dashboard, PostHog |
| KPI / stat tile row | "stat tile", "metric card", dense KPI strip | Vercel dashboard analytics tab, PostHog insights, Basedash |
| Ranked / sortable list with inline sparkline | "table row sparkline", "list with trend", filterable data table | Mobbin → search "table" or "list" filter, Linear issues list |
| Detail / side panel opened from a list | "side panel", "detail drawer", "split view" | Linear issue detail panel, Mobbin → "detail view" filter |
| Filter / segmented control | "filter dropdown", "segmented control" | Linear filter bar, PostHog insight filters |
| Write-back / form panel (the ReorderAction entry) | "inline form", "record action form", "status field" | Linear "create issue", Basedash record edit |
| Empty / loading / error states | "empty state", "skeleton loading" | Mobbin → "empty state" filter (large curated set) |
| Chart + forecast band (sales trend sparkline) | "chart forecast shading", "trend line projection" | Vercel analytics graphs, PostHog trend graphs |
| Dark mode as a first-class theme, not an invert | "dark mode dashboard" | Vercel dashboard (dark is default), Linear |

## Site list

| Site | Why it's on this list | URL |
|---|---|---|
| Linear (app, not homepage) | Closest genre match — dense, restrained, real product screens | linear.app (sign in or use their public changelog screenshots) |
| Vercel dashboard | Dark-mode-first, analytics/stat tiles | vercel.com/dashboard (or marketing site's dashboard screenshots) |
| PostHog | Analytics-over-real-data, same problem class as this app | posthog.com |
| Basedash | Data-table-first admin tool | basedash.com |
| Mobbin | Real product UI screenshots, filterable by pattern — most useful entry for this list | mobbin.com |
| Land-book | Lower priority — mostly marketing/landing pages, not dashboards | land-book.com |
| Godly / Awwwards | Lowest priority for this app — general web design, not data-product specific | godly.website, awwwards.com |

## How to use what you collect

1. Screenshot the row's pattern (not the whole page — crop tight to the component).
2. Drop 2-3 screenshots per row that feel closest to "that's the vibe."
3. Bring them back with the row label ("this is my 'detail panel' reference") — `hallmark study
   <screenshot>` or `design-dna` extracts structure/tokens from it directly, no manual describing
   needed.
