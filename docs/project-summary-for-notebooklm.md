# WWI Replenishment — Project Summary (NotebookLM Source Material)

Written 2026-08-22 (event day) as source material for generating a NotebookLM audio overview
and/or slide deck. Pairs with `docs/talk-track.md` (the timed live-demo script — use that one for
the actual spoken narration structure; use this one for depth/background/Q&A material). Upload
both to NotebookLM together.

---

## 1. What this is

A Microsoft Fabric Hackathon 2026 entry (Hyderabad Data & AI Community + India Fabric User Group),
"Fabric App Champion" track, event 2026-08-22. Team of 2. Built in ~4 hours/day over one week
(2026-08-16 through 2026-08-22).

**One-line pitch:** a single Fabric Data App that combines a replenishment-risk dashboard with a
write-back action tool — see which stock items are at risk of stocking out, then log and track the
reorder action for them, without leaving the app.

**Why this matters as a hackathon entry:** most BI dashboards stop at "here's what happened."
Judges see a lot of read-only Power BI reports. This one closes the loop — insight and action live
in the same app, backed by a real write-back data layer (not a mockup), with a full audit trail.

---

## 2. The dataset, and the honest constraint that shaped the whole project

Loaded via Fabric Warehouse's native Copy Job wizard: "Retail Data Model from Wide World
Importers" sample, full copy, zero manual pipeline or medallion architecture build.

**What actually loaded:** 6 flat tables — `dimension_city`, `dimension_customer`, `dimension_date`,
`dimension_employee`, `dimension_stock_item`, `fact_sale`. `fact_sale` alone is ~50 million rows,
but spans only an 11-month window (Jan–Nov 2000), not multi-year history.

**The constraint that mattered most:** this sample has **no purchasing, stock-holding, or
backorder table anywhere** — no `Fact.Order`, no `Fact.Stock Holding`, no `Dimension.Supplier`.
Just sales. The original hackathon idea ("stock replenishment / back-order risk") assumed data
that doesn't exist in this sample.

**The resulting design decision, and why it's actually a strength, not a limitation:** rather than
fabricate inventory numbers or quietly drop the idea, the risk model was rebuilt as a **disclosed
proxy** — sales velocity trend vs. each item's supplier lead time, ranked relative to other items,
not compared against a fake fixed threshold. The app says this explicitly to the user, in the UI
itself, not just in documentation. Every number derived from this proxy (Suggested Reorder Qty,
Reorder Value, the ABC tiers) is computed transparently and explained on-screen. This "show your
work, don't fake the data you don't have" principle runs through the whole build — it's a defensible
answer to "wait, don't you need inventory data for a replenishment app?"

---

## 3. The three pages

**Landing** — hero + problem framing + a 3-step "how it works" walkthrough, entry point into the
dashboard. Built deliberately last (low-cost, no DAX wiring) so it helps judges who open the app
cold, before the KPI strip means anything to them yet.

