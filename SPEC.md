# Spec: Fabric WWI Replenishment App

## Objective
A single Microsoft Fabric Data App for stock replenishment / back-order risk, built on the Wide
World Importers (WWI) DW retail data model. Warehouse ops users open the app inside the Fabric
portal to (1) see which stock items are at risk of stocking out and why, and (2) act on that risk
by creating and tracking reorder actions — without leaving the app or touching a spreadsheet.

**Users:** warehouse ops / inventory planners at a (fictional, WWI-sample) retail company, working
inside the Fabric portal.

**Success looks like:** a planner opens the app, sees a ranked list of at-risk items with why
they're at risk (below reorder level, open backorder, long lead time), picks one, and logs a
reorder action against it (quantity, supplier, status) that persists and is visible to the team on
reload.

This is a hackathon entry (Fabric Hackathon 2026, "Fabric App Champion" track, demo 2026-08-22).
Scope is deliberately small and locked — see Boundaries.

## Tech Stack
- **Frontend:** React 19 + TypeScript, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), scaffolded
  from Microsoft's `fabric-apps-analytic-templates` (Data App) Rayfin template — already in place,
  not chosen fresh.
- **Data (read):** `@microsoft/fabric-visuals` / `fabric-visuals-core` + `@microsoft/fabric-datagrid`
  for chart/grid rendering; `useSemanticModelQuery` hook executes DAX against the WWI semantic
  model (Import-mode, loaded via Fabric Warehouse Copy Job — no pipeline/medallion build).
- **Data (write-back):** Rayfin `data` service (currently `enabled: false` in `rayfin/rayfin.yml`
  — flips to `true` when the `ReorderAction` entity is built). Entity defined with `@entity()` in
  `rayfin/data/`, queried client-side via `client.data.ReorderAction` (GraphQL, typed, through
  `RayfinClient` — never raw `fetch`/hand-built GraphQL).
- **Auth:** Fabric embedded SSO (Entra ID) via `AuthProvider`/`useAuth` — already scaffolded, no
  separate login screen; the app renders inside a Fabric portal iframe.
- **Testing:** Vitest + Testing Library (unit/component), Playwright CLI via the Fabric portal
  embed flow (browser validation) — both already configured.
- **Hosting/deploy:** Fabric static app hosting via `rayfin up` (auth + data + staticHosting
  services in `rayfin.yml`).

## Commands
```
Install:        npm install
Dev server:      npm run dev            (Vite; app must still be viewed via Fabric portal embed —
                                          see app-validation skill, never validate at localhost)
Build:            npm run build          (regenerates fabric.generated.ts, typecheck, vite build)
Lint:             npm run lint
Unit tests:       npm test               (vitest run)
Unit tests watch: npm run test:watch
Browser validate: npm run test:fabric    (opens the app inside the Fabric portal embed)
Deploy:           npx rayfin login && npx rayfin up   (deploys static app + applies rayfin/data
                                                        schema migrations in one step)
Deploy status:    npx rayfin up status
```

## Project Structure
Existing template layout, extended with query and write-back conventions:
```
rayfin/
├── rayfin.yml              → services config (auth, data, staticHosting)
└── data/                   → NEW: Rayfin entities (rayfin/data/schema.ts + reorder-action.ts)
src/
├── fabric.generated.ts     → auto-generated connection aliases (from fabric.yaml)
├── App.tsx                 → top-level layout + 2-page nav (replaces EmptyStatePreview)
├── components/             → dashboard UI: KPI tiles, severity rail, ranked list, detail panel,
│                              ReorderAction form — grouped by page where it clarifies ownership
├── hooks/                  → data fetching (useSemanticModelQuery), auth, theme
├── lib/                    → utilities, fabric-client, rayfin-client, to-data-table
├── queries/
│   ├── overview/            → Page 1 (Replenishment Overview) DAX + Vega-Lite + factory files
│   └── action-center/       → Page 2 (Action Center) DAX + factory files
└── global.css               → Tailwind v4 tokens incl. new severity-scale tokens (see
                                docs/wireframe-design-brief.md)
docs/
├── wwi-schema-reference.md  → verified WWI DW columns/signals (source of truth for DAX)
└── wireframe-design-brief.md → locked visual direction (tone, layout, severity-rail motif)
```

## Code Style
Follow the existing template conventions (`.agents/skills/app-design`, `.agents/skills/rayfin`,
`AGENTS.md`) — do not introduce a second style. Key points, with one real example each:

