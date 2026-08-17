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

- [ ] **T3.1** — Design tokens (severity scale + fonts) wired into `global.css`/`index.html`
  - Acceptance: matches `docs/wireframe-design-brief.md`; renders correctly in light + dark.
  - Verify: visual check via `npm run dev` render.
  - Files: `src/global.css`, `index.html`.

- [ ] **T3.2** — KPI strip end-to-end (4 tiles, real data, loading/empty/error states)
  - Acceptance: tiles show live counts; severity-rail border shows when a tile is in a risk state.
  - Verify: `npm run test:fabric` snapshot, no console errors.
  - Files: `src/components/overview/kpi-strip.tsx` (+ spec if logic warrants), `src/App.tsx`.

- [ ] **T3.3** — Trend chart + top-at-risk ranked list end-to-end (click-through toward Page 2)
  - Acceptance: chart renders stock-on-hand vs. reorder-level trend; ranked list rows carry the
    severity rail; clicking a row navigates to Page 2 with that item selected.
  - Verify: `npm run test:fabric`.
  - Files: `src/components/overview/*`, `src/queries/overview/*`.
  - Design: use `frontend-ui-engineering` + `dataviz` skills (locked in `CLAUDE.md`) for chart-type
    and layout decisions on the trend chart.

**Checkpoint: Page 1 demoable standalone before starting write-back.** T5.1 only actually depends
on T3.1 (tokens), T2.3 (Page 2 DAX), and T4.1 (entity) — not T3.2/T3.3. Routing it through this
checkpoint in `tasks/plan.md`'s graph is a schedule choice (Tue→Wed split), not a hard technical
dependency; a second team member can start T5.1 in parallel with T3.2/T3.3 if Page 1 runs long.

## Phase 4 — Write-back Foundation

- [ ] **T4.1** — Define `ReorderAction` Rayfin entity, flip `data.enabled: true`, deploy schema
  - Acceptance: `rayfin up` succeeds; `client.data.ReorderAction` create/read round-trips from a
    scratch script or console.
  - Verify: `npx rayfin up status`; manual create → read check.
  - Files: `rayfin/rayfin.yml`, `rayfin/data/schema.ts`, `rayfin/data/reorder-action.ts`.

## Phase 5 — Page 2: Action Center

- [ ] **T5.1** — Master list + detail panel end-to-end (real data, filter by severity/supplier,
      selection state)
  - Acceptance: selecting a left-panel item populates the right-panel detail view.
  - Verify: `npm run test:fabric`.
  - Files: `src/components/action-center/*`.
  - Design: use `frontend-ui-engineering` + `dataviz` skills for the master-detail layout.
  - Depends only on T3.1, T2.3, T4.1 — can start in parallel with T3.2/T3.3, see note above.

- [ ] **T5.2** — `ReorderAction` write-back form: create path end-to-end
  - Acceptance: submitting creates a real row with suggested qty pre-filled/editable; a reload
    shows it persisted.
  - Verify: `npm run test:fabric` golden path (view → select → create → reload) + a spec file
    covering the entity-call shape.
  - Files: `src/components/action-center/reorder-action-form.tsx` (+ spec), `rayfin/data/reorder-action.ts`
    if fields need adjusting.

- [ ] **T5.3** — Status update path (Pending Review → Approved → Ordered → Received / Dismissed)
  - Acceptance: status dropdown updates the existing row; all 5 values reachable and reflected.
  - Verify: `npm run test:fabric`, walk all 5 statuses live.
  - Files: `src/components/action-center/*`.

**Checkpoint: full golden path verified live in the Fabric portal embed.**

## Phase 6 — Validation & Polish

- [ ] **T6.1** — Full `app-validation` pass across both pages (accessibility, console errors,
      visual-consistency checklist), plus a clean build
  - Acceptance: no console errors from `http://localhost:5173` sources; no visual-consistency
    check failures; `npm run lint`, `npm test`, and `npm run build` all pass clean (per `SPEC.md`
    Success Criteria — `build` also type-checks and regenerates `fabric.generated.ts`, so this is
    the one place a break would otherwise slip through every prior task).
  - Verify: `npm run test:fabric` walking the full checklist in the `app-validation` skill, then
    `npm run lint && npm test && npm run build`.
  - Files: none / small fixes as issues surface.

- [ ] **T6.2** — Talk-track outline + buffer for bug fixes (Fri 8/21)
  - Acceptance: a short talk-track exists covering the scenario, the two pages, and the write-back
    demo moment.
  - Verify: dry-run the talk track against the running app.
  - Files: `docs/talk-track.md` (optional, not blocking).

- [ ] **T6.4** — Landing page (Fri 8/21; decided 2026-08-17, see `CLAUDE.md` locked scope)
  - Problem framing + one-liner pitch + entry point into the Overview page. Rich is fine, not
    required to be minimal — no DAX wiring needed so it's genuinely cheap relative to Phase 3-5.
    Scope/visual design not locked yet; decide at build time, same design language as
    `docs/wireframe-design-brief.md` (severity-rail motif, IBM Plex fonts).
  - Acceptance: renders with real app framing (not a stock template splash), links into the
    Overview page, matches the locked visual direction.
  - Verify: `npm run test:fabric`, visual check against the wireframe brief's tone.
  - Files: new landing component + route in `App.tsx`.

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