**Overview** — the concentration/Pareto thesis page. A live bar chart ranks all 219 items with
nonzero recent sales (out of 672 total stock items — the other 453 had zero recent sales and are
excluded, since they'd contribute $0 to the analysis either way) by risk. A user-adjustable cutoff
slider (default 80%) splits the ranking into "in cutoff" (colored) vs. "past cutoff" (muted) bars,
live-recomputing on drag — not a fixed, hardcoded threshold. A shared **Rank By: Qty / $ Value**
toggle (synced with Action Center) switches the entire page's ranking basis: by unit quantity or by
dollar value — these produce genuinely different top-N lists (the single highest-$-value item,
~$182M, is not the highest-quantity item), and the app makes that distinction explicit instead of
silently picking one.

**Action Center** — a ranked, searchable, filterable (by ABC value tier) list of at-risk items;
click one to see its detail panel (unit price, recent sales rate, trend, a plain-English rationale
sentence composed from fields already on screen — no separate AI call) and the write-back form.

---

## 4. The write-back loop (the "action" half of the app)

Two entities, both real Fabric-backed data (Data API Builder + a Rayfin-managed SQL store), not a
mockup:

- **`ReorderAction`** — the record itself: stock item, suggested quantity, supplier (a fixed
  illustrative dropdown — this dataset has no real supplier table to draw from), status (Pending
  Review / Approved / Ordered / Received / Dismissed), assigned-to (a dropdown of the real people
  with access to this Fabric workspace, live-verified via the Fabric REST API, not guessed), a
  note field, created-by/at.
- **`ReorderActionAuditLog`** — append-only: every field change on every `ReorderAction`, with old
  value, new value, who changed it, when. No hard-delete anywhere in the app — `Dismissed` status
  is the soft-delete. This is the traceability layer that makes "no confirmation dialog before a
  status change" a defensible design choice rather than a missing safety feature (see the
  talk-track's Q&A section).

State survives a page reload and a full app refresh — verified live, not assumed.

---

## 5. Technical stack, briefly

- **Frontend:** React + TypeScript (Vite), Tailwind v4 with a locked design-token system (severity
  color scale, IBM Plex type family, 4px spacing grid), framer-motion for interaction polish.
- **Charts:** Vega-Lite via `@microsoft/fabric-visuals` (Fabric's themed charting wrapper).
- **Data:** Fabric Warehouse (WWI sample) → Import-mode Power BI semantic model (DAX measures for
  the risk ranking, Pareto cumulative %, ABC tiers) for the read side; Data API Builder + Rayfin
  SDK (GraphQL) for the write-back side.
- **Deployment:** Fabric Data App (via the `rayfin` CLI), embedded in the Fabric portal.
- **Why Import mode, not Direct Lake:** at this data scale (trial capacity, not tens of millions of
  live rows) both modes need an identical setup flow, and Import additionally supports calculated
  columns/hybrid tables/aggregations and skips Direct Lake's SKU-guardrail fallback behavior — a
  real risk to debug under hackathon time pressure.

---

## 6. Engineering story worth telling judges (shows real debugging rigor, not just feature-building)

On the final day, live use of the deployed app surfaced several real bugs. Each one was
**root-caused**, not patched blind — worth mentioning if a judge asks about process/quality:

1. **Blank data fields (Reorder Actions dates, Audit Trail entries) traced to a real SDK bug:**
   the data-fetching library's `findMany()` call silently defaults to selecting only the record ID
   unless field selection is requested explicitly — every other field came back empty. Looked like
   a date-formatting bug at first; wasn't. Fixed by requesting fields explicitly everywhere.
2. **That fix exposed a second, previously-unreachable crash:** once those fields actually started
   returning data, the SDK's own auto-deserialization converts date strings to real `Date` objects
   — but the date-parsing code assumed strings only, and crashed the whole page. Fixed, and a
   regression test was added for a function that had zero test coverage despite being hit by two
   separate live bugs in one day.
3. **A live API rate-limit error, traced to an architecture problem, not a quota problem:** each
   row in a 219-item list was firing its own background data query the moment it scrolled into
   view, unthrottled — flooding the Fabric capacity's request limit. Fixed by removing the
   per-row feature entirely rather than adding a band-aid throttle.
4. **A chart axis bug that survived two "fixes" before the real cause was found:** a bar chart
   was visually not reaching its zero baseline, even though the chart's own configuration code was
   already provably correct. The actual cause was one layer down — the charting *library* itself
   silently auto-adjusts axis tick values on every render unless explicitly told not to. Found by
   reading the library's own source code on the third attempt, not by guessing a third patch to
   the same file.

The throughline: every one of these was diagnosed with live evidence (reading actual source code,
checking actual API responses, checking actual deployed bundle hashes) before writing a fix —
never a guess-and-hope patch, and never the same category of bug patched twice with different
symptoms.

---

## 7. Deliberate scope decisions (useful if asked "why didn't you build X")

- **No forecasting model** — the sparkline/trend chart shows real historical data only; no
  predictive model, because the team doesn't have the data to back one honestly.
- **No hard-delete anywhere** — `Dismissed` status is the soft-delete for `ReorderAction`; full
  audit history is preserved always.
- **Fixed illustrative supplier list, not real supplier data** — this WWI sample has no supplier
  table; rather than fabricate fake-real-looking supplier names as if sourced from data, they're
  presented as a plain fixed dropdown, same honesty principle as the risk-proxy disclosure.
- **No confirmation dialog on status changes** — traded for full audit-trail traceability instead,
  matching how real high-frequency internal tools (Jira, Trello-style status transitions) work.
- **Multiple reorder actions per item allowed, not blocked** — mirrors real purchase-order
  workflows (partial orders, corrections over time); blocking it would trap genuine mistakes given
  there's no hard-delete to undo one.