**Query factory function** (`src/queries/overview/top-at-risk-items.ts`):
```ts
import type { ColumnMetadataMap } from "@/lib/to-data-table";
import query from "./top-at-risk-items.dax?raw";
import spec from "./top-at-risk-items.json";

const connection = "wwiRetail"; // from fabric.yaml

const columnMetadata: ColumnMetadataMap = {
  "Dimension.Stock Item[Stock Item]": { name: "StockItem", displayName: "Item" },
  "[Quantity On Hand]": { name: "QuantityOnHand", displayName: "On Hand" },
  "[Reorder Level]": { name: "ReorderLevel", displayName: "Reorder Level" },
};

export function topAtRiskItems() {
  return { connection, query, columnMetadata, vegaLiteSpec: spec };
}
```

**Rayfin entity** (`rayfin/data/reorder-action.ts`):
```ts
import { entity, uuid, text, int, date } from "@microsoft/rayfin-data";

@entity()
@authenticated() // any signed-in Fabric user; small internal ops tool, no row-level policy
export class ReorderAction {
  @uuid() id!: string;
  @int() stockItemKey!: number;
  @text({ max: 200 }) stockItemName!: string;
  @int() currentStockOnHand!: number;
  @int() suggestedReorderQty!: number;
  @int({ optional: true }) supplierKey?: number;
  @text({ max: 200, optional: true }) supplierName?: string;
  @text({ max: 20 }) status!: string; // Pending Review | Approved | Ordered | Received | Dismissed
  @text({ max: 1000, optional: true }) note?: string;
  @text({ max: 200, optional: true }) assignedTo?: string;
  @date() createdAt!: string;
  @text({ max: 200 }) createdBy!: string;
}
```

- Naming: kebab-case files, camelCase functions/variables, PascalCase components/entities.
- All DAX lives in `.dax` files, imported with `?raw` — never inline full DAX strings in `.ts`.
- All write-back data access goes through `client.data.ReorderAction` — never raw fetch/GraphQL.
- No mock, fake, or hardcoded data anywhere — all reads come from the real semantic model, all
  writes go through the real Rayfin entity.

## Testing Strategy
- **Framework:** Vitest + Testing Library for units/components; Playwright CLI (Fabric portal
  embed flow only — never plain `localhost`) for browser validation.
- **Always add a spec file for:** utility functions in `src/lib/`, query factory functions in
  `src/queries/` (verify DAX + column metadata + spec shape), the `ReorderAction` write-back call
  (verify the right entity/fields are sent for create vs. status-update).
- **As needed:** hooks and components with real logic (conditional rendering, derived state,
  error states). Skip specs for purely presentational components.
- Test fixtures use representative fixture data shaped like real query results — never mocked
  business logic standing in for a real query.
- No coverage-target-driven tests — a spec exists to document behavior or guard a regression, not
  to pad a number.
- Before calling any UI work done, run `npm run test:fabric` and walk the golden path (view
  at-risk items → open one → submit a reorder action → reload → confirm it persisted) plus the
  empty/error/loading states called out in the wireframe brief.

## Boundaries
- **Always do:** run `npm test` and `npm run lint` before considering a change done; follow the
  query/entity conventions above; validate any UI change via the Fabric portal embed
  (`npm run test:fabric`), never plain localhost; keep DAX signals grounded in
  `docs/wwi-schema-reference.md` (no invented columns); keep write-back scoped to the single
  `ReorderAction` entity in `CLAUDE.md`'s locked scope.
- **Ask first:** adding a 4th page or any entity beyond `ReorderAction` (the landing page is now
  committed 3rd-page scope, decided 2026-08-17 — see `CLAUDE.md`); adding a new npm dependency;
  changing the semantic model storage mode from Import; changing `rayfin.yml` services beyond
  flipping `data.enabled: true`; any RLS/policy
  design beyond the "any authenticated user, full access" default assumed above.
- **Never do:** use mock/hardcoded/fake data for any read or write path; store fetched data in
  memory/localStorage instead of fetching on demand; use raw `fetch()`/hand-built GraphQL instead
  of `client.data.<Entity>`; commit secrets or connection strings; skip the app-validation
  browser check after a UI change; use `rayfin up --force` (destructive schema change) without
  explicit review.

## Success Criteria
- Page 1 (Replenishment Overview) renders the KPI strip, at-risk trend chart, and top-at-risk
  ranked list from real DAX queries against the WWI semantic model — no placeholder data.
