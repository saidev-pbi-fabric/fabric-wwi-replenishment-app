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

- [ ] **T0.2** — Fabric workspace access confirmed for both team members
  - Acceptance: both team members can open the shared trial-capacity workspace in the Fabric portal.
  - Verify: each person opens the workspace URL and sees it listed.
  - Files: none (portal action).

## Phase 1 — Data Foundation

- [ ] **T1.1** — Load WWI DW via Warehouse Copy Job
  - Acceptance: Warehouse contains `Fact.Order`, `Fact.Stock Holding`, `Fact.Purchase`,
    `Dimension.Stock Item`, `Dimension.Supplier` matching `docs/wwi-schema-reference.md`.
  - Verify: row counts > 0 on each table (`sqldw-consumption-cli` or portal).
  - Files: none (portal action: New Item → Copy job → Sample data → "Retail Data Model from Wide
    World Importers" → Full copy).

- [ ] **T1.2** — Build semantic model core (Import mode, relationships)
  - Acceptance: SM exists, storage mode Import, relationships wired between the 3 facts and
    Stock Item / Supplier / Date dimensions.
  - Verify: `semantic-model-authoring` skill lists tables/relationships matching the schema doc.
  - Files: none (Fabric-side semantic model).

## Phase 2 — Query Authoring

- [ ] **T2.1** — Author + validate risk DAX measures (At Risk flag, Suggested Reorder Qty, Lead
      Time priority, Has Open Backorder, Has Non-Finalized Purchase)
  - Acceptance: measures return correct values on 3 spot-checked stock items (at-risk, on-track,
    backorder).
  - Verify: DAX query via `semantic-model-authoring` / `dax_query_operations`.
  - Files: none (SM-side measures).

- [ ] **T2.2** — Register app connection + author Page 1 DAX queries (KPI strip, trend chart,
      top-at-risk list)
  - Acceptance: `npx fabric-app-data query` returns the expected columns for each query; files
    follow the `.dax`/`.json`/`.ts` factory convention in `AGENTS.md`.
  - Verify: `npx fabric-app-data query wwiRetail --file <path>.dax` per query.
  - Files: `fabric.yaml`, `src/fabric.generated.ts`, `src/queries/overview/*`.

- [ ] **T2.3** — Author Page 2 DAX queries (ranked at-risk list w/ severity/supplier filters, item
      detail)
  - Acceptance: same as T2.2, for Action Center queries.
  - Verify: same CLI check.
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
