# Task List — Fabric WWI Replenishment App

See `tasks/plan.md` for the dependency graph and checkpoints. Check off as completed.

## Phase 0 — Environment & Access

- [ ] **T0.1** — Personal laptop dev environment parity
  - Acceptance: `npm install`, `npm run lint`, `npm test` succeed; Claude Code + `addyosmani/agent-skills`
    plugin + `microsoft/skills-for-fabric` (powerbi-authoring) plugin installed; `az login` and
    `npx rayfin login` both succeed.
  - Verify: run each command listed above; confirm plugin slash commands (`/spec`, `/plan`, ...)
    resolve after a session restart.
  - Files: none (environment only) — see `docs/personal-laptop-setup.md`.

- [x] **T0.2** — Fabric workspace access confirmed for both team members (Saidev confirmed 8/17,
      native account in teammate's `r4k5` tenant, workspace `Fabric-App-Hackathon` visible)
  - Acceptance: both team members can open the shared trial-capacity workspace in the Fabric portal.
  - Verify: each person opens the workspace URL and sees it listed.
  - Files: none (portal action).

## Phase 1 — Data Foundation

- [x] **T1.1** — Load WWI DW via Warehouse Copy Job (done 8/17)
  - Acceptance: Warehouse contains the real 6 tables (`dimension_city`, `dimension_customer`,
    `dimension_date`, `dimension_employee`, `dimension_stock_item`, `fact_sale`) matching
    `docs/wwi-schema-reference.md`. (Superseded: no `Fact.Order`/`Fact.Stock Holding`/
    `Fact.Purchase`/`Dimension.Supplier` — those never existed in this sample.)
  - Verify: row counts > 0 on each table — confirmed via `onelake_get_table` (fact_sale ~50.15M,
    dimension_stock_item 672, dimension_city 116,295, dimension_customer 403, dimension_date
    6,210, dimension_employee 213).
  - Files: none (portal action: New Item → Copy job → Sample data → "Retail Data Model from Wide
    World Importers" → Full copy).

- [x] **T1.2** — Build semantic model core (Import mode, relationships) (done 8/17, refresh
      pending — see note)
  - Built + deployed via `powerbi-modeling-mcp` as `WWI Replenishment` in workspace
    `Fabric-App-Hackathon` (item id `8023010f-ba5e-42ed-93c9-b505b6d560d8`). 3 tables: `Sale`
    (fact_sale aggregated to Stock Item x Date grain, 73,365 rows, query-folded GROUP BY —
    see `docs/wwi-schema-reference.md`), `Stock Item`, `Date` (marked as the model date table).
    2 relationships: `Sale`->`Stock Item`, `Sale`->`Date`, both many-to-one, single-direction.
    3 base measures: Total Quantity Sold, Total Sales Excluding Tax, Total Profit.
    Dropped `dimension_city`/`dimension_customer`/`dimension_employee` — not needed for any
    SPEC.md Page 1/2 success criterion (lean model per modeling guidelines); can add back if a
    later page needs them.
  - [DONE 8/17] Credential fix: bound a Workspace Identity cloud connection to the model's data
    source in the Fabric portal, refresh succeeded.
  - [DONE 8/17] Measures verified via `dax_query_operations`: Total Quantity Sold ≈1.9B,
    Total Sales Excluding Tax ≈$36.2B, Total Profit ≈$18.0B — internally consistent with the
    50.15M-row source. **T1.2 fully complete.**

## Phase 2 — Query Authoring

- [x] **T2.1** — Author + validate risk DAX measures (done 8/17)
  - Built on `Sale`: `Max Sale Date` (hidden, reference = 11/30/2000 since data is historical, not
    `TODAY()`), `Recent Daily Sales Rate`, `Prior Daily Sales Rate` (both 30-day trailing windows
    via `DATESINPERIOD`), `Demand Trend %`, `Suggested Reorder Qty` (proxy: rate x Lead Time Days
    x 1.2), `At Risk Rank` (`RANKX(ALL('Stock Item'), ...)`). Calculated column on `Stock Item`:
    `Lead Time Priority Tier` (Short <=7 / Medium 8-14 / Long >14 days, from observed range 0-20,
    avg 12.3). All have descriptions per `docs/design-and-dax-references.md` guidance.
  - **Bug caught + fixed during verification**: `At Risk Rank` initially used
    `RANKX(ALL('Stock Item'[Stock Item Key]), ...)` — only clears filters on that one column, so
    the outer `SUMMARIZECOLUMNS` grouping filters (on `Stock Item`/`Lead Time Priority Tier`, a
    different column) stayed active inside the RANKX iteration, collapsing every item to rank 1.
    Fixed to `RANKX(ALL('Stock Item'), ...)` (whole table). Worth remembering as a RANKX gotcha.
  - Verify: confirmed via live `dax_query_operations` — top 5 by rank are distinct, sensible
    (shipping/packaging items ranking highest on demand x lead time, as expected for a wholesale
    distributor dataset).
  - Files: none (SM-side measures).

- [x] **T2.2** — Register app connection + author Page 1 DAX queries (done 8/17)
  - `fabric.yaml`/`src/fabric.generated.ts` registered (`wwiRetail` → `WWI Replenishment` in
    `Fabric-App-Hackathon`). 3 query sets in `src/queries/overview/`: `kpi-strip` (Items Tracked,
    Avg Lead Time Days, Top At Risk Items [rank<=20], Accelerating Demand Items), `sales-trend`
    (daily units sold, zero-based unsmoothed line per dataviz guidance), `top-at-risk-items`
    (top 10 by At Risk Rank, bar chart colored by Lead Time Priority Tier).
  - Note: KPI/chart content deviates from the original wireframe-design-brief.md labels
    ("Open Backorders" etc — stale, no such data exists). Real KPIs chosen from what's actually
    computable; brief still needs a text-only pass to match (tracked, not yet done).
  - [UPDATED 8/18, T6.1] `sales-trend.dax` rescoped to the top 20 at-risk items (was whole
    catalog — flat/uninformative on real data, caught after live testing) and its Vega-Lite
    y-axis is deliberately non-zero-based (this dataset's daily totals vary only ~9% even
    scoped, so zero-based hid all signal) — see that commit for the full rationale.
  - Verify: all 3 `.dax` files validated live via `dax_query_operations` (exact result-column
    headers captured for `columnMetadata`, not guessed). `npm test` 23/23 passing (incl. 3 new
    spec files), `npm run lint` clean (0 errors).
  - Files: `fabric.yaml`, `src/fabric.generated.ts`, `src/queries/overview/*`.

- [x] **T2.3** — Author Page 2 DAX queries (done 8/17)
  - `src/queries/action-center/`: `ranked-at-risk-list` (all 672 items, ordered by At Risk Rank,
    unfiltered — filtering by Lead Time Priority Tier happens client-side; no supplier dimension
    exists in this dataset, so that's the filter axis instead of the original "severity/supplier"
    wording), `item-detail` (parameterized — `{{STOCK_ITEM_KEY}}` placeholder in the `.dax` file
    substituted by the factory function, integer-validated before interpolation).
  - Verify: both `.dax` files validated live via `dax_query_operations` (item-detail tested with
    a real key, 43 → "Shipping carton (Brown) 413x285x187mm", rank 1). `npm test` 30/30 passing
    (7 new specs), `npm run lint` clean.
  - Files: `src/queries/action-center/*`.

## Phase 3 — Page 1: Replenishment Overview

- [x] **T3.1** — Design tokens (severity scale + fonts) wired into `global.css`/`index.html` (done 8/18)
  - Severity scale (`--color-critical/-at-risk/-on-track` + foreground pairs, light+dark), IBM
    Plex Sans Condensed/Sans/Mono loaded via Google Fonts, `--radius` dropped to 4px.
  - Verify: `npm run lint` clean. Live browser check deferred (no Chrome extension connected this
    session) — see T3.2 note.
  - Files: `src/global.css`, `index.html`.

- [x] **T3.2** — KPI strip end-to-end (4 tiles, real data, loading/empty/error states) (done 8/18)
  - `src/components/overview/kpi-strip.tsx` wired to `kpiStrip()`; per-tile skeleton loading,
    centered empty message, destructive-banner error. Severity rail on the two risk-signal tiles
    (Top At-Risk Items = critical, Accelerating Demand = at-risk/on-track by sign); neutral tiles
    (Items Tracked, Avg Lead Time) get no rail. `App.tsx` rebuilt: header (app name, 2-page nav,
    theme toggle) + Overview page hosting the strip; template `EmptyStatePreview` deleted.
  - Note: `npm run test:fabric` (live Fabric portal embed) not runnable yet — app isn't registered
    as a Fabric item (that's T4.1). `AuthGate` blocks standalone `npm run dev` by design (only
    renders inside the Fabric iframe). Verified via lint + 4 new unit tests (loading/success/
    empty/error) instead; full live-embed visual check deferred to after T4.1.
  - Files: `src/components/overview/kpi-strip.tsx` (+ spec), `src/App.tsx`.

- [x] **T3.3** — Trend chart + top-at-risk ranked list end-to-end (click-through toward Page 2) (done 8/18)
  - `src/components/overview/sales-trend-chart.tsx` + `top-at-risk-list.tsx`, both VegaVisual +
    `useCssTheme` + `toDataTable`, same loading/empty/error pattern as T3.2. Row 2 grid: trend
    chart spans 2 cols, ranked list is the tall narrow card (per wireframe brief).
  - Bar clicks fire `onInteraction` -> `onSelectItem(stockItemName)`, lifted to `App.tsx` state,
    switching to a stub Action Center page showing the selection (real master-detail/write-back
    is Phase 5, T5.1-T5.3) — nav tab is enabled now rather than a permanent dead link.
  - **dataviz skill CVD check**: ran `validate_palette.js` on the red/amber/green severity triad —
    FAILs (ΔE 2.0 protan; red-green is a hard case for this metaphor). Kept as-is: it's a locked
    2026-08-17 design decision used app-wide (rail, badges), not something to redesign mid-phase.
    Mitigated by the Lead Time Tier legend always showing text labels, never color alone. Flagged
    here for awareness, not blocking.
  - Verify: `npx tsc --noEmit` clean (caught a `VisualizationSpec` typing issue `tsc -b --noCheck`
    would have missed — fixed by passing `spec` as a JSON string), `npm run lint` clean, 42/42
    tests (8 new), `npm run build` succeeds. Live `npm run test:fabric` deferred with T3.2.
  - Files: `src/components/overview/sales-trend-chart.tsx` (+ spec), `top-at-risk-list.tsx`
    (+ spec), `src/App.tsx`.

**Checkpoint: Page 1 demoable standalone before starting write-back.** T5.1 only actually depends
on T3.1 (tokens), T2.3 (Page 2 DAX), and T4.1 (entity) — not T3.2/T3.3. Routing it through this
checkpoint in `tasks/plan.md`'s graph is a schedule choice (Tue→Wed split), not a hard technical
dependency; a second team member can start T5.1 in parallel with T3.2/T3.3 if Page 1 runs long.

## Phase 4 — Write-back Foundation

- [x] **T4.1** — Define `ReorderAction` Rayfin entity, flip `data.enabled: true`, deploy schema
      (done 8/18, one acceptance criterion partially deferred — see note)
  - App deployed as a real Fabric item in `Fabric-App-Hackathon` (item id
    `1abea9ee-a336-481b-95e7-16987ff27cca`), static hosting live at
    `https://clear-flora-56b47b3cae-westus.webapp.fabricapps.net`, `ReorderAction` schema applied
    to the provisioned SQL database (12 fields, `status` as a DB-level enum constraint via
    `@set()`, verified field-by-field in the `rayfin up db apply` output).
  - Two real deploy bugs found + fixed (not spec-authoring guesses): `rayfin.yml` needed
    `dialect: mssql` alongside `data.enabled: true` (server rejects it otherwise); entity
    compilation needed its own `rayfin/tsconfig.json` (the root `tsconfig.json` has `noEmit: true`
    for Vite — without an override, `tsc` reported "successful" while emitting zero files).
  - Deviated from SPEC.md's illustrative snippet in 2 places after checking the real decorator
    types: `status` uses `@set()` not `@text()` (enum constraint, not just a comment); `createdAt`
    is `Date` not `string` (matches `@date()`'s actual signature).
  - Note (acceptance not fully met): "`client.data.ReorderAction` create/read round-trips from a
    scratch script" could not be completed. `ReorderAction`'s `@authenticated()` policy requires a
    token from Rayfin's embedded Fabric SSO flow specifically — confirmed by reading
    `@microsoft/rayfin-auth-provider-fabric`'s source (postMessage bridge, embedded-only, no
    standalone token path). `az account get-access-token` tokens (both Fabric and Power BI
    resources) were rejected with 401. `npm run test:fabric` also isn't runnable — it shells out to
    a `playwright-cli` tool not installed on this machine (pre-existing gap from an earlier
    session, not fixed here). Real round-trip verification deferred to T5.2, where a live
    Fabric-embedded click-through through the actual write-back form exercises create/read
    naturally.
  - Verify: `npx rayfin up status` (auth + data both enabled, SQL database provisioned, endpoint
    reachable); `npx rayfin up db apply` output.
  - Files: `rayfin/rayfin.yml`, `rayfin/data/reorder-action.ts`, `rayfin/tsconfig.json`.

## Phase 5 — Page 2: Action Center

- [x] **T5.1** — Master list + detail panel end-to-end (done 8/18, local dev-preview only)
  - `RankedListPanel` (left, `rankedAtRiskList()`, client-side filter by Lead Time Priority Tier,
    severity rail per row) + `ItemDetailPanel` (right, `itemDetail(key)`, populates on selection,
    severity-colored header strip) + `ActionCenter` composing both, resolving Page 1's
    click-through handoff (`selectedItemName`) to a key once the list loads. Wired into `App.tsx`,
    replacing the Phase-3 stub.
  - Note: built and verified against **local dev-preview only** (same `import.meta.env.DEV`
    fixture pattern as Page 1) — the app isn't registered as a Fabric item yet (T4.1 not started),
    so `npm run test:fabric` isn't runnable and there's no live semantic-model data to select
    against. Real "selecting a left-panel item populates the right-panel detail view" acceptance
    is satisfied against fixture data now; needs a live-embed re-check after T4.1.
  - Bug caught + fixed during the local screenshot pass: `ITEM_DETAIL_FIXTURE` was a single
    hardcoded row, so selecting different items in dev preview always showed the same detail.
    Expanded to one fixture row per ranked item, keyed by Stock Item Key.
  - Verify: `npm run lint`, `npx tsc --noEmit`, `npm test` (61/61, 19 new), `npm run build` all
    clean; 0 fixture-string matches in the production bundle; screenshotted light+dark, with a
    selection, and with the lead-time filter applied.
  - Files: `src/components/action-center/*`, `src/App.tsx`, `src/lib/dev-preview-fixtures.ts`.

- [x] **T5.2** — `ReorderAction` write-back form: create path (done 8/18, persistence check
      deferred — see note)
  - `ReorderActionForm` renders once the selected item's detail loads, prefills Suggested Reorder
    Qty from the live query (editable), submits via `client.data.ReorderAction.create()` with
    `createdBy` from the real signed-in Fabric user (`useAuth`). Wired into `ActionCenter` beneath
    `ItemDetailPanel`. Typed the Rayfin client for the first time (`AppDataSchema` /
    `ReorderActionRecord` in `rayfin-client.ts`) so `client.data.ReorderAction` is compile-checked.
  - Bug caught + fixed during the local screenshot pass: passing `usingDevFixture` as a prop into
    a child component broke esbuild's dead-code elimination (same class of bug as an earlier
    session), leaking the dev-preview banner text into the production bundle. Fixed by keeping the
    literal `import.meta.env.DEV` check and its dependent JSX in the same module scope; re-verified
    0 matches in the built bundle.
  - `/agent-skills:review` flagged `scalarByColumnName` duplicated a 3rd time — extracted to
    `src/lib/to-data-table.ts`, updated all 3 call sites (including `kpi-strip.tsx` from Phase 3,
    now justified since the 3rd-use threshold was hit). Also disabled the submit button after
    success to prevent an accidental double-submit.
  - Note (acceptance partially deferred, same root cause as T4.1): "submitting creates a real row
    ... a reload shows it persisted" needs a live Fabric-embedded session — not available yet (same
    `playwright-cli` gap as T4.1). Live-tested what IS testable locally instead: clicking submit in
    dev-preview hit the real deployed GraphQL endpoint (not a mock) and correctly surfaced "The
    current user is not authorized to access this resource" — confirms `@authenticated()` is
    enforced and the write path is genuinely live-wired, not a stub. Full create→reload persistence
    check deferred to a real Fabric-embedded session.
  - Verify: `npm run lint`, `npx tsc --noEmit`, `npm test` (67/67, 6 new), `npm run build` all
    clean; 0 fixture-string matches in the production bundle; screenshotted light+dark with the
    form open, and the live-endpoint submit-error state.
  - Files: `src/components/action-center/reorder-action-form.tsx` (+ spec),
    `src/components/action-center/action-center.tsx` (+ spec), `src/lib/rayfin-client.ts`,
    `src/lib/to-data-table.ts`, `src/components/overview/kpi-strip.tsx`,
    `src/components/action-center/item-detail-panel.tsx`, `src/services/rayfin-auth.service.ts`.

