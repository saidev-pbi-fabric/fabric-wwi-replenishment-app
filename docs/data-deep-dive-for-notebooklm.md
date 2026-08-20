# Deep Dive: The Data, the Semantic Model, and the DAX Behind the WWI Replenishment App

This document exists for one purpose: to let you (Saidev) actually understand, at a gut level,
what data this hackathon app is built on, what the semantic model does to that data, and what
each DAX measure is really computing — before you push further on visuals or suggestions. It was
written after several days of building where the team moved fast on UI polish without a full
walkthrough of the underlying data story. This is that walkthrough.

It's written to be read start to finish, like a briefing, not skimmed as a reference table. If
you're listening to this as an audio overview, that's exactly the intended use — treat it as
someone explaining the project to you from scratch.

## 1. What this project actually is

The app is a single Microsoft Fabric Data App — one unified experience, not two separate tools —
built for a fictional retail company modeled on Wide World Importers (WWI), a sample dataset
Microsoft ships with Fabric. It's being built for the Microsoft Fabric Hackathon 2026, under the
"Fabric App Champion" track. The pitch: give a warehouse operations planner a single screen where
they can see which stock items are running into trouble — selling faster than they can be
restocked — and then act on that risk by logging a reorder action, right there in the app, without
falling back to a spreadsheet.

That's the intent. But the actual data available turned out to be much thinner than the original
plan assumed, and that gap between "what we hoped this dataset would let us build" and "what it
actually contains" shapes almost every design decision downstream. Understanding that gap is the
whole point of this document.

## 2. The data we actually have — and the data we don't

Early planning assumed this project would have access to a full WWI data warehouse: sales facts,
but also purchasing facts, stock-holding facts, backorder facts, and a supplier dimension. That
assumption came from researching WWI's schema on GitHub — a full-featured version of the sample
that ships as a SQL Server DDL script.

That is not what got loaded. When the Copy Job wizard in Fabric Warehouse actually pulled in
the sample — using the "Retail Data Model from Wide World Importers" option, a full copy, no
custom pipeline — what landed was a much smaller, flatter slice: six tables, verified directly
against the live warehouse metadata, not assumed from documentation.

Those six tables are: `fact_sale`, `dimension_stock_item`, `dimension_city`,
`dimension_customer`, `dimension_date`, and `dimension_employee`. There is no purchasing table.
No stock-holding table. No backorder table. No supplier dimension. Nowhere in this dataset — not
in the fact table, not in any dimension — does a "quantity on hand" or "reorder level" column
exist. This is, structurally, a sales-only dataset.

That single fact reshaped the entire scenario. The original hackathon pitch was "stock
replenishment / back-order risk." Without any inventory-on-hand signal, you literally cannot
compute a real back-order risk — there is nothing to compare current stock against. So the
scenario was deliberately re-derived into something honest about what the data can support:
demand-driven reorder attention. Instead of "this item is below its reorder point," the app says
something closer to "this item is selling fast and takes a long time to restock, so it deserves
attention" — a proxy built entirely from sales velocity and lead time, not a real inventory
threshold. This reframing is disclosed, not hidden — it should come up explicitly if judges ask
"is this real stock tracking?" The honest answer is no, and that's a deliberate, documented choice
given the dataset, not an oversight.

### The fact table: `fact_sale`

This is the heart of the dataset — about 50.15 million rows, one row per invoice line. Each row
carries a `StockItemKey`, a `CustomerKey`, a `SalespersonKey`, a `CityKey`, an `InvoiceDateKey`
and `DeliveryDateKey`, and then the transactional numbers: `Quantity` (units sold on that line),
`UnitPrice`, `TotalExcludingTax`, `TaxAmount`, `TotalIncludingTax`, `Profit`, and a couple of
logistics flags (`TotalDryItems`, `TotalChillerItems`).

Two things about this table matter a lot for how the semantic model was built.

First: despite 50 million rows sounding like a multi-year history, direct SQL querying (using an
AAD-token connection straight to the SQL analytics endpoint, since the SQL-endpoint MCP tool's
OAuth is broken) showed the dates span only 335 distinct days — January 1 to November 30 of the
year 2000. So this isn't years of trend data to mine; it's roughly 150,000 transaction lines per
day across one eleven-month window. That has a direct consequence for anything that wants to
show "trend over time" — there's no multi-year seasonality story available, and no "last 12
months vs. this month" comparison either, because there's only ever one window of data.