- Page 2 (Action Center) lets a user select an at-risk item, see its detail, and submit a
  `ReorderAction` (create) whose `status` can subsequently be changed (update) — both persist
  through Rayfin and are visible after a full page reload.
- All five `ReorderAction.status` values are reachable through the UI.
- `npm test`, `npm run lint`, and `npm run build` all pass clean.
- `npm run test:fabric` shows no console errors from `http://localhost:5173` sources and no
  visual-consistency check failures (per app-validation skill).
- App is demoable end-to-end inside the Fabric portal embed by 2026-08-21.

## Decisions (were Open Questions — confirmed 2026-08-16)
1. **`ReorderAction` access model: `@authenticated()`, no row-level policy.** Any signed-in Fabric
   user can read/create/update any reorder action. Confirmed — right-sized for a 2-3 person demo;
   `createdBy`/`assignedTo` are still captured as data so the audit trail exists even though it's
   not access-enforced. A production version would scope writes by role/assignee — out of scope
   here, mention it if judges ask.
2. **No hard-delete.** `Dismissed` status is the soft-delete; no delete UI or Rayfin delete
   mutation. Confirmed.
3. **Fabric item naming convention (confirmed 2026-08-17).** Microsoft doesn't mandate a specific
   item-naming scheme beyond "clear, descriptive, not generic" (per Fabric's own Item Publishing
   Requirements: no bare generic names without a prefix/suffix indicating purpose) — there's no
   official "wh_"/"lh_" prefix standard. We're using our own consistent scheme so both team members
   name things the same way:
   - **Warehouse:** `WWIWarehouse` (PascalCase, no spaces).
   - **Copy job:** `LoadWWIRetailData` (verb + subject — describes the action, not the default
     `CopyJob_1`, which is exactly the kind of generic name Fabric's own guidance flags).
   - **Semantic model:** `WWI Replenishment` (Title Case with spaces — this one is business/report
     -facing, shown to end users in the model picker, so it reads like a product name).
   - **Data App item:** `WWI Replenishment` (same name as the semantic model is fine here — it's
     the one thing an end user actually opens).
   - General rule: workspace-config/backend items (Warehouse, Copy job, pipelines) get
     PascalCase-no-spaces names; user-facing items (semantic model, the app itself, reports) get
     Title Case with spaces. Never leave a Fabric-assigned default name (`CopyJob_1`, `Warehouse_1`)
     in place.

## Pending (external, not a decision)
- **Fabric workspace/credentials** — per project `CLAUDE.md`, teammate is providing trial-capacity
  access. Semantic model connection alias (`wwiRetail` above is a placeholder name) gets finalized
  once the WWI Copy Job has run and `fabric-app-data add` is registered (task T2.2 in
  `tasks/todo.md`).

## Amendment (2026-08-20): Concentration-thesis rebuild + audit trail

The original build shipped a working app but with no single report thesis — tiles and charts
were added incrementally, not derived from one message. This amendment re-derives the report
around a specific thesis and adds one new capability. Reached through a full design review:
research against three independent real sources (live-verified WWI schema, a converted `.pbip`
of a Power BI Pareto tutorial + its NotebookLM narration, an audit-trail screen-recording), then
an iterative HTML mockup covering all three pages, revised four times against direct feedback
before being locked. Extends the sections above; does not replace them.

### Thesis
"Risk is concentrated in a small set of stock items, not spread evenly." Replaces the arbitrary
`[At Risk Rank] <= 20` cutoff used throughout the original build with a data-justified cutoff
derived from cumulative reorder-value share. Live-reverified 2026-08-20 via `onelake_list_tables`
against the actual warehouse — still exactly the 6 tables in `docs/wwi-schema-reference.md`, no
schema drift since the original build.

### Rollout safety net — no new Fabric app item
Rebuild happens on a git branch (`rebuild/pareto-thesis`) against a **duplicated semantic model**
item, name **`WWI Replenishment Rebuild`** (Title Case with spaces, per Decision 3 above). The
current `WWI Replenishment` SM and the currently-deployed app are never touched mid-rebuild — git
branching alone does not protect the live SM, since SM measures are written directly to the live
Fabric item via `powerbi-modeling-mcp` (XMLA/TOM), not deployed from a git-tracked file. The
branch's `fabric.yaml` gets a new connection alias pointing at the rebuild SM. At merge time: flip
the alias (or rename items), redeploy via `rayfin up`, retire the old SM. No new Fabric **app**
item — auth, write-back plumbing, and static hosting are proven and stay as-is; only the SM and
the report content get rebuilt.

### New SM measures (on the duplicated SM, `Stock Item` table)
Measures, not calculated columns — like the existing `At Risk Rank`, they need
`CALCULATE`/`FILTER(ALL(...))` over the whole table in row context supplied by the query's
`SUMMARIZECOLUMNS`, which a calculated column can't do cleanly. Same gotcha as `At Risk Rank`
applies: clear filters on the whole table, never a single column. All descriptions follow the
existing non-obvious-logic-plus-caveats discipline (`docs/design-and-dax-references.md`) — the
`Reorder Value Total` description must explicitly note the `×1.2` safety multiplier is a fixed
heuristic buffer, **not** a statistically-derived safety-stock factor (this dataset's ~11-month
span doesn't support computing real demand variance / service-level z-scores) — say this in the
model so it surfaces to Copilot/AI consumers, not just this doc.

```dax
Reorder Value Total =
SUMX('Stock Item', [Suggested Reorder Qty] * 'Stock Item'[Unit Price])

Cumulative Reorder Value =
VAR CurrentRank = [At Risk Rank]
RETURN
    CALCULATE(
        [Reorder Value Total],
        FILTER(ALL('Stock Item'), [At Risk Rank] <= CurrentRank)
    )

Cumulative Reorder Value % =
DIVIDE([Cumulative Reorder Value], CALCULATE([Reorder Value Total], ALL('Stock Item')))

Reorder Value Share % =
DIVIDE([Reorder Value Total], CALCULATE([Reorder Value Total], ALL('Stock Item')))
```

`Reorder Value Share %` (this row's own marginal % of total, not cumulative) is new versus the
earlier draft — added after reading the reference `.pbip` model, whose table shows a marginal
`Rev GT%` column alongside cumulative %, not just cumulative alone. No fixed ABC-tier measure is
needed on the model side: the cutoff is a **live, client-side slider** (see below), not a baked
80/95 split, so tiering happens in the app layer from one fetched dataset, not in DAX.

### New query file
`src/queries/overview/pareto-reorder-risk.dax` — the single source query for the whole Pareto
view **and** for two of the KPI tiles (see KPI strip below). Returns **all 672 items** (not
top-N) with rank, marginal %, and cumulative %, fetched once; the slider, the table grouping, the
bar-click-to-row highlight, and the two cutoff-based KPI numbers are all a client-side recompute
over this one result set — no re-query per interaction.

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Stock Item'[Stock Item Key],
    'Stock Item'[Stock Item],
    'Stock Item'[Lead Time Priority Tier],
    "Reorder Value", [Suggested Reorder Qty] * 'Stock Item'[Unit Price],
    "Value Share %", [Reorder Value Share %],
    "Cumulative Value %", [Cumulative Reorder Value %],
    "At Risk Rank", [At Risk Rank]
)
ORDER BY [At Risk Rank] ASC
```

### KPI strip — becomes hybrid (found during the mockup, not in the original plan)
The mockup's slider updates the two dollar/count KPI tiles live, which only works if they're
computed from the same fetched `pareto-reorder-risk` dataset instead of their own separate DAX
measures. So `kpi-strip.dax` **loses** its `Top At Risk Items` / `At-Risk Reorder Value` sub-
queries entirely — those two tiles become a client-side reduction over `pareto-reorder-risk`'s
already-fetched rows at the current cutoff (default 80%), reactive to the slider. `Items Tracked`,
`Avg Lead Time Days`, and `Accelerating Demand Items` stay exactly as they are — genuinely
unaffected by the cutoff, no reason to move them. Architecturally: the Overview page component
fetches `pareto-reorder-risk` once and passes the result down to both `kpi-strip.tsx` and the new
`pareto-risk-view.tsx`, rather than each doing its own fetch.

### Existing queries retired outright (not just deprioritized)
Dropped after direct review of a rendered mockup, not assumed:
- `sales-trend.dax` + `sales-trend-chart.tsx` — the aggregate velocity-trend chart. Redundant once
  the Pareto view is the headline; the per-item sparkline in the detail panel already carries the
  temporal signal at the level a planner actually acts on.
- `top-at-risk-items.dax` + `top-at-risk-list.tsx` — replaced by the Pareto view.
- `top-at-risk-drill.dax` + `top-at-risk-drill-through.tsx` — redundant, the Pareto table already
  shows this.
- `top-contributors-drill.dax` + `top-contributors-drill-through.tsx` — same reason.

`ranked-at-risk-list.dax` (Action Center) is unaffected structurally, gains a cumulative-%/tier
column via the same measure additions above.

**Rewiring required, added after an independent review caught this was missing from the original
draft** — deleting the four retired files alone breaks the build:
- `src/App.tsx`: `OverviewPage` directly imports and renders `SalesTrendChart` and
  `TopAtRiskList` — both get replaced with the new `ParetoRiskView`.
- `src/components/overview/kpi-strip.tsx`: imports and renders both `TopAtRiskDrillThrough` and
  `TopContributorsDrillThrough`, plus supporting state (`drillOpen`) and a `tile.drillThrough`
  field that drives click affordance, hover/tap animation, and a "View all" arrow-link on exactly
  the two tiles being retired. This needs a real edit, not just an import removal — the two
  cutoff-based tiles lose their drill-through affordance entirely now that they're client-side
  computed from the same dataset the Pareto view already displays in full.
- **`src/components/landing/landing-page.tsx`** (found independently, not in the earlier review):
  its "Right now, ranked by risk" glimpse section also queries `topAtRiskItems("All")` — a third
  file that breaks if that query is simply deleted. The hero heading/copy above it is static text,
  independent of this query, and can be updated on its own; the glimpse section itself needs to
  switch to the new Pareto dataset in the same atomic swap as `App.tsx`/`kpi-strip.tsx`, not before.

### Page 1 — Pareto view (replaces the old top-at-risk bar chart)
New component `src/components/overview/pareto-risk-view.tsx`, built and revised against a
reference screenshot (Fabric-App-migration tutorial video) and its underlying `.pbip` model:

- **Headline sentence**, recomputed live from the slider: "`{cutoffPct}`% of at-risk reorder
  value is generated by `{N}` items."
- **Combo chart** (Vega-Lite, layered marks, `resolve.scale.y: "independent"`): bars = Reorder
  Value per item colored by in-cutoff (severity/accent token) vs. past-cutoff (muted token, not a
  new color language), cumulative-% line, dashed reference rule tracking the live slider position.
  **No forward projection of any kind** — decided explicitly after review: this dataset's DAX has
  no forecast measure, so nothing forward-looking gets drawn, historical only.
  **Clicking a bar highlights that item's row** in the table below — free, since chart and table
  already share the one fetched dataset, no new query.
- **Draggable cutoff slider**, default 80%, cheap specifically because the full 672-row dataset is
  fetched once.
- **Linked table**: Item, Rank, Reorder Value, Value Share %, Cumulative Value %, Tier. Grouped
  and subtotaled by tier, matching the cutoff live. Default: rows within the current cutoff shown
  individually, rows past it collapsed to per-tier subtotal rows (672 rows can't all render).
- **No tier-filter dropdown on this page** — deliberate, decided during review: the slider is the
  one control here; Action Center already owns filtering/exploration. Revisit only if real usage
  shows it's wanted.
- **CSV export** on the table — real, functional in the deployed app (client-side Blob/anchor
  download from the already-fetched rows, no backend involved).

### Action Center changes
- `ranked-list-panel.tsx` (modified): the existing tier filter is a `<select>` dropdown, not
  chips (corrected wording after review) — kept as-is. Gains a Tier/cumulative-% column (once the
  new SM measures exist), a **name-search input** (client-side filter over the already-fetched
  672 rows — added after review, list was tier-filterable but not searchable), and a CSV export
  button on the same client-side-download pattern as the Pareto table.
- `item-detail-panel.tsx` **(modified — corrected from an earlier "unchanged" assumption)**: no
  longer calls `<Sparkline forecastDays=... />` — replaced with a **new**
  `item-trend-chart.tsx` component (below). Also gains a visible note disclosing that no
  stock-on-hand figure exists in this dataset and that `Suggested Reorder Qty` is a formula, not
  a prediction — same content as the model-level measure description above, surfaced in-app too
  since the confusion is exactly what a planner looking at this screen cold would hit.
- `sparkline.tsx` **(correction — left unchanged, not modified)**: this component's own doc
  comment is explicit: "no axes/gridlines/legend... [over] a fancier custom visual" — a
  deliberate prior design decision (data-goblins "recognizable, not bespoke" guidance), and it's
  still used, unmodified, for every true sparkline spot (ranked-list rows, KPI drill tables).
  Adding gridlines to it would contradict its own documented purpose and change every other use
  site along with the one that actually needed axes. Two things do still change on it, project-
  wide, everywhere it's used: the `forecastDays` prop and its projection-rendering logic are
  removed entirely (the no-unbacked-forecast decision applies to every sparkline, not just the
  big detail one — a dashed forward line reads as "predicted" regardless of a caption, so it's
  cut, not kept-but-labeled).
- **New**: `src/components/action-center/item-trend-chart.tsx` — a distinct component, not a
  `sparkline.tsx` variant, specifically for the item-detail panel's larger (640&times;64) trend
  view. This is the one place the gridded-axis treatment (Option A: horizontal min/mid/max
  gridlines with value labels, x-axis date range labels) actually belongs — at sparkline size
  (72&times;28, 96&times;32) axes would clutter; at 640px wide it's no longer really a sparkline,
  it's a small chart, and a small chart earns real axes. Historical data only, no projection.
- `reorder-action-form.tsx` (modified): write hook to `ReorderActionHistory` on create/update.
- `landing-page.tsx` (modified): hero copy updated to state the concentration thesis directly
  ("twenty percent of your catalog is carrying eighty percent of the reorder risk"), replacing
  generic framing copy that didn't reference it. Flagged separately in feedback as adequate for
  now, real polish deferred to the Friday 8/21 buffer day — not blocking this rebuild.

### New capability: `ReorderActionAuditLog` (audit trail)
**Renamed from the earlier draft's `ReorderActionHistory`** — a component named
`src/components/action-center/reorder-action-history.tsx` **already exists** in this codebase
(discovered reading the real files, not caught by the earlier independent review). It is not a
changelog: it lists a stock item's past `ReorderAction` records and is the actual place status
gets updated today (`ReorderAction.update({id}, {status})` lives in its `handleStatusChange`, not
in `reorder-action-form.tsx`, which only ever calls `.create()`). Reusing the name `History` for
the new entity would collide directly with this existing, unrelated component. The new entity and
its component are named `ReorderActionAuditLog` throughout instead.

**Two write sites, not one** — corrected from the earlier draft, which only mentioned the form:
1. `reorder-action-form.tsx`'s `handleSubmit`, on successful `.create()` — logs creation.
2. `reorder-action-history.tsx`'s `handleStatusChange`, on successful `.update()` — logs the
   actual status transitions, which is where most real changes will happen. This is an additive
   one-line side effect inside existing, working logic — not a rewrite of that file.

Confirmed via Rayfin docs search: no built-in change-tracking primitive exists — fully hand-rolled.

```ts
@entity()
@authenticated()
export class ReorderActionAuditLog {
  @uuid() id!: string;
  @uuid() reorderActionId!: string;
  @text({ max: 100 }) fieldName!: string; // e.g. "status", "suggestedReorderQty", "note"
  @text({ max: 500, optional: true }) oldValue?: string;
  @text({ max: 500, optional: true }) newValue?: string;
  @date() changedAt!: string;
  @text({ max: 200 }) changedBy!: string;
}
```

**UI placement: a panel inside Action Center**, not a new page — new component
`src/components/action-center/reorder-action-audit-log.tsx`, placed near the existing
`reorder-action-history.tsx` list (complementary, not a replacement — one shows current-state
records with a status editor, the other shows an immutable field-level change log). Reverse-
chronological list, one compact line per change ("`{fieldName}`: `{oldValue}` → `{newValue}`" +
timestamp + `changedBy`), filtered to the currently-selected item's `reorderActionId`. Append-
only, no edit/delete UI (matches the existing no-hard-delete boundary).

**Open, flagged for the user, not decided unilaterally**: the existing component's name,
`ReorderActionHistory`, now sits right next to a new `ReorderActionAuditLog` — "History" and
"Audit Log" are close enough in meaning that a future reader could reasonably confuse which is
which. A rename of the *existing* component (e.g. to `reorder-action-list.tsx`, matching what it
actually does — list records + edit status) would clean this up, but that's a rename to shipped,
working code with its own naming momentum, not a mechanical addition — left for the user to
decide rather than done without asking.

### Scope-lock update required
`CLAUDE.md`'s locked-scope line "**Write-back entity (one entity, not a full CRUD system)**" needs
updating to reflect two entities (`ReorderAction` + `ReorderActionHistory`) — a real, decided
reason to revise the lock, not scope drift. Do this update when this amendment is adopted.

### Page count and reuse — unchanged from the app's original shape
Still 3 pages (Landing, Overview, Action Center) — no new page added; the audit trail is a panel,
not a page. Untouched entirely: auth, deploy plumbing, `ReorderAction`'s base shape, the landing
page's structural shell (steps grid, CTA — only hero copy changes).