- [x] **T5.3** — Status update path (done 8/18, live walk-through deferred — see note)
  - `ReorderActionHistory` lists existing actions for the selected item
    (`client.data.ReorderAction.findMany`, filtered by `stockItemKey`), each with a status
    dropdown that updates in place via `.update({id}, {status})`. All 5 values reachable. A
    successful create in `ReorderActionForm` bumps a `refreshKey` so the history refetches.
  - Bug caught + fixed via the Prove-It pattern (reproduction test first): a failed status update
    set an error string that was never rendered — failed completely silently. Split into separate
    `loadError`/`updateError` state so a failed update surfaces its own banner without hiding the
    list. Regression test added.
  - Note (same root cause as T4.1/T5.2): "walk all 5 statuses live" needs a real Fabric-embedded
    session — deferred for the same reason (`playwright-cli` gap). Screenshotted locally instead:
    history section correctly shows a live auth error against the real deployed backend (proving
    it's genuinely wired, not a stub), same as the create form.
  - Verify: `npm run lint`, `npx tsc --noEmit`, `npm test` (74/74, 8 new), `npm run build` all
    clean; 0 fixture-string matches in the production bundle.
  - Files: `src/components/action-center/reorder-action-history.tsx` (+ spec),
    `src/components/action-center/action-center.tsx` (+ spec),
    `src/components/action-center/reorder-action-form.tsx` (+ spec), `src/lib/rayfin-client.ts`.

**Checkpoint: full golden path verified live in the Fabric portal embed.**

## Phase 6 — Validation & Polish

- [x] **T6.1** — Full `app-validation` pass across both pages (accessibility, console errors,
      visual-consistency checklist), plus a clean build — **done 8/18**
  - Real bugs found from live-portal screenshots the user sent, not from local dev preview alone
    (dev fixtures shared the same blind spots): (1) `ranked-at-risk-list.dax` had no `TOPN`, pulling
    every stock item in the model (hundreds, incl. zero-suggested-reorder noise rows) — the actual
    cause of the "page is too long to scroll" complaint, not a CSS issue. Capped to `TOPN(25)`,
    matching Page 1's chart pattern. (2) The list panel's `overflow-y-auto` did nothing because no
    ancestor had a bounded height — gave it a real `max-h-[640px]`. (3) Page 1's chart had no
    lead-time filter while Page 2 did — extended `top-at-risk-items.dax` to the same
    `TOPN(25)`-superset-then-client-filter-then-slice-10 pattern so both pages now share one
    `TIER_FILTERS` constant (extracted to `src/lib/severity.ts`). (4) Long WWI item names crowded
    the chart's y-axis — added `axis.labelLimit: 160` for ellipsis truncation. (5) Item-detail header
    showed literal "N/A · N/A" for stock items with no real brand/color in the WWI sample (mostly
    non-apparel SKUs) — now omitted when both are "N/A". (6) Finished the icon pass started in the
    prior WIP commit — added header icons to the 3 remaining components (ranked list, reorder form,
    reorder history) for parity with the KPI strip/charts.
  - Verify: 85/85 tests (11 new), `npm run lint` (0 errors), `tsc --noEmit` clean, `npm run build`
    clean with zero dev-fixture-string leakage into the prod bundle, screenshot-verified locally in
    both light and dark (Overview + Action Center). **Not verified**: `npm run test:fabric`
    (live Fabric portal walkthrough) — no Fabric-authenticated browser session available in this
    environment; redeployed via `rayfin up` instead and left live-portal confirmation to the user.
  - **[FOLLOW-UP BUG, found by the user on the live portal, fixed same day]** Item (3) above shipped
    broken: the "client-filter a shared global TOPN(25)/(10)" design was wrong on the real data.
    Queried the live semantic model directly (Power BI REST `executeQueries`, not just
    fixtures/unit tests) and confirmed Medium Lead Time dominates the top of `At Risk Rank`
    (582 of 672 stock items are Medium tier) — Long doesn't appear until rank 27, Short not until
    rank 43. A global TOPN(25) cap silently excluded both, so selecting "Short" or "Long" in either
    page's filter always showed zero rows/an empty chart. Root cause of why the earlier fix's own
    unit tests didn't catch this: the test fixtures were hand-built with one row per tier by
    construction, which can never reproduce a real skewed distribution — a process gap, not a
    tooling one. Fixed properly: both `ranked-at-risk-list.dax` and `top-at-risk-items.dax` now
    take a `{{TIER_FILTER}}` placeholder (same safe-substitution pattern as `item-detail.dax`'s
    `{{STOCK_ITEM_KEY}}`, enum-only, no injection risk) so each tier gets its own server-side
    ranked query instead of a client-side slice — `tierFilterClause()` in `src/lib/severity.ts`.
    Also fixed a real DAX syntax bug caught only by live execution (unit tests can't catch invalid
    DAX): `SUMMARIZECOLUMNS`'s filter-table arguments must come directly after the group-by columns,
    not after the named measure pairs — moving the placement fixed a
    "`SUMMARIZECOLUMNS` expects a column name as argument number 9" error. Also added a real
    filter-aware "No items match this tier" empty state (previously a blank box with no way to
    change the filter — the empty-state branches had returned early before the header/dropdown
    rendered at all) and fixed the KPI strip's neutral-severity tiles, which used a fully
    transparent left rail and looked visually "incomplete" next to the colored-rail tiles beside
    them (also user-flagged) — now a visible neutral gray rail (`border-l-border`).
  - Verify (follow-up): live-queried the corrected DAX directly against the semantic model (not
    fixtures) for every tier — `ranked-at-risk-list` (Page 2, TOPN 25): Short → 25 real rows.
    `top-at-risk-items` (Page 1, TOPN 10): All → 10, Short → 10, Long → 4 (real data — only 4 of
    the 12 Long-tier items have a computable risk signal in this ~11-month sample window; that's a
    genuine data characteristic, not a bug). 91/91 tests (6 new, incl. explicit regressions for
    this exact bug), lint/tsc/build clean, zero dev-fixture leakage, redeployed via `rayfin up`.
  - Files: `src/queries/action-center/ranked-at-risk-list.dax`, `src/queries/overview/top-at-risk-items.dax`,
    `src/queries/overview/top-at-risk-items.json`, `src/lib/severity.ts`,
    `src/components/action-center/ranked-list-panel.tsx`, `src/components/action-center/item-detail-panel.tsx`,
    `src/components/action-center/reorder-action-form.tsx`, `src/components/action-center/reorder-action-history.tsx`,
    `src/components/overview/top-at-risk-list.tsx` + specs for each.

- [~] **T6.2** — Talk-track (drafted 8/19, not yet rehearsed) + buffer for bug fixes (Fri 8/21)
  - Drafted `docs/talk-track.md`: timed sections (hook, dataset honesty, Overview walkthrough incl.
    the new $ KPI, Action Center walkthrough incl. the rationale sentence + sparkline + live
    write-back submit/reload moment, close, Q&A prep). Written against the already-locked scope
    (dataset, 3 pages, write-back), so it didn't need to wait for the finished build — only the
    bracketed cue about the "Accelerating Demand" drill-through (still an open decision) is a
    placeholder pending that call.
  - Acceptance: a short talk-track exists covering the scenario, all 3 pages, and the write-back
    demo moment — met. Full timed rehearsal against the live deployed app — not yet done.
  - Verify (remaining): dry-run with a stopwatch against the actual deployed app on 8/21, not from
    memory of an earlier session — checklist is in the doc itself.
  - Files: `docs/talk-track.md`.

- [x] **T6.4** — Landing page (built 8/18, ahead of the Fri 8/21 slot; decided 2026-08-17, see
      `CLAUDE.md` locked scope)
  - Built `src/components/landing/landing-page.tsx`: hero (event/track eyebrow, app name, one-liner
    pitch, primary CTA "Open the Dashboard"), a "The problem" section (reused verbatim from
    `docs/hackathon-registration-details.md`'s problem statement so the pitch stays consistent
    across the app and the registration write-up), a 3-card "how it works" row (surface risk /
    record action / track status), a disclosed-proxy dataset callout (WWI sample, no real
    backorder data — same honesty framing as `docs/wwi-schema-reference.md`), and a tech-stack
    strip. Wired into `App.tsx` as a new `"landing"` page, default on load, with a "Home" nav tab
    and the header title also acting as a home link.
  - Acceptance: renders with real app framing (not a stock template splash) — met, content is
    project-specific throughout, no placeholder copy. Links into the Overview page — met, CTA and
    Home nav both wired and tested. Matches the locked visual direction — met, reuses the same
    card/rail/icon language as the KPI strip and query panels (`rounded-lg border bg-card
    shadow-sm`, IBM Plex via the existing font tokens); deliberately did NOT reuse the
    critical/at-risk/on-track severity colors here since this content isn't conveying risk status
    (`dataviz` skill: status colors are reserved, never repurposed for unrelated content).
  - Verify: 5 new component tests + 3 new `App.spec.tsx` tests (default page, CTA navigation, Home
    nav), full suite 85/85, lint/tsc/build clean, screenshot-verified locally light + dark. **Not
    verified**: `npm run test:fabric` (live Fabric portal) — same environment limitation as T6.1.
  - Files: `src/components/landing/landing-page.tsx` (+ spec), `src/App.tsx` (+ spec).

- [ ] **T6.3 (stretch, optional)** — Tabular Editor 2 (free CLI) Best Practice Analyzer sanity pass
      on the semantic model (Fri 8/21, only if T6.1/T6.2 leave slack)
  - Why TE2 not TE3: TE3's AI Assistant/CLI enhancements are paid; TE2's CLI (`TabularEditor.exe`)
    is free and sufficient for a one-shot BPA check — see decision note in project memory.
  - Command: `TabularEditor.exe "powerbi://api.powerbi.com/v1.0/myorg/<workspace>" "<model name>"
    -A "<rules.json>" -V` (connects live via XMLA to the Fabric semantic model, runs BPA headless,
    `-V` for readable log output). Requires the workspace's XMLA endpoint set to Read-Write in
    Fabric capacity admin settings — verify this once during SM build (T1.x), not on Friday.
  - Rules file: Microsoft's public Analysis Services / Power BI Best Practice Rules JSON (free,
    community-maintained) — not yet fetched/vetted, do this before Friday if pursuing T6.3.
  - Not in scope: VertiPaq Analyzer — TE2 CLI does not appear to expose this headlessly (only
    confirmed as a GUI feature); skip rather than research further under time pressure. If desired,
    a one-time manual look in the TE2 GUI (also free) is fine, not scripted.
  - Acceptance: BPA violations list reviewed; only trivial/high-value fixes applied if time allows.
    This is a sanity check, not a gate — do not let it block the demo.
  - Files: none required in-repo; optionally `tools/BPARules.json` if the rules file is saved.

