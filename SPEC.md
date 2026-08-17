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
- **Ask first:** adding a 3rd page or any entity beyond `ReorderAction` (stretch-goal-only per
  project `CLAUDE.md`); adding a new npm dependency; changing the semantic model storage mode from
  Import; changing `rayfin.yml` services beyond flipping `data.enabled: true`; any RLS/policy
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