Second: 50 million raw rows at Import-mode grain is far more than this app actually needs. None
of the planned visuals — the KPI strip, the at-risk trend chart, the top-at-risk ranked list —
need a city, customer, or salesperson breakdown. They all operate at the stock-item-by-date
grain. So instead of importing the full 50 million rows and aggregating client-side, the
semantic model's data source query aggregates server-side, using a GROUP BY on
`(StockItemKey, InvoiceDateKey)` with sums of quantity, sales, tax, and profit. That single
decision folds 50.15 million rows down to 73,365 — trivial for Import mode on trial capacity,
and it means the semantic model never even sees a customer or city column. This is why the
semantic model's fact table is literally just called `Sale`, not `fact_sale` — it's a
purpose-built aggregate, not a straight import of the source table.

### The stock item dimension: `dimension_stock_item`

672 rows, one per stock item. Alongside descriptive fields (item name, color, package types,
brand, size, barcode, unit price, recommended retail price), the one column that matters most
for this whole project is `LeadTimeDays` — how long it takes to restock that item. This is the
only supply-side signal in the entire dataset. There's no quantity-on-hand column here either.
Everything the "risk" story is built on ultimately traces back to this one number combined with
how fast an item sells.

### The other three dimensions

`dimension_date` (6,210 rows) is the calendar dimension — note that its join key is a literal
`Date` timestamp column, not a separate integer `DateKey`, which matters when wiring up
relationships. `dimension_city` (116,295 rows) and `dimension_customer` (403 rows) and
`dimension_employee` (213 rows) all exist in the warehouse but were deliberately left out of the
semantic model — none of the planned pages need a city, customer, or salesperson cut of the data,
and the modeling guidance being followed favors a lean model (only what's actually queried)
over importing everything "just in case."

## 3. The semantic model — what got built, and why it's smaller than the source

The semantic model is named `WWI Replenishment`, deployed in Import storage mode (not Direct
Lake — more on that choice below), and it contains exactly three tables: `Sale` (the aggregated
73,365-row fact described above), `Stock Item`, and `Date` (explicitly marked as the model's date
table, which is required for Fabric's time-intelligence DAX functions to behave correctly). Two
relationships connect them: `Sale` to `Stock Item`, and `Sale` to `Date`, both many-to-one,
both single-direction (no bidirectional filtering — deliberately, to keep the filter propagation
predictable as more measures get added).

Why Import mode instead of Direct Lake, given Direct Lake is the newer, more "Fabric-native" way
to build a semantic model on top of a warehouse? Two reasons. First, at this data scale — trial
capacity, tens of thousands of rows post-aggregation, not tens of millions live — both modes
require the identical setup flow, so there's no time savings from choosing Direct Lake here.
Second, Import mode supports calculated columns, hybrid tables, and aggregations, and it skips
Direct Lake's SKU-guardrail fallback behavior (a real, documented risk of unpredictable
performance degradation that would be painful to debug under hackathon time pressure). Given
those trade-offs point the same direction, Import mode was the deliberate, not default, choice.

## 4. The DAX — walking through every measure and why it exists

This is the part worth understanding most carefully, because every visual in the app is
downstream of these measures, and the "risk" story only makes sense once you see how it's
actually computed.

Everything starts from a simple observation: this data has no inventory level, so "risk" has to
be re-derived from two things that *do* exist — how fast an item is selling, and how long it
takes to restock. Here's the chain of measures, in the order they build on each other.

**`Max Sale Date`** is a hidden helper measure — the latest date present in the data. It's
hardcoded to reference November 30, 2000 rather than calling `TODAY()`, because this is
historical data from the year 2000, not live data — using `TODAY()` would make every
"recent" window measure return blank or nonsense, since today's date isn't inside the data's
date range at all. This is a subtle but important gotcha: any time-relative DAX pattern that
assumes "now" needs to instead anchor to "the last date this dataset actually contains."

**`Recent Daily Sales Rate`** and **`Prior Daily Sales Rate`** are both 30-day trailing-window
averages, built with `DATESINPERIOD`, anchored off `Max Sale Date`. "Recent" is the most recent
30 days present in the data; "Prior" is the 30 days immediately before that. Together they let
the model answer: is this item's sales pace speeding up or slowing down right now, relative to a
month ago?

**`Demand Trend %`** is simply the percentage difference between those two rates — recent versus
prior. A positive value means the item is accelerating (selling faster now than a month ago),
which raises its risk profile; a negative value means it's decelerating.

**`Suggested Reorder Qty`** is where the reorder-point logic lives: `Recent Daily Sales Rate ×
LeadTimeDays × 1.2`. This is a classic textbook reorder-point formula — how many units you'd
expect to sell during the time it takes to get more stock in, with a 20% safety buffer on top.
It's worth being precise about what this number is and isn't: it is *not* a demand forecast (it
doesn't try to predict future sales patterns), it's a reorder-point calculation using only the
one supply-side number this dataset provides. This distinction came up directly with the user
mid-project and is worth keeping straight if it comes up again.

**`At Risk Rank`** ranks every stock item using `RANKX(ALL('Stock Item'), ...)` against the
combination of `Suggested Reorder Qty` and `LeadTimeDays` — items that both sell fast (high
suggested reorder quantity) and take a long time to restock rank highest. Because there's no
absolute on-hand quantity to compare against, this can only ever be a *relative* ranking — top-N
or percentile — never an absolute "below threshold" alert the way real backorder tracking would
work.

This measure has a genuinely instructive bug story worth remembering, since it's a classic DAX
trap and not specific to this dataset. The first version used `RANKX(ALL('Stock Item'[Stock Item
Key]), ...)` — clearing filters on the single `Stock Item Key` column only. But the query that
consumes this measure also groups by `Lead Time Priority Tier`, a different column on the same
table, and because that column's filter was never cleared, it stayed active inside the RANKX
iteration and collapsed every single item down to rank 1. The fix was to clear filters on the
*whole table* — `RANKX(ALL('Stock Item'), ...)` — not just the one column the measure happens to
reference. The general lesson: `ALL()` on a single column only removes filtering from that
column; any other active filter on the same table survives and can silently corrupt a ranking
measure. Worth checking for this pattern anywhere else ranking or "ALL" shows up in this model.

**`Lead Time Priority Tier`** is a calculated column (not a measure) on `Stock Item`, bucketing
`LeadTimeDays` into Short (≤7 days), Medium (8–14 days), and Long (>14 days), based on the
observed real range of 0–20 days with an average of 12.3. One thing worth knowing if you're
looking at the current "All" tier filter and wondering why it's overwhelmingly one color: 582 of
the 672 stock items — the large majority — land in the Medium tier. That was verified live
against the real data and is a genuine property of this dataset, not a bug in the tiering logic
or the chart. The app now discloses this with a caption rather than letting it look broken.

All of these measures live on the semantic model side (authored and deployed through the
`powerbi-modeling-mcp` tool, not as files in this repo), and every one has a written description
attached, following a specific discipline: descriptions should say things that *aren't* obvious
from the measure name alone — the calculation logic, where the input data comes from, and any
caveats a report author or AI assistant would need to avoid misusing it. That discipline came
from external research done specifically for this project (see the "further reading" section) on
how to write semantic-model descriptions that are actually useful to Copilot/AI consumers of the
model, not just decorative.

## 5. How the app actually queries this — the DAX query factory pattern

The app never embeds DAX inline in TypeScript. Every query lives in its own `.dax` file under
`src/queries/`, split by page (`overview/` for Page 1, `action-center/` for Page 2), and gets
imported into a small factory function using Vite's `?raw` import — the DAX text, a JSON
Vega-Lite spec for how to chart it, and a column-metadata map (mapping raw DAX result column
names to display names) all get bundled together and handed to a `useSemanticModelQuery` hook
that actually executes it against the live model.

A few concrete examples show the pattern. The KPI strip query (`kpi-strip.dax`) is a single
`EVALUATE ROW(...)` returning five scalar values in one round trip: Items Tracked (a distinct
count of stock items), Avg Lead Time Days, Top At Risk Items (a count of items with rank ≤ 20),
Accelerating Demand Items (a count where `Demand Trend %` is positive), and At-Risk Reorder
Value — the dollar exposure of the top-20 at-risk items, computed as
`SUMX` over those items of `Suggested Reorder Qty × Unit Price`. That last one is a genuinely
useful "so what" number for a warehouse planner: not just "20 items are flagged" but "here's the
dollar value tied up in reordering them."

The ranked-list queries (`top-at-risk-items.dax` for Page 1's top-10 view, and
`ranked-at-risk-list.dax` for Page 2's full 672-item list) both use `SUMMARIZECOLUMNS` with a
`TOPN`/`ORDER BY` on `At Risk Rank`, and both have a `{{TIER_FILTER}}` placeholder that the
factory function substitutes client-side when a user filters by lead-time tier. This is a
deliberate split of responsibility: the DAX defines what's rankable and by what logic; the app
layer only decides which slice of that ranking to display.

The architectural rule underneath all of this — drawn from external research on how Fabric Data
Apps should relate to their semantic model — is a hard separation: the semantic model owns all
business logic (what counts as "at risk," how reorder quantity is calculated, how ranking works),
and the app is presentation-only. The app queries the model via DAX; it never bypasses the model
to hit the warehouse directly, and no calculation that belongs in a measure should quietly get
reimplemented in TypeScript.

## 6. What the two dashboard pages actually show, tied back to this data

**Page 1 — Replenishment Overview** — is the "what's the state of the world" page: the five-tile
KPI strip described above, a sales-trend line chart (deliberately scoped to just the top-20
at-risk items rather than the whole 672-item catalog, because the whole-catalog trend was flat
and uninformative once actually tested against live data — a change made after live testing
showed the original approach didn't work), and a top-10 ranked bar chart colored by lead-time
tier, clicking through to Page 2.

**Page 2 — Action Center** — is the "what do I do about it" page: the full 672-item ranked list
(with client-side tier filtering), a detail panel for a selected item showing its sales-trend
sparkline and a plain-English rationale sentence composed from the fields already on screen, and
the `ReorderAction` write-back form — the one place in the app where a planner's decision
(quantity, supplier, status) actually gets persisted, not just displayed.

A landing page exists as a third page, added later, purely as an entry point/framing page for
judges opening the app cold — it has no DAX of its own.

## 7. The honest limitations — worth keeping front of mind

- **No real inventory signal anywhere.** Every "risk" number is a proxy built from sales velocity
  and lead time, never a comparison against actual stock on hand, because that data doesn't
  exist in this sample.
- **One eleven-month window, not multi-year history.** Trend visuals can show "recent vs. prior
  30 days" but can't show year-over-year or seasonal patterns.
- **No supplier dimension.** The original plan to filter/group at-risk items by supplier had to
  become a lead-time-tier filter instead, since there's no supplier data to group by.
- **Item names don't cleanly split into attributes.** `Brand`/`Color` are `N/A` for almost every
  real item; the descriptive text is one unparsed string with no consistent pattern — a parsed
  "short name" was deliberately not built, relying on tooltips and a narrower label limit instead.
- **The severity color scale (red/amber/green) fails a colorblind-accessibility validator** for
  protanopia specifically — a known, accepted trade-off (locked design decision, mitigated by
  always pairing color with a text label, never color alone), not something fixed yet.
- **The Medium lead-time tier dominates** (582 of 672 items) — real data, not a filter bug, now
  disclosed via a caption rather than silently looking broken.

## 8. Where to take this next — questions worth sitting with

This section is deliberately open-ended — the point of understanding all the above is to let you
form your own judgment about what's worth changing. Some threads worth pulling on while you
listen to this:

- Given there's no real inventory signal, is "reorder value at risk" ($) the most persuasive
  single number to lead with, or would a different framing land better with judges who will
  immediately ask "wait, is this real stock data?"
- The at-risk ranking only ever produces a relative ordering (top-N), never an absolute alert.
  Does the UI make that limitation legible enough, or does it currently read like a real
  threshold-based alert system?
- With only an 11-month window and no seasonality to show, is a line chart the right form for the
  sales-trend visual, or would a form that doesn't imply "watch this trend over years" (which the
  data can't support) tell a more honest story?
- The lead-time tiering (Short/Medium/Long) is a fixed bucket scheme over a 0–20 day range. Is a
  3-bucket tier the right resolution given 582 of 672 items land in one bucket, or would a
  continuous/ranked treatment of lead time itself be more informative than tiering it?
- Is there a better single visual (vs. the current bar + KPI-tile combination) for communicating
  "these items sell fast AND restock slowly," which is really a two-variable risk story being
  collapsed into a single rank right now?

## Further reading already in this repo

- `docs/wwi-schema-reference.md` — the authoritative, live-verified column-by-column schema
  reference this document is derived from.
- `SPEC.md` — the full project spec (tech stack, code conventions, testing strategy, boundaries).
- `docs/design-and-dax-references.md` — external chart-craft and semantic-model-authoring
  references consulted while building this (KPI card anatomy, bar/line chart rules, how to write
  AI-facing measure descriptions).
- `tasks/todo.md` — task-by-task build log with verification notes for T1.2 (semantic model),
  T2.1 (risk measures), T2.2/T2.3 (query factories).