- [x] **T6.5** — `gsd-ui-auditor` retroactive audit + fixes (done 8/19)
  - Ran a code-only 6-pillar audit (no Fabric-embedded screenshots available) against
    `docs/wireframe-design-brief.md` + `global.css` tokens. Score: 19/24 (Copy 3/4, Visuals 4/4,
    Color 2/4, Typography 3/4, Spacing 3/4, Experience Design 4/4). Full detail: `docs/UI-REVIEW.md`.
  - Fixed the 3 priority findings: (1) light-mode neutral ramp widened
    (`background/secondary/muted/border`: `#fff/#fafafa/#f0f0f0/#e0e0e0` →
    `#fff/#f7f7f8/#eef0f2/#d6d9dd`) — severity hex left untouched (already Fluent AA-vetted, risk
    of breaking contrast outweighs the vividness gain); (2) `ErrorFallback.tsx` +
    `auth-gate.component.tsx`'s unauthenticated screen migrated off raw Tailwind defaults onto the
    `font-heading`/`font-base`/`spacing-*`/`text-*` token system, copy reworded off the generic
    "Something went wrong"/"Try Again" pattern; (3) `title={row.name}` tooltip fallback added for
    truncated stock-item names (`ranked-list-panel.tsx`, `landing-page.tsx`).
  - Two flagged risks from the prior session's resume-prompt were checked against source and found
    to be non-issues, no fix needed: KPI-tile icon-animation asymmetry is deliberate (avoids false
    clickability on 3 non-actionable tiles); Action Center has not fallen behind Overview on
    states/interaction polish (both share `useQueryPanel`).
  - Also fixed, user-flagged separately (not from the audit): Action Center's "Record a Reorder
    Action" panel rendered far below the fold — root cause was `ItemDetailPanel`'s `h-full`
    stretching to match the ranked-list column's `max-h-[640px]` under CSS grid's default
    row-stretch; fixed with `items-start` on the parent grid (`action-center.tsx`). And: the
    "All" lead-time filter showing almost entirely Medium-tier rows is real data (582 of 672 stock
    items are Medium tier — live-verified via DAX `SUMMARIZECOLUMNS` query), not a filter bug; added
    a `tierDistributionCaption()` ("672 items tracked · 582 Medium · 78 Short · 12 Long") under the
    filter on both Page 1's chart and Page 2's ranked list so the skew reads as a disclosed fact.
  - Verify: 107/107 tests pass, `tsc --noEmit` clean (one pre-existing unrelated failure in
    `use-query-panel.spec.ts`, not touched by this task).
  - Files: `src/global.css`, `src/ErrorFallback.tsx`, `src/components/auth-gate.component.tsx`,
    `src/components/action-center/action-center.tsx`, `src/components/action-center/ranked-list-panel.tsx`,
    `src/components/overview/top-at-risk-list.tsx`, `src/components/landing/landing-page.tsx`,
    `src/lib/severity.ts`, `docs/UI-REVIEW.md`.

- [x] **T6.6** — Per-item sales-trend sparkline + naive forecast, done 8/19, deployed via `rayfin up`
  - Why: user asked (1) whether Suggested Reorder Qty is a forecast (it isn't — it's the reorder-
    point formula `Recent Daily Sales Rate × LeadTimeDays × 1.2`) and whether a forecast visual
    would add value, and (2) whether the current percent-only treatment of demand trend is the
    right choice, referencing https://data-goblins.com/power-bi/bar-charts (saved to
    `docs/design-reference-bank.md`) — its core caution against "Macguyvering" a bespoke visual
    argued for a plain, recognizable sparkline over something fancier.
  - Approved via an Artifact mockup first (before touching real DAX/components) — built with the
    app's own tokens (IBM Plex, severity colors, dark/light) and 3 real item names, comparing
    current-vs-proposed row and detail-panel treatments. User confirmed the direction before build.
  - Built: (1) `item-sales-trend.dax`/`.ts` — real daily `Sale[Quantity]` for one stock item, one
    row per calendar day (including zero-sale days, via `ADDCOLUMNS` over `ALL('Date'[Date])`, not
    a plain filter — otherwise no-sale days would silently disappear instead of showing as 0),
    bounded to `[Max Sale Date] - 60` (this dataset is historical Jan-Nov 2000, `TODAY()` would
    return an empty window — same reason the `Max Sale Date` measure exists). (2) `Sparkline`
    component (`src/components/shared/sparkline.tsx`) — hand-rolled SVG, not `VegaVisual`: at
    per-row/per-panel inline size Vega's chrome is overkill, and plain SVG can use
    `stroke/fill="currentColor"` with Tailwind's `text-critical`/`text-at-risk`/`text-on-track`
    classes directly, avoiding the light/dark hex duplication Vega's renderer forces elsewhere
    (see `top-at-risk-list.tsx`'s `SEVERITY_RANGE` comment). (3) Forecast extension: a naive
    linear-regression projection computed client-side from the same daily data already fetched —
    zero new DAX, zero model changes, rendered as a dashed continuation, explicitly labeled
    "linear trend, not a forecast model" so it's never mistaken for a real prediction. (4) Wired
    into `item-detail-panel.tsx` as a full-width 60-day chart below the existing detail fields,
    as its own independent query (a slow/failed trend fetch doesn't block the core fields).
  - Also added while in this component (same user request, "1% fixes"): a plain-English
    **rationale sentence** composed client-side from fields already on screen — no new DAX, no
    LLM call — e.g. "Sells 62.4/day, restocks in 18 days, demand accelerating (+34%) — ranked #1
    of 672." Renders under the item name/rank line.
  - Follow-on (not done, smaller than the MVP above): same mini-sparkline in `ranked-list-panel.tsx`
    rows and the KPI drill-through table, once this pattern is confirmed against the live app.
  - Verify: 5 new tests (`sparkline.spec.tsx`, `item-sales-trend.spec.ts`, 3 new
    `item-detail-panel.spec.tsx` cases for rationale/sparkline/re-query-count), 118/118 total pass,
    `tsc --noEmit` clean (same pre-existing unrelated failure as T6.5), `npm run lint` clean, DAX
    verified live against the semantic model before wiring (stock item key 43 — real ~180K/day
    volume, confirms the "one row per calendar day, zero-filled" query shape works), `npm run
    build` + `npx rayfin up` succeeded, deployed.
  - Files: `src/queries/action-center/item-sales-trend.dax` (+`.ts`, `.spec.ts`),
    `src/components/shared/sparkline.tsx` (+`.spec.tsx`),
    `src/components/action-center/item-detail-panel.tsx` (+`.spec.tsx`).

- [x] **T6.6b** — "$ at risk" KPI tile, done 8/19, deployed same pass as T6.6
  - Why: part of the same "top 1%" ask — judges remember a dollar figure more than a ranked list.
    `Unit Price × Suggested Reorder Qty` summed across the top-20 at-risk items, computed inline
    in the existing `kpi-strip.dax` query (no new model measure) — verified live: $98.8M. Framed
    with the same disclosed-proxy honesty as the rest of the app ("not literal stock value").
  - Renders as a 5th, full-width KPI tile (`fullWidth` flag on `Tile`, spans the row on `lg`) so it
    reads as a headline figure, not a 5th peer stat competing for the same visual weight as the
    other 4.
  - Verify: `kpi-strip.spec.ts` + `kpi-strip.spec.tsx` updated for the 5th column, part of the
    118/118 total pass above.
  - Files: `src/queries/overview/kpi-strip.dax` (+`.ts`, `.spec.ts`),
    `src/components/overview/kpi-strip.tsx` (+`.spec.tsx`), `src/lib/dev-preview-fixtures.ts`.
